# OpenClaw — Guia Completo de Instalação, Configuração e Manutenção

## Visão Geral

O OpenClaw é uma aplicação que roda dentro do WSL (Windows Subsystem for Linux) no Windows.
O Gateway é o servidor central que gerencia tudo — ele precisa estar rodando para que o
dashboard funcione no navegador. As API keys dos provedores (Xiaomi, OpenRouter, etc.)
são configuradas separadamente do token de acesso ao Gateway.

**Arquitetura:**
- WSL (Ubuntu) → roda o Gateway do OpenClaw
- Gateway → servidor WebSocket na porta 18789
- Dashboard → interface no navegador que se conecta ao Gateway
- API keys → credenciais dos provedores de modelo (Xiaomi, OpenRouter, etc.)
- Token do Gateway → credencial de acesso ao próprio dashboard

---

## Etapa 1 — Instalar e Preparar o WSL

Abra o **PowerShell como Administrador** no Windows (clique direito no PowerShell >
"Executar como administrador").

### 1.1 Verificar se o WSL está instalado:

```powershell
wsl --list --verbose
```

Se o Ubuntu aparecer na lista (versão 2, estado Stopped), está tudo certo — pule para a
Etapa 2. Se der qualquer erro, siga os passos abaixo.

### 1.2 Corrigir erros comuns do WSL

Se aparecer "Falha catastrófica — Código de erro: Wsl/Service/E_UNEXPECTED":

```powershell
wsl --shutdown
```

Se não resolver, atualize o WSL:

```powershell
wsl --update
```

Reinicie o computador e tente novamente com `wsl`.

Se o update falhar com erro de disco (0x80070070), libere espaço em disco antes de
continuar. Limpe arquivos temporários:

```powershell
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
Clear-RecycleBin -Force -ErrorAction SilentlyContinue
cleanmgr /d C
```

Se ainda assim o WSL não iniciar, desative e reative completamente:

```powershell
dism.exe /online /disable-feature /featurename:Microsoft-Windows-Subsystem-Linux /norestart
dism.exe /online /disable-feature /featurename:VirtualMachinePlatform /norestart
```

Reinicie o computador. Em seguida:

```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

Reinicie o computador novamente. Depois instale o Ubuntu:

```powershell
wsl --install -d Ubuntu
```

### 1.3 Entrar no WSL

```powershell
wsl
```

---

## Etapa 2 — Iniciar o Gateway

Dentro do WSL, inicie o Gateway:

```bash
openclaw gateway run
```

Mantenha esse terminal aberto. Se fechar, o Gateway para e o dashboard desconecta.

Se o Gateway já estiver rodando (mensagem "gateway already running" ou "port 18789 is
already in use"), pare e reinicie:

```bash
openclaw gateway stop
openclaw gateway run
```

Para verificar o status do Gateway a qualquer momento:

```bash
openclaw gateway status
```

---

## Etapa 3 — Acessar o Dashboard

### Método recomendado (mais simples):

Abra outro terminal do WSL (mantendo o primeiro com o Gateway rodando) e execute:

```bash
openclaw dashboard
```

Esse comando abre o dashboard no navegador do Windows automaticamente com o token correto.

### Método manual (se o comando acima não funcionar):

Primeiro, descubra o token do Gateway:

```bash
grep -i "token" ~/.openclaw/openclaw.json
```

Copie o valor do token que aparecer. Depois, no navegador do Windows, acesse:

```
http://localhost:18789?token=VALOR_DO_TOKEN_AQUI
```

### Solução para erro de autenticação (token_mismatch):

Se o dashboard mostrar erro de conexão e os logs do Gateway exibirem
`reason=token_mismatch`, significa que o token no campo "Token do Gateway" do dashboard
está errado ou vazio. Copie o token correto com o comando grep acima e cole no campo
"Token do Gateway" na tela do dashboard.

---

## Etapa 4 — Configurar ou Alterar API Keys dos Provedores

Sempre dentro do WSL, execute:

```bash
openclaw configure
```

O assistente interativo será exibido. Siga estes passos:

1. **Where will the Gateway run?** → Selecione `Local (this machine)` e pressione Enter.
2. **What do you want to configure?** → Selecione `Model` e pressione Enter.
3. **Model/auth provider** → Escolha o provedor desejado:
   - Para Xiaomi: selecione `Xiaomi` diretamente.
   - Para OpenRouter: selecione `More...` e depois escolha `OpenRouter`.
4. **Método de autenticação** → Selecione o método adequado (ex: `Xiaomi Token Plan (Singapore)` para Xiaomi).
5. **Cole a nova API key** no campo solicitado e pressione Enter.
6. **Selecione os modelos** → Use as setas (↑/↓) para navegar, Tab para marcar/desmarcar modelos, e Enter para confirmar.
7. **What do you want to configure?** → Selecione `Done` e pressione Enter para finalizar.

### Para configurar mais de um provedor:

Repita o processo acima, mas na etapa 3 escolha um provedor diferente.
Por exemplo: configure primeiro o Xiaomi, depois rode `openclaw configure` novamente e
configure o OpenRouter.

---

## Etapa 5 — Reiniciar o Gateway Após Alterações

Após qualquer mudança de configuração (API key, modelo, provedor), reinicie o Gateway
para que as alterações tenham efeito:

```bash
openclaw gateway stop
openclaw gateway run
```

---

## Etapa 6 — Comandos de Referência Rápida

| Comando | Descrição |
|---------|-----------|
| `openclaw --help` | Lista todos os comandos disponíveis |
| `openclaw configure` | Assistente interativo de configuração |
| `openclaw dashboard` | Abre o dashboard no navegador com o token correto |
| `openclaw gateway run` | Inicia o Gateway (mantenha o terminal aberto) |
| `openclaw gateway stop` | Para o Gateway |
| `openclaw gateway status` | Mostra status detalhado do Gateway |
| `openclaw models status` | Verifica saúde dos modelos e autenticação |
| `openclaw models list` | Lista modelos disponíveis |
| `openclaw secrets list` | Lista secrets armazenados |
| `openclaw config get` | Mostra toda a configuração atual |
| `openclaw doctor` | Diagnóstico de problemas |
| `openclaw doctor --fix` | Repara problemas comuns automaticamente |
| `grep -i "token" ~/.openclaw/openclaw.json` | Mostra tokens armazenados no arquivo de configuração |

---

## Etapa 7 — Arquivos Importantes

| Arquivo / Caminho | Descrição |
|-------------------|-----------|
| `~/.openclaw/openclaw.json` | Arquivo principal de configuração |
| `~/.openclaw/openclaw.json.bak` | Backup automático da configuração |
| `~/.openclaw/workspace/` | Workspace do agente |
| `/tmp/openclaw/openclaw-*.log` | Logs diários do Gateway |

Para visualizar a configuração completa:

```bash
cat ~/.openclaw/openclaw.json
```

Para ver apenas linhas com tokens e keys:

```bash
grep -i "token\|key\|secret" ~/.openclaw/openclaw.json
```

---

## Fluxo Completo Resumido

1. PowerShell (Admin) → `wsl`
2. WSL (terminal 1) → `openclaw gateway run` [manter aberto]
3. WSL (terminal 2) → `openclaw dashboard` [abre no navegador]
4. Para trocar API key → `openclaw configure` → Model → Provedor → Nova key → Done
5. Após qualquer alteração → `openclaw gateway stop` → `openclaw gateway run`
6. Para diagnóstico → `openclaw doctor`
