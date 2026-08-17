import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { DocumentGrid } from "@/components/documents/document-grid";
import { getDocuments } from "@/lib/repo";
import { getCurrentOrganization } from "@/lib/session";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const organization = await getCurrentOrganization();
  const documents = await getDocuments(organization.id);

  return (
    <>
      <PageHeader
        title="Documents"
        description="Trade documents parsed from supplier and forwarder sources, with extraction confidence and review status."
      />
      <DocumentGrid documents={documents} />
    </>
  );
}
