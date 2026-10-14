/**
 * Placed-in-service defaults for a cost segregation study.
 *
 * A study's year is the tax year the property was placed in service: year 1
 * of every depreciation schedule, the year whose §168(k) bonus rate applies,
 * and (with the month) what selects the mid-month / mid-quarter columns.
 * The default bonus rate is getBonusRateForYear(study year, purchase date).
 * Property is usually placed in service when it is bought, so the purchase
 * date supplies the defaults. A look-back study keeps the original
 * placed-in-service year; the missed depreciation is caught up on Form 3115.
 */

/** Study years the API accepts (study_year validation range). */
const MIN_STUDY_YEAR = 2000;
const MAX_STUDY_YEAR = 2100;

/** Parse 'YYYY-MM-DD' into [year, month], or null if it isn't one. */
function parseYearMonth(date?: string | null): [number, number] | null {
  const match = date ? /^(\d{4})-(\d{2})-\d{2}/.exec(date) : null;
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? [year, month] : null;
}

/**
 * Default placed-in-service year for a study: the year of the property's
 * purchase date, or `fallbackYear` (the current year) when there is none or
 * it falls outside the accepted study-year range.
 */
export function defaultPlacedInServiceYear(
  purchaseDate?: string | null,
  fallbackYear: number = new Date().getFullYear()
): number {
  const parsed = parseYearMonth(purchaseDate);
  return parsed && parsed[0] >= MIN_STUDY_YEAR && parsed[0] <= MAX_STUDY_YEAR
    ? parsed[0]
    : fallbackYear;
}

/**
 * The month (1-12) a study's property was placed in service: the purchase
 * month when the purchase date falls in the placed-in-service year,
 * otherwise January (the table defaults).
 */
export function placedInServiceMonthFor(
  placedInServiceYear: number,
  purchaseDate?: string | null
): number {
  const parsed = parseYearMonth(purchaseDate);
  return parsed && parsed[0] === placedInServiceYear ? parsed[1] : 1;
}

