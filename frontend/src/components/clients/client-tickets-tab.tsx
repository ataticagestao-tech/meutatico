"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ticket, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PRIORITY_COLORS, STATUS_COLORS } from "@/lib/constants";
import api from "@/lib/api";

interface TicketItem {
  id: string;
  ticket_number: number | null;
  title: string;
  status: string;
  priority: string;
  type: string;
  created_at: string;
  due_date?: string;
  assigned_user_name?: string;
}

interface ClientTicketsTabProps {
  clientId: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Andamento",
  waiting_client: "Ag. Cliente",
  waiting_internal: "Ag. Interno",
  resolved: "Resolvido",
  closed: "Fechado",
  cancelled: "Cancelado",
};

const TYPE_LABELS: Record<string, string> = {
  request: "Solicitação",
  incident: "Incidente",
  question: "Dúvida",
  suggestion: "Sugestão",
};

export function ClientTicketsTab({ clientId }: ClientTicketsTabProps) {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(
          `/tickets?client_id=${clientId}&per_page=100`
        );
        setTickets((data as any).items ?? data ?? []);
      } catch (err) {
        console.error("Failed to load tickets:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  const open = tickets.filter(
    (t) => !["resolved", "closed", "cancelled"].includes(t.status)
  ).length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <Ticket size={16} className="text-orange-500" />
          <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
            {tickets.length} solicitações total
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {open} em aberto
          </span>
        </div>
      </div>

      {/* List */}
      {tickets.length === 0 ? (
        <div className="text-center py-10 text-foreground-tertiary">
          <Ticket size={40} className="mx-auto mb-2 opacity-50" />
          <p>Nenhuma solicitação para este cliente</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-foreground-tertiary border-b border-border">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Título</th>
                <th className="pb-2 pr-4">Tipo</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Prioridade</th>
                <th className="pb-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="border-b border-border/50 hover:bg-background-secondary cursor-pointer transition-colors"
                  onClick={() => router.push(`/tickets/${ticket.id}`)}
                >
                  <td className="py-2.5 pr-4 text-foreground-tertiary">
                    {ticket.ticket_number || "—"}
                  </td>
                  <td className="py-2.5 pr-4 font-medium text-foreground-primary max-w-[250px] truncate">
                    {ticket.title}
                  </td>
                  <td className="py-2.5 pr-4 text-foreground-secondary text-xs">
                    {TYPE_LABELS[ticket.type] || ticket.type}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        STATUS_COLORS[ticket.status] || ""
                      }`}
                    >
                      {STATUS_LABELS[ticket.status] || ticket.status}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                        PRIORITY_COLORS[ticket.priority] || ""
                      }`}
                    >
                      {ticket.priority === "urgent"
                        ? "Urgente"
                        : ticket.priority === "high"
                          ? "Alta"
                          : ticket.priority === "medium"
                            ? "Média"
                            : "Baixa"}
                    </span>
                  </td>
                  <td className="py-2.5 text-foreground-tertiary whitespace-nowrap text-xs">
                    {formatDate(ticket.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
