# 📊 ESTUDO DE CASO — Redesign Mabrumi CRM Pro
## De CRM Fragmentado → BI Dashboard Unificado

**Data:** 10/09/2026  
**Autor:** Dev.Pks ⚡ (Lead Dev)  
**Status:** PROPOSTA — Aguardando aprovação

---

## 1. DIAGNÓSTICO DO ESTADO ATUAL

### O que temos hoje

```
┌─────────────────────────────────────────────────────────┐
│                    SIDEBAR (6 botões)                    │
├──────────────┬──────────────┬───────────┬───────────────┤
│ Buscar Leads │ Base Leads   │ Disparo   │ Google Maps   │
│              │              │ WhatsApp  │ Scraper       │
│ (Supabase)   │ (Supabase)   │ (Supabase)│ (Playwright)  │
│              │              │           │               │
│ ❌ Sem CNPJ  │ ✅ CNPJ      │ ❌ Sem    │ ✅ CNPJ       │
│ ❌ Filtros   │ ✅ Re-process│   enriquec│ ✅ Auto-enrich│
│   inúteis    │              │   imento  │               │
├──────────────┴──────────────┴───────────┴───────────────┤
│              ❌ MÓDULOS NÃO SE CONVERSAM                 │
│              ❌ CNPJ service subutilizado                │
│              ❌ "Buscar Leads" é inútil sem dados        │
└─────────────────────────────────────────────────────────┘
```

### Problemas identificados

| # | Problema | Impacto |
|---|---------|---------|
| 1 | **"Buscar Leads" não tem enriquecimento** — só filtra dados do Supabase que já existem | Alto — módulo inútil se não houver leads cadastrados |
| 2 | **4 módulos desconectados** — cada um com sua lógica, sem fluxo unificado | Alto — UX fraca, dados fragmentados |
| 3 | **CNPJ service subutilizado** — só funciona em 2 de 4 módulos | Crítico — o coração da app não é o centro |
| 4 | **Filtros do "Buscar Leads" são irrelevantes** — idade (minAge/maxAge) não faz sentido para empresas | Médio — confunde o usuário |
| 5 | **Sem dashboard/KPIs** — não há visão geral do pipeline | Alto — corretor não vê resultados |
| 6 | **Google Maps Scraper é o verdadeiro "Buscar Leads"** — mas está escondido como ferramenta secundária | Alto — UX invertida |
| 7 | **Filtros do Scraper são básicos** — só nicho, cidade, estado | Médio — poderia ser muito mais inteligente |

---

## 2. O QUE O DB CNPJ MUDA TUDO

Com 51.5M de empresas, 72.8M de estabelecimentos e 28.1M de QSA, o CNPJ service é um **ativo estratégico**. Ele permite:

### Dados disponíveis por empresa
- 📋 CNPJ, Razão Social, Nome Fantasia
- 🏢 Porte (ME, EPP, Grande), Natureza Jurídica
- 💰 Capital Social, Regime Tributário
- ⚙️ CNAE Principal + Secundários (atividade econômica)
- ✅ Simples Nacional, MEI
- 📍 Endereço completo, CEP, UF, Município
- 👥 Quadro Societário (sócios, qualificações)
- 📞 Telefones, Email
- 🏥 Plano de Saúde (detecção por IA)
- 👥 Colaboradores (estimativa)

### O que isso habilita
- **Busca reversa:** "me mostre todas as clínicas odontológicas em SP com capital > 500K"
- **Segmentação inteligente:** filtrar por CNAE, porte, faturamento estimado
- **Enriquecimento automático:** todo lead sai com CNPJ + dados completos
- **Scoring baseado em dados reais:** não mais score genérico

---

## 3. PROPOSTA DE NOVA ARQUITETURA

### Princípios
1. **CNPJ service = ALFA** — centro de tudo, primário em cada módulo
2. **Fluxo unificado** — uma jornada do lead, não módulos isolados
3. **Dashboard BI** — visão executiva com KPIs e gráficos
4. **Busca inteligente** — filtros baseados em dados CNPJ reais

### Nova estrutura de telas

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: Logo | Busca Global | Notificações | Avatar    │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│  SIDEBAR │   CONTEÚDO PRINCIPAL                        │
│          │                                              │
│ 📊 BI    │   ┌─────────────────────────────────────┐   │
│          │   │  DASHBOARD BI (HOME)                │   │
│ 🔍 BUSCA │   │  KPIs | Gráficos | Pipeline | Mapa  │   │
│          │   └─────────────────────────────────────┘   │
│ 📋 BASE  │                                              │
│          │   ┌─────────────────────────────────────┐   │
│ 📤 ENVIO │   │  BUSCA INTELIGENTE                  │   │
│          │   │  Google Maps + CNPJ + Filtros Avanç.│   │
│ 🗑️ LIXO  │   └─────────────────────────────────────┘   │
│          │                                              │
│          │   ┌─────────────────────────────────────┐   │
│          │   │  BASE DE LEADS                      │   │
│          │   │  Pipeline Kanban | Tabela | Detalhes │   │
│          │   └─────────────────────────────────────┘   │
│          │                                              │
│          │   ┌─────────────────────────────────────┐   │
│          │   │  ENVIO WHATSAPP                     │   │
│          │   │  Templates | Agendamento | Analytics │   │
│          │   └─────────────────────────────────────┘   │
└──────────┴──────────────────────────────────────────────┘
```

### Detalhamento de cada tela

#### 📊 TELA 1: Dashboard BI (Home)
**Inspiração:** O dashboard Gemini que você compartilhou

```
┌──────────────────────────────────────────────────────┐
│  KPIs ROW                                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│  │TOTAL │ │ENRIQ.│ │ATIVOS│ │CONVER│ │PIPELINE│     │
│  │Leads │ │CNPJ  │ │Contat│ │  %   │ │R$     │      │
│  │ 847  │ │ 623  │ │ 234  │ │ 32%  │ │R$45K  │      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │
│                                                       │
│  GRÁFICOS ROW                                         │
│  ┌──────────────────┐ ┌──────────────────┐           │
│  │ Funil de Vendas  │ │ Leads por Cidade │           │
│  │ (Chart.js)       │ │ (Chart.js)       │           │
│  └──────────────────┘ └──────────────────┘           │
│                                                       │
│  ┌──────────────────┐ ┌──────────────────┐           │
│  │ Leads por Porte  │ │ Timeline Atividade│          │
│  │ (doughnut)       │ │ (line chart)     │           │
│  └──────────────────┘ └──────────────────┘           │
│                                                       │
│  ATIVIDADE RECENTE                                    │
│  ┌────────────────────────────────────────────┐      │
│  │ • Lead "Clínica São Jorge" enriquecido     │      │
│  │ • 15 leads importados via Google Maps      │      │
│  │ • WhatsApp enviado para 23 leads           │      │
│  └────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────┘
```

#### 🔍 TELA 2: Busca Inteligente (Google Maps + CNPJ)
**Substitui:** "Buscar Leads" + "Google Maps Scraper" (unificados)

Filtros propostos (revisados):

| Filtro | Tipo | Descrição | Novo? |
|--------|------|-----------|-------|
| **Nich/Categoria** | Select | Clínica, Restaurante, Advocacia... | ✅ Melhorado |
| **Cidade** | Select + searchable | Lista de cidades do DB CNPJ | ✅ Dinâmico |
| **Estado (UF)** | Select | 27 UFs | Existente |
| **CNAE** | Select + searchable | Código CNAE do DB CNPJ | 🆕 |
| **Porte da Empresa** | Multi-select | ME, EPP, Demais | 🆕 |
| **Capital Social Mínimo** | Input numérico | Filtra empresas com capital > X | 🆕 |
| **Situação Cadastral** | Multi-select | ATIVA, INATIVA, etc. | 🆕 |
| **Tem Plano de Saúde** | Toggle | Filtra empresas com plano detectado | 🆕 |
| **Tem Telefone** | Toggle | Só empresas com telefone | 🆕 |
| **Avaliação Mínima** | Range | Rating do Google Maps | 🆕 |
| **Qtd Min Reviews** | Input | Filtra por popularidade | 🆕 |
| **Simples Nacional** | Toggle | Optantes do Simples | 🆕 |
| **Tem Redes Sociais** | Toggle | Empresas com presença digital | 🆕 |

**Fluxo:**
1. Usuário seleciona filtros
2. Sistema busca no Google Maps (scraper)
3. **PARALELAMENTE**, enriquece cada resultado com CNPJ service
4. Resultados já saem completos (nome + CNPJ + dados + telefone)
5. Usuário seleciona leads → "Adicionar na Base" (1 clique)

#### 📋 TELA 3: Base de Leads
**Melhorias:**
- Visual Kanban (pipeline) além da tabela
- Enriquecimento automático ao adicionar
- Filtros por dados CNPJ (porte, CNAE, situação)
- Busca global por CNPJ/razão social

#### 📤 TELA 4: Envio WhatsApp
**Melhorias:**
- Templates salvos
- Variáveis do CNPJ na mensagem ({razao_social}, {responsavel}, {porte})
- Agendamento de envios
- Analytics de abertura/resposta

#### 🗑️ TELA 5: Lixeira
- Sem mudanças significativas

---

## 4. FILTROS DO GOOGLE MAPS SCRAPER — ANÁLISE DETALHADA

### Filtros atuais
| Filtro | Status | Veredicto |
|--------|--------|-----------|
| Nicho (select) | Funcional | ✅ Manter — útil para busca rápida |
| Cidade (select) | Funcional | ✅ Manter — mas fazer dinâmico (do DB) |
| Estado (select) | Funcional | ✅ Manter |
| Qtd (limit) | Funcional | ✅ Manter |

### Filtros propostos (novos)

**Prioridade ALTA (implementar agora):**
1. **CNAE (atividade econômica)** — Mais preciso que "nicho". Ex: "6621-5/00" = Corretora de seguros
2. **Porte da Empresa** — ME/EPP são prospects diferentes de Grandes empresas
3. **Situação Cadastral** — Só buscar empresas ATIVAS
4. **Tem Telefone** — Sem telefone = sem WhatsApp = inútil para disparo
5. **Avaliação Mínima** — Empresas bem avaliadas = mais profissionais

**Prioridade MÉDIA (próximo sprint):**
6. **Capital Social Mínimo** — Proxy de faturamento
7. **Simples Nacional** — Indicador de regime tributário
8. **Qtd Mínima de Reviews** — Indicador de atividade real

**Prioridade BAIXA (futuro):**
9. **Tem Plano de Saúde** — Para corretoras específicas
10. **Tem Redes Sociais** — Para campanhas digitais
11. **Raio de busca (km)** — Geolocalização

---

## 5. FLUXO DE DADOS UNIFICADO

### Antes (fragmentado)
```
Google Maps → leads separados → importar manual → base → enriquecer manual → WhatsApp
Supabase → buscar → nada acontece (sem CNPJ)
```

### Depois (unificado com CNPJ como ALFA)
```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ Google Maps  │────▶│  CNPJ        │────▶│  Base de     │
│ Scraper      │     │  Service     │     │  Leads       │
│ (busca)      │     │  (enriquece) │     │  (armazena)  │
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                 │
                                          ┌──────▼───────┐
                                          │  Pipeline    │
                                          │  WhatsApp    │
                                          │  (disparo)   │
                                          └──────────────┘
```

**Tudo passa pelo CNPJ. Sem exceção.**

---

## 6. REFERÊNCIA VISUAL — DASHBOARD BI

O dashboard de referência (Gemini) usa:
- **Cores:** Dark bg (#0B0F19), cyan accents (#06b6d4), glassmorphism
- **Cards:** glass-card com blur + borda sutil
- **Gráficos:** Chart.js (line, bar, doughnut)
- **Ícones:** Lucide
- **Fonte:** Inter
- **Efeitos:** Glow, pulse, parallax

### Componentes visuais para nosso BI:
1. **Stat Cards** — KPIs com ícone, valor, tendência (% up/down)
2. **Funil de Vendas** — Novos → Contactados → Qualificados → Convertidos
3. **Mapa de Calor** — Leads por estado/cidade
4. **Gráfico de Atividade** — Timeline de ações (scrapes, enrichments, envios)
5. **Tabela de Atividade Recente** — Últimas ações do sistema
6. **Pipeline Kanban** — Drag & drop entre estágios

---

## 7. PLANO DE IMPLEMENTAÇÃO

### Fase 1 — Fundação (1-2 dias)
- [ ] Reestruturar navegação (sidebar)
- [ ] Criar componente Dashboard BI (home)
- [ ] KPIs básicos (total leads, enriquecidos, taxa conversão)
- [ ] Unificar "Buscar Leads" + "Google Maps Scraper" em "Busca Inteligente"

### Fase 2 — Busca Inteligente (2-3 dias)
- [ ] Novos filtros CNAE, Porte, Situação
- [ ] Enriquecimento automático CNPJ na busca
- [ ] Preview de resultados com dados CNPJ
- [ ] Seleção + importação em 1 clique

### Fase 3 — Dashboard BI completo (2-3 dias)
- [ ] Gráficos Chart.js (funil, cidade, porte, timeline)
- [ ] Pipeline Kanban na Base de Leads
- [ ] Atividade recente
- [ ] Estilo glassmorphism completo

### Fase 4 — WhatsApp inteligente (1-2 dias)
- [ ] Templates com variáveis CNPJ
- [ ] Agendamento
- [ ] Analytics básico

---

## 8. SKILLS E FERRAMENTAS DISPONÍVEIS

### OpenClaw Skills relevantes
- **diagram-maker** — Para criar diagramas de arquitetura
- **canvas** — Para preview do dashboard no navegador
- **skill-creator** — Se precisar criar skills customizadas

### Ferramentas do projeto
- **Chart.js** — Já no HTML de referência, fácil de integrar
- **Lucide React** — Já no projeto
- **Tailwind CSS** — Já no projeto
- **Supabase** — DB + Auth
- **FastAPI** — Backend com CNPJ service

### Não precisamos de skills externas
O projeto já tem todas as ferramentas necessárias. A mudança é **arquitetural**, não de ferramentas.

---

## 9. RISCOS E MITIGAÇÕES

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Breaking changes no frontend | Alto | Implementar fase a fase, manter compatibilidade |
| Performance com muitos filtros CNPJ | Médio | Paginação, lazy loading, debounce |
| CNPJ service indisponível (produção) | Alto | Fallback APIs externas já implementado |
| Complexidade do Kanban | Médio | Usar biblioteca leve ou CSS Grid |

---

## 10. DECISÃO NECESSÁRIA

**Dev.Of Faith, preciso da sua aprovação para:**

1. ✅ **Confirmar a nova arquitetura** — Dashboard BI como home, Busca Inteligente unificada
2. ✅ **Confirmar os novos filtros** — Quais priorizar?
3. ✅ **Confirmar o visual** — Glassmorphism + Chart.js (estilo Gemini)?
4. ❓ **WhatsApp** — Implementar agora ou depois?

**Assim que aprovar, começo a codar.**

---

*Documento gerado por Dev.Pks ⚡ — Lead Dev mabrumi-crm-pro*
