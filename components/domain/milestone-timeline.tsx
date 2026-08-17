import { Check, Circle, AlertTriangle, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import type { MilestoneStatus } from "@/lib/generated/prisma/client";

const STATUS_ICON: Record<MilestoneStatus, typeof Check> = {
  COMPLETE: Check,
  IN_PROGRESS: Clock,
  AT_RISK: AlertTriangle,
  DELAYED: AlertTriangle,
  PENDING: Circle,
};

const STATUS_STYLE: Record<MilestoneStatus, string> = {
  COMPLETE: "bg-emerald-600 text-white border-emerald-600",
  IN_PROGRESS: "bg-primary text-primary-foreground border-primary",
  AT_RISK: "bg-amber-500 text-white border-amber-500",
  DELAYED: "bg-red-600 text-white border-red-600",
  PENDING: "bg-background text-muted-foreground border-border",
};

export function MilestoneTimeline({
  milestones,
}: {
  milestones: {
    id: string;
    name: string;
    plannedDate: Date;
    actualDate: Date | null;
    status: MilestoneStatus;
  }[];
}) {
  return (
    <ol className="flex flex-col">
      {milestones.map((m, i) => {
        const Icon = STATUS_ICON[m.status];
        const isLast = i === milestones.length - 1;
        return (
          <li key={m.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast ? (
              <span className="absolute left-[13px] top-6 h-full w-px bg-border" aria-hidden />
            ) : null}
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border",
                STATUS_STYLE[m.status]
              )}
            >
              <Icon className="size-3.5" strokeWidth={2.5} />
            </span>
            <div className="flex flex-1 flex-col pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{m.name}</span>
                {m.status === "AT_RISK" ? (
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">At risk</span>
                ) : m.status === "DELAYED" ? (
                  <span className="text-xs font-medium text-red-700 dark:text-red-400">Delayed</span>
                ) : null}
              </div>
              <span className="text-xs text-muted-foreground">
                {m.actualDate ? (
                  <>Completed {formatDate(m.actualDate)}</>
                ) : (
                  <>Planned {formatDate(m.plannedDate)}</>
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
