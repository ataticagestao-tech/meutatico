"use client";

import { useEffect, useState, useCallback } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { FormNovaOC } from "@/components/estoque/FormNovaOC";
import { ModalRecebimento } from "@/components/estoque/ModalRecebimento";
import {
  Plus,
  Loader2,
  Eye,
  PackageCheck,
  FileEdit,
  Ban,
  ShoppingCart,
} from "lucide-react";
import api from "@/lib/api";
import type { OrdemCompra } from "@/types/estoque";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  rascunho: { label: "Rascunho", cls: "bg-gray-100 text-gray-600" },
  enviada: { label: "Enviada", cls: "bg-blue-50 text-blue-600" },
  parcial: { label: "Parcial", cls: "bg-amber-50 text-amber-600" },
  recebida: { label: "Recebida", cls: "bg-green-50 text-green-600" },
  cancelada: { label: "Cancelada", cls: "bg-red-50 text-red-600" },
};

export default function OrdensCompraPage() {
  const [ocs, setOcs] = useState<OrdemCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [showNovaOC, setShowNovaOC] = useState(false);
  const [receberOC, setReceberOC] = useState<OrdemCompra | null>(null);
  const [detailOC, setDetailOC] = useState<OrdemCompra | null>(null);

  const companyId = typeof window !== "undefined"
    ? JSON.parse(sessionStorage.getItem("user") || "{}")?.tenant_id
    : null;

  const fetchOCs = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ company_id: companyId });
      if (filterStatus) params.set("status", filterStatus);
      const { data } = await api.get(`/estoque/ordens-compra/?${params}`);
      setOcs(Array.isArray(data) ? data : []);
    } catch {
      setOcs([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, filterStatus]);

  useEffect(() => {
    fetchOCs();
  }, [fetchOCs]);

  const handleCancelar = async (oc: OrdemCompra) => {
    if (!confirm(`Cancelar OC ${oc.numero}?`)) return;
    try {
      await api.post(`/estoque/ordens-compra/${oc.id}/cancelar?company_id=${companyId}`);
      fetchOCs();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao cancelar");
    }
  };

  return (
    <PageWrapper
      title="Ordens de Compra"
      breadcrumb={[
        { label: "Estoque", href: "/estoque/produtos" },
        { label: "Ordens de Compra" },
      ]}
      actions={
        <button
          onClick={() => setShowNovaOC(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Nova OC
        </button>
      }
    >
      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg text-sm bg-background-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        >
          <option value="">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="enviada">Enviada</option>
          <option value="parcial">Parcial</option>
          <option value="recebida">Recebida</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-background-primary border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-brand-primary" />
          </div>
        ) : ocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-foreground-tertiary">
            <ShoppingCart size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Nenhuma ordem de compra encontrada</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-background-secondary">
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">Número</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">Fornecedor</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">Valor Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">Data</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ocs.map((oc) => {
                const st = STATUS_STYLES[oc.status] || STATUS_STYLES.rascunho;
                const fornNome = oc.suppliers?.nome_fantasia || oc.suppliers?.razao_social || "—";
                return (
                  <tr key={oc.id} className="border-b border-border last:border-0 hover:bg-background-secondary/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium">{oc.numero}</td>
                    <td className="px-4 py-3 text-sm">{fornNome}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums font-medium">
                      {formatCurrency(oc.valor_total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-foreground-tertiary">
                      {formatDate(oc.data_emissao)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(oc.status === "enviada" || oc.status === "parcial") && (
                          <button
                            onClick={() => setReceberOC(oc)}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                            title="Receber"
                          >
                            <PackageCheck size={16} />
                          </button>
                        )}
                        {oc.status === "rascunho" && (
                          <button
                            onClick={() => setDetailOC(oc)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                            title="Editar"
                          >
                            <FileEdit size={16} />
                          </button>
                        )}
                        {oc.status !== "recebida" && oc.status !== "cancelada" && (
                          <button
                            onClick={() => handleCancelar(oc)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                            title="Cancelar"
                          >
                            <Ban size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => setDetailOC(oc)}
                          className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-tertiary transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nova OC */}
      {showNovaOC && companyId && (
        <FormNovaOC
          companyId={companyId}
          onClose={() => setShowNovaOC(false)}
          onSaved={() => {
            setShowNovaOC(false);
            fetchOCs();
          }}
        />
      )}

      {/* Modal Recebimento */}
      {receberOC && companyId && (
        <ModalRecebimento
          oc={receberOC}
          companyId={companyId}
          onClose={() => setReceberOC(null)}
          onRecebido={() => {
            setReceberOC(null);
            fetchOCs();
          }}
        />
      )}

      {/* Detail Modal (simplified) */}
      {detailOC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDetailOC(null)} />
          <div className="relative bg-background-primary rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-1">{detailOC.numero}</h2>
            <p className="text-sm text-foreground-tertiary mb-4">
              {detailOC.suppliers?.razao_social || "—"} &middot;{" "}
              {formatDate(detailOC.data_emissao)}
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <span className="text-foreground-tertiary">Valor Total:</span>{" "}
                <span className="font-medium">{formatCurrency(detailOC.valor_total)}</span>
              </div>
              <div>
                <span className="text-foreground-tertiary">Status:</span>{" "}
                <span className="font-medium capitalize">{detailOC.status}</span>
              </div>
              {detailOC.data_prevista && (
                <div>
                  <span className="text-foreground-tertiary">Previsão:</span>{" "}
                  {formatDate(detailOC.data_prevista)}
                </div>
              )}
              {detailOC.cond_pagamento && (
                <div>
                  <span className="text-foreground-tertiary">Pagamento:</span>{" "}
                  {detailOC.cond_pagamento}
                </div>
              )}
            </div>
            {detailOC.observacoes && (
              <p className="text-sm text-foreground-secondary mb-4 bg-background-secondary p-3 rounded-lg">
                {detailOC.observacoes}
              </p>
            )}
            {detailOC.gerada_por_alerta && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-4">
                OC gerada automaticamente por alerta de estoque mínimo
              </p>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setDetailOC(null)}
                className="px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-background-tertiary rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
