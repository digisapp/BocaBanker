'use client'

import { DollarSign, TrendingUp, Percent, Calculator } from 'lucide-react'
import AssetBreakdownChart from './AssetBreakdownChart'
import DepreciationChart from './DepreciationChart'
import TaxSavingsChart from './TaxSavingsChart'

function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '$0'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

interface StudyResultsProps {
  results: {
    summary: {
      totalReclassified: number
      totalFirstYearDeduction: number
      totalTaxSavings: number
      npvTaxSavings: number
      effectiveRate: number
    }
    assetBreakdown: {
      category: string
      amount: number
      percentage: number
      recoveryPeriod: number
    }[]
    depreciationSchedule: {
      year: number
      accelerated: number
      straightLine: number
      difference: number
    }[]
    taxSavingsSchedule: {
      year: number
      withCostSeg: number
      withoutCostSeg: number
      savings: number
      cumulativeSavings: number
    }[]
    firstYearAnalysis: {
      bonusDepreciation: number
      regularFirstYear: number
      totalFirstYear: number
      taxSavings: number
    }
  }
}

export default function StudyResults({ results }: StudyResultsProps) {
  const { summary, assetBreakdown, depreciationSchedule, taxSavingsSchedule, firstYearAnalysis } = results

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <DollarSign className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              First Year Deduction
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {formatCurrency(summary.totalFirstYearDeduction)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Bonus: {formatCurrency(firstYearAnalysis.bonusDepreciation)}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(16,185,129,0.15)]">
              <TrendingUp className="h-4 w-4 text-[#10B981]" />
            </div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              Total Tax Savings
            </span>
          </div>
          <p className="text-2xl font-bold text-[#10B981]">
            {formatCurrency(summary.totalTaxSavings)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Cumulative over asset life</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(59,130,246,0.15)]">
              <Calculator className="h-4 w-4 text-[#3B82F6]" />
            </div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              NPV of Savings
            </span>
          </div>
          <p className="text-2xl font-bold text-[#3B82F6]">
            {formatCurrency(summary.npvTaxSavings)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Net present value</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(139,92,246,0.15)]">
              <Percent className="h-4 w-4 text-[#8B5CF6]" />
            </div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              Effective Rate
            </span>
          </div>
          <p className="text-2xl font-bold text-[#8B5CF6]">
            {summary.effectiveRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">First-year savings / price</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-amber-600 mb-4 uppercase tracking-wide">
            Asset Allocation
          </h3>
          <AssetBreakdownChart data={assetBreakdown} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-amber-600 mb-4 uppercase tracking-wide">
            Depreciation Comparison
          </h3>
          <DepreciationChart data={depreciationSchedule} />
        </div>
      </div>

      {/* Tax Savings */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-amber-600 mb-4 uppercase tracking-wide">
          Cumulative Tax Savings
        </h3>
        <TaxSavingsChart data={taxSavingsSchedule} />
      </div>

      {/* First Year Analysis */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-amber-600 mb-4 uppercase tracking-wide">
          First Year Analysis
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <span className="text-xs text-gray-500">Bonus Depreciation</span>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {formatCurrency(firstYearAnalysis.bonusDepreciation)}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Regular First Year MACRS</span>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {formatCurrency(firstYearAnalysis.regularFirstYear)}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Total First Year</span>
            <p className="text-lg font-semibold text-amber-600 mt-1">
              {formatCurrency(firstYearAnalysis.totalFirstYear)}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Tax Savings (Year 1)</span>
            <p className="text-lg font-semibold text-[#10B981] mt-1">
              {formatCurrency(firstYearAnalysis.taxSavings)}
            </p>
          </div>
        </div>
      </div>

      {/* Asset Detail Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-amber-600 mb-4 uppercase tracking-wide">
          Asset Breakdown Detail
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-500 font-medium">Category</th>
                <th className="text-right py-2 text-gray-500 font-medium">Recovery</th>
                <th className="text-right py-2 text-gray-500 font-medium">Amount</th>
                <th className="text-right py-2 text-gray-500 font-medium">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {assetBreakdown.map((asset, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2.5 text-gray-900">
                    {asset.category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </td>
                  <td className="py-2.5 text-gray-500 text-right">
                    {asset.recoveryPeriod === 0 ? 'N/A' : `${asset.recoveryPeriod} yr`}
                  </td>
                  <td className="py-2.5 text-gray-900 text-right font-medium">
                    {formatCurrency(asset.amount)}
                  </td>
                  <td className="py-2.5 text-gray-500 text-right">
                    {asset.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
