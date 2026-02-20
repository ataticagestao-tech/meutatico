import {
  LayoutDashboard,
  Users,
  Ticket,
  ClipboardList,
  BookOpen,
  FileText,
  Settings,
  type LucideIcon,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Ticket
// ---------------------------------------------------------------------------

export const TICKET_STATUSES = [
  { value: 'open', label: 'Aberto' },
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'waiting_client', label: 'Aguardando Cliente' },
  { value: 'waiting_internal', label: 'Aguardando Interno' },
  { value: 'resolved', label: 'Resolvido' },
  { value: 'closed', label: 'Fechado' },
] as const

export const TICKET_PRIORITIES = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
] as const

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

export const TASK_STATUSES = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'A Fazer' },
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'review', label: 'Em Revisão' },
  { value: 'done', label: 'Concluído' },
] as const

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export const CLIENT_STATUSES = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'suspended', label: 'Suspenso' },
  { value: 'churned', label: 'Churned' },
] as const

// ---------------------------------------------------------------------------
// Color maps
// ---------------------------------------------------------------------------

export const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  waiting_client: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  waiting_internal: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  backlog: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  todo: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  review: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  onboarding: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  churned: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

// ---------------------------------------------------------------------------
// Sidebar modules
// ---------------------------------------------------------------------------

export interface Module {
  key: string
  label: string
  href: string
  icon: LucideIcon
}

export const MODULES: Module[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'clients', label: 'Clientes', href: '/dashboard/clients', icon: Users },
  { key: 'tickets', label: 'Tickets', href: '/dashboard/tickets', icon: Ticket },
  { key: 'tasks', label: 'Tarefas', href: '/dashboard/tasks', icon: ClipboardList },
  { key: 'knowledge_base', label: 'Base de Conhecimento', href: '/dashboard/knowledge-base', icon: BookOpen },
  { key: 'documents', label: 'Documentos', href: '/dashboard/documents', icon: FileText },
  { key: 'settings', label: 'Configurações', href: '/dashboard/settings', icon: Settings },
]
