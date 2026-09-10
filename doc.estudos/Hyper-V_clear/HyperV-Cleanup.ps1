#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Hyper-V Disk Space Cleanup Tool
    Ferramenta interativa para limpeza e manutenção de VMs do Hyper-V

.DESCRIPTION
    Automatiza o processo de identificação e resolução de problemas de espaço em disco
    causados por máquinas virtuais do Hyper-V: snapshots acumulados, arquivos .avhdx
    antigos e discos .vhdx não compactados.

.NOTES
    Autor: Dev.Pks ⚡ (gerado a partir de manutenção real)
    Requer: PowerShell 5.1+ como Administrador, módulo Hyper-V
    Compatível: Windows 10/11 Pro, Windows Server 2016+
#>

# ============================================================
# CONFIGURAÇÕES
# ============================================================
$ErrorActionPreference = "Stop"
$LogFile = "$PSScriptRoot\hyperv-cleanup-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$Level] $Message"
    Write-Host $line -ForegroundColor $(switch ($Level) {
        "ERROR" { "Red" }
        "WARN"  { "Yellow" }
        "OK"    { "Green" }
        default { "White" }
    })
    Add-Content -Path $LogFile -Value $line
}

function Show-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║     Hyper-V Disk Space Cleanup Tool  ⚡ Dev.Pks        ║" -ForegroundColor Cyan
    Write-Host "  ║     Manutenção e Limpeza de Espaço em Disco             ║" -ForegroundColor Cyan
    Write-Host "  ╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Get-DiskInfo {
    Get-PSDrive C | Select-Object `
        @{N="UsedGB";E={[math]::Round($_.Used/1GB,2)}}, `
        @{N="FreeGB";E={[math]::Round($_.Free/1GB,2)}}, `
        @{N="TotalGB";E={[math]::Round(($_.Used+$_.Free)/1GB,2)}}
}

function Show-DiskStatus {
    $disk = Get-DiskInfo
    Write-Host ""
    Write-Host "  ┌─────────────── Disco C: ───────────────┐" -ForegroundColor Yellow
    Write-Host "  │  Usado:   $($disk.UsedGB.ToString().PadLeft(10)) GB              │" -ForegroundColor Yellow
    Write-Host "  │  Livre:   $($disk.FreeGB.ToString().PadLeft(10)) GB              │" -ForegroundColor Yellow
    Write-Host "  │  Total:   $($disk.TotalGB.ToString().PadLeft(10)) GB              │" -ForegroundColor Yellow
    Write-Host "  └────────────────────────────────────────┘" -ForegroundColor Yellow
    Write-Host ""
    return $disk
}

function Confirm-Action {
    param([string]$Prompt, [bool]$Default = $false)
    $choices = if ($Default) { "[S/n]" } else { "[s/N]" }
    $response = Read-Host "  $Prompt $choices"
    if ([string]::IsNullOrWhiteSpace($response)) { return $Default }
    return $response -match "^[sS]"
}

# ============================================================
# ETAPA 1: DIAGNÓSTICO
# ============================================================

function Invoke-Diagnostic {
    Write-Log "Iniciando diagnóstico completo..."
    Write-Host "`n  ═══ DIAGNÓSTICO COMPLETO ═══" -ForegroundColor Cyan

    # 1.1 Espaço em disco
    $disk = Show-DiskStatus

    # 1.2 Pastas que mais ocupam espaço
    Write-Host "  📁 Top 10 pastas que mais ocupam espaço:" -ForegroundColor Yellow
    Get-ChildItem "C:\" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        [PSCustomObject]@{Folder=$_.FullName; SizeGB=[math]::Round($size/1GB,2)}
    } | Sort-Object SizeGB -Descending | Select-Object -First 10 | Format-Table -AutoSize

    # 1.3 Discos virtuais
    Write-Host "  💾 Discos virtuais encontrados:" -ForegroundColor Yellow
    $vhdxFiles = Get-ChildItem "C:\" -Filter "*.vhdx" -Recurse -ErrorAction SilentlyContinue
    $avhdxFiles = Get-ChildItem "C:\" -Filter "*.avhdx" -Recurse -ErrorAction SilentlyContinue

    if ($vhdxFiles) {
        $vhdxTotal = ($vhdxFiles | Measure-Object -Property Length -Sum).Sum / 1GB
        Write-Host "     .vhdx: $($vhdxFiles.Count) arquivos ($([math]::Round($vhdxTotal,2)) GB)" -ForegroundColor White
        $vhdxFiles | Select-Object FullName, @{N="SizeGB";E={[math]::Round($_.Length/1GB,2)}} | Format-Table -AutoSize
    } else {
        Write-Host "     .vhdx: nenhum encontrado" -ForegroundColor Gray
    }

    if ($avhdxFiles) {
        $avhdxTotal = ($avhdxFiles | Measure-Object -Property Length -Sum).Sum / 1GB
        Write-Host "     .avhdx: $($avhdxFiles.Count) arquivos ($([math]::Round($avhdxTotal,2)) GB)" -ForegroundColor Red
        $avhdxFiles | Select-Object FullName, @{N="SizeGB";E={[math]::Round($_.Length/1GB,2)}} | Format-Table -AutoSize
    } else {
        Write-Host "     .avhdx: nenhum encontrado" -ForegroundColor Green
    }

    # 1.4 Estado das VMs
    Write-Host "  🖥️  Máquinas Virtuais:" -ForegroundColor Yellow
    try {
        $vms = Get-VM
        $vms | Select-Object Name, State, Status | Format-Table -AutoSize

        # Snapshots por VM
        $hasSnapshots = $false
        foreach ($vm in $vms) {
            $snaps = Get-VMSnapshot -VMName $vm.Name -ErrorAction SilentlyContinue
            if ($snaps) {
                $hasSnapshots = $true
                Write-Host "     ⚠️  $($vm.Name): $($snaps.Count) snapshot(s)" -ForegroundColor Red
                $snaps | Select-Object Name, CreationTime, SnapshotType | Format-Table -AutoSize
            }
        }
        if (-not $hasSnapshots) {
            Write-Host "     ✅ Nenhum snapshot encontrado" -ForegroundColor Green
        }

        # VMs apontando para .avhdx
        foreach ($vm in $vms) {
            $vhd = Get-VHD -VMId $vm.VMId -ErrorAction SilentlyContinue
            if ($vhd.Path -like "*.avhdx") {
                Write-Host "     ⚠️  $($vm.Name) aponta para .avhdx: $($vhd.Path)" -ForegroundColor Red
            }
        }
    } catch {
        Write-Host "     Erro ao listar VMs: $_" -ForegroundColor Red
    }

    # 1.5 Arquivos maiores que 1GB
    Write-Host "  📄 Arquivos maiores que 1 GB:" -ForegroundColor Yellow
    Get-ChildItem "C:\" -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Length -gt 1GB } |
        Sort-Object Length -Descending |
        Select-Object @{N="SizeGB";E={[math]::Round($_.Length/1GB,2)}}, FullName -First 15 |
        Format-Table -AutoSize

    Write-Log "Diagnóstico concluído. Livre: $($disk.FreeGB) GB"
    return $disk
}

# ============================================================
# ETAPA 2: LIMPEZA DE SNAPSHOTS
# ============================================================

function Invoke-SnapshotCleanup {
    Write-Log "Iniciando limpeza de snapshots..."
    Write-Host "`n  ═══ LIMPEZA DE SNAPSHOTS ═══" -ForegroundColor Cyan

    try {
        $vms = Get-VM
        $totalDeleted = 0

        foreach ($vm in $vms) {
            $snaps = Get-VMSnapshot -VMName $vm.Name -ErrorAction SilentlyContinue
            if ($snaps) {
                Write-Host "  🗑️  $($vm.Name): $($snaps.Count) snapshot(s) encontrado(s)" -ForegroundColor Yellow
                foreach ($snap in $snaps) {
                    Write-Host "     - $($snap.Name) ($(Get-Date $snap.CreationTime -Format 'dd/MM/yyyy HH:mm'))" -ForegroundColor Gray
                }

                if (Confirm-Action "Deletar snapshots de $($vm.Name)?") {
                    $snaps | Remove-VMSnapshot
                    Write-Log "Snapshots de $($vm.Name) deletados ($($snaps.Count))" "OK"
                    Write-Host "     ✅ $($snaps.Count) snapshot(s) deletado(s)" -ForegroundColor Green
                    $totalDeleted += $snaps.Count
                } else {
                    Write-Host "     ⏭️  Pulado" -ForegroundColor Gray
                }
            }
        }

        if ($totalDeleted -eq 0) {
            Write-Host "  ✅ Nenhum snapshot para deletar" -ForegroundColor Green
        } else {
            Write-Log "Total de snapshots deletados: $totalDeleted" "OK"
            Write-Host "`n  ✅ Total: $totalDeleted snapshot(s) deletado(s)" -ForegroundColor Green
            Write-Host "  ⏳ Aguardando consolidação dos discos (pode levar alguns minutos)..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        }
    } catch {
        Write-Log "Erro na limpeza de snapshots: $_" "ERROR"
        Write-Host "  ❌ Erro: $_" -ForegroundColor Red
    }
}

# ============================================================
# ETAPA 3: MESCLAGEM DE .avhdx
# ============================================================

function Invoke-AVHDXMerge {
    Write-Log "Verificando arquivos .avhdx restantes..."
    Write-Host "`n  ═══ MESCLAGEM DE .avhdx ═══" -ForegroundColor Cyan

    # Busca em locais comuns do Hyper-V
    $searchPaths = @(
        "C:\HYPER-V",
        "C:\ProgramData\Microsoft\Windows\Hyper-V",
        "C:\Users\Public\Documents\Hyper-V",
        "C:\"
    )

    $avhdxFiles = @()
    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            $found = Get-ChildItem $path -Filter "*.avhdx" -Recurse -ErrorAction SilentlyContinue
            $avhdxFiles += $found
        }
    }
    $avhdxFiles = $avhdxFiles | Sort-Object FullName -Unique

    if (-not $avhdxFiles) {
        Write-Host "  ✅ Nenhum arquivo .avhdx encontrado" -ForegroundColor Green
        return
    }

    Write-Host "  📎 $($avhdxFiles.Count) arquivo(s) .avhdx encontrado(s):" -ForegroundColor Yellow
    $avhdxFiles | Select-Object FullName, @{N="SizeGB";E={[math]::Round($_.Length/1GB,2)}} | Format-Table -AutoSize

    if (-not (Confirm-Action "Tentar mesclar automaticamente?")) {
        return
    }

    $merged = 0
    foreach ($avhdx in $avhdxFiles) {
        # Tenta encontrar o .vhdx correspondente (mesmo nome base na mesma pasta)
        $parentDir = Split-Path $avhdx.FullName -Parent
        $baseName = $avhdx.Name -replace '_[A-F0-9-]+\.avhdx$', '.vhdx'
        $vhdxPath = Join-Path $parentDir $baseName

        if (-not (Test-Path $vhdxPath)) {
            # Tenta buscar .vhdx na pasta
            $vhdxCandidates = Get-ChildItem $parentDir -Filter "*.vhdx" -ErrorAction SilentlyContinue
            if ($vhdxCandidates.Count -eq 1) {
                $vhdxPath = $vhdxCandidates[0].FullName
            } else {
                Write-Host "  ⚠️  Não encontrei .vhdx para: $($avhdx.Name)" -ForegroundColor Yellow
                Write-Host "     Pasta: $parentDir" -ForegroundColor Gray
                continue
            }
        }

        Write-Host "  🔀 Mesclando: $($avhdx.Name) → $(Split-Path $vhdxPath -Leaf)" -ForegroundColor Yellow
        try {
            Merge-VHD -Path $avhdx.FullName -DestinationPath $vhdxPath
            Write-Host "     ✅ Mesclado com sucesso" -ForegroundColor Green
            Write-Log "Mesclado: $($avhdx.Name) → $vhdxPath" "OK"
            $merged++

            # Deleta o .avhdx após mesclagem bem-sucedida
            Remove-Item $avhdx.FullName -Force
            Write-Host "     🗑️  .avhdx removido" -ForegroundColor Green
        } catch {
            Write-Host "     ❌ Erro na mesclagem: $_" -ForegroundColor Red
            Write-Log "Erro mesclando $($avhdx.Name): $_" "ERROR"
        }
    }

    Write-Host "`n  ✅ $merged/$($avhdxFiles.Count) arquivo(s) mesclado(s)" -ForegroundColor Green
}

# ============================================================
# ETAPA 4: DESLIGAMENTO DAS VMs
# ============================================================

function Invoke-VMShutdown {
    Write-Log "Desligando VMs para compactação..."
    Write-Host "`n  ═══ DESLIGAMENTO DAS VMs ═══" -ForegroundColor Cyan

    try {
        $runningVMs = Get-VM | Where-Object { $_.State -ne "Off" }

        if (-not $runningVMs) {
            Write-Host "  ✅ Todas as VMs já estão desligadas" -ForegroundColor Green
            return $true
        }

        Write-Host "  🖥️  VMs em execução:" -ForegroundColor Yellow
        $runningVMs | Select-Object Name, State | Format-Table -AutoSize

        if (-not (Confirm-Action "Desligar todas as VMs listadas?")) {
            return $false
        }

        foreach ($vm in $runningVMs) {
            Write-Host "  ⏻  Desligando $($vm.Name) (estado: $($vm.State))..." -ForegroundColor Yellow
            try {
                Stop-VM -Name $vm.Name -Force
                Write-Host "     ✅ Desligada" -ForegroundColor Green
                Write-Log "$($vm.Name) desligada" "OK"
            } catch {
                Write-Host "     ❌ Erro: $_" -ForegroundColor Red
                Write-Log "Erro desligando $($vm.Name): $_" "ERROR"
            }
        }

        # Aguarda desligamento completo
        Start-Sleep -Seconds 3
        $still = Get-VM | Where-Object { $_.State -ne "Off" }
        if ($still) {
            Write-Host "  ⚠️  VMs ainda rodando:" -ForegroundColor Red
            $still | Select-Object Name, State | Format-Table -AutoSize
            return $false
        }

        Write-Host "  ✅ Todas as VMs desligadas" -ForegroundColor Green
        return $true
    } catch {
        Write-Log "Erro no desligamento: $_" "ERROR"
        return $false
    }
}

# ============================================================
# ETAPA 5: COMPACTAÇÃO DOS DISCOS
# ============================================================

function Invoke-DiskCompaction {
    Write-Log "Iniciando compactação dos discos virtuais..."
    Write-Host "`n  ═══ COMPACTAÇÃO DOS DISCOS VIRTUAIS ═══" -ForegroundColor Cyan

    try {
        $vms = Get-VM
        $compacted = 0
        $totalSaved = 0

        foreach ($vm in $vms) {
            $vhd = Get-VHD -VMId $vm.VMId -ErrorAction SilentlyContinue
            if (-not $vhd -or -not (Test-Path $vhd.Path)) { continue }

            $sizeBefore = (Get-Item $vhd.Path).Length / 1GB
            Write-Host "  💾 $($vm.Name): $([math]::Round($sizeBefore,2)) GB" -ForegroundColor Yellow

            if ($vm.State -ne "Off") {
                Write-Host "     ⏭️  Pulada (VM não está desligada)" -ForegroundColor Gray
                continue
            }

            if (-not (Confirm-Action "Compactar disco de $($vm.Name)?")) {
                continue
            }

            try {
                Optimize-VHD -Path $vhd.Path -Mode Full
                $sizeAfter = (Get-Item $vhd.Path).Length / 1GB
                $saved = $sizeBefore - $sizeAfter
                $totalSaved += $saved

                Write-Host "     ✅ $([math]::Round($sizeBefore,2)) GB → $([math]::Round($sizeAfter,2)) GB (economia: $([math]::Round($saved,2)) GB)" -ForegroundColor Green
                Write-Log "$($vm.Name) compactada: $([math]::Round($saved,2)) GB economizados" "OK"
                $compacted++
            } catch {
                if ($_.Exception.Message -like "*0x800700AA*") {
                    Write-Host "     ❌ Recurso em uso — VM pode não estar completamente desligada" -ForegroundColor Red
                    Write-Host "        Tente: Stop-VM -Name $($vm.Name) -Force" -ForegroundColor Gray
                } else {
                    Write-Host "     ❌ Erro: $_" -ForegroundColor Red
                }
                Write-Log "Erro compactando $($vm.Name): $_" "ERROR"
            }
        }

        Write-Host "`n  ✅ $compacted disco(s) compactado(s) — Economia total: $([math]::Round($totalSaved,2)) GB" -ForegroundColor Green
    } catch {
        Write-Log "Erro na compactação: $_" "ERROR"
    }
}

# ============================================================
# ETAPA 6: LIMPEZA GERAL DO WINDOWS
# ============================================================

function Invoke-WindowsCleanup {
    Write-Log "Iniciando limpeza geral do Windows..."
    Write-Host "`n  ═══ LIMPEZA GERAL DO WINDOWS ═══" -ForegroundColor Cyan

    $freedTotal = 0

    # Arquivos temporários
    if (Confirm-Action "Limpar arquivos temporários?") {
        $before = (Get-PSDrive C).Free
        Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
        $after = (Get-PSDrive C).Free
        $freed = ($after - $before) / 1MB
        Write-Host "  ✅ Temporários: $([math]::Round($freed,2)) MB limpos" -ForegroundColor Green
        Write-Log "Temporários: $([math]::Round($freed,2)) MB" "OK"
    }

    # Lixeira
    if (Confirm-Action "Esvaziar lixeira?") {
        $before = (Get-PSDrive C).Free
        Clear-RecycleBin -Force -ErrorAction SilentlyContinue
        $after = (Get-PSDrive C).Free
        $freed = ($after - $before) / 1MB
        Write-Host "  ✅ Lixeira: $([math]::Round($freed,2)) MB limpos" -ForegroundColor Green
        Write-Log "Lixeira: $([math]::Round($freed,2)) MB" "OK"
    }

    # Cache npm
    if (Confirm-Action "Limpar cache do npm?") {
        $before = (Get-PSDrive C).Free
        Remove-Item "$env:APPDATA\npm-cache" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:APPDATA\npm" -Recurse -Force -ErrorAction SilentlyContinue
        $after = (Get-PSDrive C).Free
        $freed = ($after - $before) / 1MB
        Write-Host "  ✅ npm cache: $([math]::Round($freed,2)) MB limpos" -ForegroundColor Green
    }

    # Cache pip
    if (Confirm-Action "Limpar cache do pip?") {
        $before = (Get-PSDrive C).Free
        Remove-Item "$env:LOCALAPPDATA\pip\cache" -Recurse -Force -ErrorAction SilentlyContinue
        $after = (Get-PSDrive C).Free
        $freed = ($after - $before) / 1MB
        Write-Host "  ✅ pip cache: $([math]::Round($freed,2)) MB limpos" -ForegroundColor Green
    }

    # Windows Update cleanup
    if (Confirm-Action "Limpar cache do Windows Update?") {
        Stop-Service wuauserv -Force -ErrorAction SilentlyContinue
        $before = (Get-PSDrive C).Free
        Remove-Item "C:\Windows\SoftwareDistribution\Download\*" -Recurse -Force -ErrorAction SilentlyContinue
        Start-Service wuauserv -ErrorAction SilentlyContinue
        $after = (Get-PSDrive C).Free
        $freed = ($after - $before) / 1MB
        Write-Host "  ✅ Windows Update: $([math]::Round($freed,2)) MB limpos" -ForegroundColor Green
    }
}

# ============================================================
# ETAPA 7: RELIGAR VMs
# ============================================================

function Invoke-VMStart {
    Write-Log "Religando VMs..."
    Write-Host "`n  ═══ RELIGAR VMs ═══" -ForegroundColor Cyan

    try {
        $offVMs = Get-VM | Where-Object { $_.State -eq "Off" }

        if (-not $offVMs) {
            Write-Host "  ✅ Nenhuma VM desligada para religar" -ForegroundColor Green
            return
        }

        Write-Host "  🖥️  VMs desligadas:" -ForegroundColor Yellow
        $offVMs | Select-Object Name | Format-Table -AutoSize

        if (Confirm-Action "Religar todas as VMs?") {
            foreach ($vm in $offVMs) {
                try {
                    Start-VM -Name $vm.Name
                    Write-Host "  ✅ $($vm.Name) religada" -ForegroundColor Green
                    Write-Log "$($vm.Name) religada" "OK"
                } catch {
                    Write-Host "  ❌ Erro ao religar $($vm.Name): $_" -ForegroundColor Red
                }
            }
        }
    } catch {
        Write-Log "Erro ao religar VMs: $_" "ERROR"
    }
}

# ============================================================
# RELATÓRIO FINAL
# ============================================================

function Show-FinalReport {
    param($DiskBefore)

    Write-Log "Gerando relatório final..."
    Write-Host "`n  ═══ RELATÓRIO FINAL ═══" -ForegroundColor Cyan

    $diskAfter = Get-DiskInfo
    $freed = $diskAfter.FreeGB - $DiskBefore.FreeGB

    Write-Host ""
    Write-Host "  ┌────────────────── RESULTADO ──────────────────┐" -ForegroundColor Green
    Write-Host "  │                                               │" -ForegroundColor Green
    Write-Host "  │  Antes:    $($DiskBefore.FreeGB.ToString().PadLeft(10)) GB livre              │" -ForegroundColor Green
    Write-Host "  │  Depois:   $($diskAfter.FreeGB.ToString().PadLeft(10)) GB livre              │" -ForegroundColor Green
    Write-Host "  │  Liberado: $([math]::Round($freed,2).ToString().PadLeft(10)) GB                     │" -ForegroundColor Green
    Write-Host "  │                                               │" -ForegroundColor Green
    Write-Host "  └───────────────────────────────────────────────┘" -ForegroundColor Green
    Write-Host ""

    # Status das VMs
    Write-Host "  📊 Estado final das VMs:" -ForegroundColor Yellow
    Get-VM | Select-Object Name, State | Format-Table -AutoSize

    # Snapshots restantes
    $totalSnaps = 0
    foreach ($vm in (Get-VM)) {
        $snaps = (Get-VMSnapshot -VMName $vm.Name -ErrorAction SilentlyContinue).Count
        $totalSnaps += $snaps
    }
    if ($totalSnaps -eq 0) {
        Write-Host "  ✅ Nenhum snapshot restante" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $totalSnaps snapshot(s) restante(s)" -ForegroundColor Yellow
    }

    # .avhdx restantes
    $avhdxCount = (Get-ChildItem "C:\" -Filter "*.avhdx" -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count
    if ($avhdxCount -eq 0) {
        Write-Host "  ✅ Nenhum arquivo .avhdx restante" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $avhdxCount arquivo(s) .avhdx restante(s)" -ForegroundColor Yellow
    }

    Write-Log "Relatório final — Livre: $($diskAfter.FreeGB) GB | Liberado: $([math]::Round($freed,2)) GB"
    Write-Host "`n  📄 Log salvo em: $LogFile" -ForegroundColor Gray
}

# ============================================================
# MENU PRINCIPAL
# ============================================================

function Show-Menu {
    Write-Host ""
    Write-Host "  ┌──────────────── MENU ────────────────┐" -ForegroundColor White
    Write-Host "  │                                      │" -ForegroundColor White
    Write-Host "  │  1. 🔍 Diagnóstico completo          │" -ForegroundColor White
    Write-Host "  │  2. 🗑️  Limpar snapshots              │" -ForegroundColor White
    Write-Host "  │  3. 🔀 Mesclar .avhdx                │" -ForegroundColor White
    Write-Host "  │  4. 💾 Compactar discos virtuais     │" -ForegroundColor White
    Write-Host "  │  5. 🧹 Limpeza geral do Windows      │" -ForegroundColor White
    Write-Host "  │                                      │" -ForegroundColor White
    Write-Host "  │  6. ⚡ EXECUTAR TUDO (automático)    │" -ForegroundColor Cyan
    Write-Host "  │  7. 🔄 Religar VMs                   │" -ForegroundColor White
    Write-Host "  │                                      │" -ForegroundColor White
    Write-Host "  │  0. ❌ Sair                          │" -ForegroundColor White
    Write-Host "  │                                      │" -ForegroundColor White
    Write-Host "  └──────────────────────────────────────┘" -ForegroundColor White
    Write-Host ""
}

# ============================================================
# EXECUÇÃO PRINCIPAL
# ============================================================

function Start-HyperVCleanup {
    Show-Banner

    # Verifica se é admin
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Host "  ❌ Este script precisa ser executado como Administrador!" -ForegroundColor Red
        Write-Host "     Clique direito no PowerShell → Executar como administrador" -ForegroundColor Yellow
        Read-Host "  Pressione Enter para sair"
        return
    }

    # Verifica módulo Hyper-V
    try {
        Import-Module Hyper-V -ErrorAction Stop
        Write-Log "Módulo Hyper-V carregado" "OK"
    } catch {
        Write-Host "  ❌ Módulo Hyper-V não disponível!" -ForegroundColor Red
        Write-Host "     Execute em uma máquina com Hyper-V habilitado" -ForegroundColor Yellow
        Read-Host "  Pressione Enter para sair"
        return
    }

    $diskBefore = $null

    while ($true) {
        Show-Menu
        $choice = Read-Host "  Escolha uma opção"

        switch ($choice) {
            "1" { $diskBefore = Invoke-Diagnostic }
            "2" { Invoke-SnapshotCleanup }
            "3" { Invoke-AVHDXMerge }
            "4" {
                if (-not $diskBefore) { $diskBefore = Get-DiskInfo }
                $shutdownOk = Invoke-VMShutdown
                if ($shutdownOk) {
                    Invoke-DiskCompaction
                    Invoke-VMStart
                }
            }
            "5" { Invoke-WindowsCleanup }
            "6" {
                Write-Host "`n  ⚡ MODO AUTOMÁTICO — Executando todas as etapas..." -ForegroundColor Cyan
                $diskBefore = Invoke-Diagnostic
                Invoke-SnapshotCleanup
                Invoke-AVHDXMerge
                $shutdownOk = Invoke-VMShutdown
                if ($shutdownOk) {
                    Invoke-DiskCompaction
                    Invoke-WindowsCleanup
                    Invoke-VMStart
                }
                Show-FinalReport -DiskBefore $diskBefore
            }
            "7" { Invoke-VMStart }
            "0" {
                Write-Host "`n  👋 Até mais!" -ForegroundColor Cyan
                return
            }
            default {
                Write-Host "  ❌ Opção inválida" -ForegroundColor Red
            }
        }

        if ($choice -ne "0") {
            Read-Host "`n  Pressione Enter para continuar"
        }
    }
}

# Iniciar
Start-HyperVCleanup
