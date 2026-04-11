"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, Send, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DisclaimerBanner } from "@/components/compliance/DisclaimerBanner";
import { CommunicationReviewerPanel } from "@/components/compliance/CommunicationReviewerPanel";
import { COMPLIANCE_DISCLAIMERS } from "@/lib/compliance/disclaimers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Property } from "@/lib/types";

export default function MessageReviewPage() {
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [messageText, setMessageText] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProperties() {
      try {
        const res = await fetch("/api/properties");
        if (res.ok) {
          const data = await res.json();
          const list: Property[] = data.properties ?? data ?? [];
          setProperties(list);
          if (list.length > 0) {
            setSelectedPropertyId(list[0].id);
          }
        }
      } catch {
        // Silently handle — user sees empty state
      } finally {
        setLoading(false);
      }
    }
    fetchProperties();
  }, []);

  const handleReview = useCallback(() => {
    if (!messageText.trim() || !selectedPropertyId) return;
    setReviewOpen(true);
  }, [messageText, selectedPropertyId]);

  const canReview = messageText.trim().length > 0 && selectedPropertyId !== "";

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/compliance")}
      >
        <ArrowLeft className="mr-2 size-4" />
        Back to Compliance
      </Button>

      <PageHeader
        title="Review Message"
        description="Check your landlord-to-tenant messages for compliance issues before sending."
      />

      <DisclaimerBanner
        type="warning"
        text={COMPLIANCE_DISCLAIMERS.FAIR_HOUSING_REMINDER}
        dismissable
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="size-5" />
            Compose & Review
          </CardTitle>
          <CardDescription>
            Enter the message you plan to send, select the property for
            jurisdiction context, then click Review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Property selector */}
          <div className="space-y-2">
            <Label htmlFor="property-select">Property</Label>
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : properties.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No properties found. Add a property first.
              </p>
            ) : (
              <Select
                value={selectedPropertyId}
                onValueChange={(v) => { if (v) setSelectedPropertyId(v) }}
              >
                <SelectTrigger id="property-select">
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.city}, {p.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Message textarea */}
          <div className="space-y-2">
            <Label htmlFor="message-text">Message</Label>
            <Textarea
              id="message-text"
              placeholder="Type your message to the tenant here..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={8}
              className="resize-y"
            />
            <p className="text-xs text-muted-foreground">
              {messageText.length} characters
            </p>
          </div>

          {/* Review button */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleReview}
              disabled={!canReview}
              className="gap-1.5"
            >
              <ShieldCheck className="size-4" />
              Review for Compliance
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reviewer panel (sheet) */}
      <CommunicationReviewerPanel
        messageText={messageText}
        propertyId={selectedPropertyId}
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onEditMessage={() => setReviewOpen(false)}
        onSendMessage={() => {
          setReviewOpen(false);
          setMessageText("");
        }}
        onSendAnyway={() => {
          setReviewOpen(false);
          setMessageText("");
        }}
      />
    </div>
  );
}
