# Bugfix Requirements Document

## Introduction

O `QueryValidator` do servidor MCP MySQL possui uma brecha de segurança crítica: a tool `execute_query` permite executar queries destrutivas como `DELETE`, `UPDATE` e `SET` sem qualquer bloqueio. O array `DANGEROUS_PATTERNS` atual só bloqueia `DROP DATABASE/TABLE`, `DELETE` com `WHERE 1=1`, e `TRUNCATE` — mas não impede operações genéricas de escrita/modificação de dados. Isso permite que um LLM (ou qualquer cliente MCP) execute operações destrutivas no banco de dados sem restrição.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a query contains a generic DELETE statement (e.g., `DELETE FROM users WHERE id = 5`) THEN the system executes the query successfully without blocking it

1.2 WHEN a query contains an UPDATE statement (e.g., `UPDATE users SET name = 'x' WHERE id = 1`) THEN the system executes the query successfully without blocking it

1.3 WHEN a query contains a SET statement (e.g., `SET GLOBAL max_connections = 1000`) THEN the system executes the query successfully without blocking it

1.4 WHEN a query contains an INSERT statement (e.g., `INSERT INTO users VALUES (...)`) THEN the system executes the query successfully without blocking it

1.5 WHEN a query contains an ALTER statement (e.g., `ALTER TABLE users ADD COLUMN ...`) THEN the system executes the query successfully without blocking it

1.6 WHEN a query contains a CREATE statement (e.g., `CREATE TABLE ...`) THEN the system executes the query successfully without blocking it

### Expected Behavior (Correct)

2.1 WHEN a query contains a DELETE statement THEN the system SHALL reject the query with an error message indicating that write operations are not permitted

2.2 WHEN a query contains an UPDATE statement THEN the system SHALL reject the query with an error message indicating that write operations are not permitted

2.3 WHEN a query contains a SET statement THEN the system SHALL reject the query with an error message indicating that write operations are not permitted

2.4 WHEN a query contains an INSERT statement THEN the system SHALL reject the query with an error message indicating that write operations are not permitted

2.5 WHEN a query contains an ALTER statement THEN the system SHALL reject the query with an error message indicating that write operations are not permitted

2.6 WHEN a query contains a CREATE statement THEN the system SHALL reject the query with an error message indicating that write operations are not permitted

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a query is a SELECT statement THEN the system SHALL CONTINUE TO execute the query and return results normally

3.2 WHEN a query is a SHOW statement (e.g., `SHOW TABLES`, `SHOW DATABASES`) THEN the system SHALL CONTINUE TO execute the query and return results normally

3.3 WHEN a query is a DESCRIBE statement THEN the system SHALL CONTINUE TO execute the query and return results normally

3.4 WHEN a query is an EXPLAIN statement THEN the system SHALL CONTINUE TO execute the query and return results normally

3.5 WHEN a query contains the word DELETE or UPDATE inside a string literal or comment within a SELECT query THEN the system SHALL CONTINUE TO execute the query normally (e.g., `SELECT * FROM logs WHERE message LIKE '%DELETE%'`)

3.6 WHEN a query uses USE to switch databases THEN the system SHALL CONTINUE TO execute the query normally
