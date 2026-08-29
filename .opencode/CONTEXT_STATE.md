# Context State - 28/08/2026 - 23:50

## COMANDO PARA NOVA SESSÃO
Copie e cole isso no início do próximo chat:
```
Leia .opencode/CONTEXT_STATE.md e .opencode/COMMANDS.md. Retome o projeto mabrumi-crm-pro de onde paramos. Último commit: 5d8b3bc.
```

## STATUS ATUAL
- **Branch**: main
- **Último Commit**: 5d8b3bc (28/08 ~23:50)
- **Deploy Backend**: https://lead-backend-rezr.onrender.com (Render, Docker, 512MB RAM)
- **GitHub**: https://github.com/mabrumidev-dev/lead-backend.git
- **Repo local**: D:\OpenCode_Projetos\mabrumi-crm-pro

## O QUE FOI FEITO HOJE (28/08/2026)

### 1. Scraper Google Maps - Corrigido
- Coleta links via JS evaluation (não CSS selectors)
- Extrai dados via JS (nome, telefone, endereço, rating)
- Para scroll cedo quando tem links suficientes (limit * 4)
- Trunca lista para limit * 3
- Fecha e reabre página entre leads (memória)
- Orçamento rígido de 25s no lookup_cnpj
- Phone normalization com DDD validation

### 2. Fallback CNPJ - Implementado mas ABORTADO
- Busca Google/Bing/DuckDuckGo por CNPJ foi abortada
- Todos os motores de busca bloqueiam requests automatizados
- Não existe API gratuita para busca de CNPJ por nome
- Enriquecimento CNPJ (4 estratégias) continua funcionando normalmente

### 3. Correções de Hoje
- **GoogleMapsScraper.tsx**: Removido `age: null` do insert (tabela leads não tem coluna 'age')
- **lead.ts**: Tornado `age` opcional no tipo Lead
- **GoogleMapsScraper.tsx**: Tabela mostra NomeFantasia/RazaoSocial quando Responsavel vazio (cor ciano)
- **client.ts**: Configurado Supabase com autoRefreshToken, persistSession, flowType pkce
- **App.tsx**: Adicionado listener onAuthStateChange para refresh automático de token

### 4. Supabase Auth - Problema identificado
- Token refresh retorna 400 Bad Request
- Causa provável: configuração JWT expiry ou refresh token rotation no dashboard
- **Pendente**: Usuário precisa verificar no Supabase Dashboard:
  - Authentication > Settings > JWT Time Limit (recomendado: 3600)
  - Authentication > Settings > Refresh Token Rotation (recomendado: desativar)
  - Authentication > Settings > Refresh Token Expiry (default: 86400)

## O QUE FUNCIONA AGORA
- Scraper Google Maps (coleta + extração via JS)
- Enriquecimento CNPJ (4 estratégias com budget 25s)
- Tabela mostra dados enriquecidos (CNPJ, RazaoSocial, NomeFantasia)
- Redes sociais (Yahoo/DDG)
- Plano de saúde (ANS + web search)
- Contagem de funcionários (Wikipedia + Bing + LinkedIn)
- Vision AI (Groq API)
- Base de leads com Supabase
- Disparo WhatsApp
- Importação CSV
- Fallback de leads: quando scraper falha, mostra dados básicos do Google Maps

## SERVIDORES
- Backend: http://localhost:8002 (uvicorn)
- Frontend: http://localhost:5173 (Vite)
- Produção: https://lead-backend-rezr.onrender.com
- Para iniciar: `cd api && python -m uvicorn main:app --reload --port 8002`
- Frontend: `cmd /k "npm run dev"` (PowerShell bloqueia npm.ps1)

## LIMITAÇÕES CONHECIDAS
- Render free tier: 512MB RAM, instances morrem após ~4 min
- Google bloqueia buscas automatizadas (requests E Playwright headless)
- DuckDuckGo bloqueia após múltiplos requests (rate limit)
- Supabase auth token pode expirar (verificar JWT expiry no dashboard)

## PRÓXIMOS PASSOS
- [ ] Verificar JWT expiry no Supabase Dashboard
- [ ] Testar logout/login para gerar novo token
- [ ] Testar enriquecimento completo após novo login
- [ ] Upgrade Render para plano pago
- [ ] Considerar caching de resultados
