"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  History,
  ChevronDown,
  ChevronUp,
  Zap,
  Eye,
  HelpCircle,
  CircleCheck,
  Ban,
  Bot,
  ShieldCheck,
  Clock,
} from "lucide-react";
import api from "@/lib/api";

/* ── Types ── */

interface BankAccount {
  id: string;
  name: string;
  banco: string;
  agencia?: string;
  conta?: string;
  current_balance?: number;
}

interface ImportResult {
  success: boolean;
  file_name: string;
  total_in_file: number;
  imported: number;
  skipped_duplicates: number;
  skipped_details: {
    fitid: string;
    date: string;
    amount: number;
    description: string;
    reason: string;
  }[];
  date_range: { start: string | null; end: string | null };
  import_id: string | null;
}

interface ImportHistory {
  id: string;
  file_name: string;
  total_in_file: number;
  imported: number;
  skipped_dupes: number;
  date_range_start: string | null;
  date_range_end: string | null;
  imported_at: string;
  imported_by: string;
  conciliacao?: {
    total: number;
    conciliadas: number;
    pendentes: number;
    percentual: number;
    status: "conciliado" | "parcial" | "pendente" | "vazio" | "sem_dados" | "erro";
  };
}

interface PendingTx {
  id: string;
  fitid: string | null;
  date: string;
  amount: number;
  type: string;
  description: string;
  memo: string | null;
  status: string;
  sugestao_conta_id: string | null;
  confianca_match: number | null;
  metodo_match: string | null;
  imported_at: string | null;
}

interface ClientItem {
  id: string;
  company_name: string;
  trade_name: string | null;
  financial_company_id?: string | null;
}

/* ── Helpers ── */

function formatCurrency(value: number) {
  return Math.abs(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("pt-BR");
}

/* ── Component ── */

export default function ConciliacaoPage() {
  // State: client & account selection
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);

  // State: OFX import
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State: import history
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // State: pending transactions
  const [pendingTxs, setPendingTxs] = useState<PendingTx[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(false);

  // State: matching
  const [matchResult, setMatchResult] = useState<any>(null);

  // State: selection & save
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ conciliadas: number; erros: number } | null>(null);

  // State: summary
  const [summary, setSummary] = useState({
    autoConc: 0,
    sugeridos: 0,
    revisar: 0,
    total: 0,
  });

  /* ── Init: load clients ── */
  useEffect(() => {
    async function init() {
      try {
        const { data } = await api.get("/clients?per_page=200");
        const list: ClientItem[] = Array.isArray(data) ? data : data.items || [];
        setClients(
          list
            .filter((c) => c.financial_company_id)
            .sort((a, b) =>
              (a.trade_name || a.company_name).localeCompare(
                b.trade_name || b.company_name
              )
            )
        );
      } catch {
        /* noop */
      } finally {
        setLoadingInit(false);
      }
    }
    init();
  }, []);

  /* ── Load accounts when client changes ── */
  useEffect(() => {
    if (!selectedClientId) {
      setAccounts([]);
      setSelectedAccountId(null);
      return;
    }
    async function loadAccounts() {
      try {
        const { data } = await api.get(
          `/financeiro/bank-accounts/${selectedClientId}`
        );
        setAccounts(data);
        if (data.length === 1) {
          setSelectedAccountId(data[0].id);
        }
      } catch {
        setAccounts([]);
      }
    }
    loadAccounts();
  }, [selectedClientId]);

  /* ── Load pending txs + history when account changes ── */
  const loadData = useCallback(async () => {
    if (!selectedClientId || !selectedAccountId) return;
    setLoadingTxs(true);
    try {
      const [txRes, histRes] = await Promise.all([
        api.get(
          `/financeiro/extrato/${selectedClientId}?bank_account_id=${selectedAccountId}&per_page=200`
        ),
        api.get(`/financeiro/import-history/${selectedClientId}`),
      ]);
      const txs: PendingTx[] = txRes.data.items || [];
      setPendingTxs(txs);
      setHistory(histRes.data || []);

      // Compute summary
      const autoConc = txs.filter(
        (t) => t.confianca_match && t.confianca_match >= 85
      ).length;
      const sugeridos = txs.filter(
        (t) =>
          t.sugestao_conta_id &&
          (!t.confianca_match || t.confianca_match < 85)
      ).length;
      const revisar = txs.filter((t) => !t.sugestao_conta_id).length;
      setSummary({
        autoConc,
        sugeridos,
        revisar,
        total: txs.length,
      });
    } catch {
      /* noop */
    } finally {
      setLoadingTxs(false);
    }
  }, [selectedClientId, selectedAccountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── OFX Import ── */
  async function handleImportOFX(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedClientId || !selectedAccountId) return;

    setImporting(true);
    setImportResult(null);
    setImportError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post(
        `/financeiro/importar-ofx/${selectedClientId}?bank_account_id=${selectedAccountId}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60000,
        }
      );
      setImportResult(data);
      // Reload data
      await loadData();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setImportError(
        typeof detail === "string"
          ? detail
          : "Erro ao importar arquivo OFX."
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /* ── Selection ── */
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllWithSuggestion() {
    const ids = pendingTxs
      .filter((t) => t.sugestao_conta_id)
      .map((t) => t.id);
    setSelectedIds(new Set(ids));
  }

  function selectHighConfidence() {
    const ids = pendingTxs
      .filter((t) => t.confianca_match && t.confianca_match >= 85)
      .map((t) => t.id);
    setSelectedIds(new Set(ids));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  /* ── Save Conciliation ── */
  async function handleSaveConciliacao() {
    if (!selectedClientId || selectedIds.size === 0) return;
    setSaving(true);
    setSaveResult(null);
    try {
      const { data } = await api.post(
        `/financeiro/conciliar/${selectedClientId}`,
        { transaction_ids: Array.from(selectedIds) }
      );
      setSaveResult(data);
      setSelectedIds(new Set());
      await loadData();
    } catch {
      /* noop */
    } finally {
      setSaving(false);
    }
  }

  /* ── Render ── */
  if (loadingInit) {
    return (
      <PageWrapper
        title="Conciliacao Bancaria"
        breadcrumb={[
          { label: "Financeiro", href: "/financeiro" },
          { label: "Conciliacao Bancaria" },
        ]}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-brand-primary" size={32} />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Conciliacao Bancaria"
      breadcrumb={[
        { label: "Financeiro", href: "/financeiro" },
        { label: "Conciliacao Bancaria" },
      ]}
    >
      <div className="space-y-6 max-w-[1200px]">
        {/* ── Selectors Row ── */}
        <div className="flex flex-wrap gap-4 items-end">
          {/* Client Select */}
          <div className="flex-1 min-w-[250px]">
            <label className="block text-xs font-medium text-foreground-secondary mb-1">
              Empresa
            </label>
            <select
              value={selectedClientId || ""}
              onChange={(e) => {
                setSelectedClientId(e.target.value || null);
                setSelectedAccountId(null);
                setImportResult(null);
                setImportError(null);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background-primary text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            >
              <option value="">Selecione a empresa...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.trade_name || c.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* Account Select */}
          {selectedClientId && (
            <div className="flex-1 min-w-[250px]">
              <label className="block text-xs font-medium text-foreground-secondary mb-1">
                Conta Bancaria
              </label>
              <select
                value={selectedAccountId || ""}
                onChange={(e) => {
                  setSelectedAccountId(e.target.value || null);
                  setImportResult(null);
                  setImportError(null);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background-primary text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              >
                <option value="">Selecione a conta...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.banco} — {a.name}
                    {a.conta ? ` (${a.conta})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Import OFX Button */}
          {selectedAccountId && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ofx"
                onChange={handleImportOFX}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition disabled:opacity-50"
              >
                {importing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                Importar OFX
              </button>
            </div>
          )}
        </div>

        {/* ── Import Result ── */}
        {importResult && (
          <div
            className={`rounded-xl border p-4 ${
              importResult.skipped_duplicates > 0
                ? "bg-amber-50 border-amber-200"
                : "bg-emerald-50 border-emerald-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {importResult.skipped_duplicates > 0 ? (
                <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
              ) : (
                <CheckCircle2 size={20} className="text-emerald-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground-primary">
                  Importacao concluida — {importResult.file_name}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-foreground-secondary">Total no arquivo:</span>{" "}
                    <span className="font-semibold">{importResult.total_in_file}</span>
                  </div>
                  <div>
                    <span className="text-emerald-700">Importadas:</span>{" "}
                    <span className="font-semibold text-emerald-700">
                      {importResult.imported}
                    </span>
                  </div>
                  <div>
                    <span className="text-amber-700">Duplicatas ignoradas:</span>{" "}
                    <span className="font-semibold text-amber-700">
                      {importResult.skipped_duplicates}
                    </span>
                  </div>
                </div>

                {/* Skipped details */}
                {importResult.skipped_details.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs text-foreground-secondary cursor-pointer hover:text-foreground-primary">
                      Ver {importResult.skipped_duplicates} duplicatas ignoradas
                    </summary>
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-foreground-tertiary">
                            <th className="pb-1 pr-3">Data</th>
                            <th className="pb-1 pr-3">Valor</th>
                            <th className="pb-1 pr-3">Descricao</th>
                            <th className="pb-1">Motivo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importResult.skipped_details.map((s, i) => (
                            <tr key={i} className="border-t border-border/50">
                              <td className="py-1 pr-3">{formatDate(s.date)}</td>
                              <td className="py-1 pr-3">{formatCurrency(s.amount)}</td>
                              <td className="py-1 pr-3 max-w-[200px] truncate">
                                {s.description}
                              </td>
                              <td className="py-1 text-amber-600">{s.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Import Error ── */}
        {importError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
            <Ban size={20} className="text-red-600" />
            <p className="text-sm text-red-700">{importError}</p>
          </div>
        )}

        {/* ── Summary Cards ── */}
        {selectedAccountId && !loadingTxs && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              icon={<Zap size={20} className="text-emerald-600" />}
              value={summary.autoConc}
              label="Auto-conciliar"
              bg="bg-emerald-50"
            />
            <SummaryCard
              icon={<Eye size={20} className="text-amber-600" />}
              value={summary.sugeridos}
              label="Sugeridos"
              bg="bg-amber-50"
            />
            <SummaryCard
              icon={<HelpCircle size={20} className="text-gray-500" />}
              value={summary.revisar}
              label="Revisar"
              bg="bg-gray-50"
            />
            <SummaryCard
              icon={<CircleCheck size={20} className="text-blue-600" />}
              value={summary.total}
              label="Total pendentes"
              bg="bg-blue-50"
              highlight
            />
          </div>
        )}

        {/* ── History ── */}
        {history.length > 0 && (
          <div className="border border-border rounded-xl bg-background-primary">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-background-secondary/50 transition"
            >
              <div className="flex items-center gap-2">
                <History size={18} className="text-foreground-secondary" />
                <span className="text-sm font-medium">
                  Historico de Importacoes
                </span>
                <span className="text-xs bg-background-secondary text-foreground-secondary px-2 py-0.5 rounded-full">
                  {history.length}
                </span>
              </div>
              {historyOpen ? (
                <ChevronUp size={18} className="text-foreground-tertiary" />
              ) : (
                <ChevronDown size={18} className="text-foreground-tertiary" />
              )}
            </button>
            {historyOpen && (
              <div className="px-4 pb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-foreground-tertiary border-b border-border">
                      <th className="pb-2 pr-3">Arquivo</th>
                      <th className="pb-2 pr-3">Data</th>
                      <th className="pb-2 pr-3">Periodo</th>
                      <th className="pb-2 pr-3 text-right">Importadas</th>
                      <th className="pb-2 pr-3 text-right">Duplicatas</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => {
                      const conc = h.conciliacao;
                      return (
                        <tr key={h.id} className="border-b border-border/50">
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-2">
                              <FileText size={14} className="text-foreground-tertiary" />
                              {h.file_name}
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-foreground-secondary">
                            {formatDateTime(h.imported_at)}
                          </td>
                          <td className="py-2 pr-3 text-foreground-secondary">
                            {h.date_range_start
                              ? `${formatDate(h.date_range_start)} — ${formatDate(h.date_range_end || "")}`
                              : "-"}
                          </td>
                          <td className="py-2 pr-3 text-right font-medium text-emerald-700">
                            {h.imported}
                          </td>
                          <td className="py-2 pr-3 text-right font-medium text-amber-600">
                            {h.skipped_dupes}
                          </td>
                          <td className="py-2">
                            <ConciliacaoStatus conciliacao={conc} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Pending Transactions ── */}
        {selectedAccountId && (
          <div className="border border-border rounded-xl bg-background-primary">
            {/* Header + action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold">
                  Transacoes do Extrato (Pendentes)
                </h3>
                <p className="text-xs text-foreground-secondary">
                  {summary.total} itens importados do banco pendentes de conciliacao.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {summary.autoConc > 0 && (
                  <button
                    onClick={selectHighConfidence}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition"
                  >
                    <Zap size={13} />
                    Selecionar Alta Confianca ({summary.autoConc})
                  </button>
                )}
                {(summary.autoConc + summary.sugeridos) > 0 && (
                  <button
                    onClick={selectAllWithSuggestion}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition"
                  >
                    <CheckCircle2 size={13} />
                    Selecionar com Sugestao
                  </button>
                )}
                {selectedIds.size > 0 && (
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1.5 rounded-lg text-xs text-foreground-tertiary hover:text-foreground-primary hover:bg-background-secondary transition"
                  >
                    Limpar selecao
                  </button>
                )}
              </div>
            </div>

            {/* Floating save bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-brand-primary/5 border-b border-brand-primary/20">
                <span className="text-sm font-medium text-brand-primary">
                  {selectedIds.size} transacao(oes) selecionada(s)
                </span>
                <button
                  onClick={handleSaveConciliacao}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary/90 transition disabled:opacity-50 shadow-sm"
                >
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  Salvar Conciliacao
                </button>
              </div>
            )}

            {/* Save result */}
            {saveResult && (
              <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span className="text-sm text-emerald-700">
                  {saveResult.conciliadas} transacao(oes) conciliada(s) com sucesso.
                  {saveResult.erros > 0 && ` ${saveResult.erros} erro(s).`}
                </span>
              </div>
            )}

            {loadingTxs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-brand-primary" size={24} />
              </div>
            ) : pendingTxs.length === 0 ? (
              <div className="text-center py-12 text-foreground-secondary text-sm">
                Nenhuma transacao pendente.
                {!importResult && " Importe um arquivo OFX para comecar."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-foreground-tertiary bg-background-secondary/30">
                      <th className="pl-4 py-2.5 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === pendingTxs.length && pendingTxs.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(new Set(pendingTxs.map((t) => t.id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                          className="rounded border-border"
                        />
                      </th>
                      <th className="px-3 py-2.5">Data</th>
                      <th className="px-3 py-2.5">Descricao</th>
                      <th className="px-3 py-2.5 text-right">Valor</th>
                      <th className="px-3 py-2.5">Sugestao IA</th>
                      <th className="px-3 py-2.5 text-center">Confianca</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingTxs.map((tx) => {
                      const isSelected = selectedIds.has(tx.id);
                      return (
                        <tr
                          key={tx.id}
                          onClick={() => toggleSelect(tx.id)}
                          className={`border-t border-border/50 cursor-pointer transition ${
                            isSelected
                              ? "bg-brand-primary/5"
                              : "hover:bg-background-secondary/20"
                          }`}
                        >
                          <td className="pl-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(tx.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-border"
                            />
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-foreground-secondary">
                            {formatDate(tx.date)}
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-medium text-foreground-primary truncate max-w-[280px]">
                              {tx.description}
                            </div>
                            {tx.memo && (
                              <div className="text-xs text-foreground-tertiary truncate max-w-[280px]">
                                {tx.memo}
                              </div>
                            )}
                          </td>
                          <td
                            className={`px-3 py-3 text-right font-semibold whitespace-nowrap ${
                              tx.amount >= 0 ? "text-emerald-700" : "text-red-600"
                            }`}
                          >
                            {tx.amount >= 0 ? "+" : "-"} {formatCurrency(tx.amount)}
                          </td>
                          <td className="px-3 py-3">
                            {tx.sugestao_conta_id ? (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700">
                                <Bot size={12} /> Sugestao
                              </span>
                            ) : (
                              <span className="text-xs text-foreground-tertiary">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {tx.confianca_match ? (
                              <span
                                className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  tx.confianca_match >= 85
                                    ? "bg-emerald-100 text-emerald-700"
                                    : tx.confianca_match >= 60
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {tx.confianca_match}%
                              </span>
                            ) : (
                              <span className="text-foreground-tertiary">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Match Result Toast ── */}
        {matchResult && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-800">
              Motor de matching executado: {matchResult.auto_conciliados} auto-conciliadas,{" "}
              {matchResult.sugeridos} sugeridas, {matchResult.sem_match} sem match.
            </p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

/* ── Summary Card ── */
function SummaryCard({
  icon,
  value,
  label,
  bg,
  highlight,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  bg: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${bg} ${
        highlight ? "border-2 border-blue-200" : "border border-border/50"
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-bold text-foreground-primary">{value}</p>
          <p className="text-xs text-foreground-secondary">{label}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Conciliacao Status Badge ── */
function ConciliacaoStatus({
  conciliacao,
}: {
  conciliacao?: ImportHistory["conciliacao"];
}) {
  if (!conciliacao || conciliacao.status === "sem_dados") {
    return <span className="text-xs text-foreground-tertiary">—</span>;
  }

  const config = {
    conciliado: {
      label: "Conciliado",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      icon: <ShieldCheck size={13} />,
    },
    parcial: {
      label: `${conciliacao.percentual}% conciliado`,
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: <Clock size={13} />,
    },
    pendente: {
      label: "Pendente",
      bg: "bg-gray-50",
      text: "text-gray-600",
      border: "border-gray-200",
      icon: <Clock size={13} />,
    },
    vazio: {
      label: "Vazio",
      bg: "bg-gray-50",
      text: "text-gray-400",
      border: "border-gray-100",
      icon: null,
    },
    erro: {
      label: "Erro",
      bg: "bg-red-50",
      text: "text-red-600",
      border: "border-red-200",
      icon: null,
    },
  }[conciliacao.status];

  if (!config) return null;

  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${config.bg} ${config.text} ${config.border} w-fit`}
      >
        {config.icon}
        {config.label}
      </span>
      {conciliacao.status === "parcial" && (
        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all"
            style={{ width: `${conciliacao.percentual}%` }}
          />
        </div>
      )}
      {(conciliacao.status === "parcial" || conciliacao.status === "pendente") && (
        <span className="text-[10px] text-foreground-tertiary">
          {conciliacao.conciliadas}/{conciliacao.total} transacoes
        </span>
      )}
    </div>
  );
}
