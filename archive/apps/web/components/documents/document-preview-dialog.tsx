"use client";

import { useState, useEffect } from "react";
import { Download, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Document, DocumentType } from "@/lib/types";

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  lease: "Lease",
  receipt: "Receipt",
  inspection_move_in: "Move-in",
  inspection_move_out: "Move-out",
  property_photo: "Photo",
  other: "Other",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(fileType: string): boolean {
  return fileType.startsWith("image/");
}

interface DocumentPreviewDialogProps {
  document: Document | null;
  open: boolean;
  onClose: () => void;
}

export function DocumentPreviewDialog({
  document: doc,
  open,
  onClose,
}: DocumentPreviewDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Fetch signed URL when document changes or dialog opens
  useEffect(() => {
    if (!open || !doc) {
      setSignedUrl(null);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`/api/documents/${doc.id}/url`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch URL");
        return res.json();
      })
      .then(({ url }) => {
        if (!cancelled) setSignedUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, doc]);

  function handleDownload() {
    if (!signedUrl || !doc) return;
    const link = window.document.createElement("a");
    link.href = signedUrl;
    link.download = doc.file_name;
    link.click();
  }

  async function handleDownloadFallback() {
    if (!doc) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}/url`);
      if (!res.ok) throw new Error("Failed to get download URL");
      const { url } = await res.json();
      const link = window.document.createElement("a");
      link.href = url;
      link.download = doc.file_name;
      link.click();
    } catch {
      toast.error("Failed to download document");
    }
  }

  const isImage = doc ? isImageType(doc.file_type) : false;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="sm:max-w-3xl max-h-[90vh] flex flex-col"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate" title={doc?.file_name}>
              {doc?.file_name ?? "Document Preview"}
            </DialogTitle>
            {doc && (
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px] px-1.5">
                  {DOCUMENT_TYPE_LABELS[doc.document_type]}
                </Badge>
                <span>{formatFileSize(doc.file_size)}</span>
                {doc.tenant_name && (
                  <>
                    <span className="text-border">·</span>
                    <span>{doc.tenant_name}</span>
                  </>
                )}
              </DialogDescription>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={signedUrl ? handleDownload : handleDownloadFallback}
              disabled={loading}
            >
              <Download className="size-3.5 mr-1.5" />
              Download
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 flex items-center justify-center overflow-auto rounded-lg bg-muted/30">
          {loading ? (
            <div className="flex flex-col items-center gap-3 p-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading preview...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 p-12">
              <FileText className="size-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Failed to load preview
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadFallback}
              >
                <Download className="size-3.5 mr-1.5" />
                Try downloading instead
              </Button>
            </div>
          ) : isImage && signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signedUrl}
              alt={doc?.file_name ?? "Document preview"}
              className="max-w-full max-h-[65vh] object-contain"
            />
          ) : (
            /* Non-image file info */
            <div className="flex flex-col items-center gap-4 p-12">
              <FileText className="size-16 text-muted-foreground/40" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">
                  {doc?.file_name ?? "Unknown file"}
                </p>
                {doc && (
                  <p className="text-xs text-muted-foreground">
                    {doc.file_type} — {formatFileSize(doc.file_size)}
                  </p>
                )}
                {doc?.description && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {doc.description}
                  </p>
                )}
              </div>
              <Button
                onClick={signedUrl ? handleDownload : handleDownloadFallback}
              >
                <Download className="size-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
