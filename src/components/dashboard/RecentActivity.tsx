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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          Recent Activity
        </h3>
        <p className="text-sm text-gray-500 text-center py-8">
          No recent activity
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-600" />
        Recent Activity
      </h3>
      <ScrollArea className="h-[320px] pr-3">
        <div className="space-y-1">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.type] || FileText;
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-50">
                  <Icon className="h-4 w-4 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
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
