'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Sparkles,
  DollarSign,
  TrendingUp,
  Clock,
  Percent,
  ArrowRightLeft,
  Calculator,
  Banknote,
} from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  calculateCombinedAnalysis,
  type CombinedAnalysisResult,
} from '@/lib/mortgage/calculations';

const PROPERTY_TYPES = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'residential', label: 'Residential' },
  { value: 'mixed-use', label: 'Mixed-Use' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'retail', label: 'Retail' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'multifamily', label: 'Multifamily' },
];

const LOAN_TERMS = [
  { value: '10', label: '10 Years' },
  { value: '15', label: '15 Years' },
  { value: '20', label: '20 Years' },
  { value: '25', label: '25 Years' },
  { value: '30', label: '30 Years' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface CombinedAnalyzerProps {
  initialValues?: Record<string, string>;
}

export default function CombinedAnalyzer({ initialValues }: CombinedAnalyzerProps) {
  // Property inputs
  const [propertyValue, setPropertyValue] = useState(initialValues?.propertyValue || '');
  const [propertyType, setPropertyType] = useState(initialValues?.propertyType || 'commercial');
  const [taxRate, setTaxRate] = useState('37');
  const [bonusRate, setBonusRate] = useState('60');

  // Current loan inputs
  const [currentBalance, setCurrentBalance] = useState(initialValues?.loanAmount || '');
  const [currentRate, setCurrentRate] = useState(initialValues?.currentRate || '');
  const [remainingYears, setRemainingYears] = useState(initialValues?.remainingYears || '');

  // Refinance inputs
  const [newRate, setNewRate] = useState('');
  const [newTermYears, setNewTermYears] = useState('30');
  const [closingCosts, setClosingCosts] = useState('');

  const [result, setResult] = useState<CombinedAnalysisResult | null>(null);
  const [calculated, setCalculated] = useState(false);

  function handleCalculate() {
    const pv = parseFloat(propertyValue);
    const tr = parseFloat(taxRate);
    const br = parseFloat(bonusRate);
    const cb = parseFloat(currentBalance);
    const cr = parseFloat(currentRate);
    const ry = parseFloat(remainingYears);
    const nr = parseFloat(newRate);
    const nt = parseInt(newTermYears);
    const cc = parseFloat(closingCosts) || 0;

    if (isNaN(pv) || pv <= 0 || isNaN(cb) || cb <= 0 || isNaN(cr) || isNaN(nr) || isNaN(ry)) return;

    const res = calculateCombinedAnalysis(
      pv, propertyType, tr || 37, br || 60,
      cb, cr, ry, nr, nt, cc
    );
    setResult(res);
    setCalculated(true);
  }

  function handleReset() {
    setPropertyValue('');
    setPropertyType('commercial');
    setTaxRate('37');
    setBonusRate('60');
    setCurrentBalance('');
    setCurrentRate('');
    setRemainingYears('');
    setNewRate('');
    setNewTermYears('30');
    setClosingCosts('');
    setResult(null);
    setCalculated(false);
  }

  const chartData = result?.combinedSchedule.map((e) => ({
    year: `Yr ${e.year}`,
    'Cost Seg': Math.round(e.costSegSavings),
    'Refi Savings': Math.round(e.refiSavings),
    cumulative: Math.round(e.cumulativeBenefit),
  })) ?? [];

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Combined Cost Seg + Refinance Analysis</h3>
            <p className="text-sm text-gray-500">
              See the total financial impact of both strategies together
            </p>
          </div>
        </div>

        {/* 3-column input layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Property */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Property</h4>
            <div className="space-y-2">
              <Label className="text-gray-500">Property Value ($)</Label>
              <Input
                type="number"
                placeholder="e.g. 3000000"
                value={propertyValue}
                onChange={(e) => setPropertyValue(e.target.value)}
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">Property Type</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-gray-900 focus:bg-amber-50 focus:text-amber-700">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-gray-500">Tax Rate (%)</Label>
                <Input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-500">Bonus Dep (%)</Label>
                <Input
                  type="number"
                  value={bonusRate}
                  onChange={(e) => setBonusRate(e.target.value)}
                  className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
                />
              </div>
            </div>
          </div>

          {/* Current Loan */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Current Loan</h4>
            <div className="space-y-2">
              <Label className="text-gray-500">Remaining Balance ($)</Label>
              <Input
                type="number"
                placeholder="e.g. 2400000"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">Current Rate (%)</Label>
              <Input
                type="number"
                step="0.125"
                placeholder="e.g. 6.5"
                value={currentRate}
                onChange={(e) => setCurrentRate(e.target.value)}
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">Remaining Term (Years)</Label>
              <Input
                type="number"
                placeholder="e.g. 25"
                value={remainingYears}
                onChange={(e) => setRemainingYears(e.target.value)}
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
          </div>

          {/* Refinance To */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Refinance To</h4>
            <div className="space-y-2">
              <Label className="text-gray-500">New Rate (%)</Label>
              <Input
                type="number"
                step="0.125"
                placeholder="e.g. 5.5"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">New Term</Label>
              <Select value={newTermYears} onValueChange={setNewTermYears}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {LOAN_TERMS.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-gray-900 focus:bg-amber-50 focus:text-amber-700">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">Closing Costs ($)</Label>
              <Input
                type="number"
                placeholder="e.g. 15000"
                value={closingCosts}
                onChange={(e) => setClosingCosts(e.target.value)}
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={handleCalculate}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:opacity-90 font-semibold"
          >
            Run Combined Analysis
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
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="h-6 w-6" />
              <span className="text-sm font-medium uppercase tracking-wider opacity-90">
                Your Total Year 1 Benefit
              </span>
            </div>
            <p className="text-4xl font-bold">{formatCurrency(result.totalYear1Benefit)}</p>
            <p className="text-sm opacity-80 mt-1">
              Cost Seg tax savings + refinance monthly savings - closing costs
            </p>
          </div>

          {/* Three-column breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Cost Seg Column */}
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-5 w-5 text-amber-600" />
                <h4 className="font-semibold text-gray-900">Cost Segregation</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-500">Year 1 Tax Savings</span>
                  <p className="text-xl font-bold text-amber-600">{formatCurrency(result.costSegFirstYearSavings)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">5-Year Tax Savings</span>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(result.costSegFiveYearSavings)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Assets Reclassified</span>
                  <p className="text-lg font-semibold text-gray-900">{result.reclassifiedPercentage}%</p>
                </div>
              </div>
            </div>

            {/* Refinance Column */}
            <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">Refinance</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-500">Monthly Savings</span>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(result.monthlySavings)}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Break-Even</span>
                  <p className="text-lg font-semibold text-gray-900">{result.refiBreakEvenMonths} months</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Total Refi Savings</span>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(result.refiTotalSavings)}</p>
                </div>
              </div>
            </div>

            {/* Combined Column */}
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                <h4 className="font-semibold text-gray-900">Combined Impact</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-500">5-Year Total Benefit</span>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(result.totalFiveYearBenefit)}</p>
                </div>
                {result.monthsSavedOnMortgage > 0 && (
                  <div>
                    <span className="text-xs text-gray-500">Mortgage Months Saved</span>
                    <p className="text-lg font-semibold text-gray-900">{result.monthsSavedOnMortgage} months</p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-gray-500">Additional Interest Saved</span>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(result.additionalInterestSaved)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment comparison cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Banknote className="h-4 w-4 text-red-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Current Payment</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.currentMonthlyPayment)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">New Payment</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.newMonthlyPayment)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Monthly Savings</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(result.monthlySavings)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Break-Even</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{result.refiBreakEvenMonths} mo</p>
            </div>
          </div>

          {/* Stacked Area Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-gray-900">Year-by-Year Combined Benefits</h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    dataKey="year"
                    stroke="#9CA3AF"
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
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
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="Cost Seg"
                    stackId="1"
                    stroke="#F59E0B"
                    fill="#FEF3C7"
                  />
                  <Area
                    type="monotone"
                    dataKey="Refi Savings"
                    stackId="1"
                    stroke="#3B82F6"
                    fill="#DBEAFE"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Year-by-Year Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-x-auto">
            <h3 className="font-semibold text-gray-900 mb-4">Combined Benefits Schedule</h3>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 hover:bg-transparent">
                  <TableHead className="text-amber-600">Year</TableHead>
                  <TableHead className="text-amber-600 text-right">Cost Seg</TableHead>
                  <TableHead className="text-amber-600 text-right">Refi Savings</TableHead>
                  <TableHead className="text-amber-600 text-right">Combined</TableHead>
                  <TableHead className="text-amber-600 text-right">Cumulative</TableHead>
                  <TableHead className="text-amber-600 text-right">Balance (w/ Paydown)</TableHead>
                  <TableHead className="text-amber-600 text-right">Balance (Standard)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.combinedSchedule.map((entry) => (
                  <TableRow
                    key={entry.year}
                    className="border-gray-100 hover:bg-amber-50/50"
                  >
                    <TableCell className="text-gray-900 font-medium">{entry.year}</TableCell>
                    <TableCell className="text-amber-600 text-right">
                      {formatCurrency(entry.costSegSavings)}
                    </TableCell>
                    <TableCell className="text-blue-600 text-right">
                      {formatCurrency(entry.refiSavings)}
                    </TableCell>
                    <TableCell className="text-emerald-600 text-right font-medium">
                      {formatCurrency(entry.combinedSavings)}
                    </TableCell>
                    <TableCell className="text-gray-900 text-right font-medium">
                      {formatCurrency(entry.cumulativeBenefit)}
                    </TableCell>
                    <TableCell className="text-emerald-600 text-right">
                      {formatCurrency(entry.loanBalanceWithPaydown)}
                    </TableCell>
                    <TableCell className="text-gray-500 text-right">
                      {formatCurrency(entry.loanBalanceWithout)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
