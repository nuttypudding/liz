"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { SubmitForm } from "@/components/forms/submit-form";
import { GatekeeperResponse } from "@/components/forms/gatekeeper-response";
import { Skeleton } from "@/components/ui/skeleton";

type SubmitState =
  | "loading"
  | "idle"
  | "uploading"
  | "submitting"
  | "gatekeeper"
  | "escalated"
  | "resolved"
  | "error";

interface GatekeeperResult {
  self_resolvable: boolean;
  troubleshooting_guide?: string;
  request_id: string;
}

export default function SubmitPage() {
  const [state, setState] = useState<SubmitState>("loading");
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [gatekeeperResult, setGatekeeperResult] =
    useState<GatekeeperResult | null>(null);

  const isLoading = state === "uploading" || state === "submitting";

  useEffect(() => {
    fetch("/api/tenant/me")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then(({ tenant }) => {
        setPropertyId(tenant.property_id);
        setState("idle");
      })
      .catch(() => {
        toast.error("Could not load your profile. Please try again.");
        setState("error");
      });
  }, []);

  async function handleSubmit(message: string, photos: File[]) {
    if (!propertyId) {
      toast.error("No property linked to your account.");
      return;
    }

    try {
      // 1. Upload photos (if any)
      let photoPaths: string[] = [];
      if (photos.length > 0) {
        setState("uploading");
        const formData = new FormData();
        photos.forEach((p) => formData.append("files", p));
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "Photo upload failed");
        }
        const { paths } = await uploadRes.json();
        photoPaths = paths;
      }

      // 2. Create intake request
      setState("submitting");
      const intakeRes = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_message: message,
          photo_paths: photoPaths,
          property_id: propertyId,
        }),
      });
      if (!intakeRes.ok) {
        const err = await intakeRes.json();
        throw new Error(err.error || "Failed to submit request");
      }
      const { id: requestId } = await intakeRes.json();

      // 3. Trigger classification
      const classifyRes = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId }),
      });
      if (!classifyRes.ok) {
        const err = await classifyRes.json();
        throw new Error(err.error || "Classification failed");
      }
      const { gatekeeper } = await classifyRes.json();

      // 4. Show gatekeeper response
      setGatekeeperResult({
        self_resolvable: gatekeeper.self_resolvable,
        troubleshooting_guide: gatekeeper.troubleshooting_guide,
        request_id: requestId,
      });
      setState("gatekeeper");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setState("idle");
    }
  }

  async function handleResolved() {
    if (!gatekeeperResult) return;
    try {
      const res = await fetch(
        `/api/requests/${gatekeeperResult.request_id}/resolve`,
        { method: "POST" }
      );
      if (!res.ok) {
        throw new Error("Failed to update request status");
      }
    } catch {
      // Non-blocking — still show resolved UI even if status update fails
      console.error("Failed to mark request as resolved");
    }
    setState("resolved");
  }

  function handleEscalate() {
    setState("escalated");
  }

  function handleReset() {
    setState("idle");
    setGatekeeperResult(null);
  }

  if (state === "loading") {
    return (
      <div className="px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="px-4 py-6">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
            <AlertCircle className="size-7 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Something went wrong</h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              We couldn&apos;t load your profile. Please refresh and try again.
            </p>
          </div>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (state === "resolved") {
    return (
      <div className="px-4 py-6">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40">
            <CheckCircle2 className="size-7 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Issue resolved</h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              Glad the troubleshooting helped! Let us know if the problem comes back.
            </p>
          </div>
          <Button onClick={handleReset}>Submit Another</Button>
        </div>
      </div>
    );
  }

  if (state === "escalated") {
    return (
      <div className="px-4 py-6">
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/40">
            <CheckCircle2 className="size-7 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">
              Request sent to your landlord
            </h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              We&apos;ve notified your landlord. You&apos;ll hear back soon.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Link href="/my-requests" className={buttonVariants({ variant: "outline" })}>
              View My Requests
            </Link>
            <Button onClick={handleReset}>Submit Another</Button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "gatekeeper" && gatekeeperResult) {
    return (
      <div className="px-4 py-6">
        <GatekeeperResponse
          response={gatekeeperResult}
          onResolved={handleResolved}
          onEscalate={handleEscalate}
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <SubmitForm isLoading={isLoading} onSubmit={handleSubmit} />
    </div>
  );
}
