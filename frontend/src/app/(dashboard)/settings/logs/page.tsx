"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  FileText,
  Download,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
} from "lucide-react";
import api from "@/lib/api";

interface AuditLogItem {
  id: number;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

interface LogsResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const ACTION_COLORS: Record<string, string> = {
  create: "text-green-600 bg-green-100 dark:bg-green-900/30",
  update: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  delete: "text-red-600 bg-red-100 dark:bg-red-900/30",
  login: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
};

export default function LogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [page, setPage] = useState(1);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("per_page", "30");
      if (search) params.set("search", search);
      if (filterAction) params.set("action", filterAction);
      if (filterEntity) params.set("entity_type", filterEntity);

      const { data } = await api.get(`/audit-logs?${params.toString()}`);
      setData(data);
    } catch {
      setData({ items: [], total: 0, page: 1, per_page: 30, total_pages: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadFilters() {
      try {
        const [actRes, entRes] = await Promise.all([
          api.get("/audit-logs/actions"),
          api.get("/audit-logs/entity-types"),
        ]);
        setActions(Array.isArray(actRes.data) ? actRes.data : []);
        setEntityTypes(Array.isArray(entRes.data) ? entRes.data : []);
      } catch { /* graceful */ }
    }
    loadFilters();
  }, []);

  useEffect(() => { fetchLogs(); }, [page, filterAction, filterEntity]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLogs();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleExport() {
    try {
      const params = new URLSearchParams();
      if (filterAction) params.set("action", filterAction);
      if (filterEntity) params.set("entity_type", filterEntity);

      const resp = await api.get(`/audit-logs/export?${params.toString()}`, {
        responseType: "blob",
      });

      const blob = new Blob([resp.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audit_logs.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* error */ }
  }

  const inputClass = "h-9 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm";

  return (
    <PageWrapper
      title="Logs & Auditoria"
      breadcrumb={[{ label: "Configurações", href: "/settings" }, { label: "Logs & Auditoria" }]}
      actions={
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-secondary"
        >
          <Download size={14} /> Exportar CSV
        </button>
      }
    >
      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nos logs..."
            className={`${inputClass} pl-8 w-full`}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-foreground-tertiary" />
          <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }} className={inputClass}>
            <option value="">Todas ações</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterEntity} onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }} className={inputClass}>
            <option value="">Todos módulos</option>
            {entityTypes.map((et) => <option key={et} value={et}>{et}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
          <FileText size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-40" />
          <p className="text-sm text-foreground-tertiary">Nenhum log encontrado</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background-secondary/50">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-tertiary">Data/Hora</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-tertiary">Usuário</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-tertiary">Ação</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-tertiary">Módulo</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-tertiary">ID Entidade</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-foreground-tertiary">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.items.map((log) => {
                    const actionColor = Object.entries(ACTION_COLORS).find(([k]) => log.action.toLowerCase().includes(k));
                    const colorClass = actionColor ? actionColor[1] : "text-gray-600 bg-gray-100 dark:bg-gray-900/30";

                    return (
                      <tr key={log.id} className="hover:bg-background-secondary/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-foreground-tertiary" />
                            <span className="text-xs text-foreground-secondary">
                              {new Date(log.created_at).toLocaleString("pt-BR")}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <User size={12} className="text-foreground-tertiary" />
                            <span className="text-xs text-foreground-primary">{log.user_name || "-"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${colorClass}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground-secondary">{log.entity_type || "-"}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-mono text-foreground-tertiary">
                            {log.entity_id ? log.entity_id.slice(0, 8) + "..." : "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground-tertiary">{log.ip_address || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-foreground-tertiary">
                {data.total} registros · Página {data.page} de {data.total_pages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-1.5 border border-border rounded-lg disabled:opacity-30 hover:bg-background-secondary"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage(Math.min(data.total_pages, page + 1))}
                  disabled={page === data.total_pages}
                  className="p-1.5 border border-border rounded-lg disabled:opacity-30 hover:bg-background-secondary"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </PageWrapper>
  );
}
