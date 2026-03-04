"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Bot,
  FileText,
  Image,
  Loader2,
  MessageSquare,
  Mic,
  Phone,
  Plus,
  Power,
  PowerOff,
  QrCode,
  Search,
  Send,
  Trash2,
  User,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import api from "@/lib/api";
import type {
  ChatbotRule,
  EvolutionInstanceStatus,
  WhatsAppContact,
  WhatsAppMessage,
  WhatsAppStatus,
} from "@/types/whatsapp";

type Tab = "conversas" | "conexao" | "chatbot";

const MSG_TYPE_ICONS: Record<string, React.ElementType> = {
  image: Image,
  document: FileText,
  audio: Mic,
  video: FileText,
};

export default function WhatsAppPage() {
  const [tab, setTab] = useState<Tab>("conversas");

  return (
    <PageWrapper
      title="WhatsApp"
      breadcrumb={[
        { label: "Comunicação", href: "/comunicacao" },
        { label: "WhatsApp" },
      ]}
    >
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-background-primary border border-border rounded-xl p-1">
        {([
          { key: "conversas" as Tab, label: "Conversas", icon: MessageSquare },
          { key: "conexao" as Tab, label: "Conexão", icon: QrCode },
          { key: "chatbot" as Tab, label: "Chatbot", icon: Bot },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-brand-primary text-white"
                : "text-foreground-secondary hover:bg-background-secondary"
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "conversas" && <ConversasTab />}
      {tab === "conexao" && <ConexaoTab />}
      {tab === "chatbot" && <ChatbotTab />}
    </PageWrapper>
  );
}

/* ─── Aba 1: Conversas ─── */
function ConversasTab() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<WhatsAppContact | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function fetchContacts(searchTerm?: string) {
    try {
      const params = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
      const { data } = await api.get(`/whatsapp/contacts${params}`);
      setContacts(data.items || []);
    } catch {
      setContacts([]);
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const [statusRes] = await Promise.all([
          api.get("/whatsapp/status"),
          fetchContacts(),
        ]);
        setStatus(statusRes.data);
      } catch {
        setStatus({ configured: false, connected: false, phone_number: null });
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length >= 2) {
        fetchContacts(search);
      } else if (search.length === 0) {
        fetchContacts();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  async function loadMessages(contactId: string) {
    try {
      const { data } = await api.get(`/whatsapp/messages/${encodeURIComponent(contactId)}`);
      setMessages(data.items || []);
    } catch {
      setMessages([]);
    }
  }

  async function selectContact(contact: WhatsAppContact) {
    setSelectedContact(contact);
    setLoadingMessages(true);
    await loadMessages(contact.id);
    setLoadingMessages(false);
  }

  // Auto-refresh messages every 10 seconds
  useEffect(() => {
    if (!selectedContact) return;
    const interval = setInterval(() => {
      loadMessages(selectedContact.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedContact]);

  async function handleSend() {
    if (!newMessage.trim() || !selectedContact) return;
    const phone = selectedContact.phone_number || selectedContact.id.split("@")[0];
    if (!phone) return;
    setSending(true);
    try {
      await api.post("/whatsapp/send/text", {
        phone,
        message: newMessage.trim(),
      });
      // Add message optimistically
      setMessages((prev) => [
        {
          id: Date.now().toString(),
          content: newMessage.trim(),
          from_me: true,
          message_type: "text",
          media_url: null,
          timestamp: new Date().toISOString(),
          status: "sent",
        },
        ...prev,
      ]);
      setNewMessage("");
      // Refresh messages from server after a short delay
      setTimeout(() => loadMessages(selectedContact.id), 2000);
    } catch {
      alert("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Status bar */}
      <div className="mb-4 flex items-center gap-3 p-3 bg-background-primary border border-border rounded-xl">
        {status?.connected ? (
          <div className="flex items-center gap-2 text-green-600">
            <Wifi size={16} />
            <span className="text-sm font-medium">Conectado</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-500">
            <WifiOff size={16} />
            <span className="text-sm font-medium">Desconectado</span>
          </div>
        )}
        {status?.phone_number && (
          <span className="text-xs text-foreground-tertiary">
            <Phone size={12} className="inline mr-1" />
            {status.phone_number}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-300px)]">
        {/* Contact list */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="bg-background-primary border border-border rounded-xl flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar contatos..."
                  className="w-full h-9 pl-8 pr-3 border border-border rounded-lg bg-background-secondary text-foreground-primary text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {contacts.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare size={32} className="mx-auto mb-2 text-foreground-tertiary opacity-50" />
                  <p className="text-sm text-foreground-tertiary">Nenhum contato</p>
                </div>
              ) : (
                contacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectContact(c)}
                    className={`w-full text-left p-3 border-b border-border/50 hover:bg-background-secondary transition-colors ${
                      selectedContact?.id === c.id ? "bg-background-secondary" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center shrink-0">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <User size={16} className="text-green-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground-primary truncate">
                            {c.custom_name || c.name || c.phone_number}
                          </p>
                          {(c.unread_count ?? 0) > 0 && (
                            <span className="ml-2 min-w-[18px] h-[18px] px-1 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                              {c.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-foreground-tertiary truncate">
                          {c.last_message || c.phone_number}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="lg:col-span-2">
          {!selectedContact ? (
            <div className="bg-background-primary border border-border rounded-xl h-full flex items-center justify-center">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-40" />
                <p className="text-sm text-foreground-tertiary">Selecione um contato para ver as mensagens</p>
              </div>
            </div>
          ) : (
            <div className="bg-background-primary border border-border rounded-xl h-full flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <User size={18} className="text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground-primary">
                    {selectedContact.custom_name || selectedContact.name || selectedContact.phone_number}
                  </p>
                  <p className="text-xs text-foreground-tertiary">{selectedContact.phone_number}</p>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background-secondary/30">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 size={24} className="animate-spin text-brand-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-foreground-tertiary">Sem mensagens</p>
                  </div>
                ) : (
                  [...messages].reverse().map((msg) => {
                    const MsgIcon = MSG_TYPE_ICONS[msg.message_type];
                    return (
                      <div key={msg.id} className={`flex ${msg.from_me ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[70%] rounded-xl px-3 py-2 ${
                            msg.from_me
                              ? "bg-green-100 dark:bg-green-900/30 text-foreground-primary"
                              : "bg-background-primary text-foreground-primary border border-border"
                          }`}
                        >
                          {MsgIcon && (
                            <div className="flex items-center gap-1 mb-1">
                              <MsgIcon size={12} className="text-foreground-tertiary" />
                              <span className="text-[10px] text-foreground-tertiary capitalize">{msg.message_type}</span>
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content || `[${msg.message_type}]`}</p>
                          <p className="text-[10px] text-foreground-tertiary mt-1 text-right">
                            {new Date(msg.timestamp).toLocaleString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Send message input */}
              <div className="p-3 border-t border-border flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 h-10 px-3 border border-border rounded-lg bg-background-secondary text-foreground-primary text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  className="h-10 px-4 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Aba 2: Conexão ─── */
function ConexaoTab() {
  const [status, setStatus] = useState<EvolutionInstanceStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchStatus() {
    try {
      const { data } = await api.get("/whatsapp/instance/status");
      setStatus(data);
    } catch {
      setStatus({ configured: false, status: "not_configured" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  async function handleCreateInstance() {
    setActionLoading(true);
    try {
      await api.post("/whatsapp/instance/create");
      await fetchQR();
      await fetchStatus();
    } catch {
      alert("Erro ao criar instância");
    } finally {
      setActionLoading(false);
    }
  }

  async function fetchQR() {
    try {
      const { data } = await api.get("/whatsapp/instance/qrcode");
      setQrCode(data.qr_code || null);
    } catch {
      setQrCode(null);
    }
  }

  async function handleDisconnect() {
    setActionLoading(true);
    try {
      await api.post("/whatsapp/instance/disconnect");
      setQrCode(null);
      await fetchStatus();
    } catch {
      alert("Erro ao desconectar");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  const isConnected = status?.status === "open" || status?.status === "connected";

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Status card */}
      <div className="bg-background-primary border border-border rounded-xl p-6 text-center">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
          isConnected ? "bg-green-100 dark:bg-green-900/20" : "bg-red-100 dark:bg-red-900/20"
        }`}>
          {isConnected ? (
            <Wifi size={28} className="text-green-600" />
          ) : (
            <WifiOff size={28} className="text-red-500" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-foreground-primary mb-1">
          {isConnected ? "WhatsApp Conectado" : "WhatsApp Desconectado"}
        </h3>
        <p className="text-sm text-foreground-tertiary mb-1">
          {status?.instance_name && `Instância: ${status.instance_name}`}
        </p>
        <p className="text-xs text-foreground-tertiary">
          Status: {status?.status || "desconhecido"}
        </p>

        {!status?.configured && (
          <p className="text-xs text-amber-600 mt-3">
            Configure EVOLUTION_API_URL e EVOLUTION_API_KEY no backend.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        {!isConnected && (
          <>
            <button
              onClick={handleCreateInstance}
              disabled={actionLoading || !status?.configured}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
              Criar Instância
            </button>
            <button
              onClick={fetchQR}
              disabled={actionLoading || !status?.configured}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
            >
              <QrCode size={16} />
              Gerar QR Code
            </button>
          </>
        )}
        {isConnected && (
          <button
            onClick={handleDisconnect}
            disabled={actionLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <PowerOff size={16} />}
            Desconectar
          </button>
        )}
      </div>

      {/* QR Code */}
      {qrCode && !isConnected && (
        <div className="bg-background-primary border border-border rounded-xl p-6 text-center">
          <h4 className="text-sm font-semibold text-foreground-primary mb-4">
            Escaneie o QR Code com seu WhatsApp
          </h4>
          <div className="inline-block p-4 bg-white rounded-xl">
            <img src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code" className="w-64 h-64" />
          </div>
          <p className="text-xs text-foreground-tertiary mt-4">
            Abra o WhatsApp &gt; Dispositivos conectados &gt; Conectar dispositivo
          </p>
          <button
            onClick={fetchQR}
            className="mt-3 text-xs text-brand-primary hover:underline"
          >
            Atualizar QR Code
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Aba 3: Chatbot ─── */
function ChatbotTab() {
  const [rules, setRules] = useState<ChatbotRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchRules() {
    try {
      const { data } = await api.get("/whatsapp/chatbot/rules");
      setRules(data.items || []);
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRules();
  }, []);

  async function handleCreate() {
    if (!keyword.trim() || !response.trim()) return;
    setSaving(true);
    try {
      await api.post("/whatsapp/chatbot/rules", {
        trigger_keyword: keyword.trim(),
        response_message: response.trim(),
      });
      setKeyword("");
      setResponse("");
      await fetchRules();
    } catch {
      alert("Erro ao criar regra");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(rule: ChatbotRule) {
    try {
      await api.put(`/whatsapp/chatbot/rules/${rule.id}`, {
        is_active: !rule.is_active,
      });
      await fetchRules();
    } catch {
      alert("Erro ao atualizar regra");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta regra?")) return;
    try {
      await api.delete(`/whatsapp/chatbot/rules/${id}`);
      await fetchRules();
    } catch {
      alert("Erro ao remover regra");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Create rule form */}
      <div className="bg-background-primary border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground-primary mb-4 flex items-center gap-2">
          <Plus size={16} />
          Nova Regra de Chatbot
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground-secondary mb-1 block">
              Palavra-chave (gatilho)
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Ex: oi, horario, preco"
              className="w-full h-10 px-3 border border-border rounded-lg bg-background-secondary text-foreground-primary text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground-secondary mb-1 block">
              Resposta automática
            </label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Mensagem que será enviada automaticamente..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background-secondary text-foreground-primary text-sm resize-none"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={saving || !keyword.trim() || !response.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Adicionar Regra
          </button>
        </div>
      </div>

      {/* Rules list */}
      <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground-primary">
            Regras ({rules.length})
          </h3>
        </div>
        {rules.length === 0 ? (
          <div className="p-8 text-center">
            <Bot size={32} className="mx-auto mb-2 text-foreground-tertiary opacity-50" />
            <p className="text-sm text-foreground-tertiary">Nenhuma regra configurada</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rules.map((rule) => (
              <div key={rule.id} className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded">
                      {rule.trigger_keyword}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      rule.is_active
                        ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                    }`}>
                      {rule.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="text-sm text-foreground-secondary line-clamp-2">
                    {rule.response_message}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(rule)}
                    className="text-xs px-2 py-1 border border-border rounded hover:bg-background-secondary transition-colors"
                  >
                    {rule.is_active ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
