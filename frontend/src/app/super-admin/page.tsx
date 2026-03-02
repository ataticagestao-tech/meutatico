"use client";

import { useEffect, useState } from "react";
import { Building2, CreditCard, TrendingUp, Users } from "lucide-react";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    total_tenants: 0,
    active_tenants: 0,
    trial_tenants: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${apiUrl}/super-admin/dashboard`, {
          credentials: "include",
        });
        if (res.ok) {
          setStats(await res.json());
        }
      } catch {}
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Total Tenants", value: stats.total_tenants, icon: Building2, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Tenants Ativos", value: stats.active_tenants, icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
    { label: "Em Trial", value: stats.trial_tenants, icon: CreditCard, color: "text-amber-500", bg: "bg-amber-50" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground-primary mb-6">Dashboard Super Admin</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-background-primary border border-border rounded-xl p-5 flex items-center gap-4"
          >
            <div className={`p-3 rounded-lg ${card.bg}`}>
              <card.icon size={24} className={card.color} />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground-primary">{card.value}</p>
              <p className="text-sm text-foreground-secondary">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-background-primary border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground-primary mb-4">Acoes Rapidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="/super-admin/tenants"
            className="p-4 border border-border rounded-lg hover:border-brand-primary hover:bg-blue-50/50 transition-colors text-center"
          >
            <Building2 size={28} className="mx-auto mb-2 text-brand-primary" />
            <p className="text-sm font-medium">Gerenciar Tenants</p>
          </a>
          <a
            href="/super-admin/plans"
            className="p-4 border border-border rounded-lg hover:border-brand-primary hover:bg-blue-50/50 transition-colors text-center"
          >
            <CreditCard size={28} className="mx-auto mb-2 text-brand-primary" />
            <p className="text-sm font-medium">Gerenciar Planos</p>
          </a>
          <a
            href="/super-admin/users"
            className="p-4 border border-border rounded-lg hover:border-brand-primary hover:bg-blue-50/50 transition-colors text-center"
          >
            <Users size={28} className="mx-auto mb-2 text-brand-primary" />
            <p className="text-sm font-medium">Modulos Globais</p>
          </a>
        </div>
      </div>
    </div>
  );
}
