---
id: 189
title: AI screening analysis — Claude integration with sanitized prompt
tier: Opus
depends_on: [188, 185]
feature: P3-002-ai-tenant-screening
---

# 189 — AI screening analysis — Claude integration with sanitized prompt

## Objective
Create the AI screening analysis module that integrates Claude API to evaluate applicant financial stability, employment history, and rental history. Uses the sanitized prompt from the compliance filter to ensure fair housing compliance. Returns structured risk score (1-100), recommendation, and itemized factors.

## Context
Reference: `features/inprogress/P3-002-ai-tenant-screening/README.md`

This module uses the sanitized data from task 188 and calls Claude API with a fair-housing-compliant prompt. Returns AIScreeningAnalysis result (risk_score, recommendation, factors).

## Implementation

### 1. Create AI analysis module

Create `apps/web/lib/screening/ai-analysis.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import {
  Application,
  AIScreeningAnalysis,
  ScreeningFactor,
} from './types';
import {
  sanitizeApplicationForAI,
  buildSanitizedPrompt,
  createComplianceAuditSnapshot,
  validateSanitizedData,
} from './compliance-filter';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AIAnalysisResult {
  success: boolean;
  analysis?: AIScreeningAnalysis;
  complianceSnapshot?: Record<string, unknown>;
  error?: string;
}

/**
 * Run AI screening analysis on application
 * Uses sanitized data and fair-housing compliant prompt
 */
export async function analyzeApplicationWithAI(
  application: Application,
  creditScoreRange?: string,
  landlordMinIncomeRatio?: number
): Promise<AIAnalysisResult> {
  try {
    // Step 1: Sanitize application data
    const sanitized = sanitizeApplicationForAI(application, creditScoreRange);

    // Step 2: Validate sanitized data (no PII leakage)
    const validation = validateSanitizedData(sanitized);
    if (!validation.valid) {
      console.error('PII validation failed:', validation.issues);
      return {
        success: false,
        error: 'Data sanitization validation failed',
      };
    }

    // Step 3: Build compliant prompt
    const prompt = buildSanitizedPrompt(sanitized, landlordMinIncomeRatio);

    // Step 4: Call Claude API
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Step 5: Parse response
    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from Claude response:', responseText);
      return {
        success: false,
        error: 'Invalid response format from AI model',
      };
    }

    const analysisData = JSON.parse(jsonMatch[0]);

    // Step 6: Validate and structure analysis
    const analysis = processAIResponse(analysisData, sanitized);

    // Step 7: Create compliance snapshot
    const snapshot = createComplianceAuditSnapshot(
      application,
      sanitized,
      creditScoreRange
    );

    return {
      success: true,
      analysis,
      complianceSnapshot: snapshot,
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate and structure Claude response
 */
function processAIResponse(
  data: any,
  sanitized: ReturnType<typeof sanitizeApplicationForAI>
): AIScreeningAnalysis {
  // Ensure risk_factors is array
  const risk_factors: ScreeningFactor[] = Array.isArray(data.risk_factors)
    ? data.risk_factors.map((factor: any) => ({
        category: factor.category || 'other',
        name: factor.name || 'Unknown',
        signal: ['positive', 'neutral', 'concerning'].includes(factor.signal)
          ? factor.signal
          : 'neutral',
        details: factor.details || '',
        weight: factor.weight || 'medium',
      }))
    : [];

  // Calculate risk score from factors (1-100)
  let riskScore = calculateRiskScore(risk_factors, sanitized);

  // Clamp to 1-100
  riskScore = Math.max(1, Math.min(100, riskScore));

  // Map recommendation
  const recommendation = validateRecommendation(data.recommendation);

  return {
    risk_factors,
    income_to_rent_ratio: sanitized.annual_income
      ? sanitized.annual_income / (sanitized.monthly_rent_applying_for * 12)
      : undefined,
    employment_stability_score:
      typeof data.employment_stability_score === 'number'
        ? Math.max(0, Math.min(100, data.employment_stability_score))
        : 50,
    credit_indicator: ['good', 'fair', 'poor', 'no_data'].includes(
      data.credit_indicator
    )
      ? data.credit_indicator
      : 'no_data',
    rental_history_signal: ['positive', 'neutral', 'concerning'].includes(
      data.rental_history_signal
    )
      ? data.rental_history_signal
      : 'neutral',
    summary: data.summary || 'Analysis complete',
    recommendation,
    confidence_score:
      typeof data.confidence_score === 'number'
        ? Math.max(0, Math.min(1, data.confidence_score))
        : 0.7,
  };
}

/**
 * Calculate risk score (1-100) from factors
 * Lower score = lower risk (safer), Higher score = higher risk (riskier)
 */
function calculateRiskScore(
  factors: ScreeningFactor[],
  sanitized: ReturnType<typeof sanitizeApplicationForAI>
): number {
  let baseScore = 50; // Start at neutral

  // Adjust by factors
  factors.forEach((factor) => {
    const weight =
      factor.weight === 'high' ? 10 : factor.weight === 'low' ? 3 : 6;

    if (factor.signal === 'concerning') {
      baseScore += weight;
    } else if (factor.signal === 'positive') {
      baseScore -= weight;
    }
  });

  // Income-to-rent ratio adjustment
  if (sanitized.annual_income) {
    const ratio = sanitized.annual_income / (sanitized.monthly_rent_applying_for * 12);
    if (ratio >= 3.0) {
      baseScore -= 5; // Positive signal
    } else if (ratio < 2.0) {
      baseScore += 8; // Concerning signal
    }
  }

  // Eviction history adjustment
  if (sanitized.has_eviction_history) {
    baseScore += 15; // Significant risk
  }

  return baseScore;
}

/**
 * Validate and normalize recommendation
 */
function validateRecommendation(
  rec: string | undefined
): AIScreeningAnalysis['recommendation'] {
  const valid = ['strong_approve', 'approve', 'conditional', 'deny'];
  if (valid.includes(rec)) {
    return rec as AIScreeningAnalysis['recommendation'];
  }
  return 'conditional'; // Default to cautious
}
```

### 2. Create helper for screening report creation

Create `apps/web/lib/screening/screening-service.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { analyzeApplicationWithAI } from './ai-analysis';
import { ScreeningReport, ApplicationStatus } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Create screening report from AI analysis and background check results
 */
export async function createScreeningReport(
  applicationId: string,
  backgroundCheckResults?: Record<string, unknown>,
  creditScoreRange?: string
) {
  try {
    // Get full application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      throw new Error('Application not found');
    }

    // Get landlord preferences for income ratio
    const { data: landlord } = await supabase
      .from('landlord_profiles')
      .select('min_income_ratio')
      .eq('id', application.landlord_id)
      .single();

    // Run AI analysis
    const aiResult = await analyzeApplicationWithAI(
      application,
      creditScoreRange,
      landlord?.min_income_ratio
    );

    if (!aiResult.success) {
      throw new Error(aiResult.error || 'AI analysis failed');
    }

    // Create screening report
    const { data: report, error: insertError } = await supabase
      .from('screening_reports')
      .insert([
        {
          application_id: applicationId,
          provider: 'claude-ai', // Marker for AI-only screening
          status: 'completed',
          credit_score_range: creditScoreRange,
          background_result: backgroundCheckResults,
          ai_analysis: aiResult.analysis,
          risk_score: calculateOverallRiskScore(aiResult.analysis),
          recommendation: aiResult.analysis?.recommendation,
          prompt_snapshot: aiResult.complianceSnapshot,
        },
      ])
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create screening report: ${insertError.message}`);
    }

    // Update application status and risk_score
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        status: ApplicationStatus.SCREENED,
        risk_score: report.risk_score,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Failed to update application:', updateError);
    }

    return { success: true, report };
  } catch (error) {
    console.error('Screening report creation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate overall risk score from AI analysis
 */
function calculateOverallRiskScore(analysis: any): number {
  if (typeof analysis?.risk_factors === 'object' && analysis.risk_factors.length > 0) {
    // Average risk from factors
    let total = 0;
    let count = 0;

    analysis.risk_factors.forEach((factor: any) => {
      const signalScore =
        factor.signal === 'concerning'
          ? 75
          : factor.signal === 'positive'
            ? 25
            : 50;
      const weight = factor.weight === 'high' ? 1.5 : factor.weight === 'low' ? 0.5 : 1;
      total += signalScore * weight;
      count += weight;
    });

    return Math.round(total / count);
  }

  return 50; // Default neutral
}
```

### 3. Create tests

Create `apps/web/lib/screening/__tests__/ai-analysis.test.ts`:

```typescript
import { processAIResponse, calculateRiskScore } from '../ai-analysis';
import { EmploymentStatus } from '../types';

describe('AI Analysis', () => {
  const mockSanitized = {
    employment_status: EmploymentStatus.EMPLOYED,
    employment_duration_months: 36,
    annual_income: 120000,
    monthly_rent_applying_for: 2000,
    has_eviction_history: false,
    credit_score_range: '700-750',
  };

  test('processAIResponse validates and structures response', () => {
    const rawResponse = {
      risk_factors: [
        {
          category: 'income',
          name: 'Income-to-Rent Ratio',
          signal: 'positive',
          details: '5.0x monthly rent',
          weight: 'high',
        },
      ],
      employment_stability_score: 85,
      credit_indicator: 'good',
      rental_history_signal: 'positive',
      summary: 'Strong candidate',
      recommendation: 'strong_approve',
      confidence_score: 0.95,
    };

    const analysis = processAIResponse(rawResponse, mockSanitized);

    expect(analysis.risk_factors).toHaveLength(1);
    expect(analysis.recommendation).toBe('strong_approve');
    expect(analysis.confidence_score).toBe(0.95);
    expect(analysis.income_to_rent_ratio).toBeCloseTo(5.0, 1);
  });

  test('calculateRiskScore adjusts for income ratio', () => {
    const factors = [];
    const sanitized = { ...mockSanitized, annual_income: 120000 };

    // 120000 / (2000 * 12) = 5.0x should lower risk
    const score = calculateRiskScore(factors, sanitized);
    expect(score).toBeLessThan(50);
  });

  test('calculateRiskScore increases for eviction history', () => {
    const factors = [];
    const sanitized = { ...mockSanitized, has_eviction_history: true };

    const score = calculateRiskScore(factors, sanitized);
    expect(score).toBeGreaterThan(50);
  });
});
```

## Acceptance Criteria
1. [ ] analyzeApplicationWithAI() sanitizes application data
2. [ ] Validates sanitized data (no PII)
3. [ ] Builds fair-housing compliant prompt
4. [ ] Calls Claude API with max_tokens=1024
5. [ ] Extracts and parses JSON response
6. [ ] Validates AI response structure (risk_factors, recommendation, etc.)
7. [ ] Returns AIScreeningAnalysis with:
   - risk_factors array (category, name, signal, details, weight)
   - income_to_rent_ratio calculated
   - employment_stability_score (0-100)
   - credit_indicator (good/fair/poor/no_data)
   - rental_history_signal
   - summary text
   - recommendation (strong_approve/approve/conditional/deny)
   - confidence_score (0-1)
8. [ ] Risk score calculated from factors (1-100)
9. [ ] createScreeningReport() orchestrates full report creation
10. [ ] Application status updated to 'screened' after analysis
11. [ ] Compliance snapshot stored for audit trail
12. [ ] Unit tests cover response validation and risk calculation
13. [ ] Used by screening orchestrator (task 192)
