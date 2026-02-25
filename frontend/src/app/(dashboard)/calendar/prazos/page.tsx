"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  CalendarClock,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import api from "@/lib/api";

interface Deadline {
  client_id: string;
  company_name: string;
  trade_name: string | null;
  contract_start_date: string | null;
  contract_end_date: string;
  days_left: number;
  alert: "expired" | "critical" | "warning" | "attention" | "upcoming" | "normal";
  status: string;
}

interface Summary {
  total: number;
  expired: number;
  critical: number;
  warning: number;
  attention: number;
  upcoming: number;
  normal: number;
}

const ALERT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  expired: { label: "Vencido", color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/20", icon: XCircle },
  critical: { label: "Critico (7 dias)", color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/10", icon: AlertTriangle },
  warning: { label: "Alerta (15 dias)", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/10", icon: AlertCircle },
  attention: { label: "Atencao (30 dias)", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/10", icon: Clock },
  upcoming: { label: "Proximo (60 dias)", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/10", icon: CalendarClock },
  normal: { label: "Regular", color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/10", icon: CheckCircle2 },
};

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR");
}

export default function PrazosContratuaisPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get("/calendar/prazos-contratuais");
        setDeadlines(data.deadlines || []);
        setSummary(data.summary || null);
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = filter === "all" ? deadlines : deadlines.filter((d) => d.alert === filter);

  if (loading) {
    return (
      <PageWrapper
        title="Prazos Contratuais"
        breadcrumb={[{ label: "Calendario", href: "/calendar" }, { label: "Prazos Contratuais" }]}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Prazos Contratuais"
      breadcrumb={[{ label: "Calendario", href: "/calendar" }, { label: "Prazos Contratuais" }]}
    >
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[
            { key: "all", label: "Total", value: summary.total, color: "text-foreground-primary", bg: "bg-background-secondary" },
            { key: "expired", label: "Vencidos", value: summary.expired, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/10" },
            { key: "critical", label: "7 dias", value: summary.critical, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/10" },
            { key: "warning", label: "15 dias", value: summary.warning, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/10" },
            { key: "attention", label: "30 dias", value: summary.attention, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/10" },
            { key: "upcoming", label: "60 dias", value: summary.upcoming, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/10" },
            { key: "normal", label: "Regular", value: summary.normal, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/10" },
          ].map((card) => (
            <button
              key={card.key}
              onClick={() => setFilter(card.key)}
              className={`p-3 rounded-xl text-center transition-all ${
                filter === card.key
                  ? "ring-2 ring-brand-primary " + card.bg
                  : card.bg + " hover:ring-1 hover:ring-border"
              }`}
            >
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-[10px] text-foreground-tertiary mt-0.5">{card.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Deadlines List */}
      {filtered.length === 0 ? (
        <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
          <CalendarClock size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-40" />
          <p className="text-sm text-foreground-tertiary">
            {filter === "all"
              ? "Nenhum contrato com data de vencimento cadastrada."
              : "Nenhum contrato nesta categoria."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => {
            const config = ALERT_CONFIG[d.alert];
            const Icon = config.icon;
            return (
              <a
                key={d.client_id}
                href={`/clients/${d.client_id}`}
                className={`flex items-center gap-4 p-4 rounded-xl border border-border hover:border-brand-primary/30 transition-colors ${config.bg}`}
              >
                <div className={`p-2 rounded-lg ${config.bg}`}>
                  <Icon size={20} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground-primary truncate">
                    {d.trade_name || d.company_name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {d.contract_start_date && (
                      <span className="text-xs text-foreground-tertiary">
                        Inicio: {formatDate(d.contract_start_date)}
                      </span>
                    )}
                    <span className="text-xs text-foreground-secondary font-medium">
                      Vencimento: {formatDate(d.contract_end_date)}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-lg font-bold ${config.color}`}>
                    {d.days_left <= 0
                      ? `${Math.abs(d.days_left)}d atrasado`
                      : `${d.days_left}d`}
                  </p>
                  <span className={`text-[10px] font-medium ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                <ChevronRight size={16} className="text-foreground-tertiary shrink-0" />
              </a>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
