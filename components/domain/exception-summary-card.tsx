import Link from "next/link";

import { SeverityBadge } from "@/components/domain/severity-badge";
import { OwnerChip } from "@/components/domain/owner-chip";
import { exceptionTypeLabel } from "@/lib/domain";
import type { ExceptionSeverity, ExceptionType } from "@/lib/generated/prisma/client";

export function ExceptionSummaryCard({
  exception,
  href,
}: {
  exception: {
    id: string;
    title: string;
    description: string;
    type: ExceptionType;
    severity: ExceptionSeverity;
    owner: { name: string; initials: string } | null;
  };
  href?: string;
}) {
  return (
    <Link
      href={href ?? `#exception-${exception.id}`}
      className="flex flex-col gap-2 rounded-lg border border-border p-4 transition-colors hover:border-foreground/20"
    >
      <div className="flex items-start justify-between gap-3">
        <SeverityBadge severity={exception.severity} />
        <span className="text-[11px] text-muted-foreground">{exceptionTypeLabel[exception.type]}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{exception.title}</span>
        <p className="text-xs text-muted-foreground">{exception.description}</p>
      </div>
      <OwnerChip owner={exception.owner} />
    </Link>
  );
}
