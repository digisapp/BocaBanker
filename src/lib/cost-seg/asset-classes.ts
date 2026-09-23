/**
 * Cost Segregation Asset Classifications
 *
 * Standard asset classifications used in cost segregation studies,
 * along with typical reclassification percentages by property type.
 */

import type { CostSegPropertyType } from '@/constants/property-types'

export interface AssetClass {
  category: string;
  recoveryPeriod: number;
  description: string;
  examples: string[];
}

/**
 * Standard IRS asset classes used in cost segregation studies.
 * Each class maps to a MACRS recovery period.
 */
export const ASSET_CLASSES: AssetClass[] = [
  {
    category: 'personal_property_5yr',
    recoveryPeriod: 5,
    description: '5-Year Personal Property',
    examples: ['Carpeting', 'Appliances', 'Task lighting', 'Decorative fixtures'],
  },
  {
    category: 'personal_property_7yr',
    recoveryPeriod: 7,
    description: '7-Year Personal Property',
    examples: ['Office furniture', 'Cabinetry', 'Security systems', 'Signs'],
  },
  {
    category: 'land_improvements_15yr',
    recoveryPeriod: 15,
    description: '15-Year Land Improvements',
    examples: ['Parking lots', 'Landscaping', 'Sidewalks', 'Fencing', 'Site utilities'],
  },
  {
    category: 'building_27_5yr',
    recoveryPeriod: 27.5,
    description: '27.5-Year Residential Rental',
    examples: ['Structural components', 'HVAC (residential)', 'Plumbing', 'Electrical (building)'],
  },
  {
    category: 'building_39yr',
    recoveryPeriod: 39,
    description: '39-Year Nonresidential',
    examples: ['Structural components', 'HVAC (commercial)', 'Plumbing', 'Electrical (building)'],
  },
  {
    category: 'land',
    recoveryPeriod: 0,
    description: 'Land (Non-depreciable)',
    examples: ['Raw land value'],
  },
];

/**
 * Typical reclassification percentages by property type.
 * Values are percentages of total property value allocated to each asset class.
 * These represent industry averages from engineering-based cost segregation studies.
 */
export const TYPICAL_RECLASSIFICATION: Record<CostSegPropertyType, Record<string, number>> = {
  commercial: {
    personal_property_5yr: 8,
    personal_property_7yr: 7,
    land_improvements_15yr: 10,
    building_39yr: 55,
    land: 20,
  },
  residential: {
    personal_property_5yr: 10,
    personal_property_7yr: 5,
    land_improvements_15yr: 8,
    building_27_5yr: 57,
    land: 20,
  },
  'mixed-use': {
    personal_property_5yr: 9,
    personal_property_7yr: 6,
    land_improvements_15yr: 9,
    building_39yr: 56,
    land: 20,
  },
  industrial: {
    personal_property_5yr: 12,
    personal_property_7yr: 8,
    land_improvements_15yr: 12,
    building_39yr: 48,
    land: 20,
  },
  retail: {
    personal_property_5yr: 10,
    personal_property_7yr: 8,
    land_improvements_15yr: 8,
    building_39yr: 54,
    land: 20,
  },
  hospitality: {
    personal_property_5yr: 15,
    personal_property_7yr: 10,
    land_improvements_15yr: 8,
    building_39yr: 47,
    land: 20,
  },
  healthcare: {
    personal_property_5yr: 12,
    personal_property_7yr: 10,
    land_improvements_15yr: 6,
    building_39yr: 52,
    land: 20,
  },
  multifamily: {
    personal_property_5yr: 12,
    personal_property_7yr: 5,
    land_improvements_15yr: 10,
    building_27_5yr: 53,
    land: 20,
  },
};

export interface AllocationBreakdown {
  category: string;
  description: string;
  amount: number;
  percentage: number;
  recoveryPeriod: number;
}

/**
 * Returns the default cost segregation allocation for a given property type and value.
 * Uses typical reclassification percentages based on engineering study averages.
 *
 * @param propertyType - The type of property (e.g., 'commercial', 'residential', 'industrial')
 * @param totalValue - The total property value (purchase price)
 * @returns Array of allocation breakdowns by asset class
 * @throws Error if the property type is not recognized
 */
export function getDefaultAllocation(
  propertyType: string,
  totalValue: number
): AllocationBreakdown[] {
  const normalizedType = propertyType.toLowerCase() as CostSegPropertyType;
  const percentages = TYPICAL_RECLASSIFICATION[normalizedType];

  if (!percentages) {
    throw new Error(
      `Unknown property type: "${propertyType}". Valid types are: ${Object.keys(TYPICAL_RECLASSIFICATION).join(', ')}`
    );
  }

  const breakdown: AllocationBreakdown[] = [];

  for (const assetClass of ASSET_CLASSES) {
    const pct = percentages[assetClass.category];
    if (pct !== undefined && pct > 0) {
      breakdown.push({
        category: assetClass.category,
        description: assetClass.description,
        amount: Math.round((totalValue * pct) / 100 * 100) / 100,
        percentage: pct,
        recoveryPeriod: assetClass.recoveryPeriod,
      });
    }
  }

  return breakdown;
}

/**
 * Allocation when the property's actual building (depreciable) value is known.
 *
 * getDefaultAllocation() assumes land is a fixed 20% of the purchase price.
 * When the property record carries its own building/land split, the
 * reclassification percentages must be applied to the building value
 * instead — otherwise the asset bases won't sum to the building value that
 * the straight-line baseline uses, and the "savings" include a spurious
 * basis difference rather than just the timing benefit.
 *
 * The depreciable classes keep their typical relative proportions, scaled to
 * sum exactly (to the cent) to buildingValue; the building class absorbs the
 * rounding remainder. Land is landValue when provided, otherwise
 * purchasePrice - buildingValue (floored at 0).
 *
 * @throws Error if the property type is not recognized
 */
export function getAllocationFromBuildingValue(
  propertyType: string,
  buildingValue: number,
  landValue?: number | null,
  purchasePrice?: number | null
): AllocationBreakdown[] {
  const normalizedType = propertyType.toLowerCase() as CostSegPropertyType;
  const percentages = TYPICAL_RECLASSIFICATION[normalizedType];
  if (!percentages) {
    throw new Error(
      `Unknown property type: "${propertyType}". Valid types are: ${Object.keys(TYPICAL_RECLASSIFICATION).join(', ')}`
    );
  }

  const depreciableClasses = ASSET_CLASSES.filter(
    (ac) => ac.recoveryPeriod > 0 && (percentages[ac.category] ?? 0) > 0
  );
  const depreciablePctTotal = depreciableClasses.reduce(
    (sum, ac) => sum + percentages[ac.category],
    0
  );

  const land =
    landValue != null && Number.isFinite(landValue) && landValue > 0
      ? landValue
      : purchasePrice != null && Number.isFinite(purchasePrice)
        ? Math.max(0, purchasePrice - buildingValue)
        : 0;
  const total = buildingValue + land;

  const breakdown: AllocationBreakdown[] = [];
  const buildingCents = Math.round(buildingValue * 100);
  let allocatedCents = 0;
  // Building class (27.5/39) absorbs the rounding remainder
  const remainderClass = depreciableClasses.find((ac) => ac.recoveryPeriod >= 27.5);

  for (const ac of depreciableClasses) {
    if (ac === remainderClass) continue;
    const cents = Math.round((buildingCents * percentages[ac.category]) / depreciablePctTotal);
    allocatedCents += cents;
    breakdown.push({
      category: ac.category,
      description: ac.description,
      amount: cents / 100,
      percentage: 0,
      recoveryPeriod: ac.recoveryPeriod,
    });
  }
  if (remainderClass) {
    breakdown.push({
      category: remainderClass.category,
      description: remainderClass.description,
      amount: (buildingCents - allocatedCents) / 100,
      percentage: 0,
      recoveryPeriod: remainderClass.recoveryPeriod,
    });
  }
  if (land > 0) {
    const landClass = ASSET_CLASSES.find((ac) => ac.category === 'land')!;
    breakdown.push({
      category: landClass.category,
      description: landClass.description,
      amount: Math.round(land * 100) / 100,
      percentage: 0,
      recoveryPeriod: 0,
    });
  }

  // Keep ASSET_CLASSES ordering and fill in % of total property value
  const order = ASSET_CLASSES.map((ac) => ac.category);
  breakdown.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
  for (const item of breakdown) {
    item.percentage = total > 0 ? Math.round((item.amount / total) * 10000) / 100 : 0;
  }
  return breakdown;
}
