# Context State - 27/08/2026 - 19:30

## MAPA COMPLETO DO PROJETO

### ARQUITETURA GERAL
```
Frontend (React+Vite) ←→ Backend (FastAPI) ←→ Supabase (PostgreSQL)
                              ↓
                    Playwright (Google Maps)
                    Groq API (Vision AI)
                    Minha Receita (CNPJ)
                    Bing/Yahoo/DDG (Social Media)
```

### STACK
- Frontend: React 18 + Vite 8 + TypeScript 7 + Tailwind
- Backend: FastAPI + Playwright (Python 3.11)
- DB: Supabase (PostgreSQL)
- Deploy: Render (Docker, 512MB RAM, plano starter)
- IA Vision: Groq API (qwen/qwen3.6-27b)

### FLUXO DE DADOS

#### 1. Google Maps Scraper (Funcionalidade Principal)
```
User → GoogleMapsScraper.tsx → useScraper.ts → POST /api/scrape
                                                    ↓
                                            ScraperEngine.scrape()
                                                    ↓
                                            Playwright abre Google Maps
                                                    ↓
                                            Scroll no feed coletando links
                                                    ↓
                                            Para cada link: abre página → parseia HTML
                                                    ↓
                                            Retorna: Name, Phone, Address, Website, Rating, Reviews
                                                    ↓
                                            SSE Stream → Frontend recebe em tempo real
```

#### 2. Enriquecimento de Leads
```
GoogleMapsScraper → handleEnrich() → useScraper.enrichLead()
                                            ↓
                                    POST /api/enrich → lookup_cnpj()
                                            ↓
                                    Estratégias paralelas:
                                    1. Website scraping (CNJPJ de páginas)
                                    2. Bing + Diretórios (casadosdados)
                                    3. Google Translate proxy (cnpj.biz)
                                    4. Retry com nome reduzido
                                            ↓
                                    Minha Receita API → Dados completos empresa
                                            ↓
                                    POST /api/social-search → search_social_media()
                                            ↓
                                    Yahoo/DDG → LinkedIn, Instagram, Facebook, Twitter
                                            ↓
                                    POST /api/health-plan-check → check_health_plan()
                                            ↓
                                    ANS + Bing + Porte + CNAE + Capital Social
                                            ↓
                                    POST /api/employee-count → check_employee_count()
                                            ↓
                                    Wikipedia + Bing + LinkedIn + Estimativa CNAE/Porte
```

#### 3. Vision AI (Upload de Imagem)
```
VisionUpload.tsx → POST /api/vision/analyze
                          ↓
                  Groq API (qwen3.6-27b)
                          ↓
                  Extrai: name, website, city, cnpj, email
                          ↓
                  Adiciona à base via addLeadToBase()
```

#### 4. Base de Leads
```
useBaseLeads.ts → Supabase table 'base_leads'
                          ↓
                  Operations: add, remove, updateStatus
                          ↓
                  Sync com localStorage como fallback
```

#### 5. Disparo WhatsApp
```
LeadsDispatchWhatsApp.tsx → Template com variáveis {nome}, {plano}, {cidade}
                                  ↓
                          Simula envio (80% success rate)
                                  ↓
                          Atualiza status para 'contacted'
```

#### 6. Importação CSV
```
ImportLeads.tsx → Parse CSV (FIELD_MAP inteligente)
                        ↓
                  Mapeamento automático de colunas
                        ↓
                  Insert no Supabase
```

### ARQUIVOS DO PROJETO

#### Backend (Python)
- `api/main.py` (223 linhas) - FastAPI endpoints
  - POST /api/scrape - Inicia scraper
  - GET /api/scrape/{job_id}/stream - SSE stream
  - POST /api/vision/analyze - Upload imagem Groq
  - POST /api/enrich - Enriquecimento CNPJ
  - POST /api/social-search - Busca redes sociais
  - POST /api/health-plan-check - Verifica plano saúde
  - POST /api/employee-count - Contagem funcionários
  - GET /api/health - Health check
  
- `api/scraper_engine.py` (1550 linhas) - Motor do scraper
  - ScraperEngine class - Playwright + Google Maps
  - lookup_cnpj() - 4 estratégias de busca CNPJ
  - search_social_media() - Yahoo/DDG + extração URLs
  - check_health_plan() - ANS + web search + sinais
  - check_employee_count() - Wikipedia + Bing + LinkedIn + estimativa

#### Frontend (React/TypeScript)
- `src/App.tsx` (206 linhas) - Componente principal
  - Login com Supabase Auth
  - Sidebar com navegação
  - Toast notifications
  
- `src/hooks/useLeads.ts` (84 linhas) - Hook para leads
  - CRUD no Supabase
  - Filtros por cidade/idade/plano
  
- `src/hooks/useBaseLeads.ts` (128 linhas) - Hook para base
  - Gerencia leads selecionados
  - Sync com Supabase + localStorage
  
- `src/hooks/useScraper.ts` (301 linhas) - Hook do scraper
  - startScrape() - POST + SSE stream
  - enrichLead() - Enriquecimento
  - searchSocialMedia() - Redes sociais
  - checkHealthPlan() - Plano saúde
  - checkEmployeeCount() - Funcionários
  
- `src/components/leads/GoogleMapsScraper.tsx` (728 linhas)
  - Interface completa do scraper
  - Filtros: nicho, cidade, estado, quantidade
  - Preview ao vivo do Chrome
  - Tabela de resultados com ações
  - Enriquecimento em lote
  
- `src/components/leads/LeadDetailPopup.tsx` (616 linhas)
  - Popup com todos os dados do lead
  - Exportação: CSV, TXT, PDF
  - Seções: Google Maps, Empresa, Endereço, Contato, QSA, Redes Sociais
  
- `src/components/leads/LeadsTable.tsx` (520 linhas)
  - Tabela de leads do Supabase
  - Busca por nome/telefone/cidade
  - Exportação CSV
  - Popup de detalhes com dados enriquecidos
  
- `src/components/leads/LeadsBaseTable.tsx` (147 linhas)
  - Tabela da base de leads
  - Ações: status (new/contacted/qualified), remover
  
- `src/components/leads/LeadsDispatchWhatsApp.tsx` (343 linhas)
  - Disparo em massa
  - Template com variáveis
  - Preview personalizado
  
- `src/components/leads/ImportLeads.tsx` (353 linhas)
  - Upload CSV
  - Parse inteligente de colunas
  - Preview antes de importar
  
- `src/components/leads/vision/VisionUpload.tsx` (76 linhas)
  - Upload de imagem
  - Integração com Groq API
  
- `src/supabase/client.ts` (30 linhas)
  - Configuração Supabase
  - Runtime config via window
  
- `src/types/lead.ts` (27 linhas)
  - Interface Lead
  - Interface FilterOptions
  - INITIAL_FILTERS

### DEPLOY
- Render: Docker com Playwright + Node.js 20 + Python 3.11
- Porta: 10000
- Plano: starter (512MB RAM)
- Supabase: PostgreSQL gerenciado
- GitHub: Repositório com auto-deploy

### STATUS ATUAL
- Frontend: FUNCIONANDO
- Backend: FUNCIONANDO
- Database: FUNCIONANDO
- Deploy: FUNCIONANDO
- Git: branch main atualizada (commit 2f64db1)
- Último commit: "fix: melhoria mensagem de erro scraper + skill contexto + context state"

### SKILLS DISPONÍVEIS
- `mabrumi-deploy` - Deploy no Render
- `mabrumi-supabase` - Operações Supabase
- `mabrumi-scraper` - Scraper Google Maps
- `mabrumi-context` - Memória de contexto
- `auto-context` - Salva estado automaticamente

### BACKUP/RECUPERAÇÃO
- **GitHub**: Código fonte versionado
- **Supabase**: Dados dos leads (tabelas: leads, base_leads)
- **Render**: Deploy automático do GitHub
- **Restore**: Git clone + pip install + npm install + deploy

### NOTAS IMPORTANTES
- NUNCA alterar scraper_engine.py sem testar localmente
- SEMPRE atualizar CONTEXT_STATE.md antes de encerrar sessão
- Usuário frustado com perda recorrente de contexto
- Projeto está 100% funcional - NÃO MEXER sem necessidade
