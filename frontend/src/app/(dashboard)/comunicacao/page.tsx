"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  Mail,
  Phone,
  MessageSquare,
  Instagram,
  Inbox,
  CheckCircle2,
  Clock,
  MessageCircle,
  Archive,
  Plus,
  X,
  Filter,
} from "lucide-react";
import api from "@/lib/api";

interface InboxItem {
  id: string;
  channel: string;
  status: string;
  subject: string | null;
  body: string | null;
  sender: string | null;
  sender_email: string | null;
  client_id: string | null;
  client_name: string | null;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  task_id: string | null;
  received_at: string;
}

const CHANNEL_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  email: { icon: Mail, label: "Email", color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" },
  whatsapp: { icon: MessageSquare, label: "WhatsApp", color: "text-green-500 bg-green-50 dark:bg-green-900/20" },
  phone: { icon: Phone, label: "Ligação", color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20" },
  instagram: { icon: Instagram, label: "Instagram", color: "text-pink-500 bg-pink-50 dark:bg-pink-900/20" },
  manual: { icon: MessageCircle, label: "Manual", color: "text-gray-500 bg-gray-50 dark:bg-gray-900/20" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: "Novo", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30", icon: Inbox },
  in_progress: { label: "Em andamento", color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30", icon: Clock },
  replied: { label: "Respondido", color: "text-green-600 bg-green-100 dark:bg-green-900/30", icon: CheckCircle2 },
  archived: { label: "Arquivado", color: "text-gray-500 bg-gray-100 dark:bg-gray-900/30", icon: Archive },
};

export default function ComunicacaoPage() {
  const [messages, setMessages] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterChannel, setFilterChannel] = useState<string>("");
  const [selectedMsg, setSelectedMsg] = useState<InboxItem | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const [newChannel, setNewChannel] = useState("phone");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newSender, setNewSender] = useState("");
  const [creating, setCreating] = useState(false);

  async function fetchInbox() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterChannel) params.set("channel", filterChannel);
      const { data } = await api.get(`/comunicacao/inbox?${params.toString()}`);
      setMessages(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchInbox(); }, [filterStatus, filterChannel]);

  async function updateStatus(msgId: string, status: string) {
    setUpdating(msgId);
    try {
      await api.patch(`/comunicacao/inbox/${msgId}`, { status });
      fetchInbox();
      if (selectedMsg?.id === msgId) setSelectedMsg({ ...selectedMsg, status });
    } finally {
      setUpdating(null);
    }
  }

  async function handleCreateMessage(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/comunicacao/inbox", {
        channel: newChannel, subject: newSubject || null,
        body: newBody || null, sender: newSender || null,
      });
      setShowNewModal(false);
      setNewSubject(""); setNewBody(""); setNewSender("");
      fetchInbox();
    } finally { setCreating(false); }
  }

  const inputClass = "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm";

  return (
    <PageWrapper
      title="Comunicação"
      breadcrumb={[{ label: "Comunicação" }]}
      actions={
        <button onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90">
          <Plus size={16} /> Registrar Interação
        </button>
      }
    >
      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = messages.filter((m) => m.status === key).length;
          const StatusIcon = cfg.icon;
          return (
            <button key={key}
              onClick={() => setFilterStatus(filterStatus === key ? "" : key)}
              className={`p-3 rounded-xl border transition-colors text-left ${
                filterStatus === key ? "border-brand-primary bg-brand-primary/5" : "border-border bg-background-primary hover:bg-background-secondary"
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <StatusIcon size={14} className={cfg.color.split(" ")[0]} />
                <span className="text-lg font-bold text-foreground-primary">{count}</span>
              </div>
              <p className="text-[11px] text-foreground-tertiary">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Channel filters */}
      <div className="flex items-center gap-2 mb-4">
        <Filter size={14} className="text-foreground-tertiary" />
        <button onClick={() => setFilterChannel("")}
          className={`px-2 py-1 rounded text-xs ${!filterChannel ? "bg-brand-primary text-white" : "bg-background-secondary text-foreground-secondary"}`}>
          Todos
        </button>
        {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilterChannel(filterChannel === key ? "" : key)}
            className={`px-2 py-1 rounded text-xs ${filterChannel === key ? "bg-brand-primary text-white" : "bg-background-secondary text-foreground-secondary"}`}>
            {cfg.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-1">
            <div className="bg-background-primary border border-border rounded-xl">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground-primary">Mensagens ({total})</h3>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="p-8 text-center">
                    <Inbox size={32} className="mx-auto mb-2 text-foreground-tertiary opacity-50" />
                    <p className="text-sm text-foreground-tertiary">Nenhuma mensagem</p>
                  </div>
                ) : messages.map((msg) => {
                  const channel = CHANNEL_CONFIG[msg.channel] || CHANNEL_CONFIG.manual;
                  const ChannelIcon = channel.icon;
                  const statusCfg = STATUS_CONFIG[msg.status] || STATUS_CONFIG.new;
                  return (
                    <button key={msg.id} onClick={() => setSelectedMsg(msg)}
                      className={`w-full text-left p-3.5 border-b border-border/50 hover:bg-background-secondary transition-colors ${
                        selectedMsg?.id === msg.id ? "bg-background-secondary" : ""
                      } ${msg.status === "new" ? "border-l-2 border-l-blue-500" : ""}`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`p-1.5 rounded-lg shrink-0 ${channel.color}`}>
                          <ChannelIcon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-sm font-medium text-foreground-primary truncate">
                              {msg.subject || msg.sender || "Sem assunto"}
                            </p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${statusCfg.color}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                          {msg.client_name && <p className="text-[10px] text-foreground-tertiary">{msg.client_name}</p>}
                          <p className="text-[10px] text-foreground-tertiary mt-0.5">
                            {new Date(msg.received_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detail */}
          <div className="lg:col-span-2">
            {!selectedMsg ? (
              <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
                <Inbox size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-40" />
                <p className="text-sm text-foreground-tertiary">Selecione uma mensagem para ver os detalhes</p>
              </div>
            ) : (
              <div className="bg-background-primary border border-border rounded-xl">
                <div className="p-5 border-b border-border">
                  <h3 className="text-lg font-semibold text-foreground-primary">{selectedMsg.subject || "Sem assunto"}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {(() => {
                      const ch = CHANNEL_CONFIG[selectedMsg.channel] || CHANNEL_CONFIG.manual;
                      const ChIcon = ch.icon;
                      return <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${ch.color}`}><ChIcon size={12} />{ch.label}</span>;
                    })()}
                    {selectedMsg.sender && <span className="text-xs text-foreground-tertiary">de {selectedMsg.sender}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {["new", "in_progress", "replied", "archived"].map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      return (
                        <button key={s} onClick={() => updateStatus(selectedMsg.id, s)}
                          disabled={updating === selectedMsg.id}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            selectedMsg.status === s ? cfg.color : "bg-background-secondary text-foreground-tertiary hover:bg-background-tertiary"
                          }`}>
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="p-5">
                  {selectedMsg.body ? (
                    <div className="text-sm text-foreground-secondary whitespace-pre-wrap">{selectedMsg.body}</div>
                  ) : (
                    <p className="text-sm text-foreground-tertiary italic">Sem conteúdo</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Message Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNewModal(false)} />
          <div className="relative bg-background-primary border border-border rounded-xl w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground-primary">Registrar Interação</h2>
              <button onClick={() => setShowNewModal(false)} className="p-1.5 text-foreground-tertiary hover:text-foreground-primary rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateMessage} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Canal</label>
                <select value={newChannel} onChange={(e) => setNewChannel(e.target.value)} className={inputClass}>
                  <option value="phone">Ligação</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Remetente</label>
                <input type="text" value={newSender} onChange={(e) => setNewSender(e.target.value)} placeholder="Nome ou telefone" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Assunto</label>
                <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Assunto" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Detalhes</label>
                <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="Resumo..." rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary">Cancelar</button>
                <button type="submit" disabled={creating}
                  className="px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {creating ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
