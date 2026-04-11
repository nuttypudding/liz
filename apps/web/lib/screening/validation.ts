import { ApplicationSubmissionPayload, EmploymentStatus } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateApplicationPayload(
  payload: ApplicationSubmissionPayload
): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!payload.property_id?.trim()) errors.push('property_id is required');
  if (!payload.first_name?.trim()) errors.push('first_name is required');
  if (!payload.last_name?.trim()) errors.push('last_name is required');
  if (!payload.email?.trim()) errors.push('email is required');
  if (payload.email && !isValidEmail(payload.email)) errors.push('Invalid email format');
  if (!payload.employment_status) errors.push('employment_status is required');
  if (payload.employment_status && !Object.values(EmploymentStatus).includes(payload.employment_status)) {
    errors.push('Invalid employment_status');
  }
  if (!payload.monthly_rent_applying_for || payload.monthly_rent_applying_for <= 0) {
    errors.push('monthly_rent_applying_for is required and must be > 0');
  }

  // Optional but validated if present
  if (payload.phone && !isValidPhone(payload.phone)) {
    errors.push('Invalid phone format');
  }

  if (payload.date_of_birth && !isValidDate(payload.date_of_birth)) {
    errors.push('Invalid date_of_birth format (expected YYYY-MM-DD)');
  }

  if (payload.annual_income !== undefined && payload.annual_income < 0) {
    errors.push('annual_income must be >= 0');
  }

  if (payload.references) {
    if (!Array.isArray(payload.references)) {
      errors.push('references must be an array');
    } else {
      payload.references.forEach((ref, i) => {
        if (!ref.name?.trim()) errors.push(`references[${i}].name is required`);
        if (!ref.relationship?.trim()) errors.push(`references[${i}].relationship is required`);
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidPhone(phone: string): boolean {
  const re = /^[\d\s\-\+\(\)]+$/;
  return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

function isValidDate(dateString: string): boolean {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
