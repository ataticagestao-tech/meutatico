"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { TASK_STATUSES, TICKET_PRIORITIES } from "@/lib/constants";
import api from "@/lib/api";
import type { TaskCreateRequest } from "@/types/task";
import type { Client } from "@/types/client";
import type { UserType } from "@/types/user";

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnStatus: string;
  users: UserType[];
  clients: Client[];
  onCreated: () => void;
}

const inputClass =
  "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";
const selectClass =
  "h-10 px-2.5 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary w-full";
const labelClass = "block text-sm font-medium text-foreground-secondary mb-1.5";

export function TaskCreateModal({
  isOpen,
  onClose,
  columnStatus,
  users,
  clients,
  onCreated,
}: TaskCreateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("");
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const columnLabel =
    TASK_STATUSES.find((c) => c.value === columnStatus)?.label || columnStatus;

  function resetForm() {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssignedUserId("");
    setClientId("");
    setDueDate("");
    setCategory("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const payload: TaskCreateRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        status: columnStatus as TaskCreateRequest["status"],
        priority: priority as TaskCreateRequest["priority"],
        category: category.trim() || undefined,
        assigned_user_id: assignedUserId || undefined,
        client_id: clientId || undefined,
        due_date: dueDate || undefined,
      };
      await api.post("/tasks", payload);
      resetForm();
      onClose();
      onCreated();
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background-primary border border-border rounded-xl w-full max-w-lg mx-4 shadow-lg">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground-primary">
            Nova Tarefa — {columnLabel}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-foreground-tertiary hover:text-foreground-primary rounded-lg hover:bg-background-tertiary"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da tarefa"
              className={inputClass}
              autoFocus
            />
          </div>
          <div>
            <label className={labelClass}>Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descreva a tarefa..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
                <option value="">Selecione...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Cliente</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={selectClass}
              >
                <option value="">Selecione...</option>
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
              placeholder="Ex: Fiscal, Contábil, RH..."
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              <Plus size={16} />
              {creating ? "Criando..." : "Criar Tarefa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
