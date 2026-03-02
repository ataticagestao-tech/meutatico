"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  BarChart3, Building2, CreditCard, Layers, LogOut,
  Moon, Settings, Sun, Users,
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", href: "/super-admin", icon: BarChart3 },
  { label: "Tenants", href: "/super-admin/tenants", icon: Building2 },
  { label: "Planos", href: "/super-admin/plans", icon: CreditCard },
  { label: "Modulos", href: "/super-admin/users", icon: Layers },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Auth via cookie httpOnly — checamos sessionStorage (dados não-sensíveis do login)
    const user = sessionStorage.getItem("user");
    if (!user) {
      router.replace("/login");
      return;
    }
    setMounted(true);
    const t = document.documentElement.getAttribute("data-theme");
    if (t === "dark") setTheme("dark");
  }, [router]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("tenant");
    router.push("/login");
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar SuperAdmin - cor diferenciada */}
      <aside className="w-[260px] h-screen bg-slate-900 text-white flex flex-col shrink-0">
        <div className="flex items-center h-16 px-4 border-b border-white/10">
          <span className="text-lg font-bold tracking-tight text-amber-400">Super Admin</span>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${
                  pathname === item.href
                    ? "bg-amber-500/20 text-amber-400"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }
              `}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/10 hover:text-white transition-colors w-full"
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
            <span>{theme === "light" ? "Modo Escuro" : "Modo Claro"}</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-white/10 hover:text-red-400 transition-colors w-full"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-background-secondary">
        {children}
      </main>
    </div>
  );
}
