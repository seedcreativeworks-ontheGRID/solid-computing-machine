"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  Ship,
  Building2,
  FileText,
  Workflow,
  BarChart3,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/inbox", label: "Inbox", icon: Inbox, countKey: "openExceptions" as const },
  { href: "/shipments", label: "Shipments", icon: Ship },
  { href: "/suppliers", label: "Suppliers", icon: Building2 },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav({ openExceptions }: { openExceptions: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
        const Icon = item.icon;
        const count = item.countKey === "openExceptions" ? openExceptions : undefined;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" strokeWidth={2} />
            <span className="flex-1">{item.label}</span>
            {typeof count === "number" && count > 0 ? (
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                  active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                )}
              >
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
