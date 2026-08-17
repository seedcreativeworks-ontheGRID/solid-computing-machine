import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/shell/workspace-shell";
import { getOpenExceptionCount } from "@/lib/repo";
import { getCurrentOrganization, getCurrentUser } from "@/lib/session";

// Every workspace page reads live operational data (and several mutate it
// via Server Actions) — none of it should be frozen at build time. This
// line is stripped by scripts/static-export.sh for the GitHub Pages build,
// where `dynamic: "force-dynamic"` is incompatible with `output: "export"`
// (Next.js requires route-segment config to be a literal, so this can't be
// a runtime env-var branch — see docs/plan.md).
export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const [organization, user] = await Promise.all([getCurrentOrganization(), getCurrentUser()]);
  const openExceptions = await getOpenExceptionCount(organization.id);

  return (
    <WorkspaceShell
      organizationName={organization.name}
      openExceptions={openExceptions}
      user={{ name: user.name, initials: user.initials, role: user.role }}
    >
      {children}
    </WorkspaceShell>
  );
}
