"use client";

import { useEffect, useState, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { AlertaEstoqueMinimo } from "@/components/estoque/AlertaEstoqueMinimo";
import { TabelaMovimentacoes } from "@/components/estoque/TabelaMovimentacoes";
import {
  Plus,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  ChevronRight,
  X,
} from "lucide-react";
import api from "@/lib/api";
import type { Produto } from "@/types/estoque";
import { useDebounce } from "@/hooks/useDebounce";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getStatusBadge(produto: Produto) {
  if (produto.estoque_atual <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
        <XCircle size={12} /> Zerado
      </span>
    );
  }
  if (produto.estoque_atual <= produto.estoque_minimo) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
        <AlertTriangle size={12} /> Repor
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
      <CheckCircle2 size={12} /> OK
    </span>
  );
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [showForm, setShowForm] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);

  // Form state
  const [form, setForm] = useState({
    code: "",
    description: "",
    tipo_produto: "insumo" as string,
    unidade_medida: "un",
    estoque_minimo: "0",
    controla_lote: false,
    controla_validade: false,
  });
  const [saving, setSaving] = useState(false);

  const companyId = typeof window !== "undefined"
    ? JSON.parse(sessionStorage.getItem("user") || "{}")?.tenant_id
    : null;

  const fetchProdutos = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ company_id: companyId });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const { data } = await api.get(`/estoque/produtos/?${params}`);
      setProdutos(Array.isArray(data) ? data : []);
    } catch {
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, debouncedSearch]);

  useEffect(() => {
    fetchProdutos();
  }, [fetchProdutos]);

  const handleSave = async () => {
    if (!companyId || !form.code || !form.description) return;
    setSaving(true);
    try {
      await api.post("/estoque/produtos/", {
        company_id: companyId,
        ...form,
        estoque_minimo: parseFloat(form.estoque_minimo) || 0,
      });
      setShowForm(false);
      setForm({
        code: "",
        description: "",
        tipo_produto: "insumo",
        unidade_medida: "un",
        estoque_minimo: "0",
        controla_lote: false,
        controla_validade: false,
      });
      fetchProdutos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao salvar produto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper
      title="Produtos & Insumos"
      breadcrumb={[
        { label: "Estoque", href: "/estoque/produtos" },
        { label: "Produtos" },
      ]}
      actions={
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Novo Produto
        </button>
      }
    >
      {companyId && <AlertaEstoqueMinimo companyId={companyId} />}

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
          <input
            type="text"
            placeholder="Buscar por código ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
          />
        </div>
      </div>

      <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-brand-primary" />
          </div>
        ) : produtos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-foreground-tertiary">
            <Package size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Nenhum produto encontrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-background-secondary">
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">Descrição</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">Estoque</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">Mín.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">Custo médio</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">Status</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedProduto(p)}
                  className="border-b border-border last:border-0 hover:bg-background-secondary/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono text-foreground-secondary">{p.code}</td>
                  <td className="px-4 py-3 text-sm font-medium">{p.description}</td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums">
                    {p.estoque_atual} {p.unidade_medida}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-foreground-tertiary tabular-nums">
                    {p.estoque_minimo} {p.unidade_medida}
                  </td>
                  <td className="px-4 py-3 text-sm text-right tabular-nums">{formatCurrency(p.custo_medio)}</td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(p)}</td>
                  <td className="px-2">
                    <ChevronRight size={16} className="text-foreground-tertiary" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer — Detalhe do Produto */}
      {selectedProduto && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedProduto(null)} />
          <div className="relative w-full max-w-lg bg-background-primary shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-background-primary border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold">{selectedProduto.description}</h2>
                <p className="text-sm text-foreground-tertiary font-mono">{selectedProduto.code}</p>
              </div>
              <button onClick={() => setSelectedProduto(null)} className="p-2 rounded-lg hover:bg-background-tertiary">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-foreground-tertiary mb-1">Estoque Atual</p>
                  <p className="text-xl font-bold">{selectedProduto.estoque_atual} {selectedProduto.unidade_medida}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-tertiary mb-1">Custo Médio</p>
                  <p className="text-xl font-bold">{formatCurrency(selectedProduto.custo_medio)}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-tertiary mb-1">Tipo</p>
                  <p className="text-sm capitalize">{selectedProduto.tipo_produto}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-tertiary mb-1">Método Custeio</p>
                  <p className="text-sm">{selectedProduto.metodo_custeio.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-tertiary mb-1">Controla Lote</p>
                  <p className="text-sm">{selectedProduto.controla_lote ? "Sim" : "Não"}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground-tertiary mb-1">Controla Validade</p>
                  <p className="text-sm">{selectedProduto.controla_validade ? "Sim" : "Não"}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-3">Histórico de Movimentações</h3>
                <TabelaMovimentacoes produtoId={selectedProduto.id} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Novo Produto */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowForm(false)} />
          <div className="relative bg-background-primary rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Novo Produto</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground-tertiary">Código *</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-tertiary">Descrição *</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground-tertiary">Tipo</label>
                  <select
                    value={form.tipo_produto}
                    onChange={(e) => setForm({ ...form, tipo_produto: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  >
                    <option value="insumo">Insumo</option>
                    <option value="produto">Produto</option>
                    <option value="ativo">Ativo</option>
                    <option value="embalagem">Embalagem</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground-tertiary">Unidade</label>
                  <input
                    value={form.unidade_medida}
                    onChange={(e) => setForm({ ...form, unidade_medida: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-tertiary">Estoque Mínimo</label>
                <input
                  type="number"
                  value={form.estoque_minimo}
                  onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.controla_lote}
                    onChange={(e) => setForm({ ...form, controla_lote: e.target.checked })}
                    className="rounded"
                  />
                  Controla Lote
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.controla_validade}
                    onChange={(e) => setForm({ ...form, controla_validade: e.target.checked })}
                    className="rounded"
                  />
                  Controla Validade
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-background-tertiary rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.code || !form.description}
                className="px-4 py-2 text-sm font-medium bg-brand-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
