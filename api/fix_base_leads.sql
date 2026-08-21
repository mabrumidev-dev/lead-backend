-- Corrigir tabela base_leads - adicionar colunas faltantes
-- Rode este SQL no Supabase Dashboard > SQL Editor

-- Verificar e adicionar colunas que podem estar faltando
DO $$ BEGIN
  ALTER TABLE base_leads ADD COLUMN IF NOT EXISTS lead_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE base_leads ADD COLUMN IF NOT EXISTS nome TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE base_leads ADD COLUMN IF NOT EXISTS telefone TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE base_leads ADD COLUMN IF NOT EXISTS cidade TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE base_leads ADD COLUMN IF NOT EXISTS nicho TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE base_leads ADD COLUMN IF NOT EXISTS email TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE base_leads ADD COLUMN IF NOT EXISTS idade INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE base_leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 70;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE base_leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE base_leads ADD COLUMN IF NOT EXISTS fonte TEXT DEFAULT 'website';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE base_leads ADD COLUMN IF NOT EXISTS added_to_base_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE base_leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Garantir que user_id existe
DO $$ BEGIN
  ALTER TABLE base_leads ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Habilitar RLS e policies
ALTER TABLE base_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_base_leads_select" ON base_leads;
CREATE POLICY "rls_base_leads_select" ON base_leads FOR SELECT USING (true);

DROP POLICY IF EXISTS "rls_base_leads_insert" ON base_leads;
CREATE POLICY "rls_base_leads_insert" ON base_leads FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "rls_base_leads_update" ON base_leads;
CREATE POLICY "rls_base_leads_update" ON base_leads FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "rls_base_leads_delete" ON base_leads;
CREATE POLICY "rls_base_leads_delete" ON base_leads FOR DELETE USING (auth.role() = 'authenticated');

-- Conceder permissões à role authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON base_leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON base_leads TO service_role;
