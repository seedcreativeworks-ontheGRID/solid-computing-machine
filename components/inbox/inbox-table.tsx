"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/domain/severity-badge";
import { OwnerChip } from "@/components/domain/owner-chip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRelativeTime } from "@/lib/format";
import {
  exceptionStatusLabel,
  exceptionTypeLabel,
  shipmentStageLabel,
  sortBySeverity,
} from "@/lib/domain";
import type { ExceptionWithRelations } from "@/lib/repo";

type Option = { value: string; label: string };
type ExceptionRow = ExceptionWithRelations;

export function InboxTable({
  exceptions,
  owners,
  suppliers,
}: {
  exceptions: ExceptionRow[];
  owners: Option[];
  suppliers: Option[];
}) {
  const [status, setStatus] = useState("open");
  const [severity, setSeverity] = useState("all");
  const [type, setType] = useState("all");
  const [owner, setOwner] = useState("all");
  const [supplier, setSupplier] = useState("all");
  const [stage, setStage] = useState("all");

  const filtered = useMemo(() => {
    const rows = exceptions.filter((e) => {
      if (status === "open" && !["OPEN", "IN_PROGRESS"].includes(e.status)) return false;
      if (status !== "open" && status !== "all" && e.status !== status) return false;
      if (severity !== "all" && e.severity !== severity) return false;
      if (type !== "all" && e.type !== type) return false;
      if (owner !== "all" && e.ownerId !== owner) return false;
      if (supplier !== "all" && e.supplierId !== supplier) return false;
      if (stage !== "all" && e.shipment?.stage !== stage) return false;
      return true;
    });
    return sortBySeverity(rows);
  }, [exceptions, status, severity, type, owner, supplier, stage]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-6">
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "open", label: "Open & in progress" },
            { value: "all", label: "All statuses" },
            ...(Object.entries(exceptionStatusLabel) as [string, string][]).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
        <FilterSelect
          label="Severity"
          value={severity}
          onChange={setSeverity}
          options={[
            { value: "all", label: "All severities" },
            { value: "CRITICAL", label: "Critical" },
            { value: "HIGH", label: "High" },
            { value: "MEDIUM", label: "Medium" },
            { value: "LOW", label: "Low" },
          ]}
        />
        <FilterSelect
          label="Type"
          value={type}
          onChange={setType}
          options={[
            { value: "all", label: "All types" },
            ...(Object.entries(exceptionTypeLabel) as [string, string][]).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
        <FilterSelect label="Owner" value={owner} onChange={setOwner} options={[{ value: "all", label: "All owners" }, ...owners]} />
        <FilterSelect
          label="Supplier"
          value={supplier}
          onChange={setSupplier}
          options={[{ value: "all", label: "All suppliers" }, ...suppliers]}
        />
        <FilterSelect
          label="Stage"
          value={stage}
          onChange={setStage}
          options={[
            { value: "all", label: "All stages" },
            ...(Object.entries(shipmentStageLabel) as [string, string][]).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4 py-20 text-center sm:px-6">
          <p className="text-sm font-medium">No exceptions match these filters</p>
          <p className="text-sm text-muted-foreground">Nothing needs attention right now for this view.</p>
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
              {filtered.map((exception) => {
                const linkHref = exception.shipment
                  ? `/shipments/${exception.shipment.id}`
                  : exception.supplier
                    ? `/suppliers/${exception.supplier.id}`
                    : "#";
                const recommendation = exception.recommendations.find((r) => r.status === "PENDING");

                return (
                  <TableRow key={exception.id}>
                    <TableCell>
                      <SeverityBadge severity={exception.severity} />
                    </TableCell>
                    <TableCell className="max-w-80 whitespace-normal">
                      <Link href={linkHref} className="block hover:underline">
                        <span className="text-sm font-medium">{exception.title}</span>
                      </Link>
                      <span className="text-xs text-muted-foreground">{exceptionTypeLabel[exception.type]}</span>
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

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="text-xs">
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
