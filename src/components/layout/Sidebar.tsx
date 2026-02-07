'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Building2,
  FileBarChart,
  Calculator,
  Mail,
  FolderOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/properties', label: 'Properties', icon: Building2 },
  { href: '/studies', label: 'Studies', icon: FileBarChart },
  { href: '/calculators', label: 'Calculators', icon: Calculator },
  { href: '/email', label: 'Email', icon: Mail },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen bg-[#0A1220] border-r border-[rgba(201,168,76,0.15)] transition-all duration-300 relative z-40',
          collapsed ? 'w-[68px]' : 'w-[240px]'
        )}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-[rgba(201,168,76,0.15)]">
          <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-gradient">
              <Building2 className="h-4 w-4 text-[#0F1B2D]" />
            </div>
            {!collapsed && (
              <span className="text-gold-gradient font-serif text-xl font-bold whitespace-nowrap">
                Boca Banker
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[rgba(201,168,76,0.1)] text-[#C9A84C] border-l-2 border-[#C9A84C]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[rgba(255,255,255,0.05)] border-l-2 border-transparent',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-[#C9A84C]')} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="bg-[#1A2B45] text-[#F8FAFC] border-[rgba(201,168,76,0.15)]">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return linkContent
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t border-[rgba(201,168,76,0.15)] p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              'w-full text-[#94A3B8] hover:text-[#C9A84C] hover:bg-[rgba(201,168,76,0.1)]',
              collapsed && 'justify-center'
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
