// Paleta colorida por modulo (estilo Asana / ClickUp).
// Cada modulo tem sua cor de acento. Mantem brand-primary navy como ancora.

export type ModuleKey =
  | "dashboard"
  | "clients"
  | "tasks"
  | "calendar"
  | "documents"
  | "estoque"
  | "multiempresa"
  | "financeiro"
  | "comunicacao"
  | "tickets"
  | "settings";

export interface ModuleColor {
  key: ModuleKey;
  // Solid color (text/icon when active or as accent)
  solid: string;
  // Solid as background (dot indicator)
  dot: string;
  // Soft tint (background tile) — light mode + dark mode
  bg: string;
  // Border accent (active state)
  border: string;
  // Tailwind hex hint (for non-class needs)
  hex: string;
}

export const MODULE_COLORS: Record<ModuleKey, ModuleColor> = {
  dashboard: {
    key: "dashboard",
    solid: "text-indigo-500",
    dot: "bg-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    border: "border-indigo-500",
    hex: "#6366f1",
  },
  clients: {
    key: "clients",
    solid: "text-sky-500",
    dot: "bg-sky-500",
    bg: "bg-sky-50 dark:bg-sky-900/20",
    border: "border-sky-500",
    hex: "#0ea5e9",
  },
  tasks: {
    key: "tasks",
    solid: "text-amber-500",
    dot: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-500",
    hex: "#f59e0b",
  },
  calendar: {
    key: "calendar",
    solid: "text-rose-500",
    dot: "bg-rose-500",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    border: "border-rose-500",
    hex: "#f43f5e",
  },
  documents: {
    key: "documents",
    solid: "text-violet-500",
    dot: "bg-violet-500",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    border: "border-violet-500",
    hex: "#8b5cf6",
  },
  estoque: {
    key: "estoque",
    solid: "text-orange-500",
    dot: "bg-orange-500",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-500",
    hex: "#f97316",
  },
  multiempresa: {
    key: "multiempresa",
    solid: "text-teal-500",
    dot: "bg-teal-500",
    bg: "bg-teal-50 dark:bg-teal-900/20",
    border: "border-teal-500",
    hex: "#14b8a6",
  },
  financeiro: {
    key: "financeiro",
    solid: "text-emerald-500",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-500",
    hex: "#10b981",
  },
  comunicacao: {
    key: "comunicacao",
    solid: "text-pink-500",
    dot: "bg-pink-500",
    bg: "bg-pink-50 dark:bg-pink-900/20",
    border: "border-pink-500",
    hex: "#ec4899",
  },
  tickets: {
    key: "tickets",
    solid: "text-orange-500",
    dot: "bg-orange-500",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-500",
    hex: "#f97316",
  },
  settings: {
    key: "settings",
    solid: "text-slate-500",
    dot: "bg-slate-500",
    bg: "bg-slate-100 dark:bg-slate-800/40",
    border: "border-slate-500",
    hex: "#64748b",
  },
};

// Status badges — paleta vibrante porem semantica
export const STATUS_BADGE = {
  // Genericos
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  inactive: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  in_progress: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  todo: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  blocked: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  // Tickets
  open: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  closed: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300",
  waiting_client: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  waiting_internal: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
} as const;

// Priority badges
export const PRIORITY_BADGE = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300",
  medium: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  urgent: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
} as const;
