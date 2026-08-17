// Data access layer. Branches between live Prisma queries and a frozen
// static-data.json snapshot, selected by STATIC_EXPORT at build time.
//
// This exists so the GitHub Pages deployment (output: "export", no server,
// no database — see docs/plan.md) can render the exact same pages as the
// real app. Every page calls these functions instead of Prisma directly;
// only this file and lib/session.ts know which mode is active.
import { readFileSync } from "node:fs";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

const STATIC = process.env.STATIC_EXPORT === "1";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function reviveDates(_key: string, value: unknown) {
  if (typeof value === "string" && ISO_DATE_RE.test(value)) {
    return new Date(value);
  }
  return value;
}

function loadRaw(): Record<string, unknown> {
  const filePath = path.join(process.cwd(), "lib", "static-data.json");
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw, reviveDates) as Record<string, unknown>;
}

let cachedSnapshot: Record<string, unknown> | null = null;
function snapshot() {
  if (!cachedSnapshot) cachedSnapshot = loadRaw();
  return cachedSnapshot;
}

// --- Query shape definitions (single source of truth for both branches) ---

const exceptionInclude = {
  owner: true,
  supplier: true,
  shipment: true,
  purchaseOrder: true,
  recommendations: { orderBy: { confidence: "desc" } },
} satisfies Prisma.ExceptionInclude;
export type ExceptionWithRelations = Prisma.ExceptionGetPayload<{ include: typeof exceptionInclude }>;

const supplierBriefInclude = {
  _count: {
    select: {
      purchaseOrders: true,
      exceptions: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } },
    },
  },
} satisfies Prisma.SupplierInclude;
export type SupplierBrief = Prisma.SupplierGetPayload<{ include: typeof supplierBriefInclude }>;

const supplierDetailInclude = {
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
} satisfies Prisma.SupplierInclude;
export type SupplierDetail = Prisma.SupplierGetPayload<{ include: typeof supplierDetailInclude }>;

const shipmentBriefInclude = {
  owner: true,
  purchaseOrder: { include: { supplier: true } },
  _count: { select: { exceptions: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } } } },
} satisfies Prisma.ShipmentInclude;
export type ShipmentBrief = Prisma.ShipmentGetPayload<{ include: typeof shipmentBriefInclude }>;

const shipmentDetailInclude = {
  owner: true,
  purchaseOrder: { include: { supplier: true } },
  milestones: { orderBy: { sequence: "asc" } },
  documents: { include: { parsedFields: true }, orderBy: { uploadedAt: "desc" } },
  costLines: true,
  activityEvents: { orderBy: { occurredAt: "desc" } },
  recommendations: { orderBy: { createdAt: "desc" } },
  exceptions: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } }, include: { owner: true } },
  tasks: { where: { status: { not: "DONE" } }, include: { owner: true }, orderBy: { dueDate: "asc" } },
} satisfies Prisma.ShipmentInclude;
type ShipmentDetailRaw = Prisma.ShipmentGetPayload<{ include: typeof shipmentDetailInclude }>;
export type ShipmentDetail = Omit<ShipmentDetailRaw, "costLines"> & {
  costLines: (Omit<ShipmentDetailRaw["costLines"][number], "forecastAmount" | "actualAmount"> & {
    forecastAmount: string | null;
    actualAmount: string | null;
  })[];
};

const documentInclude = {
  parsedFields: true,
  shipment: { select: { id: true, shipmentNumber: true } },
  purchaseOrder: { select: { id: true, poNumber: true } },
} satisfies Prisma.DocumentInclude;
export type DocumentWithRelations = Prisma.DocumentGetPayload<{ include: typeof documentInclude }>;

export type Analytics = {
  openExceptions: number;
  resolvedCount: number;
  avgResolutionDays: number | null;
  delayRiskShipments: number;
  totalForecast: number;
  totalActual: number;
  totalVariance: number;
  riskySuppliers: Prisma.SupplierGetPayload<{
    include: { _count: { select: { exceptions: true } } };
  }>[];
};

// --- Reads ---

export async function getOpenExceptionCount(organizationId: string): Promise<number> {
  if (STATIC) return snapshot().openExceptionCount as number;
  return prisma.exception.count({
    where: { organizationId, status: { in: ["OPEN", "IN_PROGRESS"] } },
  });
}

export async function getUsers(organizationId: string) {
  if (STATIC) return snapshot().users as Prisma.UserGetPayload<object>[];
  return prisma.user.findMany({ where: { organizationId }, orderBy: { name: "asc" } });
}

export async function getExceptions(organizationId: string): Promise<ExceptionWithRelations[]> {
  if (STATIC) return snapshot().exceptions as ExceptionWithRelations[];
  return prisma.exception.findMany({
    where: { organizationId },
    include: exceptionInclude,
    orderBy: { detectedAt: "desc" },
  });
}

export async function getSuppliersBrief(organizationId: string): Promise<SupplierBrief[]> {
  if (STATIC) return snapshot().suppliersList as SupplierBrief[];
  return prisma.supplier.findMany({
    where: { organizationId },
    include: supplierBriefInclude,
    orderBy: { name: "asc" },
  });
}

export async function getSupplierIds(organizationId: string): Promise<string[]> {
  if (STATIC) return Object.keys(snapshot().supplierDetails as Record<string, unknown>);
  const suppliers = await prisma.supplier.findMany({ where: { organizationId }, select: { id: true } });
  return suppliers.map((s) => s.id);
}

export async function getSupplierDetail(organizationId: string, id: string): Promise<SupplierDetail | null> {
  if (STATIC) {
    const details = snapshot().supplierDetails as Record<string, SupplierDetail>;
    return details[id] ?? null;
  }
  return prisma.supplier.findFirst({ where: { id, organizationId }, include: supplierDetailInclude });
}

export async function getShipmentsBrief(organizationId: string): Promise<ShipmentBrief[]> {
  if (STATIC) return snapshot().shipmentsList as ShipmentBrief[];
  return prisma.shipment.findMany({
    where: { organizationId },
    include: shipmentBriefInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getShipmentIds(organizationId: string): Promise<string[]> {
  if (STATIC) return Object.keys(snapshot().shipmentDetails as Record<string, unknown>);
  const shipments = await prisma.shipment.findMany({ where: { organizationId }, select: { id: true } });
  return shipments.map((s) => s.id);
}

export async function getShipmentDetail(organizationId: string, id: string): Promise<ShipmentDetail | null> {
  if (STATIC) {
    const details = snapshot().shipmentDetails as Record<string, ShipmentDetail>;
    return details[id] ?? null;
  }
  const shipment = await prisma.shipment.findFirst({ where: { id, organizationId }, include: shipmentDetailInclude });
  if (!shipment) return null;
  return {
    ...shipment,
    costLines: shipment.costLines.map((c) => ({
      ...c,
      forecastAmount: c.forecastAmount ? c.forecastAmount.toString() : null,
      actualAmount: c.actualAmount ? c.actualAmount.toString() : null,
    })),
  };
}

export async function getDocuments(organizationId: string): Promise<DocumentWithRelations[]> {
  if (STATIC) return snapshot().documents as DocumentWithRelations[];
  return prisma.document.findMany({
    where: { organizationId },
    include: documentInclude,
    orderBy: { uploadedAt: "desc" },
  });
}

export async function getAutomationRules(organizationId: string) {
  if (STATIC) return snapshot().automationRules as Prisma.AutomationRuleGetPayload<object>[];
  return prisma.automationRule.findMany({ where: { organizationId }, orderBy: { createdAt: "asc" } });
}

export async function getAnalytics(organizationId: string): Promise<Analytics> {
  if (STATIC) return snapshot().analytics as Analytics;

  const [resolvedExceptions, delayRiskShipments, costLinesWithVariance, riskySuppliers, openExceptions] =
    await Promise.all([
      prisma.exception.findMany({
        where: { organizationId, status: "RESOLVED", resolvedAt: { not: null } },
        select: { detectedAt: true, resolvedAt: true },
      }),
      prisma.shipment.count({ where: { organizationId, riskLevel: { in: ["ELEVATED", "HIGH"] } } }),
      prisma.costLine.findMany({
        where: { organizationId, forecastAmount: { not: null }, actualAmount: { not: null } },
      }),
      prisma.supplier.findMany({
        where: { organizationId, riskLevel: { in: ["ELEVATED", "HIGH"] } },
        include: { _count: { select: { exceptions: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } } } } },
        orderBy: { onTimeRate: "asc" },
      }),
      prisma.exception.count({ where: { organizationId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    ]);

  const avgResolutionDays =
    resolvedExceptions.length > 0
      ? resolvedExceptions.reduce((sum, e) => {
          const ms = e.resolvedAt!.getTime() - e.detectedAt.getTime();
          return sum + ms / (1000 * 60 * 60 * 24);
        }, 0) / resolvedExceptions.length
      : null;
  const totalForecast = costLinesWithVariance.reduce((sum, c) => sum + Number(c.forecastAmount), 0);
  const totalActual = costLinesWithVariance.reduce((sum, c) => sum + Number(c.actualAmount), 0);

  return {
    openExceptions,
    resolvedCount: resolvedExceptions.length,
    avgResolutionDays,
    delayRiskShipments,
    totalForecast,
    totalActual,
    totalVariance: totalActual - totalForecast,
    riskySuppliers,
  };
}
