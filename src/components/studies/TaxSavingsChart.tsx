'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts'

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

interface TaxSavingsData {
  year: number
  savings: number
  cumulativeSavings: number
}

interface TaxSavingsChartProps {
  data: TaxSavingsData[]
  maxYears?: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    payload: TaxSavingsData
  }>
  label?: string | number
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const item = payload[0].payload

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-lg">
      <p className="text-sm font-medium text-gray-900 mb-1">Year {label}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-xs text-gray-500">Cumulative:</span>
          <span className="text-xs font-medium text-amber-600">
            {formatCurrencyFull(item.cumulativeSavings)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
          <span className="text-xs text-gray-500">Annual:</span>
          <span className="text-xs font-medium text-gray-900">
            {formatCurrencyFull(item.savings)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function TaxSavingsChart({ data, maxYears = 20 }: TaxSavingsChartProps) {
  const displayData = data.slice(0, maxYears)

  const milestones: { year: number; savings: number }[] = []
  if (displayData.length > 0) {
    milestones.push({
      year: displayData[0].year,
      savings: displayData[0].cumulativeSavings,
    })
    const year5 = displayData.find((d) => d.year === 5)
    if (year5) {
      milestones.push({ year: 5, savings: year5.cumulativeSavings })
    }
    const last = displayData[displayData.length - 1]
    if (last.year !== 1 && last.year !== 5) {
      milestones.push({ year: last.year, savings: last.cumulativeSavings })
    }
  }

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(0,0,0,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="year"
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fill: '#6B7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="cumulativeSavings"
            stroke="#F59E0B"
            strokeWidth={2}
            fill="url(#goldGradient)"
            name="Cumulative Tax Savings"
          />
          {milestones.map((m) => (
            <ReferenceDot
              key={m.year}
              x={m.year}
              y={m.savings}
              r={4}
              fill="#F59E0B"
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
