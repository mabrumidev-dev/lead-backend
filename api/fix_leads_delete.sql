-- Fix: allow DELETE on leads table
-- Option 1: Disable RLS entirely
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;

-- Option 2 (if Option 1 doesn't work): Grant explicit DELETE
GRANT DELETE ON public.leads TO anon;
GRANT DELETE ON public.leads TO authenticated;
