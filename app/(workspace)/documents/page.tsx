import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { DocumentCard } from "@/components/domain/document-card";
import { DocumentFilters } from "@/components/documents/document-filters";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/session";
import type { DocumentReviewStatus } from "@/lib/generated/prisma/client";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const organization = await getCurrentOrganization();
  const statusParam = typeof params.status === "string" ? params.status : "all";

  const documents = await prisma.document.findMany({
    where: {
      organizationId: organization.id,
      reviewStatus: statusParam === "all" ? undefined : (statusParam as DocumentReviewStatus),
    },
    include: {
      parsedFields: true,
      shipment: { select: { id: true, shipmentNumber: true } },
      purchaseOrder: { select: { id: true, poNumber: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Documents"
        description="Trade documents parsed from supplier and forwarder sources, with extraction confidence and review status."
        actions={<DocumentFilters />}
      />

      <div className="flex-1 overflow-auto px-6 py-6">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents match this filter.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex flex-col gap-1.5">
                {doc.shipment ? (
                  <Link
                    href={`/shipments/${doc.shipment.id}`}
                    className="text-xs font-medium text-muted-foreground hover:underline"
                  >
                    {doc.shipment.shipmentNumber}
                    {doc.purchaseOrder ? ` · ${doc.purchaseOrder.poNumber}` : ""}
                  </Link>
                ) : doc.purchaseOrder ? (
                  <span className="text-xs font-medium text-muted-foreground">{doc.purchaseOrder.poNumber}</span>
                ) : null}
                <DocumentCard document={doc} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
