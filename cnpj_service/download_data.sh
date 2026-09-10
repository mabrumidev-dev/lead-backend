#!/bin/bash
# Download dos dados CNPJ da Receita Federal via SERPRO+
# Fonte: https://arquivos.receitafederal.gov.br/index.php/s/gn672Ad4CF8N6TK
# Dados: Agosto/2026 (mais recente)

set -e

SHARE_ID="gn672Ad4CF8N6TK"
BASE_URL="https://arquivos.receitafederal.gov.br/public.php/dav/files/${SHARE_ID}/Dados/Cadastros/CNPJ/2026-08"
DATA_DIR="$(dirname "$0")/data"

mkdir -p "$DATA_DIR"

echo "=========================================="
echo "  Download CNPJ - Receita Federal (SERPRO+)"
echo "  Dados: Agosto/2026"
echo "  Destino: $DATA_DIR"
echo "=========================================="
echo ""

# Função para download com progresso
download() {
    local url="$1"
    local dest="$2"
    local name=$(basename "$dest")
    
    if [ -f "$dest" ]; then
        local size=$(stat -c%s "$dest" 2>/dev/null || echo "0")
        if [ "$size" -gt 1000 ]; then
            echo "✅ Já existe: $name ($(du -h "$dest" | cut -f1))"
            return 0
        fi
        rm -f "$dest"
    fi
    
    echo "⬇️  Baixando: $name"
    curl -L -o "$dest" "$url" \
        -H "User-Agent: MabrumiCRM/1.0" \
        --progress-bar \
        --retry 3 \
        --retry-delay 5
    
    if [ $? -eq 0 ] && [ -f "$dest" ]; then
        echo "✅ Concluído: $name ($(du -h "$dest" | cut -f1))"
        return 0
    else
        echo "❌ Erro ao baixar: $name"
        rm -f "$dest"
        return 1
    fi
}

# Tabelas auxiliares (pequenas)
echo "📦 Tabelas auxiliares..."
download "$BASE_URL/Cnaes.zip" "$DATA_DIR/cnae.zip"
download "$BASE_URL/Motivos.zip" "$DATA_DIR/motivo.zip"
download "$BASE_URL/Naturezas.zip" "$DATA_DIR/natjur.zip"
download "$BASE_URL/Paises.zip" "$DATA_DIR/pais.zip"
download "$BASE_URL/Qualificacoes.zip" "$DATA_DIR/qualific.zip"
download "$BASE_URL/Municipios.zip" "$DATA_DIR/municipio.zip"

echo ""
echo "📦 Simples/MEI..."
download "$BASE_URL/Simples.zip" "$DATA_DIR/simples.zip"

echo ""
echo "📦 Empresas (10 partes)..."
for i in $(seq 0 9); do
    download "$BASE_URL/Empresas${i}.zip" "$DATA_DIR/empresa${i}.zip"
done

echo ""
echo "📦 Estabelecimentos (10 partes)..."
for i in $(seq 0 9); do
    download "$BASE_URL/Estabelecimentos${i}.zip" "$DATA_DIR/estab${i}.zip"
done

echo ""
echo "📦 Sócios (10 partes)..."
for i in $(seq 0 9); do
    download "$BASE_URL/Socios${i}.zip" "$DATA_DIR/qsa${i}.zip"
done

echo ""
echo "=========================================="
echo "  ✅ Download concluído!"
echo "  Total: $(du -sh "$DATA_DIR" | cut -f1)"
echo "=========================================="
echo ""
echo "Próximo passo:"
echo "  cd cnpj_service"
echo "  docker compose up -d"
echo "  docker compose exec api python etl.py --skip-download"
