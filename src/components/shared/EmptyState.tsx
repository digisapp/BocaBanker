import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="glass-card flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C9A84C]/10 mb-4">
        <Icon className="h-7 w-7 text-[#C9A84C]" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-[#94A3B8] max-w-sm">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-6">
          <Button className="bg-gold-gradient text-[#0F1B2D] hover:opacity-90 font-semibold">
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}
