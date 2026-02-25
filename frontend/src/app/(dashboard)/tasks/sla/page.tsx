"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Timer,
} from "lucide-react";
import api from "@/lib/api";

interface SlaTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  sla_status: "within" | "warning" | "breached";
  sla_hours: number;
  elapsed_hours: number;
  remaining_hours: number;
  created_at: string;
  assigned_user_id: string | null;
  client_id: string | null;
}

interface SlaDashboard {
  within: number;
  warning: number;
  breached: number;
  tasks: SlaTask[];
}

const SLA_STATUS_CONFIG = {
  breached: {
    label: "Vencido",
    color: "text-red-600 bg-red-100 dark:bg-red-900/30",
    icon: AlertTriangle,
    dot: "bg-red-500",
  },
  warning: {
    label: "Próximo",
    color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
    icon: Clock,
    dot: "bg-amber-500",
  },
  within: {
    label: "No prazo",
    color: "text-green-600 bg-green-100 dark:bg-green-900/30",
    icon: CheckCircle2,
    dot: "bg-green-500",
  },
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "A Fazer",
  in_progress: "Em Andamento",
  review: "Em Revisão",
};

export default function SlaPage() {
  const [dashboard, setDashboard] = useState<SlaDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    async function fetchSla() {
      try {
        const { data } = await api.get("/sla/dashboard");
        setDashboard(data);
      } catch {
        setDashboard({ within: 0, warning: 0, breached: 0, tasks: [] });
      } finally {
        setLoading(false);
      }
    }
    fetchSla();
  }, []);

  if (loading) {
    return (
      <PageWrapper
        title="SLA & Alertas"
        breadcrumb={[{ label: "Tarefas", href: "/tasks" }, { label: "SLA & Alertas" }]}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </PageWrapper>
    );
  }

  const data = dashboard!;
  const filtered = filter ? data.tasks.filter((t) => t.sla_status === filter) : data.tasks;

  return (
    <PageWrapper
      title="SLA & Alertas"
      breadcrumb={[{ label: "Tarefas", href: "/tasks" }, { label: "SLA & Alertas" }]}
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(["breached", "warning", "within"] as const).map((key) => {
          const cfg = SLA_STATUS_CONFIG[key];
          const count = data[key];
          const Icon = cfg.icon;
          const isActive = filter === key;
          return (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? "" : key)}
              className={`p-4 rounded-xl border transition-colors text-left ${
                isActive
                  ? "border-brand-primary bg-brand-primary/5"
                  : "border-border bg-background-primary hover:bg-background-secondary"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className={cfg.color.split(" ")[0]} />
                <span className="text-2xl font-bold text-foreground-primary">{count}</span>
              </div>
              <p className="text-xs text-foreground-tertiary">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Info */}
      {data.breached > 0 && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
          <ShieldAlert size={20} className="text-red-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {data.breached} tarefa{data.breached > 1 ? "s" : ""} com SLA vencido
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              Essas tarefas ultrapassaram o prazo de SLA da categoria. Priorize a resolução.
            </p>
          </div>
        </div>
      )}

      {/* Tasks table */}
      {filtered.length === 0 ? (
        <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
          <Timer size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-40" />
          <p className="text-sm text-foreground-tertiary">
            {filter ? "Nenhuma tarefa com esse status de SLA" : "Nenhuma tarefa com SLA configurado"}
          </p>
          <p className="text-xs text-foreground-tertiary mt-1">
            Atribua categorias (Financeiro, Cobrança, Atendimento, Documentos) às tarefas para ativar o SLA.
          </p>
        </div>
      ) : (
        <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground-primary">
              Tarefas com SLA ({filtered.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background-secondary/50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-tertiary">Status SLA</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-tertiary">Tarefa</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-tertiary">Categoria</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-tertiary">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-tertiary">Prioridade</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-foreground-tertiary">SLA</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-foreground-tertiary">Decorrido</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-foreground-tertiary">Restante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((task) => {
                  const cfg = SLA_STATUS_CONFIG[task.sla_status];
                  return (
                    <tr key={task.id} className="hover:bg-background-secondary/50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground-primary truncate max-w-[250px]">
                          {task.title}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground-tertiary">{task.category || "-"}</td>
                      <td className="px-4 py-3 text-xs text-foreground-secondary">{STATUS_LABELS[task.status] || task.status}</td>
                      <td className="px-4 py-3 text-xs text-foreground-secondary">{PRIORITY_LABELS[task.priority] || task.priority}</td>
                      <td className="px-4 py-3 text-right text-xs text-foreground-tertiary">{task.sla_hours}h</td>
                      <td className="px-4 py-3 text-right text-xs font-medium text-foreground-primary">{task.elapsed_hours}h</td>
                      <td className={`px-4 py-3 text-right text-xs font-medium ${
                        task.sla_status === "breached" ? "text-red-500" : task.sla_status === "warning" ? "text-amber-500" : "text-green-500"
                      }`}>
                        {task.sla_status === "breached" ? `-${(task.elapsed_hours - task.sla_hours).toFixed(1)}h` : `${task.remaining_hours}h`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
