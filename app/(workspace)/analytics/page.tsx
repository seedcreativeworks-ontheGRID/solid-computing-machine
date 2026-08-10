import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { StatTile } from "@/components/domain/stat-tile";
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
import { formatCurrency, formatPercent } from "@/lib/format";
import { riskLevelBadgeVariant, riskLevelLabel } from "@/lib/domain";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const organization = await getCurrentOrganization();

  const [openExceptions, resolvedExceptions, delayRiskShipments, costLines, riskySuppliers] = await Promise.all([
    prisma.exception.count({ where: { organizationId: organization.id, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.exception.findMany({
      where: { organizationId: organization.id, status: "RESOLVED", resolvedAt: { not: null } },
      select: { detectedAt: true, resolvedAt: true },
    }),
    prisma.shipment.count({
      where: { organizationId: organization.id, riskLevel: { in: ["ELEVATED", "HIGH"] } },
    }),
    prisma.costLine.findMany({
      where: { organizationId: organization.id, forecastAmount: { not: null }, actualAmount: { not: null } },
    }),
    prisma.supplier.findMany({
      where: { organizationId: organization.id, riskLevel: { in: ["ELEVATED", "HIGH"] } },
      include: { _count: { select: { exceptions: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } } } } },
      orderBy: { onTimeRate: "asc" },
    }),
  ]);

  const avgResolutionDays =
    resolvedExceptions.length > 0
      ? resolvedExceptions.reduce((sum, e) => {
          const ms = e.resolvedAt!.getTime() - e.detectedAt.getTime();
          return sum + ms / (1000 * 60 * 60 * 24);
        }, 0) / resolvedExceptions.length
      : null;

  const totalForecast = costLines.reduce((sum, c) => sum + Number(c.forecastAmount), 0);
  const totalActual = costLines.reduce((sum, c) => sum + Number(c.actualAmount), 0);
  const totalVariance = totalActual - totalForecast;

  return (
    <>
      <PageHeader title="Analytics" description="A tight read on operational health this period." />
      <div className="flex flex-col gap-6 overflow-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-3">
          <StatTile
            label="Open exceptions"
            value={openExceptions}
            tone={openExceptions > 0 ? "warning" : "positive"}
          />
          <StatTile
            label="Avg. resolution time"
            value={avgResolutionDays !== null ? `${avgResolutionDays.toFixed(1)}d` : "—"}
            helpText={`${resolvedExceptions.length} resolved`}
          />
          <StatTile
            label="Shipments at delay risk"
            value={delayRiskShipments}
            tone={delayRiskShipments > 0 ? "warning" : "positive"}
            helpText="Elevated or high risk"
          />
          <StatTile
            label="Confirmed cost variance"
            value={formatCurrency(totalVariance)}
            tone={totalVariance > 0 ? "negative" : "positive"}
            helpText={`vs. ${formatCurrency(totalForecast)} forecast`}
          />
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Suppliers at risk</h2>
          {riskySuppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suppliers are currently flagged elevated or high risk.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-right">On-time rate</TableHead>
                  <TableHead className="text-right">Defect rate</TableHead>
                  <TableHead className="text-right">Open exceptions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riskySuppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/suppliers/${s.id}`} className="text-sm font-medium hover:underline">
                        {s.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={riskLevelBadgeVariant[s.riskLevel]}>{riskLevelLabel[s.riskLevel]}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatPercent(s.onTimeRate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPercent(s.defectRate, 1)}</TableCell>
                    <TableCell className="text-right tabular-nums">{s._count.exceptions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </>
  );
}
