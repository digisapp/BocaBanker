'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

const labelMap: Record<string, string> = {
  dashboard: 'Dashboard',
  chat: 'AI Chat',
  clients: 'Clients',
  properties: 'Properties',
  studies: 'Studies',
  calculators: 'Calculators',
  email: 'Email',
  documents: 'Documents',
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
  import: 'Import',
  history: 'History',
  report: 'Report',
}

function formatSegment(segment: string): string {
  if (labelMap[segment]) return labelMap[segment]
  // If it looks like a UUID, show "Details"
  if (/^[0-9a-f-]{20,}$/i.test(segment)) return 'Details'
  // Capitalize other segments
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
}

export default function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length <= 1) return null

  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const label = formatSegment(segment)
    const isLast = index === segments.length - 1

    return { href, label, isLast }
  })

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
      <Link
        href="/dashboard"
        className="hover:text-amber-600 transition-colors"
        aria-label="Home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 text-gray-300" />
          {crumb.isLast ? (
            <span className="text-gray-900 font-medium" aria-current="page">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-amber-600 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
