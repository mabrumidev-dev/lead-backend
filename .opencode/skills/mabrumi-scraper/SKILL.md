---
name: mabrumi-scraper
description: Use when debugging, modifying, or maintaining the Google Maps Scraper or any enrichment feature (CNPJ, social media, health plan, employee count). Covers scraper_engine.py, Playwright, Chromium, and all API endpoints.
---

# Mabrumi CRM - Scraper Skill

## Architecture

- **Backend**: Python FastAPI (`api/main.py`)
- **Scraper engine**: `api/scraper_engine.py` (Playwright sync API)
- **Frontend**: `src/hooks/useScraper.ts` + `src/components/leads/GoogleMapsScraper.tsx`

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/scrape` | POST | Start scrape job (body: `{query, limit}`) |
| `/api/scrape/{job_id}/stream` | GET | SSE stream of progress/results |
| `/api/scrape/{job_id}` | DELETE | Cancel scrape job |
| `/api/enrich` | POST | CNPJ + Responsavel lookup |
| `/api/social-search` | POST | LinkedIn/Instagram/Facebook search |
| `/api/health-plan-check` | POST | ANS health plan verification |
| `/api/employee-count` | POST | Employee count from multiple sources |

## Scraper Flow

1. Open Google Maps with search query
2. Scroll feed to collect result links
3. Navigate to each link, parse name/phone/address/website/rating
4. Return results via SSE stream
5. Frontend triggers 4-step enrichment:
   - CNPJ/Responsavel via `lookup_cnpj()` → Minha Receita API
   - Social media via `search_social_media()` → Google search
   - Health plan via `check_health_plan()` → ANS database
   - Employee count via `check_employee_count()` → Multi-source

## Key Functions in scraper_engine.py

- `ScraperEngine.scrape()` — main loop (lines 720+)
- `ScraperEngine._parsing()` — parse individual Maps page (line 613+)
- `ScraperEngine._opening_url()` — navigate with retries (line 588+)
- `ScraperEngine._screenshot()` — JPEG screenshot at 40% quality
- `lookup_cnpj()` — CNPJ extraction + Minha Receita (line 268+)
- `search_social_media()` — social media search (line 292+)
- `check_health_plan()` — ANS check (line 940+)
- `check_employee_count()` — multi-source employee count

## Memory Constraints

- Render Starter = 512MB RAM total
- Chromium + Google Maps = ~300-350MB
- Python + FastAPI = ~100-150MB
- **Critical**: navigate to `about:blank` between leads to free memory
- Screenshots: JPEG quality 40%, max every 10 scrolls

## Chromium Args

```
--no-sandbox --disable-dev-shm-usage --disable-gpu
--disable-extensions --disable-background-networking
--js-flags=--max-old-space-size=64
```

## Debugging

- Frontend: check `[SCRAPER]` console logs in browser
- Backend: check Render Runtime Logs
- Common issues: OOM kill (server restart mid-scrape), Google Maps CAPTCHA, selectors changed
