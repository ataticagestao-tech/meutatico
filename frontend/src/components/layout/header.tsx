"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Moon, Search, Settings, Sun, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";

export function Header() {
  const router = useRouter();
  const [theme, setTheme] = useState<"light" | "dark">(
    typeof window !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light"
  );

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme-storage", JSON.stringify({ state: { theme: newTheme } }));
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("tenant");
    router.push("/login");
  };

  const user = typeof window !== "undefined"
    ? JSON.parse(sessionStorage.getItem("user") || '{"name":"Usuário"}')
    : { name: "Usuário" };

  return (
    <header className="h-14 bg-background-primary/80 backdrop-blur-md border-b border-border flex items-center justify-between px-5 shrink-0 sticky top-0 z-10">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full pl-9 pr-4 py-1.5 bg-background-secondary border border-border rounded-lg
              text-sm text-foreground-primary placeholder:text-foreground-tertiary
              focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary
              transition-colors"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-background-tertiary text-foreground-secondary transition-colors"
          title="Alternar tema"
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-background-tertiary text-foreground-secondary transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background-primary" />
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-3 ml-2 pl-4 border-l border-border outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 rounded-lg"
              aria-label="Abrir menu do usuário"
            >
              <div className="text-right hidden sm:block">
                <p className="text-[13px] font-medium text-foreground-primary leading-tight">{user.name}</p>
                <p className="text-[11px] text-foreground-tertiary">{user.email}</p>
              </div>
              <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-white font-medium text-xs ring-2 ring-brand-primary/20">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 sm:hidden">
              <p className="text-sm font-medium text-foreground-primary leading-tight truncate">{user.name}</p>
              <p className="text-xs text-foreground-tertiary truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator className="sm:hidden" />
            <DropdownMenuItem onSelect={() => router.push("/settings/company")}>
              <User size={14} className="mr-2" /> Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push("/settings")}>
              <Settings size={14} className="mr-2" /> Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleLogout}
              className="text-red-600 focus:text-red-700 focus:bg-red-50"
            >
              <LogOut size={14} className="mr-2" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
