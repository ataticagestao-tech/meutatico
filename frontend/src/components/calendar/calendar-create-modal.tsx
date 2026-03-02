"use client";

import { useState } from "react";
import { Plus, X, Calendar, CheckSquare, Ticket, MapPin, Video, Users } from "lucide-react";
import { format } from "date-fns";
import api from "@/lib/api";
import {
  TICKET_PRIORITIES,
  CALENDAR_EVENT_TYPES,
} from "@/lib/constants";
import type { CalendarSourceType } from "@/types/calendar";

interface CalendarCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate: Date;
  initialHour?: number;
  users: { id: string; name: string }[];
  clients: { id: string; trade_name?: string; company_name: string }[];
  onCreated: () => void;
}

const inputClass =
  "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";
const selectClass =
  "h-10 px-2.5 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary w-full";
const labelClass = "block text-sm font-medium text-foreground-secondary mb-1.5";

const TABS: { value: CalendarSourceType; label: string; icon: typeof Calendar }[] = [
  { value: "event", label: "Evento", icon: Calendar },
  { value: "task", label: "Tarefa", icon: CheckSquare },
  { value: "ticket", label: "Solicitacao", icon: Ticket },
];

export function CalendarCreateModal({
  isOpen,
  onClose,
  initialDate,
  initialHour,
  users,
  clients,
  onCreated,
}: CalendarCreateModalProps) {
  const [tab, setTab] = useState<CalendarSourceType>("event");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Event fields
  const [eventType, setEventType] = useState("meeting");
  const [startDate, setStartDate] = useState(
    format(initialDate, "yyyy-MM-dd")
  );
  const [startTime, setStartTime] = useState(
    initialHour != null ? `${String(initialHour).padStart(2, "0")}:00` : "09:00"
  );
  const [endTime, setEndTime] = useState(
    initialHour != null
      ? `${String(initialHour + 1).padStart(2, "0")}:00`
      : "10:00"
  );
  const [allDay, setAllDay] = useState(false);

  // Location, Meet & Attendees
  const [location, setLocation] = useState("");
  const [generateMeet, setGenerateMeet] = useState(false);
  const [attendees, setAttendees] = useState<{ email: string }[]>([]);
  const [attendeeInput, setAttendeeInput] = useState("");

  // Shared fields
  const [priority, setPriority] = useState("medium");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState(format(initialDate, "yyyy-MM-dd"));

  if (!isOpen) return null;

  function resetForm() {
    setTitle("");
    setDescription("");
    setEventType("meeting");
    setAllDay(false);
    setLocation("");
    setGenerateMeet(false);
    setAttendees([]);
    setAttendeeInput("");
    setPriority("medium");
    setAssignedUserId("");
    setClientId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);

    try {
      if (tab === "event") {
        const start = allDay
          ? `${startDate}T00:00:00`
          : `${startDate}T${startTime}:00`;
        const end = allDay
          ? `${startDate}T23:59:59`
          : `${startDate}T${endTime}:00`;

        await api.post("/calendar", {
          title: title.trim(),
          description: description.trim() || undefined,
          type: eventType,
          start_date: start,
          end_date: end,
          all_day: allDay,
          client_id: clientId || undefined,
          assigned_user_id: assignedUserId || undefined,
          location: location.trim() || undefined,
          meet_link: generateMeet ? "auto" : undefined,
          attendees: attendees.length > 0 ? attendees : undefined,
        });
      } else if (tab === "task") {
        await api.post("/tasks", {
          title: title.trim(),
          description: description.trim() || undefined,
          status: "todo",
          priority,
          due_date: `${dueDate}T23:59:59`,
          client_id: clientId || undefined,
          assigned_user_id: assignedUserId || undefined,
        });
      } else {
        await api.post("/tickets", {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          due_date: `${dueDate}T23:59:59`,
          client_id: clientId || undefined,
          assigned_user_id: assignedUserId || undefined,
        });
      }

      resetForm();
      onClose();
      onCreated();
    } catch (err) {
      console.error("Failed to create:", err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background-primary border border-border rounded-xl w-full max-w-lg mx-4 shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground-primary">
            Novo Item
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-foreground-tertiary hover:text-foreground-primary rounded-lg hover:bg-background-tertiary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
                tab === t.value
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-foreground-tertiary hover:text-foreground-secondary"
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className={labelClass}>Titulo *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                tab === "event"
                  ? "Nome do evento"
                  : tab === "task"
                    ? "Titulo da tarefa"
                    : "Titulo da solicitacao"
              }
              className={inputClass}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Descricao</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Descricao..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none"
            />
          </div>

          {/* Event-specific fields */}
          {tab === "event" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tipo</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
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
                      checked={allDay}
                      onChange={(e) => setAllDay(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-brand-primary focus:ring-brand-primary"
                    />
                    <span className="text-sm text-foreground-secondary">
                      Dia inteiro
                    </span>
                  </label>
                </div>
              </div>

              <div className={`grid ${allDay ? "grid-cols-1" : "grid-cols-3"} gap-4`}>
                <div>
                  <label className={labelClass}>Data</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                {!allDay && (
                  <>
                    <div>
                      <label className={labelClass}>Hora inicio</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Hora fim</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </>
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
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Sala de reunião, endereço..."
                  className={inputClass}
                />
              </div>

              {/* Google Meet */}
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateMeet}
                    onChange={(e) => setGenerateMeet(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-brand-primary focus:ring-brand-primary"
                  />
                  <Video size={14} className="text-foreground-tertiary" />
                  <span className="text-sm text-foreground-secondary">
                    Gerar link Google Meet
                  </span>
                </label>
              </div>

              {/* Attendees / Participantes */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground-secondary mb-1.5">
                  <Users size={14} />
                  Participantes
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={attendeeInput}
                    onChange={(e) => setAttendeeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const email = attendeeInput.trim().toLowerCase();
                        if (email && email.includes("@") && !attendees.some((a) => a.email === email)) {
                          setAttendees([...attendees, { email }]);
                          setAttendeeInput("");
                        }
                      }
                    }}
                    placeholder="email@exemplo.com"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const email = attendeeInput.trim().toLowerCase();
                      if (email && email.includes("@") && !attendees.some((a) => a.email === email)) {
                        setAttendees([...attendees, { email }]);
                        setAttendeeInput("");
                      }
                    }}
                    className="shrink-0 h-10 px-3 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {attendees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {attendees.map((a) => (
                      <span
                        key={a.email}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-background-tertiary text-foreground-secondary rounded-full"
                      >
                        {a.email}
                        <button
                          type="button"
                          onClick={() => setAttendees(attendees.filter((att) => att.email !== a.email))}
                          className="p-0.5 hover:text-red-500 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-foreground-tertiary mt-1">
                  Os participantes recebem o convite automaticamente via Google Calendar.
                </p>
              </div>
            </>
          )}

          {/* Task/Ticket fields */}
          {(tab === "task" || tab === "ticket") && (
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
                <label className={labelClass}>Data Limite</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {/* Shared fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Responsavel</label>
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
          </div>

          {/* Actions */}
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
              {creating ? "Criando..." : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
