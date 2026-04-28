"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Briefcase,
  Landmark,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";

interface ClientFluxoCaixaTabProps {
  clientId: string;
}

interface FluxoCaixa {
  periodo: { mes: number; ano: number };
  saldo_inicial: number;
  saldo_final: number;
  variacao_liquida: number;
  operacional: {
    total: number;
    recebimentos_clientes: number;
    pagamentos_fornecedores: number;
    pagamentos_pessoal: number;
    pagamentos_impostos: number;
  };
  investimento: {
    total: number;
    entradas: number;
    saidas: number;
  };
  financiamento: {
    total: number;
    entradas: number;
    saidas: number;
  };
  resumo: {
    entradas: number;
    saidas: number;
  };
  contas_bancarias: { name: string; banco: string; saldo: number }[];
  connected: boolean;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ClientFluxoCaixaTab({ clientId }: ClientFluxoCaixaTabProps) {
  const now = new Date();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FluxoCaixa | null>(null);
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [error, setError] = useState(false);

  async function fetchData(m: number, y: number) {
    setLoading(true);
    setError(false);
    try {
      const { data: result } = await api.get(
        `/financeiro/fluxo-caixa/${clientId}?mes=${m}&ano=${y}`
      );
      setData(result);
    } catch {
      setData(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(mes, ano);
  }, [clientId]);

  function handlePeriodChange(newMes: number, newAno: number) {
    setMes(newMes);
    setAno(newAno);
    fetchData(newMes, newAno);
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
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
          onClick={() => fetchData(mes, ano)}
          className="flex items-center gap-1.5 text-xs text-foreground-tertiary hover:text-brand-primary transition-colors"
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-brand-primary" />
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Erro ao carregar fluxo de caixa
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Verifique se o cliente possui vínculo com empresa financeira.
            </p>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-5">
          {/* Header Banner - Variação Líquida */}
          <div className={`rounded-xl p-5 ${
            data.variacao_liquida >= 0
              ? "bg-status-active"
              : "bg-status-churned"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white/80">
                  Fluxo de Caixa
                </h3>
                <p className="text-xs text-white/60">
                  {MESES[mes - 1]} {ano}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/60">Variação Líquida</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(data.variacao_liquida)}
                </p>
              </div>
            </div>
          </div>

          {/* Saldo Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-background-primary border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Wallet size={16} className="text-blue-500" />
                </div>
                <span className="text-xs font-medium text-foreground-secondary">Saldo Inicial</span>
              </div>
              <p className="text-lg font-bold text-foreground-primary">
                {formatCurrency(data.saldo_inicial)}
              </p>
            </div>

            <div className="bg-background-primary border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${
                  data.variacao_liquida >= 0
                    ? "bg-green-100 dark:bg-green-900/20"
                    : "bg-red-100 dark:bg-red-900/20"
                }`}>
                  {data.variacao_liquida >= 0 ? (
                    <TrendingUp size={16} className="text-green-500" />
                  ) : (
                    <TrendingDown size={16} className="text-red-500" />
                  )}
                </div>
                <span className="text-xs font-medium text-foreground-secondary">Variação no Período</span>
              </div>
              <p className={`text-lg font-bold ${
                data.variacao_liquida >= 0 ? "text-green-600" : "text-red-500"
              }`}>
                {formatCurrency(data.variacao_liquida)}
              </p>
            </div>

            <div className="bg-background-primary border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Landmark size={16} className="text-purple-500" />
                </div>
                <span className="text-xs font-medium text-foreground-secondary">Saldo Final</span>
              </div>
              <p className="text-lg font-bold text-foreground-primary">
                {formatCurrency(data.saldo_final)}
              </p>
            </div>
          </div>

          {/* Entradas vs Saídas Summary */}
          <div className="bg-background-primary border border-border rounded-xl p-4">
            <h4 className="text-sm font-semibold text-foreground-primary mb-3">Resumo do Período</h4>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="flex items-center gap-2">
                <ArrowDownCircle size={16} className="text-green-500" />
                <div>
                  <p className="text-xs text-foreground-tertiary">Total Entradas</p>
                  <p className="text-sm font-bold text-green-600">{formatCurrency(data.resumo.entradas)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpCircle size={16} className="text-red-500" />
                <div>
                  <p className="text-xs text-foreground-tertiary">Total Saídas</p>
                  <p className="text-sm font-bold text-red-500">{formatCurrency(data.resumo.saidas)}</p>
                </div>
              </div>
            </div>
            {data.resumo.entradas > 0 && (
              <div className="h-2 bg-background-tertiary rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-green-500 rounded-l-full"
                  style={{
                    width: `${Math.round(
                      (data.resumo.entradas / (data.resumo.entradas + data.resumo.saidas)) * 100
                    )}%`,
                  }}
                />
                <div
                  className="h-full bg-red-400 rounded-r-full"
                  style={{
                    width: `${Math.round(
                      (data.resumo.saidas / (data.resumo.entradas + data.resumo.saidas)) * 100
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>

          {/* DRE-style Cash Flow Statement Table */}
          <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h4 className="text-sm font-semibold text-foreground-primary">
                Demonstrativo do Fluxo de Caixa
              </h4>
              <p className="text-xs text-foreground-tertiary">
                {MESES[mes - 1]} {ano}
              </p>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-foreground-tertiary uppercase tracking-wide">
                    Conta
                  </th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-foreground-tertiary uppercase tracking-wide">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* ── Atividades Operacionais ── */}
                <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                  <td colSpan={2} className="px-5 py-2.5 font-semibold text-foreground-primary flex items-center gap-2">
                    <Building2 size={14} className="text-blue-500" />
                    ATIVIDADES OPERACIONAIS
                  </td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="px-5 py-2 pl-10 text-foreground-secondary">
                    (+) Recebimentos de Clientes
                  </td>
                  <td className="px-5 py-2 text-right font-medium text-green-600">
                    {formatCurrency(data.operacional.recebimentos_clientes)}
                  </td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="px-5 py-2 pl-10 text-foreground-secondary">
                    (-) Pagamentos a Fornecedores
                  </td>
                  <td className="px-5 py-2 text-right font-medium text-red-500">
                    {formatCurrency(-data.operacional.pagamentos_fornecedores)}
                  </td>
                </tr>
                {data.operacional.pagamentos_pessoal > 0 && (
                  <tr className="border-b border-border/30">
                    <td className="px-5 py-2 pl-10 text-foreground-secondary">
                      (-) Pagamentos de Pessoal
                    </td>
                    <td className="px-5 py-2 text-right font-medium text-red-500">
                      {formatCurrency(-data.operacional.pagamentos_pessoal)}
                    </td>
                  </tr>
                )}
                {data.operacional.pagamentos_impostos > 0 && (
                  <tr className="border-b border-border/30">
                    <td className="px-5 py-2 pl-10 text-foreground-secondary">
                      (-) Pagamentos de Impostos
                    </td>
                    <td className="px-5 py-2 text-right font-medium text-red-500">
                      {formatCurrency(-data.operacional.pagamentos_impostos)}
                    </td>
                  </tr>
                )}
                <tr className="border-b border-border bg-background-secondary/50">
                  <td className="px-5 py-2.5 font-semibold text-foreground-primary pl-7">
                    Caixa Líquido das Atividades Operacionais
                  </td>
                  <td className={`px-5 py-2.5 text-right font-bold ${
                    data.operacional.total >= 0 ? "text-green-600" : "text-red-500"
                  }`}>
                    {formatCurrency(data.operacional.total)}
                  </td>
                </tr>

                {/* ── Atividades de Investimento ── */}
                <tr className="bg-purple-50/50 dark:bg-purple-900/10">
                  <td colSpan={2} className="px-5 py-2.5 font-semibold text-foreground-primary flex items-center gap-2">
                    <Briefcase size={14} className="text-purple-500" />
                    ATIVIDADES DE INVESTIMENTO
                  </td>
                </tr>
                {data.investimento.entradas > 0 && (
                  <tr className="border-b border-border/30">
                    <td className="px-5 py-2 pl-10 text-foreground-secondary">
                      (+) Recebimentos de Investimentos
                    </td>
                    <td className="px-5 py-2 text-right font-medium text-green-600">
                      {formatCurrency(data.investimento.entradas)}
                    </td>
                  </tr>
                )}
                {data.investimento.saidas > 0 && (
                  <tr className="border-b border-border/30">
                    <td className="px-5 py-2 pl-10 text-foreground-secondary">
                      (-) Aquisição de Ativos/Investimentos
                    </td>
                    <td className="px-5 py-2 text-right font-medium text-red-500">
                      {formatCurrency(-data.investimento.saidas)}
                    </td>
                  </tr>
                )}
                {data.investimento.entradas === 0 && data.investimento.saidas === 0 && (
                  <tr className="border-b border-border/30">
                    <td className="px-5 py-2 pl-10 text-foreground-tertiary italic">
                      Sem movimentação no período
                    </td>
                    <td className="px-5 py-2 text-right text-foreground-tertiary">—</td>
                  </tr>
                )}
                <tr className="border-b border-border bg-background-secondary/50">
                  <td className="px-5 py-2.5 font-semibold text-foreground-primary pl-7">
                    Caixa Líquido das Atividades de Investimento
                  </td>
                  <td className={`px-5 py-2.5 text-right font-bold ${
                    data.investimento.total >= 0 ? "text-green-600" : "text-red-500"
                  }`}>
                    {formatCurrency(data.investimento.total)}
                  </td>
                </tr>

                {/* ── Atividades de Financiamento ── */}
                <tr className="bg-amber-50/50 dark:bg-amber-900/10">
                  <td colSpan={2} className="px-5 py-2.5 font-semibold text-foreground-primary flex items-center gap-2">
                    <Landmark size={14} className="text-amber-500" />
                    ATIVIDADES DE FINANCIAMENTO
                  </td>
                </tr>
                {data.financiamento.entradas > 0 && (
                  <tr className="border-b border-border/30">
                    <td className="px-5 py-2 pl-10 text-foreground-secondary">
                      (+) Empréstimos/Aportes Recebidos
                    </td>
                    <td className="px-5 py-2 text-right font-medium text-green-600">
                      {formatCurrency(data.financiamento.entradas)}
                    </td>
                  </tr>
                )}
                {data.financiamento.saidas > 0 && (
                  <tr className="border-b border-border/30">
                    <td className="px-5 py-2 pl-10 text-foreground-secondary">
                      (-) Amortizações/Distribuições
                    </td>
                    <td className="px-5 py-2 text-right font-medium text-red-500">
                      {formatCurrency(-data.financiamento.saidas)}
                    </td>
                  </tr>
                )}
                {data.financiamento.entradas === 0 && data.financiamento.saidas === 0 && (
                  <tr className="border-b border-border/30">
                    <td className="px-5 py-2 pl-10 text-foreground-tertiary italic">
                      Sem movimentação no período
                    </td>
                    <td className="px-5 py-2 text-right text-foreground-tertiary">—</td>
                  </tr>
                )}
                <tr className="border-b border-border bg-background-secondary/50">
                  <td className="px-5 py-2.5 font-semibold text-foreground-primary pl-7">
                    Caixa Líquido das Atividades de Financiamento
                  </td>
                  <td className={`px-5 py-2.5 text-right font-bold ${
                    data.financiamento.total >= 0 ? "text-green-600" : "text-red-500"
                  }`}>
                    {formatCurrency(data.financiamento.total)}
                  </td>
                </tr>

                {/* ── Resultado Final ── */}
                <tr className="bg-background-tertiary/30">
                  <td className="px-5 py-2 text-foreground-secondary font-medium">
                    Saldo Inicial de Caixa
                  </td>
                  <td className="px-5 py-2 text-right font-medium text-foreground-primary">
                    {formatCurrency(data.saldo_inicial)}
                  </td>
                </tr>
                <tr className="bg-background-tertiary/30">
                  <td className="px-5 py-2 text-foreground-secondary font-medium">
                    Variação Líquida de Caixa
                  </td>
                  <td className={`px-5 py-2 text-right font-medium ${
                    data.variacao_liquida >= 0 ? "text-green-600" : "text-red-500"
                  }`}>
                    {formatCurrency(data.variacao_liquida)}
                  </td>
                </tr>
                <tr className={`${
                  data.variacao_liquida >= 0
                    ? "bg-green-50 dark:bg-green-900/10"
                    : "bg-red-50 dark:bg-red-900/10"
                }`}>
                  <td className="px-5 py-3 font-bold text-foreground-primary text-base">
                    Saldo Final de Caixa
                  </td>
                  <td className={`px-5 py-3 text-right font-bold text-lg ${
                    data.saldo_final >= 0 ? "text-green-600" : "text-red-500"
                  }`}>
                    {formatCurrency(data.saldo_final)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bank Accounts Detail */}
          {data.contas_bancarias.length > 0 && (
            <div className="bg-background-primary border border-border rounded-xl p-4">
              <h4 className="text-sm font-semibold text-foreground-primary mb-3 flex items-center gap-2">
                <Landmark size={14} />
                Saldos por Conta Bancária
              </h4>
              <div className="space-y-2">
                {data.contas_bancarias.map((conta, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-background-secondary rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground-primary">
                        {conta.name || conta.banco}
                      </p>
                      {conta.banco && conta.name && (
                        <p className="text-xs text-foreground-tertiary">{conta.banco}</p>
                      )}
                    </div>
                    <p className={`text-sm font-bold ${
                      conta.saldo >= 0 ? "text-foreground-primary" : "text-red-500"
                    }`}>
                      {formatCurrency(conta.saldo)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          {!data.connected && (
            <p className="text-xs text-center text-amber-500">
              Dados de exemplo — integração financeira não configurada
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <AlertCircle size={24} className="mx-auto mb-2 text-foreground-tertiary opacity-50" />
          <p className="text-sm text-foreground-tertiary">
            Nenhum dado encontrado para este período.
          </p>
        </div>
      )}
    </div>
  );
}
