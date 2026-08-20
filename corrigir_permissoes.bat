@echo off
start "" "https://supabase.com/dashboard/project/urkmbwatmwmdeilvlhsp/sql/new"
echo.
echo =============================================
echo   Cole este SQL no Editor e clique em RUN:
echo =============================================
echo.
echo DROP POLICY IF EXISTS "Permitir insercao leads" ON leads;
echo CREATE POLICY "Permitir insercao leads" ON leads FOR INSERT WITH CHECK (true);
echo DROP POLICY IF EXISTS "Permitir leitura leads" ON leads;
echo CREATE POLICY "Permitir leitura leads" ON leads FOR SELECT USING (true);
echo.
echo =============================================
pause
