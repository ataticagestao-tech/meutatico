"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/layout/page-wrapper";
import Link from "next/link";
import { Search, Plus, ChevronLeft, ChevronRight, Users, Filter } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { CLIENT_STATUSES, STATUS_COLORS } from "@/lib/constants";
import api from "@/lib/api";
import { ClientAvatar } from "@/components/clients/client-avatar";
import { ClientActionsMenu } from "@/components/clients/client-actions-menu";
import type { Client, ClientStatus } from "@/types/client";
import type { PaginatedResponse } from "@/types/api";

const STATUS_LABELS: Record<string, string> = {};
CLIENT_STATUSES.forEach((s) => {
  STATUS_LABELS[s.value] = s.label;
});

export default function ClientsPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", String(perPage));
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter) params.set("status", statusFilter);

      const { data } = await api.get<PaginatedResponse<Client>>(
        `/clients?${params.toString()}`
      );
      setClients(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function handleDeleteClient(clientId: string) {
    try {
      await api.delete(`/clients/${clientId}`);
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      setTotal((prev) => prev - 1);
      setToast({ message: "Cliente excluido com sucesso.", type: "success" });
    } catch (err: any) {
      let msg = "Erro ao excluir cliente.";
      if (err?.response?.status === 403) {
        msg = "Voce nao tem permissao para excluir clientes.";
      } else if (err?.response?.status === 409) {
        msg = "Este cliente possui registros vinculados e nao pode ser excluido.";
      }
      setToast({ message: msg, type: "error" });
    }
  }

  function formatCnpjCpf(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 14) {
      return digits.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5"
      );
    }
    if (digits.length === 11) {
      return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
    }
    return value;
  }

  function formatPhone(value: string | undefined): string {
    if (!value) return "\u2014";
    const digits = value.replace(/\D/g, "");
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return value;
  }

  function getTaxRegimeBadge(regime: string | undefined) {
    if (!regime) return <span className="text-foreground-tertiary text-sm">{"\u2014"}</span>;
    const normalized = regime.toLowerCase().replace(/\s+/g, "_").replace(/[áàã]/g, "a");
    const config: Record<string, { label: string; classes: string }> = {
      simples_nacional: { label: "Simples Nacional", classes: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" },
      lucro_presumido: { label: "Lucro Presumido", classes: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400" },
      lucro_real: { label: "Lucro Real", classes: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400" },
      mei: { label: "MEI", classes: "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400" },
    };
    const match = config[normalized] || { label: regime, classes: "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${match.classes}`}>
        {match.label}
      </span>
    );
  }

  return (
    <PageWrapper
      title="Clientes"
      breadcrumb={[{ label: "Dashboard", href: "/dashboard" }, { label: "Clientes" }]}
      actions={
        <button
          onClick={() => router.push("/clients/new")}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      }
    >
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Filters */}
      <div className="bg-background-primary border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary"
            />
            <input
              type="text"
              placeholder="Buscar por nome, CNPJ, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 pl-9 pr-8 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            >
              <option value="">Todos os Status</option>
              {CLIENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-background-primary border border-border rounded-xl overflow-clip">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-background-secondary">
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                  Nome Fantasia / Razao Social
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                  CNPJ/CPF
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                  Regime Tributario
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                  Telefone
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-foreground-secondary uppercase tracking-wider w-16">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-3 text-foreground-tertiary">
                      <div className="animate-spin h-5 w-5 border-2 border-brand-primary border-t-transparent rounded-full" />
                      <span className="text-sm">Carregando...</span>
                    </div>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Users
                      size={40}
                      className="mx-auto mb-2 text-foreground-tertiary opacity-50"
                    />
                    <p className="text-foreground-tertiary text-sm">
                      Nenhum cliente encontrado
                    </p>
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-background-secondary transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/clients/${client.id}`} className="flex items-center gap-3">
                        <ClientAvatar
                          logoUrl={client.logo_url}
                          name={client.trade_name || client.company_name}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground-primary truncate">
                            {client.trade_name || client.company_name}
                          </p>
                          {client.trade_name && client.trade_name !== client.company_name && (
                            <p className="text-xs text-foreground-tertiary truncate">
                              {client.company_name}
                            </p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-secondary font-mono">
                      {formatCnpjCpf(client.document_number)}
                    </td>
                    <td className="px-4 py-3">
                      {getTaxRegimeBadge(client.tax_regime)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[client.status] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {STATUS_LABELS[client.status] || client.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-secondary">
                      {formatPhone(client.phone)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ClientActionsMenu
                        clientId={client.id}
                        clientName={client.trade_name || client.company_name}
                        onDelete={handleDeleteClient}
                      />
                    </td>
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
              Mostrando{" "}
              <span className="font-medium text-foreground-primary">
                {(page - 1) * perPage + 1}
              </span>{" "}
              a{" "}
              <span className="font-medium text-foreground-primary">
                {Math.min(page * perPage, total)}
              </span>{" "}
              de{" "}
              <span className="font-medium text-foreground-primary">{total}</span>{" "}
              resultados
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-border text-foreground-secondary hover:bg-background-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      page === pageNum
                        ? "bg-brand-primary text-white"
                        : "text-foreground-secondary hover:bg-background-tertiary"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-border text-foreground-secondary hover:bg-background-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
