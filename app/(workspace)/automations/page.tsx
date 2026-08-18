import type { Metadata } from "next";
import { Zap, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { getAutomationRules } from "@/lib/repo";
import { getCurrentOrganization } from "@/lib/session";

export const metadata: Metadata = { title: "Automations" };

export default async function AutomationsPage() {
  const organization = await getCurrentOrganization();
  const rules = await getAutomationRules(organization.id);

  return (
    <>
      <PageHeader
        title="Automations"
        description="Policies that watch for known exception patterns. Every automated action still routes through the recommendation queue for approval unless explicitly marked otherwise."
      />
      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3">
          {rules.map((rule) => (
            <div key={rule.id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Zap className="size-4 text-muted-foreground" strokeWidth={2} />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{rule.name}</span>
                    <span className="text-xs text-muted-foreground">{rule.description}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {rule.requiresApproval ? (
                    <Badge variant="outline" className="gap-1">
                      <ShieldCheck className="size-3" /> Requires approval
                    </Badge>
                  ) : (
                    <Badge variant="outline">Auto-applies</Badge>
                  )}
                  <Badge variant={rule.isActive ? "success" : "outline"}>
                    {rule.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
                <span className="font-medium text-foreground">WHEN</span>
                <code>{rule.triggerEvent}</code>
                <span className="font-medium text-foreground">IF</span>
                <code>{rule.condition}</code>
                <span className="font-medium text-foreground">THEN</span>
                <code>{rule.action}</code>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
