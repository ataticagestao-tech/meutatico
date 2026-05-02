"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CheckSquare,
  ClipboardList,
  DollarSign,
  FolderOpen,
  GitMerge,
  Link2,
  type LucideIcon,
  MessageSquare,
  Package,
  Search,
  Settings,
  Shield,
  Tag,
  Users,
  X,
} from "lucide-react";

interface CommandRoute {
  label: string;
  href: string;
  group: string;
  icon: LucideIcon;
  keywords?: string[];
}

const ROUTES: CommandRoute[] = [
  // Dashboard
  { label: "Visao Geral", href: "/dashboard", group: "Dashboard", icon: BarChart3, keywords: ["home", "inicio"] },
  { label: "Meu Dia", href: "/dashboard/meu-dia", group: "Dashboard", icon: BarChart3 },
  { label: "Painel por Cliente", href: "/dashboard/painel-clientes", group: "Dashboard", icon: BarChart3 },

  // Clientes
  { label: "Lista de Clientes", href: "/clients", group: "Clientes", icon: Users },
  { label: "Novo Cliente", href: "/clients/new", group: "Clientes", icon: Users, keywords: ["adicionar", "criar"] },
  { label: "Onboarding de Clientes", href: "/clients/onboarding", group: "Clientes", icon: Users },
  { label: "Tags & Segmentacao", href: "/clients/tags", group: "Clientes", icon: Users },

  // Tarefas
  { label: "Quadro Kanban", href: "/tasks", group: "Tarefas", icon: CheckSquare, keywords: ["tarefas"] },
  { label: "Templates de Tarefas", href: "/tasks/templates", group: "Tarefas", icon: CheckSquare },
  { label: "Recorrencia", href: "/tasks/recorrencia", group: "Tarefas", icon: CheckSquare },
  { label: "SLA & Alertas", href: "/tasks/sla", group: "Tarefas", icon: CheckSquare },

  // Calendario
  { label: "Calendario Geral", href: "/calendar", group: "Calendario", icon: Calendar, keywords: ["agenda"] },
  { label: "Agendar Reuniao", href: "/calendar/agendar", group: "Calendario", icon: Calendar, keywords: ["meeting", "reuniao"] },
  { label: "Prazos Contratuais", href: "/calendar/prazos", group: "Calendario", icon: Calendar },

  // Documentos
  { label: "Explorador de Documentos", href: "/documents", group: "Documentos", icon: FolderOpen, keywords: ["arquivos"] },
  { label: "Gerar Contrato", href: "/documents/contratos", group: "Documentos", icon: FolderOpen },
  { label: "Gerar Termo", href: "/documents/termos", group: "Documentos", icon: FolderOpen },
  { label: "Vencimentos", href: "/documents/vencimentos", group: "Documentos", icon: FolderOpen },

  // Estoque
  { label: "Produtos & Insumos", href: "/estoque/produtos", group: "Estoque", icon: Package },
  { label: "Ordens de Compra", href: "/estoque/ordens-compra", group: "Estoque", icon: Package },
  { label: "Inventario", href: "/estoque/inventario", group: "Estoque", icon: Package },

  // Multiempresa
  { label: "Consolidado Multi-empresa", href: "/multiempresa", group: "Multi-empresa", icon: GitMerge },
  { label: "Transferencias", href: "/multiempresa/transferencias", group: "Multi-empresa", icon: GitMerge },
  { label: "Relatorios Multi-empresa", href: "/multiempresa/relatorios", group: "Multi-empresa", icon: GitMerge },

  // Financeiro
  { label: "Painel Financeiro", href: "/financeiro", group: "Financeiro", icon: DollarSign },
  { label: "Rotina Mensal", href: "/financeiro/rotina", group: "Financeiro", icon: DollarSign },
  { label: "Relatorio Mensal", href: "/financeiro/relatorio", group: "Financeiro", icon: DollarSign },
  { label: "Conciliacao Bancaria", href: "/financeiro/conciliacao", group: "Financeiro", icon: DollarSign },

  // Comunicacao
  { label: "Inbox Unificado", href: "/comunicacao", group: "Comunicacao", icon: MessageSquare },
  { label: "Email", href: "/comunicacao/email", group: "Comunicacao", icon: MessageSquare },
  { label: "Registro de Ligacoes", href: "/comunicacao/ligacoes", group: "Comunicacao", icon: MessageSquare },
  { label: "WhatsApp", href: "/comunicacao/whatsapp", group: "Comunicacao", icon: MessageSquare },
  { label: "Instagram", href: "/comunicacao/instagram", group: "Comunicacao", icon: MessageSquare },
  { label: "Templates de Comunicacao", href: "/comunicacao/templates", group: "Comunicacao", icon: MessageSquare },

  // Configuracoes
  { label: "Usuarios", href: "/settings/users", group: "Configuracoes", icon: Users },
  { label: "Cargos & Permissoes", href: "/settings/roles", group: "Configuracoes", icon: Shield },
  { label: "Dados da Empresa", href: "/settings/company", group: "Configuracoes", icon: Building2 },
  { label: "Integracoes", href: "/settings/integracoes", group: "Configuracoes", icon: Link2 },
  { label: "Categorias & SLA", href: "/settings/categorias-sla", group: "Configuracoes", icon: Tag },
  { label: "Logs & Auditoria", href: "/settings/logs", group: "Configuracoes", icon: ClipboardList },
  { label: "Configuracoes", href: "/settings", group: "Configuracoes", icon: Settings },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function matchesQuery(route: CommandRoute, query: string): boolean {
  if (!query) return true;
  const q = normalize(query);
  const haystack = [
    route.label,
    route.group,
    route.href,
    ...(route.keywords ?? []),
  ]
    .map(normalize)
    .join(" ");
  return q.split(/\s+/).every((part) => haystack.includes(part));
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => ROUTES.filter((r) => matchesQuery(r, query)),
    [query],
  );

  // Reset state when opening / closing
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Focus on next tick so the dialog is rendered
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Clamp active index when filter shrinks
  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, activeIndex]);

  // Scroll active row into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-cmd-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function navigate(route: CommandRoute) {
    onOpenChange(false);
    router.push(route.href);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = filtered[activeIndex];
      if (selected) navigate(selected);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
    }
  }

  if (!open) return null;

  // Group filtered routes by group
  const grouped: { group: string; items: { route: CommandRoute; index: number }[] }[] = [];
  filtered.forEach((route, index) => {
    const last = grouped[grouped.length - 1];
    if (last && last.group === route.group) {
      last.items.push({ route, index });
    } else {
      grouped.push({ group: route.group, items: [{ route, index }] });
    }
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Busca rapida"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative w-full max-w-xl bg-background-primary border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search size={18} className="text-foreground-tertiary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar paginas, acoes, configuracoes..."
            className="flex-1 h-12 bg-transparent text-sm text-foreground-primary placeholder:text-foreground-tertiary focus:outline-none"
          />
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded text-foreground-tertiary hover:text-foreground-primary hover:bg-background-tertiary"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto scrollbar-thin py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-foreground-tertiary">
              Nenhum resultado para &ldquo;{query}&rdquo;.
            </div>
          ) : (
            grouped.map((g) => (
              <div key={g.group} className="mb-1">
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-tertiary">
                  {g.group}
                </p>
                {g.items.map(({ route, index }) => {
                  const Icon = route.icon;
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={route.href}
                      data-cmd-index={index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => navigate(route)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        isActive
                          ? "bg-brand-primary/10 text-foreground-primary"
                          : "text-foreground-secondary hover:bg-background-tertiary"
                      }`}
                    >
                      <Icon size={16} className="shrink-0 text-foreground-tertiary" />
                      <span className="flex-1 text-sm truncate">{route.label}</span>
                      {isActive && (
                        <ArrowRight size={14} className="shrink-0 text-brand-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer with shortcuts */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-border bg-background-secondary text-[11px] text-foreground-tertiary">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background-tertiary border border-border font-mono text-[10px]">
                ↑↓
              </kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background-tertiary border border-border font-mono text-[10px]">
                Enter
              </kbd>
              abrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background-tertiary border border-border font-mono text-[10px]">
                Esc
              </kbd>
              fechar
            </span>
          </div>
          <span>{filtered.length} resultado{filtered.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}
