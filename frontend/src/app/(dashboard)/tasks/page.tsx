"use client";

import { useEffect, useState, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Plus,
  X,
  GripVertical,
  Calendar,
  User,
  ArrowRight,
  ArrowLeft,
  Filter,
  Loader2,
} from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import {
  TASK_STATUSES,
  TICKET_PRIORITIES,
  STATUS_COLORS,
  PRIORITY_COLORS,
} from "@/lib/constants";
import api from "@/lib/api";
import type { Task, TaskCreateRequest } from "@/types/task";
import type { Client } from "@/types/client";
import type { UserType } from "@/types/user";

const COLUMNS = TASK_STATUSES;

const PRIORITY_LABELS: Record<string, string> = {};
TICKET_PRIORITIES.forEach((p) => { PRIORITY_LABELS[p.value] = p.label; });

const COLUMN_COLORS: Record<string, string> = {
  backlog: "border-t-slate-400",
  todo: "border-t-blue-400",
  in_progress: "border-t-yellow-400",
  review: "border-t-indigo-400",
  done: "border-t-green-400",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Filters
  const [filterUser, setFilterUser] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForColumn, setCreateForColumn] = useState<string>("todo");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Create form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [newClientId, setNewClientId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("per_page", "200");
      if (filterUser) params.set("assigned_to", filterUser);
      if (filterClient) params.set("client_id", filterClient);
      if (filterPriority) params.set("priority", filterPriority);

      const { data } = await api.get(`/tasks?${params.toString()}`);
      setTasks((data as any).data ?? data ?? []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [filterUser, filterClient, filterPriority]);

  useEffect(() => {
    fetchTasks();
    api.get("/users").then((r: any) => setUsers(r.data.data ?? r.data ?? [])).catch(() => {});
    api.get("/clients?per_page=200").then((r: any) => setClients(r.data.data ?? [])).catch(() => {});
  }, [fetchTasks]);

  function getColumnTasks(status: string) {
    return tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position);
  }

  function openCreate(columnStatus: string) {
    setCreateForColumn(columnStatus);
    setNewTitle("");
    setNewDescription("");
    setNewPriority("medium");
    setNewAssignedTo("");
    setNewClientId("");
    setNewDueDate("");
    setShowCreateModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle) return;
    setCreating(true);
    try {
      const payload: TaskCreateRequest = {
        title: newTitle,
        description: newDescription || undefined,
        status: createForColumn as TaskCreateRequest["status"],
        priority: newPriority as TaskCreateRequest["priority"],
        assigned_to: newAssignedTo || undefined,
        client_id: newClientId || undefined,
        due_date: newDueDate || undefined,
      };
      await api.post("/tasks", payload);
      setShowCreateModal(false);
      fetchTasks();
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setCreating(false);
    }
  }

  async function moveTask(task: Task, direction: "left" | "right") {
    const colIdx = COLUMNS.findIndex((c) => c.value === task.status);
    const newIdx = direction === "left" ? colIdx - 1 : colIdx + 1;
    if (newIdx < 0 || newIdx >= COLUMNS.length) return;

    const newStatus = COLUMNS[newIdx].value;
    try {
      await api.put(`/tasks/${task.id}`, { status: newStatus, position: 0 });
      fetchTasks();
    } catch (err) {
      console.error("Failed to move task:", err);
    }
  }

  function openDetail(task: Task) {
    setSelectedTask(task);
    setShowDetailModal(true);
  }

  const selectClass =
    "h-9 px-2.5 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";
  const inputClass =
    "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";
  const labelClass = "block text-sm font-medium text-foreground-secondary mb-1.5";

  return (
    <PageWrapper
      title="Tarefas"
      breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Tarefas" }]}
    >
      {/* Filters */}
      <div className="bg-background-primary border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter size={16} className="text-foreground-tertiary" />
          <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className={selectClass}>
            <option value="">Responsavel</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className={selectClass}>
            <option value="">Cliente</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.trade_name || c.company_name}</option>)}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={selectClass}>
            <option value="">Prioridade</option>
            {TICKET_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const columnTasks = getColumnTasks(col.value);
            return (
              <div
                key={col.value}
                className={`flex-shrink-0 w-72 bg-background-secondary rounded-xl border border-border border-t-4 ${COLUMN_COLORS[col.value] || "border-t-gray-400"}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground-primary">{col.label}</h3>
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-background-tertiary text-xs font-medium text-foreground-secondary">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => openCreate(col.value)}
                    className="p-1 text-foreground-tertiary hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Cards */}
                <div className="px-3 pb-3 space-y-2 min-h-[200px] max-h-[calc(100vh-380px)] overflow-y-auto scrollbar-thin">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => openDetail(task)}
                      className="bg-background-primary border border-border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[task.priority] || ""}`}>
                          {PRIORITY_LABELS[task.priority] || task.priority}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {COLUMNS.findIndex((c) => c.value === task.status) > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); moveTask(task, "left"); }}
                              className="p-1 text-foreground-tertiary hover:text-brand-primary rounded"
                              title="Mover para esquerda"
                            >
                              <ArrowLeft size={12} />
                            </button>
                          )}
                          {COLUMNS.findIndex((c) => c.value === task.status) < COLUMNS.length - 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); moveTask(task, "right"); }}
                              className="p-1 text-foreground-tertiary hover:text-brand-primary rounded"
                              title="Mover para direita"
                            >
                              <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-foreground-primary mb-2 line-clamp-2">{task.title}</p>
                      <div className="flex items-center justify-between">
                        {task.due_date && (
                          <span className={`flex items-center gap-1 text-[11px] ${
                            new Date(task.due_date) < new Date() ? "text-red-500" : "text-foreground-tertiary"
                          }`}>
                            <Calendar size={11} />
                            {formatDate(task.due_date)}
                          </span>
                        )}
                        {task.assigned_name && (
                          <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-[10px] font-bold" title={task.assigned_name}>
                            {getInitials(task.assigned_name)}
                          </div>
                        )}
                      </div>
                      {task.client_name && (
                        <p className="text-[11px] text-foreground-tertiary mt-1.5 truncate">{task.client_name}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-background-primary border border-border rounded-xl w-full max-w-lg mx-4 shadow-lg">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground-primary">
                Nova Tarefa - {COLUMNS.find((c) => c.value === createForColumn)?.label}
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 text-foreground-tertiary hover:text-foreground-primary rounded-lg hover:bg-background-tertiary">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className={labelClass}>Titulo *</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Titulo da tarefa" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Descricao</label>
                <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={3} placeholder="Descreva a tarefa..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Prioridade</label>
                  <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className={`${selectClass} w-full h-10`}>
                    {TICKET_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Responsavel</label>
                  <select value={newAssignedTo} onChange={(e) => setNewAssignedTo(e.target.value)} className={`${selectClass} w-full h-10`}>
                    <option value="">Selecione...</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Cliente</label>
                  <select value={newClientId} onChange={(e) => setNewClientId(e.target.value)} className={`${selectClass} w-full h-10`}>
                    <option value="">Selecione...</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.trade_name || c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Data Limite</label>
                  <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={creating || !newTitle}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  <Plus size={16} />
                  {creating ? "Criando..." : "Criar Tarefa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-background-primary border border-border rounded-xl w-full max-w-lg mx-4 shadow-lg">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground-primary">{selectedTask.title}</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-1.5 text-foreground-tertiary hover:text-foreground-primary rounded-lg hover:bg-background-tertiary">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[selectedTask.priority] || ""}`}>
                  {PRIORITY_LABELS[selectedTask.priority] || selectedTask.priority}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedTask.status] || ""}`}>
                  {COLUMNS.find((c) => c.value === selectedTask.status)?.label || selectedTask.status}
                </span>
              </div>
              {selectedTask.description && (
                <div>
                  <label className="block text-xs font-medium text-foreground-tertiary mb-1">Descricao</label>
                  <p className="text-sm text-foreground-primary whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-foreground-tertiary text-xs">Responsavel</span>
                  <p className="text-foreground-primary font-medium">{selectedTask.assigned_name || "Nao atribuido"}</p>
                </div>
                <div>
                  <span className="text-foreground-tertiary text-xs">Cliente</span>
                  <p className="text-foreground-primary font-medium">{selectedTask.client_name || "—"}</p>
                </div>
                {selectedTask.due_date && (
                  <div>
                    <span className="text-foreground-tertiary text-xs">Data Limite</span>
                    <p className={`font-medium ${new Date(selectedTask.due_date) < new Date() ? "text-red-500" : "text-foreground-primary"}`}>
                      {formatDate(selectedTask.due_date)}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-foreground-tertiary text-xs">Criado em</span>
                  <p className="text-foreground-primary font-medium">{formatDate(selectedTask.created_at)}</p>
                </div>
              </div>
              {/* Move buttons */}
              <div className="flex gap-2 pt-2">
                {COLUMNS.map((col) => (
                  <button
                    key={col.value}
                    onClick={async () => {
                      if (col.value === selectedTask.status) return;
                      try {
                        await api.put(`/tasks/${selectedTask.id}`, { status: col.value, position: 0 });
                        setShowDetailModal(false);
                        fetchTasks();
                      } catch {}
                    }}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                      col.value === selectedTask.status
                        ? "bg-brand-primary text-white"
                        : "bg-background-tertiary text-foreground-secondary hover:bg-background-tertiary/80"
                    }`}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
