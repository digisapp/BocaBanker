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
  Legend,
  ReferenceLine,
} from 'recharts';
import { ArrowRightLeft, DollarSign, Clock, TrendingDown, Percent } from 'lucide-react';
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
  calculateRefinanceAnalysis,
  type RefinanceResult,
} from '@/lib/mortgage/calculations';

const TERM_OPTIONS = [
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

interface RefinanceAnalyzerProps {
  initialValues?: Record<string, string>;
}

export default function RefinanceAnalyzer({ initialValues }: RefinanceAnalyzerProps) {
  const [currentBalance, setCurrentBalance] = useState(initialValues?.currentBalance || '');
  const [currentRate, setCurrentRate] = useState(initialValues?.currentRate || '');
  const [remainingYears, setRemainingYears] = useState(initialValues?.remainingYears || '25');
  const [newRate, setNewRate] = useState('');
  const [newTermYears, setNewTermYears] = useState('30');
  const [closingCosts, setClosingCosts] = useState('');
  const [points, setPoints] = useState('');
  const [result, setResult] = useState<RefinanceResult | null>(null);
  const [calculated, setCalculated] = useState(false);

  function handleCalculate() {
    const balance = parseFloat(currentBalance);
    const curRate = parseFloat(currentRate);
    const remYears = parseInt(remainingYears);
    const nRate = parseFloat(newRate);
    const nTerm = parseInt(newTermYears);
    if (isNaN(balance) || balance <= 0 || isNaN(curRate) || isNaN(nRate)) return;

    const res = calculateRefinanceAnalysis(
      balance,
      curRate,
      remYears,
      nRate,
      nTerm,
      parseFloat(closingCosts) || 0,
      parseFloat(points) || 0
    );
    setResult(res);
    setCalculated(true);
  }

  function handleReset() {
    setCurrentBalance('');
    setCurrentRate('');
    setRemainingYears('25');
    setNewRate('');
    setNewTermYears('30');
    setClosingCosts('');
    setPoints('');
    setResult(null);
    setCalculated(false);
  }

  const chartData = result?.savingsSchedule.map((item) => ({
    year: `Yr ${item.year}`,
    currentPayment: Math.round(item.currentPayment),
    newPayment: Math.round(item.newPayment),
    cumulativeSavings: Math.round(item.cumulativeSavings),
  })) ?? [];

  const breakEvenYear = result ? Math.ceil(result.breakEvenMonths / 12) : 0;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Refinance Analyzer</h3>
            <p className="text-sm text-gray-500">
              Compare your current loan against a refinance to see break-even and total savings
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Loan */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-2">
              Current Loan
            </h4>
            <div className="space-y-2">
              <Label className="text-gray-500">Remaining Balance ($)</Label>
              <Input
                type="number"
                placeholder="e.g. 2500000"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">Current Interest Rate (%)</Label>
              <Input
                type="number"
                step="0.125"
                placeholder="e.g. 7.0"
                value={currentRate}
                onChange={(e) => setCurrentRate(e.target.value)}
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">Remaining Term</Label>
              <Select value={remainingYears} onValueChange={setRemainingYears}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {TERM_OPTIONS.map((t) => (
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

          {/* New Loan */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-2">
              New Loan
            </h4>
            <div className="space-y-2">
              <Label className="text-gray-500">New Interest Rate (%)</Label>
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
              <Label className="text-gray-500">New Loan Term</Label>
              <Select value={newTermYears} onValueChange={setNewTermYears}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {TERM_OPTIONS.map((t) => (
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
            <div className="space-y-2">
              <Label className="text-gray-500">Estimated Closing Costs ($)</Label>
              <Input
                type="number"
                placeholder="e.g. 15000"
                value={closingCosts}
                onChange={(e) => setClosingCosts(e.target.value)}
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500">Points (%)</Label>
              <Input
                type="number"
                step="0.25"
                placeholder="e.g. 1.0"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
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
            Analyze Refinance
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
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Monthly Savings</span>
              </div>
              <p className={`text-2xl font-bold ${result.monthlySavings > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {result.monthlySavings > 0 ? '+' : ''}{formatCurrency(result.monthlySavings)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatCurrency(result.currentMonthlyPayment)} → {formatCurrency(result.newMonthlyPayment)}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Break-Even</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {result.monthlySavings > 0 ? `${result.breakEvenMonths} mo` : 'N/A'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {result.monthlySavings > 0 ? `~${Math.ceil(result.breakEvenMonths / 12)} years` : 'No savings'}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Total Savings</span>
              </div>
              <p className={`text-2xl font-bold ${result.totalSavingsOverTerm > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(result.totalSavingsOverTerm)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                After {formatCurrency(result.closingCosts)} closing costs
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Percent className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Interest Saved</span>
              </div>
              <p className={`text-2xl font-bold ${result.interestSaved > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(result.interestSaved)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                NPV: {formatCurrency(result.npvSavings)}
              </p>
            </div>
          </div>

          {/* Recommendation Banner */}
          <div className={`rounded-2xl border p-4 ${
            result.totalSavingsOverTerm > 0
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <p className={`text-sm font-medium ${
              result.totalSavingsOverTerm > 0 ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {result.totalSavingsOverTerm > 0
                ? `Refinancing saves you ${formatCurrency(result.monthlySavings)}/month. You break even in ${result.breakEvenMonths} months and save ${formatCurrency(result.totalSavingsOverTerm)} total over the loan term.`
                : `Refinancing at this rate would not save money. The closing costs exceed the payment savings over the remaining term.`
              }
            </p>
          </div>

          {/* Savings Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-gray-900">Annual Payment Comparison</h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
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
                  {breakEvenYear > 0 && breakEvenYear <= chartData.length && (
                    <ReferenceLine
                      x={`Yr ${breakEvenYear}`}
                      stroke="#10B981"
                      strokeDasharray="3 3"
                      label={{ value: 'Break-Even', fill: '#10B981', fontSize: 11 }}
                    />
                  )}
                  <Bar
                    dataKey="currentPayment"
                    name="Current Annual Payment"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                    opacity={0.7}
                  />
                  <Bar
                    dataKey="newPayment"
                    name="New Annual Payment"
                    fill="#F59E0B"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Savings Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-x-auto">
            <h3 className="font-semibold text-gray-900 mb-4">Year-by-Year Savings</h3>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 hover:bg-transparent">
                  <TableHead className="text-amber-600">Year</TableHead>
                  <TableHead className="text-amber-600 text-right">Current Annual</TableHead>
                  <TableHead className="text-amber-600 text-right">New Annual</TableHead>
                  <TableHead className="text-amber-600 text-right">Annual Savings</TableHead>
                  <TableHead className="text-amber-600 text-right">Cumulative</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.savingsSchedule.map((item) => {
                  const isBreakEven = item.cumulativeSavings >= 0 &&
                    (item.year === 1 || result.savingsSchedule[item.year - 2]?.cumulativeSavings < 0);

                  return (
                    <TableRow
                      key={item.year}
                      className={`border-gray-100 ${
                        isBreakEven
                          ? 'bg-emerald-50 hover:bg-emerald-100/50'
                          : 'hover:bg-amber-50/50'
                      }`}
                    >
                      <TableCell className="text-gray-900 font-medium">
                        {item.year}
                        {isBreakEven && (
                          <span className="ml-2 text-xs text-emerald-600 font-semibold">BREAK-EVEN</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500 text-right">
                        {formatCurrency(item.currentPayment)}
                      </TableCell>
                      <TableCell className="text-gray-900 text-right">
                        {formatCurrency(item.newPayment)}
                      </TableCell>
                      <TableCell className="text-emerald-600 text-right font-medium">
                        +{formatCurrency(item.annualSavings)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        item.cumulativeSavings >= 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {formatCurrency(item.cumulativeSavings)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
