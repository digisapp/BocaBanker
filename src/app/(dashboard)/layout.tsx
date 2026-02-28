'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { AuthProvider } from '@/context/AuthContext'
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

  return (
    <AuthProvider>
      <meta name="robots" content="noindex, nofollow" />
      <div className="flex h-screen overflow-hidden bg-[#FAFAF8]">
        {/* Desktop Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Topbar with mobile nav trigger */}
          <div className="flex items-center">
            <div className="md:hidden pl-2">
              <MobileNav />
            </div>
            <div className="flex-1">
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
