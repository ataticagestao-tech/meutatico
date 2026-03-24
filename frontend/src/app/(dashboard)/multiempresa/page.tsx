"use client";

import { useEffect, useState, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Plus,
  Building2,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRightLeft,
  RefreshCw,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import api from "@/lib/api";

interface Grupo {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
}

interface Empresa {
  id: string;
  grupo_id: string;
  company_id: string;
  papel: string;
  percentual_participacao: number | null;
  companies?: { id: string; name: string; cnpj: string };
}

interface Consolidado {
  grupo_id: string;
  grupo_nome: string;
  competencia: string;
  receita_bruta: number;
  resultado_liquido: number;
  caixa_total: number;
  cr_total_aberto: number;
  cp_total_aberto: number;
  total_eliminacoes: number;
  qtd_transferencias: number;
  qtd_empresas: number;
  calculado_em: string;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MultiempresaPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [consolidados, setConsolidados] = useState<Consolidado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [empresasGrupo, setEmpresasGrupo] = useState<Empresa[]>([]);
  const [showEmpresas, setShowEmpresas] = useState(false);

  const [form, setForm] = useState({ nome: "", descricao: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, cRes] = await Promise.all([
        api.get("/multiempresa/grupos/"),
        api.get("/multiempresa/consolidado/"),
      ]);
      setGrupos(Array.isArray(gRes.data) ? gRes.data : []);
      setConsolidados(Array.isArray(cRes.data) ? cRes.data : []);
    } catch {
      setGrupos([]);
      setConsolidados([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    try {
      if (selectedGrupo) {
        await api.patch(`/multiempresa/grupos/${selectedGrupo.id}`, form);
      } else {
        await api.post("/multiempresa/grupos/", form);
      }
      setShowForm(false);
      setForm({ nome: "", descricao: "" });
      setSelectedGrupo(null);
      fetchData();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este grupo?")) return;
    try {
      await api.delete(`/multiempresa/grupos/${id}`);
      fetchData();
    } catch { /* ignore */ }
  };

  const handleViewEmpresas = async (grupo: Grupo) => {
    try {
      const { data } = await api.get(`/multiempresa/grupos/${grupo.id}/empresas`);
      setEmpresasGrupo(Array.isArray(data) ? data : []);
      setSelectedGrupo(grupo);
      setShowEmpresas(true);
    } catch {
      setEmpresasGrupo([]);
    }
  };

  const handleRecalcular = async (grupoId: string) => {
    const now = new Date();
    const competencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    try {
      await api.post("/multiempresa/consolidado/calcular", {
        grupo_id: grupoId,
        competencia,
      });
      fetchData();
    } catch { /* ignore */ }
  };

  const getConsolidado = (grupoId: string) =>
    consolidados.find((c) => c.grupo_id === grupoId);

  return (
    <PageWrapper title="Multi-empresa" subtitle="Gestão de grupos empresariais e consolidado financeiro">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Grupos Empresariais</h2>
          </div>
          <button
            onClick={() => {
              setForm({ nome: "", descricao: "" });
              setSelectedGrupo(null);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus size={16} /> Novo Grupo
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : grupos.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Nenhum grupo empresarial cadastrado</p>
            <p className="text-sm mt-1">Crie um grupo para agrupar suas empresas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grupos.map((grupo) => {
              const cons = getConsolidado(grupo.id);
              return (
                <div key={grupo.id} className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-900">{grupo.nome}</h3>
                      {grupo.descricao && (
                        <p className="text-sm text-zinc-500 mt-0.5">{grupo.descricao}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRecalcular(grupo.id)}
                        className="p-1.5 text-zinc-400 hover:text-blue-600 rounded"
                        title="Recalcular consolidado"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        onClick={() => handleViewEmpresas(grupo)}
                        className="p-1.5 text-zinc-400 hover:text-blue-600 rounded"
                        title="Ver empresas"
                      >
                        <Building2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedGrupo(grupo);
                          setForm({ nome: grupo.nome, descricao: grupo.descricao || "" });
                          setShowForm(true);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-amber-600 rounded"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(grupo.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {cons ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-green-600 font-medium">Receita Bruta</p>
                        <p className="text-lg font-bold text-green-700">{formatCurrency(cons.receita_bruta)}</p>
                      </div>
                      <div className={`rounded-lg p-3 ${cons.resultado_liquido >= 0 ? "bg-blue-50" : "bg-red-50"}`}>
                        <p className={`text-xs font-medium ${cons.resultado_liquido >= 0 ? "text-blue-600" : "text-red-600"}`}>
                          Resultado Líquido
                        </p>
                        <p className={`text-lg font-bold ${cons.resultado_liquido >= 0 ? "text-blue-700" : "text-red-700"}`}>
                          {formatCurrency(cons.resultado_liquido)}
                        </p>
                      </div>
                      <div className="bg-zinc-50 rounded-lg p-3">
                        <p className="text-xs text-zinc-600 font-medium">Caixa Total</p>
                        <p className="text-lg font-bold text-zinc-800">{formatCurrency(cons.caixa_total)}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <p className="text-xs text-purple-600 font-medium">Eliminações</p>
                        <p className="text-lg font-bold text-purple-700">{formatCurrency(cons.total_eliminacoes)}</p>
                        <p className="text-xs text-purple-500">{cons.qtd_transferencias} transf.</p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3">
                        <p className="text-xs text-emerald-600 font-medium">CR Aberto</p>
                        <p className="text-sm font-semibold text-emerald-700">{formatCurrency(cons.cr_total_aberto)}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3">
                        <p className="text-xs text-orange-600 font-medium">CP Aberto</p>
                        <p className="text-sm font-semibold text-orange-700">{formatCurrency(cons.cp_total_aberto)}</p>
                      </div>
                      <div className="bg-zinc-50 rounded-lg p-3">
                        <p className="text-xs text-zinc-500 font-medium">Empresas</p>
                        <p className="text-sm font-semibold text-zinc-700">{cons.qtd_empresas}</p>
                      </div>
                      <div className="bg-zinc-50 rounded-lg p-3">
                        <p className="text-xs text-zinc-500 font-medium">Competência</p>
                        <p className="text-sm font-semibold text-zinc-700">{cons.competencia}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400">Consolidado não calculado. Clique em ↻ para recalcular.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Criar/Editar Grupo */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{selectedGrupo ? "Editar Grupo" : "Novo Grupo"}</h3>
              <button onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-zinc-700">Nome</label>
                <input
                  className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Grupo Clínicas SP"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700">Descrição</label>
                <textarea
                  className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
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
                disabled={saving || !form.nome.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Empresas do Grupo */}
      {showEmpresas && selectedGrupo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Empresas — {selectedGrupo.nome}</h3>
              <button onClick={() => { setShowEmpresas(false); setSelectedGrupo(null); }}>
                <X size={20} />
              </button>
            </div>
            {empresasGrupo.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">Nenhuma empresa vinculada</p>
            ) : (
              <div className="space-y-2">
                {empresasGrupo.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">
                        {emp.companies?.name || emp.company_id}
                      </p>
                      {emp.companies?.cnpj && (
                        <p className="text-xs text-zinc-500">{emp.companies.cnpj}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {emp.papel}
                      </span>
                      {emp.percentual_participacao != null && (
                        <span className="text-xs text-zinc-500">
                          {emp.percentual_participacao}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
