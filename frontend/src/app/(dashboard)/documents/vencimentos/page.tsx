"use client";

import { useEffect, useState, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  XCircle,
  FileText,
  Plus,
  X,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/api";

// ── Types ──────────────────────────────────────────

interface ValidityItem {
  id: string;
  document_id: string;
  document_name: string;
  document_category: string | null;
  issue_date: string | null;
  expiry_date: string;
  issuing_body: string | null;
  responsible: string | null;
  observations: string | null;
  status: string;
  days_remaining: number | null;
  alert_level: string; // ok | atencao | critico | vencido
}

interface ClientItem {
  id: string;
  company_name: string;
  trade_name: string | null;
  status: string;
  contract_start_date: string | null;
  contract_end_date: string | null;
  contracted_plan: string | null;
}

interface DocItem {
  id: string;
  name: string;
}

// ── Helpers ──────────────────────────────────────────

type Tab = "documentos" | "contratos";

const ALERT_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  vencido: { label: "Vencido", color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-900/20", icon: XCircle },
  critico: { label: "Vence em breve", color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-900/20", icon: AlertTriangle },
  atencao: { label: "Atenção", color: "text-yellow-600", bgColor: "bg-yellow-50 dark:bg-yellow-900/20", icon: Clock },
  ok: { label: "Vigente", color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-900/20", icon: CheckCircle2 },
};

function getContractStatus(endDate: string | null) {
  if (!endDate) return { label: "Indeterminado", color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-900/20", icon: Clock };
  const diff = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return ALERT_CONFIG.vencido;
  if (diff <= 30) return ALERT_CONFIG.critico;
  if (diff <= 90) return ALERT_CONFIG.atencao;
  return ALERT_CONFIG.ok;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + (d.includes("T") ? "" : "T00:00:00")).toLocaleDateString("pt-BR");
}

const CATEGORY_LABELS: Record<string, string> = {
  contrato: "Contrato",
  alvara: "Alvará",
  certidao: "Certidão",
  licenca: "Licença",
  certificado_digital: "Cert. Digital",
  nota_fiscal: "Nota Fiscal",
  guia_imposto: "Guia Imposto",
  outros: "Outros",
};

// ── Component ──────────────────────────────────────────

export default function VencimentosPage() {
  const [tab, setTab] = useState<Tab>("documentos");
  const [filter, setFilter] = useState<string>("all");

  // Document validities
  const [validities, setValidities] = useState<ValidityItem[]>([]);
  const [loadingValidities, setLoadingValidities] = useState(true);

  // Client contracts
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Modal: add validity
  const [showAddModal, setShowAddModal] = useState(false);
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [savingValidity, setSavingValidity] = useState(false);
  const [newValidity, setNewValidity] = useState({
    document_id: "",
    expiry_date: "",
    issue_date: "",
    issuing_body: "",
    responsible: "",
    observations: "",
  });

  const fetchValidities = useCallback(async () => {
    setLoadingValidities(true);
    try {
      const { data } = await api.get("/documents/validities");
      setValidities(Array.isArray(data) ? data : []);
    } catch {
      setValidities([]);
    } finally {
      setLoadingValidities(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const { data } = await api.get("/clients");
      const list = Array.isArray(data) ? data : data.items || [];
      setClients(list);
    } catch {
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  useEffect(() => { fetchValidities(); }, [fetchValidities]);
  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Fetch documents list for add modal
  async function openAddModal() {
    setShowAddModal(true);
    try {
      const { data } = await api.get("/documents/files?per_page=100");
      const items = data?.items ?? (Array.isArray(data) ? data : []);
      setDocuments(items.map((d: any) => ({ id: d.id, name: d.name })));
    } catch {
      setDocuments([]);
    }
  }

  async function handleAddValidity(e: React.FormEvent) {
    e.preventDefault();
    if (!newValidity.document_id || !newValidity.expiry_date) return;
    setSavingValidity(true);
    try {
      await api.post("/documents/validities", {
        document_id: newValidity.document_id,
        expiry_date: newValidity.expiry_date,
        issue_date: newValidity.issue_date || null,
        issuing_body: newValidity.issuing_body || null,
        responsible: newValidity.responsible || null,
        observations: newValidity.observations || null,
      });
      setShowAddModal(false);
      setNewValidity({ document_id: "", expiry_date: "", issue_date: "", issuing_body: "", responsible: "", observations: "" });
      fetchValidities();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao adicionar validade");
    } finally {
      setSavingValidity(false);
    }
  }

  // ── Computed ──

  const filteredValidities = filter === "all"
    ? validities
    : validities.filter((v) => v.alert_level === filter);

  const filteredClients = (() => {
    if (filter === "all") return clients;
    return clients.filter((c) => {
      if (!c.contract_end_date) return false;
      const diff = Math.ceil((new Date(c.contract_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (filter === "vencido") return diff < 0;
      if (filter === "critico") return diff >= 0 && diff <= 30;
      if (filter === "atencao") return diff > 30 && diff <= 90;
      if (filter === "ok") return diff > 90;
      return true;
    });
  })();

  const vencidoCount = tab === "documentos"
    ? validities.filter((v) => v.alert_level === "vencido").length
    : clients.filter((c) => c.contract_end_date && new Date(c.contract_end_date) < new Date()).length;

  const criticoCount = tab === "documentos"
    ? validities.filter((v) => v.alert_level === "critico").length
    : clients.filter((c) => {
      if (!c.contract_end_date) return false;
      const diff = Math.ceil((new Date(c.contract_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 30;
    }).length;

  const totalCount = tab === "documentos" ? validities.length : clients.length;

  const loading = tab === "documentos" ? loadingValidities : loadingClients;

  const inputClass =
    "w-full h-10 px-3 border border-border rounded-lg bg-background-primary text-foreground-primary text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30";

  return (
    <PageWrapper
      title="Controle de Vencimentos"
      breadcrumb={[
        { label: "Documentos", href: "/documents" },
        { label: "Vencimentos" },
      ]}
      actions={
        tab === "documentos" ? (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            Adicionar Vencimento
          </button>
        ) : undefined
      }
    >
      {/* Tab Selector */}
      <div className="flex items-center gap-1 bg-background-secondary rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => { setTab("documentos"); setFilter("all"); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "documentos" ? "bg-background-primary shadow-sm text-foreground-primary" : "text-foreground-tertiary hover:text-foreground-secondary"
          }`}
        >
          <FileText size={14} className="inline mr-1.5" />
          Documentos
        </button>
        <button
          onClick={() => { setTab("contratos"); setFilter("all"); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "contratos" ? "bg-background-primary shadow-sm text-foreground-primary" : "text-foreground-tertiary hover:text-foreground-secondary"
          }`}
        >
          <Calendar size={14} className="inline mr-1.5" />
          Contratos de Clientes
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`p-4 rounded-xl border transition-colors text-left ${
            filter === "all" ? "border-brand-primary bg-brand-primary/5" : "border-border bg-background-primary hover:bg-background-secondary"
          }`}
        >
          <p className="text-2xl font-bold text-foreground-primary">{totalCount}</p>
          <p className="text-xs text-foreground-tertiary">Total</p>
        </button>
        <button
          onClick={() => setFilter("critico")}
          className={`p-4 rounded-xl border transition-colors text-left ${
            filter === "critico" ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10" : "border-border bg-background-primary hover:bg-background-secondary"
          }`}
        >
          <p className="text-2xl font-bold text-amber-500">{criticoCount}</p>
          <p className="text-xs text-foreground-tertiary">Vencem em 30d</p>
        </button>
        <button
          onClick={() => setFilter("vencido")}
          className={`p-4 rounded-xl border transition-colors text-left ${
            filter === "vencido" ? "border-red-500 bg-red-50 dark:bg-red-900/10" : "border-border bg-background-primary hover:bg-background-secondary"
          }`}
        >
          <p className="text-2xl font-bold text-red-500">{vencidoCount}</p>
          <p className="text-xs text-foreground-tertiary">Vencidos</p>
        </button>
        <button
          onClick={() => setFilter("ok")}
          className={`p-4 rounded-xl border transition-colors text-left ${
            filter === "ok" ? "border-green-500 bg-green-50 dark:bg-green-900/10" : "border-border bg-background-primary hover:bg-background-secondary"
          }`}
        >
          <p className="text-2xl font-bold text-green-500">
            {tab === "documentos"
              ? validities.filter((v) => v.alert_level === "ok").length
              : clients.filter((c) => {
                  if (!c.contract_end_date) return false;
                  const diff = Math.ceil((new Date(c.contract_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return diff > 90;
                }).length}
          </p>
          <p className="text-xs text-foreground-tertiary">Vigentes</p>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-primary" />
        </div>
      ) : tab === "documentos" ? (
        /* ── Document Validities Table ── */
        <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background-secondary">
                <th className="text-left px-4 py-3 font-medium text-foreground-tertiary">Documento</th>
                <th className="text-left px-4 py-3 font-medium text-foreground-tertiary">Categoria</th>
                <th className="text-left px-4 py-3 font-medium text-foreground-tertiary">Emissão</th>
                <th className="text-left px-4 py-3 font-medium text-foreground-tertiary">Vencimento</th>
                <th className="text-left px-4 py-3 font-medium text-foreground-tertiary">Responsável</th>
                <th className="text-left px-4 py-3 font-medium text-foreground-tertiary">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredValidities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <FileText size={32} className="mx-auto mb-2 text-foreground-tertiary opacity-50" />
                    <p className="text-foreground-tertiary text-sm">
                      {validities.length === 0 ? "Nenhum vencimento cadastrado" : "Nenhum documento nesta categoria"}
                    </p>
                    {validities.length === 0 && (
                      <button
                        onClick={openAddModal}
                        className="mt-3 text-xs text-brand-primary hover:underline"
                      >
                        Adicionar primeiro vencimento
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredValidities.map((v) => {
                  const config = ALERT_CONFIG[v.alert_level] || ALERT_CONFIG.ok;
                  const StatusIcon = config.icon;
                  return (
                    <tr key={v.id} className="border-b border-border/50 hover:bg-background-secondary/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground-primary">{v.document_name}</p>
                        {v.issuing_body && (
                          <p className="text-xs text-foreground-tertiary">{v.issuing_body}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary">
                        {v.document_category ? (CATEGORY_LABELS[v.document_category] || v.document_category) : "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary tabular-nums">
                        {formatDate(v.issue_date)}
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary tabular-nums">
                        {formatDate(v.expiry_date)}
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary">
                        {v.responsible || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
                          <StatusIcon size={12} />
                          {v.days_remaining !== null && v.days_remaining >= 0
                            ? `${v.days_remaining}d`
                            : config.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Client Contracts Table ── */
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
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Calendar size={32} className="mx-auto mb-2 text-foreground-tertiary opacity-50" />
                    <p className="text-foreground-tertiary text-sm">Nenhum contrato nesta categoria</p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
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
                      <td className="px-4 py-3 text-foreground-secondary tabular-nums">
                        {formatDate(client.contract_start_date)}
                      </td>
                      <td className="px-4 py-3 text-foreground-secondary tabular-nums">
                        {client.contract_end_date ? formatDate(client.contract_end_date) : "Indeterminado"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color} ${status.bgColor}`}>
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
      )}

      {/* Add Validity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-background-primary border border-border rounded-xl w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground-primary">Adicionar Vencimento</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 text-foreground-tertiary hover:text-foreground-primary rounded-lg hover:bg-background-tertiary">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddValidity} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Documento</label>
                <select
                  value={newValidity.document_id}
                  onChange={(e) => setNewValidity({ ...newValidity, document_id: e.target.value })}
                  className={inputClass}
                  required
                >
                  <option value="">Selecione...</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Data Emissão</label>
                  <input
                    type="date"
                    value={newValidity.issue_date}
                    onChange={(e) => setNewValidity({ ...newValidity, issue_date: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Data Vencimento *</label>
                  <input
                    type="date"
                    value={newValidity.expiry_date}
                    onChange={(e) => setNewValidity({ ...newValidity, expiry_date: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Órgão Emissor</label>
                <input
                  type="text"
                  value={newValidity.issuing_body}
                  onChange={(e) => setNewValidity({ ...newValidity, issuing_body: e.target.value })}
                  placeholder="Ex: Prefeitura, Receita Federal..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Responsável</label>
                <input
                  type="text"
                  value={newValidity.responsible}
                  onChange={(e) => setNewValidity({ ...newValidity, responsible: e.target.value })}
                  placeholder="Quem deve renovar"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground-secondary mb-1.5">Observações</label>
                <textarea
                  value={newValidity.observations}
                  onChange={(e) => setNewValidity({ ...newValidity, observations: e.target.value })}
                  rows={2}
                  className={inputClass + " h-auto py-2"}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground-secondary hover:bg-background-tertiary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingValidity || !newValidity.document_id || !newValidity.expiry_date}
                  className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {savingValidity ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {savingValidity ? "Salvando..." : "Adicionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
