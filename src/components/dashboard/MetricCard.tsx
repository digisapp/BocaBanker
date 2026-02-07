import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: string;
}

export default function MetricCard({ icon: Icon, label, value, change }: MetricCardProps) {
  const isPositive = change && !change.startsWith('-');

  return (
    <div className="glass-card p-5 transition-all duration-200 hover:border-[rgba(201,168,76,0.3)]">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C9A84C]/10">
          <Icon className="h-5 w-5 text-[#C9A84C]" />
        </div>
        {change && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isPositive
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            }`}
          >
            {change}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-[#94A3B8] mt-0.5">{label}</p>
      </div>
    </div>
  );
}
