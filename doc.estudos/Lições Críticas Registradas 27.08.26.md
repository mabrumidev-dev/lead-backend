+ Thought: 1.0s
Tudo atualizado e commitado! Resumo do que fiz:
Contexto Atualizado
- CONTEXT_STATE.md: Status atual, problema resolvido, arquitetura do scraper, limitações conhecidas
- COMMANDS.md: Lições aprendidas - NUNCA mexer nos args do Chromium, usar JS evaluation em vez de CSS selectors
- RECOVERY.md: Seção de diagnóstico do scraper com problemas comuns e soluções
Commits Hoje
6a0335b docs: update context with scraper fix learnings
b27633f fix: close page between leads to free memory (OOM fix)
9d235dc fix: rewrite _parsing with JS evaluation
3e57d00 debug: detailed logging
26475a8 fix: revert memory optimizations
Lições Críticas Registradas
1. NUNCA adicionar --single-process ou --no-zygote ao Chromium
2. NUNCA reduzir viewport abaixo de 800x600
3. Google Maps muda CSS classes frequentemente → usar JS evaluation
4. Render free tier (512MB) → fechar/reabrir página entre leads