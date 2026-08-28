# Guia de Recuperação - Mabrumi CRM

## Situações de Emergência

### 1. PERDA TOTAL DO CÓDIGO
```bash
# Clonar do GitHub
git clone https://github.com/mabrumidev-dev/lead-backend.git
cd lead-backend

# Instalar dependências
pip install -r requirements.txt
npm install

# Build do frontend
npm run build

# Iniciar backend
cd api
python -m uvicorn main:app --host 0.0.0.0 --port 8002
```

### 2. DADOS PERDIDOS NO SUPABASE
- Acesse: https://app.supabase.com
- Tabelas: `leads`, `base_leads`
- Backup automático: Supabase mantém backups diários
- Exportar: Settings → Database → Backups

### 3. DEPLOY QUEBRADO NO RENDER
- Acesse: https://dashboard.render.com
- Service: `lead-backend-rezr`
- Options → Manual Deploy → Deploy latest commit
- Logs: Monitoring → Logs

### 4. RESTAURAR COMMIT ANTERIOR
```bash
# Ver histórico
git log --oneline -10

# Restaurar commit específico
git checkout <commit-hash>

# Ou criar branch do commit
git checkout -b recovery <commit-hash>
```

### 5. CONTEXTO PERDIDO
- Ler: `.opencode/CONTEXT_STATE.md`
- Skills: `.opencode/skills/`
- Contexto salvo automaticamente a cada mudança

## Contas Importantes

### GitHub
- Repo: https://github.com/mabrumidev-dev/lead-backend
- User: mabrumidev-dev

### Supabase
- Dashboard: https://app.supabase.com
- Tabelas: leads, base_leads
- Auth: Habilitado

### Render
- Dashboard: https://dashboard.render.com
- Service: lead-backend-rezr
- Plan: Starter (512MB RAM)

## Comandos Úteis

### Ver status do projeto
```bash
git status
git log --oneline -5
```

### Testar localmente
```bash
# Backend
cd api
python -m uvicorn main:app --reload --port 8002

# Frontend
cmd /k "npm run dev"
```

### Deploy manual
```bash
git add .
git commit -m "mensagem"
git push
# Depois: Render → Manual Deploy → Deploy latest commit
```

### Diagnóstico do Scraper
```bash
# Ver logs do Render
# Dashboard → lead-backend-rezr → Monitoring → Logs
# Filtrar por: [SCRAPE] ou [PARSING]

# Problemas comuns:
# 1. "0 results" → Scraper não encontra links no feed
#    Causa: Google Maps mudou CSS classes
#    Solução: Usar JS evaluation (document.querySelectorAll)

# 2. Instance restarted → OOM kill (512MB free tier)
#    Causa: Chromium consome muita memória
#    Solução: Fechar/reabrir página entre leads

# 3. SyntaxWarning: invalid escape sequence
#    Causa: Regex com \d em string normal
#    Solução: Usar raw string r"""
```

## Checklist de Segurança

- [ ] Código no GitHub (versionado)
- [ ] Dados no Supabase (backup automático)
- [ ] Deploy no Render (auto-deploy do GitHub)
- [ ] Contexto em .opencode/CONTEXT_STATE.md
- [ ] Skills documentadas em .opencode/skills/

## Contato de Emergência

Se tudo falhar:
1. GitHub Issues: https://github.com/mabrumidev-dev/lead-backend/issues
2. Supabase Support: https://supabase.com/support
3. Render Support: https://render.com/docs
