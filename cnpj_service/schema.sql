-- =============================================================================
-- CNPJ Service - Schema PostgreSQL
-- Dados oficiais da Receita Federal + busca fuzzy com trigram
-- =============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- =============================================================================
-- Tabela EMPRESA (dados da empresa matriz)
-- =============================================================================
CREATE TABLE IF NOT EXISTS empresa (
    cnpj VARCHAR(14) PRIMARY KEY,
    razao_social TEXT,
    natureza_juridica TEXT,
    qualificacao_responsavel TEXT,
    capital_social NUMERIC(18,2),
    porte TEXT,
    ente_federativo_responsavel TEXT,
    opcao_simples BOOLEAN,
    data_opcao_simples DATE,
    data_exclusao_simples DATE,
    opcao_mei BOOLEAN,
    data_opcao_mei DATE,
    data_exclusao_mei DATE,
    situacao_especial TEXT,
    data_situacao_especial DATE
);

-- =============================================================================
-- Tabela ESTABELECIMENTO (dados de cada filial/matriz)
-- =============================================================================
CREATE TABLE IF NOT EXISTS estabelecimento (
    cnpj_basico VARCHAR(8),
    cnpj_ordem VARCHAR(4),
    cnpj_dv VARCHAR(2),
    cnpj_completo VARCHAR(14) GENERATED ALWAYS AS (cnpj_basico || cnpj_ordem || cnpj_dv) STORED,
    identificador_matriz_filial VARCHAR(2),
    nome_fantasia TEXT,
    situacao_cadastral VARCHAR(2),
    data_situacao_cadastral DATE,
    motivo_situacao_cadastral VARCHAR(5),
    nome_cidade_exterior TEXT,
    codigo_pais VARCHAR(5),
    data_inicio_atividade DATE,
    cnae_fiscal VARCHAR(10),
    cnae_fiscal_descricao TEXT,
    tipo_logradouro TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cep VARCHAR(8),
    uf VARCHAR(2),
    codigo_municipio VARCHAR(10),
    municipio TEXT,
    ddd_1 VARCHAR(4),
    telefone_1 VARCHAR(15),
    ddd_2 VARCHAR(4),
    telefone_2 VARCHAR(15),
    ddd_fax VARCHAR(4),
    fax VARCHAR(15),
    email TEXT,
    situacao_especial TEXT,
    data_situacao_especial DATE,
    PRIMARY KEY (cnpj_basico, cnpj_ordem, cnpj_dv)
);

-- =============================================================================
-- Tabela QSA (Quadro Societário)
-- =============================================================================
CREATE TABLE IF NOT EXISTS qsa (
    cnpj_basico VARCHAR(8),
    identificador_socio VARCHAR(5),
    nome_socio TEXT,
    cnpj_cpf_socio VARCHAR(14),
    codigo_qualificacao VARCHAR(5),
    data_entrada DATE,
    codigo_pais VARCHAR(5),
    representante_legal TEXT,
    nome_representante TEXT,
    codigo_qualificacao_representante VARCHAR(5),
    faixa_etaria VARCHAR(5)
);

-- =============================================================================
-- Tabela MUNIC (códigos de municípios)
-- =============================================================================
CREATE TABLE IF NOT EXISTS municipio (
    codigo VARCHAR(10) PRIMARY KEY,
    descricao TEXT
);

-- =============================================================================
-- Tabela CNAE (códigos de atividade econômica)
-- =============================================================================
CREATE TABLE IF NOT EXISTS cnae (
    codigo VARCHAR(10) PRIMARY KEY,
    descricao TEXT
);

-- =============================================================================
-- Tabela MOTIVO (motivos de situação cadastral)
-- =============================================================================
CREATE TABLE IF NOT EXISTS motivo (
    codigo VARCHAR(5) PRIMARY KEY,
    descricao TEXT
);

-- =============================================================================
-- Tabela NATJUR (natureza jurídica)
-- =============================================================================
CREATE TABLE IF NOT EXISTS natjur (
    codigo VARCHAR(5) PRIMARY KEY,
    descricao TEXT
);

-- =============================================================================
-- Tabela QUALIFIC (qualificação de sócios)
-- =============================================================================
CREATE TABLE IF NOT EXISTS qualific (
    codigo VARCHAR(5) PRIMARY KEY,
    descricao TEXT
);

-- =============================================================================
-- Tabela PAIS (códigos de países)
-- =============================================================================
CREATE TABLE IF NOT EXISTS pais (
    codigo VARCHAR(5) PRIMARY KEY,
    descricao TEXT
);

-- =============================================================================
-- ÍNDICES DE PERFORMANCE
-- =============================================================================

-- Índices para estabelecimento
CREATE INDEX IF NOT EXISTS idx_estab_cnpj ON estabelecimento (cnpj_completo);
CREATE INDEX IF NOT EXISTS idx_estab_cnpj_basico ON estabelecimento (cnpj_basico);
CREATE INDEX IF NOT EXISTS idx_estab_cnae ON estabelecimento (cnae_fiscal);
CREATE INDEX IF NOT EXISTS idx_estab_uf ON estabelecimento (uf);
CREATE INDEX IF NOT EXISTS idx_estab_municipio ON estabelecimento (codigo_municipio);
CREATE INDEX IF NOT EXISTS idx_estab_situacao ON estabelecimento (situacao_cadastral);
CREATE INDEX IF NOT EXISTS idx_estab_cep ON estabelecimento (cep);

-- Índices para empresa
CREATE INDEX IF NOT EXISTS idx_empresa_razao ON empresa USING gin (razao_social gin_trgm_ops);

-- Índices para QSA
CREATE INDEX IF NOT EXISTS idx_qsa_cnpj ON qsa (cnpj_basico);
CREATE INDEX IF NOT EXISTS idx_qsa_nome ON qsa USING gin (nome_socio gin_trgm_ops);

-- Índices GIN para busca fuzzy com trigram
CREATE INDEX IF NOT EXISTS idx_estab_nome_fantasia_trgm ON estabelecimento USING gin (nome_fantasia gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_estab_logradouro_trgm ON estabelecimento USING gin (logradouro gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_empresa_razao_trgm ON empresa USING gin (razao_social gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_qsa_nome_trgm ON qsa USING gin (nome_socio gin_trgm_ops);

-- =============================================================================
-- VIEW para consulta completa (JOIN otimizado)
-- =============================================================================
CREATE OR REPLACE VIEW vw_estabelecimento_completo AS
SELECT
    e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv AS cnpj,
    e.nome_fantasia,
    e.situacao_cadastral,
    e.data_situacao_cadastral,
    e.data_inicio_atividade,
    e.cnae_fiscal,
    e.cnae_fiscal_descricao,
    e.tipo_logradouro,
    e.logradouro,
    e.numero,
    e.complemento,
    e.bairro,
    e.cep,
    e.uf,
    e.codigo_municipio,
    e.municipio,
    e.telefone_1,
    e.telefone_2,
    e.email,
    e.identificador_matriz_filial,
    emp.razao_social,
    emp.natureza_juridica,
    emp.capital_social,
    emp.porte,
    emp.opcao_simples,
    emp.opcao_mei,
    emp.situacao_especial,
    nj.descricao AS natureza_juridica_desc,
    m.descricao AS municipio_desc,
    c.descricao AS cnae_desc
FROM estabelecimento e
LEFT JOIN empresa emp ON e.cnpj_basico = emp.cnpj
LEFT JOIN natjur nj ON emp.natureza_juridica = nj.codigo
LEFT JOIN municipio m ON e.codigo_municipio = m.codigo
LEFT JOIN cnae c ON e.cnae_fiscal = c.codigo
WHERE e.situacao_cadastral = '02';  -- Apenas ativas
