# Watch Script - Monitora mudanças e salva contexto
# Executa: .\watch-context.ps1

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = Get-Location
$watcher.IncludeSubdirectories = $true
$watcher.Filter = "*.tsx,*.ts,*.py"
$watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite

$action = {
    $path = $Event.SourceEventArgs.FullPath
    $changeType = $Event.SourceEventArgs.ChangeType
    $date = Get-Date -Format "HH:mm:ss"
    
    Write-Host "[$date] Mudanca detectada: $path ($changeType)" -ForegroundColor Yellow
    
    # Salvar contexto
    & "$PSScriptRoot\auto-context.ps1"
}

Register-ObjectEvent $watcher "Changed" -Action $action
Register-ObjectEvent $watcher "Created" -Action $action
Register-ObjectEvent $watcher "Deleted" -Action $action

Write-Host "=== MONITORANDO MUDANCAS ===" -ForegroundColor Cyan
Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Gray

try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    $watcher.Dispose()
}
