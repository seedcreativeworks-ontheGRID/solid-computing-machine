"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { DocumentCard } from "@/components/domain/document-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { documentReviewStatusLabel } from "@/lib/domain";
import type { DocumentWithRelations } from "@/lib/repo";

export function DocumentGrid({ documents }: { documents: DocumentWithRelations[] }) {
  const [status, setStatus] = useState("all");

  const filtered = useMemo(
    () => (status === "all" ? documents : documents.filter((d) => d.reviewStatus === status)),
    [documents, status]
  );

  return (
    <>
      <div className="flex items-center justify-end border-b border-border px-6 py-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger size="sm" className="text-xs">
            <span className="text-muted-foreground">Review status:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All documents</SelectItem>
            {(Object.entries(documentReviewStatusLabel) as [string, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents match this filter.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((doc) => (
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
