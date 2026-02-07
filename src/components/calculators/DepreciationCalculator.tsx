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
} from 'recharts';
import { Calculator, TrendingDown } from 'lucide-react';
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
import { calculateDepreciation } from '@/lib/cost-seg/depreciation';
import type { MacrsRecoveryPeriod } from '@/lib/cost-seg/macrs-tables';
import type { DepreciationScheduleItem } from '@/types';

const RECOVERY_PERIODS: { value: string; label: string }[] = [
  { value: '5', label: '5-Year Personal Property' },
  { value: '7', label: '7-Year Personal Property' },
  { value: '15', label: '15-Year Land Improvements' },
  { value: '27.5', label: '27.5-Year Residential Rental' },
  { value: '39', label: '39-Year Nonresidential' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DepreciationCalculator() {
  const [assetValue, setAssetValue] = useState('');
  const [recoveryPeriod, setRecoveryPeriod] = useState('5');
  const [bonusRate, setBonusRate] = useState(100);
  const [schedule, setSchedule] = useState<DepreciationScheduleItem[]>([]);
  const [calculated, setCalculated] = useState(false);

  function handleCalculate() {
    const costBasis = parseFloat(assetValue);
    if (isNaN(costBasis) || costBasis <= 0) return;

    const period = parseFloat(recoveryPeriod) as MacrsRecoveryPeriod;
    const result = calculateDepreciation(costBasis, period, bonusRate);
    setSchedule(result);
    setCalculated(true);
  }

  function handleReset() {
    setAssetValue('');
    setRecoveryPeriod('5');
    setBonusRate(100);
    setSchedule([]);
    setCalculated(false);
  }

  const chartData = schedule.map((item) => ({
    year: `Yr ${item.year}`,
    depreciation: Math.round(item.depreciation),
    remaining: Math.round(item.remainingBasis),
  }));

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient text-[#0F1B2D]">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white">MACRS Depreciation Schedule</h3>
            <p className="text-sm text-[#94A3B8]">
              Calculate year-by-year depreciation with bonus depreciation
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Asset Value ($)</Label>
            <Input
              type="number"
              placeholder="e.g. 500000"
              value={assetValue}
              onChange={(e) => setAssetValue(e.target.value)}
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white placeholder:text-[#64748B] focus:border-[#C9A84C]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Asset Class (Recovery Period)</Label>
            <Select value={recoveryPeriod} onValueChange={setRecoveryPeriod}>
              <SelectTrigger className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A2B45] border-[rgba(201,168,76,0.15)]">
                {RECOVERY_PERIODS.map((p) => (
                  <SelectItem
                    key={p.value}
                    value={p.value}
                    className="text-white hover:bg-[#243654] focus:bg-[#243654]"
                  >
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[#94A3B8]">
              Bonus Depreciation: {bonusRate}%
            </Label>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={bonusRate}
              onChange={(e) => setBonusRate(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#C9A84C] bg-[#243654]"
            />
            <div className="flex justify-between text-xs text-[#64748B]">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={handleCalculate}
            className="bg-gold-gradient text-[#0F1B2D] hover:opacity-90 font-semibold"
          >
            Calculate Depreciation
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

      {/* Results */}
      {calculated && schedule.length > 0 && (
        <>
          {/* Chart */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-5 w-5 text-[#C9A84C]" />
              <h3 className="font-semibold text-white">Depreciation Schedule</h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.1)" />
                  <XAxis
                    dataKey="year"
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 12 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A2B45',
                      border: '1px solid rgba(201,168,76,0.2)',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                    }}
                    formatter={(value) => [formatCurrency(value as number), '']}
                  />
                  <Bar
                    dataKey="depreciation"
                    name="Annual Depreciation"
                    fill="#C9A84C"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="glass-card p-6 overflow-x-auto">
            <h3 className="font-semibold text-white mb-4">Year-by-Year Schedule</h3>
            <Table>
              <TableHeader>
                <TableRow className="border-[rgba(201,168,76,0.15)] hover:bg-transparent">
                  <TableHead className="text-[#C9A84C]">Year</TableHead>
                  <TableHead className="text-[#C9A84C] text-right">
                    Annual Depreciation
                  </TableHead>
                  <TableHead className="text-[#C9A84C] text-right">
                    Cumulative
                  </TableHead>
                  <TableHead className="text-[#C9A84C] text-right">
                    Remaining Basis
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((item) => (
                  <TableRow
                    key={item.year}
                    className="border-[rgba(201,168,76,0.08)] hover:bg-[#243654]/30"
                  >
                    <TableCell className="text-white font-medium">
                      {item.year}
                    </TableCell>
                    <TableCell className="text-white text-right">
                      {formatCurrency(item.depreciation)}
                    </TableCell>
                    <TableCell className="text-[#94A3B8] text-right">
                      {formatCurrency(item.cumulativeDepreciation)}
                    </TableCell>
                    <TableCell className="text-[#94A3B8] text-right">
                      {formatCurrency(item.remainingBasis)}
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
