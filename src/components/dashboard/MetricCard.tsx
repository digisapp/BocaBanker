import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: string;
  /** Color of the change pill. `auto` is green unless it starts with "-";
   *  use `neutral` for context that isn't good or bad news (a rate move,
   *  a volume figure). */
  tone?: 'auto' | 'neutral';
}

export default function MetricCard({ icon: Icon, label, value, change, tone = 'auto' }: MetricCardProps) {
  const pillClass =
    tone === 'neutral'
      ? 'bg-gray-100 text-gray-600'
      : change && !change.startsWith('-')
        ? 'bg-emerald-50 text-emerald-600'
        : 'bg-red-50 text-red-500';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 transition-all duration-200 hover:shadow-md hover:border-amber-200">
      <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-amber-50">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
      </div>
      <div className="mt-3 sm:mt-4">
        <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {/* Below the label rather than beside the icon, so long notes like
            "3 contacted, 2 qualified" fit a half-width phone card */}
        {change && (
          <span className={`mt-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${pillClass}`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
