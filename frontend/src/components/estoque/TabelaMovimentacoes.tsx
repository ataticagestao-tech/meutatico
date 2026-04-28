"use client";

import { useEffect, useState } from "react";
import { Loader2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import api from "@/lib/api";

interface TabelaMovimentacoesProps {
  produtoId: string;
}

interface Movimentacao {
  tipo: "entrada" | "saida";
  data: string;
  quantidade: number;
  valor_unitario: number;
  referencia: string;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

export function TabelaMovimentacoes({ produtoId }: TabelaMovimentacoesProps) {
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const { data } = await api.get(`/estoque/movimentacoes/${produtoId}`);
        const entradas: Movimentacao[] = (data.entradas || []).map((e: any) => ({
          tipo: "entrada" as const,
          data: e.entradas_estoque?.data_entrada || e.created_at?.split("T")[0] || "",
          quantidade: e.quantidade,
          valor_unitario: e.valor_unitario,
          referencia: e.entradas_estoque?.numero_nf
            ? `NF ${e.entradas_estoque.numero_nf}`
            : e.entradas_estoque?.suppliers?.razao_social || "Entrada",
        }));
        const saidas: Movimentacao[] = (data.saidas || []).map((s: any) => ({
          tipo: "saida" as const,
          data: s.created_at?.split("T")[0] || "",
          quantidade: s.quantidade,
          valor_unitario: s.valor_unitario,
          referencia: s.tipo
            ? `${s.tipo.charAt(0).toUpperCase() + s.tipo.slice(1)}${s.motivo ? ` — ${s.motivo}` : ""}`
            : "Saída",
        }));
        const all = [...entradas, ...saidas].sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
        );
        setMovs(all);
      } catch {
        setMovs([]);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [produtoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-brand-primary" />
      </div>
    );
  }

  if (movs.length === 0) {
    return (
      <p className="text-sm text-foreground-tertiary text-center py-6">
        Nenhuma movimentação registrada
      </p>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-background-secondary border-b border-border">
            <th className="text-left px-3 py-2 text-[10px] font-semibold text-foreground-tertiary uppercase">Tipo</th>
            <th className="text-left px-3 py-2 text-[10px] font-semibold text-foreground-tertiary uppercase">Data</th>
            <th className="text-right px-3 py-2 text-[10px] font-semibold text-foreground-tertiary uppercase">Qtd</th>
            <th className="text-right px-3 py-2 text-[10px] font-semibold text-foreground-tertiary uppercase">Valor Unit.</th>
            <th className="text-left px-3 py-2 text-[10px] font-semibold text-foreground-tertiary uppercase">Referência</th>
          </tr>
        </thead>
        <tbody>
          {movs.map((m, idx) => (
            <tr key={idx} className="border-b border-border last:border-0 text-xs">
              <td className="px-3 py-2">
                {m.tipo === "entrada" ? (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <ArrowDownCircle size={12} /> Entrada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-600">
                    <ArrowUpCircle size={12} /> Saída
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-foreground-secondary tabular-nums">{formatDate(m.data)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">
                {m.tipo === "entrada" ? "+" : "-"}{m.quantidade}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-foreground-secondary">
                {formatCurrency(m.valor_unitario)}
              </td>
              <td className="px-3 py-2 text-foreground-tertiary truncate max-w-[150px]">{m.referencia}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
