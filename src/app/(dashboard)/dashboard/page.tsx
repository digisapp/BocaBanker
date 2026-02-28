'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
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
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import MetricCard from '@/components/dashboard/MetricCard';
import QuickActions from '@/components/dashboard/QuickActions';
import RecentActivity from '@/components/dashboard/RecentActivity';
import type { DashboardStats } from '@/types';

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        logger.error('dashboard-page', 'Failed to fetch dashboard stats', err);
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
          Overview of your cost segregation business
        </p>
      </div>

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

      {/* Quick Actions */}
      <QuickActions />

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <RecentActivity activities={stats?.recentActivity || []} />

        {/* Lead Pipeline Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Lead Pipeline</h3>
          <div className="h-[320px]">
            {totalLeads > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(0,0,0,0.06)"
                  />
                  <XAxis
                    dataKey="stage"
                    stroke="#D1D5DB"
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#D1D5DB"
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      color: '#111827',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value) => [String(value), 'Leads']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {pipelineChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
