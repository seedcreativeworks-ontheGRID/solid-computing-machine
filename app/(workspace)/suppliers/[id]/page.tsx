import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/domain/stat-tile";
import { ExceptionSummaryCard } from "@/components/domain/exception-summary-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSupplierDetail, getSupplierIds } from "@/lib/repo";
import { getCurrentOrganization } from "@/lib/session";
import { formatDate, formatPercent } from "@/lib/format";
import {
  purchaseOrderStatusLabel,
  riskLevelBadgeVariant,
  riskLevelLabel,
} from "@/lib/domain";

// Static export needs every dynamic id known at build time (dynamicParams
// must be a literal `false`, injected by scripts/static-export.sh — see
// docs/plan.md). The normal build renders suppliers on demand instead,
// which is the default (dynamicParams unset = true) left here. An empty
// generateStaticParams puts the route in on-demand ISR, cached per id after
// first render — that's fine (not stale) because every mutation here goes
// through lib/actions/*, which calls revalidatePath on this exact path.
// (Do not "fix" this with `revalidate = 0` — that forces fully dynamic
// rendering, which silently drops these routes from the static export.)

export async function generateStaticParams() {
  if (process.env.STATIC_EXPORT !== "1") return [];
  const organization = await getCurrentOrganization();
  const ids = await getSupplierIds(organization.id);
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const organization = await getCurrentOrganization();
  const supplier = await getSupplierDetail(organization.id, id);
  return { title: supplier?.name ?? "Supplier" };
}

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organization = await getCurrentOrganization();
  const supplier = await getSupplierDetail(organization.id, id);

  if (!supplier) notFound();

  return (
    <>
      <PageHeader
        title={supplier.name}
        description={`${supplier.category} · ${supplier.country} · Partner since ${formatDate(supplier.activeSince)}`}
        actions={
          <Badge variant={riskLevelBadgeVariant[supplier.riskLevel]}>{riskLevelLabel[supplier.riskLevel]} risk</Badge>
        }
      />

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile
            label="On-time delivery rate"
            value={formatPercent(supplier.onTimeRate)}
            tone={supplier.onTimeRate < 0.85 ? "negative" : "positive"}
          />
          <StatTile
            label="Inspection defect rate"
            value={formatPercent(supplier.defectRate, 1)}
            tone={supplier.defectRate > 0.05 ? "negative" : "positive"}
          />
          <StatTile
            label="Open exceptions"
            value={supplier.exceptions.length}
            tone={supplier.exceptions.length > 0 ? "warning" : "default"}
          />
        </div>

        {supplier.notes ? (
          <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {supplier.notes}
          </p>
        ) : null}

        {supplier.exceptions.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Active exceptions</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {supplier.exceptions.map((e) => (
                <ExceptionSummaryCard
                  key={e.id}
                  exception={e}
                  href={e.shipment ? `/shipments/${e.shipment.id}` : undefined}
                />
              ))}
            </div>
          </section>
        ) : null}

        {supplier.riskSignals.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Risk signals</h2>
            <div className="flex flex-col gap-2">
              {supplier.riskSignals.map((signal) => (
                <div key={signal.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{signal.signalType}</span>
                    <span className="text-xs text-muted-foreground">{signal.description}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 sm:flex-col sm:items-end sm:gap-1">
                    <Badge variant={riskLevelBadgeVariant[signal.severity]}>{riskLevelLabel[signal.severity]}</Badge>
                    <span className="text-[11px] text-muted-foreground">{formatDate(signal.detectedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Recent purchase orders</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order date</TableHead>
                <TableHead>Shipment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplier.purchaseOrders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.poNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{purchaseOrderStatusLabel[po.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(po.orderDate)}</TableCell>
                  <TableCell>
                    {po.shipments[0] ? (
                      <Link href={`/shipments/${po.shipments[0].id}`} className="text-sm hover:underline">
                        {po.shipments[0].shipmentNumber}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not yet shipped</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Contacts</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {supplier.contacts.map((contact) => (
              <div key={contact.id} className="flex flex-col gap-1 rounded-lg border border-border p-3">
                <span className="text-sm font-medium">{contact.name}</span>
                <span className="text-xs text-muted-foreground">{contact.role}</span>
                <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3" /> {contact.email}
                  </span>
                  {contact.phone ? (
                    <span className="flex items-center gap-1.5">
                      <Phone className="size-3" /> {contact.phone}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
