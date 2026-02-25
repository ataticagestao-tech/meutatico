"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  Plus,
  Play,
  Trash2,
  FileText,
  CheckSquare,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import api from "@/lib/api";

interface TaskConfig {
  title: string;
  category?: string;
  priority?: string;
  description?: string;
}

interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string | null;
  tasks_config: TaskConfig[];
  is_active: boolean;
  created_at: string;
}

interface ClientItem {
  id: string;
  company_name: string;
  trade_name: string | null;
}

interface UserItem {
  id: string;
  name: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  medium: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  urgent: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showApply, setShowApply] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Create form
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTrigger, setNewTrigger] = useState("");
  const [newTasks, setNewTasks] = useState<TaskConfig[]>([{ title: "", priority: "medium" }]);
  const [creating, setCreating] = useState(false);

  // Apply form
  const [applyClientId, setApplyClientId] = useState("");
  const [applyUserId, setApplyUserId] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [tplRes, clientsRes, usersRes] = await Promise.all([
        api.get("/tasks/templates/list"),
        api.get("/clients?per_page=100").catch(() => ({ data: { items: [] } })),
        api.get("/users").catch(() => ({ data: { items: [] } })),
      ]);
      setTemplates(Array.isArray(tplRes.data) ? tplRes.data : []);
      const cl = Array.isArray(clientsRes.data) ? clientsRes.data : clientsRes.data.items || [];
      setClients(cl);
      const ul = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.items || [];
      setUsers(ul);
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }

  async function seedDefaults() {
    setSeeding(true);
    try {
      await api.post("/tasks/templates/seed");
      await loadData();
    } catch {
      // error
    } finally {
      setSeeding(false);
    }
  }

  async function createTemplate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post("/tasks/templates", {
        name: newName,
        description: newDescription || null,
        trigger_event: newTrigger || null,
        tasks_config: newTasks.filter((t) => t.title.trim()),
        is_active: true,
      });
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      setNewTrigger("");
      setNewTasks([{ title: "", priority: "medium" }]);
      await loadData();
    } catch {
      // error
    } finally {
      setCreating(false);
    }
  }

  async function applyTemplate(templateId: string) {
    setApplying(true);
    try {
      await api.post(`/tasks/templates/${templateId}/apply`, {
        client_id: applyClientId || null,
        assigned_user_id: applyUserId || null,
      });
      setShowApply(null);
      setApplyClientId("");
      setApplyUserId("");
    } catch {
      // error
    } finally {
      setApplying(false);
    }
  }

  function addTaskRow() {
    setNewTasks([...newTasks, { title: "", priority: "medium" }]);
  }

  function updateTaskRow(index: number, field: keyof TaskConfig, value: string) {
    const copy = [...newTasks];
    copy[index] = { ...copy[index], [field]: value };
    setNewTasks(copy);
  }

  function removeTaskRow(index: number) {
    setNewTasks(newTasks.filter((_, i) => i !== index));
  }

  if (loading) {
    return (
      <PageWrapper
        title="Templates de Tarefa"
        breadcrumb={[{ label: "Tarefas", href: "/tasks" }, { label: "Templates" }]}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Templates de Tarefa"
      breadcrumb={[{ label: "Tarefas", href: "/tasks" }, { label: "Templates" }]}
    >
      {/* Actions */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          Novo Template
        </button>
        {templates.length === 0 && (
          <button
            onClick={seedDefaults}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 bg-background-secondary border border-border text-foreground-primary rounded-lg text-sm font-medium hover:bg-background-tertiary transition-colors"
          >
            {seeding ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            Carregar Templates Padrão
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background-primary border border-border rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground-primary">Novo Template</h3>
              <button onClick={() => setShowCreate(false)} className="text-foreground-tertiary hover:text-foreground-primary">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground-tertiary block mb-1">Nome *</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Rotina Semanal Financeira"
                  className="w-full h-9 px-3 border border-border rounded-lg bg-background-secondary text-foreground-primary text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-tertiary block mb-1">Descrição</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background-secondary text-foreground-primary text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-tertiary block mb-1">Evento Disparador</label>
                <input
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  placeholder="Ex: inicio_semana, novo_cliente"
                  className="w-full h-9 px-3 border border-border rounded-lg bg-background-secondary text-foreground-primary text-sm"
                />
              </div>

              {/* Tasks */}
              <div>
                <label className="text-xs font-medium text-foreground-tertiary block mb-2">Tarefas do Template</label>
                <div className="space-y-2">
                  {newTasks.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={t.title}
                        onChange={(e) => updateTaskRow(i, "title", e.target.value)}
                        placeholder={`Tarefa ${i + 1}`}
                        className="flex-1 h-8 px-3 border border-border rounded-lg bg-background-secondary text-foreground-primary text-sm"
                      />
                      <select
                        value={t.priority}
                        onChange={(e) => updateTaskRow(i, "priority", e.target.value)}
                        className="h-8 px-2 border border-border rounded-lg bg-background-secondary text-foreground-primary text-xs"
                      >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                      </select>
                      {newTasks.length > 1 && (
                        <button onClick={() => removeTaskRow(i)} className="text-red-500 hover:text-red-600">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addTaskRow}
                  className="mt-2 text-xs text-brand-primary hover:underline"
                >
                  + Adicionar tarefa
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-foreground-secondary border border-border rounded-lg hover:bg-background-tertiary"
              >
                Cancelar
              </button>
              <button
                onClick={createTemplate}
                disabled={!newName.trim() || creating}
                className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {creating && <Loader2 size={14} className="animate-spin" />}
                Criar Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
          <FileText size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-40" />
          <p className="text-sm font-medium text-foreground-primary mb-1">Nenhum template criado</p>
          <p className="text-xs text-foreground-tertiary">
            Crie templates para automatizar a criação de tarefas recorrentes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-background-primary border border-border rounded-xl overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-background-secondary/50 transition-colors"
                onClick={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/10 rounded-lg">
                    <FileText size={18} className="text-brand-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground-primary">{tpl.name}</h4>
                    <p className="text-xs text-foreground-tertiary">
                      {tpl.tasks_config.length} tarefa{tpl.tasks_config.length !== 1 && "s"}
                      {tpl.trigger_event && ` — Disparador: ${tpl.trigger_event}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowApply(tpl.id);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                  >
                    <Play size={12} />
                    Aplicar
                  </button>
                  {expandedId === tpl.id ? (
                    <ChevronUp size={16} className="text-foreground-tertiary" />
                  ) : (
                    <ChevronDown size={16} className="text-foreground-tertiary" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === tpl.id && (
                <div className="px-4 pb-4 border-t border-border/50">
                  {tpl.description && (
                    <p className="text-xs text-foreground-secondary mt-3 mb-3">{tpl.description}</p>
                  )}
                  <div className="space-y-1.5">
                    {tpl.tasks_config.map((task, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-background-secondary rounded-lg">
                        <CheckSquare size={14} className="text-foreground-tertiary shrink-0" />
                        <span className="text-sm text-foreground-primary flex-1">{task.title}</span>
                        {task.priority && (
                          <span className={`text-[10px] px-2 py-0.5 rounded ${PRIORITY_COLORS[task.priority] || ""}`}>
                            {task.priority}
                          </span>
                        )}
                        {task.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                            {task.category}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply Modal */}
              {showApply === tpl.id && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="bg-background-primary border border-border rounded-xl p-6 w-full max-w-md mx-4">
                    <h3 className="text-base font-semibold text-foreground-primary mb-4">
                      Aplicar: {tpl.name}
                    </h3>
                    <p className="text-xs text-foreground-tertiary mb-4">
                      {tpl.tasks_config.length} tarefa(s) serão criadas no Kanban.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-foreground-tertiary block mb-1">
                          Cliente (opcional)
                        </label>
                        <select
                          value={applyClientId}
                          onChange={(e) => setApplyClientId(e.target.value)}
                          className="w-full h-9 px-3 border border-border rounded-lg bg-background-secondary text-foreground-primary text-sm"
                        >
                          <option value="">Nenhum cliente</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.trade_name || c.company_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground-tertiary block mb-1">
                          Responsável (opcional)
                        </label>
                        <select
                          value={applyUserId}
                          onChange={(e) => setApplyUserId(e.target.value)}
                          className="w-full h-9 px-3 border border-border rounded-lg bg-background-secondary text-foreground-primary text-sm"
                        >
                          <option value="">Não atribuir</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                      <button
                        onClick={() => { setShowApply(null); setApplyClientId(""); setApplyUserId(""); }}
                        className="px-4 py-2 text-sm text-foreground-secondary border border-border rounded-lg hover:bg-background-tertiary"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => applyTemplate(tpl.id)}
                        disabled={applying}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                      >
                        {applying ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        Criar Tarefas
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
