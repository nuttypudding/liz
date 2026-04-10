---
id: 198
title: Applicant status page UI — public timeline view
tier: Opus
depends_on: [187, 193]
feature: P3-002-ai-tenant-screening
---

# 198 — Applicant status page UI — public timeline view

## Objective
Create a public status page for applicants to check their application progress using tracking ID. Displays timeline (submitted → under review → decision), current status with generic messages (no AI details), and next steps. Mobile-friendly, no auth required.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Public page at `apps/web/app/apply/status/[trackingId]/page.tsx`. Uses public status API (task 187).

## Implementation

### 1. Create applicant status page

Create `apps/web/app/apply/status/[trackingId]/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { usePublicApplicationStatus } from '@/lib/screening/hooks/usePublicApplicationStatus';
import { PublicApplicationStatusResponse } from '@/lib/screening/types';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ApplicationStatusPage({
  params,
}: {
  params: { trackingId: string };
}) {
  const { status, loading, error, fetchStatus } = usePublicApplicationStatus();
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchStatus(params.trackingId);

    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchStatus(params.trackingId);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [params.trackingId, fetchStatus, autoRefresh]);

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
            {params.trackingId}
          </p>
        </div>

        {loading && !status && (
          <LoadingState />
        )}

        {error && (
          <ErrorState error={error} trackingId={params.trackingId} onRetry={() => fetchStatus(params.trackingId)} />
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

              {/* Next Steps by Status */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="font-semibold text-blue-900 mb-2">
                  What's Next?
                </h3>
                <NextStepsMessage status={status.status} decision={status.decision} />
              </div>
            </div>

            {/* Auto-Refresh Toggle */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <label className="flex items-center space-x-2">
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
                onClick={() => fetchStatus(params.trackingId)}
                variant="outline"
                className="w-full mt-3"
              >
                Refresh Now
              </Button>
            </div>

            {/* FAQ */}
            <FAQ />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Status Timeline Component
 */
function StatusTimeline({ status }: { status: PublicApplicationStatusResponse }) {
  return (
    <div className="bg-white rounded-lg shadow p-8 mb-6">
      <h2 className="font-semibold text-slate-900 mb-8">
        Application Timeline
      </h2>

      <div className="relative">
        {status.status_timeline.map((step, idx) => (
          <div key={idx} className="relative">
            {/* Vertical line (not on last) */}
            {idx < status.status_timeline.length - 1 && (
              <div
                className={`absolute left-5 top-14 w-1 h-12 ${
                  step.completed ? 'bg-green-600' : 'bg-slate-300'
                }`}
              />
            )}

            {/* Step */}
            <div className="flex gap-6 pb-8">
              {/* Circle indicator */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.completed
                    ? 'bg-green-600'
                    : 'bg-slate-300'
                }`}
              >
                {step.completed ? (
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>

              {/* Content */}
              <div className="pt-1 flex-1">
                <h3 className="font-semibold text-slate-900 capitalize">
                  {step.step.replace('_', ' ')}
                </h3>
                {step.timestamp && (
                  <p className="text-sm text-slate-600 mt-1">
                    Completed on {new Date(step.timestamp).toLocaleDateString()}
                  </p>
                )}
                {!step.completed && (
                  <p className="text-sm text-slate-600 mt-1">
                    Pending...
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Next Steps Message based on Status
 */
function NextStepsMessage({
  status,
  decision,
}: {
  status: string;
  decision?: string;
}) {
  if (decision === 'approved') {
    return (
      <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
        <li>The landlord will contact you with next steps</li>
        <li>You may be asked to sign a lease agreement</li>
        <li>Prepare for move-in logistics</li>
      </ul>
    );
  }

  if (decision === 'denied') {
    return (
      <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
        <li>Contact the landlord if you have questions</li>
        <li>You may be able to appeal the decision</li>
        <li>Look for other rental opportunities</li>
      </ul>
    );
  }

  if (status === 'screening' || status === 'under_review') {
    return (
      <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
        <li>Your application is being reviewed</li>
        <li>Background check may be in progress</li>
        <li>Decision typically made within 3–5 business days</li>
      </ul>
    );
  }

  if (status === 'submitted') {
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

/**
 * Loading State
 */
function LoadingState() {
  return (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      <div className="inline-block animate-spin mb-4">
        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            opacity="0.25"
          />
          <path
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      <p className="text-slate-600">Loading your application status...</p>
    </div>
  );
}

/**
 * Error State
 */
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

/**
 * FAQ Section
 */
function FAQ() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How long does the screening process take?',
      answer:
        'Most applications are screened within 3–5 business days. You will receive updates via email throughout the process.',
    },
    {
      question: 'What information is reviewed?',
      answer:
        'We review your income, employment history, rental history, and credit information to assess your ability to pay rent.',
    },
    {
      question: 'Can I update my application?',
      answer:
        'Contact the landlord directly if you need to provide additional information or update your application.',
    },
    {
      question: 'What if my application is denied?',
      answer:
        'You may contact the landlord to discuss their decision or understand the reasons. You may be able to request reconsideration.',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="font-semibold text-slate-900 mb-4">
        Frequently Asked Questions
      </h2>

      <div className="space-y-3">
        {faqs.map((faq, idx) => (
          <button
            key={idx}
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            className="w-full text-left p-4 border border-slate-200 rounded hover:bg-slate-50 transition"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-medium text-slate-900">{faq.question}</h3>
              <svg
                className={`w-5 h-5 text-slate-400 flex-shrink-0 transition ${
                  expandedIdx === idx ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
            {expandedIdx === idx && (
              <p className="text-sm text-slate-600 mt-3">{faq.answer}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## Acceptance Criteria
1. [ ] Page at `/apply/status/[trackingId]` accessible without auth
2. [ ] Displays tracking ID prominently
3. [ ] Loads status via public API (task 187)
4. [ ] Shows timeline with three steps (submitted, under_review, decision)
5. [ ] Timeline marks completed steps with checkmark
6. [ ] Timeline shows timestamps for completed steps
7. [ ] Shows current status message (generic, no AI details)
8. [ ] Next steps box provides action items based on status
9. [ ] Auto-refresh toggle (every 30 seconds)
10. [ ] Manual refresh button
11. [ ] Loading spinner while fetching
12. [ ] Error state with retry button
13. [ ] FAQ section (collapsible Q&A)
14. [ ] Mobile-friendly responsive design
15. [ ] No auth required
16. [ ] Uses usePublicApplicationStatus hook (task 187)
