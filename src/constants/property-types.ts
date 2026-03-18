/**
 * Single source of truth for property type enums across the application.
 *
 * All database schemas, validation schemas, AI tool definitions, and UI
 * components should import from this file rather than defining their own lists.
 */

// ---------------------------------------------------------------------------
// Master list (superset of all property types used anywhere in the app)
// ---------------------------------------------------------------------------

export const PROPERTY_TYPES = [
  'commercial',
  'residential',
  'mixed-use',
  'industrial',
  'retail',
  'office',
  'hospitality',
  'healthcare',
  'multifamily',
  'other',
] as const

export type PropertyType = (typeof PROPERTY_TYPES)[number]

// ---------------------------------------------------------------------------
// Context-specific subsets
// ---------------------------------------------------------------------------

/**
 * Property types used in the properties table / property forms.
 * These represent owned or managed properties tracked for cost-seg studies.
 */
export const PROPERTY_PROPERTY_TYPES = [
  'commercial',
  'residential',
  'mixed-use',
  'industrial',
  'retail',
  'office',
  'hospitality',
  'healthcare',
  'multifamily',
  'other',
] as const satisfies readonly PropertyType[]

export type PropertyPropertyType = (typeof PROPERTY_PROPERTY_TYPES)[number]

/**
 * Property types used in the leads table / lead forms.
 * Leads come from commercial real estate transactions so they omit
 * "residential" and "commercial" (generic) but include "office" and "other".
 */
export const LEAD_PROPERTY_TYPES = [
  'industrial',
  'office',
  'retail',
  'multifamily',
  'mixed-use',
  'hospitality',
  'healthcare',
  'other',
] as const satisfies readonly PropertyType[]

export type LeadPropertyType = (typeof LEAD_PROPERTY_TYPES)[number]

/**
 * Property types that have cost-seg reclassification data in asset-classes.ts.
 */
export const COST_SEG_PROPERTY_TYPES = [
  'commercial',
  'residential',
  'mixed-use',
  'industrial',
  'retail',
  'hospitality',
  'healthcare',
  'multifamily',
] as const satisfies readonly PropertyType[]

export type CostSegPropertyType = (typeof COST_SEG_PROPERTY_TYPES)[number]

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

/** Human-readable labels for property types, useful in dropdowns / cards. */
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  commercial: 'Commercial',
  residential: 'Residential',
  'mixed-use': 'Mixed Use',
  industrial: 'Industrial',
  retail: 'Retail',
  office: 'Office',
  hospitality: 'Hospitality',
  healthcare: 'Healthcare',
  multifamily: 'Multifamily',
  other: 'Other',
}

/** Convenience for building select option lists from any subset. */
export function propertyTypeOptions<T extends PropertyType>(types: readonly T[]) {
  return types.map((value) => ({ value, label: PROPERTY_TYPE_LABELS[value] }))
}
