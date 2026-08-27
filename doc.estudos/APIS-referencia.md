# Mabrumi CRM - Referencia de APIs

## Backend (FastAPI - `api/main.py`)

### 1. Health Check
```
GET /api/health
```
- **Finalidade:** Verificar se o servidor esta online
- **Resposta:** `{"status": "ok"}`

---

### 2. Google Maps Scraper
```
POST /api/scrape
```
- **Finalidade:** Iniciar um job de scraping no Google Maps
- **Body:** `{"query": "odontologia salvador", "limit": 5}`
- **Resposta:** `{"job_id": "abc123", "status": "started"}`

---

### 3. Scraper SSE Stream
```
GET /api/scrape/{job_id}/stream
```
- **Finalidade:** Stream em tempo real do progresso do scraping (Server-Sent Events)
- **Eventos:** `progress`, `screenshot`, `done`, `error`
- **Uso:** Frontend escuta para atualizar barra de progresso e preview do Chrome

---

### 4. Scraper Status
```
GET /api/scrape/{job_id}
```
- **Finalidade:** Consultar status de um job de scraping
- **Resposta:** `{"status": "done", "progress": 100, "total_results": 5, "messages": [...]}`

---

### 5. Cancelar Scraping
```
DELETE /api/scrape/{job_id}
```
- **Finalidade:** Cancelar um job de scraping em andamento

---

### 6. Vision AI - Analise de Imagem
```
POST /api/vision/analyze
```
- **Finalidade:** Enviar imagem (print do Google Maps) e extrair dados do contato via IA
- **Body:** FormData com campo `file` (imagem)
- **IA:** Groq API com modelo `qwen/qwen3.6-27b`
- **Env necessaria:** `GROQ_API_KEY`
- **Resposta:** `{"name": "...", "website": "...", "city": "...", "cnpj": "...", "email": "..."}`

---

### 7. Enriquecimento CNPJ
```
POST /api/enrich
```
- **Finalidade:** Buscar dados completos de uma empresa via CNPJ (Minha Receita, cnpj.biz)
- **Body:** `{"website": "...", "name": "...", "city": "...", "phone": "..."}`
- **Resposta:** Objeto com ~30 campos (razao_social, cnpj, responsavel, socios, QSA, CNAE, etc.)

---

### 8. Busca Redes Sociais
```
POST /api/social-search
```
- **Finalidade:** Buscar perfis de LinkedIn, Instagram, Facebook de uma empresa/pessoa
- **Body:** `{"name": "...", "company": "...", "city": "...", "business_name": "...", "website": "..."}`
- **Resposta:** `{"linkedin": {"url": "..."}, "instagram": {"url": "..."}, ...}`

---

### 9. Verificacao Plano de Saude
```
POST /api/health-plan-check
```
- **Finalidade:** Verificar se empresa possui plano de saude coletivo (ANS)
- **Body:** `{"cnpj": "...", "name": "...", "porte": "...", "qtd_funcionarios": "...", "capital_social": "...", "cnae": "..."}`
- **Resposta:** `{"tem_plano": true/false, "tipo": "...", "confianca": "...", "sinais": [...]}`

---

### 10. Contagem de Funcionarios
```
POST /api/employee-count
```
- **Finalidade:** Estimar quantidade de funcionarios da empresa
- **Body:** `{"name": "...", "cnpj": "...", "porte": "...", "capital_social": "...", "cnae": "..."}`
- **Resposta:** `{"funcionarios": 50, "fonte": "...", "confianca": "...", "faixa": "..."}`

---

---

## APIs e Ferramentas Externas Utilizadas

### Google Maps (Playwright)
- **Finalidade:** Scraping de leads (nome, endereco, telefone, website, rating, reviews)
- **Metodo:** Playwright headless Chromium → extracao do feed de resultados
- **Enriquecimento:** Apos scrape, cada lead passa por lookup_cnpj + search_social_media

### Minha Receita (minhareceita.org)
- **Finalidade:** Lookup de dados completos de empresa via CNPJ
- **URL:** `https://minhareceita.org/{cnpj_formatado}`
- **Dados retornados:** razao_social, nome_fantasia, socios, QSA, CNAE, capital_social, regime_tributario, etc.
- **Rate limit:** 429 → retry apos 2s

### CNPJ.biz (via Google Translate proxy)
- **Finalidade:** Buscar CNPJ de empresas quando outros metodos falham
- **Metodo:** Google Translate funciona como proxy para bypass de IP blocks
- **URL origem:** `https://cnpj.biz/procura/{query}`
- **URL proxy:** `https://translate.google.com/translate?sl=pt&tl=en&u={url}`

### Casa dos Dados (casadosdados.com.br)
- **Finalidade:** Pesquisa avancada de CNPJ por nome/cidade
- **URL:** `https://casadosdados.com.br/solucao/cnpj/pesquisa-avancada?q={term}&municipio={city}&uf=Todos`
- **Uso:** Estrategia paralela no lookup_cnpj

### Bing Search
- **Finalidade:** Busca de redes sociais + busca de CNPJ
- **URL:** `https://www.bing.com/search?q={query}&setlang=pt-BR`
- **Uso:** Social media search + CNPJ lookup (estrategia paralela)

### Yahoo Search
- **Finalidade:** Busca de URLs de redes sociais (LinkedIn, Instagram, Facebook, Twitter)
- **URL:** `https://search.yahoo.com/search?p={query}`
- **Formato:** Parse de `r.search.yahoo.com` redirects para extrair URLs reais

### DuckDuckGo
- **Finalidade:** Busca de URLs de redes sociais (fallback quando Bing/Yahoo falham)
- **URL:** `https://html.duckduckgo.com/html/?q={query}`
- **Formato:** Parse de `duckduckgo.com/l/?uddg=` redirects

### Groq API (Vision AI)
- **Finalidade:** Extrair dados de contato de imagens/screenshots do Google Maps
- **URL:** `https://api.groq.com/openai/v1/chat/completions`
- **Modelo:** `qwen/qwen3.6-27b`
- **Env:** `GROQ_API_KEY`
- **Input:** Imagem base64 → JSON com name, website, city, cnpj, email

### OpenRouter (alternativa AI)
- **Finalidade:** API alternativa para chat/completions (backup do Groq)
- **URL:** `https://openrouter.ai/api/v1/chat/completions`
- **Status:** No arquivo `main copy.py` (pode nao estar em uso ativo)

### Render.com
- **Finalidade:** Deploy do backend (FastAPI + Playwright) e frontend (React)
- **Config:** Docker, Starter plan (512MB RAM)
- **URLs:** `lead-backend.onrender.com` / `lead-backend-rezr.onrender.com`
- **Nota:** 512MB pode causar OOM com Playwright + Chromium

### Supabase
- **Finalidade:** PostgreSQL gerenciado (leads, base_leads, auth)
- **Env:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### ANS (Agencia Nacional de Saude)
- **Finalidade:** Download da lista de operadoras de plano de saude ativas
- **URL:** `http://ftp.dadosabertos.ans.gov.br/FTP/PDA/operadoras_de_plano_de_saude_ativas/Relatorio_cadop.csv`
- **Uso:** Verificacao se empresa possui plano de saude coletivo
- **Cache:** Armazenado em memoria, retry apos 300s se falhar

### Google Translate (proxy)
- **Finalidade:** Bypass de IP blocks do cnpj.biz
- **Metodo:** Traduz pagina do cnpj.biz de PT para EN, parseia CNPJ do HTML traduzido

### Wikipedia (pt.wikipedia.org)
- **Finalidade:** Buscar numero exato de funcionarios de empresas conhecidas
- **URL:** `https://pt.wikipedia.org/wiki/{empresa}` + API `action=query&list=search`
- **Uso:** check_employee_count - fonte primaria antes de Bing/LinkedIn

---

## Supabase (PostgreSQL)

| Tabela | Finalidade |
|--------|------------|
| `leads` | Todos os leads coletados (scraper, importacao, etc.) |
| `base_leads` | Leads salvos pelo usuario para disparo WhatsApp |
| `auth.users` | Autenticacao de usuarios |

---

## Variaveis de Ambiente Necessarias

| Variavel | Onde usar | Finalidade |
|----------|-----------|------------|
| `VITE_SUPABASE_URL` | Frontend + Backend | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Frontend + Backend | Chave anon do Supabase |
| `GROQ_API_KEY` | Backend | API key do Groq (Vision AI) |
| `VITE_API_URL` | Frontend | URL do backend (opcional, auto-detecta) |

---

## Fluxo Principal do Scraper

1. Frontend envia `POST /api/scrape` com query
2. Backend inicia Playwright em thread separada, retorna `job_id`
3. Frontend conecta no `GET /api/scrape/{job_id}/stream` (SSE)
4. Backend envia eventos `progress` (mensagens), `screenshot` (preview), `done` (resultados)
5. Frontend exibe resultados na tabela
6. Usuario seleciona leads e clica "Enriquecer" → `POST /api/enrich` para cada um
7. Usuario seleciona leads e clica "Importar" → insere no Supabase (`leads` + `base_leads`)
