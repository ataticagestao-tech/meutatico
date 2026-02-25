"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  XCircle,
} from "lucide-react";
import api from "@/lib/api";

interface ClientItem {
  id: string;
  company_name: string;
  trade_name: string | null;
  status: string;
  contract_start_date: string | null;
  contract_end_date: string | null;
  contracted_plan: string | null;
}

function getContractStatus(endDate: string | null): {
  label: string;
  color: string;
  icon: React.ElementType;
} {
  if (!endDate) {
    return { label: "Indeterminado", color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20", icon: Clock };
  }

  const end = new Date(endDate);
  const now = new Date();
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: "Vencido", color: "text-red-500 bg-red-50 dark:bg-red-900/20", icon: XCircle };
  }
  if (diffDays <= 30) {
    return { label: `Vence em ${diffDays}d`, color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20", icon: AlertTriangle };
  }
  if (diffDays <= 90) {
    return { label: `Vence em ${diffDays}d`, color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20", icon: Clock };
  }
  return { label: "Vigente", color: "text-green-500 bg-green-50 dark:bg-green-900/20", icon: CheckCircle2 };
}

export default function VencimentosPage() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "expiring" | "expired">("all");

  useEffect(() => {
    async function init() {
      try {
        const { data } = await api.get("/clients");
        const list = Array.isArray(data) ? data : data.items || [];
        setClients(list);
      } catch {
        setClients([]);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const filtered = clients.filter((c) => {
    if (filter === "all") return true;
    if (!c.contract_end_date) return false;

    const end = new Date(c.contract_end_date);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (filter === "expired") return diffDays < 0;
    if (filter === "expiring") return diffDays >= 0 && diffDays <= 90;
    return true;
  });

  const expiredCount = clients.filter((c) => {
    if (!c.contract_end_date) return false;
    return new Date(c.contract_end_date) < new Date();
  }).length;

  const expiringCount = clients.filter((c) => {
    if (!c.contract_end_date) return false;
    const diff = Math.ceil(
      (new Date(c.contract_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff >= 0 && diff <= 90;
  }).length;

  if (loading) {
    return (
      <PageWrapper
        title="Vencimentos de Contratos"
        breadcrumb={[
          { label: "Documentos", href: "/documents" },
          { label: "Vencimentos" },
        ]}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Vencimentos de Contratos"
      breadcrumb={[
        { label: "Documentos", href: "/documents" },
        { label: "Vencimentos" },
      ]}
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`p-4 rounded-xl border transition-colors text-left ${
            filter === "all"
              ? "border-brand-primary bg-brand-primary/5"
              : "border-border bg-background-primary hover:bg-background-secondary"
          }`}
        >
          <p className="text-2xl font-bold text-foreground-primary">{clients.length}</p>
          <p className="text-xs text-foreground-tertiary">Total de clientes</p>
        </button>
        <button
          onClick={() => setFilter("expiring")}
          className={`p-4 rounded-xl border transition-colors text-left ${
            filter === "expiring"
              ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10"
              : "border-border bg-background-primary hover:bg-background-secondary"
          }`}
        >
          <p className="text-2xl font-bold text-amber-500">{expiringCount}</p>
          <p className="text-xs text-foreground-tertiary">Vencem em 90 dias</p>
        </button>
        <button
          onClick={() => setFilter("expired")}
          className={`p-4 rounded-xl border transition-colors text-left ${
            filter === "expired"
              ? "border-red-500 bg-red-50 dark:bg-red-900/10"
              : "border-border bg-background-primary hover:bg-background-secondary"
          }`}
        >
          <p className="text-2xl font-bold text-red-500">{expiredCount}</p>
          <p className="text-xs text-foreground-tertiary">Vencidos</p>
        </button>
      </div>

      {/* Table */}
      <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background-secondary">
              <th className="text-left px-4 py-3 font-medium text-foreground-tertiary">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-foreground-tertiary">Plano</th>
              <th className="text-left px-4 py-3 font-medium text-foreground-tertiary">Início</th>
              <th className="text-left px-4 py-3 font-medium text-foreground-tertiary">Fim</th>
              <th className="text-left px-4 py-3 font-medium text-foreground-tertiary">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <Calendar size={32} className="mx-auto mb-2 text-foreground-tertiary opacity-50" />
                  <p className="text-foreground-tertiary">Nenhum contrato nesta categoria</p>
                </td>
              </tr>
            ) : (
              filtered.map((client) => {
                const status = getContractStatus(client.contract_end_date);
                const StatusIcon = status.icon;

                return (
                  <tr key={client.id} className="border-b border-border/50 hover:bg-background-secondary/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground-primary">
                        {client.trade_name || client.company_name}
                      </p>
                      {client.trade_name && (
                        <p className="text-xs text-foreground-tertiary">{client.company_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground-secondary">
                      {client.contracted_plan || "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground-secondary">
                      {client.contract_start_date
                        ? new Date(client.contract_start_date).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground-secondary">
                      {client.contract_end_date
                        ? new Date(client.contract_end_date).toLocaleDateString("pt-BR")
                        : "Indeterminado"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  );
}
