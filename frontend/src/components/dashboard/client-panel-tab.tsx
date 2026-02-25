"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";
import api from "@/lib/api";

interface ClientHealth {
  id: string;
  company_name: string;
  trade_name: string | null;
  responsible_user_name: string | null;
  pending_tasks: number;
  overdue_tasks: number;
  health: "green" | "yellow" | "red";
  last_activity: string | null;
}

const HEALTH_STYLES: Record<string, { dot: string; bg: string; label: string }> = {
  green: {
    dot: "bg-green-500",
    bg: "bg-green-50 dark:bg-green-900/20",
    label: "Em dia",
  },
  yellow: {
    dot: "bg-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    label: "Atenção",
  },
  red: {
    dot: "bg-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
    label: "Crítico",
  },
};

export function ClientPanelTab() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientHealth[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/dashboard/clients-panel");
        setClients(data.clients ?? []);
      } catch (err) {
        console.error("Failed to load clients panel:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  const summary = {
    total: clients.length,
    green: clients.filter((c) => c.health === "green").length,
    yellow: clients.filter((c) => c.health === "yellow").length,
    red: clients.filter((c) => c.health === "red").length,
  };

  // Sort: red first, then yellow, then green
  const sorted = [...clients].sort((a, b) => {
    const order = { red: 0, yellow: 1, green: 2 };
    return (order[a.health] ?? 3) - (order[b.health] ?? 3);
  });

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 px-4 py-3 bg-background-primary border border-border rounded-xl">
          <Users size={20} className="text-blue-500" />
          <div>
            <p className="text-xl font-bold text-foreground-primary">
              {summary.total}
            </p>
            <p className="text-xs text-foreground-secondary">clientes ativos</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {summary.green} em dia
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
            {summary.yellow} atenção
          </span>
        </div>
        {summary.red > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              {summary.red} crítico{summary.red !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      {clients.length === 0 ? (
        <div className="text-center py-10 text-foreground-tertiary">
          <Users size={40} className="mx-auto mb-2 opacity-50" />
          <p>Nenhum cliente ativo</p>
        </div>
      ) : (
        <div className="bg-background-primary border border-border rounded-xl overflow-clip">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-foreground-tertiary border-b border-border bg-background-secondary">
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3 text-center">Pendentes</th>
                  <th className="px-4 py-3 text-center">Atrasadas</th>
                  <th className="px-4 py-3">Última Atividade</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((client) => {
                  const style = HEALTH_STYLES[client.health] || HEALTH_STYLES.green;
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-border/50 hover:bg-background-secondary cursor-pointer transition-colors"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${style.bg}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${style.dot}`}
                          />
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground-primary">
                          {client.trade_name || client.company_name}
                        </p>
                        {client.trade_name && (
                          <p className="text-[11px] text-foreground-tertiary">
                            {client.company_name}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary">
                        {client.responsible_user_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-medium ${
                            client.pending_tasks > 0
                              ? "text-amber-600"
                              : "text-foreground-tertiary"
                          }`}
                        >
                          {client.pending_tasks}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-medium ${
                            client.overdue_tasks > 0
                              ? "text-red-500"
                              : "text-foreground-tertiary"
                          }`}
                        >
                          {client.overdue_tasks}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground-tertiary text-xs whitespace-nowrap">
                        {client.last_activity
                          ? formatDate(client.last_activity)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
