---
inclusion: manual
---

# Code Review

Ao realizar code review, siga estas diretrizes:

## Checklist

1. **Segurança** — Verificar inputs não sanitizados, SQL injection, exposição de dados sensíveis
2. **Correção** — A lógica implementa corretamente o requisito? Há edge cases não tratados?
3. **Preservação** — Mudanças não quebram funcionalidades existentes?
4. **Tipagem** — Tipos TypeScript estão corretos e específicos (evitar `any`)?
5. **Tratamento de erros** — Erros são capturados e reportados adequadamente?
6. **Performance** — Há loops desnecessários, queries N+1, ou alocações excessivas?
7. **Legibilidade** — Nomes claros, funções pequenas, responsabilidade única?
8. **Testes** — Mudanças têm cobertura de testes adequada?

## Formato da Revisão

Para cada problema encontrado, reportar:

- **Arquivo e linha**: localização exata
- **Severidade**: 🔴 crítico | 🟡 importante | 🔵 sugestão
- **Descrição**: o que está errado e por quê
- **Sugestão**: como corrigir (com código quando aplicável)

## Regras do Projeto

- Mensagens de erro em pt-BR
- Arquitetura single-file (`src/index.ts`)
- QueryValidator usa allowlist (ALLOWED_PREFIXES) — nunca blocklist
- Testes com Vitest + fast-check para property-based testing
- Sem dependência de banco real em testes automatizados
