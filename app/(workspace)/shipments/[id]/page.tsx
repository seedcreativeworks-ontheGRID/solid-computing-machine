import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ShipmentHeader } from "@/components/domain/shipment-header";
import { ShipmentTabs } from "@/components/domain/shipment-tabs";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const shipment = await prisma.shipment.findUnique({ where: { id }, select: { shipmentNumber: true } });
  return { title: shipment?.shipmentNumber ?? "Shipment" };
}

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const shipment = await prisma.shipment.findUnique({
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

  if (!shipment) notFound();

  return (
    <>
      <ShipmentHeader shipment={shipment} openExceptionCount={shipment.exceptions.length} />
      <ShipmentTabs
        milestones={shipment.milestones}
        documents={shipment.documents}
        costLines={shipment.costLines.map((c) => ({
          ...c,
          forecastAmount: c.forecastAmount ? c.forecastAmount.toString() : null,
          actualAmount: c.actualAmount ? c.actualAmount.toString() : null,
        }))}
        activityEvents={shipment.activityEvents}
        recommendations={shipment.recommendations}
        exceptions={shipment.exceptions}
        tasks={shipment.tasks}
      />
    </>
  );
}
