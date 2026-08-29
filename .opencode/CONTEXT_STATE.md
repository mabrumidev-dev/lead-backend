# Context State - 28/08/2026 - 23:30

## COMANDO PARA NOVA SESSÃO
```
Leia .opencode/CONTEXT_STATE.md e continue de onde paramos
```

## STATUS ATUAL
- **Branch**: main
- **Último Commit**: 5a5789a (28/08 ~23:00)
- **Deploy**: lead-backend-rezr (Render) - LIVE e funcionando

## DECISÃO: FALLBACK CNPJ ABORTADO
Estratégia de busca de CNPJ por nome via motores de busca foi **abortada**.
Todos os motores de busca (Google, Bing, DuckDuckGo, Yahoo, Brave) bloqueiam
requests automatizados. Não existe API gratuita para busca de CNPJ por nome.
Sistema de enriquecimento CNPJ (4 estratégias) continua funcionando normalmente.

## O QUE FUNCIONA
- Scraper Google Maps: coleta links via JS, extrai dados via JS
- Enriquecimento CNPJ (4 estratégias: website, Bing, diretórios, Google Translate)
- Redes sociais (Yahoo/DDG)
- Plano de saúde (ANS + web search)
- Contagem de funcionários (Wikipedia + Bing + LinkedIn)
- Vision AI (Groq API)
- Base de leads com Supabase
- Disparo WhatsApp
- Importação CSV

## SERVIDORES
- Backend: http://localhost:8002
- Frontend: http://localhost:5173
- Produção: https://lead-backend-rezr.onrender.com

## PRÓXIMOS PASSOS
- [ ] Focar em melhorias gerais do projeto (definir com o usuário)
