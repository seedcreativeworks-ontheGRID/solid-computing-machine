"use client";

import { useState, useTransition } from "react";
import { Check, X, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { approveRecommendation, dismissRecommendation } from "@/lib/actions/recommendations";
import { recommendationStatusLabel } from "@/lib/domain";
import type { RecommendationStatus } from "@/lib/generated/prisma/client";

export function RecommendationCard({
  recommendation,
}: {
  recommendation: {
    id: string;
    title: string;
    recommendedAction: string;
    rationale: string;
    confidence: number;
    status: RecommendationStatus;
  };
}) {
  const [isPending, startTransition] = useTransition();
  // Optimistic local override: on the real (Prisma-backed) build this just
  // converges with the server-confirmed status after revalidation; on the
  // static-export build (no server to revalidate against) it's what
  // actually drives the UI. See lib/actions/recommendations.static.ts.
  const [localStatus, setLocalStatus] = useState<RecommendationStatus | null>(null);
  const status = localStatus ?? recommendation.status;
  const isDecided = status !== "PENDING";

  function handle(decision: "APPROVED" | "DISMISSED") {
    setLocalStatus(decision);
    startTransition(() => (decision === "APPROVED" ? approveRecommendation : dismissRecommendation)(recommendation.id));
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{recommendation.title}</span>
            <span className="text-xs text-muted-foreground">{recommendation.recommendedAction}</span>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {Math.round(recommendation.confidence * 100)}% confidence
        </Badge>
      </div>

      <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Why: </span>
        {recommendation.rationale}
      </p>

      <div className="flex items-center justify-between">
        {isDecided ? (
          <Badge variant={status === "APPROVED" ? "success" : "outline"}>{recommendationStatusLabel[status]}</Badge>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={isPending} onClick={() => handle("APPROVED")}>
              <Check className="size-3.5" /> Approve
            </Button>
            <Button size="sm" variant="ghost" disabled={isPending} onClick={() => handle("DISMISSED")}>
              <X className="size-3.5" /> Dismiss
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
