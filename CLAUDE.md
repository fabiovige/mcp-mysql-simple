# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an optimized MCP (Model Context Protocol) server for MySQL with clean architecture and SOLID principles. The project provides secure MySQL database access through the MCP protocol, implementing tools, resources, and prompts for database interaction.

## Development Commands

### Build and Run
- `npm run build` - Compile TypeScript to JavaScript in dist/
- `npm start` - Run the compiled server
- `npm run dev` - Run in development mode with tsx
- `npm run clean` - Remove dist/ directory

### Testing
- `npm run test:connection` - Test direct MySQL connection using test-mysql-connection.js
- `npm run test:server` - Build and test MCP server functionality using test-server.js

## Architecture Overview

The codebase follows clean architecture principles with clear separation of concerns:

### Core Classes (src/index.ts)

1. **MySQLMCPServer** - Main server class that orchestrates all components
2. **DatabaseConfig** - Handles environment variable configuration 
3. **DatabaseConnection** - Manages MySQL connection lifecycle and query execution
4. **QueryValidator** - Validates queries for security (prevents dangerous operations like DROP)
5. **ResponseFormatter** - Standardizes response formatting across the application
6. **ToolsHandler** - Implements MCP tools (execute_query, describe_table)
7. **ResourcesHandler** - Implements MCP resources (databases, tables, schema)
8. **PromptsHandler** - Implements MCP prompts (analyze_table, find_large_tables, database_overview)

### MCP Implementation

The server implements three core MCP concepts:

- **Tools**: Interactive functions that can be called by MCP clients
  - `execute_query` - Execute SQL queries with validation
  - `describe_table` - Get table structure information

- **Resources**: Static data that can be read by MCP clients
  - `mysql://databases` - List of available databases
  - `mysql://tables` - Tables in current database 
  - `mysql://schema` - Complete database schema

- **Prompts**: Template conversations for common database analysis tasks
  - `analyze_table` - Detailed table analysis
  - `find_large_tables` - Identify tables with most records
  - `database_overview` - Complete database overview

## Environment Configuration

Create a `.env` file in the project root with MySQL credentials:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=your_database
```

## Security Features

- Query validation prevents dangerous operations (DROP DATABASE/TABLE, TRUNCATE)
- Table name sanitization prevents injection attacks
- Parameterized queries for safe execution
- Graceful error handling with consistent messaging

## Development Workflow

1. Install dependencies: `npm install`
2. Configure `.env` with your MySQL credentials
3. Test connection: `npm run test:connection`
4. Build project: `npm run build`
5. Test server: `npm run test:server`
6. Run in development: `npm run dev`

## Code Style

The project uses TypeScript with strict type checking enabled. All classes follow single responsibility principle with clear interfaces and error handling patterns.