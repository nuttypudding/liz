import crypto from 'crypto';

/**
 * Generate unique tracking ID for application status lookup
 * Format: APP-XXXXX (e.g., APP-A7K9M)
 */
export function generateTrackingId(): string {
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);
  return `APP-${randomPart}`;
}
