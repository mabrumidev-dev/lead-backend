# Contexto Mabrumi CRM
Projeto: React+Vite frontend, FastAPI backend, Supabase DB, Render deploy.

## Funcionalidades
- Google Maps Scraper com enriquecimento (CNPJ, redes sociais, plano saude, funcionarios)
- Vision AI: upload de imagem para extracao de dados via MiMo V2.5 Pro
- Base de leads com status (new/contacted/qualified)
- Disparo WhatsApp em massa
- Importacao CSV

## Stack
- Frontend: React 18 + Vite 8 + TypeScript 7 + Tailwind
- Backend: FastAPI + Playwright (Python 3.11)
- DB: Supabase (PostgreSQL)
- Deploy: Render (Docker, 512MB RAM)
- IA Vision: MiMo API (mimo-v2.5-pro)

## Ambiente
- MIMO_API_KEY necessaria no Render para vision
- .env.local para desenvolvimento local
