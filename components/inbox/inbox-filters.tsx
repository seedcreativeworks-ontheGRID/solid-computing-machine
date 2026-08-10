"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  exceptionStatusLabel,
  exceptionTypeLabel,
  shipmentStageLabel,
} from "@/lib/domain";

type Option = { value: string; label: string };

export function InboxFilters({
  owners,
  suppliers,
}: {
  owners: Option[];
  suppliers: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const severity = searchParams.get("severity") ?? "all";
  const status = searchParams.get("status") ?? "open";
  const type = searchParams.get("type") ?? "all";
  const owner = searchParams.get("owner") ?? "all";
  const supplier = searchParams.get("supplier") ?? "all";
  const stage = searchParams.get("stage") ?? "all";

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-6 py-3">
      <FilterSelect
        label="Status"
        value={status}
        onChange={(v) => setParam("status", v)}
        options={[
          { value: "open", label: "Open & in progress" },
          { value: "all", label: "All statuses" },
          ...(
            Object.entries(exceptionStatusLabel) as [string, string][]
          ).map(([value, label]) => ({ value, label })),
        ]}
      />
      <FilterSelect
        label="Severity"
        value={severity}
        onChange={(v) => setParam("severity", v)}
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
        onChange={(v) => setParam("type", v)}
        options={[
          { value: "all", label: "All types" },
          ...(
            Object.entries(exceptionTypeLabel) as [string, string][]
          ).map(([value, label]) => ({ value, label })),
        ]}
      />
      <FilterSelect
        label="Owner"
        value={owner}
        onChange={(v) => setParam("owner", v)}
        options={[{ value: "all", label: "All owners" }, ...owners]}
      />
      <FilterSelect
        label="Supplier"
        value={supplier}
        onChange={(v) => setParam("supplier", v)}
        options={[{ value: "all", label: "All suppliers" }, ...suppliers]}
      />
      <FilterSelect
        label="Stage"
        value={stage}
        onChange={(v) => setParam("stage", v)}
        options={[
          { value: "all", label: "All stages" },
          ...(
            Object.entries(shipmentStageLabel) as [string, string][]
          ).map(([value, label]) => ({ value, label })),
        ]}
      />
    </div>
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
