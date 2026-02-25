'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { logger } from '@/lib/logger'
import { ArrowLeft, Printer, Download, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import AssetBreakdownChart from '@/components/studies/AssetBreakdownChart'
import DepreciationChart from '@/components/studies/DepreciationChart'
import TaxSavingsChart from '@/components/studies/TaxSavingsChart'

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

interface StudyDetail {
  id: string
  studyName: string
  status: string
  taxRate: string
  discountRate: string | null
  bonusDepreciationRate: string | null
  studyYear: number
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
  } | null
  totalFirstYearDeduction: string | null
  totalTaxSavings: string | null
  npvTaxSavings: string | null
  propertyName: string | null
  propertyAddress: string | null
  propertyCity: string | null
  propertyState: string | null
  propertyType: string | null
  purchasePrice: string | null
  buildingValue: string | null
  landValue: string | null
  clientName: string | null
  clientCompany: string | null
  createdAt: string
}

const CATEGORY_LABELS: Record<string, string> = {
  personal_property_5yr: '5-Year Personal Property',
  personal_property_7yr: '7-Year Personal Property',
  land_improvements_15yr: '15-Year Land Improvements',
  building_27_5yr: '27.5-Year Residential Rental',
  building_39yr: '39-Year Nonresidential Real Property',
  land: 'Land (Non-depreciable)',
}

export default function StudyReportPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [study, setStudy] = useState<StudyDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStudy() {
      try {
        const res = await fetch(`/api/studies/${id}`)
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        setStudy(data.study)
      } catch (error) {
        logger.error('studies-page', 'Error fetching study report', error)
        router.push('/studies')
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchStudy()
  }, [id, router])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    )
  }

  if (!study || !study.results) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-gray-500">No report data available. Run the calculation first.</p>
        <Button
          variant="outline"
          onClick={() => router.push(`/studies/${id}`)}
          className="mt-4 border-gray-200 text-gray-500"
        >
          Back to Study
        </Button>
      </div>
    )
  }

  const results = study.results

  return (
    <div className="max-w-4xl mx-auto">
      {/* Action bar (no-print) */}
      <div className="no-print flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/studies/${id}`)}
          className="text-gray-500 hover:text-amber-600"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Study
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const link = document.createElement('a')
              link.href = `/api/studies/${id}/export`
              link.download = ''
              link.click()
            }}
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
          <Button
            onClick={() => window.print()}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="space-y-8">
        {/* Report Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500">
              <Building2 className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-amber-600 font-serif mb-2">
            Cost Segregation Study Report
          </h1>
          <p className="text-gray-500 text-lg">{study.studyName}</p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-400">
            <span>Prepared: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span className="text-gray-300">|</span>
            <span>Study Year: {study.studyYear}</span>
          </div>
        </div>

        {/* Property Information */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 border-b border-gray-200 pb-2 mb-4">
            Property Information
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Address</span>
              <p className="text-sm font-medium text-gray-900 mt-1">{study.propertyName || study.propertyAddress || '-'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Property Type</span>
              <p className="text-sm font-medium text-gray-900 mt-1 capitalize">
                {study.propertyType?.replace('_', ' ') || '-'}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Purchase Price</span>
              <p className="text-sm font-medium text-gray-900 mt-1">{formatCurrency(study.purchasePrice)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Client</span>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {study.clientName || '-'}
                {study.clientCompany ? ` (${study.clientCompany})` : ''}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Building Value</span>
              <p className="text-sm font-medium text-gray-900 mt-1">{formatCurrency(study.buildingValue)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Land Value</span>
              <p className="text-sm font-medium text-gray-900 mt-1">{formatCurrency(study.landValue)}</p>
            </div>
          </div>
        </div>

        {/* Tax Parameters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 border-b border-gray-200 pb-2 mb-4">
            Tax Parameters
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Marginal Tax Rate</span>
              <p className="text-xl font-bold text-gray-900 mt-1">{study.taxRate}%</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Discount Rate</span>
              <p className="text-xl font-bold text-gray-900 mt-1">{study.discountRate || '5'}%</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Bonus Depreciation</span>
              <p className="text-xl font-bold text-gray-900 mt-1">{study.bonusDepreciationRate || '100'}%</p>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 border-b border-gray-200 pb-2 mb-4">
            Executive Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-lg bg-amber-50 border border-amber-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                First Year Deduction
              </p>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(results.summary.totalFirstYearDeduction)}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-emerald-50 border border-emerald-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                Total Tax Savings
              </p>
              <p className="text-2xl font-bold text-[#10B981]">
                {formatCurrency(results.summary.totalTaxSavings)}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                NPV of Savings
              </p>
              <p className="text-2xl font-bold text-[#3B82F6]">
                {formatCurrency(results.summary.npvTaxSavings)}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                Effective Rate
              </p>
              <p className="text-2xl font-bold text-[#8B5CF6]">
                {results.summary.effectiveRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* First Year Analysis */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 border-b border-gray-200 pb-2 mb-4">
            First Year Depreciation Analysis
          </h2>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <span className="text-xs text-gray-400">Bonus Depreciation</span>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {formatCurrency(results.firstYearAnalysis.bonusDepreciation)}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Regular MACRS (Year 1)</span>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {formatCurrency(results.firstYearAnalysis.regularFirstYear)}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Total First Year</span>
              <p className="text-lg font-semibold text-amber-600 mt-1">
                {formatCurrency(results.firstYearAnalysis.totalFirstYear)}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400">First Year Tax Savings</span>
              <p className="text-lg font-semibold text-[#10B981] mt-1">
                {formatCurrency(results.firstYearAnalysis.taxSavings)}
              </p>
            </div>
          </div>
        </div>

        {/* Asset Breakdown Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 border-b border-gray-200 pb-2 mb-4">
            Asset Classification Breakdown
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-gray-400 font-medium">Asset Category</th>
                <th className="text-right py-3 text-gray-400 font-medium">Recovery Period</th>
                <th className="text-right py-3 text-gray-400 font-medium">Cost Basis</th>
                <th className="text-right py-3 text-gray-400 font-medium">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {results.assetBreakdown.map((asset, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3 text-gray-900">
                    {CATEGORY_LABELS[asset.category] || asset.category}
                  </td>
                  <td className="py-3 text-gray-500 text-right">
                    {asset.recoveryPeriod === 0 ? 'N/A' : `${asset.recoveryPeriod} years`}
                  </td>
                  <td className="py-3 text-gray-900 text-right font-medium">
                    {formatCurrency(asset.amount)}
                  </td>
                  <td className="py-3 text-gray-500 text-right">{asset.percentage.toFixed(1)}%</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300">
                <td className="py-3 text-amber-600 font-semibold" colSpan={2}>Total</td>
                <td className="py-3 text-amber-600 text-right font-bold">
                  {formatCurrency(results.assetBreakdown.reduce((sum, a) => sum + a.amount, 0))}
                </td>
                <td className="py-3 text-amber-600 text-right font-medium">100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Charts Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 border-b border-gray-200 pb-2 mb-4">
            Asset Allocation
          </h2>
          <AssetBreakdownChart data={results.assetBreakdown} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 border-b border-gray-200 pb-2 mb-4">
            Depreciation Schedule Comparison
          </h2>
          <DepreciationChart data={results.depreciationSchedule} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 border-b border-gray-200 pb-2 mb-4">
            Cumulative Tax Savings
          </h2>
          <TaxSavingsChart data={results.taxSavingsSchedule} />
        </div>

        {/* Depreciation Schedule Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 border-b border-gray-200 pb-2 mb-4">
            Year-by-Year Depreciation Schedule
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-400 font-medium">Year</th>
                  <th className="text-right py-2 text-gray-400 font-medium">With Cost Seg</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Without Cost Seg</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Difference</th>
                </tr>
              </thead>
              <tbody>
                {results.depreciationSchedule.slice(0, 20).map((row) => (
                  <tr key={row.year} className="border-b border-gray-100">
                    <td className="py-2 text-gray-900">{row.year}</td>
                    <td className="py-2 text-amber-600 text-right">{formatCurrency(row.accelerated)}</td>
                    <td className="py-2 text-gray-500 text-right">{formatCurrency(row.straightLine)}</td>
                    <td className={`py-2 text-right font-medium ${row.difference >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {formatCurrency(row.difference)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {results.depreciationSchedule.length > 20 && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                Showing first 20 of {results.depreciationSchedule.length} years
              </p>
            )}
          </div>
        </div>

        {/* Tax Savings Schedule */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-amber-600 border-b border-gray-200 pb-2 mb-4">
            Tax Savings Schedule
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-400 font-medium">Year</th>
                  <th className="text-right py-2 text-gray-400 font-medium">With Cost Seg</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Without Cost Seg</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Annual Savings</th>
                  <th className="text-right py-2 text-gray-400 font-medium">Cumulative Savings</th>
                </tr>
              </thead>
              <tbody>
                {results.taxSavingsSchedule.slice(0, 20).map((row) => (
                  <tr key={row.year} className="border-b border-gray-100">
                    <td className="py-2 text-gray-900">{row.year}</td>
                    <td className="py-2 text-amber-600 text-right">{formatCurrency(row.withCostSeg)}</td>
                    <td className="py-2 text-gray-500 text-right">{formatCurrency(row.withoutCostSeg)}</td>
                    <td className={`py-2 text-right ${row.savings >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {formatCurrency(row.savings)}
                    </td>
                    <td className="py-2 text-amber-600 text-right font-medium">
                      {formatCurrency(row.cumulativeSavings)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {results.taxSavingsSchedule.length > 20 && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                Showing first 20 of {results.taxSavingsSchedule.length} years
              </p>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-2">Disclaimer</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            This cost segregation study report is generated for informational purposes only and
            does not constitute tax advice. The calculations are based on the data provided and
            standard IRS MACRS depreciation tables. Actual tax benefits may vary based on individual
            circumstances, state tax laws, and IRS regulations. Consult with a qualified tax
            professional before making any tax-related decisions. Boca Banker and its affiliates
            are not responsible for any discrepancies between projected and actual tax outcomes.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center py-4 text-xs text-gray-400">
          <p className="text-amber-600 font-serif font-bold text-sm mb-1">Boca Banker</p>
          <p>Cost Segregation & Banking Intelligence</p>
          <p className="mt-1">Report generated on {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}</p>
        </div>
      </div>
    </div>
  )
}
