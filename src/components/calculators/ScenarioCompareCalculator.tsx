'use client'

import { useState } from 'react'
import { calculateMonthlyPayment } from '@/lib/mortgage/calculations'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calculator, Star } from 'lucide-react'

interface ScenarioResult {
  type: string
  label: string
  rate: number
  monthlyPI: number
  monthlyMI: number
  totalMonthly: number
  downPayment: number
  downPaymentPercent: number
  closingCosts: number
  dtiRequirement: string
  recommended: boolean
}

const creditAdjustments: Record<string, number> = {
  excellent: 0,
  good: 0.25,
  fair: 0.75,
  poor: 1.5,
}

export default function ScenarioCompareCalculator({
  initialValues = {},
}: {
  initialValues?: Record<string, string>
}) {
  const [purchasePrice, setPurchasePrice] = useState(initialValues.purchasePrice || '500000')
  const [downPaymentPct, setDownPaymentPct] = useState(initialValues.downPayment || '20')
  const [creditScore, setCreditScore] = useState(initialValues.creditScore || 'good')
  const [baseRate, setBaseRate] = useState(initialValues.baseRate || '6.75')
  const [results, setResults] = useState<ScenarioResult[] | null>(null)

  const calculate = () => {
    const price = parseFloat(purchasePrice) || 0
    const downPct = parseFloat(downPaymentPct) || 0
    const rate = parseFloat(baseRate) || 0
    const adj = creditAdjustments[creditScore] || 0

    if (price <= 0 || rate <= 0) return

    const scenarios: ScenarioResult[] = []

    // Conventional
    const convDownPct = Math.max(downPct, 5)
    const convDown = price * (convDownPct / 100)
    const convLoan = price - convDown
    const convRate = rate + adj
    const convPI = calculateMonthlyPayment(convLoan, convRate, 30)
    const convMI = convDownPct < 20 ? Math.round(convLoan * 0.005 / 12) : 0
    scenarios.push({
      type: 'conventional',
      label: 'Conventional',
      rate: convRate,
      monthlyPI: convPI,
      monthlyMI: convMI,
      totalMonthly: convPI + convMI,
      downPayment: convDown,
      downPaymentPercent: convDownPct,
      closingCosts: Math.round(convLoan * 0.025),
      dtiRequirement: '43-45%',
      recommended: false,
    })

    // FHA
    const fhaDownPct = Math.max(3.5, Math.min(downPct, 3.5))
    const fhaDown = price * (fhaDownPct / 100)
    const fhaLoan = price - fhaDown
    const fhaRate = rate + adj - 0.25 // FHA typically has slightly lower rates
    const fhaPI = calculateMonthlyPayment(fhaLoan, fhaRate, 30)
    const fhaMI = Math.round(fhaLoan * 0.0085 / 12) // 0.85% annual MIP
    scenarios.push({
      type: 'fha',
      label: 'FHA',
      rate: fhaRate,
      monthlyPI: fhaPI,
      monthlyMI: fhaMI,
      totalMonthly: fhaPI + fhaMI,
      downPayment: fhaDown,
      downPaymentPercent: fhaDownPct,
      closingCosts: Math.round(fhaLoan * 0.03 + fhaLoan * 0.0175), // + upfront MIP
      dtiRequirement: '43-57%',
      recommended: false,
    })

    // VA (no down, no MI)
    const vaLoan = price
    const vaRate = rate + adj - 0.5 // VA typically best rates
    const vaPI = calculateMonthlyPayment(vaLoan, vaRate, 30)
    scenarios.push({
      type: 'va',
      label: 'VA',
      rate: vaRate,
      monthlyPI: vaPI,
      monthlyMI: 0,
      totalMonthly: vaPI,
      downPayment: 0,
      downPaymentPercent: 0,
      closingCosts: Math.round(vaLoan * 0.023 + vaLoan * 0.0215), // + funding fee
      dtiRequirement: '41% (flexible)',
      recommended: false,
    })

    // Find the recommended (lowest total monthly)
    const minMonthly = Math.min(...scenarios.map((s) => s.totalMonthly))
    scenarios.forEach((s) => {
      s.recommended = s.totalMonthly === minMonthly
    })

    setResults(scenarios)
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-amber-600 mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Loan Comparison Inputs
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-500">Purchase Price ($)</Label>
            <Input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-500">Down Payment (%)</Label>
            <Input
              type="number"
              value={downPaymentPct}
              onChange={(e) => setDownPaymentPct(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-500">Credit Score Range</Label>
            <Select value={creditScore} onValueChange={setCreditScore}>
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="excellent">Excellent (740+)</SelectItem>
                <SelectItem value="good">Good (700-739)</SelectItem>
                <SelectItem value="fair">Fair (660-699)</SelectItem>
                <SelectItem value="poor">Below Average (620-659)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-500">Base Rate (%)</Label>
            <Input
              type="number"
              step="0.125"
              value={baseRate}
              onChange={(e) => setBaseRate(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500"
            />
          </div>
        </div>
        <Button
          onClick={calculate}
          className="mt-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:opacity-90"
        >
          Compare Scenarios
        </Button>
      </div>

      {/* Results */}
      {results && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {results.map((s) => (
            <div
              key={s.type}
              className={`rounded-2xl border shadow-sm p-6 relative ${
                s.recommended
                  ? 'border-amber-300 bg-amber-50/50 ring-2 ring-amber-200'
                  : 'border-gray-100 bg-white'
              }`}
            >
              {s.recommended && (
                <Badge className="absolute -top-2.5 left-4 bg-amber-500 text-white border-0">
                  <Star className="h-3 w-3 mr-1" />
                  Recommended
                </Badge>
              )}

              <h4 className="text-lg font-bold text-gray-900 mt-1">{s.label}</h4>
              <p className="text-xs text-gray-500 mb-4">
                {s.rate.toFixed(3)}% rate
              </p>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Monthly P&I</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(s.monthlyPI)}
                  </span>
                </div>
                {s.monthlyMI > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Monthly MI</span>
                    <span className="text-sm font-medium text-red-500">
                      +{formatCurrency(s.monthlyMI)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-sm font-semibold text-gray-700">
                    Total Monthly
                  </span>
                  <span className="text-lg font-bold text-amber-600">
                    {formatCurrency(s.totalMonthly)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Down Payment</span>
                  <span className="text-sm text-gray-900">
                    {formatCurrency(s.downPayment)} ({s.downPaymentPercent}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Est. Closing</span>
                  <span className="text-sm text-gray-900">
                    {formatCurrency(s.closingCosts)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Max DTI</span>
                  <span className="text-sm text-gray-900">{s.dtiRequirement}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      {results && (
        <p className="text-xs text-gray-400 text-center">
          Estimates based on current market conditions. Actual rates and costs vary by lender.
          VA loans require military service eligibility. FHA MIP is for the life of the loan.
        </p>
      )}
    </div>
  )
}
