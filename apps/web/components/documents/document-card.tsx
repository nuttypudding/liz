"use client";

import { useState } from "react";
import {
  FileText,
  MoreHorizontal,
  Eye,
  Download,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Document, DocumentType } from "@/lib/types";

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  lease: "Lease",
  receipt: "Receipt",
  inspection_move_in: "Move-in",
  inspection_move_out: "Move-out",
  property_photo: "Photo",
  other: "Other",
};

interface DocumentCardProps {
  document: Document;
  onDelete: () => void;
  onPreview: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function isImageType(fileType: string): boolean {
  return fileType.startsWith("image/");
}

export function DocumentCard({ document: doc, onDelete, onPreview }: DocumentCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isImage = isImageType(doc.file_type);

  // Lazy-load thumbnail for images
  async function loadThumbnail() {
    if (!isImage || thumbnailUrl || thumbnailLoading || thumbnailError) return;
    setThumbnailLoading(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/url`);
      if (!res.ok) throw new Error("Failed to load");
      const { url } = await res.json();
      setThumbnailUrl(url);
    } catch {
      setThumbnailError(true);
    } finally {
      setThumbnailLoading(false);
    }
  }

  // Trigger thumbnail load when the card mounts (via ref callback won't work well with SSR)
  // Using onMouseEnter + first render approach
  if (isImage && !thumbnailUrl && !thumbnailLoading && !thumbnailError) {
    loadThumbnail();
  }

  async function handleDownload() {
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

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        throw new Error("Failed to delete");
      }
      toast.success("Document deleted");
      onDelete();
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <>
      <div
        className="group/doc-card flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md cursor-pointer"
        onClick={onPreview}
      >
        {/* Thumbnail / Icon area — 4:3 aspect ratio */}
        <div className="relative flex items-center justify-center bg-muted aspect-[4/3] overflow-hidden">
          {isImage && thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={doc.file_name}
              className="size-full object-cover"
            />
          ) : isImage && thumbnailLoading ? (
            <div className="size-full animate-pulse bg-muted" />
          ) : (
            <FileText className="size-10 text-muted-foreground/50" />
          )}

          {/* Type badge overlay */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {DOCUMENT_TYPE_LABELS[doc.document_type]}
            </Badge>
          </div>

          {/* Actions dropdown — top right, visible on hover */}
          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/doc-card:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-7 shadow-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview();
                  }}
                >
                  <Eye className="size-4" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload();
                  }}
                >
                  <Download className="size-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Card info */}
        <div className="flex flex-col gap-0.5 px-3 py-2">
          <p className="text-sm font-medium truncate" title={doc.file_name}>
            {doc.file_name}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{formatDate(doc.uploaded_at)}</span>
            <span className="text-border">·</span>
            <span>{formatFileSize(doc.file_size)}</span>
          </div>
          {doc.tenant_name && (
            <p className="text-xs text-muted-foreground truncate">
              {doc.tenant_name}
            </p>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{doc.file_name}&rdquo; will be permanently deleted. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
