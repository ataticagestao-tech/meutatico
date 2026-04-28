"use client";

import { useEffect, useState, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import {
  Plus,
  Loader2,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import api from "@/lib/api";
import type { Inventario, Produto } from "@/types/estoque";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

interface ContagemItem {
  produto_id: string;
  description: string;
  code: string;
  unidade_medida: string;
  estoque_sistema: number;
  qtd_contada: string;
}

export default function InventarioPage() {
  const [inventarios, setInventarios] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [contagem, setContagem] = useState<ContagemItem[]>([]);
  const [inventarioAtivo, setInventarioAtivo] = useState<Inventario | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [saving, setSaving] = useState(false);

  const companyId = typeof window !== "undefined"
    ? JSON.parse(sessionStorage.getItem("user") || "{}")?.tenant_id
    : null;

  const fetchInventarios = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/estoque/inventario/?company_id=${companyId}`);
      const list = Array.isArray(data) ? data : [];
      setInventarios(list);
      const ativo = list.find((i: Inventario) => i.status === "aberto");
      if (ativo) setInventarioAtivo(ativo);
    } catch {
      setInventarios([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchProdutos = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data } = await api.get(`/estoque/produtos/?company_id=${companyId}`);
      const list = Array.isArray(data) ? data : [];
      setProdutos(list);
      setContagem(
        list.map((p: Produto) => ({
          produto_id: p.id,
          description: p.description,
          code: p.code,
          unidade_medida: p.unidade_medida,
          estoque_sistema: p.estoque_atual,
          qtd_contada: String(p.estoque_atual),
        }))
      );
    } catch {
      setProdutos([]);
    }
  }, [companyId]);

  useEffect(() => {
    fetchInventarios();
  }, [fetchInventarios]);

  useEffect(() => {
    if (inventarioAtivo) fetchProdutos();
  }, [inventarioAtivo, fetchProdutos]);

  const handleIniciar = async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const { data } = await api.post("/estoque/inventario/iniciar", {
        company_id: companyId,
        descricao: `Inventário ${new Date().toLocaleDateString("pt-BR")}`,
      });
      setInventarioAtivo(data);
      fetchProdutos();
      fetchInventarios();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao iniciar inventário");
    } finally {
      setSaving(false);
    }
  };

  const handleFechar = async (aplicarAjustes: boolean) => {
    if (!inventarioAtivo || !companyId) return;
    setSaving(true);
    try {
      const itens = contagem.map((c) => ({
        produto_id: c.produto_id,
        qtd_contada: parseFloat(c.qtd_contada) || 0,
      }));
      const { data } = await api.post(
        `/estoque/inventario/${inventarioAtivo.id}/fechar?company_id=${companyId}`,
        { itens, aplicar_ajustes: aplicarAjustes }
      );
      alert(
        `Inventário concluído!\n${data.divergencias} divergência(s) — ${formatCurrency(data.valor_divergencia_total)}${
          aplicarAjustes ? "\nAjustes aplicados." : ""
        }`
      );
      setInventarioAtivo(null);
      setContagem([]);
      fetchInventarios();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao fechar inventário");
    } finally {
      setSaving(false);
    }
  };

  const updateContagem = (index: number, value: string) => {
    setContagem((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qtd_contada: value } : item))
    );
  };

  const divergencias = contagem.filter(
    (c) => Math.abs(parseFloat(c.qtd_contada) - c.estoque_sistema) > 0.001
  );
  const concluidos = inventarios.filter((i) => i.status === "concluido");

  return (
    <PageWrapper
      title="Inventário"
      breadcrumb={[
        { label: "Estoque", href: "/estoque/produtos" },
        { label: "Inventário" },
      ]}
      actions={
        !inventarioAtivo ? (
          <button
            onClick={handleIniciar}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Iniciar Inventário
          </button>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-brand-primary" />
        </div>
      ) : inventarioAtivo ? (
        /* ── Inventário em andamento ── */
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-1">
              Inventário em andamento — {formatDate(inventarioAtivo.data_inicio)}
            </h3>
            <p className="text-xs text-blue-600">
              Preencha a contagem física de cada produto. Divergências são calculadas automaticamente.
            </p>
          </div>

          {divergencias.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <span className="text-sm text-amber-700 font-medium">
                {divergencias.length} divergência(s) encontrada(s)
              </span>
            </div>
          )}

          <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background-secondary">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase">Produto</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase">Estoque Sistema</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase">Contado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase">Divergência</th>
                </tr>
              </thead>
              <tbody>
                {contagem.map((item, idx) => {
                  const contado = parseFloat(item.qtd_contada) || 0;
                  const diff = contado - item.estoque_sistema;
                  const hasDiff = Math.abs(diff) > 0.001;
                  return (
                    <tr key={item.produto_id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{item.description}</p>
                        <p className="text-xs text-foreground-tertiary font-mono">{item.code}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-foreground-secondary">
                        {item.estoque_sistema} {item.unidade_medida}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          step="any"
                          value={item.qtd_contada}
                          onChange={(e) => updateContagem(idx, e.target.value)}
                          className={`w-24 text-center px-2 py-1.5 border rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-primary/20 ${
                            hasDiff ? "border-amber-300 bg-amber-50" : "border-border"
                          }`}
                        />
                      </td>
                      <td className={`px-4 py-3 text-sm text-right tabular-nums font-medium ${
                        !hasDiff ? "text-foreground-tertiary" : diff > 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {hasDiff ? (
                          <>
                            {diff > 0 ? "+" : ""}{diff.toFixed(2)} {item.unidade_medida}
                            {" "}
                            <AlertTriangle size={12} className="inline text-amber-500" />
                          </>
                        ) : (
                          <>0 {item.unidade_medida}</>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => handleFechar(false)}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-background-tertiary transition-colors disabled:opacity-50"
            >
              Finalizar sem ajustes
            </button>
            <button
              onClick={() => handleFechar(true)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Finalizar e aplicar ajustes
            </button>
          </div>
        </div>
      ) : (
        /* ── Histórico ── */
        <div className="space-y-4">
          {concluidos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-foreground-tertiary bg-background-primary border border-border rounded-xl">
              <ClipboardCheck size={40} className="mb-3 opacity-40" />
              <p className="text-sm">Nenhum inventário realizado</p>
              <p className="text-xs mt-1">Clique em &quot;Iniciar Inventário&quot; para começar</p>
            </div>
          ) : (
            <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-background-secondary">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase">Descrição</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {concluidos.map((inv) => (
                    <tr key={inv.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-sm">{formatDate(inv.data_inicio)}</td>
                      <td className="px-4 py-3 text-sm text-foreground-secondary">{inv.descricao || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-medium bg-green-50 text-green-600 px-2.5 py-0.5 rounded-full">
                          Concluído
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
