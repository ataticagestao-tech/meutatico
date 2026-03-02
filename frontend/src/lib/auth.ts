/**
 * Auth utilities.
 *
 * O access_token é gerenciado como cookie httpOnly pelo backend,
 * tornando-o inacessível via JavaScript (proteção contra XSS).
 *
 * O refresh_token também é cookie httpOnly e é enviado automaticamente
 * pelo browser nas requisições para /auth/refresh.
 *
 * Dados não-sensíveis (user, tenant) ficam em sessionStorage
 * (limpos ao fechar a aba).
 */

export function getAccessToken(): string | null {
  // Cookie httpOnly — inacessível via JS.
  // O browser envia automaticamente via credentials: "include".
  return null
}

export function setAccessToken(_token: string): void {
  // Noop — o backend seta o cookie httpOnly diretamente.
}

export function removeAccessToken(): void {
  if (typeof window === 'undefined') return
  // Limpa dados não-sensíveis do sessionStorage
  sessionStorage.removeItem('user')
  sessionStorage.removeItem('tenant')
}
