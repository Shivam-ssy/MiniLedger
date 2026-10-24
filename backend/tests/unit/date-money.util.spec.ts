import { getUtcTodayDate, isLoanOverdue, parseUtcDateOnly } from '../../src/utils/date.util';
import { paiseToRupees, rupeesToPaise } from '../../src/utils/money.util';

describe('Date & Overdue Utilities', () => {
  it('correctly compares overdue dates (UTC date-only)', () => {
    const today = getUtcTodayDate();

    // Due yesterday: OVERDUE
    const yesterday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1));
    expect(isLoanOverdue('PENDING', yesterday, today)).toBe(true);

    // Due today: NOT overdue (per domain rules)
    expect(isLoanOverdue('PENDING', today, today)).toBe(false);

    // Due tomorrow: NOT overdue
    const tomorrow = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
    expect(isLoanOverdue('PENDING', tomorrow, today)).toBe(false);

    // Repaid loans are NEVER overdue, regardless of dueDate
    expect(isLoanOverdue('REPAID', yesterday, today)).toBe(false);
  });

  it('parses date string to UTC date only', () => {
    const parsed = parseUtcDateOnly('2026-10-24');
    expect(parsed.getUTCFullYear()).toBe(2026);
    expect(parsed.getUTCMonth()).toBe(9); // 0-indexed October
    expect(parsed.getUTCDate()).toBe(24);
  });
});

describe('Money Conversion Utilities', () => {
  it('converts rupees to minor units (paise) correctly', () => {
    expect(rupeesToPaise(100)).toBe(10000);
    expect(rupeesToPaise(150.50)).toBe(15050);
    expect(rupeesToPaise(0.25)).toBe(25);
  });

  it('converts minor units (paise) to rupees with 2 decimal precision', () => {
    expect(paiseToRupees(10000)).toBe(100);
    expect(paiseToRupees(15050)).toBe(150.5);
    expect(paiseToRupees(25)).toBe(0.25);
    expect(paiseToRupees(0)).toBe(0);
  });
});
