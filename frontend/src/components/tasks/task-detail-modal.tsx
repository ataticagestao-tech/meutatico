"use client";

import { useState, useEffect } from "react";
import { X, Pencil, Trash2, Save, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  TASK_STATUSES,
  TICKET_PRIORITIES,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from "@/lib/constants";
import api from "@/lib/api";
import type { Task } from "@/types/task";
import type { Client } from "@/types/client";
import type { UserType } from "@/types/user";

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  users: UserType[];
  clients: Client[];
  onUpdated: () => void;
  onDeleted: () => void;
}

const inputClass =
  "w-full h-9 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";
const selectClass =
  "h-9 px-2.5 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary w-full";
const labelClass =
  "block text-xs font-medium text-foreground-tertiary mb-1";

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  users,
  clients,
  onUpdated,
  onDeleted,
}: TaskDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Edit form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority);
      setAssignedUserId(task.assigned_user_id || "");
      setClientId(task.client_id || "");
      setDueDate(task.due_date ? task.due_date.split("T")[0] : "");
      setCategory(task.category || "");
      setEditing(false);
      setConfirmDelete(false);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const statusLabel =
    TASK_STATUSES.find((s) => s.value === task.status)?.label || task.status;
  const priorityLabel =
    TICKET_PRIORITIES.find((p) => p.value === task.priority)?.label ||
    task.priority;

  async function handleSave() {
    setSaving(true);
    try {
      await api.put(`/tasks/${task!.id}`, {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        assigned_user_id: assignedUserId || null,
        client_id: clientId || null,
        due_date: dueDate || null,
        category: category.trim() || null,
      });
      setEditing(false);
      onUpdated();
    } catch (err) {
      console.error("Failed to update task:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeStatus(newStatus: string) {
    if (newStatus === task!.status) return;
    try {
      await api.patch(`/tasks/${task!.id}/move`, {
        status: newStatus,
        position: 0,
      });
      onUpdated();
      onClose();
    } catch (err) {
      console.error("Failed to move task:", err);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/tasks/${task!.id}`);
      onClose();
      onDeleted();
    } catch (err) {
      console.error("Failed to delete task:", err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background-primary border border-border rounded-xl w-full max-w-lg mx-4 shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          {editing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold text-foreground-primary bg-transparent border-b-2 border-brand-primary focus:outline-none flex-1 mr-3"
            />
          ) : (
            <h2 className="text-lg font-semibold text-foreground-primary flex-1 mr-3">
              {task.title}
            </h2>
          )}
          <div className="flex items-center gap-1">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 text-foreground-tertiary hover:text-brand-primary rounded-lg hover:bg-brand-primary/10 transition-colors"
                title="Editar"
              >
                <Pencil size={16} />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="p-1.5 text-green-600 hover:text-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                title="Salvar"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-foreground-tertiary hover:text-foreground-primary rounded-lg hover:bg-background-tertiary"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                PRIORITY_COLORS[task.priority] || ""
              }`}
            >
              {priorityLabel}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                STATUS_COLORS[task.status] || ""
              }`}
            >
              {statusLabel}
            </span>
            {task.category && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-background-tertiary text-foreground-secondary">
                {task.category}
              </span>
            )}
          </div>

          {/* Content */}
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Descrição da tarefa..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Prioridade</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className={selectClass}
                  >
                    {TICKET_PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Responsável</label>
                  <select
                    value={assignedUserId}
                    onChange={(e) => setAssignedUserId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Nenhum</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Cliente</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Nenhum</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.trade_name || c.company_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Data Limite</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Categoria</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Fiscal, Contábil..."
                  className={inputClass}
                />
              </div>
            </div>
          ) : (
            <>
              {task.description && (
                <div>
                  <label className={labelClass}>Descrição</label>
                  <p className="text-sm text-foreground-primary whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className={labelClass}>Responsável</span>
                  <p className="text-foreground-primary font-medium">
                    {task.assigned_user_name || "Não atribuído"}
                  </p>
                </div>
                <div>
                  <span className={labelClass}>Cliente</span>
                  <p className="text-foreground-primary font-medium">
                    {task.client_name || "—"}
                  </p>
                </div>
                {task.due_date && (
                  <div>
                    <span className={labelClass}>Data Limite</span>
                    <p
                      className={`font-medium ${
                        new Date(task.due_date) < new Date()
                          ? "text-red-500"
                          : "text-foreground-primary"
                      }`}
                    >
                      {formatDate(task.due_date)}
                    </p>
                  </div>
                )}
                <div>
                  <span className={labelClass}>Criado em</span>
                  <p className="text-foreground-primary font-medium">
                    {formatDate(task.created_at)}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Status buttons */}
          <div className="flex gap-2 pt-2">
            {TASK_STATUSES.map((col) => (
              <button
                key={col.value}
                onClick={() => handleChangeStatus(col.value)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                  col.value === task.status
                    ? "bg-brand-primary text-white"
                    : "bg-background-tertiary text-foreground-secondary hover:bg-background-tertiary/80"
                }`}
              >
                {col.label}
              </button>
            ))}
          </div>

          {/* Delete */}
          <div className="border-t border-border pt-3">
            {confirmDelete ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-500 font-medium">
                  Excluir esta tarefa?
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 text-xs border border-border rounded-lg text-foreground-secondary hover:bg-background-tertiary"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    {deleting ? "Excluindo..." : "Confirmar"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
              >
                <Trash2 size={14} />
                Excluir tarefa
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
