'use client'

import { useRouter } from 'next/navigation'
import {
  Plus,
  BarChart3,
  ListChecks,
  Settings,
  Calculator,
} from 'lucide-react'

const actions = [
  {
    icon: Plus,
    label: 'New Loan',
    description: 'Add to pipeline',
    href: '/mortgage/loans/new',
  },
  {
    icon: ListChecks,
    label: 'View Pipeline',
    description: 'All active loans',
    href: '/mortgage/loans',
  },
  {
    icon: Calculator,
    label: 'Calculators',
    description: 'Scenario tools',
    href: '/calculators',
  },
  {
    icon: BarChart3,
    label: 'Commission',
    description: 'Revenue tracking',
    href: '/mortgage/commission',
  },
  {
    icon: Settings,
    label: 'Settings',
    description: 'Arive & alerts',
    href: '/settings',
  },
]

export function MortgageQuickActions() {
  const router = useRouter()

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => router.push(action.href)}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 bg-white hover:border-amber-200 hover:bg-amber-50/50 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
            <action.icon className="h-5 w-5 text-amber-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">
              {action.label}
            </p>
            <p className="text-[11px] text-gray-500">{action.description}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
