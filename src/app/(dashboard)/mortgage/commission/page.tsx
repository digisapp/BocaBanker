'use client'

import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'
import {
  DollarSign,
  TrendingUp,
  Landmark,
  Percent,
  Loader2,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CommissionData {
  commissionMTD: number
  commissionYTD: number
  loansFundedMTD: number
  loansFundedYTD: number
  avgBps: number
  monthlyBreakdown: { month: string; amount: number }[]
  recentCommissions: {
    borrowerName: string
    loanAmount: number
    commissionBps: number | null
    commissionAmount: number
    actualClosingDate: string
    lenderName: string | null
  }[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

const monthNames: Record<string, string> = {}
for (let m = 0; m < 12; m++) {
  const d = new Date(2024, m, 1)
  const key = `2024-${String(m + 1).padStart(2, '0')}`
  monthNames[key] = d.toLocaleDateString('en-US', { month: 'short' })
}

export default function CommissionPage() {
  const [data, setData] = useState<CommissionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/mortgage/commission')
        if (res.ok) setData(await res.json())
      } catch (error) {
        logger.error('commission-page', 'Failed to fetch data', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const chartData = (data?.monthlyBreakdown || []).map((d) => ({
    ...d,
    label: monthNames[d.month.replace(/^\d{4}/, '2024')] || d.month,
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
          <DollarSign className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Commission Tracker
          </h1>
          <p className="text-sm text-gray-500">
            Revenue from funded loans
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<DollarSign className="h-4 w-4" />}
          label="MTD Commission"
          value={formatCurrency(data?.commissionMTD ?? 0)}
          sub={`${data?.loansFundedMTD ?? 0} loans`}
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="YTD Commission"
          value={formatCurrency(data?.commissionYTD ?? 0)}
          sub={`${data?.loansFundedYTD ?? 0} loans`}
        />
        <MetricCard
          icon={<Percent className="h-4 w-4" />}
          label="Average BPS"
          value={`${data?.avgBps ?? 0} bps`}
          sub="Per funded loan"
        />
        <MetricCard
          icon={<Landmark className="h-4 w-4" />}
          label="Loans Closed YTD"
          value={`${data?.loansFundedYTD ?? 0}`}
          sub="Funded + closed"
        />
      </div>

      {/* Revenue by Month Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Revenue by Month
        </h2>
        {chartData.some((d) => d.amount > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [formatCurrency(value), 'Commission']}
              />
              <Bar dataKey="amount" fill="#d97706" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
            No commission data this year yet
          </div>
        )}
      </div>

      {/* Commission Detail Table */}
      {data?.recentCommissions && data.recentCommissions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 pb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Commission Detail
            </h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead>Close Date</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>BPS</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Lender</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentCommissions.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm text-gray-700">
                      {c.actualClosingDate
                        ? new Date(c.actualClosingDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '--'}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">
                      {c.borrowerName}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {formatCurrency(c.loanAmount)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {c.commissionBps ?? '--'}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-amber-600">
                      {formatCurrency(c.commissionAmount)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {c.lenderName || '--'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
          {label}
        </span>
        <div className="text-amber-500">{icon}</div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  )
}
