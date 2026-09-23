/**
 * Currency formatting with cents, for monthly payment figures.
 *
 * The app-wide formatCurrency() rounds to whole dollars, which is fine for
 * totals but not for a quoted monthly P&I payment (clients compare these to
 * the cent against lender disclosures).
 */
const centsFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrencyCents(
  value: number | null | undefined,
  fallback: string = '$0.00'
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
  return centsFormatter.format(value);
}
