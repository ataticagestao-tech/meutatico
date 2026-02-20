export interface Task {
  id: string
  title: string
  description?: string
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string
  assigned_name?: string
  client_id?: string
  client_name?: string
  ticket_id?: string
  due_date?: string
  position: number
  tags?: string[]
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface TaskTemplate {
  id: string
  name: string
  description?: string
  tasks: Array<{
    title: string
    description?: string
    priority: Task['priority']
    relative_due_days?: number
  }>
  created_at: string
  updated_at: string
}

export interface TaskCreateRequest {
  title: string
  description?: string
  status?: Task['status']
  priority: Task['priority']
  assigned_to?: string
  client_id?: string
  ticket_id?: string
  due_date?: string
  tags?: string[]
}

export interface TaskMoveRequest {
  status: Task['status']
  position: number
}
