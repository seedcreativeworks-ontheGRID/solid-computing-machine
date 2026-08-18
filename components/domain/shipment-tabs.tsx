"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MilestoneTimeline } from "@/components/domain/milestone-timeline";
import { DocumentCard } from "@/components/domain/document-card";
import { CostTable } from "@/components/domain/cost-table";
import { ActivityTimeline } from "@/components/domain/activity-timeline";
import { RecommendationCard } from "@/components/domain/recommendation-card";
import { ExceptionSummaryCard } from "@/components/domain/exception-summary-card";
import { TaskRow } from "@/components/domain/task-row";
import type {
  CostCategory,
  CostStatus,
  DocumentReviewStatus,
  DocumentType,
  ExceptionSeverity,
  ExceptionType,
  MilestoneStatus,
  RecommendationStatus,
  TaskStatus,
  TaskUrgency,
} from "@/lib/generated/prisma/client";

type Person = { name: string; initials: string } | null;

export function ShipmentTabs({
  milestones,
  documents,
  costLines,
  activityEvents,
  recommendations,
  exceptions,
  tasks,
}: {
  milestones: {
    id: string;
    name: string;
    plannedDate: Date;
    actualDate: Date | null;
    status: MilestoneStatus;
  }[];
  documents: {
    id: string;
    type: DocumentType;
    fileName: string;
    sourceLabel: string;
    reviewStatus: DocumentReviewStatus;
    uploadedAt: Date;
    parsedFields: { id: string; fieldLabel: string; value: string; confidence: number; verified: boolean }[];
  }[];
  costLines: {
    id: string;
    category: CostCategory;
    status: CostStatus;
    currency: string;
    forecastAmount: number | string | null;
    actualAmount: number | string | null;
    varianceNote: string | null;
  }[];
  activityEvents: { id: string; occurredAt: Date; actorLabel: string; summary: string }[];
  recommendations: {
    id: string;
    title: string;
    recommendedAction: string;
    rationale: string;
    confidence: number;
    status: RecommendationStatus;
  }[];
  exceptions: {
    id: string;
    title: string;
    description: string;
    type: ExceptionType;
    severity: ExceptionSeverity;
    owner: Person;
  }[];
  tasks: {
    id: string;
    title: string;
    status: TaskStatus;
    urgency: TaskUrgency;
    dueDate: Date | null;
    owner: Person;
  }[];
}) {
  return (
    <Tabs defaultValue="overview" className="min-h-0 flex-1">
      <div className="shrink-0 overflow-x-auto">
        <TabsList className="px-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations ({recommendations.length})</TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 sm:px-6">
        <TabsContent value="overview" className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3 sm:col-span-2">
            <h3 className="text-sm font-semibold">Needs attention</h3>
            {exceptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open exceptions on this shipment.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {exceptions.map((e) => (
                  <ExceptionSummaryCard key={e.id} exception={e} />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Recommended next steps</h3>
            {recommendations.filter((r) => r.status === "PENDING").length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing pending review.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {recommendations
                  .filter((r) => r.status === "PENDING")
                  .map((r) => (
                    <RecommendationCard key={r.id} recommendation={r} />
                  ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Recent activity</h3>
            <ActivityTimeline events={activityEvents.slice(0, 5)} />
          </div>

          {tasks.length > 0 ? (
            <div className="flex flex-col gap-2 sm:col-span-2">
              <h3 className="text-sm font-semibold">Open tasks</h3>
              <div className="rounded-lg border border-border px-4">
                {tasks.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="milestones" className="sm:max-w-md">
          <MilestoneTimeline milestones={milestones} />
        </TabsContent>

        <TabsContent value="documents" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            documents.map((d) => <DocumentCard key={d.id} document={d} />)
          )}
        </TabsContent>

        <TabsContent value="costs">
          <CostTable costLines={costLines} />
        </TabsContent>

        <TabsContent value="activity" className="sm:max-w-xl">
          <ActivityTimeline events={activityEvents} />
        </TabsContent>

        <TabsContent value="recommendations" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recommendations for this shipment.</p>
          ) : (
            recommendations.map((r) => <RecommendationCard key={r.id} recommendation={r} />)
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
