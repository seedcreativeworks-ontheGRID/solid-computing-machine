import { FileText, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { documentTypeLabel, documentReviewStatusLabel } from "@/lib/domain";
import type { DocumentReviewStatus, DocumentType } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

const REVIEW_VARIANT: Record<DocumentReviewStatus, "success" | "critical" | "outline"> = {
  VERIFIED: "success",
  FLAGGED: "critical",
  PENDING_REVIEW: "outline",
};

export function DocumentCard({
  document,
}: {
  document: {
    id: string;
    type: DocumentType;
    fileName: string;
    sourceLabel: string;
    reviewStatus: DocumentReviewStatus;
    uploadedAt: Date;
    parsedFields: {
      id: string;
      fieldLabel: string;
      value: string;
      confidence: number;
      verified: boolean;
    }[];
  };
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <FileText className="size-4 text-muted-foreground" strokeWidth={2} />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{documentTypeLabel[document.type]}</span>
            <span className="text-xs text-muted-foreground">
              {document.fileName} · {document.sourceLabel}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={REVIEW_VARIANT[document.reviewStatus]}>
            {documentReviewStatusLabel[document.reviewStatus]}
          </Badge>
          <span className="text-[11px] text-muted-foreground">{formatDate(document.uploadedAt)}</span>
        </div>
      </div>

      {document.parsedFields.length > 0 ? (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Extracted fields
          </span>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {document.parsedFields.map((field) => (
              <div key={field.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{field.fieldLabel}</span>
                <span className="flex items-center gap-1.5 font-medium">
                  {field.value}
                  {field.verified ? (
                    <CheckCircle2 className="size-3 text-emerald-600" strokeWidth={2.5} />
                  ) : (
                    <span
                      className={cn(
                        "rounded-sm px-1 py-0.5 text-[10px] font-normal",
                        field.confidence < 0.8
                          ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {Math.round(field.confidence * 100)}%
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
