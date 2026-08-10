import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/shell/workspace-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization, getCurrentUser } from "@/lib/session";

// Every workspace page reads live operational data (and several mutate it
// via Server Actions) — none of it should be frozen at build time.
export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const [organization, user] = await Promise.all([getCurrentOrganization(), getCurrentUser()]);
  const openExceptions = await prisma.exception.count({
    where: { organizationId: organization.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
  });

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
