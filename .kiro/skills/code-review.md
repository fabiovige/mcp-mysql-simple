# Code Review

Skill para realizar revisão de código no projeto MCP MySQL Server.

## Quando usar

- Antes de fazer merge de uma branch
- Após implementar uma feature ou bugfix
- Quando quiser validar qualidade do código

## Instruções

Ao ativar esta skill, execute os seguintes passos:

1. **Identificar escopo**: Leia o git diff ou os arquivos indicados pelo usuário
2. **Analisar segurança**: Verificar se QueryValidator está usando allowlist, se há inputs não sanitizados
3. **Verificar tipagem**: Rodar `npm run build` para confirmar que TypeScript compila sem erros
4. **Rodar testes**: Executar `npm test` para garantir que nenhum teste quebrou
5. **Revisar manualmente**: Aplicar o checklist de code review (segurança, correção, preservação, tipagem, erros, performance, legibilidade, testes)
6. **Reportar**: Apresentar findings no formato padronizado com severidade

## Checklist Rápido

- [ ] Build passa (`npm run build`)
- [ ] Testes passam (`npm test`)
- [ ] Sem `any` desnecessário no TypeScript
- [ ] Mensagens de erro em pt-BR
- [ ] QueryValidator usa apenas allowlist
- [ ] Sem secrets ou credenciais hardcoded
- [ ] Edge cases tratados (query vazia, whitespace, case insensitivity)

## Comandos Úteis

```bash
npm run build    # Verificar compilação
npm test         # Rodar testes
git diff         # Ver mudanças pendentes
git diff --stat  # Resumo das mudanças
```
