# Context State - 28/08/2026 - 23:00

## COMANDO PARA NOVA SESSÃO
```
Leia .opencode/CONTEXT_STATE.md e continue de onde paramos
```

## STATUS ATUAL
- **Branch**: main
- **Último Commit**: ed10063 (28/08 ~23:00)
- **Descrição**: Fallback CNPJ funcional com DuckDuckGo (Google bloqueia requests)
- **Deploy**: lead-backend-rezr (Render) - LIVE e funcionando

## PROBLEMA RESOLVIDO HOJE
Fallback CNPJ usava `requests` para buscar no Google, mas Google bloqueia 
buscas automatizadas (retorna CAPTCHA). Testei Playwright headless — também 
é bloqueado pelo Google. Solução: trocar para **DuckDuckGo HTML** que não 
bloqueia e encontra CNPJs perfeitamente.

**Testes realizados:**
- Autopecas Kadah → CNPJ 03171868000142 (KADAH-IMPORTACAO, EXPORTACAO E COMERCIO LTDA) ✅
- Evaldo Pecas → CNPJ 35038736000133 (EVALDO AUTO PECAS LTDA) ✅

## O QUE FUNCIONA
- Scraper Google Maps: coleta links via JS, extrai dados via JS (sem CSS selectors)
- **Fallback CNPJ via DuckDuckGo**: busca CNPJ no DDG quando scraper/ enrichment falham
- Enriquecimento CNPJ (4 estratégias) com budget rígido de 25s
- Enrich endpoint: timeout 30s lookup + 12s fallback
- Redes sociais (Yahoo/DDG)
- Plano de saúde (ANS + web search)
- Contagem de funcionários (Wikipedia + Bing + LinkedIn)
- Vision AI (Groq API)
- Base de leads com Supabase
- Disparo WhatsApp
- Importação CSV

## SERVIDORES
- Backend: http://localhost:8002
- Frontend: http://localhost:5173
- Produção: https://lead-backend-rezr.onrender.com

## LIMITAÇÕES CONHECIDAS
- Render free tier: 512MB RAM, instances morrem após ~4 min de scraping pesado
- Google bloqueia buscas automatizadas (requests E Playwright headless)
- Google Maps muda CSS classes frequentemente - por isso usamos JS evaluation

## ARQUITETURA DO SCRAPER
- `api/scraper_engine.py`: Motor principal (Playwright)
  - Coleta links via `document.querySelectorAll('a[href]')`
  - Extrai dados via JS evaluation
  - `_fallback_google_search()`: busca CNPJ via DuckDuckGo (Google bloqueia)
  - `_lookup_cnpj_api()`: consulta Minha Receita
  - `lookup_cnpj()`: 4 estratégias paralelas com budget 25s
- `api/main.py`: FastAPI endpoints (POST /api/scrape, POST /api/enrich, SSE)
- `src/hooks/useScraper.ts`: Frontend hook, API_BASE, EventSource

## PRÓXIMOS PASSOS
- [ ] Upgrade Render para plano pago (mais RAM)
- [ ] Considerar caching de resultados
- [ ] Testar deploy com fallback DuckDuckGo no Render
