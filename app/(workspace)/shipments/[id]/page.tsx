import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ShipmentHeader } from "@/components/domain/shipment-header";
import { ShipmentTabs } from "@/components/domain/shipment-tabs";
import { getShipmentDetail, getShipmentIds } from "@/lib/repo";
import { getCurrentOrganization } from "@/lib/session";

// Static export needs every dynamic id known at build time (dynamicParams
// must be a literal `false`, injected by scripts/static-export.sh — see
// docs/plan.md). The normal build renders shipments on demand instead,
// which is the default (dynamicParams unset = true) left here. An empty
// generateStaticParams puts the route in on-demand ISR, cached per id after
// first render — that's fine (not stale) because every mutation here goes
// through lib/actions/*, which calls revalidatePath on this exact path.
// (Do not "fix" this with `revalidate = 0` — that forces fully dynamic
// rendering, which silently drops these routes from the static export.)

export async function generateStaticParams() {
  if (process.env.STATIC_EXPORT !== "1") return [];
  const organization = await getCurrentOrganization();
  const ids = await getShipmentIds(organization.id);
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const organization = await getCurrentOrganization();
  const shipment = await getShipmentDetail(organization.id, id);
  return { title: shipment?.shipmentNumber ?? "Shipment" };
}

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organization = await getCurrentOrganization();
  const shipment = await getShipmentDetail(organization.id, id);

  if (!shipment) notFound();

  return (
    <>
      <ShipmentHeader shipment={shipment} openExceptionCount={shipment.exceptions.length} />
      <ShipmentTabs
        milestones={shipment.milestones}
        documents={shipment.documents}
        costLines={shipment.costLines}
        activityEvents={shipment.activityEvents}
        recommendations={shipment.recommendations}
        exceptions={shipment.exceptions}
        tasks={shipment.tasks}
      />
    </>
  );
}
