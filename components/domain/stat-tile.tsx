import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  tone = "default",
  helpText,
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "positive" | "negative" | "warning";
  helpText?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-xl font-semibold tabular-nums",
          tone === "positive" && "text-emerald-700 dark:text-emerald-400",
          tone === "negative" && "text-red-700 dark:text-red-400",
          tone === "warning" && "text-amber-700 dark:text-amber-400"
        )}
      >
        {value}
      </span>
      {helpText ? <span className="text-xs text-muted-foreground">{helpText}</span> : null}
    </div>
  );
}
