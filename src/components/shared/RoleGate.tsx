'use client'

import { useRole } from '@/hooks/useRole'

type Permission = 'canEdit' | 'canDelete' | 'canCreate' | 'canManageUsers' | 'canSendEmail'

interface RoleGateProps {
  /** The permission required to render children */
  permission: Permission
  /** Content to render when the user has the permission */
  children: React.ReactNode
  /** Optional fallback when the user lacks permission */
  fallback?: React.ReactNode
}

export function RoleGate({ permission, children, fallback = null }: RoleGateProps) {
  const role = useRole()

  if (role.loading) return null

  if (!role[permission]) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
