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
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between h-16 px-4 md:px-6">
      {/* Page Title */}
      <h1 className="text-xl font-serif font-semibold text-gray-900 truncate">
        {title}
      </h1>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9 w-[200px] lg:w-[280px] bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
          />
        </div>

        {/* Notification Bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-gray-400 hover:text-amber-600 hover:bg-amber-50"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 animate-pulse-gold" />
        </Button>

        {/* User Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full ring-2 ring-gray-200 hover:ring-amber-300 transition-all"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-white border-gray-200 text-gray-900"
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem
              onClick={() => router.push('/settings')}
              className="text-gray-600 hover:text-amber-700 focus:text-amber-700 focus:bg-amber-50 cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push('/settings')}
              className="text-gray-600 hover:text-amber-700 focus:text-amber-700 focus:bg-amber-50 cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
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
