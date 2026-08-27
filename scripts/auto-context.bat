@echo off
echo === MABRUMI AUTO-CONTEXT ===
echo Salvando contexto automaticamente...
powershell -ExecutionPolicy Bypass -File "%~dp0auto-context.ps1"
echo.
echo Contexto salvo com sucesso!
pause
