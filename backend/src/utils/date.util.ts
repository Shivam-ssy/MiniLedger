import { LoanStatus } from '@prisma/client';

/**
 * Returns current UTC date with time set to 00:00:00.000Z.
 * All date-only comparisons (like dueDate < today) are evaluated in UTC.
 */
export function getUtcTodayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Parses a date string (YYYY-MM-DD or ISO) into a UTC midnight Date.
 */
export function parseUtcDateOnly(dateString: string): Date {
  // If YYYY-MM-DD format
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString);
  if (dateMatch && dateMatch[1] && dateMatch[2] && dateMatch[3]) {
    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const day = parseInt(dateMatch[3], 10);
    return new Date(Date.UTC(year, month, day));
  }

  const d = new Date(dateString);
  if (isNaN(d.getTime())) {
    throw new Error('Invalid date');
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Overdue definition per domain rules:
 * Overdue = status = PENDING AND dueDate < today (date-only comparison, server in UTC).
 * Due today is NOT overdue.
 */
export function isLoanOverdue(
  status: LoanStatus | string,
  dueDate: Date,
  today: Date = getUtcTodayDate(),
): boolean {
  if (status !== LoanStatus.PENDING && status !== 'PENDING') {
    return false;
  }

  const loanUtc = new Date(
    Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()),
  );

  return loanUtc.getTime() < today.getTime();
}
