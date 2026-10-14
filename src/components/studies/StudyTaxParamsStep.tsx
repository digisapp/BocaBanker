'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { quarterForMonth } from '@/lib/cost-seg/macrs-tables'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

interface StudyTaxParamsStepProps {
  taxRate: number
  onTaxRateChange: (value: number) => void
  discountRate: number
  onDiscountRateChange: (value: number) => void
  bonusDepreciationRate: number
  onBonusDepreciationRateChange: (value: number) => void
  studyYear: number
  onStudyYearChange: (value: number) => void
  midQuarterConvention: boolean
  onMidQuarterConventionChange: (value: boolean) => void
  /** 'YYYY-MM-DD' purchase date of the selected property, if on record */
  purchaseDate?: string | null
  /** 1-12, the month the calculation will treat as placed in service */
  placedInServiceMonth: number
  errors: Record<string, string>
}

export default function StudyTaxParamsStep({
  taxRate,
  onTaxRateChange,
  discountRate,
  onDiscountRateChange,
  bonusDepreciationRate,
  onBonusDepreciationRateChange,
  studyYear,
  onStudyYearChange,
  midQuarterConvention,
  onMidQuarterConventionChange,
  purchaseDate,
  placedInServiceMonth,
  errors,
}: StudyTaxParamsStepProps) {
  const purchaseYear = purchaseDate ? Number(purchaseDate.slice(0, 4)) : NaN
  const purchaseMonthKnown = Number.isFinite(purchaseYear) && purchaseYear === studyYear
  const quarter = quarterForMonth(placedInServiceMonth)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Tax Parameters</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label className="text-gray-500">Tax Rate (%)</Label>
          <Input type="number" inputMode="decimal" value={taxRate} onChange={(e) => onTaxRateChange(Number(e.target.value))} min={0} max={100} step={0.1} className="mt-1.5 bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20" />
          {errors.tax_rate && <p className="text-xs text-red-400 mt-1">{errors.tax_rate}</p>}
          <p className="text-xs text-gray-400 mt-1">Federal marginal tax rate</p>
        </div>
        <div>
          <Label className="text-gray-500">Discount Rate (%)</Label>
          <Input type="number" inputMode="decimal" value={discountRate} onChange={(e) => onDiscountRateChange(Number(e.target.value))} min={0} max={100} step={0.1} className="mt-1.5 bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20" />
          {errors.discount_rate && <p className="text-xs text-red-400 mt-1">{errors.discount_rate}</p>}
          <p className="text-xs text-gray-400 mt-1">For NPV calculation</p>
        </div>
        <div>
          <Label className="text-gray-500">Tax Year Placed in Service</Label>
          <Input type="number" inputMode="numeric" value={studyYear} onChange={(e) => onStudyYearChange(Number(e.target.value))} min={2000} max={2100} className="mt-1.5 bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20" />
          {errors.study_year && <p className="text-xs text-red-400 mt-1">{errors.study_year}</p>}
          {Number.isFinite(purchaseYear) && studyYear >= 2000 && studyYear < purchaseYear && (
            <p className="text-xs text-amber-700 mt-1">
              This is before the property&apos;s purchase date ({purchaseDate}) — property can&apos;t be placed in service before it&apos;s acquired.
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">Year 1 of the depreciation schedule; it also sets the bonus rate. Defaults to the purchase year. For a look-back study on a property bought in an earlier year, keep the year it was placed in service (the catch-up is claimed on Form 3115).</p>
        </div>
        <div>
          <Label className="text-gray-500">Bonus Depreciation Rate (%)</Label>
          <Input type="number" inputMode="decimal" value={bonusDepreciationRate} onChange={(e) => onBonusDepreciationRateChange(Number(e.target.value))} min={0} max={100} step={1} className="mt-1.5 bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20" />
          {errors.bonus_depreciation_rate && <p className="text-xs text-red-400 mt-1">{errors.bonus_depreciation_rate}</p>}
          <p className="text-xs text-gray-400 mt-1">Section 168(k) rate for eligible assets. Defaults to the statutory rate for the year placed in service and the purchase (acquisition) date: 100% if acquired after Jan 19, 2025; otherwise 100% 2018-2022, 80% 2023, 60% 2024, 40% 2025, 20% 2026; 50% 2015-2017.</p>
        </div>
        <div className="md:col-span-2 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="mid-quarter-convention" className="text-gray-700">Mid-quarter convention applies</Label>
              <p className="text-xs text-gray-400 mt-1">Use when more than 40% of the taxpayer&apos;s personal property placed in service this year was placed in service in Q4 (October-December) — ask the client&apos;s CPA. 5, 7 and 15-year property then uses the IRS mid-quarter tables for the quarter placed in service; the building stays on the mid-month convention.</p>
            </div>
            <Switch
              id="mid-quarter-convention"
              checked={midQuarterConvention}
              onCheckedChange={onMidQuarterConventionChange}
            />
          </div>
          {midQuarterConvention && (
            <p className="text-xs text-amber-700 mt-3">
              {purchaseMonthKnown
                ? `Quarter used: Q${quarter} (placed in service ${MONTHS[placedInServiceMonth - 1]} ${studyYear}, from the purchase date).`
                : `No ${studyYear} purchase date on record, so January (Q1) is assumed. Set the property's purchase date to use its quarter.`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
