"use client";

import { useEffect, useState } from "react";
import {
  ExternalLink,
  CheckCircle2,
  Circle,
  Loader2,
  Link2,
  Unlink,
  ArrowUpCircle,
  ArrowDownCircle,
  Landmark,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/api";

interface ClientFinanceiroTabProps {
  clientId: string;
}

interface FinancialCompany {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
}

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

const CHECKLIST_ITEMS = [
  {
    label: "Contas a Pagar — lançadas e conferidas",
    description: "Verificar lançamentos no mês em accounts_payable",
    autoCheck: true,
  },
  {
    label: "Contas a Receber — registradas e atualizadas",
    description: "Verificar lançamentos no mês em accounts_receivable",
    autoCheck: true,
  },
  {
    label: "Conciliação Bancária — realizada e conferida",
    description: "% conciliado de bank_reconciliation_matches",
    autoCheck: true,
  },
  {
    label: "Resultado Financeiro — apurado",
    description: "Confirmação manual de que o resultado foi apurado",
    autoCheck: false,
  },
  {
    label: "Relatório Mensal — gerado e enviado ao cliente",
    description: "Verificar se o PDF foi gerado no OneDrive",
    autoCheck: true,
  },
];

const QUICK_LINKS = [
  { label: "Contas a Pagar", path: "contas-pagar" },
  { label: "Contas a Receber", path: "contas-receber" },
  { label: "Conciliação", path: "conciliacao" },
  { label: "Resultado", path: "resultado" },
  { label: "Relatórios", path: "relatorios" },
];

const BASE_URL = "https://ataticagestao.com/auth";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ClientFinanceiroTab({ clientId }: ClientFinanceiroTabProps) {
  const now = new Date();
  const [companies, setCompanies] = useState<FinancialCompany[]>([]);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [dashboard, setDashboard] = useState<FinancialDashboard | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [statusConnected, setStatusConnected] = useState<boolean | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const [clientRes, companiesRes, statusRes] = await Promise.all([
          api.get(`/clients/${clientId}`),
          api.get("/financeiro/companies").catch(() => ({ data: [] })),
          api.get("/financeiro/status").catch(() => ({ data: { connected: false } })),
        ]);

        const client = clientRes.data;
        const fid = client.financial_company_id || null;
        setCurrentCompanyId(fid);
        setSelectedCompanyId(fid || "");
        setStatusConnected(statusRes.data.connected);

        const companyList = Array.isArray(companiesRes.data) ? companiesRes.data : [];
        setCompanies(companyList);

        if (fid) {
          fetchDashboard(mes, ano);
        }
      } catch {
        setStatusConnected(false);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [clientId]);

  async function fetchDashboard(m: number, y: number) {
    setDashLoading(true);
    try {
      const { data } = await api.get(
        `/financeiro/dashboard/${clientId}?mes=${m}&ano=${y}`
      );
      setDashboard(data);
    } catch {
      setDashboard(null);
    } finally {
      setDashLoading(false);
    }
  }

  function handlePeriodChange(newMes: number, newAno: number) {
    setMes(newMes);
    setAno(newAno);
    if (currentCompanyId) {
      fetchDashboard(newMes, newAno);
    }
  }

  async function linkCompany() {
    if (!selectedCompanyId) return;
    setLinking(true);
    try {
      await api.put(`/clients/${clientId}`, {
        financial_company_id: selectedCompanyId,
      });
      setCurrentCompanyId(selectedCompanyId);
      fetchDashboard(mes, ano);
    } catch {
      // error
    } finally {
      setLinking(false);
    }
  }

  async function unlinkCompany() {
    setLinking(true);
    try {
      await api.put(`/clients/${clientId}`, {
        financial_company_id: null,
      });
      setCurrentCompanyId(null);
      setSelectedCompanyId("");
      setDashboard(null);
    } catch {
      // error
    } finally {
      setLinking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  if (statusConnected === false) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Integração financeira não conectada
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Configure as variáveis SUPABASE_FINANCEIRO_URL e
              SUPABASE_FINANCEIRO_SERVICE_KEY no backend para conectar ao sistema financeiro.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const linkedCompany = companies.find((c) => c.id === currentCompanyId);

  return (
    <div className="space-y-6">
      {/* Company Linking Section */}
      <div className="bg-background-primary border border-border rounded-xl p-5">
        <h4 className="text-sm font-semibold text-foreground-primary mb-3 flex items-center gap-2">
          <Link2 size={16} />
          Vínculo com Empresa Financeira
        </h4>

        {currentCompanyId && linkedCompany ? (
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-green-600" />
              <div>
                <p className="text-sm font-medium text-foreground-primary">
                  {linkedCompany.nome_fantasia || linkedCompany.razao_social}
                </p>
                <p className="text-xs text-foreground-tertiary">
                  CNPJ: {linkedCompany.cnpj} — ID: {linkedCompany.id.slice(0, 8)}...
                </p>
              </div>
            </div>
            <button
              onClick={unlinkCompany}
              disabled={linking}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
            >
              <Unlink size={12} />
              Desvincular
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-foreground-tertiary">
              Selecione a empresa do sistema financeiro (ataticagestao.com) correspondente a este cliente.
            </p>
            <div className="flex gap-2">
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="flex-1 h-9 px-3 border border-border rounded-lg bg-background-secondary text-foreground-primary text-sm"
              >
                <option value="">Selecione uma empresa...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_fantasia || c.razao_social} — {c.cnpj}
                  </option>
                ))}
              </select>
              <button
                onClick={linkCompany}
                disabled={!selectedCompanyId || linking}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {linking ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Link2 size={14} />
                )}
                Vincular
              </button>
            </div>
            {companies.length === 0 && (
              <p className="text-xs text-amber-600">
                Nenhuma empresa encontrada no sistema financeiro. Verifique a conexão.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Dashboard KPIs — only if linked */}
      {currentCompanyId && (
        <>
          {/* Period Selector + Refresh */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <select
                value={mes}
                onChange={(e) => handlePeriodChange(Number(e.target.value), ano)}
                className="text-sm bg-background-secondary border border-border rounded-lg px-2 py-1.5 text-foreground-primary"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={ano}
                onChange={(e) => handlePeriodChange(mes, Number(e.target.value))}
                className="w-20 text-sm bg-background-secondary border border-border rounded-lg px-2 py-1.5 text-foreground-primary"
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => fetchDashboard(mes, ano)}
              className="flex items-center gap-1.5 text-xs text-foreground-tertiary hover:text-brand-primary transition-colors"
            >
              <RefreshCw size={14} />
              Atualizar
            </button>
          </div>

          {dashLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-brand-primary" />
            </div>
          ) : dashboard ? (
            <div className="space-y-4">
              {/* KPI Cards Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Contas a Pagar */}
                <div className="bg-background-primary border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-red-100 dark:bg-red-900/20 rounded-lg">
                      <ArrowUpCircle size={16} className="text-red-500" />
                    </div>
                    <span className="text-xs font-medium text-foreground-secondary">Contas a Pagar</span>
                  </div>
                  <p className="text-lg font-bold text-foreground-primary">
                    {formatCurrency(dashboard.contas_pagar.total)}
                  </p>
                  <div className="flex justify-between text-[11px] mt-1">
                    <span className="text-green-600">Pago: {formatCurrency(dashboard.contas_pagar.pago)}</span>
                    <span className="text-red-500">Pendente: {formatCurrency(dashboard.contas_pagar.pendente)}</span>
                  </div>
                  {dashboard.contas_pagar.total > 0 && (
                    <div className="mt-2 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${Math.round((dashboard.contas_pagar.pago / dashboard.contas_pagar.total) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Contas a Receber */}
                <div className="bg-background-primary border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <ArrowDownCircle size={16} className="text-green-500" />
                    </div>
                    <span className="text-xs font-medium text-foreground-secondary">Contas a Receber</span>
                  </div>
                  <p className="text-lg font-bold text-foreground-primary">
                    {formatCurrency(dashboard.contas_receber.total)}
                  </p>
                  <div className="flex justify-between text-[11px] mt-1">
                    <span className="text-green-600">Recebido: {formatCurrency(dashboard.contas_receber.recebido)}</span>
                    <span className="text-amber-500">Pendente: {formatCurrency(dashboard.contas_receber.pendente)}</span>
                  </div>
                  {dashboard.contas_receber.total > 0 && (
                    <div className="mt-2 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{
                          width: `${Math.round((dashboard.contas_receber.recebido / dashboard.contas_receber.total) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Saldo Bancário */}
                <div className="bg-background-primary border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <Landmark size={16} className="text-blue-500" />
                    </div>
                    <span className="text-xs font-medium text-foreground-secondary">Saldo Bancário</span>
                  </div>
                  <p className="text-lg font-bold text-foreground-primary">
                    {formatCurrency(dashboard.saldo_bancario.total)}
                  </p>
                  {dashboard.saldo_bancario.contas.length > 0 ? (
                    <div className="space-y-1 mt-1">
                      {dashboard.saldo_bancario.contas.map((conta, i) => (
                        <div key={i} className="flex justify-between text-[11px]">
                          <span className="text-foreground-tertiary truncate">{conta.name || conta.banco}</span>
                          <span className="text-foreground-secondary font-medium">
                            {formatCurrency(conta.current_balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-foreground-tertiary mt-1">Nenhuma conta bancária</p>
                  )}
                </div>
              </div>

              {/* KPI Cards Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Conciliação */}
                <div className="bg-background-primary border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <BarChart3 size={16} className="text-purple-500" />
                    </div>
                    <span className="text-xs font-medium text-foreground-secondary">Conciliação Bancária</span>
                  </div>
                  <div className="flex items-end gap-3">
                    <div>
                      <p className="text-2xl font-bold text-foreground-primary">
                        {dashboard.conciliacao.percentual}%
                      </p>
                      <p className="text-[11px] text-foreground-tertiary">
                        {dashboard.conciliacao.conciliadas} de {dashboard.conciliacao.total} transações
                      </p>
                    </div>
                    <div className="flex-1 h-2.5 bg-background-tertiary rounded-full overflow-hidden">
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
                </div>

                {/* Resultado — DRE Resumido */}
                <div className="bg-background-primary border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${
                      dashboard.resultado.liquido >= 0
                        ? "bg-green-100 dark:bg-green-900/20"
                        : "bg-red-100 dark:bg-red-900/20"
                    }`}>
                      {dashboard.resultado.liquido >= 0 ? (
                        <TrendingUp size={16} className="text-green-500" />
                      ) : (
                        <TrendingDown size={16} className="text-red-500" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-foreground-secondary">Resultado do Mes</span>
                  </div>
                  <p className={`text-2xl font-bold ${
                    dashboard.resultado.liquido >= 0 ? "text-green-600" : "text-red-500"
                  }`}>
                    {formatCurrency(dashboard.resultado.liquido)}
                  </p>
                  <div className="space-y-0.5 text-[11px] mt-1">
                    <div className="flex justify-between">
                      <span className="text-foreground-tertiary">Receitas</span>
                      <span className="text-green-600 font-medium">{formatCurrency(dashboard.resultado.receitas)}</span>
                    </div>
                    {dashboard.resultado.custos > 0 && (
                      <div className="flex justify-between">
                        <span className="text-foreground-tertiary">(-) Custos</span>
                        <span className="text-red-500 font-medium">{formatCurrency(dashboard.resultado.custos)}</span>
                      </div>
                    )}
                    {dashboard.resultado.despesas_operacionais > 0 && (
                      <div className="flex justify-between">
                        <span className="text-foreground-tertiary">(-) Despesas Op.</span>
                        <span className="text-red-500 font-medium">{formatCurrency(dashboard.resultado.despesas_operacionais)}</span>
                      </div>
                    )}
                    {dashboard.resultado.distribuicao_lucro > 0 && (
                      <div className="flex justify-between">
                        <span className="text-foreground-tertiary">(-) Antec. Lucro</span>
                        <span className="text-amber-600 font-medium">{formatCurrency(dashboard.resultado.distribuicao_lucro)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle size={24} className="mx-auto mb-2 text-foreground-tertiary opacity-50" />
              <p className="text-sm text-foreground-tertiary">Nenhum dado financeiro encontrado para este período.</p>
            </div>
          )}
        </>
      )}

      {/* Monthly Routine Checklist */}
      <div>
        <h4 className="text-sm font-semibold text-foreground-primary mb-3">
          Rotina Financeira Mensal
        </h4>
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 bg-background-secondary rounded-lg"
            >
              <Circle size={18} className="text-foreground-tertiary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground-primary">
                  {item.label}
                </p>
                <p className="text-xs text-foreground-tertiary mt-0.5">
                  {item.description}
                </p>
              </div>
              {item.autoCheck && (
                <span className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded shrink-0">
                  Auto
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3">
          <div className="flex items-center gap-2 text-xs text-foreground-tertiary">
            <div className="flex-1 h-2 bg-background-tertiary rounded-full overflow-hidden">
              <div className="h-full w-0 bg-green-500 rounded-full" />
            </div>
            <span>0/5 etapas</span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h4 className="text-sm font-semibold text-foreground-primary mb-3">
          Links Rápidos — Sistema Financeiro
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {QUICK_LINKS.map((link) => (
            <a
              key={link.path}
              href={`${BASE_URL}/${link.path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-background-secondary rounded-lg hover:bg-background-tertiary transition-colors group"
            >
              <span className="text-sm font-medium text-foreground-primary">
                {link.label}
              </span>
              <ExternalLink
                size={14}
                className="text-foreground-tertiary group-hover:text-brand-primary transition-colors"
              />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
