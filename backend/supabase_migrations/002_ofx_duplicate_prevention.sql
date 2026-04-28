-- =====================================================
-- Migration: Prevenção de duplicatas no import OFX
-- Executar no Supabase SQL Editor
--
-- Adiciona:
--   1. Coluna fitid (identificador único OFX por transação)
--   2. Coluna bank_account_id (conta bancária origem)
--   3. Coluna import_hash (hash de data+valor+descrição como fallback)
--   4. Tabela ofx_import_history (histórico de importações)
--   5. Unique constraint para evitar duplicatas
-- =====================================================

-- 1. Adicionar colunas de controle de duplicata na bank_transactions
DO $$
BEGIN
  -- FITID: identificador único que vem dentro do arquivo OFX
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_transactions' AND column_name = 'fitid') THEN
    ALTER TABLE public.bank_transactions ADD COLUMN fitid text;
    COMMENT ON COLUMN public.bank_transactions.fitid IS 'Financial Institution Transaction ID — identificador único do OFX';
  END IF;

  -- bank_account_id: referência à conta bancária
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_transactions' AND column_name = 'bank_account_id') THEN
    ALTER TABLE public.bank_transactions ADD COLUMN bank_account_id uuid REFERENCES public.bank_accounts(id);
  END IF;

  -- import_hash: SHA256 de (date|amount|description|bank_account_id) — fallback quando fitid é vazio
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_transactions' AND column_name = 'import_hash') THEN
    ALTER TABLE public.bank_transactions ADD COLUMN import_hash text;
    COMMENT ON COLUMN public.bank_transactions.import_hash IS 'SHA256(date|amount|description|bank_account_id) — fallback anti-duplicata';
  END IF;

  -- imported_at: quando foi importado via OFX
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_transactions' AND column_name = 'imported_at') THEN
    ALTER TABLE public.bank_transactions ADD COLUMN imported_at timestamptz;
  END IF;

  -- import_file_id: referência ao arquivo OFX que originou
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_transactions' AND column_name = 'import_file_id') THEN
    ALTER TABLE public.bank_transactions ADD COLUMN import_file_id uuid;
  END IF;
END$$;

-- 2. Índices para busca rápida de duplicatas
CREATE INDEX IF NOT EXISTS idx_bank_transactions_fitid
  ON public.bank_transactions (company_id, bank_account_id, fitid)
  WHERE fitid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_import_hash
  ON public.bank_transactions (company_id, import_hash)
  WHERE import_hash IS NOT NULL;

-- 3. Unique constraint: mesma conta + mesmo fitid = duplicata
-- Usa partial unique para ignorar fitid NULL
CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_transactions_fitid
  ON public.bank_transactions (company_id, bank_account_id, fitid)
  WHERE fitid IS NOT NULL AND fitid != '';

-- 4. Unique constraint fallback: mesmo hash = duplicata
CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_transactions_import_hash
  ON public.bank_transactions (company_id, import_hash)
  WHERE import_hash IS NOT NULL AND import_hash != '';

-- 5. Tabela de histórico de importações OFX
CREATE TABLE IF NOT EXISTS public.ofx_import_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  file_name      text NOT NULL,
  file_hash      text NOT NULL,           -- SHA256 do conteúdo do arquivo
  total_in_file  integer NOT NULL DEFAULT 0,
  imported       integer NOT NULL DEFAULT 0,
  skipped_dupes  integer NOT NULL DEFAULT 0,
  date_range_start date,
  date_range_end   date,
  imported_at    timestamptz DEFAULT now(),
  imported_by    text                      -- user email ou id
);

CREATE INDEX IF NOT EXISTS idx_ofx_import_history_company
  ON public.ofx_import_history (company_id);

CREATE INDEX IF NOT EXISTS idx_ofx_import_history_file_hash
  ON public.ofx_import_history (company_id, file_hash);

-- RLS para ofx_import_history
ALTER TABLE public.ofx_import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ofx_import_history_select" ON public.ofx_import_history
  FOR SELECT USING (
    company_id IN (
      SELECT uc.company_id FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "ofx_import_history_insert" ON public.ofx_import_history
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT uc.company_id FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
    )
  );
