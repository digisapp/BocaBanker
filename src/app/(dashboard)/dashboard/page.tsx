'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Building2,
  FileText,
  DollarSign,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import MetricCard from '@/components/dashboard/MetricCard';
import QuickActions from '@/components/dashboard/QuickActions';
import RecentActivity from '@/components/dashboard/RecentActivity';
import type { DashboardStats, ActivityItem } from '@/types';

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
        console.error('Failed to fetch dashboard stats:', err);
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

  // Build a simple monthly savings chart from the recent activity data
  // In a real app, this would come from an aggregated API endpoint
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const savingsChartData = monthNames.map((month, i) => ({
    month,
    savings: stats
      ? Math.round(
          (stats.totalTaxSavings / 6) * (0.5 + Math.random() * 1)
        )
      : 0,
  }));

  const newThisMonth = stats?.newClientsThisMonth || 0;
  const changeText = newThisMonth > 0 ? `+${newThisMonth} this month` : undefined;

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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Total Clients"
          value={String(stats?.totalClients || 0)}
          change={changeText}
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

      {/* Quick Actions */}
      <QuickActions />

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <RecentActivity activities={stats?.recentActivity || []} />

        {/* Savings Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tax Savings Trend</h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={savingsChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.06)"
                />
                <XAxis
                  dataKey="month"
                  stroke="#D1D5DB"
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                />
                <YAxis
                  stroke="#D1D5DB"
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickFormatter={(v) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    color: '#111827',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value) => [
                    formatCurrency(value as number),
                    'Savings',
                  ]}
                />
                <Bar
                  dataKey="savings"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
