export interface Task {
  id: string
  title: string
  description?: string
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  position: number
  category?: string
  tags?: string[]
  client_id?: string
  client_name?: string
  ticket_id?: string
  assigned_user_id?: string
  assigned_user_name?: string
  due_date?: string
  started_at?: string
  completed_at?: string
  is_recurring?: boolean
  recurrence_rule?: Record<string, unknown>
  checklist?: Array<{ text: string; done: boolean }>
  created_by?: string
  created_at: string
  updated_at: string
}

export interface TaskTemplate {
  id: string
  name: string
  description?: string
  trigger_event?: string
  tasks_config: Array<{
    title: string
    description?: string
    priority: Task['priority']
    relative_due_days?: number
  }>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TaskCreateRequest {
  title: string
  description?: string
  status?: Task['status']
  priority: Task['priority']
  category?: string
  assigned_user_id?: string
  client_id?: string
  ticket_id?: string
  due_date?: string
  tags?: string[]
}

export interface TaskMoveRequest {
  status: Task['status']
  position: number
}
