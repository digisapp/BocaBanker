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
import BocaBankerAvatar from '@/components/landing/BocaBankerAvatar'

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
            className="text-gray-500 hover:text-amber-600 hover:bg-amber-50"
          >
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[280px] p-0 bg-white border-r border-gray-200"
        >
          <SheetHeader className="h-16 flex flex-row items-center px-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <BocaBankerAvatar size={32} />
              <SheetTitle className="font-serif text-xl font-bold text-gray-900">
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
                      ? 'bg-amber-50 text-amber-700 border-l-2 border-amber-500'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-l-2 border-transparent'
                  )}
                >
                  <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-amber-600')} />
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
