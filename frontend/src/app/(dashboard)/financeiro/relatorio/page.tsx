"use client";

import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Download,
  Send,
  Eye,
  Users,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  X,
} from "lucide-react";
import api from "@/lib/api";

interface ClientItem {
  id: string;
  company_name: string;
  trade_name: string | null;
  financial_company_id?: string | null;
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

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function RelatorioPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState("");
  const [dashboard, setDashboard] = useState<FinancialDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [sending, setSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ sent: boolean; reason?: string } | null>(null);

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

  async function loadReport(clientId?: string) {
    const cid = clientId || selectedClientId;
    if (!cid) return;

    setSelectedClientId(cid);
    const client = clients.find((c) => c.id === cid);
    setSelectedClientName(
      client?.trade_name || client?.company_name || ""
    );
    setReportLoading(true);
    setShowPreview(false);
    setDashboard(null);
    try {
      const { data } = await api.get(
        `/financeiro/dashboard/${cid}?mes=${mes}&ano=${ano}`
      );
      setDashboard(data);
      setShowPreview(true);
    } catch (err) {
      console.error("Erro ao carregar relatório:", err);
      setDashboard(null);
    } finally {
      setReportLoading(false);
    }
  }

  function prevMonth() {
    if (mes === 1) {
      setMes(12);
      setAno(ano - 1);
    } else {
      setMes(mes - 1);
    }
    setShowPreview(false);
    setDashboard(null);
  }

  function nextMonth() {
    if (mes === 12) {
      setMes(1);
      setAno(ano + 1);
    } else {
      setMes(mes + 1);
    }
    setShowPreview(false);
    setDashboard(null);
  }

  async function handleExportPdf() {
    if (!selectedClientId) return;
    setExporting(true);
    try {
      const { data: html } = await api.get(
        `/financeiro/relatorio/export/${selectedClientId}?mes=${mes}&ano=${ano}`,
        { responseType: "text" }
      );
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
      }
    } catch {
      // fallback: print current page section
      window.print();
    } finally {
      setExporting(false);
    }
  }

  async function handleSendEmail() {
    if (!selectedClientId || !emailTo.trim()) return;
    setSending(true);
    setEmailResult(null);
    try {
      const { data } = await api.post(
        `/financeiro/relatorio/email/${selectedClientId}`,
        { to_email: emailTo.trim(), mes, ano }
      );
      setEmailResult(data);
      if (data.sent) {
        setTimeout(() => {
          setShowEmailModal(false);
          setEmailResult(null);
        }, 2000);
      }
    } catch {
      setEmailResult({ sent: false, reason: "Erro ao enviar email" });
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <PageWrapper
        title="Relatório Mensal"
        breadcrumb={[
          { label: "Financeiro", href: "/financeiro" },
          { label: "Relatório Mensal" },
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
      title="Relatório Mensal"
      breadcrumb={[
        { label: "Financeiro", href: "/financeiro" },
        { label: "Relatório Mensal" },
      ]}
    >
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Period Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-background-secondary transition-colors"
          >
            <ChevronLeft size={18} className="text-foreground-secondary" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-brand-primary" />
            <span className="text-base font-semibold text-foreground-primary">
              {MESES[mes - 1]} {ano}
            </span>
          </div>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-background-secondary transition-colors"
          >
            <ChevronRight size={18} className="text-foreground-secondary" />
          </button>
        </div>

        {/* Client Selector */}
        <select
          value={selectedClientId || ""}
          onChange={(e) => {
            setSelectedClientId(e.target.value || null);
            setShowPreview(false);
            setDashboard(null);
          }}
          className="text-sm bg-background-secondary border border-border rounded-lg px-3 py-2 text-foreground-primary min-w-[220px]"
        >
          <option value="">Selecione um cliente...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.trade_name || c.company_name}
            </option>
          ))}
        </select>

        {/* Emitir Relatório Button */}
        <button
          onClick={() => loadReport()}
          disabled={!selectedClientId || reportLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {reportLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <FileText size={16} />
          )}
          {reportLoading ? "Gerando..." : "Emitir Relatório"}
        </button>

        {/* Action buttons */}
        {showPreview && dashboard && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground-primary bg-background-secondary border border-border rounded-lg hover:border-brand-primary/40 transition-colors disabled:opacity-60"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Exportar PDF
            </button>
            <button
              onClick={() => {
                setEmailTo("");
                setEmailResult(null);
                setShowEmailModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 transition-colors"
            >
              <Send size={14} />
              Enviar por Email
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {!showPreview && !reportLoading ? (
        <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
          <FileText size={48} className="mx-auto mb-3 text-foreground-tertiary opacity-40" />
          <p className="text-sm text-foreground-tertiary">
            {!selectedClientId
              ? "Selecione um cliente e período, depois clique em \"Emitir Relatório\""
              : "Clique em \"Emitir Relatório\" para gerar o relatório mensal"}
          </p>
        </div>
      ) : reportLoading ? (
        <div className="bg-background-primary border border-border rounded-xl p-12 text-center">
          <Loader2 size={24} className="animate-spin text-brand-primary mx-auto mb-3" />
          <p className="text-sm text-foreground-tertiary">Carregando dados financeiros...</p>
        </div>
      ) : showPreview && dashboard ? (
        <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
          {/* Report Preview */}
          <div className="p-8 max-w-3xl mx-auto">
            {/* Report Header */}
            <div className="text-center mb-8 pb-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground-primary mb-1">
                Relatório Financeiro Mensal
              </h2>
              <p className="text-sm text-foreground-secondary">
                {selectedClientName}
              </p>
              <p className="text-sm text-foreground-tertiary">
                {MESES[mes - 1]} de {ano}
              </p>
            </div>

            {/* Section: Contas a Pagar */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpCircle size={18} className="text-red-500" />
                <h3 className="text-base font-semibold text-foreground-primary">
                  Contas a Pagar
                </h3>
              </div>
              <div className="bg-background-secondary rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="px-4 py-2.5 text-foreground-secondary">Total do Período</td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground-primary">
                        {formatCurrency(dashboard.contas_pagar.total)}
                      </td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="px-4 py-2.5 text-foreground-secondary">Pago</td>
                      <td className="px-4 py-2.5 text-right font-medium text-green-600">
                        {formatCurrency(dashboard.contas_pagar.pago)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-foreground-secondary">Pendente</td>
                      <td className="px-4 py-2.5 text-right font-medium text-red-500">
                        {formatCurrency(dashboard.contas_pagar.pendente)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section: Contas a Receber */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <ArrowDownCircle size={18} className="text-green-500" />
                <h3 className="text-base font-semibold text-foreground-primary">
                  Contas a Receber
                </h3>
              </div>
              <div className="bg-background-secondary rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="px-4 py-2.5 text-foreground-secondary">Total do Período</td>
                      <td className="px-4 py-2.5 text-right font-medium text-foreground-primary">
                        {formatCurrency(dashboard.contas_receber.total)}
                      </td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="px-4 py-2.5 text-foreground-secondary">Recebido</td>
                      <td className="px-4 py-2.5 text-right font-medium text-green-600">
                        {formatCurrency(dashboard.contas_receber.recebido)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-foreground-secondary">Pendente</td>
                      <td className="px-4 py-2.5 text-right font-medium text-amber-500">
                        {formatCurrency(dashboard.contas_receber.pendente)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section: Saldo Bancário */}
            {dashboard.saldo_bancario.contas.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={18} className="text-blue-500" />
                  <h3 className="text-base font-semibold text-foreground-primary">
                    Saldos Bancários
                  </h3>
                </div>
                <div className="bg-background-secondary rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-foreground-tertiary uppercase">
                          Conta
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-foreground-tertiary uppercase">
                          Saldo
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.saldo_bancario.contas.map((conta, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="px-4 py-2.5 text-foreground-secondary">
                            {conta.name || conta.banco}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-foreground-primary">
                            {formatCurrency(conta.current_balance)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-background-tertiary/50">
                        <td className="px-4 py-2.5 font-semibold text-foreground-primary">
                          Total
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-foreground-primary">
                          {formatCurrency(dashboard.saldo_bancario.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Section: Conciliação */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Eye size={18} className="text-purple-500" />
                <h3 className="text-base font-semibold text-foreground-primary">
                  Conciliação Bancária
                </h3>
              </div>
              <div className="bg-background-secondary rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-foreground-secondary">
                    {dashboard.conciliacao.conciliadas} de {dashboard.conciliacao.total} transações conciliadas
                  </span>
                  <span className={`text-sm font-semibold ${
                    dashboard.conciliacao.percentual === 100
                      ? "text-green-600"
                      : "text-amber-500"
                  }`}>
                    {dashboard.conciliacao.percentual}%
                  </span>
                </div>
                <div className="h-2.5 bg-background-tertiary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      dashboard.conciliacao.percentual === 100
                        ? "bg-green-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${dashboard.conciliacao.percentual}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Section: Resultado */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                {dashboard.resultado.liquido >= 0 ? (
                  <TrendingUp size={18} className="text-green-500" />
                ) : (
                  <TrendingDown size={18} className="text-red-500" />
                )}
                <h3 className="text-base font-semibold text-foreground-primary">
                  Resultado do Período
                </h3>
              </div>
              <div className="bg-background-secondary rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="px-4 py-2.5 text-foreground-secondary">Receitas</td>
                      <td className="px-4 py-2.5 text-right font-medium text-green-600">
                        {formatCurrency(dashboard.resultado.receitas)}
                      </td>
                    </tr>
                    {dashboard.resultado.custos > 0 && (
                      <tr className="border-b border-border/50">
                        <td className="px-4 py-2.5 text-foreground-secondary">(-) Custos (CSP)</td>
                        <td className="px-4 py-2.5 text-right font-medium text-red-500">
                          {formatCurrency(dashboard.resultado.custos)}
                        </td>
                      </tr>
                    )}
                    {dashboard.resultado.despesas_operacionais > 0 && (
                      <tr className="border-b border-border/50">
                        <td className="px-4 py-2.5 text-foreground-secondary">(-) Despesas Operacionais</td>
                        <td className="px-4 py-2.5 text-right font-medium text-red-500">
                          {formatCurrency(dashboard.resultado.despesas_operacionais)}
                        </td>
                      </tr>
                    )}
                    {dashboard.resultado.distribuicao_lucro > 0 && (
                      <tr className="border-b border-border/50">
                        <td className="px-4 py-2.5 text-foreground-secondary">(-) Antecipacao de Lucro</td>
                        <td className="px-4 py-2.5 text-right font-medium text-amber-600">
                          {formatCurrency(dashboard.resultado.distribuicao_lucro)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-background-tertiary/50">
                      <td className="px-4 py-3 font-semibold text-foreground-primary">
                        Resultado Líquido
                      </td>
                      <td className={`px-4 py-3 text-right font-bold text-lg ${
                        dashboard.resultado.liquido >= 0 ? "text-green-600" : "text-red-500"
                      }`}>
                        {formatCurrency(dashboard.resultado.liquido)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-border text-center">
              <p className="text-xs text-foreground-tertiary">
                Relatório gerado automaticamente pelo Central Tática —{" "}
                {new Date().toLocaleDateString("pt-BR")}
              </p>
              {!dashboard.connected && (
                <p className="text-xs text-amber-500 mt-1">
                  Dados de exemplo — integração financeira não configurada
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background-primary border border-border rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground-primary">
                Enviar Relatório por Email
              </h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-1 rounded-lg hover:bg-background-secondary transition-colors"
              >
                <X size={18} className="text-foreground-tertiary" />
              </button>
            </div>

            <p className="text-sm text-foreground-secondary mb-1">
              {selectedClientName} — {MESES[mes - 1]} {ano}
            </p>

            <div className="mt-4">
              <label className="text-xs font-medium text-foreground-secondary mb-1 block">
                Email do destinatário
              </label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="cliente@empresa.com"
                className="w-full text-sm bg-background-secondary border border-border rounded-lg px-3 py-2 text-foreground-primary placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
              />
            </div>

            {emailResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${
                emailResult.sent
                  ? "bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400"
              }`}>
                {emailResult.sent ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={16} /> Email enviado com sucesso!
                  </span>
                ) : (
                  emailResult.reason || "Erro ao enviar"
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-xs font-medium text-foreground-secondary bg-background-secondary border border-border rounded-lg hover:bg-background-tertiary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending || !emailTo.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-60"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
