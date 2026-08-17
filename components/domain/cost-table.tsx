import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { costCategoryLabel, costStatusLabel } from "@/lib/domain";
import type { CostCategory, CostStatus } from "@/lib/generated/prisma/client";

type CostLine = {
  id: string;
  category: CostCategory;
  status: CostStatus;
  currency: string;
  forecastAmount: number | string | null;
  actualAmount: number | string | null;
  varianceNote: string | null;
};

export function CostTable({ costLines }: { costLines: CostLine[] }) {
  const forecastTotal = costLines.reduce((sum, c) => sum + (c.forecastAmount ? Number(c.forecastAmount) : 0), 0);
  const actualTotal = costLines.reduce((sum, c) => sum + (c.actualAmount ? Number(c.actualAmount) : 0), 0);
  const currency = costLines[0]?.currency ?? "USD";

  if (costLines.length === 0) {
    return <p className="text-sm text-muted-foreground">No cost lines recorded yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Forecast</TableHead>
          <TableHead className="text-right">Actual</TableHead>
          <TableHead className="text-right">Variance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {costLines.map((line) => {
          const forecast = line.forecastAmount ? Number(line.forecastAmount) : null;
          const actual = line.actualAmount ? Number(line.actualAmount) : null;
          const variancePct = forecast && actual ? (actual - forecast) / forecast : null;
          const isMaterialVariance = variancePct !== null && Math.abs(variancePct) > 0.1;

          return (
            <TableRow key={line.id}>
              <TableCell className="font-medium">{costCategoryLabel[line.category]}</TableCell>
              <TableCell>
                <Badge variant="outline">{costStatusLabel[line.status]}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(forecast, line.currency)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(actual, line.currency)}</TableCell>
              <TableCell className="text-right">
                {variancePct !== null ? (
                  <span
                    className={
                      isMaterialVariance
                        ? "font-medium text-red-700 dark:text-red-400"
                        : "text-muted-foreground"
                    }
                  >
                    {variancePct > 0 ? "+" : ""}
                    {Math.round(variancePct * 100)}%
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
                {line.varianceNote ? (
                  <p className="mt-0.5 max-w-56 text-right text-[11px] text-muted-foreground">{line.varianceNote}</p>
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-medium">Total</TableCell>
          <TableCell />
          <TableCell className="text-right font-medium tabular-nums">{formatCurrency(forecastTotal, currency)}</TableCell>
          <TableCell className="text-right font-medium tabular-nums">{formatCurrency(actualTotal, currency)}</TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  );
}
