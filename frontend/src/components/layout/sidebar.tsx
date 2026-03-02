"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FolderOpen,
  Link2,
  Lock,
  MessageSquare,
  Settings,
  Shield,
  Building2,
  Tag,
  Users,
} from "lucide-react";

interface SubItem {
  label: string;
  href: string;
  disabled?: boolean;
  badge?: string;
}

interface MenuItem {
  label: string;
  icon: React.ElementType;
  href: string;
  color: string;
  children: SubItem[];
}

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    icon: BarChart3,
    href: "/dashboard",
    color: "#3b82f6",
    children: [
      { label: "Visão Geral", href: "/dashboard" },
      { label: "Meu Dia", href: "/dashboard/meu-dia" },
      { label: "Painel por Cliente", href: "/dashboard/painel-clientes" },
    ],
  },
  {
    label: "Clientes",
    icon: Users,
    href: "/clients",
    color: "#10b981",
    children: [
      { label: "Lista de Clientes", href: "/clients" },
      { label: "Onboarding", href: "/clients/onboarding" },
      { label: "Tags & Segmentação", href: "/clients/tags" },
    ],
  },
  {
    label: "Tarefas",
    icon: CheckSquare,
    href: "/tasks",
    color: "#8b5cf6",
    children: [
      { label: "Quadro Kanban", href: "/tasks" },
      { label: "Templates", href: "/tasks/templates" },
      { label: "Recorrência", href: "/tasks/recorrencia" },
      { label: "SLA & Alertas", href: "/tasks/sla" },
    ],
  },
  {
    label: "Calendário",
    icon: Calendar,
    href: "/calendar",
    color: "#06b6d4",
    children: [
      { label: "Calendário Geral", href: "/calendar" },
      { label: "Agendar Reunião", href: "/calendar/agendar" },
      { label: "Prazos Contratuais", href: "/calendar/prazos" },
    ],
  },
  {
    label: "Documentos",
    icon: FolderOpen,
    href: "/documents",
    color: "#f97316",
    children: [
      { label: "Explorador", href: "/documents" },
      { label: "Gerar Contrato", href: "/documents/contratos" },
      { label: "Gerar Termo", href: "/documents/termos" },
      { label: "Vencimentos", href: "/documents/vencimentos" },
      { label: "Assinatura Digital", href: "/documents/assinatura" },
    ],
  },
  {
    label: "Financeiro",
    icon: DollarSign,
    href: "/financeiro",
    color: "#10b981",
    children: [
      { label: "Painel do Cliente", href: "/financeiro" },
      { label: "Rotina Mensal", href: "/financeiro/rotina" },
      { label: "Relatório Mensal", href: "/financeiro/relatorio" },
      { label: "Links Rápidos", href: "/financeiro/links" },
    ],
  },
  {
    label: "Comunicação",
    icon: MessageSquare,
    href: "/comunicacao",
    color: "#ec4899",
    children: [
      { label: "Inbox Unificado", href: "/comunicacao" },
      { label: "Email", href: "/comunicacao/email" },
      { label: "Registro Ligações", href: "/comunicacao/ligacoes" },
      { label: "WhatsApp", href: "/comunicacao/whatsapp" },
      { label: "Instagram", href: "/comunicacao/instagram", badge: "Marketing" },
      { label: "Templates", href: "/comunicacao/templates" },
    ],
  },
];

const settingsItems = [
  { label: "Usuários", href: "/settings/users", icon: Users },
  { label: "Cargos & Permissões", href: "/settings/roles", icon: Shield },
  { label: "Empresa", href: "/settings/company", icon: Building2 },
  { label: "Integrações", href: "/settings/integracoes", icon: Link2 },
  { label: "Categorias & SLA", href: "/settings/categorias-sla", icon: Tag },
  { label: "Logs & Auditoria", href: "/settings/logs", icon: ClipboardList },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const pathname = usePathname();

  // Auto-expand the menu that contains the current route
  useEffect(() => {
    const activeMenu = menuItems.find(
      (item) =>
        pathname === item.href ||
        pathname.startsWith(item.href + "/") ||
        item.children.some(
          (child) => pathname === child.href || pathname.startsWith(child.href + "/")
        )
    );
    if (activeMenu && !expandedMenus.includes(activeMenu.label)) {
      setExpandedMenus((prev) => [...prev, activeMenu.label]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isMenuActive = (item: MenuItem) =>
    pathname === item.href ||
    pathname.startsWith(item.href + "/") ||
    item.children.some(
      (child) => pathname === child.href || pathname.startsWith(child.href + "/")
    );

  // Find the most specific matching child within a group
  const getActiveChildHref = (children: SubItem[]) => {
    const matching = children.filter(
      (child) => !child.disabled && (pathname === child.href || pathname.startsWith(child.href + "/"))
    );
    if (matching.length === 0) return null;
    return matching.reduce((a, b) => (a.href.length > b.href.length ? a : b)).href;
  };

  const isSettingActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={`
        ${collapsed ? "w-[72px]" : "w-[272px]"}
        h-screen bg-background-sidebar text-foreground-inverse flex flex-col
        transition-all duration-300 ease-in-out shrink-0
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none" className="shrink-0">
            <rect x="3" y="3" width="19" height="19" rx="4" fill="white" />
            <rect x="26" y="3" width="19" height="19" rx="4" fill="white" opacity=".2" />
            <rect x="3" y="26" width="19" height="19" rx="4" fill="white" opacity=".2" />
            <rect x="26" y="26" width="19" height="19" rx="4" fill="white" />
          </svg>
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-base font-bold tracking-tight block leading-tight">tática</span>
              <span className="text-[9px] uppercase tracking-[1.5px] text-slate-500 font-medium leading-none">
                gestão estratégica
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto scrollbar-dark">
        <div className="space-y-0.5">
          {menuItems.map((item) => {
            const active = isMenuActive(item);
            const expanded = expandedMenus.includes(item.label);

            return (
              <div key={item.label}>
                {/* Parent item */}
                <button
                  onClick={() => {
                    if (collapsed) {
                      setCollapsed(false);
                      if (!expandedMenus.includes(item.label)) {
                        toggleMenu(item.label);
                      }
                    } else {
                      toggleMenu(item.label);
                    }
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-colors group cursor-pointer
                    ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  <div className="relative shrink-0">
                    <item.icon size={20} />
                    {/* Color indicator dot */}
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </>
                  )}
                </button>

                {/* Children */}
                {!collapsed && (
                  <div
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${
                      expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="ml-5 pl-4 border-l border-white/10 mt-0.5 mb-1 space-y-0.5">
                      {(() => {
                        const activeHref = getActiveChildHref(item.children);
                        return item.children.map((child) => {
                          const isChildActive = child.href === activeHref;

                          if (child.disabled) {
                            return (
                              <div
                                key={child.href}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 cursor-not-allowed"
                              >
                                <Lock size={12} className="shrink-0" />
                                <span className="flex-1">{child.label}</span>
                                {child.badge && (
                                  <span className="text-[10px] bg-white/5 text-slate-500 px-1.5 py-0.5 rounded">
                                    {child.badge}
                                  </span>
                                )}
                              </div>
                            );
                          }

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`
                                flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                                transition-colors
                                ${
                                  isChildActive
                                    ? "text-white bg-white/5"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                                }
                              `}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isChildActive ? "opacity-100" : "opacity-40"
                                }`}
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="flex-1">{child.label}</span>
                              {child.badge && (
                                <span className="text-[10px] bg-white/10 text-slate-400 px-1.5 py-0.5 rounded">
                                  {child.badge}
                                </span>
                              )}
                            </Link>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Separator */}
        <div className="my-4 border-t border-white/10" />

        {/* Settings Section */}
        <div className="mb-2">
          {!collapsed && (
            <span className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Configurações
            </span>
          )}
        </div>
        <div className="space-y-0.5">
          {settingsItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors
                ${
                  isSettingActive(item.href)
                    ? "bg-brand-primary text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }
              `}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <Link
          href="/settings"
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
            transition-colors
            ${
              pathname === "/settings"
                ? "bg-brand-primary text-white"
                : "text-slate-400 hover:bg-white/10 hover:text-white"
            }
          `}
        >
          <Settings size={20} className="shrink-0" />
          {!collapsed && <span>Configurações</span>}
        </Link>
      </div>
    </aside>
  );
}
