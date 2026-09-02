-- Migration: Add enriched_data column to leads table
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Add JSONB column for enriched data
ALTER TABLE leads ADD COLUMN IF NOT EXISTS enriched_data JSONB DEFAULT NULL;

-- 2. Add index for phone-based duplicate detection
CREATE INDEX IF NOT EXISTS idx_leads_telefone ON leads(telefone);

-- 3. Add website column if missing
ALTER TABLE leads ADD COLUMN IF NOT EXISTS website TEXT DEFAULT NULL;

-- 4. Add cnpj column if missing  
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cnpj TEXT DEFAULT NULL;

-- 5. Add responsavel column if missing
ALTER TABLE leads ADD COLUMN IF NOT EXISTS responsavel TEXT DEFAULT NULL;

COMMENT ON COLUMN leads.enriched_data IS 'JSON with CNPJ, QSA, SocialMedia, HealthPlan, EmployeeCount etc from enrichment';
