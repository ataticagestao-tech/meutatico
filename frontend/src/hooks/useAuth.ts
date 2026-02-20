'use client'

import { useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { setAccessToken, removeAccessToken } from '@/lib/auth'
import api from '@/lib/api'
import type { LoginResponse } from '@/types/auth'

export function useAuth() {
  const { user, tenant, isAuthenticated, login: storeLogin, logout: storeLogout } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      setError(null)

      try {
        const { data } = await api.post<LoginResponse>('/auth/login', {
          email,
          password,
        })

        setAccessToken(data.access_token)
        storeLogin(data.user, data.tenant)

        return data
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Erro ao fazer login. Tente novamente.'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [storeLogin],
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Proceed with local logout even if API call fails
    } finally {
      removeAccessToken()
      storeLogout()
    }
  }, [storeLogout])

  return {
    user,
    tenant,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
  }
}
