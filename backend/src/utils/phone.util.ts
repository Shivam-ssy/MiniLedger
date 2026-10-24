import { AppError } from '../errors/app-error';

/**
 * Normalizes phone numbers to standard E.164 format (defaults to India +91).
 * Supports:
 * - 10-digit Indian numbers: "9876543210" -> "+919876543210"
 * - 0-prefixed 10-digit: "09876543210" -> "+919876543210"
 * - 91-prefixed: "919876543210" -> "+919876543210"
 * - International + format: "+919876543210" or "+14155552671"
 * Strips whitespace, hyphens, and brackets.
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone || typeof rawPhone !== 'string') {
    throw AppError.badRequest('Phone number is required');
  }

  // Remove spaces, dashes, brackets, and common delimiters
  const cleaned = rawPhone.replace(/[\s\-().]/g, '');

  // 10 digits Indian mobile number (starts with 6, 7, 8, or 9)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // 11 digits starting with 0 followed by Indian mobile number
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned.slice(1)}`;
  }

  // 12 digits starting with 91 followed by Indian mobile number
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Standard E.164 format: + followed by 8 to 15 digits
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    // If it's a +91 number, also ensure it follows Indian mobile rules (10 digits starting with 6-9)
    if (cleaned.startsWith('+91') && !/^\+91[6-9]\d{9}$/.test(cleaned)) {
      throw AppError.badRequest('Invalid Indian mobile phone number');
    }
    return cleaned;
  }

  throw AppError.badRequest('Invalid phone number format. Please provide a valid 10-digit mobile number.');
}
