'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { AuthProvider } from '@/context/AuthContext'
import { useVisualViewport } from '@/hooks/useVisualViewport'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import MobileNav from '@/components/layout/MobileNav'
import Breadcrumbs from '@/components/layout/Breadcrumbs'

/**
 * Map pathname segments to human-readable page titles.
 */
function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/chat': 'AI Chat',
    '/leads': 'Leads',
    '/clients': 'Clients',
    '/properties': 'Properties',
    '/studies': 'Studies',
    '/calculators': 'Calculators',
    '/mortgage': 'Mortgage Intelligence',
    '/review-management': 'Reviews',
    '/email': 'Email Outreach',
    '/documents': 'Documents',
    '/settings': 'Settings',
  }

  // Check exact match first, then prefix match
  if (titles[pathname]) return titles[pathname]

  for (const [path, title] of Object.entries(titles)) {
    if (pathname.startsWith(path + '/')) return title
  }

  return 'Boca Banker'
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)
  const viewport = useVisualViewport()

  return (
    <AuthProvider>
      <meta name="robots" content="noindex, nofollow" />
      {/* h-dvh, not h-screen: iOS Safari's 100vh is the toolbar-collapsed
          height, which pushes the bottom of the page under the toolbar. On
          phones the shell is also pinned to the visible area, so the iOS
          keyboard shrinks <main> instead of pushing the top bar off screen. */}
      <div
        className="flex h-dvh overflow-hidden bg-[#FAFAF8] max-md:fixed max-md:inset-x-0 max-md:top-0"
        style={viewport ? { top: viewport.top, height: viewport.height } : undefined}
      >
        {/* Desktop Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Topbar with mobile nav trigger */}
          <div className="flex items-center">
            {/* Matches the Topbar's height/background/border so the two read
                as one continuous bar on mobile */}
            <div className="md:hidden flex h-16 shrink-0 items-center bg-white border-b border-gray-200 pl-2">
              <MobileNav />
            </div>
            <div className="flex-1 min-w-0">
              <Topbar title={pageTitle} />
            </div>
          </div>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <Breadcrumbs />
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  )
}
