'use client';

import {
  Users,
  Building2,
  FileText,
  Mail,
  File,
  Clock,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ActivityItem } from '@/types';

interface RecentActivityProps {
  activities: ActivityItem[];
}

const ACTIVITY_ICONS: Record<string, typeof Users> = {
  client: Users,
  property: Building2,
  study: FileText,
  email: Mail,
  document: File,
};

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-[#C9A84C]" />
          Recent Activity
        </h3>
        <p className="text-sm text-[#64748B] text-center py-8">
          No recent activity
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-[#C9A84C]" />
        Recent Activity
      </h3>
      <ScrollArea className="h-[320px] pr-3">
        <div className="space-y-1">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.type] || FileText;
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#243654]/30 transition-colors"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#0F1B2D]">
                  <Icon className="h-4 w-4 text-[#C9A84C]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {timeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
