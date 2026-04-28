"use client";

import { useEffect, useState, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Plus,
  FileText,
  Loader2,
  Trash2,
  X,
  BarChart3,
  Check,
  ChevronDown,
} from "lucide-react";
import api from "@/lib/api";

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

interface Relatorio {
  id: string;
  nome: string;
  tipo: string;
  empresas_ids: string[];
  competencia_inicio: string;
  competencia_fim: string;
  indicador: string | null;
  resultado_json: Record<string, unknown> | null;
  gerado_em: string | null;
  created_at: string;
}

const tipoLabels: Record<string, string> = {
  dre_comparativo: "DRE Comparativo",
  fluxo_caixa_comparativo: "Fluxo de Caixa Comparativo",
  indicadores_comparativos: "Indicadores Comparativos",
  ranking_empresas: "Ranking de Empresas",
  evolucao_historica: "Evolução Histórica",
};

export default function RelatoriosPage() {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const now = new Date();
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [form, setForm] = useState({
    nome: "",
    tipo: "dre_comparativo",
    competencia_inicio: mesAtual,
    competencia_fim: mesAtual,
    indicador: "",
  });

  const fetchRelatorios = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/multiempresa/relatorios/");
      setRelatorios(Array.isArray(data) ? data : []);
    } catch {
      setRelatorios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmpresas = useCallback(async () => {
    try {
      const { data } = await api.get("/financeiro/companies");
      setEmpresas(Array.isArray(data) ? data : []);
    } catch {
      setEmpresas([]);
    }
  }, []);

  useEffect(() => { fetchRelatorios(); fetchEmpresas(); }, [fetchRelatorios, fetchEmpresas]);

  const toggleEmpresa = (id: string) => {
    setSelectedEmpresas((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!form.nome.trim() || selectedEmpresas.length === 0) return;
    setSaving(true);
    try {
      await api.post("/multiempresa/relatorios/", {
        nome: form.nome,
        tipo: form.tipo,
        empresas_ids: selectedEmpresas,
        competencia_inicio: form.competencia_inicio,
        competencia_fim: form.competencia_fim,
        indicador: form.indicador || null,
      });
      setShowForm(false);
      setForm({
        nome: "",
        tipo: "dre_comparativo",
        competencia_inicio: mesAtual,
        competencia_fim: mesAtual,
        indicador: "",
      });
      setSelectedEmpresas([]);
      fetchRelatorios();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este relatório?")) return;
    try {
      await api.delete(`/multiempresa/relatorios/${id}`);
      fetchRelatorios();
    } catch { /* ignore */ }
  };

  return (
    <PageWrapper title="Relatórios Comparativos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Relatórios Gerados</h2>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus size={16} /> Novo Relatório
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : relatorios.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum relatório comparativo gerado</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {relatorios.map((r) => (
              <div key={r.id} className="bg-white border border-zinc-200 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-zinc-900">{r.nome}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {tipoLabels[r.tipo] || r.tipo}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {r.competencia_inicio} → {r.competencia_fim}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {r.empresas_ids.length} empresa(s)
                      </span>
                    </div>
                    {r.indicador && (
                      <p className="text-xs text-zinc-500 mt-1">Indicador: {r.indicador}</p>
                    )}
                    {r.gerado_em && (
                      <p className="text-xs text-zinc-400 mt-1">
                        Gerado em: {new Date(r.gerado_em).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-600 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {r.resultado_json && (
                  <div className="mt-3 p-3 bg-zinc-50 rounded-lg">
                    <pre className="text-xs text-zinc-600 overflow-auto max-h-40">
                      {JSON.stringify(r.resultado_json, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Novo Relatório */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Novo Relatório Comparativo</h3>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-zinc-700">Nome</label>
                <input
                  className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: DRE Comparativo Q1 2026"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700">Tipo</label>
                <select
                  className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm"
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                >
                  {Object.entries(tipoLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700">Empresas do Grupo</label>
                <div className="relative mt-1">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white hover:border-zinc-400 transition-colors"
                  >
                    <span className={selectedEmpresas.length === 0 ? "text-zinc-400" : "text-zinc-900"}>
                      {selectedEmpresas.length === 0
                        ? "Selecione as empresas..."
                        : `${selectedEmpresas.length} empresa(s) selecionada(s)`}
                    </span>
                    <ChevronDown size={16} className={`text-zinc-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {dropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {empresas.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-zinc-400">Nenhuma empresa encontrada</div>
                      ) : (
                        empresas.map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => toggleEmpresa(emp.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-blue-50 transition-colors"
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              selectedEmpresas.includes(emp.id)
                                ? "bg-blue-600 border-blue-600"
                                : "border-zinc-300"
                            }`}>
                              {selectedEmpresas.includes(emp.id) && <Check size={12} className="text-white" />}
                            </div>
                            <span className="truncate">{(emp.nome_fantasia || emp.razao_social)}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {selectedEmpresas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedEmpresas.map((id) => {
                      const emp = empresas.find((e) => e.id === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs"
                        >
                          {emp ? (emp.nome_fantasia || emp.razao_social) : id.slice(0, 8)}
                          <button type="button" onClick={() => toggleEmpresa(id)} className="hover:text-blue-900">
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-zinc-700">Competência Início</label>
                  <input
                    type="month"
                    className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm"
                    value={form.competencia_inicio}
                    onChange={(e) => setForm((f) => ({ ...f, competencia_inicio: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-700">Competência Fim</label>
                  <input
                    type="month"
                    className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm"
                    value={form.competencia_fim}
                    onChange={(e) => setForm((f) => ({ ...f, competencia_fim: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700">Indicador (opcional)</label>
                <input
                  className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm"
                  value={form.indicador}
                  onChange={(e) => setForm((f) => ({ ...f, indicador: e.target.value }))}
                  placeholder="Ex: margem_liquida"
                />
              </div>
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
                disabled={saving || !form.nome.trim() || selectedEmpresas.length === 0}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : "Gerar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
