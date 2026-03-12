-- =====================================================
-- Migration: Regras de Conciliação + colunas de matching
-- Executar no Supabase SQL Editor
--
-- NOTA: chart_of_accounts JÁ EXISTE com colunas:
--   id, company_id, code, name, description, parent_id, level,
--   account_type, account_nature, is_analytical, dre_group, etc.
-- =====================================================

-- 1. Adicionar coluna recorrencia ao chart_of_accounts (não existia)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chart_of_accounts' AND column_name = 'recorrencia') THEN
    ALTER TABLE public.chart_of_accounts ADD COLUMN recorrencia text;
    COMMENT ON COLUMN public.chart_of_accounts.recorrencia IS 'Mensal | Quinzenal | Trimestral | Anual | Variável | Esporádico | Mensal/Anual';
  END IF;
END$$;

-- 2. Tabela conciliation_rules (NOVA)
CREATE TABLE IF NOT EXISTS public.conciliation_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id     uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  palavras_chave text[] NOT NULL,    -- busca OR, case-insensitive, sem acentos
  confianca      text NOT NULL,      -- 'Alta' | 'Média' | 'Baixa'
  acao           text NOT NULL,      -- 'auto-conciliar' | 'sugerir'
  recorrencia    text,
  ativa          boolean DEFAULT true,
  criada_em      timestamptz DEFAULT now()
);

-- GIN index para busca eficiente nas palavras-chave
CREATE INDEX IF NOT EXISTS idx_conciliation_rules_keywords  ON public.conciliation_rules USING GIN (palavras_chave);
CREATE INDEX IF NOT EXISTS idx_conciliation_rules_company   ON public.conciliation_rules (company_id);
CREATE INDEX IF NOT EXISTS idx_conciliation_rules_account   ON public.conciliation_rules (account_id);

-- RLS
ALTER TABLE public.conciliation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conciliation_rules_select" ON public.conciliation_rules
  FOR SELECT USING (
    company_id IN (
      SELECT uc.company_id FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "conciliation_rules_insert" ON public.conciliation_rules
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT uc.company_id FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "conciliation_rules_update" ON public.conciliation_rules
  FOR UPDATE USING (
    company_id IN (
      SELECT uc.company_id FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "conciliation_rules_delete" ON public.conciliation_rules
  FOR DELETE USING (
    company_id IN (
      SELECT uc.company_id FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
    )
  );

-- 3. Adicionar colunas de sugestão na bank_transactions (se não existirem)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_transactions' AND column_name = 'sugestao_conta_id') THEN
    ALTER TABLE public.bank_transactions ADD COLUMN sugestao_conta_id uuid REFERENCES public.chart_of_accounts(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_transactions' AND column_name = 'confianca_match') THEN
    ALTER TABLE public.bank_transactions ADD COLUMN confianca_match integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_transactions' AND column_name = 'metodo_match') THEN
    ALTER TABLE public.bank_transactions ADD COLUMN metodo_match text;
  END IF;
END$$;
