-- ============================================================
-- Migration: Unificar tabelas leads + base_leads
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================================
-- Esta migration:
--   1. Adiciona colunas faltantes na tabela leads
--   2. Copia dados de base_leads para leads (se existir)
--   3. Cria índices para performance
--   4. NÃO remove base_leads automaticamente (confirmação manual)
-- ============================================================

-- ── 1. Adicionar colunas necessárias na tabela leads ──

-- enriched_data (jsonb) — dados de enriquecimento CNPJ, QSA, etc.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enriched_data JSONB DEFAULT NULL;

-- saved_at — timestamp quando o lead foi salvo na base (NULL = não salvo)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ DEFAULT NULL;

-- user_id — dono do lead (para multi-tenancy)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT NULL;

-- website — site da empresa
ALTER TABLE leads ADD COLUMN IF NOT EXISTS website TEXT DEFAULT NULL;

-- cnpj — CNPJ da empresa
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cnpj TEXT DEFAULT NULL;

-- responsavel — responsável pela empresa
ALTER TABLE leads ADD COLUMN IF NOT EXISTS responsavel TEXT DEFAULT NULL;

-- deleted_at — soft delete timestamp
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- added_to_base_at — alias para saved_at (compatibilidade)
-- (usamos saved_at como nome oficial)

-- ── 2. Copiar dados de base_leads para leads (se tabela existir) ──

DO $$
BEGIN
  -- Só executa se base_leads existir
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'base_leads') THEN
    
    -- Inserir leads de base_leads que não existem em leads (por lead_id)
    INSERT INTO leads (
      id, nome, email, telefone, idade, cidade, plano, status, score, fonte,
      created_at, enriched_data, saved_at, user_id, deleted_at
    )
    SELECT 
      COALESCE(bl.lead_id, bl.id::text),
      bl.nome,
      bl.email,
      bl.telefone,
      bl.idade,
      bl.cidade,
      COALESCE(bl.nicho, bl.plan, 'Individual'),
      COALESCE(bl.status, 'new'),
      COALESCE(bl.score, 70),
      COALESCE(bl.fonte, 'website'),
      COALESCE(bl.created_at, bl.added_to_base_at, NOW()),
      bl.enriched_data,
      bl.added_to_base_at,
      bl.user_id,
      bl.deleted_at
    FROM base_leads bl
    WHERE NOT EXISTS (
      SELECT 1 FROM leads l WHERE l.id = COALESCE(bl.lead_id, bl.id::text)
    )
    ON CONFLICT (id) DO NOTHING;

    -- Para leads que já existem em ambas as tabelas, atualizar saved_at e enriched_data
    UPDATE leads l
    SET 
      saved_at = bl.added_to_base_at,
      user_id = COALESCE(l.user_id, bl.user_id),
      enriched_data = COALESCE(l.enriched_data, bl.enriched_data)
    FROM base_leads bl
    WHERE l.id = COALESCE(bl.lead_id, bl.id::text)
      AND bl.added_to_base_at IS NOT NULL;

    RAISE NOTICE 'Dados de base_leads migrados com sucesso!';
  ELSE
    RAISE NOTICE 'Tabela base_leads não existe, pulando migração de dados.';
  END IF;
END $$;

-- ── 3. Criar índices para performance ──

-- Índice para filtrar leads salvos (base)
CREATE INDEX IF NOT EXISTS idx_leads_saved_at ON leads(saved_at) WHERE saved_at IS NOT NULL;

-- Índice para filtrar por user_id
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id) WHERE user_id IS NOT NULL;

-- Índice para soft delete
CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON leads(deleted_at) WHERE deleted_at IS NOT NULL;

-- Índice para telefone (busca por telefone)
CREATE INDEX IF NOT EXISTS idx_leads_telefone ON leads(telefone);

-- Índice composto para queries comuns: user_id + saved_at + deleted_at
CREATE INDEX IF NOT EXISTS idx_leads_user_saved ON leads(user_id, saved_at) WHERE deleted_at IS NULL;

-- ── 4. Comentários ──

COMMENT ON COLUMN leads.enriched_data IS 'JSON com dados de enriquecimento: CNPJ, QSA, SocialMedia, HealthPlan, EmployeeCount';
COMMENT ON COLUMN leads.saved_at IS 'Timestamp quando o lead foi salvo na base do usuário. NULL = não salvo.';
COMMENT ON COLUMN leads.user_id IS 'ID do usuário dono do lead (Supabase Auth UUID)';

-- ── 5. Verificação ──

DO $$
DECLARE
  total_leads INT;
  saved_leads INT;
  base_leads_count INT;
BEGIN
  SELECT COUNT(*) INTO total_leads FROM leads;
  SELECT COUNT(*) INTO saved_leads FROM leads WHERE saved_at IS NOT NULL;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'base_leads') THEN
    SELECT COUNT(*) INTO base_leads_count FROM base_leads;
    RAISE NOTICE '=== RESUMO ===';
    RAISE NOTICE 'leads total: %', total_leads;
    RAISE NOTICE 'leads com saved_at: %', saved_leads;
    RAISE NOTICE 'base_leads (legado): %', base_leads_count;
  ELSE
    RAISE NOTICE '=== RESUMO ===';
    RAISE NOTICE 'leads total: %', total_leads;
    RAISE NOTICE 'leads com saved_at: %', saved_leads;
  END IF;
END $$;

-- ============================================================
-- ATENÇÃO: Após confirmar que tudo funciona, execute:
-- 
-- DROP TABLE IF EXISTS base_leads CASCADE;
--
-- Mas SÓ depois de atualizar o frontend para usar apenas leads!
-- ============================================================
