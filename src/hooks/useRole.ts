'use client'

import { useAuth, type UserRole } from '@/context/AuthContext'

export type { UserRole }

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
  // Role is fetched once in AuthProvider and shared, rather than every
  // RoleGate instance issuing its own /api/auth/me request.
  const { role, roleLoading } = useAuth()

  return {
    role,
    loading: roleLoading,
    ...ROLE_PERMISSIONS[role],
  }
}
