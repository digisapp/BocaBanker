import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Small element shown right next to the title, e.g. a count pill */
  badge?: ReactNode;
  /** Renders a back button linking here (takes precedence over onBack) */
  backHref?: string;
  /** Renders a back button that calls this, e.g. router.back() */
  onBack?: () => void;
  /** Right-aligned on desktop; wraps below the title on mobile */
  actions?: ReactNode;
  className?: string;
}

const backButtonClass =
  'size-10 md:size-9 text-gray-500 hover:text-navy hover:bg-gray-100';

export default function PageHeader({
  icon: Icon,
  title,
  description,
  badge,
  backHref,
  onBack,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      // flex-wrap rather than a fixed row: when the actions don't fit beside the
      // title (Leads has five buttons beside a 240px sidebar), the whole
      // actions group drops to its own line instead of squeezing the title.
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:gap-y-3',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {backHref ? (
          <Button asChild variant="ghost" size="icon" className={backButtonClass}>
            <Link href={backHref} aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
        ) : onBack ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Go back"
            onClick={onBack}
            className={backButtonClass}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : null}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy">
          <Icon className="h-5 w-5 text-amber-400" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {badge}
          </div>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
