-- Criar tabela base_leads no Supabase
-- Rode este SQL no Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS base_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id TEXT,
  nome TEXT,
  telefone TEXT,
  cidade TEXT,
  nicho TEXT,
  email TEXT,
  idade INTEGER,
  score INTEGER DEFAULT 70,
  status TEXT DEFAULT 'new',
  fonte TEXT DEFAULT 'website',
  added_to_base_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE base_leads ENABLE ROW LEVEL SECURITY;

-- Permitir leitura para todos (anon + authenticated)
CREATE POLICY "Permitir leitura base_leads" ON base_leads
  FOR SELECT USING (true);

-- Permitir inserção para authenticated
CREATE POLICY "Permitir inserção base_leads" ON base_leads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Permitir update para authenticated
CREATE POLICY "Permitir update base_leads" ON base_leads
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Permitir delete para authenticated
CREATE POLICY "Permitir delete base_leads" ON base_leads
  FOR DELETE USING (auth.role() = 'authenticated');
