# CNPJ Service - Microserviço de Consulta CNPJ

Serviço de consulta de CNPJ com dados oficiais da Receita Federal e busca fuzzy por nome usando `pg_trgm`.

## Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Mabrumi CRM   │────>│   CNPJ API       │────>│   PostgreSQL    │
│   (Frontend)     │     │   (FastAPI)       │     │   (pg_trgm)     │
│   porta 5173     │     │   porta 8003      │     │   porta 5432    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌──────────────┐
                        │  Receita     │
                        │  Federal     │
                        │  (~20M CNPJs)│
                        └──────────────┘
```

## Início Rápido (Docker)

```bash
cd cnpj_service

# 1. Subir PostgreSQL
docker compose up -d postgres

# 2. Baixar e carregar dados da Receita Federal (demora ~1-2h)
docker compose run --rm api python etl.py

# 3. Subir API
docker compose up -d api

# 4. Testar
curl http://localhost:8003/api/cnpj/health
curl http://localhost:8003/api/cnpj/busca?nome=petrobras
```

## Início Rápido (Sem Docker)

```bash
cd cnpj_service

# 1. Instalar dependências
pip install -r requirements.txt

# 2. Configurar PostgreSQL (variáveis de ambiente)
export CNPJ_DB_HOST=localhost
export CNPJ_DB_PORT=5432
export CNPJ_DB_NAME=cnpj
export CNPJ_DB_USER=cnpj
export CNPJ_DB_PASSWORD=cnpj

# 3. Criar banco e carregar dados
python etl.py

# 4. Iniciar API
python api.py
```

## Endpoints da API

### Health Check
```
GET /api/cnpj/health
```
Retorna status e contagem de registros.

### Busca por CNPJ (exata)
```
GET /api/cnpj/00.000.000/0001-91
GET /api/cnpj/00000000000191
```

### Busca por Nome (fuzzy)
```
GET /api/cnpj/busca?nome=petrobras
GET /api/cnpj/busca?nome=petrobras&uf=SP&limit=5
GET /api/cnpj/busca?nome=petrobras&threshold=0.5
```

Parâmetros:
- `nome` (obrigatório): Nome ou razão social para buscar (min 2 chars)
- `uf` (opcional): Filtrar por estado (ex: SP, RJ)
- `municipio` (opcional): Filtrar por município
- `limit` (opcional): Limite de resultados (1-50, padrão: 10)
- `threshold` (opcional): Similaridade mínima (0.1-0.9, padrão: 0.3)

### Enrichment (compatível com backend)
```
POST /api/cnpj/enrich
{
    "name": "Petrobras",
    "city": "Rio de Janeiro",
    "phone": ""
}
```

## Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `CNPJ_DB_HOST` | `localhost` | Host do PostgreSQL |
| `CNPJ_DB_PORT` | `5432` | Porta do PostgreSQL |
| `CNPJ_DB_NAME` | `cnpj` | Nome do banco |
| `CNPJ_DB_USER` | `cnpj` | Usuário do banco |
| `CNPJ_DB_PASSWORD` | `cnpj` | Senha do banco |
| `CNPJ_API_PORT` | `8003` | Porta da API |

## Dados da Receita Federal

Os dados são baixados de: https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-da-pessoa-juridica---cnpj

### Arquivos baixados:
- **Empresas0-9.zip** (~500MB) - Dados das empresas
- **Estabelecimentos0-9.zip** (~3GB) - Dados dos estabelecimentos
- **Socios0-9.zip** (~200MB) - Quadro societário
- **CNAE.zip** (~1MB) - Códigos de atividade
- **Municipios.zip** (~1MB) - Códigos de municípios
- **Naturezas.zip, Paises.zip, Qualificacoes.zip, Motivos.zip** (~100KB cada)

### Atualização mensal:
Os dados da Receita Federal são atualizados mensalmente. Para atualizar:
```bash
# Baixar novos dados
python etl.py --skip-download  # Se já baixou manualmente
# OU
python etl.py                   # Baixa e recarrega tudo
```

## Performance

### Tempo de consulta:
- **Busca por CNPJ**: ~1ms (índice primário)
- **Busca por nome (trigram)**: ~10-50ms (GIN index)
- **Enrichment completo**: ~20-50ms (JOIN + QSA)

### Requisitos do banco:
- **Espaço em disco**: ~8-10GB (dados + índices)
- **RAM recomendada**: 2GB+ (shared_buffers=512MB)
- **Tempo de ETL**: ~1-2h (download + carga + índices)

## Integração com o Backend Existente

Para usar este serviço como primário no `scraper_engine.py`:

```python
import os
import requests

CNPJ_API_URL = os.environ.get('CNPJ_API_URL', 'http://localhost:8003')

def lookup_cnpj_local(website, name, city, phone):
    """Tenta CNPJ service local primeiro."""
    try:
        resp = requests.post(f'{CNPJ_API_URL}/api/cnpj/enrich', json={
            'website': website,
            'name': name,
            'city': city,
            'phone': phone,
        }, timeout=5)
        if resp.ok:
            data = resp.json()
            if data.get('cnpj'):
                return data
    except:
        pass
    return None
```
