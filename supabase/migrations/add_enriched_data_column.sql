-- Migration: Add enriched data columns to leads table
-- Run this ENTIRE script in Supabase Dashboard > SQL Editor

-- 1. Add individual columns for quick queries
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cnpj TEXT DEFAULT NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS responsavel TEXT DEFAULT NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS website TEXT DEFAULT NULL;

-- 2. Add JSONB column for full enriched payload
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enriched_data JSONB DEFAULT NULL;

-- 3. Add soft-delete column (for restore functionality)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_leads_telefone ON leads(telefone);
CREATE INDEX IF NOT EXISTS idx_leads_cnpj ON leads(cnpj);
CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON leads(deleted_at);

-- 5. Comments
COMMENT ON COLUMN leads.enriched_data IS 'Full enriched payload: CNPJ, QSA, Social Media, Health Plan, Employee Count, etc.';
COMMENT ON COLUMN leads.deleted_at IS 'Soft delete timestamp. NULL = active, non-NULL = deleted (restorable)';
