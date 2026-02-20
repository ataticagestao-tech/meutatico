const ACCESS_TOKEN_KEY = 'access_token'

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
}

export function removeAccessToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

/**
 * Refresh token is stored as an httpOnly cookie and
 * cannot be accessed from JavaScript. It is sent
 * automatically by the browser on requests to the
 * /auth/refresh endpoint.
 */
