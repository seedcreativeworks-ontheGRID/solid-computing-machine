import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { InboxTable } from "@/components/inbox/inbox-table";
import { getExceptions, getSuppliersBrief, getUsers } from "@/lib/repo";
import { getCurrentOrganization } from "@/lib/session";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  const organization = await getCurrentOrganization();

  const [exceptions, owners, suppliers] = await Promise.all([
    getExceptions(organization.id),
    getUsers(organization.id),
    getSuppliersBrief(organization.id),
  ]);

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Exceptions across purchase orders and shipments, prioritized by severity."
      />
      <InboxTable
        exceptions={exceptions}
        owners={owners.map((o) => ({ value: o.id, label: o.name }))}
        suppliers={suppliers.map((s) => ({ value: s.id, label: s.name }))}
      />
    </>
  );
}
