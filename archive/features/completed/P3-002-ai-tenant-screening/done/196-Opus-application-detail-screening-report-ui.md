---
id: 196
title: Application detail + screening report UI — two-column layout
tier: Opus
depends_on: [185, 189, 193]
feature: P3-002-ai-tenant-screening
---

# 196 — Application detail + screening report UI — two-column layout

## Objective
Create a detailed application view page with two-column layout. Left column: applicant info, references, income analysis. Right column: AI screening report with risk score, recommendation badge, factor breakdown, expandable details. Includes "Run Screening" button if not yet screened.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Protected page at `apps/web/app/(landlord)/applications/[id]/page.tsx`.

## Implementation

### 1. Create application detail page

Create `apps/web/app/(landlord)/applications/[id]/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useApplicationDetail } from '@/lib/screening/hooks/useApplicationDetail';
import { useScreeningOrchestrator } from '@/lib/screening/hooks/useScreeningOrchestrator';
import { ApplicationStatus } from '@/lib/screening/types';

export default function ApplicationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data, loading, error: detailError, refetch } = useApplicationDetail(params.id);
  const { initiateScreening, loading: screeningLoading, error: screeningError } =
    useScreeningOrchestrator();

  const [showDecisionDialog, setShowDecisionDialog] = useState(false);

  const handleRunScreening = async () => {
    const success = await initiateScreening(params.id);
    if (success) {
      setTimeout(() => refetch(), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
            </svg>
          </div>
          <p className="text-slate-600">Loading application...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Application not found</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const app = data.application;
  const report = data.screening_report;
  const metrics = data.computed_metrics;
  const isScreened = [ApplicationStatus.SCREENED, ApplicationStatus.APPROVED, ApplicationStatus.DENIED].includes(app.status as any);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {app.first_name} {app.last_name}
          </h1>
          <p className="text-slate-600 mt-1">{app.email}</p>
        </div>
        <div className="flex gap-2">
          <Badge className={getStatusColor(app.status)}>
            {app.status.toUpperCase()}
          </Badge>
          {app.risk_score && (
            <Badge className={getRiskColor(app.risk_score)}>
              Risk: {app.risk_score}
            </Badge>
          )}
        </div>
      </div>

      {/* Errors */}
      {detailError && (
        <Alert variant="destructive">
          <AlertDescription>{detailError}</AlertDescription>
        </Alert>
      )}
      {screeningError && (
        <Alert variant="destructive">
          <AlertDescription>{screeningError}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Application Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-900">
              Personal Information
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Phone</p>
                <p className="font-medium text-slate-900">{app.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-600">Date of Birth</p>
                <p className="font-medium text-slate-900">
                  {app.date_of_birth || 'N/A'}
                </p>
              </div>
            </div>
          </section>

          {/* Employment Info */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-900">
              Employment
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Status</p>
                <p className="font-medium text-slate-900">
                  {app.employment_status}
                </p>
              </div>
              <div>
                <p className="text-slate-600">Duration</p>
                <p className="font-medium text-slate-900">
                  {app.employment_duration_months || 'N/A'} months
                </p>
              </div>
              <div>
                <p className="text-slate-600">Employer</p>
                <p className="font-medium text-slate-900">
                  {app.employer_name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-slate-600">Job Title</p>
                <p className="font-medium text-slate-900">
                  {app.job_title || 'N/A'}
                </p>
              </div>
            </div>
          </section>

          {/* Income & Rent */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-900">
              Financial
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Annual Income</p>
                <p className="font-medium text-slate-900">
                  {app.annual_income ? `$${app.annual_income.toLocaleString()}` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-slate-600">Monthly Rent</p>
                <p className="font-medium text-slate-900">
                  ${app.monthly_rent_applying_for.toLocaleString()}
                </p>
              </div>
              {metrics.income_to_rent_ratio !== undefined && (
                <div>
                  <p className="text-slate-600">Income-to-Rent Ratio</p>
                  <p className={`font-medium ${
                    metrics.meets_min_ratio ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metrics.income_to_rent_ratio.toFixed(2)}x
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* References */}
          {app.references && app.references.length > 0 && (
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-slate-900">
                References
              </h2>
              <div className="space-y-3">
                {app.references.map((ref, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded">
                    <p className="font-medium text-slate-900">{ref.name}</p>
                    <p className="text-sm text-slate-600">
                      {ref.relationship} {ref.phone && `• ${ref.phone}`}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Rental History */}
          {app.has_eviction_history && (
            <section className="bg-white rounded-lg shadow p-6 border border-red-200">
              <h2 className="text-lg font-semibold mb-4 text-red-900">
                Eviction History
              </h2>
              <p className="text-sm text-red-800">{app.eviction_details}</p>
            </section>
          )}
        </div>

        {/* Right Column: Screening Report */}
        <div className="lg:col-span-1">
          {isScreened && report ? (
            <ScreeningReportPanel report={report} />
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <svg className="w-12 h-12 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-semibold text-slate-900 mb-2">
                Ready to Screen?
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Run a background check to analyze this application.
              </p>
              <Button
                onClick={handleRunScreening}
                disabled={screeningLoading}
                className="w-full"
              >
                {screeningLoading ? 'Starting...' : 'Run Screening'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {isScreened && (
        <div className="bg-white rounded-lg shadow p-6 flex gap-2">
          {app.status !== ApplicationStatus.APPROVED && app.status !== ApplicationStatus.DENIED && (
            <Button onClick={() => setShowDecisionDialog(true)}>
              Make Decision
            </Button>
          )}
          <Button variant="outline" onClick={() => router.back()}>
            Back to List
          </Button>
        </div>
      )}

      {/* Decision Dialog */}
      {showDecisionDialog && (
        <DecisionDialog
          applicationId={params.id}
          onClose={() => setShowDecisionDialog(false)}
          onSuccess={() => {
            setShowDecisionDialog(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

/**
 * Screening Report Panel (Right column)
 */
function ScreeningReportPanel({ report }: any) {
  const [expandedFactor, setExpandedFactor] = useState<number | null>(null);

  const recommendationColors: Record<string, string> = {
    strong_approve: 'bg-green-100 text-green-800',
    approve: 'bg-green-100 text-green-800',
    conditional: 'bg-yellow-100 text-yellow-800',
    deny: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Screening Report</h2>

      {/* Risk Score */}
      <div className="text-center p-4 bg-slate-50 rounded-lg">
        <p className="text-sm text-slate-600 mb-1">Risk Score</p>
        <p className={`text-3xl font-bold ${getRiskColor(report.risk_score).replace('bg-', 'text-')}`}>
          {report.risk_score || 'N/A'}
        </p>
      </div>

      {/* Recommendation */}
      {report.recommendation && (
        <div>
          <p className="text-sm text-slate-600 mb-2">Recommendation</p>
          <Badge className={recommendationColors[report.recommendation] || 'bg-gray-100 text-gray-800'}>
            {report.recommendation.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      )}

      {/* Risk Factors */}
      {report.ai_analysis?.risk_factors && (
        <div>
          <h3 className="font-semibold text-slate-900 mb-2">Factors</h3>
          <div className="space-y-2">
            {report.ai_analysis.risk_factors.map((factor: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setExpandedFactor(expandedFactor === idx ? null : idx)}
                className="w-full text-left p-3 bg-slate-50 rounded hover:bg-slate-100 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-slate-900">{factor.name}</p>
                    <Badge className={`text-xs mt-1 ${getSignalColor(factor.signal)}`}>
                      {factor.signal}
                    </Badge>
                  </div>
                  <svg className={`w-5 h-5 text-slate-400 transition ${expandedFactor === idx ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                {expandedFactor === idx && (
                  <p className="text-sm text-slate-600 mt-2">{factor.details}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {report.ai_analysis?.summary && (
        <div className="p-3 bg-blue-50 rounded">
          <p className="text-sm text-blue-900">{report.ai_analysis.summary}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Decision Dialog
 */
function DecisionDialog({ applicationId, onClose, onSuccess }: any) {
  // Implementation in task 197
  return null; // Placeholder
}

function getStatusColor(status: string) {
  switch (status) {
    case ApplicationStatus.SUBMITTED:
      return 'bg-gray-100 text-gray-800';
    case ApplicationStatus.SCREENING:
      return 'bg-yellow-100 text-yellow-800';
    case ApplicationStatus.SCREENED:
      return 'bg-blue-100 text-blue-800';
    case ApplicationStatus.APPROVED:
      return 'bg-green-100 text-green-800';
    case ApplicationStatus.DENIED:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getRiskColor(score?: number): string {
  if (!score) return 'bg-gray-100 text-gray-800';
  if (score <= 30) return 'bg-green-100 text-green-800';
  if (score <= 60) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

function getSignalColor(signal: string): string {
  switch (signal) {
    case 'positive':
      return 'bg-green-100 text-green-800';
    case 'concerning':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
```

## Acceptance Criteria
1. [ ] Page at `/applications/[id]` (protected by Clerk auth)
2. [ ] Two-column layout (desktop), stacked (mobile)
3. [ ] Left column: personal info, employment, income, references, rental history
4. [ ] Computes and displays income-to-rent ratio
5. [ ] Right column: screening report (if available)
6. [ ] Shows risk score, recommendation badge, factor breakdown
7. [ ] Factors expandable/collapsible
8. [ ] "Run Screening" button if not screened
9. [ ] "Make Decision" button if screened but not decided
10. [ ] Status and risk badges at top
11. [ ] useApplicationDetail hook used (task 185)
12. [ ] useScreeningOrchestrator hook used (task 192)
13. [ ] Wired to decision dialog (task 197)
