"use client";

import { useRef } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 5;

interface PhotoUploaderProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
}

export function PhotoUploader({ photos, onPhotosChange }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_PHOTOS - photos.length;
    const toAdd = files.slice(0, remaining);
    onPhotosChange([...photos, ...toAdd]);
    // Reset the input so the same file can be re-added after removal
    e.target.value = "";
  }

  function handleRemove(index: number) {
    onPhotosChange(photos.filter((_, i) => i !== index));
  }

  const atLimit = photos.length >= MAX_PHOTOS;

  return (
    <div className="space-y-3">
      {!atLimit && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="size-4" />
            Add Photos
          </Button>
        </>
      )}

      {photos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {photos.length}/{MAX_PHOTOS} photos
          </p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((file, index) => (
              <div
                key={index}
                className={cn(
                  "aspect-square rounded-md overflow-hidden relative bg-muted"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Photo ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className={cn(
                    "absolute top-1 right-1 flex size-5 items-center justify-center rounded-full",
                    "bg-black/60 text-white hover:bg-black/80 transition-colors"
                  )}
                  aria-label={`Remove photo ${index + 1}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
