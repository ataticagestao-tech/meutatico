export interface ClientContact {
  id: string
  name: string
  email: string
  phone?: string
  whatsapp?: string
  role?: string
  is_primary: boolean
}

export interface ClientPartner {
  id?: string
  name: string
  document_number?: string
  document_type?: string
  role?: string
  role_code?: number
  partner_type: number  // 1=PJ, 2=PF, 3=Estrangeiro
  partner_type_label?: string
  entry_date?: string
  age_range?: string
  country?: string
  legal_representative_name?: string
  legal_representative_document?: string
  legal_representative_role?: string
  source: string  // 'api' | 'manual'
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
  financial_company_id?: string | null
  contracted_plan?: string
  contract_start_date?: string
  contract_end_date?: string
  monthly_fee?: number
  tax_regime?: string
  systems_used?: string[]
  notes?: string
  logo_url?: string | null
  logo_source?: string | null
  contacts: ClientContact[]
  partners: ClientPartner[]
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
  financial_company_id?: string | null
  contracted_plan?: string
  contract_start_date?: string
  contract_end_date?: string
  monthly_fee?: number
  tax_regime?: string
  systems_used?: string[]
  notes?: string
  contacts?: Omit<ClientContact, 'id'>[]
  partners?: Omit<ClientPartner, 'id'>[]
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
  financial_company_id?: string | null
  contracted_plan?: string
  contract_start_date?: string
  contract_end_date?: string
  monthly_fee?: number
  tax_regime?: string
  systems_used?: string[]
  notes?: string
  contacts?: Omit<ClientContact, 'id'>[]
  partners?: Omit<ClientPartner, 'id'>[]
}
