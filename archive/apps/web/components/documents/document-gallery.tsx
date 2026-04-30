"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { DocumentCard } from "@/components/documents/document-card";
import type { Document } from "@/lib/types";

const FILTER_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "lease", label: "Leases" },
  { value: "receipt", label: "Receipts" },
  { value: "inspection_move_in", label: "Move-in" },
  { value: "inspection_move_out", label: "Move-out" },
  { value: "property_photo", label: "Photos" },
  { value: "other", label: "Other" },
];

interface DocumentGalleryProps {
  propertyId: string;
  onPreview: (document: Document) => void;
}

export function DocumentGallery({ propertyId, onPreview }: DocumentGalleryProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/properties/${propertyId}/documents`);
      if (!res.ok) throw new Error("Failed to fetch");
      const { documents: docs } = await res.json();
      setDocuments(docs ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filteredDocuments =
    activeFilter === "all"
      ? documents
      : documents.filter((d) => d.document_type === activeFilter);

  function handleDelete() {
    fetchDocuments();
  }

  if (loading) return <GallerySkeleton />;

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <FileText className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium">Failed to load documents</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={fetchDocuments}
          >
            <RefreshCw className="mr-2 size-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <FileText className="size-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">No documents yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload documents using the uploader above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={activeFilter}
        onValueChange={setActiveFilter}
      >
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList variant="line" className="w-max min-w-full justify-start gap-0">
            {FILTER_TABS.map((tab) => {
              const count =
                tab.value === "all"
                  ? documents.length
                  : documents.filter((d) => d.document_type === tab.value).length;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-1 px-3 text-xs sm:text-sm min-h-9"
                >
                  {tab.label}
                  {count > 0 && (
                    <span className="text-[10px] text-muted-foreground ml-0.5">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {FILTER_TABS.map((tab) => {
          const items =
            tab.value === "all"
              ? documents
              : documents.filter((d) => d.document_type === tab.value);

          return (
            <TabsContent key={tab.value} value={tab.value} className="mt-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="size-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No {tab.label.toLowerCase()} documents
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {items.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      onDelete={handleDelete}
                      onPreview={() => onPreview(doc)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Showing {filteredDocuments.length} of {documents.length} document{documents.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="space-y-4">
      {/* Tab skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-20 shrink-0" />
        ))}
      </div>
      {/* Card grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[4/3] w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
