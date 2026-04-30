"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PhotoUploader } from "@/components/forms/photo-uploader";
import { cn } from "@/lib/utils";

interface SubmitFormProps {
  isLoading: boolean;
  onSubmit: (message: string, photos: File[]) => void;
}

export function SubmitForm({ isLoading, onSubmit }: SubmitFormProps) {
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    onSubmit(message, photos);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report a Maintenance Issue</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="issue-message">Describe the issue</Label>
            <Textarea
              id="issue-message"
              rows={4}
              placeholder="Describe the issue..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <PhotoUploader photos={photos} onPhotosChange={setPhotos} />

          <div className={cn("relative")}>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading || !message.trim()}
            >
              {isLoading && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {isLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
