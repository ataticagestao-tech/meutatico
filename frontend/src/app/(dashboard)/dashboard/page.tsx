"use client";

import { PageWrapper } from "@/components/layout/page-wrapper";
import { Users, Ticket, CheckSquare, FileText, TrendingUp, Clock } from "lucide-react";

const stats = [
  { label: "Clientes Ativos", value: "0", icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
  { label: "Solicitacoes Abertas", value: "0", icon: Ticket, color: "text-orange-500", bg: "bg-orange-50" },
  { label: "Tarefas Pendentes", value: "0", icon: CheckSquare, color: "text-green-500", bg: "bg-green-50" },
  { label: "Documentos", value: "0", icon: FileText, color: "text-purple-500", bg: "bg-purple-50" },
];

export default function DashboardPage() {
  return (
    <PageWrapper title="Dashboard" breadcrumb={[{ label: "Dashboard" }]}>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-background-primary border border-border rounded-xl p-5 flex items-center gap-4"
          >
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon size={24} className={stat.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground-primary">{stat.value}</p>
              <p className="text-sm text-foreground-secondary">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <div className="bg-background-primary border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground-primary">Solicitacoes Recentes</h3>
            <a href="/tickets" className="text-sm text-brand-primary hover:underline">Ver todas</a>
          </div>
          <div className="text-center py-8 text-foreground-tertiary">
            <Ticket size={40} className="mx-auto mb-2 opacity-50" />
            <p>Nenhuma solicitacao encontrada</p>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-background-primary border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground-primary">Tarefas Proximas</h3>
            <a href="/tasks" className="text-sm text-brand-primary hover:underline">Ver todas</a>
          </div>
          <div className="text-center py-8 text-foreground-tertiary">
            <Clock size={40} className="mx-auto mb-2 opacity-50" />
            <p>Nenhuma tarefa com prazo proximo</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
