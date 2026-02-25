"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  Calendar,
  Clock,
  Users,
  Video,
  FileText,
  CheckCircle2,
} from "lucide-react";
import api from "@/lib/api";

interface ClientItem {
  id: string;
  company_name: string;
  trade_name: string | null;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
}

export default function AgendarPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const [clientsRes, usersRes] = await Promise.all([
          api.get("/clients"),
          api.get("/users"),
        ]);
        const cList = Array.isArray(clientsRes.data) ? clientsRes.data : clientsRes.data.items || [];
        setClients(cList);
        const uList = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.items || [];
        setUsers(uList);

        // Default date = tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setStartDate(tomorrow.toISOString().split("T")[0]);
      } catch { /* graceful */ }
      finally { setLoading(false); }
    }
    init();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !startDate || !startTime) return;

    setCreating(true);
    try {
      const start = new Date(`${startDate}T${startTime}:00`);
      const end = new Date(start.getTime() + parseInt(duration) * 60000);

      await api.post("/calendar", {
        title,
        description: description || undefined,
        type: "meeting",
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        all_day: false,
        client_id: clientId || undefined,
        assigned_user_id: assignedUserId || undefined,
        location: meetingLink || undefined,
      });

      setCreated(true);
    } catch {
      // error
    } finally {
      setCreating(false);
    }
  }

  const inputClass = "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";

  if (loading) {
    return (
      <PageWrapper
        title="Agendar Reunião"
        breadcrumb={[{ label: "Calendário", href: "/calendar" }, { label: "Agendar" }]}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </PageWrapper>
    );
  }

  if (created) {
    return (
      <PageWrapper
        title="Agendar Reunião"
        breadcrumb={[{ label: "Calendário", href: "/calendar" }, { label: "Agendar" }]}
      >
        <div className="max-w-lg mx-auto bg-background-primary border border-border rounded-xl p-8 text-center">
          <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-lg font-semibold text-foreground-primary mb-2">Reunião agendada!</h2>
          <p className="text-sm text-foreground-tertiary mb-6">
            A reunião &quot;{title}&quot; foi criada no calendário.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push("/calendar")}
              className="px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
            >
              Ver no Calendário
            </button>
            <button
              onClick={() => { setCreated(false); setTitle(""); setDescription(""); }}
              className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-secondary"
            >
              Agendar outra
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Agendar Reunião"
      breadcrumb={[{ label: "Calendário", href: "/calendar" }, { label: "Agendar" }]}
    >
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-background-primary border border-border rounded-xl">
          <div className="p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                Título da Reunião *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Kickoff com cliente, Apresentação de resultados..."
                className={inputClass}
                required
              />
            </div>

            {/* Client */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground-secondary mb-1.5">
                <Users size={14} />
                Cliente
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={inputClass}
              >
                <option value="">Sem cliente específico</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.trade_name || c.company_name}</option>
                ))}
              </select>
            </div>

            {/* Participant */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground-secondary mb-1.5">
                <Users size={14} />
                Participante Responsável
              </label>
              <select
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                className={inputClass}
              >
                <option value="">Nenhum</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground-secondary mb-1.5">
                  <Calendar size={14} />
                  Data *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground-secondary mb-1.5">
                  <Clock size={14} />
                  Horário *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">
                  Duração
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={inputClass}
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 hora</option>
                  <option value="90">1h30</option>
                  <option value="120">2 horas</option>
                </select>
              </div>
            </div>

            {/* Meeting Link */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground-secondary mb-1.5">
                <Video size={14} />
                Link da Videoconferência
              </label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/... ou https://teams.microsoft.com/..."
                className={inputClass}
              />
            </div>

            {/* Description */}
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground-secondary mb-1.5">
                <FileText size={14} />
                Pauta / Observações
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Pontos a discutir, notas preparatórias..."
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-background-secondary/50 rounded-b-xl">
            <button
              type="button"
              onClick={() => router.push("/calendar")}
              className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating || !title}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Calendar size={16} />
              )}
              {creating ? "Agendando..." : "Agendar Reunião"}
            </button>
          </div>
        </form>
      </div>
    </PageWrapper>
  );
}
