import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getUsers } from "@/lib/repo";
import { getCurrentOrganization } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { orgRoleLabel } from "@/lib/domain";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const organization = await getCurrentOrganization();
  const users = await getUsers(organization.id);

  return (
    <>
      <PageHeader title="Settings" description="Workspace and team configuration." />
      <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-4 py-6 sm:px-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Organization</h2>
          <div className="flex flex-col gap-1 rounded-lg border border-border p-4">
            <span className="text-sm font-medium">{organization.name}</span>
            <span className="text-xs text-muted-foreground">
              Workspace created {formatDate(organization.createdAt)}
            </span>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Team</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar>
                        <AvatarFallback>{u.initials}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{orgRoleLabel[u.role]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>
    </>
  );
}
