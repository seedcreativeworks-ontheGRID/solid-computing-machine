"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Radar } from "lucide-react";

import { SidebarNav } from "@/components/shell/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { orgRoleLabel } from "@/lib/domain";

export function MobileNav({
  organizationName,
  openExceptions,
  user,
}: {
  organizationName: string;
  openExceptions: number;
  user: { name: string; initials: string; role: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 max-w-[85vw] gap-0 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="flex h-full flex-col" onClickCapture={() => setOpen(false)}>
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
