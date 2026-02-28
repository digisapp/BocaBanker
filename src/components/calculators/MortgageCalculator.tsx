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
import { Home, DollarSign, TrendingUp, Banknote, PiggyBank } from 'lucide-react';
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
  calculateMortgage,
  type MortgageResult,
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

interface MortgageCalculatorProps {
  initialValues?: Record<string, string>;
}

export default function MortgageCalculator({ initialValues }: MortgageCalculatorProps) {
  const [loanAmount, setLoanAmount] = useState(initialValues?.loanAmount || '');
  const [interestRate, setInterestRate] = useState(initialValues?.interestRate || '');
  const [termYears, setTermYears] = useState(initialValues?.termYears || '30');
  const [propertyTax, setPropertyTax] = useState('');
  const [insurance, setInsurance] = useState('');
  const [result, setResult] = useState<MortgageResult | null>(null);
  const [calculated, setCalculated] = useState(false);

  function handleCalculate() {
    const amount = parseFloat(loanAmount);
    const rate = parseFloat(interestRate);
    const term = parseInt(termYears);
    if (isNaN(amount) || amount <= 0 || isNaN(rate) || rate < 0) return;

    const res = calculateMortgage(
      amount,
      rate,
      term,
      parseFloat(propertyTax) || 0,
      parseFloat(insurance) || 0
    );
    setResult(res);
    setCalculated(true);
  }

  function handleReset() {
    setLoanAmount('');
    setInterestRate('');
    setTermYears('30');
    setPropertyTax('');
    setInsurance('');
    setResult(null);
    setCalculated(false);
  }

  const chartData = result?.schedule.map((item) => ({
    year: `Yr ${item.year}`,
    principal: Math.round(item.totalPrincipal),
    interest: Math.round(item.totalInterest),
    balance: Math.round(item.endingBalance),
  })) ?? [];

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Mortgage Payment Calculator</h3>
            <p className="text-sm text-gray-500">
              Calculate monthly payments and view full amortization schedule
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

          <div className="space-y-2">
            <Label className="text-gray-500">Annual Property Tax ($)</Label>
            <Input
              type="number"
              placeholder="Optional"
              value={propertyTax}
              onChange={(e) => setPropertyTax(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-500">Annual Insurance ($)</Label>
            <Input
              type="number"
              placeholder="Optional"
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={handleCalculate}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:opacity-90 font-semibold"
          >
            Calculate Payment
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
                <DollarSign className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Monthly P&I</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.monthlyPI)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Banknote className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Monthly Total</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.monthlyTotal)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-red-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Total Interest</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.totalInterest)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <PiggyBank className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Total Cost</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.totalCost)}</p>
            </div>
          </div>

          {/* Amortization Chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-gray-900">Principal vs Interest Over Time</h3>
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
                    dataKey="principal"
                    name="Principal"
                    stackId="1"
                    stroke="#F59E0B"
                    fill="#FEF3C7"
                  />
                  <Area
                    type="monotone"
                    dataKey="interest"
                    name="Interest"
                    stackId="1"
                    stroke="#EF4444"
                    fill="#FEE2E2"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Amortization Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-x-auto">
            <h3 className="font-semibold text-gray-900 mb-4">Amortization Schedule</h3>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 hover:bg-transparent">
                  <TableHead className="text-amber-600">Year</TableHead>
                  <TableHead className="text-amber-600 text-right">Payment</TableHead>
                  <TableHead className="text-amber-600 text-right">Principal</TableHead>
                  <TableHead className="text-amber-600 text-right">Interest</TableHead>
                  <TableHead className="text-amber-600 text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.schedule.map((item) => (
                  <TableRow
                    key={item.year}
                    className="border-gray-100 hover:bg-amber-50/50"
                  >
                    <TableCell className="text-gray-900 font-medium">
                      {item.year}
                    </TableCell>
                    <TableCell className="text-gray-900 text-right">
                      {formatCurrency(item.totalPayment)}
                    </TableCell>
                    <TableCell className="text-emerald-600 text-right">
                      {formatCurrency(item.totalPrincipal)}
                    </TableCell>
                    <TableCell className="text-red-500 text-right">
                      {formatCurrency(item.totalInterest)}
                    </TableCell>
                    <TableCell className="text-gray-500 text-right">
                      {formatCurrency(item.endingBalance)}
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
