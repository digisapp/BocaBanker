/**
 * Net Present Value & Internal Rate of Return Calculators
 *
 * Financial analysis tools for evaluating the time value of money
 * in cost segregation tax savings.
 */

/**
 * Calculates the Net Present Value of a series of cash flows.
 *
 * Discounts future cash flows back to their present value using the
 * provided discount rate. Used to evaluate the real economic benefit
 * of accelerated depreciation deductions over time.
 *
 * Formula: NPV = SUM( cashFlow[t] / (1 + r)^(t+1) ) for each year t
 *
 * @param cashFlows - Array of annual cash flows (e.g., tax savings per year)
 * @param discountRate - Annual discount rate as a percentage (e.g., 5 for 5%)
 * @returns The net present value of the cash flow stream
 */
export function calculateNPV(cashFlows: number[], discountRate: number): number {
  const r = discountRate / 100;

  let npv = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    npv += cashFlows[t] / Math.pow(1 + r, t + 1);
  }

  return Math.round(npv * 100) / 100;
}

/**
 * Calculates the approximate Internal Rate of Return using the bisection method.
 *
 * The IRR is the discount rate at which the NPV of cash flows equals zero.
 * This implementation uses a bisection (binary search) approach to find the
 * rate within a specified tolerance.
 *
 * @param cashFlows - Array of annual cash flows (positive values expected for savings)
 * @param tolerance - Convergence tolerance for the bisection method (default: 0.0001)
 * @param maxIterations - Maximum number of bisection iterations (default: 1000)
 * @returns The approximate IRR as a percentage, or NaN if no solution is found
 */
export function calculateIRR(
  cashFlows: number[],
  tolerance: number = 0.0001,
  maxIterations: number = 1000
): number {
  if (cashFlows.length === 0) {
    return NaN;
  }

  // For IRR to be meaningful, we need both positive and negative cash flows.
  // In the cost seg context, the initial "investment" is implicit (the cost of
  // the study), and the cash flows are the incremental tax savings.
  // If all cash flows are the same sign, IRR is undefined.
  const hasPositive = cashFlows.some((cf) => cf > 0);
  const hasNegative = cashFlows.some((cf) => cf < 0);

  // If all flows are positive (pure savings with no upfront cost in the array),
  // we still compute a meaningful result by treating the first positive flow
  // as the baseline. But if truly all same sign, return NaN.
  if (!hasPositive && !hasNegative) {
    return NaN;
  }

  // Helper: compute NPV at a given rate (as decimal, not percentage)
  function npvAtRate(rate: number): number {
    let npv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + rate, t + 1);
    }
    return npv;
  }

  // Bisection bounds (search from -50% to 500%)
  let low = -0.5;
  let high = 5.0;

  // Ensure the function changes sign across the interval
  const npvLow = npvAtRate(low);
  const npvHigh = npvAtRate(high);

  if (npvLow * npvHigh > 0) {
    // No sign change found in the search range; IRR may not exist
    // or is outside the range [-50%, 500%]
    return NaN;
  }

  // Bisection method
  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const npvMid = npvAtRate(mid);

    if (Math.abs(npvMid) < tolerance) {
      return Math.round(mid * 10000) / 100; // Convert to percentage with 2 decimal places
    }

    if (npvMid * npvAtRate(low) < 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  // Return best estimate after max iterations
  const bestRate = (low + high) / 2;
  return Math.round(bestRate * 10000) / 100;
}
