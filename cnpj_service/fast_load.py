#!/usr/bin/env python3
"""
Fast loader for estabelecimento - NO indexes, big batches.
Run AFTER dropping indexes. Run BEFORE recreating them.
"""
import os, sys, zipfile, csv, io, logging, time
from pathlib import Path
from psycopg2.extras import execute_values
import psycopg2

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s', datefmt='%H:%M:%S')
log = logging.getLogger('fast')

DATA_DIR = Path('/app/data')
BATCH_SIZE = 50000

def clean_str(val):
    if not val:
        return ''
    return val.strip().replace('\x00', '').replace('\r', ' ').replace('\n', ' ')

def parse_date(val):
    val = val.strip()
    if not val or val == '0' or len(val) != 8:
        return None
    try:
        return f"{val[:4]}-{val[4:6]}-{val[6:8]}"
    except:
        return None

def stream_zip_lines(zip_path):
    with zipfile.ZipFile(str(zip_path), 'r') as z:
        names = [n for n in z.namelist() if not n.startswith('__MACOSX')]
        if not names:
            return
        with z.open(names[0]) as f:
            decoder = io.TextIOWrapper(f, encoding='latin-1', errors='replace')
            reader = csv.reader(decoder, delimiter=';')
            for row in reader:
                yield row

def flush_batch(cur, batch):
    query = """INSERT INTO estabelecimento (
        cnpj_basico, cnpj_ordem, cnpj_dv, identificador_matriz_filial,
        nome_fantasia, situacao_cadastral, data_situacao_cadastral,
        motivo_situacao_cadastral, nome_cidade_exterior, codigo_pais,
        data_inicio_atividade, cnae_fiscal, cnae_fiscal_descricao,
        tipo_logradouro, logradouro, numero, complemento, bairro,
        cep, uf, codigo_municipio, municipio, ddd_1, telefone_1,
        ddd_2, telefone_2, ddd_fax, fax, email,
        situacao_especial, data_situacao_especial
    ) VALUES %s"""
    execute_values(cur, query, batch, page_size=10000)

def make_row(row):
    n = len(row)
    if n < 30:
        row = row + [''] * (30 - n)
    elif n > 30:
        row = row[:30]
    return (
        clean_str(row[0]), clean_str(row[1]), clean_str(row[2]),
        clean_str(row[3]), clean_str(row[4]), clean_str(row[5]),
        parse_date(row[6]), clean_str(row[7]), clean_str(row[8]),
        clean_str(row[9]), parse_date(row[10]), clean_str(row[11]),
        '',  # cnae_fiscal_descricao (preechido no post-load)
        clean_str(row[13]), clean_str(row[14]), clean_str(row[15]),
        clean_str(row[16]), clean_str(row[17]), clean_str(row[18]),
        clean_str(row[19]), clean_str(row[20]),
        '',  # municipio (preechido no post-load)
        clean_str(row[21]), clean_str(row[22]), clean_str(row[23]),
        clean_str(row[24]), clean_str(row[25]), clean_str(row[26]),
        clean_str(row[27]), clean_str(row[28]), parse_date(row[29]),
    )

def main():
    log.info("=== Fast Load Estabelecimento ===")

    conn = psycopg2.connect(
        host=os.environ.get('CNPJ_DB_HOST', 'postgres'),
        port=os.environ.get('CNPJ_DB_PORT', '5432'),
        dbname=os.environ.get('CNPJ_DB_NAME', 'cnpj'),
        user=os.environ.get('CNPJ_DB_USER', 'cnpj'),
        password=os.environ.get('CNPJ_DB_PASSWORD', 'cnpj'),
    )
    conn.autocommit = False
    cur = conn.cursor()

    cur.execute("SELECT count(*) FROM estabelecimento")
    existing = cur.fetchone()[0]
    log.info(f"Registros existentes: {existing:,}")

    # Calcular quais arquivos pular
    skip_files = 0
    if existing > 20_000_000:
        skip_files = 1
        remaining = existing - 30_000_000
        skip_files += max(0, remaining // 3_000_000)
        skip_files = min(skip_files, 9)
        log.info(f"Pulando estab0..estab{skip_files-1}")

    total = existing
    start = time.time()

    for i in range(skip_files, 10):
        zip_path = DATA_DIR / f'estab{i}.zip'
        if not zip_path.exists():
            log.warning(f"estab{i}.zip nao encontrado, pulando")
            continue

        log.info(f"Carregando estab{i}.zip...")
        batch = []
        file_count = 0
        for row in stream_zip_lines(zip_path):
            batch.append(make_row(row))
            if len(batch) >= BATCH_SIZE:
                flush_batch(cur, batch)
                total += len(batch)
                file_count += len(batch)
                conn.commit()
                elapsed = time.time() - start
                rate = (total - existing) / elapsed * 60 if elapsed > 0 else 0
                log.info(f"  {total:,} registros ({rate:,.0f}/min)")
                batch = []

        if batch:
            flush_batch(cur, batch)
            total += len(batch)
            file_count += len(batch)
            conn.commit()

        log.info(f"  estab{i}.zip: {file_count:,} inseridos")

    elapsed = time.time() - start
    log.info(f"\n=== CONCLUIDO ===")
    log.info(f"Total: {total:,} registros")
    log.info(f"Tempo: {elapsed/60:.1f} min")
    conn.close()

if __name__ == '__main__':
    main()
