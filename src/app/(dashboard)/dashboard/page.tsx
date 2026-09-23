'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { formatCurrency } from '@/lib/utils';
import {
  Users,
  Building2,
  FileText,
  DollarSign,
  Loader2,
  Target,
  TrendingUp,
  Percent,
  Briefcase,
  Landmark,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import MetricCard from '@/components/dashboard/MetricCard';
import QuickActions from '@/components/dashboard/QuickActions';
import RecentActivity from '@/components/dashboard/RecentActivity';
import type { DashboardStats } from '@/types';

// recharts is large (~350KB); load it after first paint so the metric cards
// render without waiting on the chart bundle.
const LeadPipelineChart = dynamic(
  () => import('@/components/dashboard/LeadPipelineChart'),
  { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-lg" /> },
);

interface MortgageQuickStats {
  currentRate30yr: number | null;
  rateChangeBps: number | null;
  pipelineCount: number;
  pipelineVolume: number;
  commissionYTD: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [mortgageStats, setMortgageStats] = useState<MortgageQuickStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [dashRes, mtgRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/mortgage/stats'),
        ]);
        if (dashRes.ok) setStats(await dashRes.json());
        else setLoadError(true);
        if (mtgRes.ok) {
          const mtg = await mtgRes.json();
          setMortgageStats({
            currentRate30yr: mtg.currentRate30yr ?? null,
            // API returns the week-over-week change in percentage points
            rateChangeBps:
              typeof mtg.rateChange30yr === 'number'
                ? Math.round(mtg.rateChange30yr * 100)
                : null,
            pipelineCount: mtg.pipelineSummary?.total ?? 0,
            pipelineVolume: mtg.pipelineSummary?.totalVolume ?? 0,
            commissionYTD: mtg.commissionYTD ?? 0,
          });
        }
      } catch (err) {
        logger.error('dashboard-page', 'Failed to fetch dashboard stats', err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const newClientsThisMonth = stats?.newClientsThisMonth || 0;
  const clientChangeText = newClientsThisMonth > 0 ? `+${newClientsThisMonth} this month` : undefined;

  const newLeadsThisMonth = stats?.newLeadsThisMonth || 0;
  const leadChangeText = newLeadsThisMonth > 0 ? `+${newLeadsThisMonth} this month` : undefined;

  const totalLeads = stats?.totalLeads || 0;
  const convertedLeads = stats?.convertedLeads || 0;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0';

  const pipelineCount = (stats?.contactedLeads || 0) + (stats?.qualifiedLeads || 0);

  // Lead pipeline chart data
  const pipelineChartData = [
    { stage: 'New', count: stats?.newLeads || 0, fill: '#6B7280' },
    { stage: 'Contacted', count: stats?.contactedLeads || 0, fill: '#3B82F6' },
    { stage: 'Qualified', count: stats?.qualifiedLeads || 0, fill: '#F59E0B' },
    { stage: 'Converted', count: stats?.convertedLeads || 0, fill: '#10B981' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          Your business at a glance
        </p>
      </div>

      {loadError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Some dashboard data failed to load. Figures below may be incomplete — try refreshing.
        </div>
      )}

      {/* Row 1: Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Total Clients"
          value={String(stats?.totalClients || 0)}
          change={clientChangeText}
        />
        <MetricCard
          icon={Building2}
          label="Properties"
          value={String(stats?.totalProperties || 0)}
        />
        <MetricCard
          icon={FileText}
          label="Studies"
          value={`${stats?.completedStudies || 0} / ${stats?.totalStudies || 0}`}
        />
        <MetricCard
          icon={DollarSign}
          label="Total Tax Savings"
          value={formatCurrency(stats?.totalTaxSavings || 0)}
        />
      </div>

      {/* Row 2: Lead & Portfolio Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Target}
          label="Total Leads"
          value={String(totalLeads)}
          change={leadChangeText}
        />
        <MetricCard
          icon={TrendingUp}
          label="Pipeline"
          value={String(pipelineCount)}
          change={pipelineCount > 0 ? `${stats?.contactedLeads || 0} contacted, ${stats?.qualifiedLeads || 0} qualified` : undefined}
        />
        <MetricCard
          icon={Percent}
          label="Conversion Rate"
          value={`${conversionRate}%`}
          change={convertedLeads > 0 ? `${convertedLeads} converted` : undefined}
        />
        <MetricCard
          icon={Briefcase}
          label="Portfolio Value"
          value={formatCurrency(stats?.totalPortfolioValue || 0)}
        />
      </div>

      {/* Row 3: Mortgage Quick Stats */}
      {mortgageStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            icon={Landmark}
            label="30yr Rate"
            value={mortgageStats.currentRate30yr != null ? `${mortgageStats.currentRate30yr.toFixed(2)}%` : '--'}
            change={
              mortgageStats.rateChangeBps != null
                ? `${mortgageStats.rateChangeBps > 0 ? '+' : ''}${mortgageStats.rateChangeBps} bps`
                : undefined
            }
          />
          <MetricCard
            icon={TrendingUp}
            label="Loan Pipeline"
            value={String(mortgageStats.pipelineCount)}
            change={mortgageStats.pipelineVolume > 0 ? formatCurrency(mortgageStats.pipelineVolume) + ' volume' : undefined}
          />
          <MetricCard
            icon={DollarSign}
            label="YTD Commission"
            value={formatCurrency(mortgageStats.commissionYTD)}
          />
        </div>
      )}

      {/* Quick Actions */}
      <QuickActions />

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <RecentActivity activities={stats?.recentActivity || []} />

        {/* Lead Pipeline Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Lead Pipeline</h3>
          <div className="h-[250px] sm:h-[320px]">
            {totalLeads > 0 ? (
              <LeadPipelineChart data={pipelineChartData} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Target className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No leads yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Import leads to see your pipeline.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
