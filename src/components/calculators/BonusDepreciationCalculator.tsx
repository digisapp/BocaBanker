'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Zap, ArrowRight } from 'lucide-react';
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
import { calculateBonusDepreciation } from '@/lib/cost-seg/bonus-depreciation';
import { calculateStraightLineDepreciation } from '@/lib/cost-seg/depreciation';
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

interface BonusResult {
  reclassifiedPercentage: number;
  reclassifiedAmount: number;
  bonusDepreciationTotal: number;
  withoutCostSegFirstYear: number;
  withCostSegFirstYear: number;
  additionalDeduction: number;
  breakdown: {
    category: string;
    description: string;
    amount: number;
    percentage: number;
    bonusEligible: boolean;
    firstYearDeduction: number;
  }[];
}

export default function BonusDepreciationCalculator() {
  const [buildingValue, setBuildingValue] = useState('');
  const [propertyType, setPropertyType] = useState('commercial');
  const [result, setResult] = useState<BonusResult | null>(null);
  const [calculated, setCalculated] = useState(false);

  function handleCalculate() {
    const value = parseFloat(buildingValue);
    if (isNaN(value) || value <= 0) return;

    const allocation = getDefaultAllocation(propertyType, value);
    const isResidential = ['residential', 'multifamily'].includes(propertyType);
    const slPeriod: 27.5 | 39 = isResidential ? 27.5 : 39;

    // Calculate without cost seg (straight-line on whole building minus land)
    const landAlloc = allocation.find((a) => a.recoveryPeriod === 0);
    const buildingBasis = value - (landAlloc ? landAlloc.amount : 0);
    const straightLine = calculateStraightLineDepreciation(buildingBasis, slPeriod);
    const withoutFirstYear = straightLine.length > 0 ? straightLine[0].depreciation : 0;

    // Calculate with cost seg
    let totalBonusDep = 0;
    let totalFirstYear = 0;
    let reclassifiedAmount = 0;

    const breakdown = allocation.map((item) => {
      const bonusEligible = item.recoveryPeriod > 0 && item.recoveryPeriod <= 20;

      if (item.recoveryPeriod === 0) {
        return {
          category: item.category,
          description: item.description,
          amount: item.amount,
          percentage: item.percentage,
          bonusEligible: false,
          firstYearDeduction: 0,
        };
      }

      const period = item.recoveryPeriod as MacrsRecoveryPeriod;
      const bonusResult = calculateBonusDepreciation(item.amount, period, 100);

      if (bonusEligible) {
        reclassifiedAmount += item.amount;
        totalBonusDep += bonusResult.bonusAmount;
      }

      totalFirstYear += bonusResult.firstYearTotal;

      return {
        category: item.category,
        description: item.description,
        amount: item.amount,
        percentage: item.percentage,
        bonusEligible,
        firstYearDeduction: bonusResult.firstYearTotal,
      };
    });

    const reclassifiedPercentage = value > 0 ? (reclassifiedAmount / value) * 100 : 0;

    setResult({
      reclassifiedPercentage: Math.round(reclassifiedPercentage * 10) / 10,
      reclassifiedAmount: Math.round(reclassifiedAmount),
      bonusDepreciationTotal: Math.round(totalBonusDep),
      withoutCostSegFirstYear: Math.round(withoutFirstYear),
      withCostSegFirstYear: Math.round(totalFirstYear),
      additionalDeduction: Math.round(totalFirstYear - withoutFirstYear),
      breakdown,
    });
    setCalculated(true);
  }

  function handleReset() {
    setBuildingValue('');
    setPropertyType('commercial');
    setResult(null);
    setCalculated(false);
  }

  const comparisonData = result
    ? [
        {
          name: 'Without Cost Seg',
          deduction: result.withoutCostSegFirstYear,
        },
        {
          name: 'With Cost Seg',
          deduction: result.withCostSegFirstYear,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient text-[#0F1B2D]">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Bonus Depreciation Analysis</h3>
            <p className="text-sm text-[#94A3B8]">
              See how much can be reclassified and bonus depreciation impact
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Total Building Value ($)</Label>
            <Input
              type="number"
              placeholder="e.g. 3000000"
              value={buildingValue}
              onChange={(e) => setBuildingValue(e.target.value)}
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white placeholder:text-[#64748B] focus:border-[#C9A84C]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Property Type</Label>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A2B45] border-[rgba(201,168,76,0.15)]">
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem
                    key={t}
                    value={t}
                    className="text-white hover:bg-[#243654] focus:bg-[#243654] capitalize"
                  >
                    {t.replace('-', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={handleCalculate}
            className="bg-gold-gradient text-[#0F1B2D] hover:opacity-90 font-semibold"
          >
            Analyze Bonus Depreciation
          </Button>
          {calculated && (
            <Button
              onClick={handleReset}
              variant="outline"
              className="border-[rgba(201,168,76,0.3)] text-[#C9A84C] hover:bg-[#243654]"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {result && (
        <>
          {/* Reclassification Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-5 text-center">
              <p className="text-sm text-[#94A3B8] mb-1">Reclassified</p>
              <p className="text-3xl font-bold text-[#C9A84C]">
                {result.reclassifiedPercentage}%
              </p>
              <p className="text-sm text-[#64748B] mt-1">
                {formatCurrency(result.reclassifiedAmount)}
              </p>
            </div>
            <div className="glass-card p-5 text-center">
              <p className="text-sm text-[#94A3B8] mb-1">Bonus Depreciation</p>
              <p className="text-3xl font-bold text-white">
                {formatCurrency(result.bonusDepreciationTotal)}
              </p>
              <p className="text-sm text-[#64748B] mt-1">On eligible assets</p>
            </div>
            <div className="glass-card p-5 text-center">
              <p className="text-sm text-[#94A3B8] mb-1">Additional First-Year</p>
              <p className="text-3xl font-bold text-emerald-400">
                {formatCurrency(result.additionalDeduction)}
              </p>
              <p className="text-sm text-[#64748B] mt-1">Extra deduction</p>
            </div>
          </div>

          {/* Before / After Comparison Chart */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-white mb-4">
              First-Year Deduction Comparison
            </h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} layout="vertical" barCategoryGap="30%">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(201,168,76,0.1)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 12 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 13 }}
                    width={140}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A2B45',
                      border: '1px solid rgba(201,168,76,0.2)',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                    }}
                    formatter={(value) => [formatCurrency(value as number), 'Deduction']}
                  />
                  <Bar
                    dataKey="deduction"
                    fill="#C9A84C"
                    radius={[0, 4, 4, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Comparison cards */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <div className="glass-card p-4 flex-1 text-center">
                <p className="text-xs text-[#94A3B8] mb-1">Without Cost Seg</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(result.withoutCostSegFirstYear)}
                </p>
              </div>
              <ArrowRight className="h-6 w-6 text-[#C9A84C] flex-shrink-0" />
              <div className="glass-card p-4 flex-1 text-center border-[rgba(201,168,76,0.3)]">
                <p className="text-xs text-[#C9A84C] mb-1">With Cost Seg</p>
                <p className="text-xl font-bold text-[#C9A84C]">
                  {formatCurrency(result.withCostSegFirstYear)}
                </p>
              </div>
            </div>
          </div>

          {/* Asset Breakdown */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-white mb-4">
              Asset Reclassification Breakdown
            </h3>
            <div className="space-y-3">
              {result.breakdown.map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#0F1B2D]/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        item.bonusEligible ? 'bg-[#C9A84C]' : 'bg-[#64748B]'
                      }`}
                    />
                    <div>
                      <p className="text-sm text-white">{item.description}</p>
                      <p className="text-xs text-[#64748B]">
                        {item.percentage}% of total
                        {item.bonusEligible && ' - Bonus eligible'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {formatCurrency(item.amount)}
                    </p>
                    {item.firstYearDeduction > 0 && (
                      <p className="text-xs text-[#C9A84C]">
                        Yr 1: {formatCurrency(item.firstYearDeduction)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
