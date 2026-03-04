export interface WhatsAppStatus {
  configured: boolean
  connected: boolean
  phone_number: string | null
  session_id?: string
  updated_at?: string
}

export interface EvolutionInstanceStatus {
  configured: boolean
  status: string // not_configured, unknown, open, close, connecting
  instance_name?: string
}

export interface WhatsAppContact {
  id: string
  name: string
  phone_number: string
  custom_name: string | null
  avatar_url: string | null
}

export interface WhatsAppMessage {
  id: string
  content: string
  from_me: boolean
  message_type: string
  media_url: string | null
  timestamp: string
  status?: string
}

export interface ChatbotRule {
  id: string
  trigger_keyword: string
  response_message: string
  is_active: boolean
  created_at?: string
}

export interface QRCodeResponse {
  qr_code: string | null
  code: string | null
  error?: string
}
