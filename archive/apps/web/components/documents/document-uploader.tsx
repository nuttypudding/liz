"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fullName } from "@/lib/format";
import type { Tenant, DocumentType } from "@/lib/types";

const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ACCEPTED_TYPES =
  "image/*,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "lease", label: "Lease Agreement" },
  { value: "receipt", label: "Receipt" },
  { value: "inspection_move_in", label: "Move-in Inspection" },
  { value: "inspection_move_out", label: "Move-out Inspection" },
  { value: "property_photo", label: "Property Photo" },
  { value: "other", label: "Other" },
];

interface DocumentUploaderProps {
  propertyId: string;
  tenants: Tenant[];
  onUploadComplete: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function DocumentUploader({
  propertyId,
  tenants,
  onUploadComplete,
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [tenantId, setTenantId] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const canUpload = documentType && files.length > 0 && !uploading;

  function addFiles(newFiles: File[]) {
    const remaining = MAX_FILES - files.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const validFiles: File[] = [];
    for (const file of newFiles.slice(0, remaining)) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`"${file.name}" exceeds the 10 MB size limit`);
        continue;
      }
      validFiles.push(file);
    }

    if (newFiles.length > remaining) {
      toast.error(`Only ${remaining} more file(s) can be added`);
    }

    // Generate image previews
    const newPreviews = new Map(previews);
    for (const file of validFiles) {
      if (isImageFile(file)) {
        newPreviews.set(file.name + file.size, URL.createObjectURL(file));
      }
    }
    setPreviews(newPreviews);
    setFiles((prev) => [...prev, ...validFiles]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    addFiles(selected);
    e.target.value = "";
  }

  function handleRemove(index: number) {
    const file = files[index];
    const key = file.name + file.size;
    const url = previews.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      setPreviews((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = Array.from(e.dataTransfer.files);
      addFiles(dropped);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files.length, previews]
  );

  async function handleUpload() {
    if (!canUpload) return;

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("property_id", propertyId);
    formData.append("document_type", documentType);
    if (tenantId) formData.append("tenant_id", tenantId);
    if (description.trim()) formData.append("description", description.trim());
    for (const file of files) {
      formData.append("files", file);
    }

    try {
      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              const body = JSON.parse(xhr.responseText);
              reject(new Error(body.error || "Upload failed"));
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        xhr.open("POST", "/api/documents/upload");
        xhr.send(formData);
      });

      toast.success("Documents uploaded", {
        description: `${files.length} file${files.length > 1 ? "s" : ""} uploaded successfully`,
      });

      // Clean up previews
      for (const url of previews.values()) {
        URL.revokeObjectURL(url);
      }

      // Reset form
      setFiles([]);
      setPreviews(new Map());
      setDescription("");
      setTenantId("");
      setProgress(0);

      onUploadComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Document Type */}
      <div className="space-y-1.5">
        <Label htmlFor="doc-type">Document Type</Label>
        <Select value={documentType} onValueChange={(val) => setDocumentType(val ?? "")}>
          <SelectTrigger id="doc-type" className="min-h-11">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description + Tenant — 2 col on tablet+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="doc-description">Description (optional)</Label>
          <Input
            id="doc-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Signed lease for Unit 2B"
            maxLength={500}
            className="min-h-11"
          />
        </div>
        {tenants.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="doc-tenant">Tenant (optional)</Label>
            <Select value={tenantId} onValueChange={(val) => setTenantId(val ?? "")}>
              <SelectTrigger id="doc-tenant" className="min-h-11">
                <SelectValue placeholder="Select tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {fullName(t)}
                    {t.unit_number ? ` - Unit ${t.unit_number}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* File Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          uploading && "pointer-events-none opacity-50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <Upload className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          Drag & drop files here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground/70">
          Images, PDF, Word docs. Max 10 MB each.
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {files.length}/{MAX_FILES} files selected
          </p>
          <div className="space-y-1.5">
            {files.map((file, index) => {
              const key = file.name + file.size;
              const previewUrl = previews.get(key);

              return (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
                >
                  {/* Preview or icon */}
                  <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted overflow-hidden">
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt={file.name}
                        className="size-10 object-cover"
                      />
                    ) : isImageFile(file) ? (
                      <ImageIcon className="size-5 text-muted-foreground" />
                    ) : (
                      <FileText className="size-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>

                  {/* Remove button */}
                  {!uploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(index);
                      }}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <Progress value={progress}>
          <span className="text-sm text-muted-foreground">
            Uploading... {progress}%
          </span>
        </Progress>
      )}

      {/* Upload Button */}
      <Button
        type="button"
        onClick={handleUpload}
        disabled={!canUpload}
        className="min-h-11 w-full sm:w-auto"
      >
        <Upload className="size-4 mr-2" />
        Upload {files.length > 0 ? `(${files.length} file${files.length > 1 ? "s" : ""})` : ""}
      </Button>
    </div>
  );
}
