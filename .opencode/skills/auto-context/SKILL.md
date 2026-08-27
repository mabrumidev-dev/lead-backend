# Skill: Auto-Context
## Objetivo
Salva automaticamente o estado do contexto sempre que uma alteração for detectada.

## Quando Ativar
- Após QUALQUER edição de arquivo (edit/write)
- Após commits git
- Antes de encerrar sessão
- Quando solicitado pelo usuário

## O que Salvar
1. Arquivos modificados (git status)
2. Último commit (git log -1)
3. Mudanças pendentes (git diff)
4. Estado do projeto (frontend/backend/db/deploy)

## Como Ativar
```
/contexts save
```

## Onde Salvar
- `.opencode/CONTEXT_STATE.md` - sempre atualizar
- Git commit - quando houver changes

## Regra de Ouro
**NUNCA** encerrar sessão sem atualizar CONTEXT_STATE.md
