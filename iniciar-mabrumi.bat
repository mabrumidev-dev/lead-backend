@echo off
echo ============================================
echo   MABRUMI CRM - Iniciando Servidores
echo ============================================
echo.
echo [1/2] Instalando dependencias Python...
pip install -r api\requirements.txt --user -q
echo.
echo [2/2] Iniciando servidores...
echo.
echo   Frontend (Vite): http://localhost:5173
echo   Backend (API):   http://localhost:8002
echo.
echo   Pressione Ctrl+C para parar ambos.
echo.

start "Mabrumi API" cmd /c "cd /d %~dp0api && python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload"
start "Mabrumi Frontend" cmd /c "cd /d %~dp0 && npx.cmd vite"

echo.
echo Servidores iniciados!
echo.
pause
