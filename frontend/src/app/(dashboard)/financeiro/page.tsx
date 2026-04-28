"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
  BarChart3,
  AlertCircle,
  ChevronRight,
  WifiOff,
  RefreshCw,
  Link2,
  Unlink,
} from "lucide-react";
import api from "@/lib/api";

interface FinancialDashboard {
  periodo: { mes: number; ano: number };
  contas_pagar: { total: number; pago: number; pendente: number };
  contas_receber: { total: number; recebido: number; pendente: number };
  saldo_bancario: {
    total: number;
    contas: { name: string; banco: string; current_balance: number }[];
  };
  conciliacao: {
    total: number;
    conciliadas: number;
    pendentes: number;
    percentual: number;
  };
  resultado: {
    receitas: number;
    deducoes: number;
    receita_liquida: number;
    custos: number;
    lucro_bruto: number;
    despesas_operacionais: number;
    resultado_operacional: number;
    distribuicao_lucro: number;
    liquido: number;
  };
  connected: boolean;
}

interface ClientItem {
  id: string;
  company_name: string;
  trade_name: string | null;
  status: string;
  financial_company_id?: string | null;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FinanceiroPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<FinancialDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashLoading, setDashLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [dashError, setDashError] = useState<string | null>(null);

  // Load clients + check connection
  useEffect(() => {
    async function init() {
      try {
        const [statusRes, clientsRes] = await Promise.all([
          api.get("/financeiro/status"),
          api.get("/clients?per_page=100"),
        ]);
        setConnected(statusRes.data.connected);
        const list = Array.isArray(clientsRes.data)
          ? clientsRes.data
          : clientsRes.data.items || [];
        // Sort: linked clients first
        list.sort((a: ClientItem, b: ClientItem) => {
          const aLinked = a.financial_company_id ? 1 : 0;
          const bLinked = b.financial_company_id ? 1 : 0;
          return bLinked - aLinked;
        });
        setClients(list);
      } catch {
        setConnected(false);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Load dashboard for selected client
  async function loadDashboard(clientId: string) {
    setSelectedClientId(clientId);
    setDashLoading(true);
    setDashError(null);
    setDashboard(null);
    try {
      const { data } = await api.get(
        `/financeiro/dashboard/${clientId}?mes=${mes}&ano=${ano}`
      );
      setDashboard(data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail;
      if (msg && typeof msg === "string" && msg.includes("vínculo")) {
        setDashError(msg);
      } else {
        setDashError("Erro ao carregar dados financeiros.");
      }
      setDashboard(null);
    } finally {
      setDashLoading(false);
    }
  }

  async function refreshDashboard() {
    if (selectedClientId) {
      await loadDashboard(selectedClientId);
    }
  }

  const linkedCount = clients.filter((c) => c.financial_company_id).length;

  if (loading) {
    return (
      <PageWrapper title="Painel Financeiro" breadcrumb={[{ label: "Financeiro" }]}>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Painel Financeiro" breadcrumb={[{ label: "Financeiro" }]}>
      {/* Integration Status Banner */}
      {connected === false && (
        <div className="mb-6 flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
          <WifiOff size={20} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Integração financeira não configurada
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Configure as variáveis SUPABASE_FINANCEIRO_URL e
              SUPABASE_FINANCEIRO_SERVICE_KEY para conectar ao sistema financeiro.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Client List + Period Selector */}
        <div className="lg:col-span-1">
          {/* Period Selector */}
          <div className="bg-background-primary border border-border rounded-xl p-4 mb-4">
            <label className="text-xs font-medium text-foreground-tertiary block mb-2">
              Período
            </label>
            <div className="flex gap-2">
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="flex-1 text-sm bg-background-secondary border border-border rounded-lg px-2 py-1.5 text-foreground-primary"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="w-20 text-sm bg-background-secondary border border-border rounded-lg px-2 py-1.5 text-foreground-primary"
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Client List */}
          <div className="bg-background-primary border border-border rounded-xl">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground-primary">
                Clientes ({clients.length})
              </h3>
              <p className="text-[10px] text-foreground-tertiary mt-0.5">
                {linkedCount} vinculados ao financeiro
              </p>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {clients.length === 0 ? (
                <div className="p-8 text-center">
                  <Wallet size={32} className="mx-auto mb-2 text-foreground-tertiary opacity-50" />
                  <p className="text-sm text-foreground-tertiary">Nenhum cliente</p>
                </div>
              ) : (
                clients.map((c) => {
                  const isLinked = !!c.financial_company_id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => loadDashboard(c.id)}
                      className={`w-full text-left p-3.5 border-b border-border/50 hover:bg-background-secondary transition-colors ${
                        selectedClientId === c.id ? "bg-background-secondary" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isLinked ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                            }`}
                            title={isLinked ? "Vinculado ao financeiro" : "Sem vínculo financeiro"}
                          />
                          <span className="text-sm font-medium text-foreground-primary truncate">
                            {c.trade_name || c.company_name}
                          </span>
                        </div>
                        <ChevronRight size={14} className="text-foreground-tertiary shrink-0" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Dashboard KPIs */}
        <div className="lg:col-span-3">
          {!selectedClientId ? (
            <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
              <BarChart3 size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-40" />
              <p className="text-sm text-foreground-tertiary">
                Selecione um cliente para ver o painel financeiro
              </p>
            </div>
          ) : dashLoading ? (
            <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
              <Loader2 size={24} className="animate-spin text-brand-primary mx-auto" />
            </div>
          ) : dashError ? (
            <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
              <Unlink size={40} className="mx-auto mb-3 text-foreground-tertiary opacity-50" />
              <p className="text-sm font-medium text-foreground-primary mb-2">
                Cliente não vinculado
              </p>
              <p className="text-xs text-foreground-tertiary max-w-md mx-auto">
                {dashError}
              </p>
              <a
                href={`/clients/${selectedClientId}`}
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Link2 size={14} />
                Vincular na aba Financeiro
              </a>
            </div>
          ) : dashboard ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground-primary">
                  {MESES[dashboard.periodo.mes - 1]} {dashboard.periodo.ano}
                </h3>
                <button
                  onClick={refreshDashboard}
                  className="flex items-center gap-1.5 text-xs text-foreground-tertiary hover:text-brand-primary transition-colors"
                >
                  <RefreshCw size={14} />
                  Atualizar
                </button>
              </div>

              {/* KPI Cards Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Contas a Pagar */}
                <div className="bg-background-primary border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                      <ArrowUpCircle size={18} className="text-red-500" />
                    </div>
                    <span className="text-sm font-medium text-foreground-secondary">
                      Contas a Pagar
                    </span>
                  </div>
                  <p className="text-xl font-bold text-foreground-primary mb-2">
                    {formatCurrency(dashboard.contas_pagar.total)}
                  </p>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">
                      Pago: {formatCurrency(dashboard.contas_pagar.pago)}
                    </span>
                    <span className="text-red-500">
                      Pendente: {formatCurrency(dashboard.contas_pagar.pendente)}
                    </span>
                  </div>
                  {dashboard.contas_pagar.total > 0 && (
                    <div className="mt-2 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${Math.round(
                            (dashboard.contas_pagar.pago / dashboard.contas_pagar.total) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Contas a Receber */}
                <div className="bg-background-primary border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <ArrowDownCircle size={18} className="text-green-500" />
                    </div>
                    <span className="text-sm font-medium text-foreground-secondary">
                      Contas a Receber
                    </span>
                  </div>
                  <p className="text-xl font-bold text-foreground-primary mb-2">
                    {formatCurrency(dashboard.contas_receber.total)}
                  </p>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">
                      Recebido: {formatCurrency(dashboard.contas_receber.recebido)}
                    </span>
                    <span className="text-amber-500">
                      Pendente: {formatCurrency(dashboard.contas_receber.pendente)}
                    </span>
                  </div>
                  {dashboard.contas_receber.total > 0 && (
                    <div className="mt-2 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${Math.round(
                            (dashboard.contas_receber.recebido / dashboard.contas_receber.total) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Saldo Bancário */}
                <div className="bg-background-primary border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <Landmark size={18} className="text-blue-500" />
                    </div>
                    <span className="text-sm font-medium text-foreground-secondary">
                      Saldo Bancário
                    </span>
                  </div>
                  <p className="text-xl font-bold text-foreground-primary mb-2">
                    {formatCurrency(dashboard.saldo_bancario.total)}
                  </p>
                  {dashboard.saldo_bancario.contas.length > 0 ? (
                    <div className="space-y-1.5">
                      {dashboard.saldo_bancario.contas.map((conta, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-foreground-tertiary truncate">
                            {conta.name || conta.banco}
                          </span>
                          <span className="text-foreground-secondary font-medium">
                            {formatCurrency(conta.current_balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-foreground-tertiary">Nenhuma conta bancária</p>
                  )}
                </div>
              </div>

              {/* KPI Cards Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Conciliação */}
                <div className="bg-background-primary border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <BarChart3 size={18} className="text-purple-500" />
                    </div>
                    <span className="text-sm font-medium text-foreground-secondary">
                      Conciliação Bancária
                    </span>
                  </div>
                  <div className="flex items-end gap-4">
                    <div>
                      <p className="text-3xl font-bold text-foreground-primary">
                        {dashboard.conciliacao.percentual}%
                      </p>
                      <p className="text-xs text-foreground-tertiary mt-1">
                        {dashboard.conciliacao.conciliadas} de {dashboard.conciliacao.total} transações
                      </p>
                    </div>
                    <div className="flex-1 h-3 bg-background-tertiary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          dashboard.conciliacao.percentual === 100
                            ? "bg-green-500"
                            : dashboard.conciliacao.percentual >= 80
                            ? "bg-blue-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${dashboard.conciliacao.percentual}%` }}
                      />
                    </div>
                  </div>
                  {dashboard.conciliacao.pendentes > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600">
                      <AlertCircle size={12} />
                      {dashboard.conciliacao.pendentes} transações pendentes de conciliação
                    </div>
                  )}
                </div>

                {/* Resultado — DRE Resumido */}
                <div className="bg-background-primary border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-2 rounded-lg ${
                      dashboard.resultado.liquido >= 0
                        ? "bg-green-100 dark:bg-green-900/20"
                        : "bg-red-100 dark:bg-red-900/20"
                    }`}>
                      {dashboard.resultado.liquido >= 0 ? (
                        <TrendingUp size={18} className="text-green-500" />
                      ) : (
                        <TrendingDown size={18} className="text-red-500" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground-secondary">
                      Resultado do Mes
                    </span>
                  </div>
                  <p className={`text-3xl font-bold ${
                    dashboard.resultado.liquido >= 0 ? "text-green-600" : "text-red-500"
                  }`}>
                    {formatCurrency(dashboard.resultado.liquido)}
                  </p>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-foreground-tertiary">Receitas</span>
                      <span className="text-green-600 font-medium">
                        {formatCurrency(dashboard.resultado.receitas)}
                      </span>
                    </div>
                    {dashboard.resultado.deducoes > 0 && (
                      <div className="flex justify-between">
                        <span className="text-foreground-tertiary">(-) Deducoes</span>
                        <span className="text-red-400 font-medium">
                          {formatCurrency(dashboard.resultado.deducoes)}
                        </span>
                      </div>
                    )}
                    {dashboard.resultado.custos > 0 && (
                      <div className="flex justify-between">
                        <span className="text-foreground-tertiary">(-) Custos (CSP)</span>
                        <span className="text-red-500 font-medium">
                          {formatCurrency(dashboard.resultado.custos)}
                        </span>
                      </div>
                    )}
                    {dashboard.resultado.despesas_operacionais > 0 && (
                      <div className="flex justify-between">
                        <span className="text-foreground-tertiary">(-) Despesas Operacionais</span>
                        <span className="text-red-500 font-medium">
                          {formatCurrency(dashboard.resultado.despesas_operacionais)}
                        </span>
                      </div>
                    )}
                    {dashboard.resultado.distribuicao_lucro > 0 && (
                      <>
                        <div className="border-t border-border my-1" />
                        <div className="flex justify-between">
                          <span className="text-foreground-tertiary">(-) Antecipacao de Lucro</span>
                          <span className="text-amber-600 font-medium">
                            {formatCurrency(dashboard.resultado.distribuicao_lucro)}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="border-t border-border pt-1.5">
                      <div className="flex justify-between font-semibold">
                        <span className="text-foreground-secondary">Resultado Liquido</span>
                        <span className={dashboard.resultado.liquido >= 0 ? "text-green-600" : "text-red-500"}>
                          {formatCurrency(dashboard.resultado.liquido)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Not connected info */}
              {!dashboard.connected && (
                <div className="flex items-center gap-3 p-4 bg-background-secondary border border-border rounded-xl">
                  <AlertCircle size={18} className="text-foreground-tertiary shrink-0" />
                  <p className="text-xs text-foreground-tertiary">
                    Os dados acima são exemplos. Configure a integração com o Supabase para ver dados reais do sistema financeiro.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </PageWrapper>
  );
}
