"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import api from "@/lib/api";
import type { OrdemCompra, OrdemCompraItem } from "@/types/estoque";

interface ModalRecebimentoProps {
  oc: OrdemCompra;
  companyId: string;
  onClose: () => void;
  onRecebido: () => void;
}

interface ItemRecebimento {
  produto_id: string;
  description: string;
  unidade_medida: string;
  qtd_pedida: number;
  qtd_ja_recebida: number;
  quantidade: string;
  valor_unitario: string;
  lote: string;
  data_validade: string;
  controla_lote: boolean;
  controla_validade: boolean;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ModalRecebimento({ oc, companyId, onClose, onRecebido }: ModalRecebimentoProps) {
  const [itens, setItens] = useState<ItemRecebimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gerarCP, setGerarCP] = useState(true);
  const [dataVencimento, setDataVencimento] = useState("");
  const [numeroNF, setNumeroNF] = useState("");
  const [chaveNF, setChaveNF] = useState("");

  useEffect(() => {
    async function fetchOC() {
      try {
        const ocItens = oc.ordens_compra_itens || [];

        setItens(
          ocItens.map((i: OrdemCompraItem) => ({
            produto_id: i.produto_id,
            description: i.products?.description || i.produto_id,
            unidade_medida: i.products?.unidade_medida || "un",
            qtd_pedida: i.quantidade,
            qtd_ja_recebida: i.quantidade_recebida,
            quantidade: String(i.quantidade - i.quantidade_recebida),
            valor_unitario: String(i.valor_unitario),
            lote: "",
            data_validade: "",
            controla_lote: i.products?.controla_lote || false,
            controla_validade: i.products?.controla_validade || false,
          }))
        );
      } catch {
        // try to use oc directly
      } finally {
        setLoading(false);
      }
    }
    fetchOC();
  }, [oc, companyId]);

  const updateItem = (idx: number, field: keyof ItemRecebimento, value: string) => {
    setItens((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const totalRecebido = itens.reduce(
    (sum, i) => sum + (parseFloat(i.quantidade) || 0) * (parseFloat(i.valor_unitario) || 0),
    0
  );

  const handleReceber = async () => {
    const validItens = itens.filter((i) => parseFloat(i.quantidade) > 0);
    if (validItens.length === 0) {
      alert("Informe pelo menos um item para receber");
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.post(
        `/estoque/ordens-compra/${oc.id}/receber?company_id=${companyId}`,
        {
          itens: validItens.map((i) => ({
            produto_id: i.produto_id,
            quantidade: parseFloat(i.quantidade),
            valor_unitario: parseFloat(i.valor_unitario),
            lote: i.lote || null,
            data_validade: i.data_validade || null,
          })),
          numero_nf: numeroNF || null,
          chave_nf: chaveNF || null,
          gerar_conta_pagar: gerarCP,
          data_vencimento_cp: dataVencimento || null,
        }
      );

      const msg = [
        `Recebimento registrado!`,
        `${data.itens_recebidos} item(ns) — ${formatCurrency(data.valor_total)}`,
        data.conta_pagar_id ? "Conta a pagar gerada." : "",
      ]
        .filter(Boolean)
        .join("\n");
      alert(msg);
      onRecebido();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao receber OC");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-background-primary rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">Recebimento — {oc.numero}</h2>
            <p className="text-sm text-foreground-tertiary">
              {oc.suppliers?.razao_social || "—"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-background-tertiary">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-brand-primary" />
          </div>
        ) : (
          <>
            {/* NF */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-medium text-foreground-tertiary">Número NF</label>
                <input
                  value={numeroNF}
                  onChange={(e) => setNumeroNF(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground-tertiary">Chave NF-e</label>
                <input
                  value={chaveNF}
                  onChange={(e) => setChaveNF(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
            </div>

            {/* Items */}
            <div className="mb-4">
              <label className="text-xs font-medium text-foreground-tertiary mb-2 block">Itens</label>
              <div className="space-y-3">
                {itens.map((item, idx) => (
                  <div key={idx} className="bg-background-secondary rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{item.description}</span>
                      <span className="text-xs text-foreground-tertiary">
                        Pedido: {item.qtd_pedida} {item.unidade_medida} | Já recebido: {item.qtd_ja_recebida}
                      </span>
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="w-24">
                        <label className="text-[10px] text-foreground-tertiary">Quantidade</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.quantidade}
                          onChange={(e) => updateItem(idx, "quantidade", e.target.value)}
                          className="w-full px-2 py-1.5 border border-border rounded-lg text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                        />
                      </div>
                      <div className="w-28">
                        <label className="text-[10px] text-foreground-tertiary">Valor unit.</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.valor_unitario}
                          onChange={(e) => updateItem(idx, "valor_unitario", e.target.value)}
                          className="w-full px-2 py-1.5 border border-border rounded-lg text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                        />
                      </div>
                      {item.controla_lote && (
                        <div className="flex-1">
                          <label className="text-[10px] text-foreground-tertiary">Lote</label>
                          <input
                            value={item.lote}
                            onChange={(e) => updateItem(idx, "lote", e.target.value)}
                            className="w-full px-2 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                          />
                        </div>
                      )}
                      {item.controla_validade && (
                        <div className="w-36">
                          <label className="text-[10px] text-foreground-tertiary">Validade</label>
                          <input
                            type="date"
                            value={item.data_validade}
                            onChange={(e) => updateItem(idx, "data_validade", e.target.value)}
                            className="w-full px-2 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumo */}
            <div className="bg-background-secondary rounded-lg p-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-foreground-secondary">Total recebido:</span>
              <span className="text-lg font-bold">{formatCurrency(totalRecebido)}</span>
            </div>

            {/* CP */}
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={gerarCP}
                  onChange={(e) => setGerarCP(e.target.checked)}
                  className="rounded"
                />
                Gerar conta a pagar
              </label>
              {gerarCP && (
                <div>
                  <label className="text-xs text-foreground-tertiary mr-2">Vencimento:</label>
                  <input
                    type="date"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="px-2 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-background-tertiary rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReceber}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : "Confirmar Recebimento"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
