export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  roles: string[]
  permissions: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
  schema_name: string
  logo?: string
  is_active: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  user: User
  tenant: Tenant
}

export interface AuthState {
  user: User | null
  tenant: Tenant | null
  isAuthenticated: boolean
}
