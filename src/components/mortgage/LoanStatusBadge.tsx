import { Badge } from '@/components/ui/badge'

const statusConfig: Record<string, { label: string; className: string }> = {
  pre_qual: {
    label: 'Pre-Qual',
    className: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  application: {
    label: 'Application',
    className: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  },
  processing: {
    label: 'Processing',
    className: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  underwriting: {
    label: 'Underwriting',
    className: 'bg-orange-50 text-orange-600 border-orange-200',
  },
  clear_to_close: {
    label: 'Clear to Close',
    className: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  funded: {
    label: 'Funded',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  closed: {
    label: 'Closed',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  withdrawn: {
    label: 'Withdrawn',
    className: 'bg-red-50 text-red-500 border-red-200',
  },
}

export function LoanStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.pre_qual
  return (
    <Badge variant="outline" className={`${config.className} text-xs`}>
      {config.label}
    </Badge>
  )
}

export const loanStatusLabel = Object.fromEntries(
  Object.entries(statusConfig).map(([k, v]) => [k, v.label])
)
