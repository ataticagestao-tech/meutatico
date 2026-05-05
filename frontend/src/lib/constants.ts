import {
  LayoutDashboard,
  Users,
  Ticket,
  ClipboardList,
  BookOpen,
  FileText,
  Settings,
  Calendar,
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
  // Tickets
  open: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-800',
  in_progress: 'bg-sky-100 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800',
  waiting_client: 'bg-pink-100 text-pink-700 ring-1 ring-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:ring-pink-800',
  waiting_internal: 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-800',
  resolved: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800',
  closed: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:ring-slate-700',
  // Tasks
  backlog: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:ring-slate-700',
  todo: 'bg-violet-100 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800',
  review: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800',
  done: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800',
  // Clients
  active: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800',
  inactive: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:ring-slate-700',
  onboarding: 'bg-violet-100 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800',
  suspended: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800',
  churned: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800',
}

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:ring-slate-700',
  medium: 'bg-sky-100 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800',
  high: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-800',
  urgent: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800',
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
  { key: 'calendar', label: 'Calendario', href: '/dashboard/calendar', icon: Calendar },
  { key: 'knowledge_base', label: 'Base de Conhecimento', href: '/dashboard/knowledge-base', icon: BookOpen },
  { key: 'documents', label: 'Documentos', href: '/dashboard/documents', icon: FileText },
  { key: 'settings', label: 'Configurações', href: '/dashboard/settings', icon: Settings },
]

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export const CALENDAR_SOURCE_COLORS: Record<string, string> = {
  task: 'bg-blue-500',
  ticket: 'bg-amber-500',
  event: 'bg-violet-500',
}

// Cores para eventos do calendario por tipo (type)
// deadline = Feriado Nacional (vermelho)
// other = Comemorativo/Comercial (rosa)
// reminder = Saude (azul)
// meeting = Reuniao (violeta - padrao)
export const CALENDAR_EVENT_TYPE_COLORS: Record<string, string> = {
  deadline: 'bg-red-500',
  other: 'bg-pink-400',
  reminder: 'bg-blue-500',
  meeting: 'bg-violet-500',
}

/** Retorna a cor de fundo para um item do calendario */
export function getCalendarItemColor(item: { source_type: string; type?: string }): string {
  if (item.source_type === 'event' && item.type) {
    return CALENDAR_EVENT_TYPE_COLORS[item.type] || 'bg-violet-500'
  }
  return CALENDAR_SOURCE_COLORS[item.source_type] || 'bg-gray-500'
}

export const CALENDAR_SOURCE_TEXT_COLORS: Record<string, string> = {
  task: 'text-blue-600 dark:text-blue-400',
  ticket: 'text-amber-600 dark:text-amber-400',
  event: 'text-violet-600 dark:text-violet-400',
}

export const CALENDAR_SOURCE_BG_COLORS: Record<string, string> = {
  task: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
  ticket: 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
  event: 'bg-violet-50 border-violet-200 dark:bg-violet-950 dark:border-violet-800',
}

export const CALENDAR_SOURCE_LABELS: Record<string, string> = {
  task: 'Tarefa',
  ticket: 'Solicitacao',
  event: 'Evento',
}

export const CALENDAR_EVENT_TYPES = [
  { value: 'meeting', label: 'Reuniao' },
  { value: 'reminder', label: 'Lembrete' },
  { value: 'deadline', label: 'Prazo' },
  { value: 'other', label: 'Outro' },
] as const
