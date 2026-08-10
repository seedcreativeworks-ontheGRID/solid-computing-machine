import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
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
import { formatPercent } from "@/lib/format";
import { riskLevelBadgeVariant, riskLevelLabel } from "@/lib/domain";

export const metadata: Metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  const organization = await getCurrentOrganization();

  const suppliers = await prisma.supplier.findMany({
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

  return (
    <>
      <PageHeader title="Suppliers" description={`${suppliers.length} active supplier relationships.`} />
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead className="text-right">On-time rate</TableHead>
              <TableHead className="text-right">Defect rate</TableHead>
              <TableHead className="text-right">Purchase orders</TableHead>
              <TableHead className="text-right">Open exceptions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Link href={`/suppliers/${s.id}`} className="hover:underline">
                    <span className="font-medium">{s.name}</span>
                  </Link>
                  <div className="text-xs text-muted-foreground">{s.country}</div>
                </TableCell>
                <TableCell className="text-sm">{s.category}</TableCell>
                <TableCell>
                  <Badge variant={riskLevelBadgeVariant[s.riskLevel]}>{riskLevelLabel[s.riskLevel]}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatPercent(s.onTimeRate)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPercent(s.defectRate, 1)}</TableCell>
                <TableCell className="text-right tabular-nums">{s._count.purchaseOrders}</TableCell>
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
