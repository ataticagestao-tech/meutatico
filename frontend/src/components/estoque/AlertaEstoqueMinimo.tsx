"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShoppingCart, Loader2 } from "lucide-react";
import api from "@/lib/api";
import type { AlertaEstoqueMinimo as Alerta } from "@/types/estoque";

interface AlertaEstoqueMinimoProps {
  companyId: string;
}

export function AlertaEstoqueMinimo({ companyId }: AlertaEstoqueMinimoProps) {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const { data } = await api.get(`/estoque/produtos/alertas?company_id=${companyId}`);
        setAlertas(Array.isArray(data) ? data : []);
      } catch {
        setAlertas([]);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [companyId]);

  if (loading || alertas.length === 0) return null;

  const handleGerarOC = async (alerta: Alerta) => {
    if (!alerta.fornecedor_id) {
      alert("Produto sem fornecedor vinculado. Cadastre um fornecedor primeiro.");
      return;
    }
    setGerando(alerta.produto_id);
    try {
      await api.post("/estoque/ordens-compra/", {
        company_id: companyId,
        fornecedor_id: alerta.fornecedor_id,
        itens: [
          {
            produto_id: alerta.produto_id,
            quantidade: alerta.quantidade_repor,
            valor_unitario: alerta.custo_medio || 0.01,
          },
        ],
        gerada_por_alerta: true,
      });
      setAlertas((prev) => prev.filter((a) => a.produto_id !== alerta.produto_id));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao gerar OC");
    } finally {
      setGerando(null);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={16} className="text-amber-600" />
        <h3 className="text-sm font-semibold text-amber-800">
          {alertas.length} produto(s) abaixo do estoque mínimo
        </h3>
      </div>
      <div className="space-y-2">
        {alertas.map((a) => (
          <div key={a.produto_id} className="flex items-center justify-between text-sm">
            <div>
              <span className="font-mono text-xs text-amber-700 mr-2">{a.codigo}</span>
              <span className="text-amber-900">{a.descricao}</span>
              <span className="text-amber-600 ml-2">
                ({a.estoque_atual}/{a.estoque_minimo} {a.unidade_medida})
              </span>
            </div>
            <button
              onClick={() => handleGerarOC(a)}
              disabled={gerando === a.produto_id}
              className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
            >
              {gerando === a.produto_id ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ShoppingCart size={12} />
              )}
              Gerar OC
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
