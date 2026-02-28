'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Activity, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
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
  calculateRateSensitivity,
  type RateSensitivityResult,
} from '@/lib/mortgage/calculations';

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

interface RateSensitivityToolProps {
  initialValues?: Record<string, string>;
}

export default function RateSensitivityTool({ initialValues }: RateSensitivityToolProps) {
  const [loanAmount, setLoanAmount] = useState(initialValues?.loanAmount || '');
  const [baseRate, setBaseRate] = useState(initialValues?.baseRate || '');
  const [termYears, setTermYears] = useState(initialValues?.termYears || '30');
  const [result, setResult] = useState<RateSensitivityResult | null>(null);
  const [calculated, setCalculated] = useState(false);

  function handleCalculate() {
    const amount = parseFloat(loanAmount);
    const rate = parseFloat(baseRate);
    const term = parseInt(termYears);
    if (isNaN(amount) || amount <= 0 || isNaN(rate) || rate < 0) return;

    const res = calculateRateSensitivity(amount, rate, term);
    setResult(res);
    setCalculated(true);
  }

  function handleReset() {
    setLoanAmount('');
    setBaseRate('');
    setTermYears('30');
    setResult(null);
    setCalculated(false);
  }

  const chartData = result?.entries.map((e) => ({
    rate: `${e.rate}%`,
    rateNum: e.rate,
    payment: e.monthlyPayment,
    totalInterest: e.totalInterest,
  })) ?? [];

  // Find min and max entries for the highlight cards
  const minEntry = result?.entries[0];
  const maxEntry = result?.entries[result.entries.length - 1];
  const spread = minEntry && maxEntry
    ? maxEntry.monthlyPayment - minEntry.monthlyPayment
    : 0;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Rate Sensitivity Analysis</h3>
            <p className="text-sm text-gray-500">
              See how interest rate changes impact your payment
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <Label className="text-gray-500">Base Interest Rate (%)</Label>
            <Input
              type="number"
              step="0.125"
              placeholder="e.g. 6.5"
              value={baseRate}
              onChange={(e) => setBaseRate(e.target.value)}
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
            Analyze Rates
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
      {calculated && result && minEntry && maxEntry && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Base Payment</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.basePayment)}</p>
              <p className="text-xs text-gray-400 mt-1">at {result.baseRate}%</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Lowest</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(minEntry.monthlyPayment)}</p>
              <p className="text-xs text-gray-400 mt-1">at {minEntry.rate}%</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-red-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Highest</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(maxEntry.monthlyPayment)}</p>
              <p className="text-xs text-gray-400 mt-1">at {maxEntry.rate}%</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Payment Spread</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(spread)}</p>
              <p className="text-xs text-gray-400 mt-1">range across rates</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-gray-900">Monthly Payment by Rate</h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    dataKey="rate"
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
                    formatter={(value) => [formatCurrency(value as number), 'Monthly Payment']}
                  />
                  <ReferenceLine
                    x={`${result.baseRate}%`}
                    stroke="#F59E0B"
                    strokeDasharray="5 5"
                    label={{ value: 'Base', position: 'top', fill: '#F59E0B', fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="payment"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    dot={{ fill: '#F59E0B', r: 3 }}
                    activeDot={{ r: 5, fill: '#D97706' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rate Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-x-auto">
            <h3 className="font-semibold text-gray-900 mb-4">Rate Comparison Table</h3>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 hover:bg-transparent">
                  <TableHead className="text-amber-600">Rate</TableHead>
                  <TableHead className="text-amber-600 text-right">Monthly Payment</TableHead>
                  <TableHead className="text-amber-600 text-right">Total Interest</TableHead>
                  <TableHead className="text-amber-600 text-right">Total Cost</TableHead>
                  <TableHead className="text-amber-600 text-right">Change vs Base</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.entries.map((entry) => {
                  const isBase = entry.rate === result.baseRate;
                  return (
                    <TableRow
                      key={entry.rate}
                      className={`border-gray-100 ${
                        isBase
                          ? 'bg-amber-50/70 font-semibold'
                          : 'hover:bg-amber-50/30'
                      }`}
                    >
                      <TableCell className="text-gray-900">
                        {entry.rate}%
                        {isBase && (
                          <span className="ml-2 text-xs text-amber-600 font-normal">(base)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-900 text-right">
                        {formatCurrency(entry.monthlyPayment)}
                      </TableCell>
                      <TableCell className="text-gray-900 text-right">
                        {formatCurrency(entry.totalInterest)}
                      </TableCell>
                      <TableCell className="text-gray-900 text-right">
                        {formatCurrency(entry.totalCost)}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.changeFromBase === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : entry.changeFromBase > 0 ? (
                          <span className="text-red-500">+{formatCurrency(entry.changeFromBase)}</span>
                        ) : (
                          <span className="text-emerald-600">{formatCurrency(entry.changeFromBase)}</span>
                        )}
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
