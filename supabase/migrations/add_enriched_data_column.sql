-- Migration: Add enriched_data JSONB column to leads table
-- Run this in Supabase SQL Editor

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS enriched_data JSONB DEFAULT NULL;

-- Create index for faster lookups on phone for dedup
CREATE INDEX IF NOT EXISTS idx_leads_telefone ON leads(telefone);

COMMENT ON COLUMN leads.enriched_data IS 'Stores enriched lead data: CNPJ, Razão Social, Responsável, QSA, Social Media, Health Plan info, Employee count';
