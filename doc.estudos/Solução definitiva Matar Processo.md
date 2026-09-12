🚨 Solução definitiva - faça exatamente isso:
1. No terminal do Windows (não WSL), execute:
Copiar
cd D:\OpenCode_Projetos\mabrumi-crm-pro\api

# Matar backend antigo se estiver rodando
taskkill /f /im uvicorn.exe 2>nul

# Reinicie backend com .env carregado
set CNPJ_SERVICE_URL=http://localhost:8003
python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload

2. No mesmo terminal (D:\OpenCode_Projetos\mabrumi-crm-pro\api), execute:
Copiar
cd D:\OpenCode_Projetos\mabrumi-crm-pro\api

# Verifique se o backend está ativo
curl -s http://localhost:8002/api/health

3. No terminal do Windows (não WSL), execute:
Copiar
cd D:\OpenCode_Projetos\mabrumi-crm-pro
# Matar frontend antigo se estiver rodando
taskkill /f /im vite.exe 2>nul
# Limpe cache do Vite
rmdir /s /q .vite
# Reinicie frontend
npm run dev

4. Acesse http://localhost:5173 no navegador e teste:
Preencha CEP: 03557010
Selecione UF: SP
Clique em "Buscar Empresas"
Se funcionar, verá os resultados. Se ainda não funcionar, faça:

Copiar
# No terminal do Windows (D:\OpenCode_Projetos\mabrumi-crm-pro)
# Verifique se os arquivos foram atualizados
findstr /C:"API_BASE" src/components/leads/AddressSearch.tsx
Deve mostrar:

Copiar
const API_BASE = import.meta.env.VITE_API_URL || ''
Isso significa que está usando caminho relativo (sem http://localhost:8002).

🔍 Por que isso não funcionou antes?
O problema era que o API_BASE estava usando http://localhost:8002 quando o Vite estava rodando em localhost:5173, fazendo com que o navegador fizesse uma requisição cross-origin (de 5173 para 8002). O Vite proxy só funciona com requisições relativas (sem o domínio completo).

Com API_BASE = '', o frontend chama:

/api/cnpj/busca-endereco (relativo) → Vite proxy redireciona para http://localhost:8002/api/cnpj/busca-endereco
Isso resolve o problema de CORS e permite que o backend funcione corretamente.

🛠️ Se ainda não funcionar, faça este teste rápido:
Copiar
# No terminal do Windows (D:\OpenCode_Projetos\mabrumi-crm-pro)
curl -v "http://localhost:5173/api/cnpj/busca-endereco?cep=03557010&uf=SP&limit=1" 2>&1 | findstr "HTTP"
Se mostrar HTTP/1.1 200 OK, então o proxy está funcionando e o problema é no frontend.

Se não mostrar, o problema é no backend (verifique se o backend está realmente rodando e se o .env está carregado).