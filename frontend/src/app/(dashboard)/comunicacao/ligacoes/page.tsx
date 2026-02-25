"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  Phone,
  Plus,
  CheckCircle2,
  Clock,
  X,
  Users,
} from "lucide-react";
import api from "@/lib/api";

interface CallRecord {
  id: string;
  channel: string;
  status: string;
  subject: string | null;
  body: string | null;
  sender: string | null;
  client_id: string | null;
  client_name: string | null;
  received_at: string;
}

interface ClientItem {
  id: string;
  company_name: string;
  trade_name: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "Novo", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
  in_progress: { label: "Em andamento", color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30" },
  replied: { label: "Resolvido", color: "text-green-600 bg-green-100 dark:bg-green-900/30" },
  archived: { label: "Arquivado", color: "text-gray-500 bg-gray-100 dark:bg-gray-900/30" },
};

export default function LigacoesPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  // Form
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [clientId, setClientId] = useState("");
  const [duration, setDuration] = useState("");
  const [createTask, setCreateTask] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const [callsRes, clientsRes] = await Promise.all([
        api.get("/comunicacao/inbox?channel=phone"),
        api.get("/clients"),
      ]);
      setCalls(callsRes.data.items || []);
      const cList = Array.isArray(clientsRes.data) ? clientsRes.data : clientsRes.data.items || [];
      setClients(cList);
    } catch { /* graceful */ }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const bodyText = [
        body,
        duration ? `Duração: ~${duration} min` : "",
      ].filter(Boolean).join("\n");

      await api.post("/comunicacao/inbox", {
        channel: "phone",
        subject: subject || `Ligação ${sender ? "de " + sender : ""}`,
        body: bodyText || null,
        sender: sender || null,
        client_id: clientId || null,
      });

      if (createTask && subject) {
        await api.post("/tasks", {
          title: `[Ligação] ${subject}`,
          description: bodyText || undefined,
          priority: "medium",
          client_id: clientId || undefined,
        });
      }

      setCreated(true);
      setSender("");
      setSubject("");
      setBody("");
      setClientId("");
      setDuration("");
      setCreateTask(false);

      setTimeout(() => {
        setShowModal(false);
        setCreated(false);
        fetchData();
      }, 1500);
    } catch { /* error */ }
    finally { setCreating(false); }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await api.patch(`/comunicacao/inbox/${id}`, { status });
      fetchData();
    } catch { /* error */ }
  }

  const inputClass = "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";

  if (loading) {
    return (
      <PageWrapper
        title="Registro de Ligações"
        breadcrumb={[{ label: "Comunicação", href: "/comunicacao" }, { label: "Registro Ligações" }]}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Registro de Ligações"
      breadcrumb={[{ label: "Comunicação", href: "/comunicacao" }, { label: "Registro Ligações" }]}
      actions={
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus size={16} /> Registrar Ligação
        </button>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = calls.filter((c) => c.status === key).length;
          return (
            <div key={key} className="p-3 rounded-xl border border-border bg-background-primary">
              <div className="flex items-center gap-2 mb-1">
                <Phone size={14} className={cfg.color.split(" ")[0]} />
                <span className="text-lg font-bold text-foreground-primary">{count}</span>
              </div>
              <p className="text-[11px] text-foreground-tertiary">{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Call list */}
      {calls.length === 0 ? (
        <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
          <Phone size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-40" />
          <p className="text-sm text-foreground-tertiary mb-1">Nenhuma ligação registrada</p>
          <p className="text-xs text-foreground-tertiary">
            Registre ligações telefônicas com resumo e crie tarefas automaticamente.
          </p>
        </div>
      ) : (
        <div className="bg-background-primary border border-border rounded-xl">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground-primary">Ligações ({calls.length})</h3>
          </div>
          <div className="divide-y divide-border/50">
            {calls.map((call) => {
              const statusCfg = STATUS_CONFIG[call.status] || STATUS_CONFIG.new;
              return (
                <div key={call.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg shrink-0">
                      <Phone size={16} className="text-purple-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground-primary">
                        {call.subject || "Ligação sem assunto"}
                      </p>
                      {call.sender && (
                        <p className="text-xs text-foreground-tertiary mt-0.5">De: {call.sender}</p>
                      )}
                      {call.client_name && (
                        <p className="text-xs text-foreground-tertiary">Cliente: {call.client_name}</p>
                      )}
                      {call.body && (
                        <p className="text-xs text-foreground-secondary mt-1 line-clamp-2">{call.body}</p>
                      )}
                      <p className="text-[10px] text-foreground-tertiary mt-1">
                        {new Date(call.received_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                    {call.status === "new" && (
                      <button
                        onClick={() => updateStatus(call.id, "replied")}
                        className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                        title="Marcar como resolvido"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Register Call Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-background-primary border border-border rounded-xl w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground-primary">Registrar Ligação</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-foreground-tertiary hover:text-foreground-primary rounded-lg">
                <X size={18} />
              </button>
            </div>

            {created ? (
              <div className="p-8 text-center">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                <p className="text-sm font-medium text-foreground-primary">Ligação registrada!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Contato / Remetente</label>
                  <input type="text" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="Nome ou telefone" className={inputClass} />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground-secondary mb-1.5">
                    <Users size={14} /> Cliente
                  </label>
                  <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputClass}>
                    <option value="">Sem cliente</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.trade_name || c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Assunto</label>
                  <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Motivo da ligação" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-foreground-secondary mb-1.5">
                      <Clock size={14} /> Duração (min)
                    </label>
                    <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ex: 15" className={inputClass} />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={createTask} onChange={(e) => setCreateTask(e.target.checked)} className="rounded border-border" />
                      <span className="text-sm text-foreground-secondary">Criar tarefa</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Resumo da Conversa</label>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Pontos discutidos, ações necessárias..." rows={3} className="w-full px-3 py-2 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm resize-none" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary">Cancelar</button>
                  <button type="submit" disabled={creating} className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                    {creating ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
                    {creating ? "Salvando..." : "Registrar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
