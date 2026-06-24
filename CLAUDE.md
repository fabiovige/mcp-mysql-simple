# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Run
- `npm run build` - Compile TypeScript to JavaScript in dist/
- `npm start` - Run the compiled server from dist/index.js
- `npm run dev` - Run the server in development mode with hot reload using tsx

### Testing
- `node test-mysql-connection.js` - Test MySQL connection and examine database structure
- `node test-server.js` - Test MCP server functionality with basic protocol messages

## Architecture Overview

This is an MCP (Model Context Protocol) server that provides LLMs with MySQL database access. The architecture follows a single-file pattern with clear separation of MCP capabilities:

### Core Components

**MySQLMCPServer Class** (`src/index.ts:34-467`)
- Main server implementation extending MCP SDK
- Manages MySQL connection lifecycle 
- Implements all three MCP capability types: Tools, Resources, and Prompts

**Configuration System** (`src/index.ts:25-48`)
- Environment-based configuration supporting both MYSQL_PASSWORD/MYSQL_PASS and MYSQL_DATABASE/MYSQL_DB variants
- Flexible connection management with database switching capability

### MCP Capabilities Implementation

**Tools** (Functions LLM can execute):
- `execute_query` - Execute arbitrary SQL queries with optional database switching
- `describe_table` - Get table structure using DESCRIBE command

**Resources** (Data LLM can access):
- `mysql://databases` - Lists all available databases
- `mysql://tables` - Lists tables in current database
- `mysql://schema` - Complete schema with tables and column definitions

**Prompts** (Pre-built templates):
- `analyze_table(table_name)` - Comprehensive table analysis workflow
- `find_large_tables` - Identifies tables with most records
- `database_overview` - Complete database structure overview

## Configuration

Environment variables are loaded from `.env` file:
```bash
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASS=your_password
MYSQL_DB=your_database
QUERY_DEFAULT_LIMIT=100  # default LIMIT applied to SELECT queries without one
```

The server supports connection-time database switching via tool parameters.

## Query Safety Rules

**LIMIT obrigatório em SELECT:** Toda query SELECT que não tiver cláusula LIMIT recebe automaticamente `LIMIT 100` antes de ser executada. Isso evita travamentos em tabelas grandes (ex: tabela `webhook` com vários GBs de dados).

- O padrão é 100 linhas, configurável via `QUERY_DEFAULT_LIMIT` no `.env`
- Queries que já tiverem `LIMIT` explícito não são alteradas
- A query final executada (com LIMIT aplicado) é sempre exibida no resultado
- Implementado em `QueryValidator.enforceSelectLimit()` (`src/index.ts`)

## Protocol Details

- Uses JSON-RPC 2.0 over STDIO transport
- Implements MCP protocol version 2024-11-05
- Error handling with user-friendly messages
- Graceful connection management with lazy initialization

## Security Considerations

Current implementation uses backtick escaping for table/database names. The codebase is designed for learning MCP concepts and includes basic SQL injection protection through MySQL2's parameterized queries, but additional security measures should be considered for production use.