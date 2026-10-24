/**
 * Converts rupees (e.g. 150.50) to integer minor units / paise (15050).
 */
export function rupeesToPaise(amountInRupees: number): number {
  return Math.round(amountInRupees * 100);
}

/**
 * Converts integer minor units / paise (15050) to rupees number (150.50).
 * Consistent 2 decimals representation.
 */
export function paiseToRupees(amountInPaise: number): number {
  return Number((amountInPaise / 100).toFixed(2));
}
