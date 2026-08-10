"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function toggleTaskDone(taskId: string) {
  const user = await getCurrentUser();
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  const nextStatus = task.status === "DONE" ? "OPEN" : "DONE";

  await prisma.task.update({
    where: { id: taskId },
    data: { status: nextStatus, completedAt: nextStatus === "DONE" ? new Date() : null },
  });

  await prisma.activityEvent.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      actorLabel: user.name,
      eventType: nextStatus === "DONE" ? "task_completed" : "task_reopened",
      summary: `${nextStatus === "DONE" ? "Completed" : "Reopened"} task: ${task.title}`,
      shipmentId: task.shipmentId,
      purchaseOrderId: task.purchaseOrderId,
      exceptionId: task.exceptionId,
      taskId: task.id,
    },
  });

  if (task.shipmentId) revalidatePath(`/shipments/${task.shipmentId}`);
  revalidatePath("/inbox");
}
