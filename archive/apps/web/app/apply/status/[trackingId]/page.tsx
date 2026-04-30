"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePublicApplicationStatus } from "@/lib/screening/hooks/usePublicApplicationStatus";
import { PublicApplicationStatusResponse } from "@/lib/screening/types";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

export default function ApplicationStatusPage() {
  const { trackingId } = useParams<{ trackingId: string }>();
  const { status, loading, error, fetchStatus } =
    usePublicApplicationStatus();
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchStatus(trackingId);
  }, [trackingId, fetchStatus]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStatus(trackingId);
    }, 30000);

    return () => clearInterval(interval);
  }, [trackingId, fetchStatus, autoRefresh]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Application Status
          </h1>
          <p className="text-slate-600">
            Track your rental application progress
          </p>
        </div>

        {/* Tracking ID Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p className="text-sm font-medium text-slate-600 mb-1">
            Tracking ID
          </p>
          <p className="text-xl font-mono font-bold text-blue-600">
            {trackingId}
          </p>
        </div>

        {loading && !status && <LoadingState />}

        {error && (
          <ErrorState
            error={error}
            trackingId={trackingId}
            onRetry={() => fetchStatus(trackingId)}
          />
        )}

        {status && (
          <>
            <StatusTimeline status={status} />

            {/* Status Message */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="font-semibold text-slate-900 mb-3">
                Current Status
              </h2>
              <p className="text-slate-700 leading-relaxed">
                {status.message}
              </p>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="font-semibold text-blue-900 mb-2">
                  What&apos;s Next?
                </h3>
                <NextStepsMessage
                  status={status.status}
                  decision={status.decision}
                />
              </div>
            </div>

            {/* Auto-Refresh Toggle */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">
                  Auto-refresh status every 30 seconds
                </span>
              </label>
              <Button
                onClick={() => fetchStatus(trackingId)}
                variant="outline"
                className="w-full mt-3"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh Now
              </Button>
            </div>

            {/* FAQ */}
            <FAQSection />
          </>
        )}
      </div>
    </div>
  );
}

function StatusTimeline({
  status,
}: {
  status: PublicApplicationStatusResponse;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-8 mb-6">
      <h2 className="font-semibold text-slate-900 mb-8">
        Application Timeline
      </h2>

      <div className="relative">
        {status.status_timeline.map((step, idx) => (
          <div key={step.step} className="relative">
            {/* Vertical connector line */}
            {idx < status.status_timeline.length - 1 && (
              <div
                className={`absolute left-5 top-14 w-0.5 h-12 ${
                  step.completed ? "bg-green-500" : "bg-slate-200"
                }`}
              />
            )}

            <div className="flex gap-6 pb-8">
              {/* Circle indicator */}
              <div className="flex-shrink-0">
                {step.completed ? (
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                ) : (
                  <Circle className="w-10 h-10 text-slate-300" />
                )}
              </div>

              {/* Content */}
              <div className="pt-1 flex-1">
                <h3 className="font-semibold text-slate-900 capitalize">
                  {step.step.replace(/_/g, " ")}
                </h3>
                {step.timestamp && (
                  <p className="text-sm text-slate-500 mt-1">
                    {new Date(step.timestamp).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
                {!step.completed && (
                  <p className="text-sm text-slate-400 mt-1">Pending</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NextStepsMessage({
  status,
  decision,
}: {
  status: string;
  decision?: string;
}) {
  if (decision === "approved") {
    return (
      <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
        <li>The landlord will contact you with next steps</li>
        <li>You may be asked to sign a lease agreement</li>
        <li>Prepare for move-in logistics</li>
      </ul>
    );
  }

  if (decision === "denied") {
    return (
      <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
        <li>Contact the landlord if you have questions</li>
        <li>You may be able to appeal the decision</li>
        <li>Look for other rental opportunities</li>
      </ul>
    );
  }

  if (status === "screening" || status === "under_review") {
    return (
      <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
        <li>Your application is being reviewed</li>
        <li>Background check may be in progress</li>
        <li>Decision typically made within 3–5 business days</li>
      </ul>
    );
  }

  if (status === "submitted") {
    return (
      <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
        <li>Application received and queued for review</li>
        <li>You will receive updates via email</li>
        <li>Check back soon for status updates</li>
      </ul>
    );
  }

  return null;
}

function LoadingState() {
  return (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
      <p className="text-slate-600">Loading your application status...</p>
    </div>
  );
}

function ErrorState({
  error,
  trackingId,
  onRetry,
}: {
  error: string;
  trackingId: string;
  onRetry: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-8">
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>

      <div className="space-y-2">
        <p className="text-sm text-slate-600">
          If you believe this is incorrect, verify your tracking ID:
        </p>
        <p className="font-mono text-sm font-bold text-slate-900">
          {trackingId}
        </p>
      </div>

      <Button onClick={onRetry} className="w-full mt-4">
        Try Again
      </Button>
    </div>
  );
}

const faqs = [
  {
    question: "How long does the screening process take?",
    answer:
      "Most applications are screened within 3–5 business days. You will receive updates via email throughout the process.",
  },
  {
    question: "What information is reviewed?",
    answer:
      "We review your income, employment history, rental history, and credit information to assess your ability to pay rent.",
  },
  {
    question: "Can I update my application?",
    answer:
      "Contact the landlord directly if you need to provide additional information or update your application.",
  },
  {
    question: "What if my application is denied?",
    answer:
      "You may contact the landlord to discuss their decision or understand the reasons. You may be able to request reconsideration.",
  },
];

function FAQSection() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="font-semibold text-slate-900 mb-4">
        Frequently Asked Questions
      </h2>

      <Accordion>
        {faqs.map((faq, idx) => (
          <AccordionItem key={idx} value={`faq-${idx}`}>
            <AccordionTrigger className="text-slate-900">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-slate-600">{faq.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
