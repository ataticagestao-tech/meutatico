"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  MessageSquare,
  Search,
  WifiOff,
  Wifi,
  Phone,
  User,
  Image,
  FileText,
  Mic,
} from "lucide-react";
import api from "@/lib/api";

interface WhatsAppStatus {
  configured: boolean;
  connected: boolean;
  phone_number: string | null;
  updated_at?: string;
}

interface Contact {
  id: string;
  name: string;
  phone_number: string;
  custom_name: string | null;
  avatar_url: string | null;
}

interface Message {
  id: string;
  content: string;
  from_me: boolean;
  message_type: string;
  media_url: string | null;
  timestamp: string;
  status?: string;
}

const MSG_TYPE_ICONS: Record<string, React.ElementType> = {
  image: Image,
  document: FileText,
  audio: Mic,
  video: FileText,
};

export default function WhatsAppPage() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [statusRes, contactsRes] = await Promise.all([
          api.get("/whatsapp/status"),
          api.get("/whatsapp/contacts"),
        ]);
        setStatus(statusRes.data);
        setContacts(contactsRes.data.items || []);
      } catch {
        setStatus({ configured: false, connected: false, phone_number: null });
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function searchContacts() {
    try {
      const { data } = await api.get(`/whatsapp/contacts?search=${encodeURIComponent(search)}`);
      setContacts(data.items || []);
    } catch { /* graceful */ }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length >= 2) searchContacts();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  async function selectContact(contact: Contact) {
    setSelectedContact(contact);
    setLoadingMessages(true);
    try {
      const { data } = await api.get(`/whatsapp/messages/${encodeURIComponent(contact.id)}`);
      setMessages(data.items || []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }

  if (loading) {
    return (
      <PageWrapper
        title="WhatsApp"
        breadcrumb={[{ label: "Comunicação", href: "/comunicacao" }, { label: "WhatsApp" }]}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </PageWrapper>
    );
  }

  if (!status?.configured) {
    return (
      <PageWrapper
        title="WhatsApp"
        breadcrumb={[{ label: "Comunicação", href: "/comunicacao" }, { label: "WhatsApp" }]}
      >
        <div className="max-w-lg mx-auto bg-background-primary border border-border rounded-xl p-8 text-center">
          <WifiOff size={48} className="mx-auto mb-4 text-foreground-tertiary opacity-50" />
          <h2 className="text-lg font-semibold text-foreground-primary mb-2">Supabase não configurado</h2>
          <p className="text-sm text-foreground-tertiary">
            Configure SUPABASE_FINANCEIRO_URL e SUPABASE_FINANCEIRO_SERVICE_KEY para acessar
            as mensagens do WhatsApp do sistema financeiro.
          </p>
          <p className="text-xs text-foreground-tertiary mt-4">
            O Tatica Gestap lê as mensagens do sistema financeiro (ataticagestao.com). O envio continua sendo feito pelo sistema financeiro.
          </p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="WhatsApp"
      breadcrumb={[{ label: "Comunicação", href: "/comunicacao" }, { label: "WhatsApp" }]}
    >
      {/* Status bar */}
      <div className="mb-6 flex items-center gap-3 p-3 bg-background-primary border border-border rounded-xl">
        {status.connected ? (
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
        {status.phone_number && (
          <span className="text-xs text-foreground-tertiary">
            <Phone size={12} className="inline mr-1" />
            {status.phone_number}
          </span>
        )}
        <span className="text-[10px] text-foreground-tertiary ml-auto">Somente leitura</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-260px)]">
        {/* Contact list */}
        <div className="lg:col-span-1 flex flex-col">
          <div className="bg-background-primary border border-border rounded-xl flex-1 flex flex-col overflow-hidden">
            {/* Search */}
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
            {/* Contacts */}
            <div className="flex-1 overflow-y-auto">
              {contacts.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare size={32} className="mx-auto mb-2 text-foreground-tertiary opacity-50" />
                  <p className="text-sm text-foreground-tertiary">Nenhum contato</p>
                </div>
              ) : (
                contacts.map((c) => {
                  const isSelected = selectedContact?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => selectContact(c)}
                      className={`w-full text-left p-3 border-b border-border/50 hover:bg-background-secondary transition-colors ${
                        isSelected ? "bg-background-secondary" : ""
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
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground-primary truncate">
                            {c.custom_name || c.name || c.phone_number}
                          </p>
                          <p className="text-[10px] text-foreground-tertiary">{c.phone_number}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
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
                      <div
                        key={msg.id}
                        className={`flex ${msg.from_me ? "justify-end" : "justify-start"}`}
                      >
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
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {msg.content || `[${msg.message_type}]`}
                          </p>
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

              {/* Read-only notice */}
              <div className="p-3 border-t border-border bg-background-secondary/50 text-center">
                <p className="text-[10px] text-foreground-tertiary">
                  Modo somente leitura. O envio de mensagens é feito pelo sistema financeiro.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
