import { Badge } from "@/components/ui/badge";
import { severityBadgeVariant } from "@/lib/domain";
import type { ExceptionSeverity } from "@/lib/generated/prisma/client";

const SEVERITY_LABEL: Record<ExceptionSeverity, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export function SeverityBadge({ severity }: { severity: ExceptionSeverity }) {
  return <Badge variant={severityBadgeVariant[severity]}>{SEVERITY_LABEL[severity]}</Badge>;
}
