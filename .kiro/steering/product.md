# Product Overview

MCP MySQL Server — an MCP (Model Context Protocol) server that gives LLMs direct access to MySQL databases. It exposes tools for executing queries and describing tables, resources for browsing database metadata, and prompt templates for common analysis workflows.

The server communicates over STDIO using JSON-RPC 2.0 and is designed to be used as a backend for AI assistants (e.g., Claude Desktop, Kiro).

## Key Capabilities

- **Tools**: `execute_query`, `describe_table`
- **Resources**: database list, table list, full schema
- **Prompts**: table analysis, large table finder, database overview

## Security Posture

- Blocks dangerous operations (DROP DATABASE/TABLE, TRUNCATE, unsafe DELETEs)
- Sanitizes table names (alphanumeric + underscore only)
- Validates queries are non-empty before execution
- Intended for development/internal use; not hardened for public-facing production
