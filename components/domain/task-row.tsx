"use client";

import { useTransition } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { OwnerChip } from "@/components/domain/owner-chip";
import { toggleTaskDone } from "@/lib/actions/tasks";
import { formatDate } from "@/lib/format";
import { taskUrgencyLabel } from "@/lib/domain";
import type { TaskStatus, TaskUrgency } from "@/lib/generated/prisma/client";

export function TaskRow({
  task,
}: {
  task: {
    id: string;
    title: string;
    status: TaskStatus;
    urgency: TaskUrgency;
    dueDate: Date | null;
    owner: { name: string; initials: string } | null;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const isDone = task.status === "DONE";

  return (
    <div className="flex items-center gap-3 border-b border-border py-2.5 last:border-0">
      <Checkbox
        checked={isDone}
        disabled={isPending}
        onCheckedChange={() => startTransition(() => toggleTaskDone(task.id))}
      />
      <div className="flex flex-1 flex-col">
        <span className={`text-sm ${isDone ? "text-muted-foreground line-through" : ""}`}>{task.title}</span>
        <span className="text-xs text-muted-foreground">
          {task.dueDate ? `Due ${formatDate(task.dueDate)}` : "No due date"}
        </span>
      </div>
      {task.urgency === "HIGH" && !isDone ? (
        <Badge variant="high">{taskUrgencyLabel[task.urgency]}</Badge>
      ) : null}
      <OwnerChip owner={task.owner} />
    </div>
  );
}
