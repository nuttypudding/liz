/**
 * Documentation tests — verify compliance documentation is current
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeApplicationForAI,
  validateSanitizedData,
  buildSanitizedPrompt,
  getRemovedFields,
} from '@/lib/screening/compliance-filter';

describe('Compliance Documentation', () => {
  it('should export all compliance filter functions', () => {
    // Verify that compliance filter exports all required functions
    expect(typeof sanitizeApplicationForAI).toBe('function');
    expect(typeof validateSanitizedData).toBe('function');
    expect(typeof buildSanitizedPrompt).toBe('function');
    expect(typeof getRemovedFields).toBe('function');
  });

  it('should include Fair Housing compliance instructions in sanitized prompts', () => {
    // Verify that prompts include Fair Housing guidance
    const mockSanitized = {
      employment_status: 'employed',
      employment_duration_months: 24,
      annual_income: 80000,
      monthly_rent_applying_for: 2000,
      has_eviction_history: false,
    };

    const prompt = buildSanitizedPrompt(mockSanitized);

    // Check for Fair Housing-related content
    expect(prompt.toLowerCase()).toContain('fair housing');
    expect(prompt.toLowerCase()).toContain('protected');
    expect(prompt.toLowerCase()).toContain('financial');
    expect(prompt.toLowerCase()).toContain('employment');
  });
});
