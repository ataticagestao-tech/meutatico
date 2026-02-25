"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { MyDayTab } from "@/components/dashboard/my-day-tab";
import { ClientPanelTab } from "@/components/dashboard/client-panel-tab";
import {
  Users,
  Ticket,
  CheckSquare,
  AlertTriangle,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  Loader2,
  LayoutList,
  Sun,
  LayoutDashboard,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PRIORITY_COLORS, STATUS_COLORS } from "@/lib/constants";
import api from "@/lib/api";

type DashboardTab = "overview" | "my-day" | "clients";

interface KPIs {
  active_clients: number;
  pending_tasks: number;
  overdue_tasks: number;
  completed_this_month: number;
  open_tickets: number;
  overdue_tickets: number;
}

interface WeeklyVolume {
  week_label: string;
  created: number;
  completed: number;
}

interface RecentTicket {
  id: string;
  ticket_number: number | null;
  title: string;
  status: string;
  priority: string;
  client_name: string | null;
  created_at: string;
}

interface UpcomingTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  client_name: string | null;
  assigned_user_name: string | null;
}

const TICKET_STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Andamento",
  waiting_client: "Ag. Cliente",
  waiting_internal: "Ag. Interno",
  resolved: "Resolvido",
  closed: "Fechado",
};

const DASHBOARD_TABS: { key: DashboardTab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { key: "my-day", label: "Meu Dia", icon: Sun },
  { key: "clients", label: "Painel por Cliente", icon: Users },
];

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs>({
    active_clients: 0,
    pending_tasks: 0,
    overdue_tasks: 0,
    completed_this_month: 0,
    open_tickets: 0,
    overdue_tickets: 0,
  });
  const [weekly, setWeekly] = useState<WeeklyVolume[]>([]);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const { data } = await api.get("/dashboard/overview");
        setKpis(data.kpis);
        setWeekly(data.weekly_volume);
        setRecentTickets(data.recent_tickets);
        setUpcomingTasks(data.upcoming_tasks);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const maxVolume = Math.max(
    ...weekly.map((w) => Math.max(w.created, w.completed)),
    1
  );

  const stats = [
    {
      label: "Clientes Ativos",
      value: kpis.active_clients,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      href: "/clients",
    },
    {
      label: "Tarefas Pendentes",
      value: kpis.pending_tasks,
      icon: CheckSquare,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      href: "/tasks",
    },
    {
      label: "Tarefas Atrasadas",
      value: kpis.overdue_tasks,
      icon: AlertTriangle,
      color: kpis.overdue_tasks > 0 ? "text-red-500" : "text-green-500",
      bg:
        kpis.overdue_tasks > 0
          ? "bg-red-50 dark:bg-red-900/20"
          : "bg-green-50 dark:bg-green-900/20",
      href: "/tasks",
    },
    {
      label: "Concluídas no Mês",
      value: kpis.completed_this_month,
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-50 dark:bg-green-900/20",
      href: "/tasks",
    },
    {
      label: "Solicitações Abertas",
      value: kpis.open_tickets,
      icon: Ticket,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      href: "/tickets",
    },
    {
      label: "Solicitações Atrasadas",
      value: kpis.overdue_tickets,
      icon: AlertTriangle,
      color: kpis.overdue_tickets > 0 ? "text-red-500" : "text-green-500",
      bg:
        kpis.overdue_tickets > 0
          ? "bg-red-50 dark:bg-red-900/20"
          : "bg-green-50 dark:bg-green-900/20",
      href: "/tickets",
    },
  ];

  if (loading) {
    return (
      <PageWrapper title="Dashboard" breadcrumb={[{ label: "Dashboard" }]}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Dashboard" breadcrumb={[{ label: "Dashboard" }]}>
      {/* Tab Navigation */}
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {DASHBOARD_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-foreground-tertiary hover:text-foreground-secondary"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* My Day Tab */}
      {activeTab === "my-day" && <MyDayTab />}

      {/* Client Panel Tab */}
      {activeTab === "clients" && <ClientPanelTab />}

      {/* Overview Tab */}
      {activeTab === "overview" && (
      <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={() => router.push(stat.href)}
            className="bg-background-primary border border-border rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition-shadow text-left"
          >
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon size={24} className={stat.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground-primary">
                {stat.value}
              </p>
              <p className="text-sm text-foreground-secondary">{stat.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => router.push("/tasks")}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          <LayoutList size={16} />
          Abrir Kanban
        </button>
        <button
          onClick={() => router.push("/clients/new")}
          className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary"
        >
          <Plus size={16} />
          Novo Cliente
        </button>
        <button
          onClick={() => router.push("/tickets")}
          className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary"
        >
          <Ticket size={16} />
          Nova Solicitação
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Weekly Volume Chart */}
        <div className="bg-background-primary border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground-primary mb-4">
            Volume Semanal de Tarefas
          </h3>
          {weekly.length > 0 ? (
            <div className="space-y-3">
              {weekly.map((w) => (
                <div key={w.week_label}>
                  <div className="flex items-center justify-between text-xs text-foreground-secondary mb-1">
                    <span>Semana {w.week_label}</span>
                    <span>
                      {w.created} criadas / {w.completed} concluídas
                    </span>
                  </div>
                  <div className="flex gap-1 h-5">
                    <div
                      className="bg-blue-400 rounded-sm transition-all"
                      style={{
                        width: `${(w.created / maxVolume) * 100}%`,
                        minWidth: w.created > 0 ? "8px" : "0",
                      }}
                      title={`${w.created} criadas`}
                    />
                    <div
                      className="bg-green-400 rounded-sm transition-all"
                      style={{
                        width: `${(w.completed / maxVolume) * 100}%`,
                        minWidth: w.completed > 0 ? "8px" : "0",
                      }}
                      title={`${w.completed} concluídas`}
                    />
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4 mt-2 text-xs text-foreground-tertiary">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-blue-400 rounded-sm" />
                  Criadas
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-green-400 rounded-sm" />
                  Concluídas
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center py-8 text-foreground-tertiary text-sm">
              Sem dados para exibir
            </p>
          )}
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-background-primary border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground-primary">
              Próximas Tarefas
            </h3>
            <a
              href="/tasks"
              className="text-sm text-brand-primary hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight size={14} />
            </a>
          </div>
          {upcomingTasks.length > 0 ? (
            <div className="space-y-2">
              {upcomingTasks.map((task) => {
                const isOverdue =
                  task.due_date && new Date(task.due_date) < new Date();
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-background-secondary transition-colors cursor-pointer"
                    onClick={() => router.push("/tasks")}
                  >
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                        PRIORITY_COLORS[task.priority] || ""
                      }`}
                    >
                      {task.priority === "urgent"
                        ? "Urgente"
                        : task.priority === "high"
                          ? "Alta"
                          : task.priority === "medium"
                            ? "Média"
                            : "Baixa"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground-primary truncate">
                        {task.title}
                      </p>
                      {task.client_name && (
                        <p className="text-[11px] text-foreground-tertiary truncate">
                          {task.client_name}
                        </p>
                      )}
                    </div>
                    {task.due_date && (
                      <span
                        className={`text-[11px] whitespace-nowrap ${
                          isOverdue
                            ? "text-red-500 font-medium"
                            : "text-foreground-tertiary"
                        }`}
                      >
                        {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-foreground-tertiary">
              <Clock size={40} className="mx-auto mb-2 opacity-50" />
              <p>Nenhuma tarefa com prazo próximo</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="bg-background-primary border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground-primary">
            Solicitações Recentes
          </h3>
          <a
            href="/tickets"
            className="text-sm text-brand-primary hover:underline flex items-center gap-1"
          >
            Ver todas <ArrowRight size={14} />
          </a>
        </div>
        {recentTickets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-foreground-tertiary border-b border-border">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Título</th>
                  <th className="pb-2 pr-4">Cliente</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-border/50 hover:bg-background-secondary cursor-pointer transition-colors"
                    onClick={() => router.push(`/tickets/${ticket.id}`)}
                  >
                    <td className="py-2.5 pr-4 text-foreground-tertiary">
                      {ticket.ticket_number || "—"}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-foreground-primary max-w-[200px] truncate">
                      {ticket.title}
                    </td>
                    <td className="py-2.5 pr-4 text-foreground-secondary max-w-[150px] truncate">
                      {ticket.client_name || "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          STATUS_COLORS[ticket.status] || ""
                        }`}
                      >
                        {TICKET_STATUS_LABELS[ticket.status] || ticket.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-foreground-tertiary whitespace-nowrap">
                      {formatDate(ticket.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-foreground-tertiary">
            <Ticket size={40} className="mx-auto mb-2 opacity-50" />
            <p>Nenhuma solicitação encontrada</p>
          </div>
        )}
      </div>
      </>
      )}
    </PageWrapper>
  );
}
