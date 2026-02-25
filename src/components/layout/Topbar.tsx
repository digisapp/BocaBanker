'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Search,
  LogOut,
  Settings,
  LayoutDashboard,
  MessageSquare,
  Users,
  Building2,
  FileBarChart,
  Calculator,
  Mail,
  FolderOpen,
} from 'lucide-react'
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

interface SearchResult {
  label: string
  href: string
  icon: React.ElementType
  category: 'page' | 'action'
}

const searchableItems: SearchResult[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, category: 'page' },
  { label: 'AI Chat', href: '/chat', icon: MessageSquare, category: 'page' },
  { label: 'Clients', href: '/clients', icon: Users, category: 'page' },
  { label: 'New Client', href: '/clients/new', icon: Users, category: 'action' },
  { label: 'Import Clients', href: '/clients/import', icon: Users, category: 'action' },
  { label: 'Properties', href: '/properties', icon: Building2, category: 'page' },
  { label: 'New Property', href: '/properties/new', icon: Building2, category: 'action' },
  { label: 'Studies', href: '/studies', icon: FileBarChart, category: 'page' },
  { label: 'New Study', href: '/studies/new', icon: FileBarChart, category: 'action' },
  { label: 'Calculators', href: '/calculators', icon: Calculator, category: 'page' },
  { label: 'Email Outreach', href: '/email', icon: Mail, category: 'page' },
  { label: 'Email History', href: '/email/history', icon: Mail, category: 'action' },
  { label: 'Documents', href: '/documents', icon: FolderOpen, category: 'page' },
  { label: 'Settings', href: '/settings', icon: Settings, category: 'page' },
]

export default function Topbar({ title }: TopbarProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [searchValue, setSearchValue] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'BB'

  const displayName =
    user?.user_metadata?.full_name || user?.email || 'User'

  const filteredResults = useMemo(() =>
    searchValue.trim()
      ? searchableItems.filter((item) =>
          item.label.toLowerCase().includes(searchValue.toLowerCase())
        )
      : [],
    [searchValue]
  )

  const navigateTo = useCallback((href: string) => {
    router.push(href)
    setSearchValue('')
    setShowResults(false)
    inputRef.current?.blur()
  }, [router])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showResults || filteredResults.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % filteredResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % filteredResults.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      navigateTo(filteredResults[selectedIndex].href)
    } else if (e.key === 'Escape') {
      setShowResults(false)
      inputRef.current?.blur()
    }
  }, [showResults, filteredResults, selectedIndex, navigateTo])

  // Keyboard shortcut: Cmd+K / Ctrl+K to focus search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between h-16 px-4 md:px-6">
      {/* Page Title */}
      <h1 className="text-xl font-serif font-semibold text-gray-900 truncate">
        {title}
      </h1>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search... (⌘K)"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value)
              setSelectedIndex(0)
              setShowResults(true)
            }}
            onFocus={() => searchValue.trim() && setShowResults(true)}
            onKeyDown={handleKeyDown}
            className="pl-9 w-[200px] lg:w-[280px] bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-amber-500/20"
            aria-label="Search pages and actions"
            role="combobox"
            aria-expanded={showResults && filteredResults.length > 0}
            aria-autocomplete="list"
          />

          {/* Search Results Dropdown */}
          {showResults && filteredResults.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50"
              role="listbox"
            >
              {filteredResults.map((result, index) => {
                const Icon = result.icon
                return (
                  <button
                    key={result.href}
                    role="option"
                    aria-selected={index === selectedIndex}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-amber-50 text-amber-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => navigateTo(result.href)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{result.label}</span>
                    <span className="ml-auto text-xs text-gray-400 capitalize">
                      {result.category}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {showResults && searchValue.trim() && filteredResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 p-3 text-sm text-gray-500 text-center">
              No results found
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-gray-400 hover:text-amber-600 hover:bg-amber-50"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </Button>

        {/* User Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full ring-2 ring-gray-200 hover:ring-amber-300 transition-all"
              aria-label="User menu"
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
