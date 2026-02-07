'use client'

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const CATEGORY_COLORS: Record<string, string> = {
  personal_property_5yr: '#F59E0B',
  personal_property_7yr: '#3B82F6',
  land_improvements_15yr: '#10B981',
  building_27_5yr: '#8B5CF6',
  building_39yr: '#EF4444',
  land: '#6B7280',
}

const CATEGORY_LABELS: Record<string, string> = {
  personal_property_5yr: '5-Year',
  personal_property_7yr: '7-Year',
  land_improvements_15yr: '15-Year',
  building_27_5yr: '27.5-Year',
  building_39yr: '39-Year',
  land: 'Land',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

interface AssetBreakdownData {
  category: string
  amount: number
  percentage: number
}

interface AssetBreakdownChartProps {
  data: AssetBreakdownData[]
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    payload: AssetBreakdownData & { name: string; fill: string }
  }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const item = payload[0].payload
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-lg">
      <p className="text-sm font-medium text-gray-900">
        {CATEGORY_LABELS[item.category] || item.category}
      </p>
      <p className="text-sm text-amber-600 font-semibold">{formatCurrency(item.amount)}</p>
      <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}% of total</p>
    </div>
  )
}

interface LegendPayloadItem {
  value: string
  color: string
  payload: AssetBreakdownData & { name: string }
}

function CustomLegend({ payload }: { payload?: LegendPayloadItem[] }) {
  if (!payload) return null

  return (
    <div className="flex flex-wrap justify-center gap-3 mt-4">
      {payload.map((entry: LegendPayloadItem, index: number) => {
        const data = entry.payload
        return (
          <div key={index} className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-gray-500">
              {entry.value} ({data.percentage?.toFixed(1)}%)
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function AssetBreakdownChart({ data }: AssetBreakdownChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    name: CATEGORY_LABELS[item.category] || item.category,
    fill: CATEGORY_COLORS[item.category] || '#6B7280',
  }))

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            dataKey="amount"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
