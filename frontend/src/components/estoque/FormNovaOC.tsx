"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, X } from "lucide-react";
import api from "@/lib/api";
import type { Fornecedor, Produto } from "@/types/estoque";

interface FormNovaOCProps {
  companyId: string;
  onClose: () => void;
  onSaved: () => void;
}

interface ItemOC {
  produto_id: string;
  description: string;
  quantidade: string;
  valor_unitario: string;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FormNovaOC({ companyId, onClose, onSaved }: FormNovaOCProps) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedorId, setFornecedorId] = useState("");
  const [searchForn, setSearchForn] = useState("");
  const [itens, setItens] = useState<ItemOC[]>([
    { produto_id: "", description: "", quantidade: "1", valor_unitario: "0" },
  ]);
  const [dataPrevista, setDataPrevista] = useState("");
  const [condPagamento, setCondPagamento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetch() {
      try {
        const [fornRes, prodRes] = await Promise.all([
          api.get(`/estoque/fornecedores/?company_id=${companyId}`),
          api.get(`/estoque/produtos/?company_id=${companyId}`),
        ]);
        setFornecedores(Array.isArray(fornRes.data) ? fornRes.data : []);
        setProdutos(Array.isArray(prodRes.data) ? prodRes.data : []);
      } catch {
        // ignore
      }
    }
    fetch();
  }, [companyId]);

  const addItem = () => {
    setItens([...itens, { produto_id: "", description: "", quantidade: "1", valor_unitario: "0" }]);
  };

  const removeItem = (idx: number) => {
    if (itens.length <= 1) return;
    setItens(itens.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof ItemOC, value: string) => {
    setItens((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        if (field === "produto_id") {
          const prod = produtos.find((p) => p.id === value);
          if (prod) {
            updated.description = prod.description;
            updated.valor_unitario = String(prod.custo_medio || 0);
          }
        }
        return updated;
      })
    );
  };

  const total = itens.reduce(
    (sum, i) => sum + (parseFloat(i.quantidade) || 0) * (parseFloat(i.valor_unitario) || 0),
    0
  );

  const handleSave = async () => {
    if (!fornecedorId) {
      alert("Selecione um fornecedor");
      return;
    }
    const validItens = itens.filter((i) => i.produto_id && parseFloat(i.quantidade) > 0);
    if (validItens.length === 0) {
      alert("Adicione pelo menos um item válido");
      return;
    }

    setSaving(true);
    try {
      await api.post("/estoque/ordens-compra/", {
        company_id: companyId,
        fornecedor_id: fornecedorId,
        itens: validItens.map((i) => ({
          produto_id: i.produto_id,
          quantidade: parseFloat(i.quantidade),
          valor_unitario: parseFloat(i.valor_unitario) || 0,
        })),
        data_prevista: dataPrevista || null,
        cond_pagamento: condPagamento || null,
        observacoes: observacoes || null,
      });
      onSaved();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao criar OC");
    } finally {
      setSaving(false);
    }
  };

  const filteredForn = searchForn
    ? fornecedores.filter(
        (f) =>
          f.razao_social.toLowerCase().includes(searchForn.toLowerCase()) ||
          f.cpf_cnpj.includes(searchForn)
      )
    : fornecedores;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-background-primary rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Nova Ordem de Compra</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-background-tertiary">
            <X size={20} />
          </button>
        </div>

        {/* Fornecedor */}
        <div className="mb-4">
          <label className="text-xs font-medium text-foreground-tertiary">Fornecedor *</label>
          <select
            value={fornecedorId}
            onChange={(e) => setFornecedorId(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          >
            <option value="">Selecione...</option>
            {filteredForn.map((f) => (
              <option key={f.id} value={f.id}>
                {f.razao_social} {f.cpf_cnpj ? `(${f.cpf_cnpj})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Itens */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-foreground-tertiary">Itens</label>
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-xs font-medium text-brand-primary hover:text-blue-700"
            >
              <Plus size={14} /> Adicionar Item
            </button>
          </div>
          <div className="space-y-2">
            {itens.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <div className="flex-1">
                  <select
                    value={item.produto_id}
                    onChange={(e) => updateItem(idx, "produto_id", e.target.value)}
                    className="w-full px-2 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  >
                    <option value="">Produto...</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.description}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={item.quantidade}
                  onChange={(e) => updateItem(idx, "quantidade", e.target.value)}
                  placeholder="Qtd"
                  className="w-20 px-2 py-1.5 border border-border rounded-lg text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.valor_unitario}
                  onChange={(e) => updateItem(idx, "valor_unitario", e.target.value)}
                  placeholder="Valor unit."
                  className="w-28 px-2 py-1.5 border border-border rounded-lg text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                <span className="w-24 py-1.5 text-sm text-right tabular-nums text-foreground-secondary">
                  {formatCurrency(
                    (parseFloat(item.quantidade) || 0) * (parseFloat(item.valor_unitario) || 0)
                  )}
                </span>
                <button
                  onClick={() => removeItem(idx)}
                  disabled={itens.length <= 1}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="text-right mt-2 text-sm font-semibold">
            Total: {formatCurrency(total)}
          </div>
        </div>

        {/* Extra fields */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium text-foreground-tertiary">Data Prevista</label>
            <input
              type="date"
              value={dataPrevista}
              onChange={(e) => setDataPrevista(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground-tertiary">Cond. Pagamento</label>
            <input
              value={condPagamento}
              onChange={(e) => setCondPagamento(e.target.value)}
              placeholder="Ex: 30/60/90"
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </div>
        <div className="mb-6">
          <label className="text-xs font-medium text-foreground-tertiary">Observações</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={2}
            className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 resize-none"
          />
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
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-primary text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : "Criar OC"}
          </button>
        </div>
      </div>
    </div>
  );
}
