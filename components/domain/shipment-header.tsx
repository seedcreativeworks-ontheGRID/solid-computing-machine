import Link from "next/link";
import { ArrowRight, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { OwnerChip } from "@/components/domain/owner-chip";
import { formatDate } from "@/lib/format";
import { riskLevelBadgeVariant, riskLevelLabel, shipmentStageLabel } from "@/lib/domain";
import type { RiskLevel, ShipmentStage } from "@/lib/generated/prisma/client";

export function ShipmentHeader({
  shipment,
  openExceptionCount,
}: {
  shipment: {
    shipmentNumber: string;
    stage: ShipmentStage;
    riskLevel: RiskLevel;
    originPort: string;
    destinationPort: string;
    etd: Date | null;
    eta: Date | null;
    revisedEta: Date | null;
    owner: { name: string; initials: string } | null;
    purchaseOrder: { poNumber: string; supplier: { id: string; name: string } };
  };
  openExceptionCount: number;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-4 border-b border-border px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{shipment.purchaseOrder.poNumber}</span>
            <span>·</span>
            <Link href={`/suppliers/${shipment.purchaseOrder.supplier.id}`} className="hover:underline">
              {shipment.purchaseOrder.supplier.name}
            </Link>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">{shipment.shipmentNumber}</h1>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>{shipment.originPort}</span>
            <ArrowRight className="size-3.5" />
            <span>{shipment.destinationPort}</span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={riskLevelBadgeVariant[shipment.riskLevel]}>
              {riskLevelLabel[shipment.riskLevel]} risk
            </Badge>
            <Badge variant="outline">{shipmentStageLabel[shipment.stage]}</Badge>
          </div>
          <OwnerChip owner={shipment.owner} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 text-sm">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">ETD</span>
          <span>{formatDate(shipment.etd)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">ETA</span>
          <span className={shipment.revisedEta ? "text-amber-700 dark:text-amber-400" : undefined}>
            {formatDate(shipment.revisedEta ?? shipment.eta)}
            {shipment.revisedEta ? (
              <span className="ml-1.5 text-xs text-muted-foreground line-through">{formatDate(shipment.eta)}</span>
            ) : null}
          </span>
        </div>
        {openExceptionCount > 0 ? (
          <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
            <AlertCircle className="size-4" strokeWidth={2} />
            <span className="font-medium">
              {openExceptionCount} open exception{openExceptionCount === 1 ? "" : "s"}
            </span>
          </div>
        ) : (
          <Badge variant="success">No open exceptions</Badge>
        )}
      </div>
    </div>
  );
}
