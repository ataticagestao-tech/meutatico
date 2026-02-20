"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Moon, Search, Sun, User } from "lucide-react";

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
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("tenant");
    router.push("/login");
  };

  const user = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("user") || '{"name":"Usuário"}')
    : { name: "Usuário" };

  return (
    <header className="h-16 bg-background-primary border-b border-border flex items-center justify-between px-6 shrink-0">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full pl-10 pr-4 py-2 bg-background-secondary border border-border rounded-lg
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
          className="p-2 rounded-lg hover:bg-background-secondary text-foreground-secondary transition-colors"
          title="Alternar tema"
        >
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-background-secondary text-foreground-secondary transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="flex items-center gap-3 ml-2 pl-4 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground-primary">{user.name}</p>
            <p className="text-xs text-foreground-tertiary">{user.email}</p>
          </div>
          <div className="w-9 h-9 bg-brand-primary rounded-full flex items-center justify-center text-white font-medium text-sm">
            {user.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-background-secondary text-foreground-secondary hover:text-red-500 transition-colors"
            title="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
