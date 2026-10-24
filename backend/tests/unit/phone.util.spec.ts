import { normalizePhone } from '../../src/utils/phone.util';
import { AppError } from '../../src/errors/app-error';

describe('Phone Normalization Utility', () => {
  it('normalizes 10-digit Indian phone number', () => {
    expect(normalizePhone('9876543210')).toBe('+919876543210');
    expect(normalizePhone('8765432109')).toBe('+918765432109');
    expect(normalizePhone('7654321098')).toBe('+917654321098');
    expect(normalizePhone('6543210987')).toBe('+916543210987');
  });

  it('normalizes 0-prefixed 10-digit Indian phone number', () => {
    expect(normalizePhone('09876543210')).toBe('+919876543210');
  });

  it('normalizes 91-prefixed Indian phone number', () => {
    expect(normalizePhone('919876543210')).toBe('+919876543210');
  });

  it('normalizes +91 formatted numbers with whitespace and hyphens', () => {
    expect(normalizePhone('+91 98765-43210')).toBe('+919876543210');
    expect(normalizePhone('+91 (98765) 43210')).toBe('+919876543210');
    expect(normalizePhone('98765 43210')).toBe('+919876543210');
  });

  it('keeps valid international E.164 numbers', () => {
    expect(normalizePhone('+14155552671')).toBe('+14155552671');
    expect(normalizePhone('+442071838750')).toBe('+442071838750');
  });

  it('rejects invalid numbers', () => {
    expect(() => normalizePhone('12345')).toThrow(AppError);
    expect(() => normalizePhone('abcdefghij')).toThrow(AppError);
    expect(() => normalizePhone('+911234567890')).toThrow(AppError); // Invalid mobile prefix in India
    expect(() => normalizePhone('')).toThrow(AppError);
  });
});
