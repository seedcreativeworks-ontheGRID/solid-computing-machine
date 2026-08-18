// Dumps a full snapshot of the seeded database into lib/static-data.json,
// shaped exactly like what each page's Prisma query currently returns.
// Used only for the GitHub Pages static-export build (see docs/plan.md /
// README "What's mocked" — there is no live server or database on that
// deployment, so this frozen snapshot stands in for both).
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const organization = await prisma.organization.findFirstOrThrow();
  const currentUser = await prisma.user.findFirstOrThrow({
    where: { organizationId: organization.id, email: "sarah.nguyen@kestrelimport.com" },
  });
  const users = await prisma.user.findMany({
    where: { organizationId: organization.id },
    orderBy: { name: "asc" },
  });

  const openExceptionCount = await prisma.exception.count({
    where: { organizationId: organization.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
  });

  const exceptions = await prisma.exception.findMany({
    where: { organizationId: organization.id },
    include: {
      owner: true,
      supplier: true,
      shipment: true,
      // Shape matches lib/repo.ts's exceptionInclude — poNumber is all the
      // inbox table renders for a linked PO.
      purchaseOrder: { select: { poNumber: true } },
      recommendations: { orderBy: { confidence: "desc" } },
    },
    orderBy: { detectedAt: "desc" },
  });

  const suppliersList = await prisma.supplier.findMany({
    where: { organizationId: organization.id },
    include: {
      _count: {
        select: {
          purchaseOrders: true,
          exceptions: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const supplierIds = suppliersList.map((s) => s.id);
  const supplierDetails: Record<string, unknown> = {};
  for (const id of supplierIds) {
    supplierDetails[id] = await prisma.supplier.findUniqueOrThrow({
      where: { id },
      include: {
        contacts: true,
        riskSignals: { orderBy: { detectedAt: "desc" } },
        exceptions: {
          where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
          include: { owner: true, shipment: true },
          orderBy: { detectedAt: "desc" },
        },
        purchaseOrders: {
          include: { shipments: { select: { id: true, shipmentNumber: true, stage: true } } },
          orderBy: { orderDate: "desc" },
          take: 8,
        },
      },
    });
  }

  const shipmentsList = await prisma.shipment.findMany({
    where: { organizationId: organization.id },
    include: {
      owner: true,
      purchaseOrder: { include: { supplier: true } },
      _count: { select: { exceptions: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const shipmentIds = shipmentsList.map((s) => s.id);
  const shipmentDetails: Record<string, unknown> = {};
  for (const id of shipmentIds) {
    const shipment = await prisma.shipment.findUniqueOrThrow({
      where: { id },
      include: {
        owner: true,
        purchaseOrder: { include: { supplier: true } },
        milestones: { orderBy: { sequence: "asc" } },
        documents: { include: { parsedFields: true }, orderBy: { uploadedAt: "desc" } },
        costLines: true,
        activityEvents: { orderBy: { occurredAt: "desc" } },
        recommendations: { orderBy: { createdAt: "desc" } },
        exceptions: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } }, include: { owner: true } },
        tasks: { where: { status: { not: "DONE" } }, include: { owner: true }, orderBy: { dueDate: "asc" } },
      },
    });
    shipmentDetails[id] = {
      ...shipment,
      costLines: shipment.costLines.map((c) => ({
        ...c,
        forecastAmount: c.forecastAmount ? c.forecastAmount.toString() : null,
        actualAmount: c.actualAmount ? c.actualAmount.toString() : null,
      })),
    };
  }

  const documents = await prisma.document.findMany({
    where: { organizationId: organization.id },
    include: {
      parsedFields: true,
      shipment: { select: { id: true, shipmentNumber: true } },
      purchaseOrder: { select: { id: true, poNumber: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  const automationRules = await prisma.automationRule.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "asc" },
  });

  // Analytics aggregates, precomputed exactly as app/(workspace)/analytics/page.tsx does.
  const resolvedExceptions = await prisma.exception.findMany({
    where: { organizationId: organization.id, status: "RESOLVED", resolvedAt: { not: null } },
    select: { detectedAt: true, resolvedAt: true },
  });
  const delayRiskShipments = await prisma.shipment.count({
    where: { organizationId: organization.id, riskLevel: { in: ["ELEVATED", "HIGH"] } },
  });
  const costLinesWithVariance = await prisma.costLine.findMany({
    where: { organizationId: organization.id, forecastAmount: { not: null }, actualAmount: { not: null } },
  });
  const riskySuppliers = await prisma.supplier.findMany({
    where: { organizationId: organization.id, riskLevel: { in: ["ELEVATED", "HIGH"] } },
    include: { _count: { select: { exceptions: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } } } } },
    orderBy: { onTimeRate: "asc" },
  });

  const avgResolutionDays =
    resolvedExceptions.length > 0
      ? resolvedExceptions.reduce((sum, e) => {
          const ms = e.resolvedAt!.getTime() - e.detectedAt.getTime();
          return sum + ms / (1000 * 60 * 60 * 24);
        }, 0) / resolvedExceptions.length
      : null;
  const totalForecast = costLinesWithVariance.reduce((sum, c) => sum + Number(c.forecastAmount), 0);
  const totalActual = costLinesWithVariance.reduce((sum, c) => sum + Number(c.actualAmount), 0);

  const analytics = {
    openExceptions: openExceptionCount,
    resolvedCount: resolvedExceptions.length,
    avgResolutionDays,
    delayRiskShipments,
    totalForecast,
    totalActual,
    totalVariance: totalActual - totalForecast,
    riskySuppliers,
  };

  const snapshot = {
    generatedAt: new Date().toISOString(),
    organization,
    currentUser,
    users,
    openExceptionCount,
    exceptions,
    suppliersList,
    supplierDetails,
    shipmentsList,
    shipmentDetails,
    documents,
    automationRules,
    analytics,
  };

  writeFileSync(
    new URL("../lib/static-data.json", import.meta.url),
    JSON.stringify(snapshot, null, 2) + "\n"
  );

  console.log(`Wrote lib/static-data.json (${shipmentIds.length} shipments, ${supplierIds.length} suppliers, ${exceptions.length} exceptions).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
