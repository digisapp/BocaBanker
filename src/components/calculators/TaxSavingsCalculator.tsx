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
} from 'recharts';
import { DollarSign, TrendingUp, PiggyBank, BarChart3 } from 'lucide-react';
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
import { getDefaultAllocation } from '@/lib/cost-seg/asset-classes';
import { calculateDepreciation, calculateStraightLineDepreciation } from '@/lib/cost-seg/depreciation';
import { calculateTaxSavings } from '@/lib/cost-seg/tax-savings';
import { calculateNPV } from '@/lib/cost-seg/npv';
import type { MacrsRecoveryPeriod } from '@/lib/cost-seg/macrs-tables';

const PROPERTY_TYPES = [
  'commercial',
  'residential',
  'mixed-use',
  'industrial',
  'retail',
  'hospitality',
  'healthcare',
  'multifamily',
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface SavingsResult {
  firstYearSavings: number;
  fiveYearSavings: number;
  totalSavings: number;
  npv: number;
  schedule: {
    year: number;
    withCostSeg: number;
    withoutCostSeg: number;
    annualSavings: number;
    cumulativeSavings: number;
  }[];
}

export default function TaxSavingsCalculator() {
  const [propertyValue, setPropertyValue] = useState('');
  const [propertyType, setPropertyType] = useState('commercial');
  const [taxRate, setTaxRate] = useState('37');
  const [bonusRate, setBonusRate] = useState(100);
  const [result, setResult] = useState<SavingsResult | null>(null);
  const [calculated, setCalculated] = useState(false);

  function handleCalculate() {
    const value = parseFloat(propertyValue);
    const rate = parseFloat(taxRate);
    if (isNaN(value) || value <= 0 || isNaN(rate) || rate <= 0) return;

    const allocation = getDefaultAllocation(propertyType, value);

    // Build accelerated depreciation schedule (combined across all asset classes)
    const assetSchedules: { year: number; depreciation: number }[][] = [];

    for (const item of allocation) {
      if (item.recoveryPeriod === 0) continue;
      const period = item.recoveryPeriod as MacrsRecoveryPeriod;
      const schedule = calculateDepreciation(item.amount, period, bonusRate);
      assetSchedules.push(
        schedule.map((e) => ({ year: e.year, depreciation: e.depreciation }))
      );
    }

    const maxYears = assetSchedules.reduce((max, s) => Math.max(max, s.length), 0);
    const combinedAccelerated: { year: number; depreciation: number }[] = [];
    for (let y = 0; y < maxYears; y++) {
      let total = 0;
      for (const schedule of assetSchedules) {
        if (y < schedule.length) total += schedule[y].depreciation;
      }
      combinedAccelerated.push({
        year: y + 1,
        depreciation: Math.round(total * 100) / 100,
      });
    }

    // Straight-line: entire building value at default period
    const isResidential = ['residential', 'multifamily'].includes(propertyType);
    const slPeriod: 27.5 | 39 = isResidential ? 27.5 : 39;
    const buildingAlloc = allocation
      .filter((a) => a.recoveryPeriod !== 0)
      .reduce((sum, a) => sum + a.amount, 0);
    const straightLine = calculateStraightLineDepreciation(buildingAlloc, slPeriod);
    const slEntries = straightLine.map((e) => ({
      year: e.year,
      depreciation: e.depreciation,
    }));

    const taxSavings = calculateTaxSavings(combinedAccelerated, slEntries, rate);

    const firstYearSavings = taxSavings.length > 0 ? taxSavings[0].annualSavings : 0;
    const fiveYearSavings =
      taxSavings.length >= 5 ? taxSavings[4].cumulativeSavings : taxSavings.length > 0 ? taxSavings[taxSavings.length - 1].cumulativeSavings : 0;
    const totalSavings =
      taxSavings.length > 0
        ? taxSavings[taxSavings.length - 1].cumulativeSavings
        : 0;

    const annualFlows = taxSavings.map((e) => e.annualSavings);
    const npv = calculateNPV(annualFlows, 5);

    setResult({
      firstYearSavings,
      fiveYearSavings,
      totalSavings,
      npv,
      schedule: taxSavings,
    });
    setCalculated(true);
  }

  function handleReset() {
    setPropertyValue('');
    setPropertyType('commercial');
    setTaxRate('37');
    setBonusRate(100);
    setResult(null);
    setCalculated(false);
  }

  const chartData = result
    ? result.schedule.slice(0, 20).map((item) => ({
        year: `Yr ${item.year}`,
        savings: Math.round(item.cumulativeSavings),
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Tax Savings Estimator</h3>
            <p className="text-sm text-gray-500">
              Estimate tax savings from a cost segregation study
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-500">Property Value ($)</Label>
            <Input
              type="number"
              placeholder="e.g. 2000000"
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
                  <SelectItem
                    key={t}
                    value={t}
                    className="text-gray-900 focus:bg-amber-50 focus:text-amber-700 capitalize"
                  >
                    {t.replace('-', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-500">Tax Rate (%)</Label>
            <Input
              type="number"
              placeholder="37"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-500">
              Bonus Depreciation: {bonusRate}%
            </Label>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={bonusRate}
              onChange={(e) => setBonusRate(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 bg-gray-200 mt-2"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={handleCalculate}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:opacity-90 font-semibold"
          >
            Estimate Tax Savings
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

      {/* Summary Cards */}
      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-gray-500">First-Year Savings</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(result.firstYearSavings)}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-gray-500">5-Year Savings</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(result.fiveYearSavings)}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-gray-500">Total Savings</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(result.totalSavings)}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-gray-500">NPV (5% Discount)</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(result.npv)}
            </p>
          </div>
        </div>
      )}

      {/* Cumulative Savings Chart */}
      {result && chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Cumulative Tax Savings Over Time
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                  formatter={(value) => [formatCurrency(value as number), 'Cumulative Savings']}
                />
                <Area
                  type="monotone"
                  dataKey="savings"
                  stroke="#F59E0B"
                  fill="url(#savingsGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
