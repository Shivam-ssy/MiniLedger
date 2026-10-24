/**
 * Formats a number with Indian currency symbol (₹) and standard Indian grouping.
 * e.g. 150000.5 -> "₹1,50,000.50"
 */
export function formatIndianCurrency(amount: number): string {
  if (isNaN(amount)) return '₹0.00';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount.toFixed(2)}`;
  }
}

/**
 * Formats ISO date string to human-readable date: "24 Oct 2026".
 */
export function formatDisplayDate(dateStr: string): string {
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00Z`);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Computes how many days a loan is overdue based on UTC date-only comparison.
 */
export function calculateOverdueDays(dueDateStr: string): number {
  try {
    const due = new Date(dueDateStr.includes('T') ? dueDateStr : `${dueDateStr}T00:00:00Z`);
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const diffMs = todayUtc.getTime() - due.getTime();
    return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  } catch {
    return 1;
  }
}

/**
 * Formats relative due dates for list presentation.
 */
export function formatRelativeDueDate(
  dueDateStr: string,
  status: string,
  repaidAt?: string | null,
): string {
  if (status === 'REPAID') {
    return repaidAt ? `Settled on ${formatDisplayDate(repaidAt)}` : 'Settled';
  }

  try {
    const due = new Date(dueDateStr.includes('T') ? dueDateStr : `${dueDateStr}T00:00:00Z`);
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const diffDays = Math.round((due.getTime() - todayUtc.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      return `Overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'}`;
    }
    if (diffDays === 0) {
      return 'Due today';
    }
    if (diffDays === 1) {
      return 'Due tomorrow';
    }
    return `Due in ${diffDays} days`;
  } catch {
    return `Due ${formatDisplayDate(dueDateStr)}`;
  }
}
