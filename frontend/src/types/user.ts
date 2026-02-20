export interface Permission {
  id: string
  module: string
  action: string
  description?: string
}

export interface Role {
  id: string
  name: string
  description?: string
  permissions: Permission[]
  created_at: string
  updated_at: string
}

export interface UserType {
  id: string
  name: string
  email: string
  avatar?: string
  phone?: string
  roles: Role[]
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

export interface UserCreateRequest {
  name: string
  email: string
  password: string
  phone?: string
  role_ids: string[]
  is_active?: boolean
}

export interface UserUpdateRequest {
  name?: string
  email?: string
  password?: string
  phone?: string
  role_ids?: string[]
  is_active?: boolean
}
