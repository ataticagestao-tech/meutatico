"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Ticket as TicketIcon,
  Filter,
  X,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDateTime } from "@/lib/utils";
import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  STATUS_COLORS,
  PRIORITY_COLORS,
} from "@/lib/constants";
import api from "@/lib/api";
import type { Ticket, TicketCreateRequest } from "@/types/ticket";
import type { Client } from "@/types/client";
import type { UserType } from "@/types/user";
import type { PaginatedResponse } from "@/types/api";

const STATUS_LABELS: Record<string, string> = {};
TICKET_STATUSES.forEach((s) => { STATUS_LABELS[s.value] = s.label; });
const PRIORITY_LABELS: Record<string, string> = {};
TICKET_PRIORITIES.forEach((p) => { PRIORITY_LABELS[p.value] = p.label; });

export default function TicketsPage() {
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<string>("medium");
  const [newClientId, setNewClientId] = useState("");
  const [newAssignedUserId, setNewAssignedUserId] = useState("");

  // Data for selects
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);

  const debouncedSearch = useDebounce(search, 400);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", String(perPage));
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (clientFilter) params.set("client_id", clientFilter);
      if (assignedFilter) params.set("assigned_user_id", assignedFilter);

      const { data } = await api.get<PaginatedResponse<Ticket>>(
        `/tickets?${params.toString()}`
      );
      setTickets(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedSearch, statusFilter, priorityFilter, clientFilter, assignedFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, priorityFilter, clientFilter, assignedFilter]);

  useEffect(() => {
    api.get("/clients?per_page=100").then((r: any) => setClients(r.data.items ?? [])).catch(() => {});
    api.get("/users").then((r: any) => setUsers(r.data.items ?? r.data ?? [])).catch(() => {});
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle || !newClientId) return;
    setCreating(true);
    try {
      const payload: TicketCreateRequest = {
        title: newTitle,
        description: newDescription,
        priority: newPriority as TicketCreateRequest["priority"],
        client_id: newClientId,
        assigned_user_id: newAssignedUserId || undefined,
      };
      await api.post("/tickets", payload);
      setShowModal(false);
      resetForm();
      fetchTickets();
    } catch (err) {
      console.error("Failed to create ticket:", err);
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setNewTitle("");
    setNewDescription("");
    setNewPriority("medium");
    setNewClientId("");
    setNewAssignedUserId("");
  }

  const inputClass =
    "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";
  const selectClass =
    "h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary";
  const labelClass = "block text-sm font-medium text-foreground-secondary mb-1.5";

  return (
    <PageWrapper
      title="Solicitacoes"
      breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Solicitacoes" }]}
      actions={
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          Nova Solicitacao
        </button>
      }
    >
      {/* Filters */}
      <div className="bg-background-primary border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
            <input
              type="text"
              placeholder="Buscar por titulo, numero..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
            <option value="">Status</option>
            {TICKET_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={selectClass}>
            <option value="">Prioridade</option>
            {TICKET_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className={selectClass}>
            <option value="">Cliente</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.trade_name || c.company_name}</option>)}
          </select>
          <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)} className={selectClass}>
            <option value="">Responsavel</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-background-secondary">
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Titulo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Prioridade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Responsavel</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-3 text-foreground-tertiary">
                      <div className="animate-spin h-5 w-5 border-2 border-brand-primary border-t-transparent rounded-full" />
                      <span className="text-sm">Carregando...</span>
                    </div>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <TicketIcon size={40} className="mx-auto mb-2 text-foreground-tertiary opacity-50" />
                    <p className="text-foreground-tertiary text-sm">Nenhuma solicitacao encontrada</p>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => router.push(`/tickets/${ticket.id}`)}
                    className="hover:bg-background-secondary cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-foreground-tertiary">#{ticket.ticket_number}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground-primary truncate max-w-xs">{ticket.title}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-secondary">{ticket.client_name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[ticket.priority] || ""}`}>
                        {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status] || ""}`}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-secondary">{ticket.assigned_user_name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-foreground-secondary">{formatDateTime(ticket.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-foreground-secondary">
              Mostrando <span className="font-medium text-foreground-primary">{(page - 1) * perPage + 1}</span>{" "}
              a <span className="font-medium text-foreground-primary">{Math.min(page * perPage, total)}</span>{" "}
              de <span className="font-medium text-foreground-primary">{total}</span> resultados
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-2 rounded-lg border border-border text-foreground-secondary hover:bg-background-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = page - 2 + i;
                return (
                  <button key={pageNum} onClick={() => setPage(pageNum)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      page === pageNum ? "bg-brand-primary text-white" : "text-foreground-secondary hover:bg-background-tertiary"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-2 rounded-lg border border-border text-foreground-secondary hover:bg-background-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-background-primary border border-border rounded-xl w-full max-w-lg mx-4 shadow-lg">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground-primary">Nova Solicitacao</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-foreground-tertiary hover:text-foreground-primary rounded-lg hover:bg-background-tertiary">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className={labelClass}>Titulo *</label>
                <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Titulo da solicitacao" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Descricao</label>
                <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={3} placeholder="Descreva a solicitacao..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Prioridade</label>
                  <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className={`${selectClass} w-full`}>
                    {TICKET_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Responsavel</label>
                  <select value={newAssignedUserId} onChange={(e) => setNewAssignedUserId(e.target.value)} className={`${selectClass} w-full`}>
                    <option value="">Selecione...</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Cliente *</label>
                <select value={newClientId} onChange={(e) => setNewClientId(e.target.value)} className={`${selectClass} w-full`}>
                  <option value="">Selecione o cliente...</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.trade_name || c.company_name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary transition-colors"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={creating || !newTitle || !newClientId}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <Plus size={16} />
                  {creating ? "Criando..." : "Criar Solicitacao"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
