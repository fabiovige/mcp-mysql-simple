# Project Structure

```
mcp-mysql-simple/
├── src/
│   └── index.ts            # Entire server implementation (single-file architecture)
├── dist/                   # Compiled JS output (gitignored)
├── docs/
│   └── architecture.png   # Architecture diagram
├── test-mysql-connection.js  # Standalone connection test script
├── test-server.js            # MCP protocol integration test
├── .env                    # Local MySQL credentials (gitignored)
├── .env.example            # Template for environment config
├── config-example.json     # Example Claude Desktop MCP config
├── package.json
└── tsconfig.json
```

## Architecture (src/index.ts)

The server uses a single-file architecture with class-based separation of concerns:

| Class | Responsibility |
|-------|---------------|
| `DatabaseConfig` | Reads env vars, produces connection config |
| `DatabaseConnection` | Manages MySQL connection lifecycle (lazy connect, execute, close) |
| `QueryValidator` | Validates queries against dangerous patterns, sanitizes table names |
| `ResponseFormatter` | Formats success/error/query results into MCP response shape |
| `ToolsHandler` | Implements `execute_query` and `describe_table` tools |
| `ResourcesHandler` | Implements database/table/schema resource reads |
| `PromptsHandler` | Defines and resolves prompt templates |
| `MySQLMCPServer` | Orchestrates all handlers, sets up MCP request routing |

## Conventions

- All classes live in `src/index.ts` — no multi-file module splitting
- The server is the default export and self-starts when run directly (`import.meta.url` check)
- Communication is STDIO-based (no HTTP server)
- Error messages are in Portuguese (pt-BR) for user-facing output
- Console logging goes to stderr (stdout is reserved for MCP protocol messages)
