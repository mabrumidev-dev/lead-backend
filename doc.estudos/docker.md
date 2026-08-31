docker instalado: mabrumi@DESKTOP-9UEEGJB:/mnt/c/WINDOWS/system32$


Tudo pronto. Resumo final:
Arquivos criados em D:\dev\mabrumi-crm-pro\:
- docker-compose.openhands.yml — configuração do OpenHands
- .env.openhands — variáveis do modelo
- CONTEXT_HANDS.md — contexto para restaurar depois
Seus próximos passos (após reiniciar):
1. Instalar WSL 2 → wsl --install → reiniciar
2. Instalar Docker Desktop → https://www.docker.com/products/docker-desktop/
3. Rodar docker compose -f docker-compose.openhands.yml up -d
4. Acessar http://localhost:3000
Para me chamar de volta:
Envie: /carregar-contexto openhands
==================================================================

Desculpa a confusão. Aqui está o passo a passo claro e simples:
O que você precisa ter instalado
1. Docker Desktop — baixe em https://www.docker.com/products/docker-desktop/
- Instale e reinicie o computador
O que fazer
Passo 1: Abra o terminal na pasta do projeto:
cd D:\dev\mabrumi-crm-pro
Passo 2: Crie o arquivo docker-compose.openhands.yml com este conteúdo:
version: "3.8"

services:
  openhands:
    image: ghcr.io/all-hands-ai/openhands:0.25
    container_name: openhands
    ports:
      - "3000:3000"
    volumes:
      - .:/workspace
      - openhands-state:/root/.openhands
    environment:
      - LLM_PROVIDER=groq
      - LLM_MODEL=qwen-2.5-32b
      - LLM_API_KEY=gsk_sua_chave_aqui
      - WORKSPACE_DIR=/workspace
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped

volumes:
  openhands-state:
Passo 3: Troque gsk_sua_chave_aqui pela sua chave do Groq (https://console.groq.com)
Passo 4: Execute:
docker compose -f docker-compose.openhands.yml up -d
Passo 5: Abra o navegador em http://localhost:3000
Pronto! A IA vai ter acesso total ao seu projeto e pode codar direto nele.
Precisa de ajuda com algum desses passos?


====================================================================================


Pronto! Arquivos criados:
- docker-compose.openhands.yml — configuração do OpenHands com seu modelo MiMo
- .env.openhands — variáveis de ambiente
- CONTEXT_HANDS.md — contexto desta conversa para restaurar depois
Resumo: O que fazer após reiniciar
1. Instalar WSL 2 (se ainda não tem):
wsl --install
Reiniciar novamente após instalar
2. Instalar Docker Desktop: https://www.docker.com/products/docker-desktop/
3. Abrir terminal na pasta do projeto:
cd D:\dev\mabrumi-crm-pro
4. Rodar o OpenHands:
docker compose -f docker-compose.openhands.yml up -d
5. Abrir navegador: http://localhost:3000
Para restaurar o contexto após reiniciar
Basta me enviar:
/carregar-contexto openhands
E eu leio o arquivo CONTEXT_HANDS.md e continuo de onde paramos.