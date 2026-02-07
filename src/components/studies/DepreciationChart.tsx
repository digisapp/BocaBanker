'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

interface DepreciationData {
  year: number
  accelerated: number
  straightLine: number
}

interface DepreciationChartProps {
  data: DepreciationData[]
  maxYears?: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
  }>
  label?: string | number
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-lg">
      <p className="text-sm font-medium text-gray-900 mb-1">Year {label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-gray-500">{entry.name}:</span>
          <span className="text-xs font-medium text-gray-900">
            {formatCurrencyFull(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function DepreciationChart({ data, maxYears = 20 }: DepreciationChartProps) {
  const displayData = data.slice(0, maxYears)

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={displayData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
          <Legend
            formatter={(value: string) => (
              <span className="text-xs text-gray-500">{value}</span>
            )}
          />
          <Bar
            dataKey="accelerated"
            name="With Cost Seg"
            fill="#F59E0B"
            radius={[3, 3, 0, 0]}
            maxBarSize={24}
          />
          <Bar
            dataKey="straightLine"
            name="Without Cost Seg"
            fill="#D1D5DB"
            radius={[3, 3, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
