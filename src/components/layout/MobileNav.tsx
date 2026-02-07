'use client'

import { useState } from 'react'
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
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

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

export default function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-[#94A3B8] hover:text-[#C9A84C] hover:bg-[rgba(201,168,76,0.1)]"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[280px] p-0 bg-[#0A1220] border-r border-[rgba(201,168,76,0.15)]"
        >
          <SheetHeader className="h-16 flex flex-row items-center px-4 border-b border-[rgba(201,168,76,0.15)]">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-gradient">
                <Building2 className="h-4 w-4 text-[#0F1B2D]" />
              </div>
              <SheetTitle className="text-gold-gradient font-serif text-xl font-bold">
                Boca Banker
              </SheetTitle>
            </div>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + '/')

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[rgba(201,168,76,0.1)] text-[#C9A84C] border-l-2 border-[#C9A84C]'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[rgba(255,255,255,0.05)] border-l-2 border-transparent'
                  )}
                >
                  <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-[#C9A84C]')} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  )
}
