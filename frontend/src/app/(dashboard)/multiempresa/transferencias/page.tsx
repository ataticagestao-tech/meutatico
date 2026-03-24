"use client";

import { useEffect, useState, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Plus,
  ArrowRightLeft,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  Filter,
} from "lucide-react";
import api from "@/lib/api";

interface Transferencia {
  id: string;
  company_origem_id: string;
  company_destino_id: string;
  valor: number;
  data: string;
  natureza: string;
  descricao: string | null;
  status: string;
  gera_juros: boolean;
  taxa_juros_mensal: number | null;
  eliminado_consolidado: boolean;
  aprovado_por: string | null;
  aprovado_em: string | null;
  created_at: string;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

const naturezaLabels: Record<string, string> = {
  mutuo: "Mútuo",
  adiantamento: "Adiantamento",
  capital: "Capital",
  operacional: "Operacional",
  outros: "Outros",
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pendente: { label: "Pendente", color: "text-amber-600 bg-amber-50", icon: Clock },
  aprovada: { label: "Aprovada", color: "text-blue-600 bg-blue-50", icon: CheckCircle2 },
  concluida: { label: "Concluída", color: "text-green-600 bg-green-50", icon: CheckCircle2 },
  cancelada: { label: "Cancelada", color: "text-red-600 bg-red-50", icon: XCircle },
};

export default function TransferenciasPage() {
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    company_origem_id: "",
    company_destino_id: "",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
    natureza: "operacional",
    descricao: "",
    gera_juros: false,
    taxa_juros_mensal: "",
  });

  const fetchTransferencias = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      const { data } = await api.get(`/multiempresa/transferencias/?${params}`);
      setTransferencias(Array.isArray(data) ? data : []);
    } catch {
      setTransferencias([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchTransferencias(); }, [fetchTransferencias]);

  const handleSave = async () => {
    if (!form.company_origem_id || !form.company_destino_id || !form.valor) return;
    setSaving(true);
    try {
      await api.post("/multiempresa/transferencias/", {
        company_origem_id: form.company_origem_id,
        company_destino_id: form.company_destino_id,
        valor: parseFloat(form.valor),
        data: form.data,
        natureza: form.natureza,
        descricao: form.descricao || null,
        gera_juros: form.gera_juros,
        taxa_juros_mensal: form.taxa_juros_mensal ? parseFloat(form.taxa_juros_mensal) : null,
      });
      setShowForm(false);
      setForm({
        company_origem_id: "",
        company_destino_id: "",
        valor: "",
        data: new Date().toISOString().slice(0, 10),
        natureza: "operacional",
        descricao: "",
        gera_juros: false,
        taxa_juros_mensal: "",
      });
      fetchTransferencias();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const handleAprovar = async (id: string, status: "aprovada" | "cancelada") => {
    try {
      await api.post(`/multiempresa/transferencias/${id}/aprovar`, { status });
      fetchTransferencias();
    } catch { /* ignore */ }
  };

  const handleConcluir = async (id: string) => {
    try {
      await api.post(`/multiempresa/transferencias/${id}/concluir`);
      fetchTransferencias();
    } catch { /* ignore */ }
  };

  const totais = {
    pendentes: transferencias.filter((t) => t.status === "pendente").reduce((s, t) => s + t.valor, 0),
    concluidas: transferencias.filter((t) => t.status === "concluida").reduce((s, t) => s + t.valor, 0),
  };

  return (
    <PageWrapper title="Transferências Intercompany" subtitle="Movimentações entre empresas do grupo">
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs text-amber-600 font-medium">Pendentes</p>
            <p className="text-xl font-bold text-amber-700">{formatCurrency(totais.pendentes)}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <p className="text-xs text-green-600 font-medium">Concluídas</p>
            <p className="text-xl font-bold text-green-700">{formatCurrency(totais.concluidas)}</p>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
            <p className="text-xs text-zinc-500 font-medium">Total de Registros</p>
            <p className="text-xl font-bold text-zinc-800">{transferencias.length}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-zinc-400" />
            <select
              className="text-sm border border-zinc-300 rounded-lg px-3 py-1.5"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="aprovada">Aprovada</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus size={16} /> Nova Transferência
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : transferencias.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhuma transferência registrada</p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Data</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Origem → Destino</th>
                  <th className="text-left px-4 py-3 font-medium text-zinc-600">Natureza</th>
                  <th className="text-right px-4 py-3 font-medium text-zinc-600">Valor</th>
                  <th className="text-center px-4 py-3 font-medium text-zinc-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-zinc-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {transferencias.map((t) => {
                  const sc = statusConfig[t.status] || statusConfig.pendente;
                  const Icon = sc.icon;
                  return (
                    <tr key={t.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3">{formatDate(t.data)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono">{t.company_origem_id.slice(0, 8)}</span>
                        <span className="mx-1 text-zinc-400">→</span>
                        <span className="text-xs font-mono">{t.company_destino_id.slice(0, 8)}</span>
                        {t.descricao && (
                          <p className="text-xs text-zinc-400 mt-0.5">{t.descricao}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                          {naturezaLabels[t.natureza] || t.natureza}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(t.valor)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
                          <Icon size={12} /> {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {t.status === "pendente" && (
                            <>
                              <button
                                onClick={() => handleAprovar(t.id, "aprovada")}
                                className="text-xs text-green-600 hover:underline"
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={() => handleAprovar(t.id, "cancelada")}
                                className="text-xs text-red-600 hover:underline ml-2"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          {t.status === "aprovada" && (
                            <button
                              onClick={() => handleConcluir(t.id)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Concluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Nova Transferência */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Nova Transferência</h3>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-zinc-700">Empresa Origem (ID)</label>
                <input
                  className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm"
                  value={form.company_origem_id}
                  onChange={(e) => setForm((f) => ({ ...f, company_origem_id: e.target.value }))}
                  placeholder="UUID da empresa origem"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700">Empresa Destino (ID)</label>
                <input
                  className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm"
                  value={form.company_destino_id}
                  onChange={(e) => setForm((f) => ({ ...f, company_destino_id: e.target.value }))}
                  placeholder="UUID da empresa destino"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-zinc-700">Valor</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm"
                    value={form.valor}
                    onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-700">Data</label>
                  <input
                    type="date"
                    className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm"
                    value={form.data}
                    onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700">Natureza</label>
                <select
                  className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm"
                  value={form.natureza}
                  onChange={(e) => setForm((f) => ({ ...f, natureza: e.target.value }))}
                >
                  <option value="mutuo">Mútuo</option>
                  <option value="adiantamento">Adiantamento</option>
                  <option value="capital">Capital</option>
                  <option value="operacional">Operacional</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700">Descrição</label>
                <input
                  className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm"
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="gera_juros"
                  checked={form.gera_juros}
                  onChange={(e) => setForm((f) => ({ ...f, gera_juros: e.target.checked }))}
                />
                <label htmlFor="gera_juros" className="text-sm text-zinc-700">Gera juros</label>
              </div>
              {form.gera_juros && (
                <div>
                  <label className="text-sm font-medium text-zinc-700">Taxa de juros mensal (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm"
                    value={form.taxa_juros_mensal}
                    onChange={(e) => setForm((f) => ({ ...f, taxa_juros_mensal: e.target.value }))}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-zinc-300 rounded-lg hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
