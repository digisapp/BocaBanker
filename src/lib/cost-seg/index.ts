/**
 * Cost Segregation Calculation Engine
 *
 * A comprehensive TypeScript library for performing IRS-compliant cost
 * segregation calculations, including MACRS depreciation, bonus depreciation,
 * tax savings analysis, and NPV/IRR financial modeling.
 *
 * Modules:
 * - macrs-tables:        Official IRS MACRS depreciation rate tables
 * - asset-classes:       Standard asset classifications and reclassification percentages
 * - depreciation:        MACRS depreciation schedule calculator
 * - bonus-depreciation:  Section 168(k) bonus depreciation calculator
 * - tax-savings:         Tax savings comparison (with vs without cost seg)
 * - npv:                 Net Present Value and Internal Rate of Return calculators
 * - report-generator:    Comprehensive study report generator
 */

// MACRS Tables
export {
  MACRS_5_YEAR,
  MACRS_7_YEAR,
  MACRS_15_YEAR,
  MACRS_27_5_YEAR,
  MACRS_39_YEAR,
  getMacrsRates,
} from './macrs-tables';
export type { MacrsRecoveryPeriod } from './macrs-tables';

// Asset Classes
export {
  ASSET_CLASSES,
  TYPICAL_RECLASSIFICATION,
  getDefaultAllocation,
} from './asset-classes';
export type { AssetClass, AllocationBreakdown } from './asset-classes';

// Depreciation
export {
  calculateDepreciation,
  calculateStraightLineDepreciation,
} from './depreciation';
export type { DepreciationEntry } from './depreciation';

// Bonus Depreciation
export { calculateBonusDepreciation } from './bonus-depreciation';
export type { BonusDepreciationResult } from './bonus-depreciation';

// Tax Savings
export { calculateTaxSavings } from './tax-savings';
export type { TaxSavingsEntry } from './tax-savings';

// NPV & IRR
export { calculateNPV, calculateIRR } from './npv';

// Report Generator
export { generateStudyReport } from './report-generator';
export type { StudyReportInput, StudyReport } from './report-generator';
