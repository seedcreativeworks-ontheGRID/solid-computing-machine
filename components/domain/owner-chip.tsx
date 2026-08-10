import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function OwnerChip({ owner }: { owner: { name: string; initials: string } | null }) {
  if (!owner) {
    return <span className="text-sm text-muted-foreground">Unassigned</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      <Avatar className="size-5">
        <AvatarFallback className="text-[10px]">{owner.initials}</AvatarFallback>
      </Avatar>
      <span className="text-sm">{owner.name}</span>
    </div>
  );
}
