# download_cnpj.ps1 — Script PowerShell para baixar dados CNPJ no Windows
# Execute com: powershell -ExecutionPolicy Bypass -File download_cnpj.ps1
# Idealmente conectado em outra rede (4G, trabalho, etc.)

$ErrorActionPreference = "Stop"
$dest = "D:\Downloads\CNPJ"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$base = "https://dados.rfb.gov.br/CNPJ"

# Lista de todos os arquivos
$files = @(
    # Auxiliares
    "CNAE.zip", "Motivos.zip", "Naturezas.zip", "Paises.zip",
    "Qualificacoes.zip", "Municipios.zip"
)

# Empresas, Estabelecimentos, Socios (0-9)
for ($i = 0; $i -lt 10; $i++) {
    $files += "Empresas$i.zip"
    $files += "Estabelecimentos$i.zip"
    $files += "Socios$i.zip"
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Download de dados CNPJ - Receita Federal" -ForegroundColor Cyan
Write-Host "  Destino: $dest" -ForegroundColor Cyan
Write-Host "  Total: $($files.Count) arquivos" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$downloaded = 0
$skipped = 0
$failed = 0

foreach ($file in $files) {
    $url = "$base/$file"
    $outFile = Join-Path $dest $file

    if (Test-Path $outFile) {
        $size = (Get-Item $outFile).Length / 1MB
        Write-Host "  ⏭️  $file já existe ($([math]::Round($size,1)) MB)" -ForegroundColor DarkGray
        $skipped++
        continue
    }

    Write-Host "  ⬇️  Baixando $file..." -ForegroundColor Yellow -NoNewline
    try {
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($url, $outFile)
        $size = (Get-Item $outFile).Length / 1MB
        Write-Host " ✅ ($([math]::Round($size,1)) MB)" -ForegroundColor Green
        $downloaded++
    } catch {
        Write-Host " ❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Resumo:" -ForegroundColor Cyan
Write-Host "  Baixados: $downloaded" -ForegroundColor Green
Write-Host "  Já existiam: $skipped" -ForegroundColor DarkGray
Write-Host "  Falharam: $failed" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "✅ Todos os arquivos baixados!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximo passo — copiar pro WSL:" -ForegroundColor Yellow
    Write-Host "  wsl -e bash -c 'cp /mnt/d/Downloads/CNPJ/*.zip /home/mabrumi/.openclaw/workspace/mabrumi-crm-pro/cnpj_service/data/'" -ForegroundColor White
    Write-Host ""
    Write-Host "Depois rodar o loader:" -ForegroundColor Yellow
    Write-Host "  wsl -e bash -c 'cd /home/mabrumi/.openclaw/workspace/mabrumi-crm-pro/cnpj_service && bash load-only.sh'" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "⚠️ $failed arquivos falharam. Tente novamente quando o servidor voltar." -ForegroundColor Yellow
}
