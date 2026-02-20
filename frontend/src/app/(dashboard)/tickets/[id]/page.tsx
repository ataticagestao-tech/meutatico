"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  ArrowLeft,
  Send,
  Lock,
  Loader2,
  Clock,
  User,
  Building2,
  Calendar,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  STATUS_COLORS,
  PRIORITY_COLORS,
} from "@/lib/constants";
import api from "@/lib/api";
import type { Ticket, TicketMessage, TicketUpdateRequest } from "@/types/ticket";
import type { UserType } from "@/types/user";

const STATUS_LABELS: Record<string, string> = {};
TICKET_STATUSES.forEach((s) => { STATUS_LABELS[s.value] = s.label; });
const PRIORITY_LABELS: Record<string, string> = {};
TICKET_PRIORITIES.forEach((p) => { PRIORITY_LABELS[p.value] = p.label; });

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserType[]>([]);

  // Reply
  const [replyContent, setReplyContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  // Sidebar updates
  const [updatingField, setUpdatingField] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    try {
      const { data } = await api.get<Ticket | { data: Ticket }>(`/tickets/${ticketId}`);
      const ticketData = (data as any).data ?? data;
      setTicket(ticketData as Ticket);
    } catch (err) {
      console.error("Failed to fetch ticket:", err);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
    api.get("/users").then((r: any) => setUsers(r.data.data ?? r.data ?? [])).catch(() => {});
  }, [fetchTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setSending(true);
    try {
      await api.post(`/tickets/${ticketId}/messages`, {
        content: replyContent,
        is_internal: isInternal,
      });
      setReplyContent("");
      setIsInternal(false);
      fetchTicket();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }

  async function updateTicketField(field: string, value: string) {
    if (!ticket) return;
    setUpdatingField(field);
    try {
      const payload: TicketUpdateRequest = { [field]: value || undefined };
      await api.put(`/tickets/${ticketId}`, payload);
      fetchTicket();
    } catch (err) {
      console.error("Failed to update ticket:", err);
    } finally {
      setUpdatingField(null);
    }
  }

  const selectClass =
    "w-full h-9 px-2.5 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";

  if (loading) {
    return (
      <PageWrapper title="Carregando..." breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Solicitacoes", href: "/tickets" }, { label: "..." }]}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </PageWrapper>
    );
  }

  if (!ticket) {
    return (
      <PageWrapper title="Nao encontrado" breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Solicitacoes", href: "/tickets" }, { label: "Erro" }]}>
        <p className="text-foreground-secondary">Solicitacao nao encontrada.</p>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={`#${ticket.number} - ${ticket.subject}`}
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Solicitacoes", href: "/tickets" },
        { label: `#${ticket.number}` },
      ]}
      actions={
        <button
          onClick={() => router.push("/tickets")}
          className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
      }
    >
      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Left: Messages (70%) */}
        <div className="flex-1 lg:w-[70%]">
          <div className="bg-background-primary border border-border rounded-xl">
            {/* Message Thread */}
            <div className="p-5 space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin">
              {/* Initial description */}
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {getInitials(ticket.client_name || "C")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground-primary">{ticket.client_name}</span>
                    <span className="text-xs text-foreground-tertiary">{formatDateTime(ticket.created_at)}</span>
                  </div>
                  <div className="bg-background-secondary border border-border rounded-lg p-3">
                    <p className="text-sm text-foreground-primary whitespace-pre-wrap">{ticket.description}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              {(ticket.messages || []).map((msg: TicketMessage) => (
                <div key={msg.id} className={`flex gap-3 ${msg.is_internal ? "" : ""}`}>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      msg.is_internal
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-brand-primary/10 text-brand-primary"
                    }`}
                  >
                    {getInitials(msg.user_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground-primary">{msg.user_name}</span>
                      {msg.is_internal && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                          <Lock size={10} />
                          Nota interna
                        </span>
                      )}
                      <span className="text-xs text-foreground-tertiary">{formatDateTime(msg.created_at)}</span>
                    </div>
                    <div
                      className={`rounded-lg p-3 ${
                        msg.is_internal
                          ? "bg-yellow-50 border border-yellow-200"
                          : "bg-background-secondary border border-border"
                      }`}
                    >
                      <p className="text-sm text-foreground-primary whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Form */}
            <div className="border-t border-border p-5">
              <form onSubmit={handleSendReply}>
                <div className="mb-3">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={3}
                    placeholder={isInternal ? "Escreva uma nota interna..." : "Escreva sua resposta..."}
                    className={`w-full px-3 py-2 border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 resize-none ${
                      isInternal ? "border-yellow-300 bg-yellow-50/30" : "border-border"
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsInternal(!isInternal)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isInternal
                        ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                        : "bg-background-tertiary text-foreground-secondary"
                    }`}
                  >
                    <Lock size={14} />
                    {isInternal ? "Nota Interna" : "Resposta Publica"}
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !replyContent.trim()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    <Send size={14} />
                    {sending ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right: Details (30%) */}
        <div className="lg:w-[30%] space-y-4">
          {/* Status & Priority */}
          <div className="bg-background-primary border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground-primary">Detalhes</h3>

            <div>
              <label className="block text-xs font-medium text-foreground-tertiary mb-1">Status</label>
              <select
                value={ticket.status}
                onChange={(e) => updateTicketField("status", e.target.value)}
                disabled={updatingField === "status"}
                className={selectClass}
              >
                {TICKET_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status] || ""}`}>
                  {STATUS_LABELS[ticket.status] || ticket.status}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-tertiary mb-1">Prioridade</label>
              <select
                value={ticket.priority}
                onChange={(e) => updateTicketField("priority", e.target.value)}
                disabled={updatingField === "priority"}
                className={selectClass}
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[ticket.priority] || ""}`}>
                  {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-tertiary mb-1">Responsavel</label>
              <select
                value={ticket.assigned_to || ""}
                onChange={(e) => updateTicketField("assigned_to", e.target.value)}
                disabled={updatingField === "assigned_to"}
                className={selectClass}
              >
                <option value="">Nao atribuido</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Client Info */}
          <div className="bg-background-primary border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground-primary">Cliente</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                <Building2 size={18} className="text-brand-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground-primary">{ticket.client_name}</p>
                <button
                  onClick={() => router.push(`/clients/${ticket.client_id}`)}
                  className="text-xs text-brand-primary hover:underline"
                >
                  Ver perfil do cliente
                </button>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-background-primary border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground-primary">Datas</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={14} className="text-foreground-tertiary" />
                <span className="text-foreground-tertiary">Criado:</span>
                <span className="text-foreground-primary">{formatDateTime(ticket.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} className="text-foreground-tertiary" />
                <span className="text-foreground-tertiary">Atualizado:</span>
                <span className="text-foreground-primary">{formatDateTime(ticket.updated_at)}</span>
              </div>
              {ticket.resolved_at && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-green-500" />
                  <span className="text-foreground-tertiary">Resolvido:</span>
                  <span className="text-foreground-primary">{formatDateTime(ticket.resolved_at)}</span>
                </div>
              )}
              {ticket.closed_at && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={14} className="text-gray-500" />
                  <span className="text-foreground-tertiary">Fechado:</span>
                  <span className="text-foreground-primary">{formatDateTime(ticket.closed_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {ticket.tags && ticket.tags.length > 0 && (
            <div className="bg-background-primary border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground-primary mb-3">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {ticket.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-background-tertiary text-foreground-secondary text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
