export interface TicketMessage {
  id: string
  ticket_id: string
  user_id: string
  user_name: string
  user_avatar?: string
  content: string
  is_internal: boolean
  attachments?: string[]
  created_at: string
}

export interface Ticket {
  id: string
  number: number
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'waiting_client' | 'waiting_internal' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  client_id: string
  client_name: string
  assigned_to?: string
  assigned_name?: string
  category?: string
  tags?: string[]
  messages: TicketMessage[]
  created_at: string
  updated_at: string
  resolved_at?: string
  closed_at?: string
}

export interface TicketCreateRequest {
  subject: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  client_id: string
  assigned_to?: string
  category?: string
  tags?: string[]
}

export interface TicketUpdateRequest {
  subject?: string
  description?: string
  status?: Ticket['status']
  priority?: Ticket['priority']
  assigned_to?: string
  category?: string
  tags?: string[]
}
