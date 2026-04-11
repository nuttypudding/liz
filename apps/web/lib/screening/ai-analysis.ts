import Anthropic from '@anthropic-ai/sdk';
import {
  Application,
  AIScreeningAnalysis,
  ScreeningFactor,
  ScreeningRecommendation,
} from './types';
import {
  sanitizeApplicationForAI,
  buildSanitizedPrompt,
  createComplianceAuditSnapshot,
  validateSanitizedData,
  SanitizedApplicationData,
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
 * Run AI screening analysis on application.
 * Uses sanitized data and fair-housing compliant prompt.
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
      model: 'claude-sonnet-4-20250514',
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
    const snapshot = createComplianceAuditSnapshot(application, sanitized);

    return {
      success: true,
      analysis,
      complianceSnapshot: snapshot as unknown as Record<string, unknown>,
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
 * Validate and structure Claude response into AIScreeningAnalysis.
 */
export function processAIResponse(
  data: Record<string, unknown>,
  sanitized: SanitizedApplicationData
): AIScreeningAnalysis {
  const rawFactors = Array.isArray(data.risk_factors) ? data.risk_factors : [];

  const risk_factors: ScreeningFactor[] = rawFactors.map(
    (factor: Record<string, unknown>) => ({
      category: validateCategory(factor.category as string),
      name: (factor.name as string) || 'Unknown',
      signal: validateSignal(factor.signal as string),
      details: (factor.details as string) || '',
      weight: validateWeight(factor.weight as string),
    })
  );

  let riskScore = calculateRiskScore(risk_factors, sanitized);
  riskScore = Math.max(1, Math.min(100, riskScore));

  const recommendation = validateRecommendation(data.recommendation as string);

  return {
    risk_factors,
    income_to_rent_ratio: sanitized.annual_income
      ? sanitized.annual_income / (sanitized.monthly_rent_applying_for * 12)
      : undefined,
    employment_stability_score:
      typeof data.employment_stability_score === 'number'
        ? Math.max(0, Math.min(100, data.employment_stability_score))
        : 50,
    credit_indicator: validateCreditIndicator(data.credit_indicator as string),
    rental_history_signal: validateSignal(
      data.rental_history_signal as string
    ),
    summary: (data.summary as string) || 'Analysis complete',
    recommendation,
    confidence_score:
      typeof data.confidence_score === 'number'
        ? Math.max(0, Math.min(1, data.confidence_score))
        : 0.7,
  };
}

/**
 * Calculate risk score (1-100) from factors.
 * Lower = lower risk (safer), higher = higher risk (riskier).
 */
export function calculateRiskScore(
  factors: ScreeningFactor[],
  sanitized: SanitizedApplicationData
): number {
  let baseScore = 50;

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
    const ratio =
      sanitized.annual_income / (sanitized.monthly_rent_applying_for * 12);
    if (ratio >= 3.0) {
      baseScore -= 5;
    } else if (ratio < 2.0) {
      baseScore += 8;
    }
  }

  // Eviction history adjustment
  if (sanitized.has_eviction_history) {
    baseScore += 15;
  }

  return baseScore;
}

function validateRecommendation(
  rec: string | undefined
): ScreeningRecommendation {
  const map: Record<string, ScreeningRecommendation> = {
    strong_approve: ScreeningRecommendation.STRONG_APPROVE,
    approve: ScreeningRecommendation.APPROVE,
    conditional: ScreeningRecommendation.CONDITIONAL,
    deny: ScreeningRecommendation.DENY,
  };
  return (rec && map[rec]) || ScreeningRecommendation.CONDITIONAL;
}

function validateCategory(
  cat: string | undefined
): ScreeningFactor['category'] {
  const valid: ScreeningFactor['category'][] = [
    'income',
    'employment',
    'credit',
    'rental_history',
    'other',
  ];
  return valid.includes(cat as ScreeningFactor['category'])
    ? (cat as ScreeningFactor['category'])
    : 'other';
}

function validateSignal(
  signal: string | undefined
): 'positive' | 'neutral' | 'concerning' {
  const valid = ['positive', 'neutral', 'concerning'] as const;
  return valid.includes(signal as (typeof valid)[number])
    ? (signal as (typeof valid)[number])
    : 'neutral';
}

function validateWeight(
  weight: string | undefined
): 'low' | 'medium' | 'high' {
  const valid = ['low', 'medium', 'high'] as const;
  return valid.includes(weight as (typeof valid)[number])
    ? (weight as (typeof valid)[number])
    : 'medium';
}

function validateCreditIndicator(
  indicator: string | undefined
): string {
  const valid = ['good', 'fair', 'poor', 'no_data'];
  return valid.includes(indicator as string) ? indicator! : 'no_data';
}
