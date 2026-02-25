"use client";

import { useState } from "react";
import {
  X,
  Calendar,
  CheckSquare,
  Ticket,
  ExternalLink,
  Trash2,
  Save,
  Clock,
  User,
  Building2,
  MapPin,
  Video,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "@/lib/api";
import {
  CALENDAR_SOURCE_COLORS,
  CALENDAR_SOURCE_LABELS,
  CALENDAR_EVENT_TYPES,
  STATUS_COLORS,
  PRIORITY_COLORS,
} from "@/lib/constants";
import type { CalendarItem } from "@/types/calendar";

interface CalendarDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CalendarItem | null;
  users: { id: string; name: string }[];
  clients: { id: string; trade_name?: string; company_name: string }[];
  onUpdated: () => void;
}

const inputClass =
  "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";
const selectClass =
  "h-10 px-2.5 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary w-full";
const labelClass = "block text-sm font-medium text-foreground-secondary mb-1.5";

const SOURCE_ICONS = {
  task: CheckSquare,
  ticket: Ticket,
  event: Calendar,
};

export function CalendarDetailModal({
  isOpen,
  onClose,
  item,
  users,
  clients,
  onUpdated,
}: CalendarDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit state for events
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("meeting");
  const [editStartDate, setEditStartDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editAllDay, setEditAllDay] = useState(false);
  const [editLocation, setEditLocation] = useState("");
  const [editAssignedUserId, setEditAssignedUserId] = useState("");
  const [editClientId, setEditClientId] = useState("");

  if (!isOpen || !item) return null;

  const Icon = SOURCE_ICONS[item.source_type] || Calendar;

  function startEditing() {
    setEditTitle(item!.title);
    setEditDescription(item!.description || "");
    const start = parseISO(item!.start_date);
    const end = parseISO(item!.end_date);
    setEditStartDate(format(start, "yyyy-MM-dd"));
    setEditStartTime(format(start, "HH:mm"));
    setEditEndDate(format(end, "yyyy-MM-dd"));
    setEditEndTime(format(end, "HH:mm"));
    setEditAllDay(item!.all_day);
    setEditLocation(item!.location || "");
    setEditAssignedUserId(item!.assigned_user_id || "");
    setEditClientId(item!.client_id || "");
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const start = editAllDay
        ? `${editStartDate}T00:00:00`
        : `${editStartDate}T${editStartTime}:00`;
      const end = editAllDay
        ? `${editEndDate}T23:59:59`
        : `${editEndDate}T${editEndTime}:00`;

      await api.put(`/calendar/${item!.id}`, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        type: editType,
        start_date: start,
        end_date: end,
        all_day: editAllDay,
        location: editLocation.trim() || undefined,
        assigned_user_id: editAssignedUserId || undefined,
        client_id: editClientId || undefined,
      });
      setEditing(false);
      onUpdated();
    } catch (err) {
      console.error("Failed to update:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;
    setDeleting(true);
    try {
      await api.delete(`/calendar/${item!.id}`);
      onClose();
      onUpdated();
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeleting(false);
    }
  }

  // Read-only view for tasks and tickets
  if (item.source_type !== "event") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-background-primary border border-border rounded-xl w-full max-w-md mx-4 shadow-lg">
          {/* Header */}
          <div
            className={`flex items-center gap-3 p-5 rounded-t-xl ${CALENDAR_SOURCE_COLORS[item.source_type]} text-white`}
          >
            <Icon size={20} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium opacity-80 uppercase">
                {CALENDAR_SOURCE_LABELS[item.source_type]}
              </div>
              <h2 className="text-lg font-semibold truncate">{item.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {item.description && (
              <p className="text-sm text-foreground-secondary">
                {item.description}
              </p>
            )}

            <div className="space-y-3">
              {/* Date */}
              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className="text-foreground-tertiary" />
                <span className="text-foreground-secondary">
                  {format(parseISO(item.start_date), "dd 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </span>
              </div>

              {/* Status & Priority */}
              <div className="flex items-center gap-2">
                {item.status && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || ""}`}
                  >
                    {item.status}
                  </span>
                )}
                {item.priority && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[item.priority] || ""}`}
                  >
                    {item.priority}
                  </span>
                )}
              </div>

              {/* Assigned user */}
              {item.assigned_user_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User size={16} className="text-foreground-tertiary" />
                  <span className="text-foreground-secondary">
                    {item.assigned_user_name}
                  </span>
                </div>
              )}

              {/* Client */}
              {item.client_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 size={16} className="text-foreground-tertiary" />
                  <span className="text-foreground-secondary">
                    {item.client_name}
                  </span>
                </div>
              )}
            </div>

            {/* Action */}
            <div className="flex justify-end pt-2">
              <a
                href={
                  item.source_type === "task"
                    ? "/tasks"
                    : `/tickets/${item.id}`
                }
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
              >
                <ExternalLink size={16} />
                Abrir{" "}
                {item.source_type === "task" ? "Tarefas" : "Solicitacao"}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Editable view for calendar events
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background-primary border border-border rounded-xl w-full max-w-lg mx-4 shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 rounded-t-xl bg-violet-500 text-white">
          <Calendar size={20} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium opacity-80 uppercase">
                Evento
              </span>
              {item.sync_source === "google" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-medium">
                  Google
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold truncate">{item.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </div>

        {editing ? (
          /* Edit form */
          <div className="p-5 space-y-4">
            <div>
              <label className={labelClass}>Titulo *</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Descricao</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tipo</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className={selectClass}
                >
                  {CALENDAR_EVENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer h-10">
                  <input
                    type="checkbox"
                    checked={editAllDay}
                    onChange={(e) => setEditAllDay(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-brand-primary focus:ring-brand-primary"
                  />
                  <span className="text-sm text-foreground-secondary">
                    Dia inteiro
                  </span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Inicio</label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              {!editAllDay && (
                <div>
                  <label className={labelClass}>Hora inicio</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Fim</label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              {!editAllDay && (
                <div>
                  <label className={labelClass}>Hora fim</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
            </div>
            {/* Location */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground-secondary mb-1.5">
                <MapPin size={14} />
                Local
              </label>
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="Sala de reunião, endereço..."
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Responsavel</label>
                <select
                  value={editAssignedUserId}
                  onChange={(e) => setEditAssignedUserId(e.target.value)}
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
              <div>
                <label className={labelClass}>Cliente</label>
                <select
                  value={editClientId}
                  onChange={(e) => setEditClientId(e.target.value)}
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
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editTitle.trim()}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        ) : (
          /* Read view */
          <div className="p-5 space-y-4">
            {item.description && (
              <p className="text-sm text-foreground-secondary">
                {item.description}
              </p>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock size={16} className="text-foreground-tertiary" />
                <span className="text-foreground-secondary">
                  {item.all_day
                    ? format(parseISO(item.start_date), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })
                    : `${format(parseISO(item.start_date), "dd/MM/yyyy HH:mm")} - ${format(parseISO(item.end_date), "HH:mm")}`}
                </span>
              </div>

              {item.assigned_user_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User size={16} className="text-foreground-tertiary" />
                  <span className="text-foreground-secondary">
                    {item.assigned_user_name}
                  </span>
                </div>
              )}

              {item.client_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 size={16} className="text-foreground-tertiary" />
                  <span className="text-foreground-secondary">
                    {item.client_name}
                  </span>
                </div>
              )}

              {item.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin size={16} className="text-foreground-tertiary" />
                  <span className="text-foreground-secondary">
                    {item.location}
                  </span>
                </div>
              )}

              {item.meet_link && (
                <div className="flex items-center gap-2 text-sm">
                  <Video size={16} className="text-blue-500" />
                  <a
                    href={item.meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Entrar na reunião (Google Meet)
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 disabled:opacity-50"
              >
                <Trash2 size={16} />
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
              <button
                onClick={startEditing}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
              >
                Editar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
