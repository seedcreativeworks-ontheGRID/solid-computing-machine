import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { OwnerChip } from "@/components/domain/owner-chip";
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
import { formatDate } from "@/lib/format";
import { riskLevelBadgeVariant, riskLevelLabel, shipmentStageLabel } from "@/lib/domain";

export const metadata: Metadata = { title: "Shipments" };

export default async function ShipmentsPage() {
  const organization = await getCurrentOrganization();

  const shipments = await prisma.shipment.findMany({
    where: { organizationId: organization.id },
    include: {
      owner: true,
      purchaseOrder: { include: { supplier: true } },
      _count: { select: { exceptions: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Shipments"
        description={`${shipments.length} purchase orders in transit or recently closed.`}
      />
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shipment</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>ETA</TableHead>
              <TableHead className="text-right">Open exceptions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Link href={`/shipments/${s.id}`} className="hover:underline">
                    <span className="font-medium">{s.shipmentNumber}</span>
                  </Link>
                  <div className="text-xs text-muted-foreground">{s.purchaseOrder.poNumber}</div>
                </TableCell>
                <TableCell className="text-sm">{s.purchaseOrder.supplier.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{shipmentStageLabel[s.stage]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={riskLevelBadgeVariant[s.riskLevel]}>{riskLevelLabel[s.riskLevel]}</Badge>
                </TableCell>
                <TableCell>
                  <OwnerChip owner={s.owner} />
                </TableCell>
                <TableCell className="text-sm">{formatDate(s.revisedEta ?? s.eta)}</TableCell>
                <TableCell className="text-right">
                  {s._count.exceptions > 0 ? (
                    <span className="font-medium text-red-700 dark:text-red-400">{s._count.exceptions}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
