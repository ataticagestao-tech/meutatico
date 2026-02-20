"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, BookOpen, ChevronLeft, ChevronRight,
  FileText, FolderOpen, Home, Settings, Ticket,
  CheckSquare, Users, Shield, Building2,
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Clientes", href: "/clients", icon: Users },
  { label: "Solicitacoes", href: "/tickets", icon: Ticket },
  { label: "Tarefas", href: "/tasks", icon: CheckSquare },
  { label: "Base de Conhecimento", href: "/knowledge-base", icon: BookOpen },
  { label: "Documentos", href: "/documents", icon: FolderOpen },
];

const settingsItems = [
  { label: "Usuarios", href: "/settings/users", icon: Users },
  { label: "Cargos e Permissoes", href: "/settings/roles", icon: Shield },
  { label: "Empresa", href: "/settings", icon: Building2 },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={`
        ${collapsed ? "w-[72px]" : "w-[260px]"}
        h-screen bg-background-sidebar text-foreground-inverse flex flex-col
        transition-all duration-300 ease-in-out shrink-0
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight">Tatica Gestap</span>
        )}
        {collapsed && <span className="text-lg font-bold mx-auto">TG</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              transition-colors group
              ${
                isActive(item.href)
                  ? "bg-brand-primary text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }
            `}
          >
            <item.icon size={20} className="shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}

        {/* Separator */}
        <div className="my-4 border-t border-white/10" />

        {/* Settings */}
        <div className={`${collapsed ? "" : "px-3"} mb-2`}>
          {!collapsed && (
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Configuracoes
            </span>
          )}
        </div>
        {settingsItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              transition-colors
              ${
                isActive(item.href)
                  ? "bg-brand-primary text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }
            `}
          >
            <item.icon size={20} className="shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Settings size={20} className="shrink-0" />
          {!collapsed && <span>Configuracoes</span>}
        </Link>
      </div>
    </aside>
  );
}
