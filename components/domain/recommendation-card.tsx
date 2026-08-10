"use client";

import { useTransition } from "react";
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
  const isDecided = recommendation.status !== "PENDING";

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
          <Badge variant={recommendation.status === "APPROVED" ? "success" : "outline"}>
            {recommendationStatusLabel[recommendation.status]}
          </Badge>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending}
              onClick={() => startTransition(() => approveRecommendation(recommendation.id))}
            >
              <Check className="size-3.5" /> Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => startTransition(() => dismissRecommendation(recommendation.id))}
            >
              <X className="size-3.5" /> Dismiss
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
