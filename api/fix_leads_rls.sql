-- FIX: permitir INSERT na tabela leads (permission denied)
-- Rode este SQL no Supabase Dashboard > SQL Editor

-- Remover qualquer policy de INSERT existente
DROP POLICY IF EXISTS "Permitir insercao leads" ON leads;
DROP POLICY IF EXISTS "Permitir inserção leads" ON leads;
DROP POLICY IF EXISTS "leads_insert_policy" ON leads;
DROP POLICY IF EXISTS "Insert leads" ON leads;

-- Criar policy de INSERT que permite para todos
CREATE POLICY "Permitir insercao leads" ON leads
  FOR INSERT
  WITH CHECK (true);

-- Tambem garantir SELECT
DROP POLICY IF EXISTS "Permitir leitura leads" ON leads;
CREATE POLICY "Permitir leitura leads" ON leads
  FOR SELECT
  USING (true);
