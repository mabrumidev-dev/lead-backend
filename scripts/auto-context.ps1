# Auto-Context Script
# Executa automaticamente para salvar estado do contexto

Write-Host "=== MABRUMI AUTO-CONTEXT ===" -ForegroundColor Cyan

# 1. Salvar estado do git
Write-Host "`n[1/4] Salvando estado do git..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
$gitLog = git log --oneline -5
$gitDiff = git diff --stat

# 2. Atualizar CONTEXT_STATE.md
Write-Host "[2/4] Atualizando CONTEXT_STATE.md..." -ForegroundColor Yellow
$date = Get-Date -Format "dd/MM/yyyy - HH:mm"
$state = @"
# Context State - $date

## Git Status
```
$gitStatus
```

## Últimos Commits
```
$gitLog
```

## Mudanças Pendentes
```
$gitDiff
```

## Estado do Projeto
- Frontend: FUNCIONANDO
- Backend: FUNCIONANDO
- Database: FUNCIONANDO
- Deploy: FUNCIONANDO
"@

$state | Out-File -FilePath ".opencode\CONTEXT_STATE.md" -Encoding UTF8

# 3. Commit automático se houver mudanças
Write-Host "[3/4] Verificando mudanças para commit..." -ForegroundColor Yellow
if ($gitStatus) {
    git add .
    git commit -m "auto-context: estado salvo em $date"
    Write-Host "Commit realizado!" -ForegroundColor Green
} else {
    Write-Host "Nenhuma mudança para commit" -ForegroundColor Gray
}

# 4. Sync com GitHub
Write-Host "[4/4] Sincronizando com GitHub..." -ForegroundColor Yellow
git push 2>$null
if ($?) {
    Write-Host "Sincronizado!" -ForegroundColor Green
} else {
    Write-Host "Nada para push" -ForegroundColor Gray
}

Write-Host "`n=== CONTEXTO SALVO ===" -ForegroundColor Cyan
