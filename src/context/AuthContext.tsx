'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export type UserRole = 'admin' | 'analyst' | 'viewer'

interface AuthContextType {
  user: User | null
  loading: boolean
  /** Role from /api/auth/me — fetched once per signed-in user, shared by all consumers */
  role: UserRole
  roleLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: 'viewer',
  roleLoading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef<SupabaseClient | null>(null)
  // Role is keyed by user id so token refreshes (which emit a new User object)
  // don't trigger a refetch.
  const [roleState, setRoleState] = useState<{ userId: string; role: UserRole } | null>(null)
  const userId = user?.id ?? null

  if (supabaseRef.current === null) {
    supabaseRef.current = createClient()
  }

  useEffect(() => {
    const supabase = supabaseRef.current!

    // Get the initial session
    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch {
        // Auth unavailable (e.g. missing env vars during prerender)
      }
      setLoading(false)
    }

    getSession()

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    fetch('/api/auth/me', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { role?: UserRole } | null) => {
        setRoleState({ userId, role: data?.role ?? 'viewer' })
      })
      .catch(() => {
        // Default to viewer on error (ignore aborts from a user switch)
        if (!controller.signal.aborted) setRoleState({ userId, role: 'viewer' })
      })
    return () => controller.abort()
  }, [userId])

  const roleResolved = userId !== null && roleState?.userId === userId
  const role: UserRole = roleResolved ? roleState!.role : 'viewer'
  const roleLoading = loading || (userId !== null && !roleResolved)

  const signOut = async () => {
    const supabase = supabaseRef.current
    if (supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, role, roleLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
