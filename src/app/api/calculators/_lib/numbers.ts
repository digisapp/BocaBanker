/**
 * Reads a numeric field from a calculator request body.
 *
 * Finite numbers pass through and numeric strings ("300000") are coerced.
 * A missing field (undefined, null or '') yields `fallback`. Anything else —
 * "abc", booleans, objects, NaN, Infinity — yields NaN, so a range check like
 * `!(value > 0)` fails and the route returns 400 instead of computing zeros.
 */
export function readNumber(value: unknown, fallback: number = NaN): number {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}
