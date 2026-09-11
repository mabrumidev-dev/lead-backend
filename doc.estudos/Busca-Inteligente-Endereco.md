# 📍 Busca Inteligente por Endereço — Documentação

**Data:** 10/09/2026  
**Feature:** Busca de empresas por CEP, rua, bairro, cidade e UF usando o CNPJ service  
**Status:** Implementado — aguardando push + deploy

---

## O que é

O usuário pode buscar empresas por localização geográfica usando o banco CNPJ (51.5M+ empresas, 72.8M+ estabelecimentos).

### Exemplo de uso
- "Quero todas as empresas na Av. Paulista, São Paulo"
- "Mostre-me empresas no CEP 01310-100"
- "Quais empresas ativas existem naRua Augusta, bairro Bela Vista?"

---

## Endpoint da API

### `GET /api/cnpj/busca-endereco`

**Parâmetros (query string):**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `cep` | string | Não | CEP (8 dígitos, com ou sem hífen) |
| `logradouro` | string | Não | Nome da rua/avenida (mínimo 2 chars, busca fuzzy via trigram) |
| `bairro` | string | Não | Bairro (busca ILIKE) |
| `municipio` | string | Não | Município (busca ILIKE) |
| `uf` | string | Não | UF (2 letras, ex: SP, RJ) |
| `cnae` | string | Não | Código CNAE da atividade econômica |
| `porte` | string | Não | Porte: 01=ME, 03=EPP, 05=Demais |
| `situacao` | string | Não | Situação cadastral (padrão: 02=Ativa) |
| `limit` | int | Não | Limite de resultados (1-100, padrão: 20) |

**Pelo menos um filtro de endereço é obrigatório** (cep, logradouro, bairro, municipio ou uf).

### Resposta

```json
{
  "total": 15,
  "filtros": {
    "cep": null,
    "logradouro": "Paulista",
    "bairro": null,
    "municipio": "São Paulo",
    "uf": "SP",
    "cnae": null,
    "situacao": "02"
  },
  "results": [
    {
      "cnpj": "12345678000190",
      "razao_social": "EMPRESA EXEMPLO LTDA",
      "nome_fantasia": "Exemplo Store",
      "endereco": "Avenida Paulista, 1000 - Conjunto 101",
      "bairro": "Bela Vista",
      "cep": "01310100",
      "uf": "SP",
      "municipio": "São Paulo",
      "telefone_1": "11999998888",
      "telefone_2": "",
      "email": "contato@exemplo.com.br",
      "cnae_fiscal": "4751201",
      "cnae_fiscal_descricao": "Comércio varejista de artigos...",
      "situacao_cadastral": "02",
      "porte": "01",
      "capital_social": 100000.00,
      "natureza_juridica": "206-2",
      "opcao_simples": true,
      "opcao_mei": false,
      "identificador_matriz_filial": "1",
      "data_inicio_atividade": "2020-01-15"
    }
  ]
}
```

---

## Componente Frontend

### `AddressSearch.tsx`

**Localização:** `src/components/leads/AddressSearch.tsx`

**Props:**
- `onAddToBase: (lead: Lead) => void` — callback para adicionar lead na base
- `showToast: (msg: string, type?: string) => void` — notificações
- `baseLeadIds: string[]` — IDs dos leads já na base (para desabilitar botão)

**Funcionalidades:**
1. Filtros primários: CEP, Rua, UF
2. Filtros avançados (colapsáveis): Município, Bairro, CNAE, Porte, Situação, Limite
3. Busca com Enter ou botão
4. Tabela de resultados com:
   - Checkbox para seleção múltipla
   - Nome da empresa + razão social
   - CNPJ formatado
   - Endereço completo
   - Telefone (clicável)
   - Atividade (CNAE)
   - Badges: ATIVA, porte, Simples Nacional
5. Ações por resultado: Ver detalhes, Adicionar na Base
6. Modal de detalhes com dados completos
7. Seleção múltipla + "Adicionar selecionados na Base"

---

## Performance

- **CEP:** Index B-tree (`idx_estab_cep`) — busca instantânea
- **Logradouro:** GIN trigram index (`idx_estab_logradouro_trgm`) — busca fuzzy < 2s
- **UF + Município:** Indexes B-tree — busca instantânea
- **Combinação de filtros:** WHERE AND — cada filtro reduz o conjunto

---

## Integração com o fluxo

```
Busca Inteligente → Seleciona empresas → Adiciona na Base (com CNPJ enriched_data)
                                              ↓
                                        Base de Leads → Pipeline → WhatsApp
```

As empresas adicionadas via Busca Inteligente já saem com todos os dados CNPJ:
- CNPJ, Razão Social, Nome Fantasia
- Porte, Capital Social, Natureza Jurídica
- CNAE, Atividade Principal
- Endereço completo, Telefones, Email
- Simples Nacional, MEI
