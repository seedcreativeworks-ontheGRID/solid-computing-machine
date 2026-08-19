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
import { getAnalytics } from "@/lib/repo";
import { getCurrentOrganization } from "@/lib/session";
import { formatCurrency, formatPercent } from "@/lib/format";
import { riskLevelBadgeVariant, riskLevelLabel } from "@/lib/domain";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const organization = await getCurrentOrganization();
  const {
    openExceptions,
    resolvedCount,
    avgResolutionDays,
    delayRiskShipments,
    totalForecast,
    totalVariance,
    riskySuppliers,
  } = await getAnalytics(organization.id);

  return (
    <>
      <PageHeader title="Analytics" description="A tight read on operational health this period." />
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6 sm:px-6">
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Open exceptions"
            value={openExceptions}
            tone={openExceptions > 0 ? "warning" : "positive"}
          />
          <StatTile
            label="Avg. resolution time"
            value={avgResolutionDays !== null ? `${avgResolutionDays.toFixed(1)}d` : "—"}
            helpText={`${resolvedCount} resolved`}
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
