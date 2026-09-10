@echo off
:: Hyper-V Cleanup - Launcher
:: Execute como Administrador (clique direito → Executar como administrador)

echo.
echo  ========================================
echo   Hyper-V Disk Space Cleanup Tool
echo  ========================================
echo.

:: Verifica se é admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERRO] Execute como Administrador!
    echo  Clique direito neste arquivo → Executar como administrador
    echo.
    pause
    exit /b 1
)

:: Executa o script PowerShell
powershell -ExecutionPolicy Bypass -File "%~dp0HyperV-Cleanup.ps1"

pause
