'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, LogOut, User, Settings } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/context/AuthContext'

interface TopbarProps {
  title: string
}

export default function Topbar({ title }: TopbarProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [searchValue, setSearchValue] = useState('')

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'BB'

  const displayName =
    user?.user_metadata?.full_name || user?.email || 'User'

  return (
    <header className="sticky top-0 z-30 glass-card flex items-center justify-between h-16 px-4 md:px-6 border-b border-[rgba(201,168,76,0.12)]">
      {/* Page Title */}
      <h1 className="text-xl font-serif font-semibold text-[#F8FAFC] truncate">
        {title}
      </h1>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9 w-[200px] lg:w-[280px] bg-[rgba(255,255,255,0.05)] border-[rgba(201,168,76,0.15)] text-[#F8FAFC] placeholder:text-[#64748B] focus:border-[#C9A84C] focus:ring-[#C9A84C]/20"
          />
        </div>

        {/* Notification Bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-[#94A3B8] hover:text-[#C9A84C] hover:bg-[rgba(201,168,76,0.1)]"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#C9A84C] animate-pulse-gold" />
        </Button>

        {/* User Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full ring-2 ring-[rgba(201,168,76,0.2)] hover:ring-[#C9A84C]/50 transition-all"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gold-gradient text-[#0F1B2D] font-semibold text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-[#1A2B45] border-[rgba(201,168,76,0.15)] text-[#F8FAFC]"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-[#F8FAFC]">{displayName}</p>
                <p className="text-xs text-[#94A3B8] truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[rgba(201,168,76,0.12)]" />
            <DropdownMenuItem
              onClick={() => router.push('/settings')}
              className="text-[#94A3B8] hover:text-[#C9A84C] focus:text-[#C9A84C] focus:bg-[rgba(201,168,76,0.1)] cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push('/settings')}
              className="text-[#94A3B8] hover:text-[#C9A84C] focus:text-[#C9A84C] focus:bg-[rgba(201,168,76,0.1)] cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[rgba(201,168,76,0.12)]" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
