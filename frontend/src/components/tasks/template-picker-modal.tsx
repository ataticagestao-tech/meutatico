"use client";

import { useEffect, useState } from "react";
import {
  X,
  Loader2,
  FileText,
  Play,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "@/lib/api";
import type { Client } from "@/types/client";
import type { UserType } from "@/types/user";

interface TaskConfig {
  title: string;
  description?: string;
  priority: string;
  category?: string;
  relative_due_days?: number;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string | null;
  tasks_config: TaskConfig[];
  is_active: boolean;
}

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserType[];
  clients: Client[];
  onApplied: () => void;
}

const selectClass =
  "h-10 px-2.5 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary w-full";
const labelClass = "block text-sm font-medium text-foreground-secondary mb-1.5";

const TRIGGER_LABELS: Record<string, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  on_demand: "Sob Demanda",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

export function TemplatePickerModal({
  isOpen,
  onClose,
  users,
  clients,
  onApplied,
}: TemplatePickerModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    loadTemplates();
  }, [isOpen]);

  async function loadTemplates() {
    setLoading(true);
    try {
      const { data } = await api.get("/tasks/templates/list");
      setTemplates(data ?? []);
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await api.post("/tasks/templates/seed");
      await loadTemplates();
    } catch (err) {
      console.error("Failed to seed templates:", err);
    } finally {
      setSeeding(false);
    }
  }

  async function handleApply() {
    if (!selectedTemplate) return;
    setApplying(true);
    try {
      await api.post(`/tasks/templates/${selectedTemplate.id}/apply`, {
        client_id: clientId || null,
        assigned_user_id: assignedUserId || null,
      });
      onClose();
      onApplied();
    } catch (err) {
      console.error("Failed to apply template:", err);
    } finally {
      setApplying(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background-primary border border-border rounded-xl w-full max-w-2xl mx-4 shadow-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-foreground-primary flex items-center gap-2">
            <FileText size={20} />
            Templates de Tarefas
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-foreground-tertiary hover:text-foreground-primary rounded-lg hover:bg-background-tertiary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-brand-primary" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-10">
              <FileText
                size={48}
                className="mx-auto mb-3 text-foreground-tertiary opacity-50"
              />
              <p className="text-foreground-secondary mb-1">
                Nenhum template encontrado
              </p>
              <p className="text-sm text-foreground-tertiary mb-4">
                Crie os 7 templates padrão para começar
              </p>
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {seeding ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                {seeding ? "Criando..." : "Criar Templates Padrão"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Template list */}
              <div className="space-y-2">
                {templates.map((tmpl) => {
                  const isSelected = selectedTemplate?.id === tmpl.id;
                  const isExpanded = expandedId === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      className={`border rounded-lg transition-colors ${
                        isSelected
                          ? "border-brand-primary bg-brand-primary/5"
                          : "border-border hover:border-foreground-tertiary"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTemplate(isSelected ? null : tmpl);
                          setExpandedId(isExpanded ? null : tmpl.id);
                        }}
                        className="w-full flex items-center gap-3 p-3 text-left"
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                            isSelected
                              ? "border-brand-primary bg-brand-primary"
                              : "border-foreground-tertiary"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground-primary">
                            {tmpl.name}
                          </p>
                          <p className="text-xs text-foreground-tertiary truncate">
                            {tmpl.description}
                          </p>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-background-tertiary text-foreground-secondary">
                          {TRIGGER_LABELS[tmpl.trigger_event || ""] ||
                            tmpl.trigger_event}
                        </span>
                        <span className="text-xs text-foreground-tertiary">
                          {tmpl.tasks_config.length} tarefas
                        </span>
                        {isExpanded ? (
                          <ChevronUp size={14} className="text-foreground-tertiary" />
                        ) : (
                          <ChevronDown size={14} className="text-foreground-tertiary" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0">
                          <div className="border-t border-border pt-2 space-y-1.5">
                            {tmpl.tasks_config.map((task, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-2 text-xs text-foreground-secondary"
                              >
                                <span className="w-5 h-5 rounded bg-background-tertiary flex items-center justify-center text-[10px] font-medium shrink-0">
                                  {i + 1}
                                </span>
                                <span className="flex-1 truncate">
                                  {task.title}
                                </span>
                                <span className="text-foreground-tertiary">
                                  {PRIORITY_LABELS[task.priority] || task.priority}
                                </span>
                                {task.relative_due_days && (
                                  <span className="text-foreground-tertiary">
                                    +{task.relative_due_days}d
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Apply options */}
              {selectedTemplate && (
                <div className="border border-border rounded-lg p-4 space-y-3 bg-background-secondary">
                  <p className="text-sm font-medium text-foreground-primary">
                    Configurar aplicação
                  </p>
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
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {templates.length > 0 && (
          <div className="flex justify-end gap-3 p-5 border-t border-border shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              disabled={applying || !selectedTemplate}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {applying ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Play size={16} />
              )}
              {applying
                ? "Aplicando..."
                : `Aplicar Template (${selectedTemplate?.tasks_config.length || 0} tarefas)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
