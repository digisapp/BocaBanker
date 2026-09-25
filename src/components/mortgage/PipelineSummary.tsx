'use client'

import { useSyncExternalStore } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface PipelineData {
  preQual: number
  application: number
  processing: number
  underwriting: number
  clearToClose: number
}

const stageColors: Record<string, string> = {
  'Pre-Qual': '#3b82f6',
  Application: '#6366f1',
  Processing: '#d97706',
  Underwriting: '#ea580c',
  'Clear to Close': '#16a34a',
}

// Phones fit ~45px per bar, so Recharts drops the long labels; abbreviate
// there and keep the full stage name in the tooltip.
const shortLabels: Record<string, string> = {
  'Pre-Qual': 'Pre-Q',
  Application: 'App',
  Processing: 'Proc',
  Underwriting: 'UW',
  'Clear to Close': 'CTC',
}

const MOBILE_MEDIA_QUERY = '(max-width: 639px)'

function subscribeToViewport(callback: () => void) {
  const mql = window.matchMedia(MOBILE_MEDIA_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getIsMobile() {
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches
}

function getServerIsMobile() {
  return false
}

export function PipelineSummary({ data }: { data: PipelineData }) {
  const isMobile = useSyncExternalStore(
    subscribeToViewport,
    getIsMobile,
    getServerIsMobile
  )
  const chartData = [
    { name: 'Pre-Qual', count: data.preQual },
    { name: 'Application', count: data.application },
    { name: 'Processing', count: data.processing },
    { name: 'Underwriting', count: data.underwriting },
    { name: 'Clear to Close', count: data.clearToClose },
  ]

  const hasData = chartData.some((d) => d.count > 0)

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
        No active loans in pipeline
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: isMobile ? 11 : 10, fill: '#9ca3af' }}
          axisLine={{ stroke: '#e5e7eb' }}
          {...(isMobile && {
            interval: 0,
            tickFormatter: (name: string) => shortLabels[name] ?? name,
          })}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '13px',
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [`${value} loans`]}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={stageColors[entry.name] || '#d97706'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
