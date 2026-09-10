#!/usr/bin/env python3
"""
ETL para carregar dados oficiais da Receita Federal (CNPJ) no PostgreSQL.

Fonte: https://dados.gov.br/dados/conjuntos-dados/cadastro-nacional-da-pessoa-juridica---cnpj

Uso:
    python etl.py                    # Carrega tudo
    python etl.py --only empresa     # Carrega apenas empresa
    python etl.py --only estab       # Carrega apenas estabelecimentos
    python etl.py --only aux         # Carrega apenas tabelas auxiliares
    python etl.py --download-only    # Apenas baixa os arquivos
    python etl.py --skip-download    # Carrega de arquivos já baixados
"""

import os
import sys
import zipfile
import csv
import io
import argparse
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime

import requests
import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
log = logging.getLogger('etl')

# =============================================================================
# Configuração
# =============================================================================

# URLs oficiais da Receita Federal
# Novo: SERPRO+ (Nextcloud) - dados de Setembro/2025
SERPRO_SHARE_ID = "gn672Ad4CF8N6TK"
SERPRO_BASE = f"https://arquivos.receitafederal.gov.br/public.php/dav/files/{SERPRO_SHARE_ID}/Dados/Cadastros/CNPJ"
SERPRO_MONTH = "2026-08"  # Pasta mais recente

# URL base para download (WebDAV)
BASE_URL = f"{SERPRO_BASE}/{SERPRO_MONTH}"

# Arquivos para download
DOWNLOADS = {
    # Auxiliares (pequenos, baixar primeiro)
    'cnae': {'url': f'{BASE_URL}/Cnaes.zip', 'files': ['Cnaes']},
    'motivo': {'url': f'{BASE_URL}/Motivos.zip', 'files': ['Motivos']},
    'natjur': {'url': f'{BASE_URL}/Naturezas.zip', 'files': ['Naturezas']},
    'pais': {'url': f'{BASE_URL}/Paises.zip', 'files': ['Paises']},
    'qualific': {'url': f'{BASE_URL}/Qualificacoes.zip', 'files': ['Qualificacoes']},
    'municipio': {'url': f'{BASE_URL}/Municipios.zip', 'files': ['Municipios']},
    # Principais (grandes)
    'empresa': {'url': f'{BASE_URL}/Empresas{{i}}.zip', 'files': ['Empresas{i}'], 'count': 10},
    'estab': {'url': f'{BASE_URL}/Estabelecimentos{{i}}.zip', 'files': ['Estabelecimentos{i}'], 'count': 10},
    'qsa': {'url': f'{BASE_URL}/Socios{{i}}.zip', 'files': ['Socios{i}'], 'count': 10},
    # Simples/MEI
    'simples': {'url': f'{BASE_URL}/Simples.zip', 'files': ['Simples']},
}

DATA_DIR = Path(__file__).parent / 'data'

# Mapeamento de colunas do CSV da Receita Federal
# EMPRESAS: CNPJ BÁSICO, RAZÃO SOCIAL, NATUREZA JURÍDICA, QUALIFICAÇÃO DO RESPONSÁVEL,
#           CAPITAL SOCIAL, ENTE FEDERATIVO RESPONSÁVEL, PORTE, OPÇÃO PELO SIMPLES,
#           DATA DE OPÇÃO PELO SIMPLES, DATA DE EXCLUSÃO DO SIMPLES, OPÇÃO PELO MEI,
#           DATA DE OPÇÃO PELO MEI, DATA DE EXCLUSÃO DO MEI, SITUAÇÃO ESPECIAL, DATA DA SITUAÇÃO ESPECIAL
EMPRESA_COLS = [
    'cnpj', 'razao_social', 'natureza_juridica', 'qualificacao_responsavel',
    'capital_social', 'ente_federativo_responsavel', 'porte', 'opcao_simples',
    'data_opcao_simples', 'data_exclusao_simples', 'opcao_mei',
    'data_opcao_mei', 'data_exclusao_mei', 'situacao_especial', 'data_situacao_especial'
]

# ESTABELECIMENTOS: ~30 colunas
ESTAB_COLS = [
    'cnpj_basico', 'cnpj_ordem', 'cnpj_dv', 'identificador_matriz_filial',
    'nome_fantasia', 'situacao_cadastral', 'data_situacao_cadastral',
    'motivo_situacao_cadastral', 'nome_cidade_exterior', 'codigo_pais',
    'data_inicio_atividade', 'cnae_fiscal', 'cnae_fiscal_descricao',
    'tipo_logradouro', 'logradouro', 'numero', 'complemento', 'bairro',
    'cep', 'uf', 'codigo_municipio', 'ddd_1', 'telefone_1',
    'ddd_2', 'telefone_2', 'ddd_fax', 'fax', 'email',
    'situacao_especial', 'data_situacao_especial'
]

# SÓCIOS
QSA_COLS = [
    'cnpj_basico', 'identificador_socio', 'nome_socio', 'cnpj_cpf_socio',
    'codigo_qualificacao', 'data_entrada', 'codigo_pais',
    'representante_legal', 'nome_representante',
    'codigo_qualificacao_representante', 'faixa_etaria'
]

# Auxiliares (todas: codigo, descricao)
AUX_COLS = ['codigo', 'descricao']

# Encoding dos CSVs da Receita
CSV_ENCODING = 'latin-1'
CSV_DELIMITER = ';'


# =============================================================================
# Download
# =============================================================================

def download_file(url: str, dest: Path, chunk_size: int = 8192) -> bool:
    """Baixa um arquivo com progresso."""
    if dest.exists():
        log.info(f"  Já existe: {dest.name}")
        return True
    try:
        log.info(f"  Baixando: {url}")
        headers = {"User-Agent": "MabrumiCRM/1.0 (CNPJ ETL)"}
        resp = requests.get(url, stream=True, timeout=30, headers=headers)
        resp.raise_for_status()
        total = int(resp.headers.get('content-length', 0))
        downloaded = 0
        with open(dest, 'wb') as f:
            for chunk in resp.iter_content(chunk_size=chunk_size):
                f.write(chunk)
                downloaded += len(chunk)
                if total > 0 and downloaded % (chunk_size * 100) == 0:
                    pct = downloaded * 100 // total
                    log.info(f"    {pct}% ({downloaded // (1024*1024)}MB/{total // (1024*1024)}MB)")
        log.info(f"  Concluído: {dest.name} ({dest.stat().st_size // (1024*1024)}MB)")
        return True
    except Exception as e:
        log.error(f"  Erro ao baixar {url}: {e}")
        if dest.exists():
            dest.unlink()
        return False


def download_all(skip_existing: bool = True) -> bool:
    """Baixa todos os arquivos necessários."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    success = True

    # Auxiliares (simples)
    for key in ['cnae', 'motivo', 'natjur', 'pais', 'qualific', 'municipio']:
        info = DOWNLOADS[key]
        dest = DATA_DIR / f"{key}.zip"
        if not download_file(info['url'], dest):
            success = False

    # Arquivos particionados (empresa, estab, qsa)
    for key in ['empresa', 'estab', 'qsa']:
        info = DOWNLOADS[key]
        for i in range(info['count']):
            url = info['url'].format(i=i)
            dest = DATA_DIR / f"{key}{i}.zip"
            if not download_file(url, dest):
                success = False

    return success


# =============================================================================
# Extração de ZIP
# =============================================================================

def _find_csv_in_zip(z: zipfile.ZipFile, zip_name: str) -> Optional[str]:
    """Encontra o arquivo de dados dentro de um ZIP."""
    csv_names = [n for n in z.namelist() if n.lower().endswith('.csv') or n.lower().endswith('.txt')]
    if not csv_names:
        rf_patterns = ['EMPRECSV', 'ESTABELE', 'CNAECSV', 'MOTICSV', 'NATJUCSV',
                       'PAISCSV', 'QUALSCSV', 'MUNICCSV', 'SOCIOCSV', 'SIMPLES']
        for name in z.namelist():
            for pat in rf_patterns:
                if pat in name.upper():
                    csv_names.append(name)
                    break
    if not csv_names:
        csv_names = [n for n in z.namelist() if not n.endswith('/') and '.' not in n.split('/')[-1][:10]]
    if not csv_names:
        log.warning(f"  Nenhum CSV encontrado em {zip_name} (arquivos: {z.namelist()[:3]})")
        return None
    return csv_names[0]


def extract_csv_from_zip(zip_path: Path) -> Optional[str]:
    """Extrai o primeiro CSV de um ZIP e retorna o conteúdo como string. Para arquivos pequenos."""
    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            csv_name = _find_csv_in_zip(z, zip_path.name)
            if not csv_name:
                return None
            log.info(f"    Arquivo dentro do ZIP: {csv_name}")
            with z.open(csv_name) as f:
                return f.read().decode(CSV_ENCODING, errors='replace')
    except Exception as e:
        log.error(f"  Erro ao extrair {zip_path.name}: {e}")
        return None


def stream_csv_from_zip(zip_path: Path) -> Optional[csv.reader]:
    """Abre um CSV de um ZIP como streaming (linha por linha). Retorna csv.reader."""
    try:
        z = zipfile.ZipFile(zip_path, 'r')
        csv_name = _find_csv_in_zip(z, zip_path.name)
        if not csv_name:
            z.close()
            return None
        log.info(f"    Arquivo dentro do ZIP: {csv_name}")
        raw = z.open(csv_name)
        text = io.TextIOWrapper(raw, encoding=CSV_ENCODING, errors='replace')
        return csv.reader(text, delimiter=CSV_DELIMITER)
    except Exception as e:
        log.error(f"  Erro ao abrir {zip_path.name}: {e}")
        return None


# =============================================================================
# Parse e limpeza de dados
# =============================================================================

def parse_date(val: str) -> Optional[str]:
    """Converte AAAAMMDD para YYYY-MM-DD."""
    val = val.strip()
    if not val or val == '0' or len(val) != 8:
        return None
    try:
        return f"{val[:4]}-{val[4:6]}-{val[6:8]}"
    except:
        return None


def parse_bool(val: str) -> Optional[bool]:
    """Converte S/N para bool."""
    val = val.strip().upper()
    if val == 'S':
        return True
    if val == 'N':
        return False
    return None


def parse_decimal(val: str) -> Optional[float]:
    """Converte string numérica (vírgula decimal) para float."""
    val = val.strip()
    if not val or val == '0':
        return 0.0
    try:
        return float(val.replace(',', '.'))
    except:
        return None


def clean_str(val: str) -> str:
    """Limpa string, removendo espaços extras."""
    return val.strip() if val else ''


def parse_row(row: list, col_count: int) -> list:
    """Garante que a row tenha o número correto de colunas."""
    if len(row) < col_count:
        return row + [''] * (col_count - len(row))
    return row[:col_count]


# =============================================================================
# Carregamento no PostgreSQL
# =============================================================================

def get_connection():
    """Conecta ao PostgreSQL usando variáveis de ambiente."""
    return psycopg2.connect(
        host=os.environ.get('CNPJ_DB_HOST', 'localhost'),
        port=os.environ.get('CNPJ_DB_PORT', '5432'),
        dbname=os.environ.get('CNPJ_DB_NAME', 'cnpj'),
        user=os.environ.get('CNPJ_DB_USER', 'cnpj'),
        password=os.environ.get('CNPJ_DB_PASSWORD', 'cnpj'),
    )


def load_auxiliar(conn, key: str, table: str):
    """Carrega tabela auxiliar (CNAE, Motivo, etc.)."""
    zip_path = DATA_DIR / f"{key}.zip"
    if not zip_path.exists():
        log.warning(f"  Arquivo não encontrado: {zip_path.name}")
        return

    log.info(f"  Carregando {table}...")
    content = extract_csv_from_zip(zip_path)
    if not content:
        return

    reader = csv.reader(io.StringIO(content), delimiter=CSV_DELIMITER)
    rows = []
    for row in reader:
        row = parse_row(row, 2)
        rows.append((clean_str(row[0]), clean_str(row[1])))

    if not rows:
        return

    cur = conn.cursor()
    cur.execute(f"TRUNCATE TABLE {table} CASCADE")
    query = f"INSERT INTO {table} (codigo, descricao) VALUES %s ON CONFLICT (codigo) DO NOTHING"
    execute_values(cur, query, rows, page_size=1000)
    conn.commit()
    log.info(f"  {table}: {len(rows)} registros carregados")


def load_municipio(conn):
    """Carrega tabela de municípios."""
    zip_path = DATA_DIR / 'municipio.zip'
    if not zip_path.exists():
        log.warning(f"  Arquivo não encontrado: municipio.zip")
        return

    log.info(f"  Carregando municipio...")
    content = extract_csv_from_zip(zip_path)
    if not content:
        return

    reader = csv.reader(io.StringIO(content), delimiter=CSV_DELIMITER)
    rows = []
    for row in reader:
        row = parse_row(row, 2)
        rows.append((clean_str(row[0]), clean_str(row[1])))

    if not rows:
        return

    cur = conn.cursor()
    cur.execute("TRUNCATE TABLE municipio CASCADE")
    query = "INSERT INTO municipio (codigo, descricao) VALUES %s ON CONFLICT (codigo) DO NOTHING"
    execute_values(cur, query, rows, page_size=1000)
    conn.commit()
    log.info(f"  municipio: {len(rows)} registros carregados")


def _flush_empresa_batch(cur, batch):
    """Insere um batch de empresas."""
    query = """
        INSERT INTO empresa (
            cnpj, razao_social, natureza_juridica, qualificacao_responsavel,
            capital_social, ente_federativo_responsavel, porte, opcao_simples,
            data_opcao_simples, data_exclusao_simples, opcao_mei,
            data_opcao_mei, data_exclusao_mei, situacao_especial, data_situacao_especial
        ) VALUES %s ON CONFLICT (cnpj) DO NOTHING
    """
    execute_values(cur, query, batch, page_size=5000)


def load_empresa(conn):
    """Carrega tabela empresa."""
    cur = conn.cursor()
    cur.execute("TRUNCATE TABLE empresa CASCADE")
    total = 0

    for i in range(10):
        zip_path = DATA_DIR / f'empresa{i}.zip'
        if not zip_path.exists():
            continue

        log.info(f"  Carregando empresa{i}.zip...")
        reader = stream_csv_from_zip(zip_path)
        if not reader:
            continue

        batch = []
        for row in reader:
            row = parse_row(row, len(EMPRESA_COLS))
            batch.append((
                clean_str(row[0]),   # cnpj
                clean_str(row[1]),   # razao_social
                clean_str(row[2]),   # natureza_juridica
                clean_str(row[3]),   # qualificacao_responsavel
                parse_decimal(row[4]),  # capital_social
                clean_str(row[5]),   # ente_federativo_responsavel
                clean_str(row[6]),   # porte
                parse_bool(row[7]),  # opcao_simples
                parse_date(row[8]),  # data_opcao_simples
                parse_date(row[9]),  # data_exclusao_simples
                parse_bool(row[10]), # opcao_mei
                parse_date(row[11]), # data_opcao_mei
                parse_date(row[12]), # data_exclusao_mei
                clean_str(row[13]),  # situacao_especial
                parse_date(row[14]), # data_situacao_especial
            ))

            if len(batch) >= 10000:
                _flush_empresa_batch(cur, batch)
                total += len(batch)
                conn.commit()
                log.info(f"    {total} registros...")
                batch = []

        if batch:
            _flush_empresa_batch(cur, batch)
            total += len(batch)

        conn.commit()
        log.info(f"    Total parcial: {total}")

    log.info(f"  empresa: {total} registros carregados")


def load_estabelecimento(conn):
    """Carrega tabela estabelecimento."""
    cur = conn.cursor()
    cur.execute("TRUNCATE TABLE estabelecimento CASCADE")
    total = 0

    for i in range(10):
        zip_path = DATA_DIR / f'estab{i}.zip'
        if not zip_path.exists():
            continue

        log.info(f"  Carregando estab{i}.zip...")
        reader = stream_csv_from_zip(zip_path)
        if not reader:
            continue
        batch = []
        for row in reader:
            row = parse_row(row, len(ESTAB_COLS))
            batch.append((
                clean_str(row[0]),   # cnpj_basico
                clean_str(row[1]),   # cnpj_ordem
                clean_str(row[2]),   # cnpj_dv
                clean_str(row[3]),   # identificador_matriz_filial
                clean_str(row[4]),   # nome_fantasia
                clean_str(row[5]),   # situacao_cadastral
                parse_date(row[6]),  # data_situacao_cadastral
                clean_str(row[7]),   # motivo_situacao_cadastral
                clean_str(row[8]),   # nome_cidade_exterior
                clean_str(row[9]),   # codigo_pais
                parse_date(row[10]), # data_inicio_atividade
                clean_str(row[11]),  # cnae_fiscal
                '',                  # cnae_fiscal_descricao (preenchido depois)
                clean_str(row[13]),  # tipo_logradouro
                clean_str(row[14]),  # logradouro
                clean_str(row[15]),  # numero
                clean_str(row[16]),  # complemento
                clean_str(row[17]),  # bairro
                clean_str(row[18]),  # cep
                clean_str(row[19]),  # uf
                clean_str(row[20]),  # codigo_municipio
                '',                  # municipio (preenchido via JOIN)
                clean_str(row[21]),  # ddd_1
                clean_str(row[22]),  # telefone_1
                clean_str(row[23]),  # ddd_2
                clean_str(row[24]),  # telefone_2
                clean_str(row[25]),  # ddd_fax
                clean_str(row[26]),  # fax
                clean_str(row[27]),  # email
                clean_str(row[28]),  # situacao_especial
                parse_date(row[29]), # data_situacao_especial
            ))

            if len(batch) >= 10000:
                _flush_estab_batch(cur, batch)
                total += len(batch)
                conn.commit()
                log.info(f"    {total} registros...")
                batch = []

        if batch:
            _flush_estab_batch(cur, batch)
            total += len(batch)

        conn.commit()
        log.info(f"    Total parcial: {total}")

    log.info(f"  estabelecimento: {total} registros carregados")


def _flush_estab_batch(cur, batch):
    """Insere um batch de estabelecimentos."""
    query = """
        INSERT INTO estabelecimento (
            cnpj_basico, cnpj_ordem, cnpj_dv, identificador_matriz_filial,
            nome_fantasia, situacao_cadastral, data_situacao_cadastral,
            motivo_situacao_cadastral, nome_cidade_exterior, codigo_pais,
            data_inicio_atividade, cnae_fiscal, cnae_fiscal_descricao,
            tipo_logradouro, logradouro, numero, complemento, bairro,
            cep, uf, codigo_municipio, municipio, ddd_1, telefone_1,
            ddd_2, telefone_2, ddd_fax, fax, email,
            situacao_especial, data_situacao_especial
        ) VALUES %s
        ON CONFLICT (cnpj_basico, cnpj_ordem, cnpj_dv) DO NOTHING
    """
    execute_values(cur, query, batch, page_size=5000)


def load_qsa(conn):
    """Carrega tabela QSA (sócios)."""
    cur = conn.cursor()
    cur.execute("TRUNCATE TABLE qsa CASCADE")
    total = 0

    for i in range(10):
        zip_path = DATA_DIR / f'qsa{i}.zip'
        if not zip_path.exists():
            continue

        log.info(f"  Carregando qsa{i}.zip...")
        reader = stream_csv_from_zip(zip_path)
        if not reader:
            continue
        batch = []
        for row in reader:
            row = parse_row(row, len(QSA_COLS))
            batch.append(tuple(clean_str(r) for r in row))

            if len(batch) >= 10000:
                _flush_qsa_batch(cur, batch)
                total += len(batch)
                conn.commit()
                log.info(f"    {total} registros...")
                batch = []

        if batch:
            _flush_qsa_batch(cur, batch)
            total += len(batch)

        conn.commit()
        log.info(f"    Total parcial: {total}")

    log.info(f"  qsa: {total} registros carregados")


def _flush_qsa_batch(cur, batch):
    """Insere um batch de QSA."""
    query = """
        INSERT INTO qsa (
            cnpj_basico, identificador_socio, nome_socio, cnpj_cpf_socio,
            codigo_qualificacao, data_entrada, codigo_pais,
            representante_legal, nome_representante,
            codigo_qualificacao_representante, faixa_etaria
        ) VALUES %s
    """
    execute_values(cur, query, batch, page_size=5000)


def post_load(conn):
    """Pós-processamento: preenche descrições e otimiza."""
    cur = conn.cursor()

    log.info("  Preenchendo cnae_fiscal_descricao...")
    cur.execute("""
        UPDATE estabelecimento e
        SET cnae_fiscal_descricao = c.descricao
        FROM cnae c
        WHERE e.cnae_fiscal = c.codigo
        AND e.cnae_fiscal_descricao = ''
    """)

    log.info("  Preenchendo municipio...")
    cur.execute("""
        UPDATE estabelecimento e
        SET municipio = m.descricao
        FROM municipio m
        WHERE e.codigo_municipio = m.codigo
        AND e.municipio = ''
    """)

    log.info("  Atualizando estatísticas...")
    cur.execute("ANALYZE empresa")
    cur.execute("ANALYZE estabelecimento")
    cur.execute("ANALYZE qsa")

    conn.commit()
    log.info("  Pós-processamento concluído")


# =============================================================================
# Main
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description='ETL CNPJ - Carrega dados da Receita Federal')
    parser.add_argument('--only', choices=['aux', 'empresa', 'estab', 'qsa'],
                       help='Carregar apenas um grupo específico')
    parser.add_argument('--download-only', action='store_true', help='Apenas baixar arquivos')
    parser.add_argument('--skip-download', action='store_true', help='Pular download, usar arquivos existentes')
    parser.add_argument('--skip-post', action='store_true', help='Pular pós-processamento')
    args = parser.parse_args()

    log.info("=" * 60)
    log.info("ETL CNPJ - Dados da Receita Federal")
    log.info("=" * 60)

    # Download
    if not args.skip_download:
        log.info("\n[1/3] Baixando arquivos...")
        download_all()
        if args.download_only:
            log.info("\nDownload concluído. Saindo.")
            return
    else:
        log.info("\n[1/3] Pulando download...")

    # Conectar ao PostgreSQL
    log.info("\n[2/3] Conectando ao PostgreSQL...")
    try:
        conn = get_connection()
        log.info("  Conectado!")
    except Exception as e:
        log.error(f"  Erro ao conectar: {e}")
        log.error("  Verifique as variáveis de ambiente: CNPJ_DB_HOST, CNPJ_DB_PORT, CNPJ_DB_NAME, CNPJ_DB_USER, CNPJ_DB_PASSWORD")
        sys.exit(1)

    # Aplicar schema
    log.info("\n  Aplicando schema...")
    schema_path = Path(__file__).parent / 'schema.sql'
    with open(schema_path, 'r') as f:
        cur = conn.cursor()
        cur.execute(f.read())
        conn.commit()
    log.info("  Schema aplicado!")

    # Carregar dados
    log.info("\n[3/3] Carregando dados...")

    if not args.only or args.only == 'aux':
        log.info("\n--- Tabelas auxiliares ---")
        load_auxiliar(conn, 'cnae', 'cnae')
        load_auxiliar(conn, 'motivo', 'motivo')
        load_auxiliar(conn, 'natjur', 'natjur')
        load_auxiliar(conn, 'pais', 'pais')
        load_auxiliar(conn, 'qualific', 'qualific')
        load_municipio(conn)

    if not args.only or args.only == 'empresa':
        log.info("\n--- Empresa ---")
        load_empresa(conn)

    if not args.only or args.only == 'estab':
        log.info("\n--- Estabelecimento ---")
        load_estabelecimento(conn)

    if not args.only or args.only == 'qsa':
        log.info("\n--- QSA (Sócios) ---")
        load_qsa(conn)

    if not args.skip_post:
        log.info("\n--- Pós-processamento ---")
        post_load(conn)

    # Estatísticas finais
    cur = conn.cursor()
    for table in ['empresa', 'estabelecimento', 'qsa', 'cnae', 'municipio']:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        count = cur.fetchone()[0]
        log.info(f"  {table}: {count:,} registros")

    conn.close()
    log.info("\n" + "=" * 60)
    log.info("ETL concluído com sucesso!")
    log.info("=" * 60)


if __name__ == '__main__':
    main()
