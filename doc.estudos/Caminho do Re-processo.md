Caminho do Re-processo (do começo ao fim)
Quando você clica em 🔄 Re-processar num lead da Base, acontece 4 chamadas à API, uma atrás da outra:

1. Busca CNPJ + Responsável → /api/enviar

Manda o nome do lead + cidade + telefone
O backend consulta Receita Federal / CNPJ
Retorna: CNPJ, razão social, nome fantasia, porte, capital social, sócios, situação cadastral, endereço completo, CNAE, regime tributário
2. Busca Redes Sociais → /api/social-search

Manda o nome do responsável + nome da empresa + cidade
Busca Instagram, Facebook, LinkedIn, Twitter, YouTube
Retorna: URLs dos perfis encontrados
3. Verifica Plano de Saúde → /api/health-plan-check

Manda CNPJ + razão social + porte + capital social + CNAE
IA analisa se a empresa provavelmente tem plano de saúde pra funcionários
Retorna: sim/não/inconclusivo + tipo + confiança
4. Conta Colaboradores → /api/employee-count

Manda nome + CNPJ + porte + capital social + CNAE
Busca estimativa de funcionários
Retorna: quantidade ou faixa + fonte + confiança
Resultado final: tudo é salvo no localStorage e no estado do lead → o modal de detalhes atualiza com todos os dados encontrados.

Resumo: Nome + Cidade → CNPJ → Redes Sociais → Plano de Saúde → Colaboradores → Salva → Mostra.


Aqui estão todas as APIs externas usadas no re-processo:

1. Busca CNPJ + Dados Empresariais (/api/enrich)
#	API/Site	URL	O que faz
1	Minha Receita	https://minhareceita.org/{cnpj}	Consulta CNPJ na Receita Federal (principal)
2	Bing Search	https://www.bing.com/search?q=...	Busca CNPJ pelo nome da empresa
3	DuckDuckGo	https://html.duckduckgo.com/html/?q=...	Busca CNPJ (fallback)
4	Casa dos Dados	https://casadosdados.com.br/solucao/cnpj/pesquisa-avancada?q=...	Busca CNPJ em diretório
5	CNPJ.biz (via Google Translate proxy)	https://translate.google.com/translate?...&u=https://cnpj.biz/procura/...	Busca CNPJ contornando bloqueio de IP
6	Site da empresa	{website}/contato, /sobre, /quem-somos	Extrai CNPJ direto do site
2. Redes Sociais (/api/social-search)
#	API/Site	URL	O que faz
7	DuckDuckGo	https://html.duckduckgo.com/html/?q=instagram {nome}...	Busca perfis em cada rede social
8	Site da empresa	{website} (scraping HTML)	Extrai links de redes sociais do site
Plataformas buscadas: Instagram, Facebook, LinkedIn, Twitter/X, YouTube

3. Plano de Saúde (/api/health-plan-check)
#	API/Site	URL	O que faz
9	ANS (dados abertos)	http://ftp.dadosabertos.ans.gov.br/FTP/PDA/operadoras_de_plano_de_saude_ativas/Relatorio_cadop.csv	Lista oficial de operadoras ANS
10	Bing Search	https://www.bing.com/search?q={cnpj} plano de saude...	Busca menções a plano de saúde
11	DuckDuckGo	https://html.duckduckgo.com/html/?q=...	Fallback busca plano de saúde
4. Colaboradores (/api/employee-count)
#	API/Site	URL	O que faz
12	Wikipedia	https://pt.wikipedia.org/api/rest_v1/page/summary/{empresa}	Busca nº de funcionários em empresas conhecidas
13	Bing Search	https://www.bing.com/search?q={empresa} numero funcionarios	Busca nº de funcionários
14	LinkedIn (via Bing)	https://www.bing.com/search?q=site:linkedin.com/company {empresa}	Extrai faixa de funcionários do LinkedIn
Resumo: Todas são gratuitas e sem necessidade de API key. A maioria usa web scraping de mecanismos de busca (Bing, DuckDuckGo) + APIs públicas (Minha Receita, ANS, Wikipedia). A única API paga configurável é a MiMo (usada apenas no Vision Upload, não no re-processo).