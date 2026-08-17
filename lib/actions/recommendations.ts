"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

async function decide(recommendationId: string, decision: "APPROVED" | "DISMISSED") {
  const user = await getCurrentUser();

  const recommendation = await prisma.aiRecommendation.update({
    where: { id: recommendationId },
    data: { status: decision, decidedById: user.id, decidedAt: new Date() },
  });

  await prisma.approvalDecision.create({
    data: {
      recommendationId,
      decidedById: user.id,
      decision,
    },
  });

  await prisma.activityEvent.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      actorLabel: user.name,
      eventType: decision === "APPROVED" ? "recommendation_approved" : "recommendation_dismissed",
      summary: `${decision === "APPROVED" ? "Approved" : "Dismissed"} recommendation: ${recommendation.title}`,
      shipmentId: recommendation.shipmentId,
      purchaseOrderId: recommendation.purchaseOrderId,
      exceptionId: recommendation.exceptionId,
    },
  });

  if (recommendation.shipmentId) {
    revalidatePath(`/shipments/${recommendation.shipmentId}`);
  }
  revalidatePath("/inbox");
}

export async function approveRecommendation(recommendationId: string) {
  await decide(recommendationId, "APPROVED");
}

export async function dismissRecommendation(recommendationId: string) {
  await decide(recommendationId, "DISMISSED");
}
