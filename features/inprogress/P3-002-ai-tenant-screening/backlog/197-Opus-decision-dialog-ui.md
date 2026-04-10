---
id: 197
title: Decision dialog UI — approve/deny with fair housing guardrails
tier: Opus
depends_on: [186, 196]
feature: P3-002-ai-tenant-screening
---

# 197 — Decision dialog UI — approve/deny with fair housing guardrails

## Objective
Create a modal dialog for landlords to approve or deny applications. Approve dialog allows optional message. Deny dialog includes fair housing reminder card, required denial reason dropdown, and compliance checkbox (must confirm before submitting). Ensures landlords acknowledge fair housing compliance when denying.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

Modal dialog component for application detail page (task 196). Integrated with decision API (task 186).

## Implementation

### 1. Create decision dialog component

Create `apps/web/components/screening/ApplicationDecisionDialog.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApplicationDecision } from '@/lib/screening/hooks/useApplicationDecision';
import { ApplicationDecisionPayload } from '@/lib/screening/types';

interface DecisionDialogProps {
  applicationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApplicationDecisionDialog({
  applicationId,
  onClose,
  onSuccess,
}: DecisionDialogProps) {
  const { decide, loading, error } = useApplicationDecision();

  const [step, setStep] = useState<'initial' | 'approve' | 'deny'>('initial');
  const [optionalMessage, setOptionalMessage] = useState('');
  const [denialReason, setDenialReason] = useState('');
  const [complianceConfirmed, setComplianceConfirmed] = useState(false);

  const handleApprove = async () => {
    const payload: ApplicationDecisionPayload = {
      decision: 'approve',
      optional_message: optionalMessage || undefined,
    };

    const result = await decide(applicationId, payload);
    if (result) {
      onSuccess();
    }
  };

  const handleDeny = async () => {
    if (!denialReason) {
      alert('Please select a denial reason');
      return;
    }
    if (!complianceConfirmed) {
      alert('Please confirm fair housing compliance');
      return;
    }

    const payload: ApplicationDecisionPayload = {
      decision: 'deny',
      denial_reason: denialReason,
      compliance_confirmed: complianceConfirmed,
    };

    const result = await decide(applicationId, payload);
    if (result) {
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-96 overflow-y-auto">
        {step === 'initial' && (
          <InitialStep setStep={setStep} onClose={onClose} />
        )}

        {step === 'approve' && (
          <ApproveStep
            optionalMessage={optionalMessage}
            setOptionalMessage={setOptionalMessage}
            onApprove={handleApprove}
            onBack={() => setStep('initial')}
            loading={loading}
            error={error}
          />
        )}

        {step === 'deny' && (
          <DenyStep
            denialReason={denialReason}
            setDenialReason={setDenialReason}
            complianceConfirmed={complianceConfirmed}
            setComplianceConfirmed={setComplianceConfirmed}
            onDeny={handleDeny}
            onBack={() => setStep('initial')}
            loading={loading}
            error={error}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Initial step: choose approve or deny
 */
function InitialStep({
  setStep,
  onClose,
}: {
  setStep: (s: 'initial' | 'approve' | 'deny') => void;
  onClose: () => void;
}) {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">
        Make a Decision
      </h2>
      <p className="text-sm text-slate-600">
        Choose to approve or deny this application.
      </p>

      <div className="space-y-3">
        <Button
          onClick={() => setStep('approve')}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          Approve Application
        </Button>
        <Button
          onClick={() => setStep('deny')}
          variant="outline"
          className="w-full border-red-300 text-red-600 hover:bg-red-50"
        >
          Deny Application
        </Button>
      </div>

      <Button onClick={onClose} variant="ghost" className="w-full">
        Cancel
      </Button>
    </div>
  );
}

/**
 * Approve step
 */
function ApproveStep({
  optionalMessage,
  setOptionalMessage,
  onApprove,
  onBack,
  loading,
  error,
}: {
  optionalMessage: string;
  setOptionalMessage: (msg: string) => void;
  onApprove: () => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">
        Approve Application?
      </h2>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Optional Message to Applicant
        </label>
        <textarea
          value={optionalMessage}
          onChange={(e) => setOptionalMessage(e.target.value)}
          placeholder="e.g., 'Congratulations! Welcome to the property.'"
          className="w-full p-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          onClick={onApprove}
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {loading ? 'Approving...' : 'Confirm Approval'}
        </Button>
        <Button onClick={onBack} variant="outline" className="flex-1">
          Back
        </Button>
      </div>
    </div>
  );
}

/**
 * Deny step with fair housing guardrails
 */
function DenyStep({
  denialReason,
  setDenialReason,
  complianceConfirmed,
  setComplianceConfirmed,
  onDeny,
  onBack,
  loading,
  error,
}: {
  denialReason: string;
  setDenialReason: (reason: string) => void;
  complianceConfirmed: boolean;
  setComplianceConfirmed: (confirmed: boolean) => void;
  onDeny: () => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">
        Deny Application?
      </h2>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Fair Housing Compliance Card */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-900">
          <p className="font-semibold mb-1">Fair Housing Notice</p>
          <p className="text-sm">
            Rental decisions must not be based on protected characteristics
            (race, color, religion, sex, national origin, familial status,
            disability, or source of income). Ensure your decision is based
            only on legitimate business factors.
          </p>
        </AlertDescription>
      </Alert>

      {/* Denial Reason */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Reason for Denial *
        </label>
        <Select value={denialReason} onValueChange={setDenialReason}>
          <SelectTrigger>
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="insufficient_income">Insufficient Income</SelectItem>
            <SelectItem value="poor_credit">Poor Credit History</SelectItem>
            <SelectItem value="rental_history">Negative Rental History</SelectItem>
            <SelectItem value="eviction">Eviction Record</SelectItem>
            <SelectItem value="criminal">Criminal History</SelectItem>
            <SelectItem value="employment">Employment Instability</SelectItem>
            <SelectItem value="other">Other (Business-Related)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Compliance Confirmation */}
      <label className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
        <Checkbox
          checked={complianceConfirmed}
          onCheckedChange={(checked) => setComplianceConfirmed(checked === true)}
          className="mt-1"
        />
        <span className="text-sm text-red-900">
          I confirm this denial is based on legitimate business factors and
          not on any protected characteristic.
        </span>
      </label>

      <div className="flex gap-2 pt-4">
        <Button
          onClick={onDeny}
          disabled={loading || !denialReason || !complianceConfirmed}
          className="flex-1 bg-red-600 hover:bg-red-700"
        >
          {loading ? 'Denying...' : 'Confirm Denial'}
        </Button>
        <Button onClick={onBack} variant="outline" className="flex-1">
          Back
        </Button>
      </div>
    </div>
  );
}
```

### 2. Export from component index

Update or create `apps/web/components/screening/index.ts`:

```typescript
export { ApplicationDecisionDialog } from './ApplicationDecisionDialog';
```

## Acceptance Criteria
1. [ ] Modal dialog appears when "Make Decision" clicked
2. [ ] Initial step: approve or deny buttons
3. [ ] Approve step: optional message textarea, confirm button
4. [ ] Deny step: fair housing notice card (required reading), denial reason dropdown, compliance checkbox
5. [ ] Deny: compliance checkbox must be checked before confirm
6. [ ] Deny: reason dropdown required before confirm
7. [ ] Error messages displayed if API fails
8. [ ] Loading states on buttons
9. [ ] Back buttons allow changing decision
10. [ ] useApplicationDecision hook called on confirm
11. [ ] onSuccess callback fires, refetches application (task 196)
12. [ ] Fair housing guardrails prevent careless denials
