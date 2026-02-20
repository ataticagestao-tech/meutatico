'use client'

import { useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'

export function usePermissions() {
  const user = useAuthStore((state) => state.user)

  /**
   * Check if the current user has a specific permission.
   * Permissions are stored as "module.action" strings,
   * e.g. "tickets.create", "clients.delete".
   */
  const hasPermission = useCallback(
    (module: string, action: string): boolean => {
      if (!user?.permissions) return false
      const permissionKey = `${module}.${action}`
      return user.permissions.includes(permissionKey)
    },
    [user?.permissions],
  )

  /**
   * Check if the current user has a specific role.
   */
  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user?.roles) return false
      return user.roles.includes(role)
    },
    [user?.roles],
  )

  /**
   * Check if the current user has any of the specified roles.
   */
  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      if (!user?.roles) return false
      return roles.some((role) => user.roles.includes(role))
    },
    [user?.roles],
  )

  /**
   * Check if the current user is a super admin.
   */
  const isSuperAdmin = useCallback((): boolean => {
    return hasRole('super_admin')
  }, [hasRole])

  return {
    hasPermission,
    hasRole,
    hasAnyRole,
    isSuperAdmin,
  }
}
