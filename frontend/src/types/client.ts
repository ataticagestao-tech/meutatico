export interface ClientContact {
  id: string
  name: string
  email: string
  phone?: string
  whatsapp?: string
  role?: string
  is_primary: boolean
}

export type ClientStatus = 'active' | 'inactive' | 'onboarding' | 'suspended' | 'churned'
export type DocumentType = 'cnpj' | 'cpf'

export interface Client {
  id: string
  document_type: DocumentType
  document_number: string
  company_name: string
  trade_name?: string
  email: string
  phone?: string
  address_zip?: string
  address_street?: string
  address_number?: string
  address_complement?: string
  address_neighborhood?: string
  address_city?: string
  address_state?: string
  status: ClientStatus
  responsible_user_id?: string
  responsible_user_name?: string
  contracted_plan?: string
  contract_start_date?: string
  contract_end_date?: string
  monthly_fee?: number
  tax_regime?: string
  systems_used?: string[]
  notes?: string
  contacts: ClientContact[]
  created_at: string
  updated_at: string
}

export interface ClientCreateRequest {
  document_type: DocumentType
  document_number: string
  company_name: string
  trade_name?: string
  email: string
  phone?: string
  address_zip?: string
  address_street?: string
  address_number?: string
  address_complement?: string
  address_neighborhood?: string
  address_city?: string
  address_state?: string
  status?: ClientStatus
  responsible_user_id?: string
  contracted_plan?: string
  contract_start_date?: string
  contract_end_date?: string
  monthly_fee?: number
  tax_regime?: string
  systems_used?: string[]
  notes?: string
  contacts?: Omit<ClientContact, 'id'>[]
}

export interface ClientUpdateRequest {
  document_type?: DocumentType
  document_number?: string
  company_name?: string
  trade_name?: string
  email?: string
  phone?: string
  address_zip?: string
  address_street?: string
  address_number?: string
  address_complement?: string
  address_neighborhood?: string
  address_city?: string
  address_state?: string
  status?: ClientStatus
  responsible_user_id?: string
  contracted_plan?: string
  contract_start_date?: string
  contract_end_date?: string
  monthly_fee?: number
  tax_regime?: string
  systems_used?: string[]
  notes?: string
  contacts?: Omit<ClientContact, 'id'>[]
}
