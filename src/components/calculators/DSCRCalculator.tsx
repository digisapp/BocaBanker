'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Landmark, DollarSign, TrendingUp, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  calculateDSCR,
  type DSCRResult,
} from '@/lib/mortgage/calculations';

const LOAN_TERMS = [
  { value: '10', label: '10 Years' },
  { value: '15', label: '15 Years' },
  { value: '20', label: '20 Years' },
  { value: '25', label: '25 Years' },
  { value: '30', label: '30 Years' },
];

const RATING_COLORS: Record<string, string> = {
  strong: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  adequate: 'bg-blue-50 text-blue-700 border-blue-200',
  weak: 'bg-amber-50 text-amber-700 border-amber-200',
  insufficient: 'bg-red-50 text-red-700 border-red-200',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DSCRCalculator() {
  const [grossIncome, setGrossIncome] = useState('');
  const [operatingExpenses, setOperatingExpenses] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [termYears, setTermYears] = useState('30');
  const [result, setResult] = useState<DSCRResult | null>(null);
  const [calculated, setCalculated] = useState(false);

  function handleCalculate() {
    const income = parseFloat(grossIncome);
    const expenses = parseFloat(operatingExpenses);
    const loan = parseFloat(loanAmount);
    const rate = parseFloat(interestRate);
    const term = parseInt(termYears);

    if (isNaN(income) || income <= 0 || isNaN(loan) || loan <= 0 || isNaN(rate) || rate < 0) return;

    const res = calculateDSCR(income, expenses || 0, loan, rate, term);
    setResult(res);
    setCalculated(true);
  }

  function handleReset() {
    setGrossIncome('');
    setOperatingExpenses('');
    setLoanAmount('');
    setInterestRate('');
    setTermYears('30');
    setResult(null);
    setCalculated(false);
  }

  const chartData = result
    ? [
        { name: 'NOI', value: result.noi, fill: '#10B981' },
        { name: 'Debt Service', value: result.annualDebtService, fill: '#EF4444' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">DSCR Calculator</h3>
            <p className="text-sm text-gray-500">
              Debt Service Coverage Ratio — can the property support the loan?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-500">Annual Gross Income ($)</Label>
            <Input
              type="number"
              placeholder="e.g. 480000"
              value={grossIncome}
              onChange={(e) => setGrossIncome(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-500">Annual Operating Expenses ($)</Label>
            <Input
              type="number"
              placeholder="e.g. 180000"
              value={operatingExpenses}
              onChange={(e) => setOperatingExpenses(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-500">Loan Amount ($)</Label>
            <Input
              type="number"
              placeholder="e.g. 3000000"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-500">Interest Rate (%)</Label>
            <Input
              type="number"
              step="0.125"
              placeholder="e.g. 6.5"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-500">Loan Term</Label>
            <Select value={termYears} onValueChange={setTermYears}>
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                {LOAN_TERMS.map((t) => (
                  <SelectItem
                    key={t.value}
                    value={t.value}
                    className="text-gray-900 focus:bg-amber-50 focus:text-amber-700"
                  >
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={handleCalculate}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:opacity-90 font-semibold"
          >
            Calculate DSCR
          </Button>
          {calculated && (
            <Button
              onClick={handleReset}
              variant="outline"
              className="border-gray-200 text-amber-600 hover:bg-amber-50"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {calculated && result && (
        <>
          {/* DSCR Rating Banner */}
          <div
            className={`rounded-2xl border p-5 ${RATING_COLORS[result.rating]}`}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6" />
              <div>
                <p className="text-2xl font-bold">DSCR: {result.dscr.toFixed(2)}x</p>
                <p className="text-sm mt-0.5">{result.ratingLabel}</p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">NOI</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.noi)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-red-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Annual Debt Service</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.annualDebtService)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Monthly Payment</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.monthlyDebtService)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Landmark className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Max Loan (1.25x)</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.maxLoanAmount)}</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">NOI vs Debt Service</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    type="number"
                    stroke="#9CA3AF"
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#9CA3AF"
                    tick={{ fill: '#6B7280', fontSize: 13 }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      color: '#111827',
                    }}
                    formatter={(value) => [formatCurrency(value as number), '']}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DSCR Guide */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-3">DSCR Thresholds</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <p className="text-sm font-bold text-emerald-700">1.50x+</p>
                <p className="text-xs text-emerald-600 mt-1">Strong — Best rates, easy approval</p>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                <p className="text-sm font-bold text-blue-700">1.25x — 1.49x</p>
                <p className="text-xs text-blue-600 mt-1">Adequate — Meets most lender minimums</p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm font-bold text-amber-700">1.00x — 1.24x</p>
                <p className="text-xs text-amber-600 mt-1">Weak — May need guarantor or higher rate</p>
              </div>
              <div className="rounded-xl bg-red-50 border border-red-200 p-3">
                <p className="text-sm font-bold text-red-700">Below 1.00x</p>
                <p className="text-xs text-red-600 mt-1">Insufficient — Property loses money</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
