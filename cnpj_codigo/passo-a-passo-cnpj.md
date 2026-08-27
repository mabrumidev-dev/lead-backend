# Guia Completo: Implementação de um Microserviço de Consulta de CNPJ por Nome
### Do Scraping à Infraestrutura de Alta Performance com FastAPI, PostgreSQL e Docker

Este documento consolida o passo a passo completo para o desenvolvimento de uma aplicação capaz de buscar dados cadastrais de empresas (CNPJ, Razão Social, Nome Fantasia, Situação Cadastral, Localização e Contatos) a partir de termos textuais (nomes). O guia cobre desde abordagens iniciais de Web Scraping até a criação de uma infraestrutura local robusta utilizando dados oficiais da Receita Federal do Brasil.

---

## Sumário
1. [Conceituação Inicial e Descoberta de Dados](#1-conceituação-inicial-e-descoberta-de-dados)
2. [Abordagem Externa: Web Scraping de Resgate Rápido](#2-abordagem-externa-web-scraping-de-resgate-rápido)
3. [Estratégia Oficial: Arquitetura Local com Dados Públicos da RFB](#3-estratégia-oficial-arquitetura-local-com-dados-públicos-da-rfb)
4. [Carga Automatizada de Tabelas Auxiliares (Municípios e CNAEs)](#4-carga-automatizada-de-tabelas-auxiliares-municípios-e-cnaes)
5. [Otimização de Banco de Dados: Índices Trigram e GIN](#5-otimização-de-banco-de-dados-índices-trigram-e-gin)
6. [Queries Avançadas de Produção (JOINs, Formatação e Filtro por Atividade)](#6-queries-avançadas-de-produção-joins-formatação-e-filtro-por-atividade)
7. [Construção do Backend: Endpoints HTTP com FastAPI](#7-construção-do-backend-endpoints-http-com-fastapi)
8. [DevOps e Conteinerização: Implantação com Docker Compose](#8-devops-e-conteinerização-implantação-com-docker-compose)

---

## 1. Conceituação Inicial e Descoberta de Dados

A busca por empresas pelo nome pode ser feita manualmente por portais do governo ou automatizada em sua aplicação. O ponto de partida oficial para consultas manuais ou entendimento de dados envolve as seguintes plataformas:

*   **Portal REDESIM (Gov.br):** Serviço oficial do Governo Federal para consulta de CNPJs. Exige autenticação via conta `gov.br` (níveis Prata ou Ouro) para pesquisas textuais detalhadas por Razão Social ou Nome Fantasia.
*   **Juntas Comerciais Estaduais:** Cada estado possui seu órgão regulador. Como exemplo prático de consulta avançada por nome empresarial, utiliza-se a JUCESP Online para o estado de São Paulo.
*   **Portal da Transparência:** Base pública federal útil para checar se a corporação possui vínculos ou dados cadastrais amplos.

Ao analisar uma busca real baseada no termo de exemplo **"Sorris'art centro odontológico"**, identificam-se múltiplos registros na base federal que exigem tratamento fonético e de localização devido às variações ativas e baixadas encontradas no território nacional:
1.  *SORRIS'ART CLINICA ODONTOLOGICA LTDA* (Ativa - Florianópolis/SC)
2.  *SORRISART CLINICA ODONTOLOGICA LTDA* (Ativa - Campo Grande/RJ)
3.  *CENTRO ODONTOLOGICO SORRIS'ART LTDA* (Baixada/Encerrada - Tubarão/SC)

---

## 2. Abordagem Externa: Web Scraping de Resgate Rápido

Quando a aplicação necessita consultar CNPJs pelo nome sem a complexidade de gerenciar servidores de banco de dados massivos, a extração de dados via scraping de indexadores públicos torna-se uma alternativa inicial viável. 

Esta técnica consome o motor de busca do portal CNPJ.biz, estruturando o HTML retornado em dicionários Python nativos.

### Dependências Necessárias
No terminal do seu ambiente de desenvolvimento, instale os pacotes de requisição e parseamento de HTML:
```bash
pip install requests beautifulsoup4
```

### Script de Extração Textual (`scraping_cnpj.py`)
```python
import requests
from bs4 import BeautifulSoup
import urllib.parse

def buscar_cnpj_por_nome(nome_empresa):
    """
    Realiza uma busca textual no indexador CNPJ.biz e extrai
    o CNPJ, Razão Social e Localização das empresas encontradas.
    """
    # Formata a string de busca para ser embutida com segurança na URL (URL Encoding)
    nome_termo = urllib.parse.quote(nome_empresa)
    url = f"https://cnpj.biz/procurar?q={nome_termo}"
    
    # Define cabeçalhos HTTP para simular a requisição de um navegador real
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code != 200:
            print(f"Erro na requisição. Status retornado: {response.status_code}")
            return []
            
        soup = BeautifulSoup(response.text, 'html.parser')
        resultados = []
        
        # Analisa os elementos de parágrafo ('p') que guardam os blocos de resultados
        for item in soup.find_all('p'):
            link = item.find('a')
            if link and 'href' in link.attrs:
                texto_completo = item.get_text(separator=" ").strip()
                
                # O padrão esperado de texto do indexador é: "CNPJ - Razão Social (Cidade - UF)"
                if " - " in texto_completo:
                    partes = texto_completo.split(" - ", 1)
                    cnpj = partes[0].strip()
                    resto = partes[1].strip()
                    
                    # Trata o isolamento da localização contida entre parênteses
                    if "(" in resto and resto.endswith(")"):
                        nome, localizacao = resto.rsplit("(", 1)
                        nome = nome.strip()
                        localizacao = localizacao.replace(")", "").strip()
                    else:
                        nome = resto
                        localizacao = "Não informada"
                        
                    # Garante que o bloco extraído corresponde a um registro empresarial legítimo com números
                    if any(char.isdigit() for char in cnpj):
                        resultados.append({
                            "cnpj": cnpj,
                            "razao_social": nome,
                            "localizacao": localizacao
                        })
                        
        return resultados

    except Exception as e:
        print(f"Falha operacional durante o scraping: {e}")
        return []

if __name__ == "__main__":
    termo = "Sorris'art centro odontológico"
    print(f"Iniciando varredura para: '{termo}'...\n")
    
    empresas = buscar_cnpj_por_nome(termo)
    
    if empresas:
        print(f"Sucesso! Encontradas {len(empresas)} correspondências:\n")
        for idx, emp in enumerate(empresas, 1):
            print(f"{idx}. CNPJ: {emp['cnpj']}")
            print(f"   Razão Social: {emp['razao_social']}")
            print(f"   Localização: {emp['localizacao']}")
            print("-" * 50)
    else:
        print("Nenhuma empresa localizada ou a estrutura do site alvo foi modificada.")
```

---

## 3. Estratégia Oficial: Arquitetura Local com Dados Públicos da RFB

Para sistemas comerciais estáveis, o Web Scraping falha devido ao risco de alteração do layout de terceiros e limites de bloqueio por IP (Firewalls/Cloudflare). A solução definitiva consiste em baixar e processar os dados oficiais disponibilizados mensalmente na Página de Dados Abertos da Receita Federal.

A automação abaixo realiza a leitura dinâmica do servidor de dados, baixa os arquivos segmentados de **EMPRESA**, processa o fluxo de dados em blocos reduzidos de memória (*Chunks*) utilizando a biblioteca Pandas, e escreve as linhas diretamente em uma tabela do seu banco de dados relacional.

### Dependências Avançadas
```bash
pip install requests pandas sqlalchemy pymysql psycopg2
```

### Script de Carga Estruturada da Base (`carga_empresas_rfb.py`)
```python
import os
import zipfile
import requests
from bs4 import BeautifulSoup
from sqlalchemy import create_engine
import pandas as pd

# CONFIGURAÇÃO DE ACESSO AO BANCO DE DADOS
# Altere as credenciais conforme seu ambiente (Abaixo o padrão para PostgreSQL)
DB_CONNECTION = 'postgresql://postgres:postgres@localhost:5432/receita_db'

URL_BASE_RECEITA = "https://dadosabertos.rfb.gov.br/CNPJ/"
DIRETORIO_DOWNLOADS = "./dados_receita"

def preparar_ambiente():
    if not os.path.exists(DIRETORIO_DOWNLOADS):
        os.makedirs(DIRETORIO_DOWNLOADS)
        print(f"Diretório de armazenamento temporário criado em: {DIRETORIO_DOWNLOADS}")

def mapear_arquivos_servidor():
    """Varre a raiz do servidor público de dados abertos para obter as URLs de Empresas."""
    print("Conectando ao servidor da Receita Federal...")
    response = requests.get(URL_BASE_RECEITA)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    urls_finais = []
    for tag_a in soup.find_all('a'):
        href = tag_a.get('href')
        # Filtra os pacotes compactados que representam o cadastro de EMPRESAS
        if href and "EMPRES" in href.upper() and href.endswith('.zip'):
            urls_finais.append(URL_BASE_RECEITA + href)
            
    print(f"Mapeamento concluído. {len(urls_finais)} arquivos ZIP detectados.")
    return urls_finais

def realizar_download(url):
    nome_arquivo = url.split('/')[-1]
    caminho_local = os.path.join(DIRETORIO_DOWNLOADS, nome_arquivo)
    
    if os.path.exists(caminho_local):
        print(f"Arquivo {nome_arquivo} já localizado no disco. Download ignorado.")
        return caminho_local

    print(f"Baixando pacote: {nome_arquivo}... Este processo depende da sua banda de rede.")
    with requests.get(url, stream=True) as stream_http:
        stream_http.raise_for_status()
        with open(caminho_local, 'wb') as arquivo_bloco:
            for bloco in stream_http.iter_content(chunk_size=8192):
                arquivo_bloco.write(bloco)
    print(f"Download finalizado com sucesso: {nome_arquivo}")
    return caminho_local

def processar_e_inserir(caminho_zip, engine_banco):
    """Abre o arquivo ZIP em modo stream e descarrega as linhas no banco de dados."""
    print(f"Iniciando processamento interno do arquivo: {caminho_zip}")
    
    # Definição exata do layout fornecido pela documentação oficial da Receita Federal
    layout_colunas = [
        'cnpj_basico', 
        'razao_social', 
        'natureza_juridica', 
        'qualificacao_responsavel', 
        'capital_social', 
        'porte_empresa', 
        'ente_federativo_responsavel'
    ]

    with zipfile.ZipFile(caminho_zip, 'r') as arquivo_zip:
        for arquivo_interno in arquivo_zip.namelist():
            print(f"Analisando arquivo interno de dados: {arquivo_interno}")
            with arquivo_zip.open(arquivo_interno) as ponteiro_dados:
                
                # Divisão da leitura em chunks de 50.000 linhas para mitigar estouro de memória RAM
                leitor_chunks = pd.read_csv(
                    ponteiro_dados, 
                    sep=';', 
                    encoding='latin-1', 
                    header=None, 
                    names=layout_colunas,
                    dtype=str,  # Trata como string para preservar zeros à esquerda em chaves e códigos
                    chunksize=50000
                )
                
                for index, bloco_dataframe in enumerate(leitor_chunks):
                    # Escreve o bloco diretamente na tabela do banco de dados relacional
                    bloco_dataframe.to_sql('empresas_rfb', con=engine_banco, if_exists='append', index=False)
                    print(f"   Módulo {index + 1}: Inseridos { (index + 1) * 50000 } registros...")

def rodar_pipeline_empresas():
    preparar_ambiente()
    engine = create_engine(DB_CONNECTION)
    
    lista_urls = mapear_arquivos_servidor()
    
    for url in lista_urls:
        caminho_zip = realizar_download(url)
        try:
            processar_e_inserir(caminho_zip, engine)
            # Remove o arquivo do disco para liberar espaço durante a execução sequencial
            os.remove(caminho_zip)
            print(f"Arquivo compactado temporário {caminho_zip} deletado do armazenamento local.\n")
        except Exception as erro:
            print(f"Ocorreu uma falha crítica ao processar a URL {url}. Detalhes: {erro}")
            
    print("=== Pipeline de carga de Empresas Finalizado ===")

if __name__ == "__main__":
    rodar_pipeline_empresas()
```

---

## 4. Carga Automatizada de Tabelas Auxiliares (Municípios e CNAEs)

A tabela principal de estabelecimentos armazena cidades e ramos econômicos como códigos cadastrais brutos. Para tornar as telas legíveis, implementamos scripts auxiliares de normalização de dados baseados nos arquivos `MUNIC.zip` e `CNAE.zip` da RFB.

### Script de Importação de Municípios (`carga_municipios.py`)
```python
import zipfile
import requests
import pandas as pd
from sqlalchemy import create_engine
from io import BytesIO

DB_CONNECTION = 'postgresql://postgres:postgres@localhost:5432/receita_db'
URL_MUNICIPIOS = "https://dadosabertos.rfb.gov.br/CNPJ/MUNIC.zip"

def carregar_tabela_municipios():
    engine = create_engine(DB_CONNECTION)
    print("Iniciando captura da tabela de Municípios...")
    
    response = requests.get(URL_MUNICIPIOS)
    if response.status_code != 200:
        print("Erro de comunicação com o servidor federal.")
        return

    with zipfile.ZipFile(BytesIO(response.content)) as zip_memoria:
        for nome_arq in zip_memoria.namelist():
            with zip_memoria.open(nome_arq) as f:
                df = pd.read_csv(
                    f, sep=';', encoding='latin-1', header=None, 
                    names=['codigo_municipio', 'nome_municipio'], dtype=str
                )
                df['nome_municipio'] = df['nome_municipio'].str.strip()
                
                # Salva substituindo registros antigos se houver
                df.to_sql('municipios_rfb', con=engine, if_exists='replace', index=False)
                print(f"Carga finalizada. {len(df)} municípios catalogados.")

if __name__ == "__main__":
    carregar_tabela_municipios()
```

### Script de Importação de Atividades Econômicas (`carga_cnaes.py`)
```python
import zipfile
import requests
import pandas as pd
from sqlalchemy import create_engine
from io import BytesIO

DB_CONNECTION = 'postgresql://postgres:postgres@localhost:5432/receita_db'
URL_CNAES = "https://dadosabertos.rfb.gov.br/CNPJ/CNAE.zip"

def carregar_tabela_cnaes():
    engine = create_engine(DB_CONNECTION)
    print("Iniciando captura da tabela de CNAEs...")
    
    response = requests.get(URL_CNAES)
    if response.status_code != 200:
        print("Erro de comunicação com o servidor federal.")
        return

    with zipfile.ZipFile(BytesIO(response.content)) as zip_memoria:
        for nome_arq in zip_memoria.namelist():
            with zip_memoria.open(nome_arq) as f:
                df = pd.read_csv(
                    f, sep=';', encoding='latin-1', header=None, 
                    names=['codigo_cnae', 'descricao_cnae'], dtype=str
                )
                df['descricao_cnae'] = df['descricao_cnae'].str.strip()
                
                df.to_sql('cnaes_rfb', con=engine, if_exists='replace', index=False)
                print(f"Carga finalizada. {len(df)} códigos de atividade industrial/comercial catalogados.")

if __name__ == "__main__":
    carregar_tabela_cnaes()
```

---

## 5. Otimização de Banco de Dados: Índices Trigram e GIN

Executar pesquisas textuais parciais usando curingas no começo e fim de strings (`LIKE '%TERMO%'`) em tabelas que ultrapassam a marca de 50 milhões de registros resulta em degradação sistêmica devido ao rastreamento completo de tabelas (*Sequential Scan*).

Para mitigar este gargalo no **PostgreSQL**, ativa-se o módulo nativo de trigramas (`pg_trgm`) acoplado a índices invertidos estruturais do tipo **GIN**.

### Comandos de Otimização SQL (Executar no PostgreSQL)
```sql
-- Habilita a extensão oficial focada em quebra e análise de strings por grupos de 3 caracteres
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Criação do índice GIN focado em otimização de buscas parciais na coluna de Razão Social
CREATE INDEX IF NOT EXISTS idx_empresas_rfb_razao_social_trgm 
ON empresas_rfb 
USING gin (razao_social gin_trgm_ops);

-- Criação do índice GIN na coluna correspondente ao Nome Fantasia da tabela de Estabelecimentos
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_nome_fantasia_trgm 
ON estabelecimentos_rfb 
USING gin (nome_fantasia gin_trgm_ops);

-- Criação de índices estruturais do tipo Árvore-B (B-Tree) para chaves de amarração (JOIN) e IDs fixos
CREATE INDEX IF NOT EXISTS idx_empresas_rfb_cnpj_basico ON empresas_rfb (cnpj_basico);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_cnpj_basico ON estabelecimentos_rfb (cnpj_basico);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_municipio ON estabelecimentos_rfb (municipio);
CREATE INDEX IF NOT EXISTS idx_estabelecimentos_cnae_principal ON estabelecimentos_rfb (cnae_fiscal_principal);
```

---

## 6. Queries Avançadas de Produção (JOINs, Formatação e Filtro por Atividade)

Com os dados indexados e as tabelas de domínios populadas, as consultas de produção realizam o cruzamento relacional complexo, traduzindo códigos operacionais e formatando dados telefônicos brutos em strings padronizadas para interfaces humanas.

### Query 1: Busca Unificada por Nome Comercial ou Razão Social com Formatação de Contato
```sql
SELECT 
    CONCAT(emp.cnpj_basico, '/', est.cnpj_ordem, '-', est.cnpj_dv) AS cnpj_completo,
    emp.razao_social,
    est.nome_fantasia,
    CASE est.situacao_cadastral
        WHEN '01' THEN 'NULA'
        WHEN '02' THEN 'ATIVA'
        WHEN '03' THEN 'SUSPENSA'
        WHEN '04' THEN 'INAPTA'
        WHEN '08' THEN 'BAIXADA'
        ELSE 'DESCONHECIDA'
    END AS situacao_cadastral,
    mun.nome_municipio AS cidade,
    est.uf,
    LOWER(est.email) AS email,
    -- Validação do tamanho da string de telefone para aplicação da máscara correta
    CASE 
        WHEN est.telefone_1 IS NULL OR est.telefone_1 = '' THEN 'Não informado'
        WHEN LENGTH(est.telefone_1) = 8 THEN CONCAT('(', est.ddd_1, ') ', SUBSTRING(est.telefone_1 FROM 1 FOR 4), '-', SUBSTRING(est.telefone_1 FROM 5 FOR 4))
        WHEN LENGTH(est.telefone_1) = 9 THEN CONCAT('(', est.ddd_1, ') ', SUBSTRING(est.telefone_1 FROM 1 FOR 5), '-', SUBSTRING(est.telefone_1 FROM 6 FOR 4))
        ELSE CONCAT('(', est.ddd_1, ') ', est.telefone_1)
    END AS telefone_formatado
FROM empresas_rfb emp
INNER JOIN estabelecimentos_rfb est ON emp.cnpj_basico = est.cnpj_basico
LEFT JOIN municipios_rfb mun ON est.municipio = mun.codigo_municipio
WHERE 
    emp.razao_social ILIKE %s 
    OR est.nome_fantasia ILIKE %s
LIMIT 15;
```

### Query 2: Segmentação de Leads de Mercado por Código CNAE e Localidade
Esta variante da instrução SQL restringe o escopo de busca, isolando entidades com cadastros ativos que operam em setores específicos (ex: código `8630504` para atendimento odontológico) dentro de limites municipais.
```sql
SELECT 
    CONCAT(emp.cnpj_basico, est.cnpj_ordem, est.cnpj_dv) AS cnpj_puro,
    emp.razao_social,
    est.nome_fantasia,
    mun.nome_municipio AS cidade,
    est.uf,
    cnae.descricao_cnae AS atividade_economica,
    LOWER(est.email) AS email,
    CONCAT('(', est.ddd_1, ') ', est.telefone_1) AS telefone_bruto
FROM empresas_rfb emp
INNER JOIN estabelecimentos_rfb est ON emp.cnpj_basico = est.cnpj_basico
LEFT JOIN municipios_rfb mun ON est.municipio = mun.codigo_municipio
LEFT JOIN cnaes_rfb cnae ON est.cnae_fiscal_principal = cnae.codigo_cnae
WHERE 
    est.situacao_cadastral = '02'                -- Apenas corporações ATIVAS
    AND est.cnae_fiscal_principal = %s          -- Filtro do código CNAE dinâmico
    AND mun.nome_municipio = %s                  -- Nome da cidade alvo em maiúsculo
    AND est.uf = %s                              -- Sigla da Unidade Federativa
LIMIT 50;
```

---

## 7. Construção do Backend: Endpoints HTTP com FastAPI

Para que aplicações mobile, sistemas web ou plataformas de front-end utilizem estes motores de consulta, expomos as rotas SQL por meio de uma API REST desenvolvida com o ecossistema assíncrono **FastAPI**.

### Código de Inicialização do Serviço Backend (`main.py`)
```python
from fastapi import FastAPI, Query, HTTPException
from sqlalchemy import create_engine
import os
import pandas as pd
from typing import List

app = FastAPI(
    title="Microserviço de Distribuição e Busca de CNPJ",
    description="Engine HTTP estável conectado à réplica dos dados públicos da Receita Federal.",
    version="1.0.0"
)

# Resgata a string de conexão das variáveis de ambiente do sistema ou assume fallback local
DB_CONNECTION = os.getenv("DB_CONNECTION", "postgresql://postgres:postgres@localhost:5432/receita_db")
engine = create_engine(DB_CONNECTION)

@app.get("/buscar", summary="Consulta registros por proximidade de termo textual")
def endpoint_buscar_nome(termo: str = Query(..., min_length=3, description="Termo de pesquisa corporativo")):
    termo_param = f"%{termo}%"
    
    query = """
        SELECT 
            CONCAT(emp.cnpj_basico, est.cnpj_ordem, est.cnpj_dv) AS cnpj,
            emp.razao_social,
            est.nome_fantasia,
            CASE est.situacao_cadastral WHEN '02' THEN 'ATIVA' WHEN '08' THEN 'BAIXADA' ELSE 'OUTRA' END AS status,
            mun.nome_municipio AS cidade,
            est.uf,
            LOWER(est.email) AS email,
            CASE 
                WHEN est.telefone_1 IS NULL OR est.telefone_1 = '' THEN 'Não informado'
                WHEN LENGTH(est.telefone_1) = 8 THEN CONCAT('(', est.ddd_1, ') ', SUBSTRING(est.telefone_1 FROM 1 FOR 4), '-', SUBSTRING(est.telefone_1 FROM 5 FOR 4))
                WHEN LENGTH(est.telefone_1) = 9 THEN CONCAT('(', est.ddd_1, ') ', SUBSTRING(est.telefone_1 FROM 1 FOR 5), '-', SUBSTRING(est.telefone_1 FROM 6 FOR 4))
                ELSE CONCAT('(', est.ddd_1, ') ', est.telefone_1)
            END AS telefone
        FROM empresas_rfb emp
        INNER JOIN estabelecimentos_rfb est ON emp.cnpj_basico = est.cnpj_basico
        LEFT JOIN municipios_rfb mun ON est.municipio = mun.codigo_municipio
        WHERE emp.razao_social ILIKE %s OR est.nome_fantasia ILIKE %s
        LIMIT 20;
    """
    try:
        dataframe_resultado = pd.read_sql(query, con=engine, params=(termo_param, termo_param))
        return dataframe_resultado.to_dict(orient='records')
    except Exception as erro_banco:
        raise HTTPException(status_code=500, detail=f"Falha operacional interna: {str(erro_banco)}")

@app.get("/filtrar-atividade", summary="Lista corporações ativas filtradas por CNAE")
def endpoint_filtrar_atividade(
    cnae: str = Query(..., description="Código alvo do CNAE. Ex: 8630504"),
    cidade: str = Query(..., description="Cidade para delimitação geográfica"),
    uf: str = Query(..., max_length=2, description="UF para delimitação geográfica")
):
    query = """
        SELECT 
            CONCAT(emp.cnpj_basico, est.cnpj_ordem, est.cnpj_dv) AS cnpj,
            emp.razao_social,
            est.nome_fantasia,
            mun.nome_municipio AS cidade,
            est.uf,
            CASE 
                WHEN est.telefone_1 IS NULL OR est.telefone_1 = '' THEN 'Não informado'
                ELSE CONCAT('(', est.ddd_1, ') ', est.telefone_1)
            END AS telefone
        FROM empresas_rfb emp
        INNER JOIN estabelecimentos_rfb est ON emp.cnpj_basico = est.cnpj_basico
        LEFT JOIN municipios_rfb mun ON est.municipio = mun.codigo_municipio
        WHERE est.situacao_cadastral = '02'
          AND est.cnae_fiscal_principal = %s
          AND mun.nome_municipio = %s
          AND est.uf = %s
        LIMIT 50;
    """
    try:
        dataframe_resultado = pd.read_sql(query, con=engine, params=(cnae, cidade.upper().strip(), uf.upper().strip()))
        return dataframe_resultado.to_dict(orient='records')
    except Exception as erro_banco:
        raise HTTPException(status_code=500, detail=f"Falha operacional interna: {str(erro_banco)}")
```

---

## 8. DevOps e Conteinerização: Implantação com Docker Compose

Para garantir portabilidade e facilitar o deploy em servidores de homologação ou nuvem comercial, encapsulamos a API FastAPI e o banco de dados PostgreSQL utilizando contêineres Docker isolados em rede interna estruturada.

### Arquivo 1: `requirements.txt`
```text
fastapi>=0.110.0
uvicorn>=0.28.0
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.9
pandas>=2.2.0
beautifulsoup4>=4.12.0
requests>=2.31.0
```

### Arquivo 2: `Dockerfile`
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instala ferramentas essenciais do sistema operacional para compilação C/C++ se requerido
RUN apt-get update && apt-get install -y --no-install-recommends     build-essential     && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Arquivo 3: `init.sql`
Colocado na pasta raiz do projeto. Garante a configuração automática de extensões de texto no banco assim que o container subir pela primeira vez.
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Arquivo 4: `docker-compose.yml`
```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: cnpj_postgres_db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: sua_senha_segura_aqui
      POSTGRES_DB: receita_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d receita_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build: .
    container_name: cnpj_fastapi_api
    restart: always
    ports:
      - "8000:8000"
    environment:
      - DB_CONNECTION=postgresql://postgres:sua_senha_segura_aqui@db:5432/receita_db
    depends_on:
      db:
        condition: service_healthy

volumes:
  postgres_data:
```

### Comando para Inicialização Global da Infraestrutura
Estando no diretório raiz do projeto que hospeda as configurações acima descritas, execute o comando de orquestração no terminal:
```bash
docker-compose up -d --build
```
Após o build e inicialização dos serviços, a documentação Swagger interativa automatizada para testes de integração de rotas ficará acessível imediatamente no endereço de rede local: **`http://localhost:8000/docs`**.
