# Context State - 28/08/2026 - 01:00

## COMANDO PARA NOVA SESSÃO
```
Leia .opencode/CONTEXT_STATE.md e continue de onde paramos
```

## STATUS ATUAL
- **Branch**: main
- **Último Commit**: b27633f (28/08 01:00)
- **Descrição**: Scraper Google Maps funcional com fix de memória
- **Deploy**: lead-backend-rezr (Render) - LIVE e funcionando

## PROBLEMA RESOLVIDO HOJE
O scraper Google Maps parou de funcionar (0 resultados) após otimizações de memória.
**Causa raiz**: Otimizações agressivas (--single-process, --no-zygote, viewport 640x480) 
quebraram o Chromium. Depois de reverter, o Render (512MB free tier) matava a instância 
durante o scraping por OOM.

**Solução final**:
1. Reverter otimizações de memória agressivas
2. Fechar e reabrir página entre cada lead para liberar memória
3. Usar JavaScript evaluation em vez de CSS selectors desatualizados (BeautifulSoup)

## O QUE FUNCIONA
- Scraper Google Maps: coleta links via JS, extrai dados via JS (sem CSS selectors)
- Enriquecimento CNPJ (4 estratégias)
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
- Scraper funciona mas é lento (~15-20s por lead) devido a limitações de memória
- Google Maps muda CSS classes frequentemente - por isso usamos JS evaluation

## ARQUITETURA DO SCRAPER
- `api/scraper_engine.py`: Motor principal (Playwright)
  - Coleta links via `document.querySelectorAll('a[href]')` (não depende de classes CSS)
  - Extrai dados via JS evaluation (não usa BeautifulSoup/CSS selectors)
  - Fecha e reabre página entre cada lead para liberar memória
- `api/main.py`: FastAPI endpoints (POST /api/scrape, SSE stream)
- `src/hooks/useScraper.ts`: Frontend hook, API_BASE, EventSource

## PRÓXIMOS PASSOS
- [ ] Upgrade Render para plano pago (mais RAM, não mata instância)
- [ ] Considerar caching de resultados para evitar refazer scraping
- [ ] Monitorar se Google Maps muda selectors novamente
