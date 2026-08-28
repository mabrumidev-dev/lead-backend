# Context State - 28/08/2026 - 22:00

## COMANDO PARA NOVA SESSÃO
```
Leia .opencode/CONTEXT_STATE.md e continue de onde paramos
```

## STATUS ATUAL
- **Branch**: main
- **Último Commit**: 0cc0041 (28/08 ~21:00)
- **Descrição**: Scraper Google Maps funcional + fallbacks com timeouts rígidos
- **Deploy**: lead-backend-rezr (Render) - LIVE e funcionando

## ÚLTIMO TRABALHO - FALLBACK CNPJ
O fallback Google Search usa `requests` (automated) mas **Google bloqueia** 
buscas automatizadas — retorna página vazia/sem resultados. O CNPJ existe 
(no print do usuário o Google encontrou), mas o `requests` não consegue ler.

**Status do fallback:**
- `lookup_cnpj`: 4 estratégias com orçamento rígido de 25s ✅
- `_fallback_google_search`: busca Google/Bing com `requests` ❌ (Google bloqueia)
- Enrich endpoint: timeout 30s + fallback 15s ✅

**Problema ativo:**
- `_fallback_google_search` retorna vazio porque Google bloqueia `requests`
- Solução necessária: usar **Playwright** (navegador real) para buscar CNPJ no Google
- Playwright já está instalado e funciona no scraper

## O QUE FUNCIONA
- Scraper Google Maps: coleta links via JS, extrai dados via JS (sem CSS selectors)
- **Fallback no Enriquecimento**: quando CNPJ lookup falha (4 estratégias), busca CNPJ no Google como último recurso (precisa Playwright)
- Enriquecimento CNPJ (4 estratégias) com budget rígido
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
- Google bloqueia buscas automatizadas via `requests` — precisa Playwright
- Google Maps muda CSS classes frequentemente - por isso usamos JS evaluation

## ARQUITETURA DO SCRAPER
- `api/scraper_engine.py`: Motor principal (Playwright)
  - Coleta links via `document.querySelectorAll('a[href]')`
  - Extrai dados via JS evaluation
  - `_fallback_google_search()`: busca CNPJ no Google (precisa Playwright)
  - `_lookup_cnpj_api()`: consulta Minha Receita
  - `lookup_cnpj()`: 4 estratégias paralelas com budget 25s
- `api/main.py`: FastAPI endpoints (POST /api/scrape, POST /api/enrich, SSE)
- `src/hooks/useScraper.ts`: Frontend hook, API_BASE, EventSource

## PRÓXIMOS PASSOS
- [ ] Trocar `_fallback_google_search` de `requests` para Playwright (Google bloqueia requests)
- [ ] Upgrade Render para plano pago (mais RAM)
- [ ] Considerar caching de resultados
