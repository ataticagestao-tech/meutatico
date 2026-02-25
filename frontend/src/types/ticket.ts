export interface TicketMessage {
  id: string
  ticket_id: string
  author_user_id: string
  author_name: string
  user_avatar?: string
  content: string
  is_internal_note: boolean
  attachments?: string[]
  created_at: string
}

export interface Ticket {
  id: string
  ticket_number: number
  title: string
  description: string
  type?: string
  status: 'open' | 'in_progress' | 'waiting_client' | 'waiting_internal' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category?: string
  source?: string
  client_id: string
  client_name: string
  requester_user_id?: string
  requester_name?: string
  assigned_user_id?: string
  assigned_user_name?: string
  due_date?: string
  tags?: string[]
  messages: TicketMessage[]
  created_by?: string
  created_at: string
  updated_at: string
  resolved_at?: string
  closed_at?: string
}

export interface TicketCreateRequest {
  title: string
  description?: string
  type?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category?: string
  source?: string
  client_id: string
  assigned_user_id?: string
  due_date?: string
  tags?: string[]
}

export interface TicketUpdateRequest {
  title?: string
  description?: string
  type?: string
  status?: Ticket['status']
  priority?: Ticket['priority']
  category?: string
  assigned_user_id?: string
  due_date?: string
  tags?: string[]
}
