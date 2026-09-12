#!/usr/bin/env python3
"""
API de consulta CNPJ com busca fuzzy por nome.

Endpoints:
    GET  /api/cnpj/{cnpj}           → Busca exata por CNPJ
    GET  /api/cnpj/busca?nome=X     → Busca fuzzy por nome (trigram)
    GET  /api/cnpj/busca-endereco   → Busca por endereço (CEP, rua, bairro, cidade, UF)
    GET  /api/cnpj/busca-socio      → Busca por nome de sócio (QSA)
    GET  /api/cnpj/busca-avancada   → Busca avançada com filtros inteligentes
    POST /api/cnpj/enrich           → Enrichment completo (compatível com backend existente)
    GET  /api/cnpj/cnae/categorias  → Lista categorias CNAE agrupadas
    GET  /api/cnpj/health           → Health check
"""

import os
import re
import logging
from typing import Optional
from contextlib import contextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
import requests as http_requests

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
log = logging.getLogger('cnpj_api')

app = FastAPI(title="CNPJ Lookup Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# Database connection pool
# =============================================================================

DB_CONFIG = {
    'host': os.environ.get('CNPJ_DB_HOST', 'localhost'),
    'port': os.environ.get('CNPJ_DB_PORT', '5432'),
    'dbname': os.environ.get('CNPJ_DB_NAME', 'cnpj'),
    'user': os.environ.get('CNPJ_DB_USER', 'cnpj'),
    'password': os.environ.get('CNPJ_DB_PASSWORD', 'cnpj'),
}

_conn = None


def get_conn():
    """Get or create database connection."""
    global _conn
    if _conn is None or _conn.closed:
        _conn = psycopg2.connect(**DB_CONFIG)
        _conn.autocommit = True
    return _conn


@contextmanager
def get_cursor():
    """Context manager for database cursor."""
    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        yield cur
    finally:
        cur.close()


# =============================================================================
# External API — Orquestrador de fontes
# Ordem: minhareceita.org (primária) → BrasilAPI → ReceitaWS
# Se a primária responder mas tiver campos vazios, completa com secundárias
# =============================================================================

# Campos que devem estar preenchidos (chave = campo, valor = vazio que indica faltando)
_EMPTY_STRINGS = {'', '0', 'None', 'null'}

def _field_is_empty(val) -> bool:
    """Verifica se um campo está vazio/ausente."""
    if val is None:
        return True
    if isinstance(val, str) and val.strip() in _EMPTY_STRINGS:
        return True
    if isinstance(val, (list, dict)) and len(val) == 0:
        return True
    return False


def _complement_data(primary: dict, secondary: dict) -> dict:
    """Preenche campos vazios do primary com dados do secondary."""
    if not secondary:
        return primary
    complemented = 0
    for key, sec_val in secondary.items():
        if key in ('source',):
            continue
        prim_val = primary.get(key)
        if _field_is_empty(prim_val) and not _field_is_empty(sec_val):
            primary[key] = sec_val
            complemented += 1
    if complemented:
        log.info(f"  [Complement] {complemented} campos preenchidos por {secondary.get('source', '?')}")
    return primary


def _fetch_from_minhareceita(cnpj_clean: str) -> Optional[dict]:
    """Busca CNPJ na minhareceita.org (primária — mais completa)."""
    try:
        formatted = f"{cnpj_clean[:2]}.{cnpj_clean[2:5]}.{cnpj_clean[5:8]}/{cnpj_clean[8:12]}-{cnpj_clean[12:]}"
        url = f"https://minhareceita.org/{formatted}"
        resp = http_requests.get(url, timeout=15, headers={'User-Agent': 'MabrumiCRM/2.0'})
        if resp.status_code == 200:
            data = resp.json()
            log.info(f"  [minhareceita] CNPJ {cnpj_clean} encontrado")
            return _normalize_minhareceita(data, cnpj_clean)
        log.warning(f"  [minhareceita] status {resp.status_code} para {cnpj_clean}")
        return None
    except Exception as e:
        log.warning(f"  [minhareceita] erro: {e}")
        return None


def _fetch_from_brasilapi(cnpj_clean: str) -> Optional[dict]:
    """Busca CNPJ na BrasilAPI (secundária)."""
    try:
        url = f"https://brasilapi.com.br/api/cnpj/v1/{cnpj_clean}"
        resp = http_requests.get(url, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            log.info(f"  [BrasilAPI] CNPJ {cnpj_clean} encontrado")
            return _normalize_brasilapi(data, cnpj_clean)
        log.warning(f"  [BrasilAPI] status {resp.status_code} para {cnpj_clean}")
        return None
    except Exception as e:
        log.warning(f"  [BrasilAPI] erro: {e}")
        return None


def _fetch_from_receitaws(cnpj_clean: str) -> Optional[dict]:
    """Busca CNPJ na ReceitaWS (terciária — mais simples, rate limit 3/min)."""
    try:
        url = f"https://receitaws.com.br/v1/cnpj/{cnpj_clean}"
        resp = http_requests.get(url, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('status') == 'OK':
                log.info(f"  [ReceitaWS] CNPJ {cnpj_clean} encontrado")
                return _normalize_receitaws(data, cnpj_clean)
        log.warning(f"  [ReceitaWS] status {resp.status_code} para {cnpj_clean}")
        return None
    except Exception as e:
        log.warning(f"  [ReceitaWS] erro: {e}")
        return None


def _normalize_minhareceita(data: dict, cnpj_clean: str) -> dict:
    """Normaliza resposta da minhareceita.org para formato padrão."""
    qsa_raw = data.get('qsa', []) or []
    qsa = [{
        'nome': q.get('nome_socio', ''),
        'cnpj_cpf': q.get('cnpj_cpf_do_socio', ''),
        'qualificacao': q.get('qualificacao_socio', ''),
        'entrada': q.get('data_entrada_sociedade', ''),
        'representante_legal': q.get('cpf_representante_legal', ''),
        'nome_representante': q.get('nome_representante_legal', ''),
        'faixa_etaria': q.get('faixa_etaria', ''),
    } for q in qsa_raw]

    cnaes_sec = data.get('cnaes_secundarios', []) or []
    owners = [q['nome'] for q in qsa if q['nome']]
    logradouro = data.get('logradouro', '') or ''
    tipo_log = data.get('descricao_tipo_de_logradouro', '') or ''
    endereco = f"{tipo_log} {logradouro} {data.get('numero', '')} {data.get('complemento', '')} {data.get('bairro', '')}".strip()

    # Formatar telefone
    ddd1 = data.get('ddd_telefone_1', '') or ''
    tel1 = ddd1
    ddd2 = data.get('ddd_telefone_2', '') or ''
    tel2 = ddd2
    ddd_fax = data.get('ddd_fax', '') or ''

    # Regime tributário
    regime_raw = data.get('regime_tributario', []) or []
    regime = [
        f"{r.get('forma_de_tributacao', '')} ({r.get('ano', '')})"
        for r in regime_raw
    ]

    # CNAEs secundários em formato texto
    cnaes_sec_text = [
        f"{c.get('descricao', '')} ({c.get('codigo', '')})"
        for c in cnaes_sec
    ]

    return {
        'cnpj': cnpj_clean,
        'cnpj_formatado': f"{cnpj_clean[:2]}.{cnpj_clean[2:5]}.{cnpj_clean[5:8]}/{cnpj_clean[8:12]}-{cnpj_clean[12:]}",
        'razao_social': data.get('razao_social', '') or '',
        'nome_fantasia': data.get('nome_fantasia', '') or '',
        'situacao_cadastral': data.get('descricao_situacao_cadastral', '') or '',
        'situacao_cadastral_codigo': str(data.get('situacao_cadastral', '')),
        'data_situacao_cadastral': data.get('data_situacao_cadastral', '') or '',
        'data_inicio_atividade': data.get('data_inicio_atividade', '') or '',
        'natureza_juridica': data.get('natureza_juridica', '') or '',
        'natureza_juridica_desc': data.get('natureza_juridica', '') or '',
        'porte': data.get('porte', '') or '',
        'capital_social': float(data.get('capital_social', 0) or 0),
        'cnae_fiscal': str(data.get('cnae_fiscal', '')),
        'cnae_fiscal_descricao': data.get('cnae_fiscal_descricao', '') or '',
        'logradouro': logradouro,
        'tipo_logradouro': tipo_log,
        'numero': data.get('numero', '') or '',
        'complemento': data.get('complemento', '') or '',
        'bairro': data.get('bairro', '') or '',
        'cep': data.get('cep', '') or '',
        'uf': data.get('uf', '') or '',
        'municipio': data.get('municipio', '') or '',
        'codigo_municipio': str(data.get('codigo_municipio', '')),
        'codigo_municipio_ibge': str(data.get('codigo_municipio_ibge', '')),
        'telefone_1': tel1,
        'telefone_2': tel2,
        'email': data.get('email', '') or '',
        'identificador_matriz_filial': data.get('descricao_identificador_matriz_filial', '') or '',
        'opcao_simples': data.get('opcao_pelo_simples'),
        'opcao_mei': data.get('opcao_pelo_mei'),
        'situacao_especial': data.get('situacao_especial', '') or '',
        'endereco_completo': endereco,
        'responsavel': owners[0] if owners else '',
        'socios': ', '.join(owners),
        'qsa': qsa,
        'cnaes_secundarios': cnaes_sec_text,
        'regime_tributario': regime,
        'motivo_situacao': data.get('descricao_motivo_situacao_cadastral', '') or '',
        'entidade_federativa': data.get('ente_federativo_responsavel', '') or '',
        'fax': ddd_fax,
        'data_opcao_simples': data.get('data_opcao_pelo_simples', '') or '',
        'data_opcao_mei': data.get('data_opcao_pelo_mei', '') or '',
        'source': 'minhareceita',
    }


def _normalize_brasilapi(data: dict, cnpj_clean: str) -> dict:
    """Normaliza resposta da BrasilAPI para formato padrão."""
    qsa_raw = data.get('qsa', []) or []
    qsa = [{
        'nome': q.get('nome_socio', ''),
        'cnpj_cpf': q.get('cnpj_cpf_do_socio', ''),
        'qualificacao': q.get('qualificacao_socio', ''),
        'entrada': q.get('data_entrada_sociedade', ''),
        'representante_legal': q.get('cpf_representante_legal', ''),
        'nome_representante': q.get('nome_representante_legal', ''),
        'faixa_etaria': q.get('faixa_etaria', ''),
    } for q in qsa_raw]

    cnaes_sec = data.get('cnaes_secundarios', []) or []
    owners = [q['nome'] for q in qsa if q['nome']]
    logradouro = data.get('logradouro', '') or ''
    tipo_log = data.get('descricao_tipo_de_logradouro', '') or ''
    endereco = f"{tipo_log} {logradouro} {data.get('numero', '')} {data.get('complemento', '')} {data.get('bairro', '')}".strip()

    regime_raw = data.get('regime_tributario', []) or []
    regime = [f"{r.get('forma_de_tributacao', '')} ({r.get('ano', '')})" for r in regime_raw]
    cnaes_sec_text = [f"{c.get('descricao', '')} ({c.get('codigo', '')})" for c in cnaes_sec]

    return {
        'cnpj': cnpj_clean,
        'cnpj_formatado': f"{cnpj_clean[:2]}.{cnpj_clean[2:5]}.{cnpj_clean[5:8]}/{cnpj_clean[8:12]}-{cnpj_clean[12:]}",
        'razao_social': data.get('razao_social', '') or '',
        'nome_fantasia': data.get('nome_fantasia', '') or '',
        'situacao_cadastral': data.get('descricao_situacao_cadastral', '') or '',
        'situacao_cadastral_codigo': str(data.get('situacao_cadastral', '')),
        'data_situacao_cadastral': data.get('data_situacao_cadastral', '') or '',
        'data_inicio_atividade': data.get('data_inicio_atividade', '') or '',
        'natureza_juridica': data.get('natureza_juridica', '') or '',
        'natureza_juridica_desc': data.get('natureza_juridica', '') or '',
        'porte': data.get('porte', '') or '',
        'capital_social': float(data.get('capital_social', 0) or 0),
        'cnae_fiscal': str(data.get('cnae_fiscal', '')),
        'cnae_fiscal_descricao': data.get('cnae_fiscal_descricao', '') or '',
        'logradouro': logradouro,
        'tipo_logradouro': tipo_log,
        'numero': data.get('numero', '') or '',
        'complemento': data.get('complemento', '') or '',
        'bairro': data.get('bairro', '') or '',
        'cep': data.get('cep', '') or '',
        'uf': data.get('uf', '') or '',
        'municipio': data.get('municipio', '') or '',
        'codigo_municipio': str(data.get('codigo_municipio', '')),
        'codigo_municipio_ibge': str(data.get('codigo_municipio_ibge', '')),
        'telefone_1': data.get('ddd_telefone_1', '') or '',
        'telefone_2': data.get('ddd_telefone_2', '') or '',
        'email': data.get('email', '') or '',
        'identificador_matriz_filial': data.get('descricao_identificador_matriz_filial', '') or '',
        'opcao_simples': data.get('opcao_pelo_simples'),
        'opcao_mei': data.get('opcao_pelo_mei'),
        'situacao_especial': data.get('situacao_especial', '') or '',
        'endereco_completo': endereco,
        'responsavel': owners[0] if owners else '',
        'socios': ', '.join(owners),
        'qsa': qsa,
        'cnaes_secundarios': cnaes_sec_text,
        'regime_tributario': regime,
        'motivo_situacao': data.get('descricao_motivo_situacao_cadastral', '') or '',
        'entidade_federativa': data.get('ente_federativo_responsavel', '') or '',
        'codigo_municipio_ibge': str(data.get('codigo_municipio_ibge', '')),
        'fax': data.get('ddd_fax', '') or '',
        'data_opcao_simples': data.get('data_opcao_pelo_simples', '') or '',
        'data_opcao_mei': data.get('data_opcao_pelo_mei', '') or '',
        'source': 'brasilapi',
    }


def _normalize_receitaws(data: dict, cnpj_clean: str) -> dict:
    """Normaliza resposta da ReceitaWS para formato padrão."""
    logradouro = data.get('logradouro', '') or ''
    tipo_log = ''
    endereco = f"{logradouro} {data.get('numero', '')} {data.get('complemento', '')} {data.get('bairro', '')}".strip()

    # QSA da ReceitaWS é mais simples
    qsa_raw = data.get('qsa', []) or []
    qsa = [{
        'nome': s.get('nome', ''),
        'cnpj_cpf': '',
        'qualificacao': s.get('qualificacao', '') or s.get('qual', ''),
        'entrada': '',
        'representante_legal': s.get('nome_rep_legal', '') or '',
        'nome_representante': s.get('nome_rep_legal', '') or '',
        'faixa_etaria': '',
    } for s in qsa_raw]

    owners = [q['nome'] for q in qsa if q['nome']]

    # Simples/MEI
    simples = data.get('simples', {}) or {}
    simei = data.get('simei', {}) or {}

    cnaes_sec = [
        {'codigo': a.get('code', ''), 'descricao': a.get('text', '')}
        for a in (data.get('atividades_secundarias') or [])
    ]
    cnaes_sec_text = [
        f"{a.get('text', '')} ({a.get('code', '')})"
        for a in (data.get('atividades_secundarias') or [])
    ]

    return {
        'cnpj': cnpj_clean,
        'cnpj_formatado': f"{cnpj_clean[:2]}.{cnpj_clean[2:5]}.{cnpj_clean[5:8]}/{cnpj_clean[8:12]}-{cnpj_clean[12:]}",
        'razao_social': data.get('nome', '') or '',
        'nome_fantasia': data.get('fantasia', '') or '',
        'situacao_cadastral': data.get('situacao', '') or '',
        'situacao_cadastral_codigo': '',
        'data_situacao_cadastral': data.get('data_situacao', '') or '',
        'data_inicio_atividade': data.get('abertura', '') or '',
        'natureza_juridica': data.get('natureza_juridica', '') or '',
        'natureza_juridica_desc': data.get('natureza_juridica', '') or '',
        'porte': data.get('porte', '') or '',
        'capital_social': float(data.get('capital_social', 0) or 0),
        'cnae_fiscal': data.get('atividade_principal', [{}])[0].get('code', '') if data.get('atividade_principal') else '',
        'cnae_fiscal_descricao': data.get('atividade_principal', [{}])[0].get('text', '') if data.get('atividade_principal') else '',
        'logradouro': logradouro,
        'tipo_logradouro': tipo_log,
        'numero': data.get('numero', '') or '',
        'complemento': data.get('complemento', '') or '',
        'bairro': data.get('bairro', '') or '',
        'cep': data.get('cep', '') or '',
        'uf': data.get('uf', '') or '',
        'municipio': data.get('municipio', '') or '',
        'codigo_municipio': '',
        'codigo_municipio_ibge': '',
        'telefone_1': data.get('telefone', '') or '',
        'telefone_2': '',
        'email': data.get('email', '') or '',
        'identificador_matriz_filial': data.get('tipo', '') or '',
        'opcao_simples': simples.get('optante'),
        'opcao_mei': simei.get('optante'),
        'situacao_especial': data.get('situacao_especial', '') or '',
        'endereco_completo': endereco,
        'responsavel': '',
        'socios': ', '.join(owners),
        'qsa': qsa,
        'cnaes_secundarios': cnaes_sec_text,
        'regime_tributario': [],
        'motivo_situacao': data.get('motivo_situacao', '') or '',
        'entidade_federativa': data.get('efr', '') or '',
        'fax': '',
        'data_opcao_simples': simples.get('data_opcao', '') or '',
        'data_opcao_mei': simei.get('data_opcao', '') or '',
        'ultima_atualizacao': data.get('ultima_atualizacao', '') or '',
        'source': 'receitaws',
    }


def _fetch_external(cnpj_clean: str) -> Optional[dict]:
    """
    Orquestrador de APIs externas.
    1. Tenta minhareceita.org (primária — mais completa)
    2. Se falhar → BrasilAPI
    3. Se falhar → ReceitaWS
    4. Se primária responder mas tiver campos vazios → completa com secundárias
    """
    # 1. Primária
    primary = _fetch_from_minhareceita(cnpj_clean)

    # 2. Fallback se primária falhou
    if not primary:
        primary = _fetch_from_brasilapi(cnpj_clean)
    if not primary:
        primary = _fetch_from_receitaws(cnpj_clean)
    if not primary:
        return None

    # 3. Complementar campos vazios com secundárias
    # Só tenta se a primária foi minhareceita ou BrasilAPI (mesma estrutura)
    if primary.get('source') in ('minhareceita', 'brasilapi'):
        # Checa campos críticos
        critical_fields = ['regime_tributario', 'telefone_2', 'fax', 'codigo_municipio_ibge']
        has_gaps = any(_field_is_empty(primary.get(f)) for f in critical_fields)
        if has_gaps:
            # Tenta complementar com BrasilAPI se primária foi minhareceita
            if primary.get('source') == 'minhareceita':
                secondary = _fetch_from_brasilapi(cnpj_clean)
                primary = _complement_data(primary, secondary)
            # Se ainda tem gaps, tenta ReceitaWS (tem ultima_atualizacao)
            still_gaps = any(_field_is_empty(primary.get(f)) for f in critical_fields)
            if still_gaps:
                tertiary = _fetch_from_receitaws(cnpj_clean)
                primary = _complement_data(primary, tertiary)
    elif primary.get('source') == 'receitaws':
        # ReceitaWS é mais simples — tenta completar com BrasilAPI
        secondary = _fetch_from_brasilapi(cnpj_clean)
        primary = _complement_data(primary, secondary)

    return primary


# =============================================================================
# Modelos
# =============================================================================

class CNPJResponse(BaseModel):
    cnpj: str
    razao_social: str = ''
    nome_fantasia: str = ''
    situacao_cadastral: str = ''
    data_situacao_cadastral: str = ''
    data_inicio_atividade: str = ''
    natureza_juridica: str = ''
    natureza_juridica_desc: str = ''
    porte: str = ''
    capital_social: float = 0
    cnae_fiscal: str = ''
    cnae_fiscal_descricao: str = ''
    cnaes_secundarios: list = []
    logradouro: str = ''
    numero: str = ''
    complemento: str = ''
    bairro: str = ''
    cep: str = ''
    uf: str = ''
    municipio: str = ''
    codigo_municipio: str = ''
    telefone_1: str = ''
    telefone_2: str = ''
    email: str = ''
    opcao_simples: Optional[bool] = None
    opcao_mei: Optional[bool] = None
    identificador_matriz_filial: str = ''
    responsavel: str = ''
    socios: str = ''
    qsa: list = []
    # Compatibilidade com formato existente
    razao_social: str = ''
    nome_fantasia: str = ''
    cnae_fiscal: str = ''
    cnaes_secundarios: list = []
    regime_tributario: list = []
    situacao_especial: str = ''
    data_opcao_simples: str = ''
    data_opcao_mei: str = ''
    data_situacao_cadastral: str = ''
    motivo_situacao: str = ''
    entidade_federativa: str = ''
    codigo_municipio_ibge: str = ''
    fax: str = ''


class SearchResult(BaseModel):
    cnpj: str
    razao_social: str
    nome_fantasia: str = ''
    uf: str = ''
    municipio: str = ''
    situacao_cadastral: str = ''
    score: float = 0


class EnrichRequest(BaseModel):
    website: str = ''
    name: str = ''
    city: str = ''
    phone: str = ''


# =============================================================================
# Funções auxiliares
# =============================================================================

def _format_cnpj(cnpj: str) -> str:
    """Formata CNPJ: 00.000.000/0000-00"""
    cnpj = re.sub(r'\D', '', cnpj)
    if len(cnpj) == 14:
        return f"{cnpj[:2]}.{cnpj[2:5]}.{cnpj[5:8]}/{cnpj[8:12]}-{cnpj[12:]}"
    return cnpj


def _situacao_desc(codigo: str) -> str:
    """Converte código de situação cadastral em descrição."""
    situacoes = {
        '01': 'Nula',
        '02': 'Ativa',
        '03': 'Suspensa',
        '04': 'Inapta',
        '08': 'Baixada',
    }
    return situacoes.get(codigo, codigo or '')


def _matriz_filial_desc(codigo: str) -> str:
    """Converte identificador matriz/filial."""
    if codigo == '1':
        return 'Matriz'
    if codigo == '2':
        return 'Filial'
    return codigo or ''


def _row_to_cnpj(row: dict) -> dict:
    """Converte row do banco para formato de resposta."""
    cnpj = row.get('cnpj', '')
    return {
        'cnpj': cnpj,
        'cnpj_formatado': _format_cnpj(cnpj),
        'razao_social': row.get('razao_social', '') or '',
        'nome_fantasia': row.get('nome_fantasia', '') or '',
        'situacao_cadastral': _situacao_desc(row.get('situacao_cadastral', '')),
        'situacao_cadastral_codigo': row.get('situacao_cadastral', '') or '',
        'data_situacao_cadastral': str(row.get('data_situacao_cadastral', '') or ''),
        'data_inicio_atividade': str(row.get('data_inicio_atividade', '') or ''),
        'natureza_juridica': row.get('natureza_juridica', '') or '',
        'natureza_juridica_desc': row.get('natureza_juridica_desc', '') or '',
        'porte': row.get('porte', '') or '',
        'capital_social': float(row.get('capital_social', 0) or 0),
        'cnae_fiscal': row.get('cnae_fiscal', '') or '',
        'cnae_fiscal_descricao': row.get('cnae_fiscal_descricao', '') or row.get('cnae_desc', '') or '',
        'logradouro': row.get('logradouro', '') or '',
        'tipo_logradouro': row.get('tipo_logradouro', '') or '',
        'numero': row.get('numero', '') or '',
        'complemento': row.get('complemento', '') or '',
        'bairro': row.get('bairro', '') or '',
        'cep': row.get('cep', '') or '',
        'uf': row.get('uf', '') or '',
        'municipio': row.get('municipio', '') or row.get('municipio_desc', '') or '',
        'codigo_municipio': row.get('codigo_municipio', '') or '',
        'telefone_1': row.get('telefone_1', '') or '',
        'telefone_2': row.get('telefone_2', '') or '',
        'email': row.get('email', '') or '',
        'identificador_matriz_filial': _matriz_filial_desc(row.get('identificador_matriz_filial', '')),
        'opcao_simples': row.get('opcao_simples'),
        'opcao_mei': row.get('opcao_mei'),
        'situacao_especial': row.get('situacao_especial', '') or '',
    }


def _fetch_qsa(cnpj_basico: str) -> list:
    """Busca QSA (sócios) de uma empresa."""
    try:
        with get_cursor() as cur:
            cur.execute("""
                SELECT nome_socio, cnpj_cpf_socio, codigo_qualificacao,
                       data_entrada, representante_legal, nome_representante,
                       faixa_etaria
                FROM qsa
                WHERE cnpj_basico = %s
                ORDER BY nome_socio
            """, (cnpj_basico,))
            rows = cur.fetchall()
            return [{
                'nome': r['nome_socio'] or '',
                'cnpj_cpf': r['cnpj_cpf_socio'] or '',
                'qualificacao': r['codigo_qualificacao'] or '',
                'entrada': str(r['data_entrada'] or ''),
                'representante_legal': r['representante_legal'] or '',
                'nome_representante': r['nome_representante'] or '',
                'faixa_etaria': r['faixa_etaria'] or '',
            } for r in rows]
    except Exception as e:
        log.error(f"Erro ao buscar QSA: {e}")
        return []


def _build_full_response(cnpj_data: dict, qsa: list) -> dict:
    """Monta resposta completa com QSA e dados formatados."""
    owners = [q['nome'] for q in qsa if q['nome']]

    # Endereço completo
    endereco_parts = [
        cnpj_data.get('tipo_logradouro', ''),
        cnpj_data.get('logradouro', ''),
        cnpj_data.get('numero', ''),
        cnpj_data.get('complemento', ''),
        cnpj_data.get('bairro', ''),
    ]
    endereco_completo = ' '.join(p for p in endereco_parts if p).strip()

    result = {
        **cnpj_data,
        'endereco_completo': endereco_completo,
        'responsavel': owners[0] if owners else '',
        'socios': ', '.join(owners),
        'qsa': qsa,
        'cnaes_secundarios': [],  # TODO: buscar de tabela separada se existir
        'regime_tributario': [],
    }
    return result


def _format_enrich_response(result: dict) -> dict:
    """Formata resposta no formato esperado pelo backend."""
    # Regime tributario: já vem formatado dos normalizadores
    regime = result.get('regime_tributario', []) or []
    # Se por acaso vier como objetos, converter pra texto
    if regime and isinstance(regime[0], dict):
        regime = [f"{r.get('forma_de_tributacao', '')} ({r.get('ano', '')})" for r in regime]

    # CNAEs secundarios: já vem formatado
    cnaes = result.get('cnaes_secundarios', []) or []
    if cnaes and isinstance(cnaes[0], dict):
        cnaes = [f"{c.get('descricao', '')} ({c.get('codigo', '')})" for c in cnaes]

    return {
        'cnpj': result.get('cnpj', ''),
        'razao_social': result.get('razao_social', ''),
        'nome_fantasia': result.get('nome_fantasia', ''),
        'situacao_cadastral': result.get('situacao_cadastral', ''),
        'natureza_juridica': result.get('natureza_juridica', ''),
        'porte': result.get('porte', ''),
        'capital_social': result.get('capital_social', 0),
        'atividade_principal': result.get('cnae_fiscal_descricao', ''),
        'cnae_fiscal': result.get('cnae_fiscal', ''),
        'responsavel': result.get('responsavel', ''),
        'socios': result.get('socios', ''),
        'qsa': result.get('qsa', []),
        'cep': result.get('cep', ''),
        'uf': result.get('uf', ''),
        'municipio': result.get('municipio', ''),
        'bairro': result.get('bairro', ''),
        'endereco_completo': result.get('endereco_completo', ''),
        'telefone_1': result.get('telefone_1', ''),
        'telefone_2': result.get('telefone_2', ''),
        'email': result.get('email', ''),
        'identificador_matriz_filial': result.get('identificador_matriz_filial', ''),
        'data_inicio_atividade': result.get('data_inicio_atividade', ''),
        'opcao_simples': result.get('opcao_simples'),
        'opcao_mei': result.get('opcao_mei'),
        'situacao_especial': result.get('situacao_especial', ''),
        'cnaes_secundarios': cnaes,
        'regime_tributario': regime,
        'motivo_situacao': result.get('motivo_situacao', ''),
        'entidade_federativa': result.get('entidade_federativa', ''),
        'codigo_municipio_ibge': result.get('codigo_municipio_ibge', ''),
        'fax': result.get('fax', ''),
        'data_opcao_simples': result.get('data_opcao_simples', ''),
        'data_situacao_cadastral': result.get('data_situacao_cadastral', ''),
        'data_opcao_mei': result.get('data_opcao_mei', ''),
        'ultima_atualizacao': result.get('ultima_atualizacao', ''),
    }


# =============================================================================
# Endpoints
# =============================================================================

@app.get("/api/cnpj/health")
async def health():
    """Health check."""
    try:
        with get_cursor() as cur:
            cur.execute("SELECT COUNT(*) as total FROM estabelecimento")
            row = cur.fetchone()
            return {
                "status": "ok",
                "estabelecimentos": row['total'] if row else 0,
            }
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.get("/api/cnpj/busca")
async def busca_por_nome(
    nome: str = Query(..., min_length=2, description="Nome ou razão social para buscar"),
    uf: str = Query('', description="Filtrar por UF (ex: SP, RJ)"),
    municipio: str = Query('', description="Filtrar por município"),
    limit: int = Query(10, ge=1, le=50, description="Limite de resultados"),
    threshold: float = Query(0.3, ge=0.1, le=0.9, description="Threshold de similaridade (0.1=mais resultados, 0.9=mais preciso)")
):
    """
    Busca fuzzy por nome usando trigram (pg_trgm).
    Busca em: razao_social, nome_fantasia, nome do sócio.
    Retorna os resultados ordenados por similaridade.
    """
    try:
        with get_cursor() as cur:
            # Set trigram threshold for GIN index selectivity
            cur.execute("SELECT set_limit(0.5)")

            uf_filter = "AND e.uf = %s" if uf else ""
            municipio_filter = "AND e.municipio ILIKE %s" if municipio else ""
            uf_filter_qsa = "AND e.uf = %s" if uf else ""

            # Query 1a: Search by nome_fantasia (uses small GIN index on estabelecimento)
            q1a = """
                SELECT
                    e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv AS cnpj,
                    emp.razao_social,
                    e.nome_fantasia,
                    e.uf,
                    e.municipio,
                    e.situacao_cadastral,
                    GREATEST(
                        similarity(emp.razao_social, %s),
                        similarity(e.nome_fantasia, %s)
                    ) AS score
                FROM estabelecimento e
                INNER JOIN empresa emp ON e.cnpj_basico = emp.cnpj
                WHERE e.nome_fantasia %% %s
                AND e.situacao_cadastral = '02'
                {uf_filter}
                {municipio_filter}
                ORDER BY score DESC
                LIMIT %s
            """
            q1a = q1a.format(uf_filter=uf_filter, municipio_filter=municipio_filter)
            q1a_params = [nome, nome, nome]
            if uf:
                q1a_params.append(uf.upper())
            if municipio:
                q1a_params.append(f"%{municipio}%")
            q1a_params.append(limit * 3)
            cur.execute(q1a, q1a_params)
            rows1a = cur.fetchall()

            # Query 1b: Search by razao_social (uses GIN index on empresa)
            q1b = """
                SELECT
                    e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv AS cnpj,
                    emp.razao_social,
                    e.nome_fantasia,
                    e.uf,
                    e.municipio,
                    e.situacao_cadastral,
                    GREATEST(
                        similarity(emp.razao_social, %s),
                        similarity(e.nome_fantasia, %s)
                    ) AS score
                FROM empresa emp
                INNER JOIN estabelecimento e ON emp.cnpj = e.cnpj_basico
                WHERE emp.razao_social %% %s
                AND e.situacao_cadastral = '02'
                AND e.cnpj_ordem = '0001'
                {uf_filter}
                {municipio_filter}
                ORDER BY score DESC
                LIMIT %s
            """
            q1b = q1b.format(uf_filter=uf_filter.replace('e.', 'e.'), municipio_filter=municipio_filter)
            q1b_params = [nome, nome, nome]
            if uf:
                q1b_params.append(uf.upper())
            if municipio:
                q1b_params.append(f"%{municipio}%")
            q1b_params.append(limit * 3)
            cur.execute(q1b, q1b_params)
            rows1b = cur.fetchall()

            # Query 2: QSA (uses GIN index on qsa.nome_socio)
            q2 = """
                SELECT
                    e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv AS cnpj,
                    emp.razao_social,
                    e.nome_fantasia,
                    e.uf,
                    e.municipio,
                    e.situacao_cadastral,
                    similarity(q.nome_socio, %s) * 0.8 AS score
                FROM qsa q
                INNER JOIN estabelecimento e ON q.cnpj_basico = e.cnpj_basico
                INNER JOIN empresa emp ON e.cnpj_basico = emp.cnpj
                WHERE q.nome_socio %% %s
                AND e.situacao_cadastral = '02'
                AND e.cnpj_ordem = '0001'
                {uf_filter_qsa}
                ORDER BY score DESC
                LIMIT %s
            """
            q2 = q2.format(uf_filter_qsa=uf_filter_qsa)
            q2_params = [nome, nome]
            if uf:
                q2_params.append(uf.upper())
            q2_params.append(limit * 3)
            cur.execute(q2, q2_params)
            rows2 = cur.fetchall()

            # Merge and deduplicate
            seen = {}
            for r in rows1a + rows1b + rows2:
                cnpj = r['cnpj']
                score = float(r['score'])
                if score >= threshold:
                    if cnpj not in seen or score > seen[cnpj]['score']:
                        seen[cnpj] = r
            rows = sorted(seen.values(), key=lambda x: float(x['score']), reverse=True)[:limit]

            results = []
            for r in rows:
                results.append({
                    'cnpj': r['cnpj'],
                    'cnpj_formatado': _format_cnpj(r['cnpj']),
                    'razao_social': r['razao_social'] or '',
                    'nome_fantasia': r['nome_fantasia'] or '',
                    'uf': r['uf'] or '',
                    'municipio': r['municipio'] or '',
                    'situacao_cadastral': _situacao_desc(r['situacao_cadastral']),
                    'score': round(float(r['score']), 3),
                })

            results.sort(key=lambda x: x['score'], reverse=True)

            return {
                'query': nome,
                'total': len(results),
                'threshold': threshold,
                'results': results,
            }

    except Exception as e:
        log.error(f"Erro na busca: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Erro na busca: {e}")


@app.get("/api/cnpj/busca-endereco")
async def busca_por_endereco(
    cep: str = Query('', description='CEP (8 dígitos, com ou sem hífen)'),
    logradouro: str = Query('', description='Nome da rua/avenida (mínimo 2 chars)'),
    bairro: str = Query('', description='Bairro'),
    municipio: str = Query('', description='Município'),
    uf: str = Query('', description='UF (2 letras, ex: SP, RJ)'),
    cnae: str = Query('', description='Código CNAE da atividade econômica'),
    porte: str = Query('', description='Porte da empresa (01=ME, 03=EPP, 05=Demais)'),
    situacao: str = Query('02', description='Situação cadastral (02=Ativa)'),
    limit: int = Query(20, ge=1, le=100, description='Limite de resultados')
):
    """
    Busca empresas por endereço.
    Permite buscar por CEP, rua, bairro, município e UF.
    Retorna empresas ativas com dados completos.
    """
    # Validar que pelo menos um filtro foi informado
    if not any([cep, logradouro, bairro, municipio, uf]):
        raise HTTPException(400, "Informe pelo menos um filtro: cep, logradouro, bairro, municipio ou uf")

    cep_clean = re.sub(r'\D', '', cep) if cep else ''
    if cep_clean and len(cep_clean) != 8:
        raise HTTPException(400, "CEP deve ter 8 dígitos")

    try:
        with get_cursor() as cur:
            # Build WHERE clauses dynamically
            wheres = []
            params = []

            if cep_clean:
                wheres.append("e.cep = %s")
                params.append(cep_clean)

            if logradouro and len(logradouro) >= 2:
                # Use trigram for fuzzy matching on street names
                cur.execute("SELECT set_limit(0.3)")
                wheres.append("e.logradouro %% %s")
                params.append(logradouro.strip())

            if bairro:
                wheres.append("e.bairro ILIKE %s")
                params.append(f"%{bairro.strip()}%")

            if municipio:
                wheres.append("e.municipio ILIKE %s")
                params.append(f"%{municipio.strip()}%")

            if uf:
                wheres.append("e.uf = %s")
                params.append(uf.upper().strip())

            if situacao:
                wheres.append("e.situacao_cadastral = %s")
                params.append(situacao)

            if cnae:
                wheres.append("e.cnae_fiscal = %s")
                params.append(cnae.strip())

            where_clause = " AND ".join(wheres) if wheres else "1=1"

            query = f"""
                SELECT
                    e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv AS cnpj,
                    e.nome_fantasia,
                    emp.razao_social,
                    e.tipo_logradouro,
                    e.logradouro,
                    e.numero,
                    e.complemento,
                    e.bairro,
                    e.cep,
                    e.uf,
                    e.municipio,
                    e.telefone_1,
                    e.telefone_2,
                    e.email,
                    e.cnae_fiscal,
                    e.cnae_fiscal_descricao,
                    e.situacao_cadastral,
                    emp.porte,
                    emp.capital_social,
                    emp.natureza_juridica,
                    emp.opcao_simples,
                    emp.opcao_mei,
                    e.identificador_matriz_filial,
                    e.data_inicio_atividade
                FROM estabelecimento e
                LEFT JOIN empresa emp ON e.cnpj_basico = emp.cnpj
                WHERE {where_clause}
                ORDER BY e.logradouro, e.numero
                LIMIT %s
            """
            params.append(limit)

            cur.execute(query, params)
            rows = cur.fetchall()

            results = []
            for row in rows:
                endereco = f"{row['tipo_logradouro'] or ''} {row['logradouro'] or ''}, {row['numero'] or 'S/N'}"
                if row['complemento']:
                    endereco += f" - {row['complemento']}"
                results.append({
                    'cnpj': row['cnpj'],
                    'razao_social': row['razao_social'] or '',
                    'nome_fantasia': row['nome_fantasia'] or '',
                    'endereco': endereco.strip(),
                    'bairro': row['bairro'] or '',
                    'cep': row['cep'] or '',
                    'uf': row['uf'] or '',
                    'municipio': row['municipio'] or '',
                    'telefone_1': row['telefone_1'] or '',
                    'telefone_2': row['telefone_2'] or '',
                    'email': row['email'] or '',
                    'cnae_fiscal': row['cnae_fiscal'] or '',
                    'cnae_fiscal_descricao': row['cnae_fiscal_descricao'] or '',
                    'situacao_cadastral': row['situacao_cadastral'] or '',
                    'porte': row['porte'] or '',
                    'capital_social': float(row['capital_social']) if row['capital_social'] else None,
                    'natureza_juridica': row['natureza_juridica'] or '',
                    'opcao_simples': row['opcao_simples'],
                    'opcao_mei': row['opcao_mei'],
                    'identificador_matriz_filial': row['identificador_matriz_filial'] or '',
                    'data_inicio_atividade': str(row['data_inicio_atividade']) if row['data_inicio_atividade'] else '',
                })

            return {
                'total': len(results),
                'filtros': {
                    'cep': cep_clean or None,
                    'logradouro': logradouro or None,
                    'bairro': bairro or None,
                    'municipio': municipio or None,
                    'uf': uf.upper() if uf else None,
                    'cnae': cnae or None,
                    'situacao': situacao,
                },
                'results': results
            }

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Erro na busca por endereço: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Erro na busca: {e}")


@app.get("/api/cnpj/busca-socio")
async def busca_por_socio(
    nome: str = Query(..., min_length=3, description='Nome do sócio (mínimo 3 chars)'),
    uf: str = Query('', description='Filtrar por UF'),
    municipio: str = Query('', description='Filtrar por município'),
    limit: int = Query(20, ge=1, le=100, description='Limite de resultados')
):
    """
    Busca empresas por nome de sócio no QSA (Quadro Societário).
    Útil para encontrar todas as empresas de uma pessoa.
    """
    try:
        with get_cursor() as cur:
            cur.execute("SELECT set_limit(0.3)")

            wheres = ["q.nome_socio %% %s", "e.situacao_cadastral = '02'", "e.cnpj_ordem = '0001'"]
            params: list = [nome.strip()]

            if uf:
                wheres.append("e.uf = %s")
                params.append(uf.upper())
            if municipio:
                wheres.append("e.municipio ILIKE %s")
                params.append(f"%{municipio}%")

            where_clause = " AND ".join(wheres)
            params.append(limit)

            cur.execute(f"""
                SELECT DISTINCT
                    e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv AS cnpj,
                    emp.razao_social,
                    e.nome_fantasia,
                    e.uf,
                    e.municipio,
                    e.bairro,
                    e.logradouro,
                    e.cep,
                    e.telefone_1,
                    e.cnae_fiscal_descricao,
                    emp.porte,
                    emp.capital_social,
                    q.nome_socio,
                    q.codigo_qualificacao,
                    similarity(q.nome_socio, %s) AS score
                FROM qsa q
                INNER JOIN estabelecimento e ON q.cnpj_basico = e.cnpj_basico
                INNER JOIN empresa emp ON e.cnpj_basico = emp.cnpj
                WHERE {where_clause}
                ORDER BY score DESC
                LIMIT %s
            """, [nome.strip()] + params)

            rows = cur.fetchall()
            results = []
            for row in rows:
                results.append({
                    'cnpj': row['cnpj'],
                    'razao_social': row['razao_social'] or '',
                    'nome_fantasia': row['nome_fantasia'] or '',
                    'uf': row['uf'] or '',
                    'municipio': row['municipio'] or '',
                    'bairro': row['bairro'] or '',
                    'logradouro': row['logradouro'] or '',
                    'cep': row['cep'] or '',
                    'telefone': row['telefone_1'] or '',
                    'atividade': row['cnae_fiscal_descricao'] or '',
                    'porte': row['porte'] or '',
                    'capital_social': float(row['capital_social']) if row['capital_social'] else None,
                    'socio_encontrado': row['nome_socio'] or '',
                    'qualificacao_socio': row['codigo_qualificacao'] or '',
                    'similaridade': round(float(row['score']), 2),
                })

            return {
                'total': len(results),
                'socio_busca': nome,
                'results': results
            }

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Erro na busca por sócio: {e}")
        raise HTTPException(500, f"Erro na busca: {e}")


@app.get("/api/cnpj/busca-avancada")
async def busca_avancada(
    # Filtros de localização
    uf: str = Query('', description='UF'),
    municipio: str = Query('', description='Município'),
    bairro: str = Query('', description='Bairro'),
    cep: str = Query('', description='CEP'),
    # Filtros de negócio
    cnae_categoria: str = Query('', description='Categoria CNAE (ex: saude, comercio, servicos, industria, alimentacao)'),
    cnae: str = Query('', description='Código CNAE específico'),
    # Filtros inteligentes
    porte: str = Query('', description='Porte (01=ME, 03=EPP, 05=Demais)'),
    capital_min: float = Query(0, description='Capital social mínimo'),
    capital_max: float = Query(0, description='Capital social máximo (0 = sem limite)'),
    idade_min: int = Query(0, description='Idade mínima da empresa em anos'),
    idade_max: int = Query(0, description='Idade máxima da empresa em anos (0 = sem limite)'),
    apenas_matriz: bool = Query(False, description='Apenas empresas matriz (sede)'),
    apenas_filial: bool = Query(False, description='Apenas filiais'),
    tem_simples: bool = Query(False, description='Optante do Simples Nacional'),
    tem_mei: bool = Query(False, description='Optante do MEI'),
    tem_telefone: bool = Query(False, description='Apenas empresas com telefone'),
    tem_email: bool = Query(False, description='Apenas empresas com email'),
    # Scoring
    prospect_score_min: int = Query(0, description='Score mínimo de prospect (0-100)'),
    # Controle
    situacao: str = Query('02', description='Situação cadastral'),
    order_by: str = Query('score', description='Ordenar por: score, capital, cidade, cnae'),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Busca avançada com filtros inteligentes.
    Combina localização, negócio e scoring para encontrar prospects ideais.
    """
    # Pelo menos um filtro obrigatório
    if not any([uf, municipio, bairro, cep, cnae_categoria, cnae]):
        raise HTTPException(400, "Informe pelo menos um filtro: uf, municipio, bairro, cep, cnae_categoria ou cnae")

    cep_clean = re.sub(r'\D', '', cep) if cep else ''

    # Mapeamento de categorias CNAE para ranges de código
    CNAE_CATEGORIAS = {
        'saude': ['86', '861', '862', '863', '864', '865', '866', '869', '87', '871', '872', '873'],
        'odontologia': ['8630', '86305'],
        'farmacia': ['4771', '47717', '4772', '47725'],
        'clinica': ['8630', '8640', '8650', '8610', '8621', '8622'],
        'hospital': ['8610', '86101', '86102', '8621', '8622'],
        'laboratorio': ['8640', '86402'],
        'comercio': ['47', '45', '451', '452', '453', '454', '46', '471', '472', '473', '474', '475', '476', '477', '478'],
        'restaurante': ['5611', '56112', '5612', '56121'],
        'alimentacao': ['56', '561', '562', '5611', '5612', '5620'],
        'advocacia': ['6911', '69117'],
        'contabilidade': ['6920', '69206'],
        'consultoria': ['7020', '70204'],
        'imobiliaria': ['6810', '68102', '6821', '68218', '6822', '68226'],
        'construcao': ['41', '412', '4120', '42', '421', '422', '429', '43', '431', '432', '433', '439'],
        'educacao': ['85', '851', '852', '853', '854', '855', '859'],
        'escola': ['8520', '85201'],
        'academia': ['9313', '93131', '9319', '93198'],
        'petshop': ['9609', '96092'],
        'salao': ['9602', '96022'],
        'tecnologia': ['62', '6201', '6202', '6203', '6204', '6311', '6312', '6313', '6314', '6319'],
        'ti': ['62', '6201', '6202', '6203', '6204'],
        'software': ['6201', '62015', '6202', '62023'],
        'marketing': ['7311', '7312', '7319', '1813', '18130'],
        'transporte': ['49', '491', '492', '493', '494', '495'],
        'logistica': ['5250', '52508', '4929', '49299'],
        'industria': ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33'],
        'automotivo': ['4511', '4512', '4520', '4530', '4541', '4542', '4930', '49302'],
        'seguros': ['6511', '65111', '6512', '65128', '6621', '66215', '6622', '66223'],
        'corretora': ['6621', '66215', '6622', '66223'],
        'financeiro': ['64', '642', '643', '644', '645', '646', '649', '65', '651', '652', '66'],
        'hotel': ['5510', '55108', '5590', '55906'],
        'turismo': ['7911', '79112', '7912', '79121'],
        'eventos': ['8230', '82300', '9001', '90019'],
        'beleza': ['9602', '96022', '9609', '96092'],
    }

    try:
        with get_cursor() as cur:
            cur.execute("SELECT set_limit(0.3)")

            wheres = ["e.situacao_cadastral = %s", "e.cnpj_ordem = '0001'"]
            params: list = [situacao]

            # Localização
            if cep_clean:
                wheres.append("e.cep = %s")
                params.append(cep_clean)
            if uf:
                wheres.append("e.uf = %s")
                params.append(uf.upper())
            if municipio:
                wheres.append("e.municipio ILIKE %s")
                params.append(f"%{municipio}%")
            if bairro:
                wheres.append("e.bairro ILIKE %s")
                params.append(f"%{bairro}%")

            # CNAE
            if cnae:
                wheres.append("e.cnae_fiscal = %s")
                params.append(cnae)
            elif cnae_categoria:
                cat = cnae_categoria.lower().strip()
                if cat in CNAE_CATEGORIAS:
                    codes = CNAE_CATEGORIAS[cat]
                    placeholders = ','.join(['%s'] * len(codes))
                    wheres.append(f"e.cnae_fiscal IN ({placeholders})")
                    params.extend(codes)
                else:
                    wheres.append("e.cnae_fiscal ILIKE %s")
                    params.append(f"{cnae_categoria}%")

            # Porte
            if porte:
                wheres.append("emp.porte = %s")
                params.append(porte)

            # Capital social
            if capital_min > 0:
                wheres.append("emp.capital_social >= %s")
                params.append(capital_min)
            if capital_max > 0:
                wheres.append("emp.capital_social <= %s")
                params.append(capital_max)

            # Idade da empresa
            if idade_min > 0:
                wheres.append("e.data_inicio_atividade <= CURRENT_DATE - INTERVAL '%s years'")
                params.append(idade_min)
            if idade_max > 0:
                wheres.append("e.data_inicio_atividade >= CURRENT_DATE - INTERVAL '%s years'")
                params.append(idade_max)

            # Matriz/Filial
            if apenas_matriz:
                wheres.append("e.identificador_matriz_filial = '1'")
            elif apenas_filial:
                wheres.append("e.identificador_matriz_filial = '2'")

            # Simples/MEI
            if tem_simples:
                wheres.append("emp.opcao_simples = true")
            if tem_mei:
                wheres.append("emp.opcao_mei = true")

            # Contato
            if tem_telefone:
                wheres.append("(e.telefone_1 IS NOT NULL AND e.telefone_1 != '')")
            if tem_email:
                wheres.append("(e.email IS NOT NULL AND e.email != '')")

            where_clause = " AND ".join(wheres)

            # Prospect Score calculation:
            # - Porte: ME/EPP = +20, Demais = +10
            # - Capital > 100K = +15, > 500K = +25
            # - Idade > 5 anos = +15, > 10 anos = +20
            # - Tem telefone = +10
            # - Tem email = +5
            # - Matriz = +10, Filial = +5
            # - CNAE saude/seguros/corretora = +15
            score_expr = """
                (
                    CASE WHEN emp.porte IN ('01', '03') THEN 20 ELSE 10 END
                    + CASE WHEN emp.capital_social > 500000 THEN 25 WHEN emp.capital_social > 100000 THEN 15 ELSE 0 END
                    + CASE WHEN e.data_inicio_atividade <= CURRENT_DATE - INTERVAL '10 years' THEN 20 WHEN e.data_inicio_atividade <= CURRENT_DATE - INTERVAL '5 years' THEN 15 ELSE 5 END
                    + CASE WHEN e.telefone_1 IS NOT NULL AND e.telefone_1 != '' THEN 10 ELSE 0 END
                    + CASE WHEN e.email IS NOT NULL AND e.email != '' THEN 5 ELSE 0 END
                    + CASE WHEN e.identificador_matriz_filial = '1' THEN 10 WHEN e.identificador_matriz_filial = '2' THEN 5 ELSE 0 END
                    + CASE WHEN e.cnae_fiscal LIKE '86%%' OR e.cnae_fiscal LIKE '6511%%' OR e.cnae_fiscal LIKE '6621%%' THEN 15 ELSE 0 END
                )
            """

            # Order by
            order_map = {
                'score': f"prospect_score DESC",
                'capital': f"emp.capital_social DESC NULLS LAST",
                'cidade': f"e.municipio ASC",
                'cnae': f"e.cnae_fiscal ASC",
            }
            order_clause = order_map.get(order_by, 'prospect_score DESC')

            query = f"""
                SELECT
                    e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv AS cnpj,
                    emp.razao_social,
                    e.nome_fantasia,
                    e.tipo_logradouro, e.logradouro, e.numero, e.complemento,
                    e.bairro, e.cep, e.uf, e.municipio,
                    e.telefone_1, e.telefone_2, e.email,
                    e.cnae_fiscal, e.cnae_fiscal_descricao,
                    e.situacao_cadastral,
                    emp.porte, emp.capital_social, emp.natureza_juridica,
                    emp.opcao_simples, emp.opcao_mei,
                    e.identificador_matriz_filial,
                    e.data_inicio_atividade,
                    {score_expr} AS prospect_score
                FROM estabelecimento e
                LEFT JOIN empresa emp ON e.cnpj_basico = emp.cnpj
                WHERE {where_clause}
                {f"AND {score_expr} >= %s" if prospect_score_min > 0 else ""}
                ORDER BY {order_clause}
                LIMIT %s
            """

            if prospect_score_min > 0:
                params.append(prospect_score_min)
            params.append(limit)

            cur.execute(query, params)
            rows = cur.fetchall()

            results = []
            for row in rows:
                idade_anos = 0
                if row['data_inicio_atividade']:
                    from datetime import date
                    delta = date.today() - row['data_inicio_atividade']
                    idade_anos = delta.days // 365

                results.append({
                    'cnpj': row['cnpj'],
                    'razao_social': row['razao_social'] or '',
                    'nome_fantasia': row['nome_fantasia'] or '',
                    'endereco': f"{row['tipo_logradouro'] or ''} {row['logradouro'] or ''}, {row['numero'] or 'S/N'}".strip(),
                    'bairro': row['bairro'] or '',
                    'cep': row['cep'] or '',
                    'uf': row['uf'] or '',
                    'municipio': row['municipio'] or '',
                    'telefone': row['telefone_1'] or '',
                    'email': row['email'] or '',
                    'cnae_fiscal': row['cnae_fiscal'] or '',
                    'atividade': row['cnae_fiscal_descricao'] or '',
                    'situacao': row['situacao_cadastral'] or '',
                    'porte': row['porte'] or '',
                    'capital_social': float(row['capital_social']) if row['capital_social'] else None,
                    'natureza_juridica': row['natureza_juridica'] or '',
                    'simples': row['opcao_simples'],
                    'mei': row['opcao_mei'],
                    'tipo': 'Matriz' if row['identificador_matriz_filial'] == '1' else 'Filial' if row['identificador_matriz_filial'] == '2' else '',
                    'data_inicio': str(row['data_inicio_atividade']) if row['data_inicio_atividade'] else '',
                    'idade_anos': idade_anos,
                    'prospect_score': int(row['prospect_score']),
                })

            return {
                'total': len(results),
                'filtros': {
                    'uf': uf or None, 'municipio': municipio or None, 'bairro': bairro or None,
                    'cnae_categoria': cnae_categoria or None, 'cnae': cnae or None,
                    'porte': porte or None, 'capital_range': f"{capital_min}-{capital_max}" if capital_min or capital_max else None,
                    'idade_range': f"{idade_min}-{idade_max}" if idade_min or idade_max else None,
                    'apenas_matriz': apenas_matriz or None, 'tem_telefone': tem_telefone or None,
                    'prospect_score_min': prospect_score_min or None,
                },
                'results': results
            }

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Erro na busca avançada: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Erro na busca: {e}")


@app.get("/api/cnpj/cnae/categorias")
async def listar_categorias_cnae():
    """Lista as categorias CNAE disponíveis para busca avançada."""
    CNAE_CATEGORIAS = {
        'saude': {'label': 'Saúde', 'descricao': 'Hospitais, clínicas, laboratórios, farmácias', 'count': 13},
        'odontologia': {'label': 'Odontologia', 'descricao': 'Dentistas e clínicas odontológicas', 'count': 2},
        'farmacia': {'label': 'Farmácia', 'descricao': 'Farmácias e drogarias', 'count': 4},
        'clinica': {'label': 'Clínica', 'descricao': 'Clínicas médicas e especializadas', 'count': 6},
        'hospital': {'label': 'Hospital', 'descricao': 'Hospitais e pronto-socorros', 'count': 5},
        'laboratorio': {'label': 'Laboratório', 'descricao': 'Laboratórios de análises', 'count': 2},
        'comercio': {'label': 'Comércio', 'descricao': 'Comércio varejista e atacadista', 'count': 18},
        'restaurante': {'label': 'Restaurante', 'descricao': 'Restaurantes, bares e lanchonetes', 'count': 4},
        'alimentacao': {'label': 'Alimentação', 'descricao': 'Setor alimentício completo', 'count': 7},
        'advocacia': {'label': 'Advocacia', 'descricao': 'Escritórios de advocacia', 'count': 2},
        'contabilidade': {'label': 'Contabilidade', 'descricao': 'Contadores e escritórios contábeis', 'count': 2},
        'consultoria': {'label': 'Consultoria', 'descricao': 'Consultoria empresarial', 'count': 2},
        'imobiliaria': {'label': 'Imobiliária', 'descricao': 'Imobiliárias e gestão de imóveis', 'count': 5},
        'construcao': {'label': 'Construção', 'descricao': 'Construção civil', 'count': 13},
        'educacao': {'label': 'Educação', 'descricao': 'Escolas, faculdades, cursos', 'count': 7},
        'escola': {'label': 'Escola', 'descricao': 'Escolas de ensino fundamental e médio', 'count': 2},
        'academia': {'label': 'Academia', 'descricao': 'Academias e atividades físicas', 'count': 4},
        'petshop': {'label': 'Pet Shop', 'descricao': 'Pet shops e cuidados animais', 'count': 2},
        'salao': {'label': 'Salão', 'descricao': 'Salões de beleza e barbearias', 'count': 2},
        'tecnologia': {'label': 'Tecnologia', 'descricao': 'TI, software, dados', 'count': 14},
        'ti': {'label': 'TI', 'descricao': 'Tecnologia da informação', 'count': 5},
        'software': {'label': 'Software', 'descricao': 'Desenvolvimento de software', 'count': 4},
        'marketing': {'label': 'Marketing', 'descricao': 'Agências de marketing e publicidade', 'count': 4},
        'transporte': {'label': 'Transporte', 'descricao': 'Transporte de passageiros e carga', 'count': 5},
        'logistica': {'label': 'Logística', 'descricao': 'Logística e armazenagem', 'count': 3},
        'industria': {'label': 'Indústria', 'descricao': 'Indústria de transformação', 'count': 24},
        'automotivo': {'label': 'Automotivo', 'descricao': 'Concessionárias, oficinas, peças', 'count': 7},
        'seguros': {'label': 'Seguros', 'descricao': 'Seguros, corretoras, previdência', 'count': 6},
        'corretora': {'label': 'Corretora', 'descricao': 'Corretoras de seguros e títulos', 'count': 4},
        'financeiro': {'label': 'Financeiro', 'descricao': 'Bancos, financeiras, investimentos', 'count': 13},
        'hotel': {'label': 'Hotel', 'descricao': 'Hotéis e hospedagens', 'count': 3},
        'turismo': {'label': 'Turismo', 'descricao': 'Agências de turismo', 'count': 3},
        'eventos': {'label': 'Eventos', 'descricao': 'Eventos e entretenimento', 'count': 3},
        'beleza': {'label': 'Beleza', 'descricao': 'Cosméticos e tratamentos estéticos', 'count': 4},
    }
    return {'categorias': CNAE_CATEGORIAS}


@app.get("/api/cnpj/{cnpj}")
async def lookup_cnpj(cnpj: str):
    """Busca exata por CNPJ."""
    cnpj_clean = re.sub(r'\D', '', cnpj)
    if len(cnpj_clean) != 14:
        raise HTTPException(400, "CNPJ deve ter 14 dígitos")

    try:
        with get_cursor() as cur:
            cur.execute("""
                SELECT
                    e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv AS cnpj,
                    e.nome_fantasia, e.situacao_cadastral, e.data_situacao_cadastral,
                    e.data_inicio_atividade, e.cnae_fiscal, e.cnae_fiscal_descricao,
                    e.tipo_logradouro, e.logradouro, e.numero, e.complemento,
                    e.bairro, e.cep, e.uf, e.codigo_municipio, e.municipio,
                    e.telefone_1, e.telefone_2, e.email, e.identificador_matriz_filial,
                    emp.razao_social, emp.natureza_juridica, emp.capital_social,
                    emp.porte, emp.opcao_simples, emp.opcao_mei,
                    emp.situacao_especial,
                    nj.descricao AS natureza_juridica_desc
                FROM estabelecimento e
                LEFT JOIN empresa emp ON e.cnpj_basico = emp.cnpj
                LEFT JOIN natjur nj ON emp.natureza_juridica = nj.codigo
                WHERE e.cnpj_basico = %s AND e.cnpj_ordem = %s AND e.cnpj_dv = %s
            """, (cnpj_clean[:8], cnpj_clean[8:12], cnpj_clean[12:14]))

            row = cur.fetchone()
            if row:
                data = _row_to_cnpj(row)
                qsa = _fetch_qsa(cnpj_clean[:8])
                return _build_full_response(data, qsa)

        # Fallback: buscar em APIs externas
        log.info(f"  CNPJ {cnpj_clean} não local no DB, tentando APIs externas...")
        external = _fetch_external(cnpj_clean)
        if external:
            return external

        raise HTTPException(404, "CNPJ não encontrado")

    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Erro na consulta: {e}")
        raise HTTPException(500, f"Erro interno: {e}")


@app.post("/api/cnpj/enrich")
async def enrich_lead(req: EnrichRequest):
    """
    Endpoint de enrichment compatível com o backend existente.
    Busca por nome, cidade e telefone. Retorna no formato esperado pelo scraper_engine.
    """
    name = req.name.strip()
    city = req.city.strip()
    phone = re.sub(r'\D', '', req.phone) if req.phone else ''

    if not name:
        return {'cnpj': '', 'razao_social': ''}

    SELECT_COLS = """
        e.cnpj_basico || e.cnpj_ordem || e.cnpj_dv AS cnpj,
        emp.razao_social, e.nome_fantasia,
        e.situacao_cadastral, e.data_inicio_atividade,
        e.cnae_fiscal, e.cnae_fiscal_descricao,
        e.logradouro, e.numero, e.complemento, e.bairro,
        e.cep, e.uf, e.municipio, e.codigo_municipio,
        e.telefone_1, e.telefone_2, e.email,
        e.identificador_matriz_filial,
        emp.natureza_juridica, emp.capital_social, emp.porte,
        emp.opcao_simples, emp.opcao_mei, emp.situacao_especial
    """
    JOIN_EMP = "FROM estabelecimento e INNER JOIN empresa emp ON e.cnpj_basico = emp.cnpj"

    try:
        with get_cursor() as cur:
            row = None

            # Strategy 1: Trigram on razao_social (mais autoritativo que nome_fantasia)
            cur.execute("SELECT set_limit(0.5)")
            cur.execute(f"""
                SELECT {SELECT_COLS},
                    similarity(emp.razao_social, %s) AS score
                FROM empresa emp
                INNER JOIN estabelecimento e ON emp.cnpj = e.cnpj_basico
                WHERE emp.razao_social %% %s
                AND e.situacao_cadastral = '02' AND e.cnpj_ordem = '0001'
                ORDER BY score DESC LIMIT 1
            """, (name, name))
            row = cur.fetchone()

            # Strategy 2: Trigram on nome_fantasia
            if not row:
                cur.execute(f"""
                    SELECT {SELECT_COLS},
                        similarity(e.nome_fantasia, %s) AS score
                    {JOIN_EMP}
                    WHERE e.nome_fantasia %% %s
                    AND e.situacao_cadastral = '02' AND e.cnpj_ordem = '0001'
                    ORDER BY score DESC LIMIT 1
                """, (name, name))
                row = cur.fetchone()

            # Strategy 3: Phone fallback
            if not row and phone and len(phone) >= 8:
                cur.execute(f"""
                    SELECT {SELECT_COLS}, 0.0 AS score
                    {JOIN_EMP}
                    WHERE (e.telefone_1 LIKE %s OR e.telefone_2 LIKE %s)
                    AND e.situacao_cadastral = '02'
                    LIMIT 1
                """, (f"%{phone}%", f"%{phone}%"))
                row = cur.fetchone()

            if row:
                data = _row_to_cnpj(row)
                qsa = _fetch_qsa(row['cnpj'][:8])
                result = _build_full_response(data, qsa)
                return _format_enrich_response(result)

        return {'cnpj': '', 'razao_social': '', 'responsavel': ''}

    except Exception as e:
        log.error(f"Erro no enrichment: {e}")
        import traceback
        traceback.print_exc()
        return {'cnpj': '', 'razao_social': '', 'responsavel': ''}


# =============================================================================
# Main
# =============================================================================

if __name__ == '__main__':
    import uvicorn
    port = int(os.environ.get('CNPJ_API_PORT', '8003'))
    log.info(f"Iniciando CNPJ API na porta {port}...")
    uvicorn.run(app, host='0.0.0.0', port=port)
