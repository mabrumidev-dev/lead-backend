# Hyper-V — Guia Completo de Manutenção e Limpeza de Espaço em Disco

## Visão Geral

Este guia ensina como identificar e resolver problemas de espaço em disco causados por
máquinas virtuais do Hyper-V. As causas mais comuns de consumo excessivo de espaço são:
snapshots (pontos de verificação) acumulados, arquivos .avhdx antigos e discos virtuais
.vhdx que não foram compactados após a remoção de dados.

**Arquitetura do Hyper-V:**
- `.vhdx` → disco virtual principal da VM (arquivo que cresce conforme dados são gravados)
- `.avhdx` → arquivo de snapshot (cópia do estado da VM em um ponto específico)
- `.VMRS` → arquivo de estado salvo da VM (memória RAM salva em disco)
- O Hyper-V roda na **máquina física (host)**, não dentro das VMs

---

## Etapa 1 — Verificar o Espaço em Disco

Abra o **PowerShell como Administrador** na máquina física.

### 1.1 Verifique o espaço livre atual

```powershell
Get-PSDrive C | Select-Object Used, Free, @{Name="UsedGB";Expression={[math]::Round($_.Used/1GB,2)}}, @{Name="FreeGB";Expression={[math]::Round($_.Free/1GB,2)}}
```

### 1.2 Identifique as pastas que mais ocupam espaço no disco C:

```powershell
Get-ChildItem "C:\" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    [PSCustomObject]@{Folder=$_.FullName; SizeGB=[math]::Round($size/1GB,2)}
} | Sort-Object SizeGB -Descending | Format-Table -AutoSize
```

### 1.3 Identifique subpastas com mais de 10 GB

```powershell
Get-ChildItem "C:\" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
    $sub = Get-ChildItem $_.FullName -Directory -ErrorAction SilentlyContinue
    foreach ($s in $sub) {
        $size = (Get-ChildItem $s.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        if ($size -gt 10GB) {
            [PSCustomObject]@{Path=$s.FullName; SizeGB=[math]::Round($size/1GB,2)}
        }
    }
} | Sort-Object SizeGB -Descending | Format-Table -AutoSize
```

### 1.4 Encontre todos os discos virtuais (.vhdx e .avhdx)

```powershell
Get-ChildItem "C:\" -Filter "*.vhdx" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName, @{Name="SizeGB";Expression={[math]::Round($_.Length/1GB,2)}}
```

```powershell
Get-ChildItem "C:\" -Filter "*.avhdx" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName, @{Name="SizeGB";Expression={[math]::Round($_.Length/1GB,2)}}
```

### 1.5 Encontre os maiores arquivos do disco (acima de 1 GB)

```powershell
Get-ChildItem "C:\" -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt 1GB } | Sort-Object Length -Descending | Select-Object @{Name="SizeGB";Expression={[math]::Round($_.Length/1GB,2)}}, FullName
```

---

## Etapa 2 — Verificar o Estado das VMs

### 2.1 Liste todas as VMs e seus estados

```powershell
Get-VM | Select-Object Name, State, Status | Format-Table -AutoSize
```

**Estados possíveis:**

| Estado | Significado |
|--------|-------------|
| Running | VM ligada e em execução |
| Off | VM desligada |
| Saved | VM com estado salvo (memória RAM gravada em disco) |

### 2.2 Veja qual disco cada VM está usando

```powershell
Get-VM | ForEach-Object {
    $vhdx = Get-VHD -VMId $_.VMId
    [PSCustomObject]@{VM=$_.Name; State=$_.State; Disk=$vhdx.Path}
} | Format-Table -AutoSize
```

**Interpretação:**
- Se o caminho termina em `.vhdx` → disco principal (correto)
- Se o caminho termina em `.avhdx` → disco de snapshot (precisa ser mesclado)

### 2.3 Veja o tamanho de cada disco virtual

```powershell
Get-VM | ForEach-Object {
    $vhdx = Get-VHD -VMId $_.VMId
    [PSCustomObject]@{VM=$_.Name; SizeGB=[math]::Round((Get-Item $vhdx.Path).Length/1GB,2)}
} | Sort-Object SizeGB -Descending | Format-Table -AutoSize
```

---

## Etapa 3 — Verificar e Deletar Snapshots

### 3.1 Liste os snapshots de todas as VMs

```powershell
Get-VM | ForEach-Object {
    $snaps = (Get-VMSnapshot -VMName $_.Name -ErrorAction SilentlyContinue).Count
    [PSCustomObject]@{VM=$_.Name; Snapshots=$snaps}
} | Format-Table -AutoSize
```

Se algum valor for maior que 0, essa VM tem snapshots que podem ser deletados.

### 3.2 Veja os detalhes dos snapshots de uma VM específica

```powershell
Get-VMSnapshot -VMName BOT1 | Select-Object Name, CreationTime, SnapshotType
```

### 3.3 Delete os snapshots de uma VM específica

```powershell
Get-VMSnapshot -VMName BOT1 | Remove-VMSnapshot
```

### 3.4 Delete os snapshots de todas as VMs de uma vez

```powershell
Get-VM | ForEach-Object {
    $snaps = Get-VMSnapshot -VMName $_.Name -ErrorAction SilentlyContinue
    if ($snaps) {
        Write-Host "Deletando snapshots de $($_.Name)..."
        $snaps | Remove-VMSnapshot
        Write-Host "$($_.Name) concluído!"
    }
}
```

### 3.5 Verifique se todos os snapshots foram removidos

```powershell
Get-VM | ForEach-Object {
    $snaps = (Get-VMSnapshot -VMName $_.Name -ErrorAction SilentlyContinue).Count
    [PSCustomObject]@{VM=$_.Name; Snapshots=$snaps}
} | Format-Table -AutoSize
```

Todos devem mostrar 0.

**Impacto da exclusão de snapshots:**
- A VM continua funcionando normalmente
- Nenhum dado é perdido
- Apenas a opção de restaurar para aquele ponto antigo é removida
- Os arquivos .avhdx são consolidados no .vhdx principal

---

## Etapa 4 — Desligar as VMs

O `Optimize-VHD` exige que a VM esteja desligada (estado Off).

### 4.1 Verifique o estado das VMs

```powershell
Get-VM | Select-Object Name, State
```

### 4.2 Desligue uma VM específica

```powershell
Stop-VM -Name BOT1 -Force
```

### 4.3 Desligue todas as VMs

```powershell
Get-VM | Where-Object { $_.State -ne "Off" } | Stop-VM -Force
```

### 4.4 Verifique se todas desligaram

```powershell
Get-VM | Select-Object Name, State
```

Todas devem mostrar `Off`.

---

## Etapa 5 — Mesclar Discos .avhdx no .vhdx Principal

Se após deletar os snapshots ainda existirem arquivos .avhdx, é necessário mesclá-los no .vhdx principal.

### 5.1 Liste os arquivos .avhdx restantes

```powershell
Get-ChildItem "C:\HYPER-V" -Filter "*.avhdx" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName, @{Name="SizeGB";Expression={[math]::Round($_.Length/1GB,2)}}
```

### 5.2 Mescle cada .avhdx no .vhdx correspondente

Exemplo para BOT4:

```powershell
Merge-VHD -Path "C:\HYPER-V\BOT4\BOT1_3A27365A-3959-4B62-B07B-D6C63D5C01D6.avhdx" -DestinationPath "C:\HYPER-V\BOT4\BOT1.vhdx"
```

Repita para cada VM com .avhdx, ajustando os caminhos.

### 5.3 Atualize a VM para apontar para o .vhdx (se necessário)

```powershell
Get-VM | ForEach-Object {
    $vhdx = Get-VHD -VMId $_.VMId
    [PSCustomObject]@{VM=$_.Name; Disk=$vhdx.Path}
} | Format-Table -AutoSize
```

Se alguma VM ainda apontar para .avhdx, atualize pelo Gerenciador do Hyper-V:
1. Clique direito na VM → Configurações
2. Disco Rígido → Procurar → selecione o arquivo .vhdx
3. OK

### 5.4 Delete os arquivos .avhdx antigos

```powershell
Get-ChildItem "C:\HYPER-V" -Filter "*.avhdx" -Recurse | Remove-Item -Force
```

---

## Etapa 6 — Compactar os Discos Virtuais

O `Optimize-VHD` remove o espaço vazio dentro do .vhdx, reduzindo o tamanho do arquivo. Requer que a VM esteja desligada.

### 6.1 Compacte uma VM específica

```powershell
Optimize-VHD -Path "C:\HYPER-V\BOT1\BOT1.vhdx" -Mode Full
```

### 6.2 Compacte todas as VMs de uma vez

```powershell
Get-VM | ForEach-Object {
    $vhdx = Get-VHD -VMId $_.VMId
    Write-Host "Compactando $($_.Name): $($vhdx.Path)..."
    Optimize-VHD -Path $vhdx.Path -Mode Full
    Write-Host "$($_.Name) concluído!"
}
```

**Se der erro "Recurso solicitado em uso" (0x800700AA):**
- A VM não está completamente desligada ou o arquivo está travado
- Verifique se a VM está em estado Off (não Saved)
- Se estiver Saved: `Stop-VM -Name NOME -Force`
- Tente novamente

### 6.3 Verifique o tamanho dos discos após compactar

```powershell
Get-VM | ForEach-Object {
    $vhdx = Get-VHD -VMId $_.VMId
    [PSCustomObject]@{VM=$_.Name; SizeGB=[math]::Round((Get-Item $vhdx.Path).Length/1GB,2)}
} | Sort-Object SizeGB -Descending | Format-Table -AutoSize
```

---

## Etapa 7 — Limpeza Geral do Windows

Além das VMs, outros arquivos podem consumir espaço:

### 7.1 Arquivos temporários

```powershell
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
```

### 7.2 Lixeira

```powershell
Clear-RecycleBin -Force -ErrorAction SilentlyContinue
```

### 7.3 Cache do npm

```powershell
Remove-Item "$env:APPDATA\npm-cache" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "C:\Users\Administrador\.npm" -Recurse -Force -ErrorAction SilentlyContinue
```

### 7.4 Limpeza de disco do Windows

```powershell
cleanmgr /d C
```

Marque todas as opções e clique em OK.

---

## Etapa 8 — Religar as VMs

### 8.1 Ligue uma VM específica

```powershell
Start-VM -Name BOT1
```

### 8.2 Ligue todas as VMs

```powershell
Get-VM | Where-Object { $_.State -eq "Off" } | Start-VM
```

### 8.3 Verifique se todas estão rodando

```powershell
Get-VM | Select-Object Name, State
```

---

## Etapa 9 — Verificação Final

### 9.1 Espaço livre no disco

```powershell
Get-PSDrive C | Select-Object @{Name="FreeGB";Expression={[math]::Round($_.Free/1GB,2)}}
```

### 9.2 Estado das VMs

```powershell
Get-VM | Select-Object Name, State | Format-Table -AutoSize
```

### 9.3 Tamanho dos discos virtuais

```powershell
Get-VM | ForEach-Object {
    $vhdx = Get-VHD -VMId $_.VMId
    [PSCustomObject]@{VM=$_.Name; SizeGB=[math]::Round((Get-Item $vhdx.Path).Length/1GB,2)}
} | Sort-Object SizeGB -Descending | Format-Table -AutoSize
```

### 9.4 Snapshots restantes (deve ser 0)

```powershell
Get-VM | ForEach-Object {
    $snaps = (Get-VMSnapshot -VMName $_.Name -ErrorAction SilentlyContinue).Count
    [PSCustomObject]@{VM=$_.Name; Snapshots=$snaps}
} | Format-Table -AutoSize
```

### 9.5 Arquivos .avhdx restantes (deve ser 0)

```powershell
Get-ChildItem "C:\HYPER-V" -Filter "*.avhdx" -Recurse -ErrorAction SilentlyContinue | Measure-Object | Select-Object Count
```

---

## Fluxo Rápido Resumido

```
1. Verificar espaço livre        → Get-PSDrive C
2. Ver estado das VMs             → Get-VM
3. Ver snapshots de todas as VMs  → Get-VMSnapshot
4. Deletar todos os snapshots     → Remove-VMSnapshot (todas as VMs)
5. Desligar todas as VMs          → Stop-VM -Force
6. Mesclar .avhdx no .vhdx        → Merge-VHD (se houver)
7. Atualizar VM para .vhdx        → Gerenciador do Hyper-V (se houver)
8. Deletar .avhdx antigos         → Remove-Item *.avhdx
9. Compactar todos os discos      → Optimize-VHD -Mode Full
10. Limpar arquivos temporários   → Remove-Item $env:TEMP\*
11. Religar todas as VMs          → Start-VM
12. Verificar espaço final        → Get-PSDrive C
```

---

## Comandos de Referência Rápida

| Comando | Descrição |
|---------|-----------|
| `Get-VM` | Lista todas as VMs e seus estados |
| `Get-VMSnapshot -VMName NOME` | Lista snapshots de uma VM |
| `Get-VMSnapshot -VMName NOME \| Remove-VMSnapshot` | Deleta todos os snapshots de uma VM |
| `Stop-VM -Name NOME -Force` | Desliga uma VM |
| `Start-VM -Name NOME` | Liga uma VM |
| `Get-VHD -VMId (Get-VM -Name NOME).VMId` | Mostra o disco virtual de uma VM |
| `Merge-VHD -Path .avhdx -DestinationPath .vhdx` | Mescle snapshot no disco principal |
| `Optimize-VHD -Path CAMINHO -Mode Full` | Compacta um disco virtual |
| `Get-PSDrive C` | Mostra espaço livre no disco |
| `Get-ChildItem "C:\HYPER-V" -Filter "*.avhdx" -Recurse` | Lista arquivos de snapshot restantes |

---

## Erros Comuns e Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| "Recurso solicitado em uso" (0x800700AA) | VM não está desligada | `Stop-VM -Name NOME -Force` |
| "Edição não disponível" no Hyper-V Manager | Existem snapshots ativos | Delete os snapshots primeiro |
| `Get-VM` não reconhecido | Módulo Hyper-V não carregado | `Import-Module Hyper-V` ou rode na máquina física |
| `Optimize-VHD` falhou | VM em estado Saved | `Stop-VM -Name NOME -Force` |
| .avhdx ainda existe após deletar snapshots | Snapshot não foi consolidado | Use `Merge-VHD` manualmente |

---

## Resultado Obtido nesta Máquina (Referência)

| Métrica | Antes | Depois |
|---------|-------|--------|
| Espaço livre | 0,56 GB | 133,85 GB |
| Espaço liberado | — | ~133 GB |
| Snapshots totais | 23 | 0 |
| Arquivos .avhdx | 11 | 0 |
| VMs compactadas | 0 | 10 |
