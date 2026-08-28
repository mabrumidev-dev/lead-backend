# Skills Disponíveis

## Comando Principal
Para iniciar nova sessão com contexto completo, digite:

```
Leia .opencode/CONTEXT_STATE.md e continue de onde paramos
```

## Outros Comandos Úteis
- `/contexts save` - Salvar estado atual
- `/contexts load` - Carregar contexto (alias para o comando acima)
- `/status` - Ver status do projeto

## Como Funciona
1. O arquivo `.opencode/CONTEXT_STATE.md` contém TODO o contexto do projeto
2. Ao ler esse arquivo, a IA entende: arquitetura, fluxo de dados, status atual
3. Você pode continuar exatamente de onde parou

## Se Perder Contexto Novamente
Execute: `.\scripts\auto-context.ps1`

## Lições Aprendidas (IMPORTANTE!)

### Scraper Google Maps - NÃO MEXER sem necessidade!
- **NUNCA** adicione `--single-process` ou `--no-zygote` ao Chromium
- **NUNCA** reduza viewport abaixo de 800x600
- **NUNCA** reduza `max_scrolls` abaixo de 50
- **NUNCA** mude `quality` do screenshot abaixo de 40
- **NUNCA** adicione múltiplos `gc.collect()` extras

### Por quê?
1. `--single-process` / `--no-zygote` → Chromium crasha silenciosamente
2. Viewport muito pequeno → Google Maps não carrega corretamente
3. Poucos scrolls → Resultados insuficientes
4. Qualidade baixa → Screenshots inúteis

### Se precisar otimizar memória no Render:
- Fechar/reabrir página entre leads (já implementado)
- Reduzir limite de leads (limit=3 ao invés de 5)
- NÃO mexer nos args do Chromium

### Google Maps muda CSS classes frequentemente!
- **NÃO** use BeautifulSoup com classes CSS como `h1.DUwDvf`, `.hfpxzc`, `.tAiQdd`
- **USE** JavaScript evaluation com seletores genéricos:
  - `document.querySelector('h1')` para nome
  - `document.querySelector('[data-item-id="address"]')` para endereço
  - `document.querySelector('a[href^="tel:"]')` para telefone
  - `document.querySelectorAll('a[href]')` para links do feed
