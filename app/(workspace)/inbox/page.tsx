import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { InboxFilters } from "@/components/inbox/inbox-filters";
import { SeverityBadge } from "@/components/domain/severity-badge";
import { OwnerChip } from "@/components/domain/owner-chip";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/session";
import { formatRelativeTime } from "@/lib/format";
import {
  exceptionStatusLabel,
  exceptionTypeLabel,
  shipmentStageLabel,
  sortBySeverity,
} from "@/lib/domain";
import type { ExceptionSeverity, ExceptionStatus, ExceptionType, ShipmentStage } from "@/lib/generated/prisma/client";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const organization = await getCurrentOrganization();

  const statusParam = typeof params.status === "string" ? params.status : "open";
  const severityParam = typeof params.severity === "string" ? params.severity : "all";
  const typeParam = typeof params.type === "string" ? params.type : "all";
  const ownerParam = typeof params.owner === "string" ? params.owner : "all";
  const supplierParam = typeof params.supplier === "string" ? params.supplier : "all";
  const stageParam = typeof params.stage === "string" ? params.stage : "all";

  const [owners, suppliers] = await Promise.all([
    prisma.user.findMany({ where: { organizationId: organization.id }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { organizationId: organization.id }, orderBy: { name: "asc" } }),
  ]);

  const exceptions = await prisma.exception.findMany({
    where: {
      organizationId: organization.id,
      status:
        statusParam === "all"
          ? undefined
          : statusParam === "open"
            ? { in: ["OPEN", "IN_PROGRESS"] }
            : (statusParam.toUpperCase() as ExceptionStatus),
      severity: severityParam === "all" ? undefined : (severityParam as ExceptionSeverity),
      type: typeParam === "all" ? undefined : (typeParam as ExceptionType),
      ownerId: ownerParam === "all" ? undefined : ownerParam,
      supplierId:
        supplierParam === "all"
          ? undefined
          : { equals: supplierParam },
      shipment: stageParam === "all" ? undefined : { stage: stageParam as ShipmentStage },
    },
    include: {
      owner: true,
      supplier: true,
      shipment: true,
      purchaseOrder: true,
      recommendations: { where: { status: "PENDING" }, orderBy: { confidence: "desc" }, take: 1 },
    },
  });

  // Some exceptions are supplier-only (no shipment) — apply the supplier
  // filter across both the direct link and the shipment's supplier-less case.
  const filtered =
    supplierParam === "all"
      ? exceptions
      : exceptions.filter((e) => e.supplierId === supplierParam);

  const prioritized = sortBySeverity(filtered);

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Exceptions across purchase orders and shipments, prioritized by severity."
      />
      <InboxFilters
        owners={owners.map((o) => ({ value: o.id, label: o.name }))}
        suppliers={suppliers.map((s) => ({ value: s.id, label: s.name }))}
      />

      {prioritized.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 py-20 text-center">
          <p className="text-sm font-medium">No exceptions match these filters</p>
          <p className="text-sm text-muted-foreground">
            Nothing needs attention right now for this view.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Severity</TableHead>
                <TableHead>Exception</TableHead>
                <TableHead>Linked record</TableHead>
                <TableHead>Recommendation</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-28 text-right">Detected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prioritized.map((exception) => {
                const linkHref = exception.shipmentId
                  ? `/shipments/${exception.shipmentId}`
                  : exception.supplierId
                    ? `/suppliers/${exception.supplierId}`
                    : "#";
                const recommendation = exception.recommendations[0];

                return (
                  <TableRow key={exception.id}>
                    <TableCell>
                      <SeverityBadge severity={exception.severity} />
                    </TableCell>
                    <TableCell className="max-w-80 whitespace-normal">
                      <Link href={linkHref} className="block hover:underline">
                        <span className="text-sm font-medium">{exception.title}</span>
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {exceptionTypeLabel[exception.type]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        {exception.shipment ? (
                          <>
                            <span className="font-medium">{exception.shipment.shipmentNumber}</span>
                            <span className="text-xs text-muted-foreground">
                              {shipmentStageLabel[exception.shipment.stage]}
                            </span>
                          </>
                        ) : exception.purchaseOrder ? (
                          <span className="font-medium">{exception.purchaseOrder.poNumber}</span>
                        ) : null}
                        {exception.supplier ? (
                          <span className="text-xs text-muted-foreground">{exception.supplier.name}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-72 whitespace-normal">
                      {recommendation ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{recommendation.title}</span>
                          <Badge variant="outline" className="w-fit text-[10px]">
                            {Math.round(recommendation.confidence * 100)}% confidence
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <OwnerChip owner={exception.owner} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{exceptionStatusLabel[exception.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatRelativeTime(exception.detectedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
