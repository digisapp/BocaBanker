'use client'

import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Landmark,
  DollarSign,
  BarChart3,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RateTrendChart } from '@/components/mortgage/RateTrendChart'
import { PipelineSummary } from '@/components/mortgage/PipelineSummary'
import { MortgageQuickActions } from '@/components/mortgage/MortgageQuickActions'
import { LoanStatusBadge } from '@/components/mortgage/LoanStatusBadge'
import { useRouter } from 'next/navigation'

interface MortgageStats {
  currentRate30yr: number | null
  currentRate15yr: number | null
  rateChange30yr: number | null
  rateTrend: { weekOf: string; rate30yr: number; rate15yr: number }[]
  pipelineSummary: {
    preQual: number
    application: number
    processing: number
    underwriting: number
    clearToClose: number
    total: number
    totalVolume: number
  }
  commissionMTD: number
  commissionYTD: number
  loansFundedMTD: number
  loansFundedYTD: number
}

interface RecentLoan {
  id: string
  borrowerName: string | null
  propertyAddress: string | null
  loanAmount: string | null
  status: string | null
  loanType: string | null
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatCompact = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return formatCurrency(value)
}

export default function MortgageDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<MortgageStats | null>(null)
  const [recentLoans, setRecentLoans] = useState<RecentLoan[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      const [statsRes, loansRes] = await Promise.all([
        fetch('/api/mortgage/stats'),
        fetch('/api/loans?limit=5&sort=createdAt&order=desc'),
      ])

      if (statsRes.ok) {
        setStats(await statsRes.json())
      }
      if (loansRes.ok) {
        const loansData = await loansRes.json()
        setRecentLoans(loansData.loans || [])
      }
    } catch (error) {
      logger.error('mortgage-dashboard', 'Failed to fetch data', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRefreshRates = async () => {
    setRefreshing(true)
    try {
      await fetch('/api/mortgage/rates', { method: 'POST' })
      await fetchData()
    } catch (error) {
      logger.error('mortgage-dashboard', 'Failed to refresh rates', error)
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const rateChange = stats?.rateChange30yr ?? 0
  const RateIcon =
    rateChange < 0 ? TrendingDown : rateChange > 0 ? TrendingUp : Minus
  const rateColor =
    rateChange < 0
      ? 'text-green-600'
      : rateChange > 0
        ? 'text-red-500'
        : 'text-gray-500'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Landmark className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Mortgage Intelligence
            </h1>
            <p className="text-sm text-gray-500">
              Your command center for loan origination
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshRates}
          disabled={refreshing}
          className="border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
          />
          {refreshing ? 'Refreshing...' : 'Refresh Rates'}
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current 30yr Rate */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
              30-Year Fixed
            </span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.currentRate30yr ? `${stats.currentRate30yr}%` : '--'}
          </p>
          {rateChange !== 0 && (
            <div className={`flex items-center gap-1 mt-1 ${rateColor}`}>
              <RateIcon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {rateChange > 0 ? '+' : ''}
                {rateChange}% vs last week
              </span>
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
              Active Pipeline
            </span>
            <BarChart3 className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats?.pipelineSummary.total ?? 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatCompact(stats?.pipelineSummary.totalVolume ?? 0)} volume
          </p>
        </div>

        {/* MTD Commission */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
              MTD Commission
            </span>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(stats?.commissionMTD ?? 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stats?.loansFundedMTD ?? 0} loan{(stats?.loansFundedMTD ?? 0) !== 1 ? 's' : ''} funded
          </p>
        </div>

        {/* YTD Commission */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
              YTD Commission
            </span>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(stats?.commissionYTD ?? 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {stats?.loansFundedYTD ?? 0} loan{(stats?.loansFundedYTD ?? 0) !== 1 ? 's' : ''} closed YTD
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rate Trend */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Rate Trend
          </h2>
          <RateTrendChart data={stats?.rateTrend ?? []} />
        </div>

        {/* Pipeline by Status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pipeline by Status
          </h2>
          <PipelineSummary data={stats?.pipelineSummary ?? { preQual: 0, application: 0, processing: 0, underwriting: 0, clearToClose: 0 }} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <MortgageQuickActions />
      </div>

      {/* Recent Loans */}
      {recentLoans.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Loans
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/mortgage/loans')}
              className="text-amber-600 hover:text-amber-700"
            >
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {recentLoans.map((loan) => (
              <div
                key={loan.id}
                onClick={() => router.push(`/mortgage/loans/${loan.id}`)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center">
                    <Landmark className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {loan.borrowerName || 'Unnamed'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {loan.propertyAddress || '--'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">
                    {loan.loanAmount
                      ? formatCompact(parseFloat(loan.loanAmount))
                      : '--'}
                  </span>
                  <LoanStatusBadge status={loan.status || 'pre_qual'} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
