import { formatDateTime } from "@/lib/format";

export function ActivityTimeline({
  events,
}: {
  events: {
    id: string;
    occurredAt: Date;
    actorLabel: string;
    summary: string;
  }[];
}) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  return (
    <ol className="flex flex-col">
      {events.map((event, i) => (
        <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
          {i !== events.length - 1 ? (
            <span className="absolute left-[5px] top-4 h-full w-px bg-border" aria-hidden />
          ) : null}
          <span className="mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-primary bg-background" />
          <div className="flex flex-1 flex-col gap-0.5 pb-0.5">
            <p className="text-sm leading-snug">{event.summary}</p>
            <span className="text-xs text-muted-foreground">
              {event.actorLabel} · {formatDateTime(event.occurredAt)}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
