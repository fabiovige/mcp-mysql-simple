# Tech Stack

## Language & Runtime

- TypeScript (strict mode)
- Node.js >= 18
- ES Modules (`"type": "module"` in package.json, ESNext module target)

## Core Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP protocol server implementation |
| `mysql2` | MySQL client (promise-based) |
| `dotenv` | Environment variable loading from `.env` |

## Dev Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` | Compiler |
| `tsx` | Dev-mode runner (TypeScript execution without pre-compilation) |
| `@types/node` | Node.js type definitions |

## Build & Commands

```bash
npm run build        # Compile TS → dist/
npm start            # Run compiled server (dist/index.js)
npm run dev          # Run in dev mode via tsx (no build step)
npm run clean        # Remove dist/
npm run test:connection  # Test MySQL connectivity
npm run test:server      # Build + test MCP protocol messages
```

## TypeScript Configuration

- Target: ES2022
- Module: ESNext with Node module resolution
- Strict mode enabled
- Outputs declarations, declaration maps, and source maps to `dist/`

## Configuration

Environment variables (loaded from `.env`):

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=       # also accepts MYSQL_PASS
MYSQL_DATABASE=       # also accepts MYSQL_DB
```

## Testing Rules

- **NUNCA** executar testes ou queries de validação em bancos de produção ou dev remoto.
- Para testes manuais com banco MySQL real, usar **apenas** o MCP `voomp_local` (banco local).
- Testes automatizados (Vitest/fast-check) devem rodar isolados sem dependência de banco real (mock ou validação pura).
