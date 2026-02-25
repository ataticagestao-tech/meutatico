"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle2,
  Pause,
  Play,
  Plus,
  X,
} from "lucide-react";
import api from "@/lib/api";

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  is_recurring: boolean;
  recurrence_rule: { frequency: string; interval: number; day_of_week?: number; day_of_month?: number } | null;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  client_id: string | null;
  client_name: string | null;
  due_date: string | null;
  created_at: string;
}

interface UserItem {
  id: string;
  name: string;
}

interface ClientItem {
  id: string;
  company_name: string;
  trade_name: string | null;
}

const FREQ_LABELS: Record<string, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
};

const FREQ_COLORS: Record<string, string> = {
  daily: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  weekly: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
  monthly: "text-green-600 bg-green-100 dark:bg-green-900/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-gray-500",
  medium: "text-blue-500",
  high: "text-orange-500",
  urgent: "text-red-500",
};

export default function RecorrenciaPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newCategory, setNewCategory] = useState("");
  const [newFrequency, setNewFrequency] = useState("weekly");
  const [newInterval, setNewInterval] = useState(1);
  const [newAssigned, setNewAssigned] = useState("");
  const [newClient, setNewClient] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const [tasksRes, usersRes, clientsRes] = await Promise.all([
        api.get("/tasks?per_page=500"),
        api.get("/users"),
        api.get("/clients"),
      ]);
      const allTasks: TaskItem[] = tasksRes.data.items || [];
      setTasks(allTasks.filter((t) => t.is_recurring));
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.items || []);
      const cList = Array.isArray(clientsRes.data) ? clientsRes.data : clientsRes.data.items || [];
      setClients(cList);
    } catch { /* graceful */ }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle) return;
    setCreating(true);
    try {
      await api.post("/tasks", {
        title: newTitle,
        description: newDescription || undefined,
        priority: newPriority,
        category: newCategory || undefined,
        is_recurring: true,
        recurrence_rule: {
          frequency: newFrequency,
          interval: newInterval,
        },
        assigned_user_id: newAssigned || undefined,
        client_id: newClient || undefined,
      });
      setShowModal(false);
      setNewTitle("");
      setNewDescription("");
      setNewCategory("");
      fetchData();
    } catch { /* error */ }
    finally { setCreating(false); }
  }

  async function toggleRecurring(task: TaskItem) {
    try {
      await api.put(`/tasks/${task.id}`, {
        is_recurring: !task.is_recurring,
        recurrence_rule: task.is_recurring ? null : task.recurrence_rule,
      });
      fetchData();
    } catch { /* error */ }
  }

  const inputClass = "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";

  if (loading) {
    return (
      <PageWrapper
        title="Tarefas Recorrentes"
        breadcrumb={[{ label: "Tarefas", href: "/tasks" }, { label: "Recorrência" }]}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Tarefas Recorrentes"
      breadcrumb={[{ label: "Tarefas", href: "/tasks" }, { label: "Recorrência" }]}
      actions={
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus size={16} /> Nova Recorrência
        </button>
      }
    >
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Object.entries(FREQ_LABELS).map(([key, label]) => {
          const count = tasks.filter((t) => t.recurrence_rule?.frequency === key).length;
          return (
            <div key={key} className="bg-background-primary border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw size={14} className={FREQ_COLORS[key]?.split(" ")[0]} />
                <span className="text-lg font-bold text-foreground-primary">{count}</span>
              </div>
              <p className="text-xs text-foreground-tertiary">{label}</p>
            </div>
          );
        })}
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
          <RefreshCw size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-40" />
          <p className="text-sm text-foreground-tertiary mb-1">Nenhuma tarefa recorrente</p>
          <p className="text-xs text-foreground-tertiary">
            Crie tarefas que se repetem automaticamente: diária, semanal ou mensal.
          </p>
        </div>
      ) : (
        <div className="bg-background-primary border border-border rounded-xl">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground-primary">
              Recorrências Ativas ({tasks.length})
            </h3>
          </div>
          <div className="divide-y divide-border">
            {tasks.map((task) => {
              const freq = task.recurrence_rule?.frequency || "weekly";
              const freqColor = FREQ_COLORS[freq] || FREQ_COLORS.weekly;
              return (
                <div key={task.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-lg shrink-0 ${freqColor}`}>
                      <RefreshCw size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground-primary truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${freqColor}`}>
                          {FREQ_LABELS[freq]}
                          {(task.recurrence_rule?.interval || 1) > 1
                            ? ` (a cada ${task.recurrence_rule?.interval})`
                            : ""}
                        </span>
                        {task.category && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background-secondary text-foreground-tertiary">
                            {task.category}
                          </span>
                        )}
                        <span className={`text-[10px] ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </span>
                      </div>
                      {task.assigned_user_name && (
                        <p className="text-[10px] text-foreground-tertiary mt-0.5">
                          {task.assigned_user_name}
                          {task.client_name ? ` · ${task.client_name}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRecurring(task)}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-border hover:bg-background-secondary text-foreground-secondary"
                  >
                    <Pause size={12} /> Pausar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-background-primary border border-border rounded-xl w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground-primary">Nova Tarefa Recorrente</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-foreground-tertiary hover:text-foreground-primary rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Título *</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Conciliação bancária" className={inputClass} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Descrição</label>
                <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Detalhes da tarefa..." rows={2} className="w-full px-3 py-2 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground-secondary mb-1.5">
                    <Clock size={14} /> Frequência
                  </label>
                  <select value={newFrequency} onChange={(e) => setNewFrequency(e.target.value)} className={inputClass}>
                    <option value="daily">Diária</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Prioridade</label>
                  <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className={inputClass}>
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Categoria</label>
                <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Ex: Financeiro, Cobrança..." className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Responsável</label>
                  <select value={newAssigned} onChange={(e) => setNewAssigned(e.target.value)} className={inputClass}>
                    <option value="">Nenhum</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Cliente</label>
                  <select value={newClient} onChange={(e) => setNewClient(e.target.value)} className={inputClass}>
                    <option value="">Nenhum</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.trade_name || c.company_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary">Cancelar</button>
                <button type="submit" disabled={creating || !newTitle} className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  {creating ? "Criando..." : "Criar Recorrência"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
