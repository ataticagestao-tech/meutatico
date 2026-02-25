const BASE_URL = 'https://brasilapi.com.br/api'

export interface QSAMember {
  nome_socio: string
  cnpj_cpf_do_socio: string
  qualificacao_socio: string
  codigo_qualificacao_socio: number
  data_entrada_sociedade: string
  identificador_de_socio: number // 1=PJ, 2=PF, 3=Estrangeiro
  faixa_etaria: string
  codigo_faixa_etaria: number
  pais: string | null
  codigo_pais: number | null
  cpf_representante_legal: string
  nome_representante_legal: string
  codigo_qualificacao_representante_legal: number
  qualificacao_representante_legal: string
}

export interface CNPJResponse {
  cnpj: string
  razao_social: string
  nome_fantasia: string
  email: string | null
  ddd_telefone_1: string
  ddd_telefone_2: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  descricao_situacao_cadastral: string
  capital_social: number
  porte: string
  descricao_porte: string
  natureza_juridica: string
  situacao_cadastral: number
  data_inicio_atividade: string
  cnae_fiscal: number
  cnae_fiscal_descricao: string
  cnaes_secundarios: Array<{ codigo: number; descricao: string }>
  opcao_pelo_simples: boolean | null
  opcao_pelo_mei: boolean | null
  qsa: QSAMember[]
}

export interface CEPResponse {
  cep: string
  state: string
  city: string
  neighborhood: string
  street: string
}

export function formatPartnerDocument(raw: string): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return raw
}

export function getPartnerTypeLabel(id: number): string {
  switch (id) {
    case 1: return 'Pessoa Juridica'
    case 2: return 'Pessoa Fisica'
    case 3: return 'Estrangeiro'
    default: return 'Nao informado'
  }
}

export async function fetchCNPJ(cnpj: string): Promise<CNPJResponse> {
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) {
    throw new Error('CNPJ deve ter 14 digitos')
  }
  const res = await fetch(`${BASE_URL}/cnpj/v1/${clean}`)
  if (!res.ok) {
    throw new Error('CNPJ nao encontrado ou invalido')
  }
  return res.json()
}

export async function fetchCEP(cep: string): Promise<CEPResponse> {
  const clean = cep.replace(/\D/g, '')
  if (clean.length !== 8) {
    throw new Error('CEP deve ter 8 digitos')
  }
  const res = await fetch(`${BASE_URL}/cep/v1/${clean}`)
  if (!res.ok) {
    throw new Error('CEP nao encontrado')
  }
  return res.json()
}
