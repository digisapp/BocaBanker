'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'

export type UserRole = 'admin' | 'analyst' | 'viewer'

interface UseRoleReturn {
  role: UserRole
  loading: boolean
  canEdit: boolean
  canDelete: boolean
  canCreate: boolean
  canManageUsers: boolean
  canSendEmail: boolean
}

const ROLE_PERMISSIONS: Record<UserRole, {
  canEdit: boolean
  canDelete: boolean
  canCreate: boolean
  canManageUsers: boolean
  canSendEmail: boolean
}> = {
  admin: {
    canEdit: true,
    canDelete: true,
    canCreate: true,
    canManageUsers: true,
    canSendEmail: true,
  },
  analyst: {
    canEdit: true,
    canDelete: false,
    canCreate: true,
    canManageUsers: false,
    canSendEmail: true,
  },
  viewer: {
    canEdit: false,
    canDelete: false,
    canCreate: false,
    canManageUsers: false,
    canSendEmail: false,
  },
}

export function useRole(): UseRoleReturn {
  const { user, loading: authLoading } = useAuth()
  const [role, setRole] = useState<UserRole>('viewer')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setRole('viewer')
      setLoading(false)
      return
    }

    async function fetchRole() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setRole(data.role || 'viewer')
        }
      } catch {
        // Default to viewer on error
      } finally {
        setLoading(false)
      }
    }

    fetchRole()
  }, [user, authLoading])

  const permissions = ROLE_PERMISSIONS[role]

  return {
    role,
    loading,
    ...permissions,
  }
}
