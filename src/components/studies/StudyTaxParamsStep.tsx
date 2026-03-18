'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface StudyTaxParamsStepProps {
  taxRate: number
  onTaxRateChange: (value: number) => void
  discountRate: number
  onDiscountRateChange: (value: number) => void
  bonusDepreciationRate: number
  onBonusDepreciationRateChange: (value: number) => void
  studyYear: number
  onStudyYearChange: (value: number) => void
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
  errors,
}: StudyTaxParamsStepProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Tax Parameters</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label className="text-gray-500">Tax Rate (%)</Label>
          <Input type="number" value={taxRate} onChange={(e) => onTaxRateChange(Number(e.target.value))} min={0} max={100} step={0.1} className="mt-1.5 bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20" />
          {errors.tax_rate && <p className="text-xs text-red-400 mt-1">{errors.tax_rate}</p>}
          <p className="text-xs text-gray-400 mt-1">Federal marginal tax rate</p>
        </div>
        <div>
          <Label className="text-gray-500">Discount Rate (%)</Label>
          <Input type="number" value={discountRate} onChange={(e) => onDiscountRateChange(Number(e.target.value))} min={0} max={100} step={0.1} className="mt-1.5 bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20" />
          {errors.discount_rate && <p className="text-xs text-red-400 mt-1">{errors.discount_rate}</p>}
          <p className="text-xs text-gray-400 mt-1">For NPV calculation</p>
        </div>
        <div>
          <Label className="text-gray-500">Bonus Depreciation Rate (%)</Label>
          <Input type="number" value={bonusDepreciationRate} onChange={(e) => onBonusDepreciationRateChange(Number(e.target.value))} min={0} max={100} step={1} className="mt-1.5 bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20" />
          {errors.bonus_depreciation_rate && <p className="text-xs text-red-400 mt-1">{errors.bonus_depreciation_rate}</p>}
          <p className="text-xs text-gray-400 mt-1">Section 168(k) rate for eligible assets</p>
        </div>
        <div>
          <Label className="text-gray-500">Study Year</Label>
          <Input type="number" value={studyYear} onChange={(e) => onStudyYearChange(Number(e.target.value))} min={2000} max={2100} className="mt-1.5 bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20" />
          {errors.study_year && <p className="text-xs text-red-400 mt-1">{errors.study_year}</p>}
        </div>
      </div>
    </div>
  )
}
