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
import { prisma } from "@/lib/prisma";
import { formatDate, formatPercent } from "@/lib/format";
import {
  purchaseOrderStatusLabel,
  riskLevelBadgeVariant,
  riskLevelLabel,
} from "@/lib/domain";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id }, select: { name: true } });
  return { title: supplier?.name ?? "Supplier" };
}

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supplier = await prisma.supplier.findUnique({
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

      <div className="flex flex-col gap-6 overflow-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
                <div key={signal.id} className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{signal.signalType}</span>
                    <span className="text-xs text-muted-foreground">{signal.description}</span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
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
          <div className="grid grid-cols-2 gap-3">
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
