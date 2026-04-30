import { describe, test, expect } from 'vitest';
import {
  processAIResponse,
  calculateRiskScore,
} from '../../lib/screening/ai-analysis';
import { EmploymentStatus, ScreeningRecommendation } from '../../lib/screening/types';
import { SanitizedApplicationData } from '../../lib/screening/compliance-filter';

describe('AI Analysis', () => {
  const mockSanitized: SanitizedApplicationData = {
    employment_status: EmploymentStatus.EMPLOYED,
    employment_duration_months: 36,
    annual_income: 120000,
    monthly_rent_applying_for: 2000,
    has_eviction_history: false,
    credit_score_range: '700-750',
  };

  describe('processAIResponse', () => {
    test('validates and structures a well-formed response', () => {
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
      expect(analysis.risk_factors[0].category).toBe('income');
      expect(analysis.risk_factors[0].signal).toBe('positive');
      expect(analysis.recommendation).toBe(ScreeningRecommendation.STRONG_APPROVE);
      expect(analysis.confidence_score).toBe(0.95);
      expect(analysis.employment_stability_score).toBe(85);
      expect(analysis.credit_indicator).toBe('good');
      expect(analysis.rental_history_signal).toBe('positive');
      expect(analysis.summary).toBe('Strong candidate');
    });

    test('calculates income_to_rent_ratio from sanitized data', () => {
      const rawResponse = {
        risk_factors: [],
        summary: 'Test',
        recommendation: 'approve',
        confidence_score: 0.8,
      };

      const analysis = processAIResponse(rawResponse, mockSanitized);

      // 120000 / (2000 * 12) = 5.0
      expect(analysis.income_to_rent_ratio).toBeCloseTo(5.0, 1);
    });

    test('defaults recommendation to conditional for unknown values', () => {
      const rawResponse = {
        risk_factors: [],
        summary: 'Test',
        recommendation: 'maybe',
        confidence_score: 0.5,
      };

      const analysis = processAIResponse(rawResponse, mockSanitized);

      expect(analysis.recommendation).toBe(ScreeningRecommendation.CONDITIONAL);
    });

    test('defaults confidence_score to 0.7 when missing', () => {
      const rawResponse = {
        risk_factors: [],
        summary: 'Test',
        recommendation: 'approve',
      };

      const analysis = processAIResponse(rawResponse, mockSanitized);

      expect(analysis.confidence_score).toBe(0.7);
    });

    test('clamps confidence_score to 0-1 range', () => {
      const rawResponse = {
        risk_factors: [],
        summary: 'Test',
        recommendation: 'approve',
        confidence_score: 5.0,
      };

      const analysis = processAIResponse(rawResponse, mockSanitized);

      expect(analysis.confidence_score).toBe(1);
    });

    test('clamps employment_stability_score to 0-100', () => {
      const rawResponse = {
        risk_factors: [],
        summary: 'Test',
        recommendation: 'approve',
        employment_stability_score: 150,
      };

      const analysis = processAIResponse(rawResponse, mockSanitized);

      expect(analysis.employment_stability_score).toBe(100);
    });

    test('defaults invalid signal to neutral', () => {
      const rawResponse = {
        risk_factors: [
          {
            category: 'income',
            name: 'Test Factor',
            signal: 'bad_signal',
            details: 'test',
          },
        ],
        summary: 'Test',
        recommendation: 'approve',
      };

      const analysis = processAIResponse(rawResponse, mockSanitized);

      expect(analysis.risk_factors[0].signal).toBe('neutral');
    });

    test('defaults invalid category to other', () => {
      const rawResponse = {
        risk_factors: [
          {
            category: 'unknown_category',
            name: 'Test Factor',
            signal: 'positive',
            details: 'test',
          },
        ],
        summary: 'Test',
        recommendation: 'approve',
      };

      const analysis = processAIResponse(rawResponse, mockSanitized);

      expect(analysis.risk_factors[0].category).toBe('other');
    });

    test('defaults invalid credit_indicator to no_data', () => {
      const rawResponse = {
        risk_factors: [],
        summary: 'Test',
        recommendation: 'approve',
        credit_indicator: 'excellent',
      };

      const analysis = processAIResponse(rawResponse, mockSanitized);

      expect(analysis.credit_indicator).toBe('no_data');
    });

    test('handles empty risk_factors gracefully', () => {
      const rawResponse = {
        risk_factors: null,
        summary: 'Test',
        recommendation: 'approve',
      };

      const analysis = processAIResponse(
        rawResponse as unknown as Record<string, unknown>,
        mockSanitized
      );

      expect(analysis.risk_factors).toEqual([]);
    });

    test('income_to_rent_ratio is undefined when no income', () => {
      const rawResponse = {
        risk_factors: [],
        summary: 'Test',
        recommendation: 'approve',
      };

      const noIncome = { ...mockSanitized, annual_income: undefined };
      const analysis = processAIResponse(rawResponse, noIncome);

      expect(analysis.income_to_rent_ratio).toBeUndefined();
    });
  });

  describe('calculateRiskScore', () => {
    test('starts at 50 with no factors', () => {
      const sanitized = {
        ...mockSanitized,
        annual_income: undefined,
        has_eviction_history: false,
      };

      const score = calculateRiskScore([], sanitized);
      expect(score).toBe(50);
    });

    test('positive factors reduce risk score', () => {
      const factors = [
        {
          category: 'income' as const,
          name: 'Good Income',
          signal: 'positive' as const,
          details: 'Strong',
          weight: 'high' as const,
        },
      ];

      const sanitized = {
        ...mockSanitized,
        annual_income: undefined,
        has_eviction_history: false,
      };

      const score = calculateRiskScore(factors, sanitized);
      expect(score).toBeLessThan(50);
    });

    test('concerning factors increase risk score', () => {
      const factors = [
        {
          category: 'credit' as const,
          name: 'Bad Credit',
          signal: 'concerning' as const,
          details: 'Poor history',
          weight: 'high' as const,
        },
      ];

      const sanitized = {
        ...mockSanitized,
        annual_income: undefined,
        has_eviction_history: false,
      };

      const score = calculateRiskScore(factors, sanitized);
      expect(score).toBeGreaterThan(50);
    });

    test('high income ratio lowers risk', () => {
      // 120000 / (2000 * 12) = 5.0x >= 3.0
      const score = calculateRiskScore([], mockSanitized);
      expect(score).toBeLessThan(50);
    });

    test('low income ratio raises risk', () => {
      const lowIncome = {
        ...mockSanitized,
        annual_income: 30000, // 30000 / (2000 * 12) = 1.25x < 2.0
      };

      const score = calculateRiskScore([], lowIncome);
      expect(score).toBeGreaterThan(50);
    });

    test('eviction history significantly increases risk', () => {
      const withEviction = {
        ...mockSanitized,
        has_eviction_history: true,
        annual_income: undefined,
      };

      const score = calculateRiskScore([], withEviction);
      expect(score).toBe(65); // 50 + 15
    });

    test('weight affects factor impact', () => {
      const highWeight = [
        {
          category: 'income' as const,
          name: 'Test',
          signal: 'concerning' as const,
          details: '',
          weight: 'high' as const,
        },
      ];

      const lowWeight = [
        {
          category: 'income' as const,
          name: 'Test',
          signal: 'concerning' as const,
          details: '',
          weight: 'low' as const,
        },
      ];

      const sanitized = {
        ...mockSanitized,
        annual_income: undefined,
        has_eviction_history: false,
      };

      const highScore = calculateRiskScore(highWeight, sanitized);
      const lowScore = calculateRiskScore(lowWeight, sanitized);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    test('neutral factors do not change score', () => {
      const factors = [
        {
          category: 'other' as const,
          name: 'Neutral',
          signal: 'neutral' as const,
          details: '',
          weight: 'medium' as const,
        },
      ];

      const sanitized = {
        ...mockSanitized,
        annual_income: undefined,
        has_eviction_history: false,
      };

      const score = calculateRiskScore(factors, sanitized);
      expect(score).toBe(50);
    });
  });
});
