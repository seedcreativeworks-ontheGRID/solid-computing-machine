import type { ReactNode } from "react";
import Link from "next/link";
import { Radar } from "lucide-react";

import { SidebarNav } from "@/components/shell/sidebar-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { orgRoleLabel } from "@/lib/domain";

export function WorkspaceShell({
  children,
  organizationName,
  openExceptions,
  user,
}: {
  children: ReactNode;
  organizationName: string;
  openExceptions: number;
  user: { name: string; initials: string; role: string };
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card">
        <Link href="/inbox" className="flex shrink-0 items-center gap-2 px-4 py-4">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Radar className="size-4" strokeWidth={2} />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Control Tower</span>
            <span className="text-[11px] text-muted-foreground">{organizationName}</span>
          </div>
        </Link>

        <SidebarNav openExceptions={openExceptions} />

        <div className="flex shrink-0 items-center gap-2.5 border-t border-border px-4 py-3.5">
          <Avatar>
            <AvatarFallback>{user.initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-[11px] text-muted-foreground">
              {orgRoleLabel[user.role as keyof typeof orgRoleLabel] ?? user.role}
            </span>
          </div>
        </div>
      </aside>

      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
