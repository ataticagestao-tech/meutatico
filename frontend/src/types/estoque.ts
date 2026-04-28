export interface Fornecedor {
  id: string;
  company_id: string;
  cpf_cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  tipo_pessoa: "PF" | "PJ";
  email: string | null;
  telefone: string | null;
  celular: string | null;
  dados_bancarios_pix: string | null;
  observacoes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Produto {
  id: string;
  company_id: string;
  code: string;
  description: string;
  tipo_produto: "produto" | "insumo" | "ativo" | "embalagem";
  unidade_medida: string;
  ncm: string | null;
  fornecedor_id: string | null;
  metodo_custeio: "media_ponderada" | "peps" | "ueps";
  price: number | null;
  estoque_atual: number;
  estoque_minimo: number;
  estoque_maximo: number | null;
  custo_medio: number;
  localizacao: string | null;
  controla_validade: boolean;
  controla_lote: boolean;
  conta_contabil_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OrdemCompra {
  id: string;
  company_id: string;
  fornecedor_id: string;
  numero: string;
  data_emissao: string;
  data_prevista: string | null;
  cond_pagamento: string | null;
  valor_total: number;
  observacoes: string | null;
  gerada_por_alerta: boolean;
  status: "rascunho" | "enviada" | "parcial" | "recebida" | "cancelada";
  created_at: string;
  suppliers?: { razao_social: string; nome_fantasia: string | null };
  ordens_compra_itens?: OrdemCompraItem[];
}

export interface OrdemCompraItem {
  id: string;
  ordem_compra_id: string;
  produto_id: string;
  quantidade: number;
  valor_unitario: number;
  quantidade_recebida: number;
  products?: {
    description: string;
    code: string;
    unidade_medida: string;
    controla_lote: boolean;
    controla_validade: boolean;
  };
}

export interface EntradaEstoque {
  id: string;
  company_id: string;
  fornecedor_id: string | null;
  ordem_compra_id: string | null;
  data_entrada: string;
  numero_nf: string | null;
  chave_nf: string | null;
  valor_total: number;
  suppliers?: { razao_social: string };
  created_at: string;
}

export interface SaidaEstoque {
  id: string;
  company_id: string;
  produto_id: string;
  quantidade: number;
  valor_unitario: number;
  tipo: string;
  motivo: string | null;
  lote: string | null;
  created_at: string;
}

export interface Inventario {
  id: string;
  company_id: string;
  data_inicio: string;
  descricao: string | null;
  status: "aberto" | "concluido" | "cancelado";
  created_at: string;
}

export interface AlertaEstoqueMinimo {
  produto_id: string;
  company_id: string;
  codigo: string;
  descricao: string;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_medida: string;
  custo_medio: number;
  fornecedor_id: string | null;
  quantidade_repor: number;
}
