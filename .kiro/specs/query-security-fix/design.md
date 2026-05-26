# Query Security Fix — Bugfix Design

## Overview

O `QueryValidator` em `src/index.ts` usa uma abordagem de blocklist (`DANGEROUS_PATTERNS`) que falha em bloquear operações destrutivas como DELETE, UPDATE, SET, INSERT, ALTER e CREATE. A correção substitui a blocklist por uma allowlist que permite apenas operações de leitura (SELECT, SHOW, DESCRIBE, EXPLAIN, USE) através da tool `execute_query`. Isso elimina a classe inteira de vulnerabilidades onde novos comandos perigosos passam despercebidos.

## Glossary

- **Bug_Condition (C)**: A condição que dispara o bug — queries com operações de escrita/modificação (DELETE, UPDATE, SET, INSERT, ALTER, CREATE) que passam pela validação sem bloqueio
- **Property (P)**: O comportamento desejado — queries de escrita/modificação devem ser rejeitadas com mensagem de erro indicando que operações de escrita não são permitidas
- **Preservation**: Operações de leitura existentes (SELECT, SHOW, DESCRIBE, EXPLAIN, USE) devem continuar funcionando normalmente, incluindo queries SELECT que contenham palavras-chave de escrita em string literals ou comentários
- **QueryValidator**: A classe em `src/index.ts` responsável por validar queries antes da execução
- **DANGEROUS_PATTERNS**: O array de regex atual (blocklist) que será substituído pela abordagem de allowlist
- **ALLOWED_PREFIXES**: A nova constante (allowlist) contendo os prefixos de comandos SQL permitidos

## Bug Details

### Bug Condition

O bug se manifesta quando um cliente MCP envia uma query contendo operações de escrita/modificação (DELETE, UPDATE, SET, INSERT, ALTER, CREATE) através da tool `execute_query`. O `QueryValidator.validate()` verifica apenas contra um conjunto limitado de padrões perigosos (DROP DATABASE, DROP TABLE, DELETE com WHERE 1=1, TRUNCATE), permitindo que a maioria das operações destrutivas passe sem bloqueio.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { query: string }
  OUTPUT: boolean
  
  LET normalized = input.query.trim().toUpperCase()
  LET firstKeyword = extractFirstSQLKeyword(normalized)
  
  RETURN firstKeyword NOT IN ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'USE']
         AND NOT matchesDangerousPatterns(input.query)
END FUNCTION
```

A condição captura queries que:
1. NÃO começam com um comando de leitura permitido
2. NÃO são capturadas pelos padrões perigosos existentes (DROP DATABASE, DROP TABLE, DELETE WHERE 1=1, TRUNCATE)

### Examples

- `DELETE FROM users WHERE id = 5` → Atualmente executa com sucesso; deveria ser rejeitada com erro
- `UPDATE users SET name = 'x' WHERE id = 1` → Atualmente executa com sucesso; deveria ser rejeitada com erro
- `INSERT INTO users (name) VALUES ('test')` → Atualmente executa com sucesso; deveria ser rejeitada com erro
- `SET GLOBAL max_connections = 1000` → Atualmente executa com sucesso; deveria ser rejeitada com erro
- `ALTER TABLE users ADD COLUMN age INT` → Atualmente executa com sucesso; deveria ser rejeitada com erro
- `CREATE TABLE temp (id INT)` → Atualmente executa com sucesso; deveria ser rejeitada com erro
- `SELECT * FROM logs WHERE message LIKE '%DELETE%'` → Executa normalmente (comportamento correto, deve ser preservado)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Queries SELECT devem continuar executando e retornando resultados normalmente
- Queries SHOW (SHOW TABLES, SHOW DATABASES, etc.) devem continuar funcionando
- Queries DESCRIBE/DESC devem continuar retornando estrutura de tabelas
- Queries EXPLAIN devem continuar retornando planos de execução
- Queries USE devem continuar permitindo troca de banco de dados
- Queries SELECT contendo palavras como DELETE, UPDATE, INSERT em string literals ou comentários devem continuar funcionando (e.g., `SELECT * FROM logs WHERE action = 'DELETE'`)
- A sanitização de nomes de tabela (`sanitizeTableName`) deve permanecer inalterada
- A validação de query vazia deve permanecer inalterada

**Scope:**
Todas as queries que começam com um comando de leitura permitido (SELECT, SHOW, DESCRIBE, DESC, EXPLAIN, USE) devem ser completamente não afetadas pela correção. A validação opera no primeiro keyword significativo da query, não no conteúdo de strings ou comentários.

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Abordagem Fundamentalmente Incorreta (Blocklist vs Allowlist)**: O `QueryValidator` usa uma blocklist (`DANGEROUS_PATTERNS`) que tenta enumerar padrões perigosos. Isso é inerentemente inseguro porque:
   - Novos comandos perigosos não são cobertos automaticamente
   - Variações de sintaxe podem escapar dos regex
   - A lista precisa ser mantida manualmente para cada novo caso

2. **Cobertura Incompleta de Padrões**: O array `DANGEROUS_PATTERNS` contém apenas 4 padrões:
   - `DROP DATABASE` — cobre apenas DROP de banco
   - `DROP TABLE` — cobre apenas DROP de tabela
   - `DELETE FROM...WHERE 1=1` — cobre apenas DELETE com condição universal
   - `TRUNCATE` — cobre apenas truncate
   
   Isso deixa completamente descobertos: DELETE genérico, UPDATE, INSERT, SET, ALTER, CREATE, GRANT, REVOKE, etc.

3. **Ausência de Parsing do Comando Principal**: A validação não identifica qual é o comando SQL principal da query. Ela apenas busca padrões dentro do texto completo, sem distinguir o verbo principal do conteúdo de strings/comentários.

## Correctness Properties

Property 1: Bug Condition - Queries de Escrita São Rejeitadas

_For any_ query cujo primeiro keyword SQL significativo NÃO seja um dos comandos de leitura permitidos (SELECT, SHOW, DESCRIBE, DESC, EXPLAIN, USE), a função `QueryValidator.validate()` corrigida SHALL lançar um erro com mensagem indicando que operações de escrita não são permitidas.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation - Queries de Leitura Continuam Funcionando

_For any_ query cujo primeiro keyword SQL significativo seja um dos comandos de leitura permitidos (SELECT, SHOW, DESCRIBE, DESC, EXPLAIN, USE), a função `QueryValidator.validate()` corrigida SHALL não lançar erro, permitindo a execução normal da query — independentemente de o corpo da query conter palavras-chave de escrita em string literals ou comentários.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/index.ts`

**Class**: `QueryValidator`

**Specific Changes**:

1. **Substituir `DANGEROUS_PATTERNS` por `ALLOWED_PREFIXES`**: Remover o array de regex blocklist e criar uma constante com os prefixos de comandos permitidos:
   ```typescript
   private static readonly ALLOWED_PREFIXES = [
     'SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'USE'
   ];
   ```

2. **Reescrever `validate()` com lógica de allowlist**: Extrair o primeiro keyword significativo da query (ignorando whitespace inicial) e verificar se está na lista de permitidos:
   ```typescript
   static validate(query: string): void {
     const normalizedQuery = query.trim();
     
     if (!normalizedQuery) {
       throw new Error("Query não pode estar vazia");
     }

     const firstKeyword = normalizedQuery.split(/\s+/)[0].toUpperCase();
     
     if (!this.ALLOWED_PREFIXES.includes(firstKeyword)) {
       throw new Error(
         "Apenas operações de leitura são permitidas (SELECT, SHOW, DESCRIBE, EXPLAIN, USE)"
       );
     }
   }
   ```

3. **Manter `sanitizeTableName` inalterado**: O método de sanitização de nomes de tabela não precisa de alteração.

4. **Manter validação de query vazia**: A verificação de query vazia no início de `validate()` permanece.

5. **Atualizar mensagem de erro**: A mensagem de erro deve ser clara e informativa, indicando quais operações são permitidas em vez de quais são bloqueadas.

## Testing Strategy

### Validation Approach

A estratégia de testes segue uma abordagem em duas fases: primeiro, demonstrar counterexamples que evidenciam o bug no código não corrigido, depois verificar que a correção funciona e preserva o comportamento existente.

### Exploratory Bug Condition Checking

**Goal**: Demonstrar counterexamples que evidenciam o bug ANTES de implementar a correção. Confirmar ou refutar a análise de root cause.

**Test Plan**: Escrever testes que enviam queries de escrita (DELETE, UPDATE, INSERT, SET, ALTER, CREATE) através do `QueryValidator.validate()` e verificar que NÃO lançam erro (demonstrando o bug). Executar no código NÃO corrigido para observar falhas.

**Test Cases**:
1. **DELETE Test**: Enviar `DELETE FROM users WHERE id = 5` — deve passar sem erro no código bugado (demonstra o bug)
2. **UPDATE Test**: Enviar `UPDATE users SET name = 'x'` — deve passar sem erro no código bugado (demonstra o bug)
3. **INSERT Test**: Enviar `INSERT INTO users VALUES (1)` — deve passar sem erro no código bugado (demonstra o bug)
4. **SET Test**: Enviar `SET GLOBAL max_connections = 1000` — deve passar sem erro no código bugado (demonstra o bug)
5. **ALTER Test**: Enviar `ALTER TABLE users ADD COLUMN age INT` — deve passar sem erro no código bugado (demonstra o bug)
6. **CREATE Test**: Enviar `CREATE TABLE temp (id INT)` — deve passar sem erro no código bugado (demonstra o bug)

**Expected Counterexamples**:
- Todas as queries de escrita passam pela validação sem erro
- Causa confirmada: blocklist incompleta que não cobre esses comandos

### Fix Checking

**Goal**: Verificar que para todas as queries onde a bug condition é verdadeira, a função corrigida rejeita a query com erro apropriado.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := QueryValidator.validate_fixed(input.query)
  ASSERT result THROWS Error
  ASSERT error.message CONTAINS "leitura"
END FOR
```

### Preservation Checking

**Goal**: Verificar que para todas as queries onde a bug condition NÃO é verdadeira, a função corrigida produz o mesmo resultado que a função original (não lança erro).

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT QueryValidator.validate_fixed(input.query) does NOT throw
  ASSERT QueryValidator.validate_original(input.query) does NOT throw
END FOR
```

**Testing Approach**: Property-based testing é recomendado para preservation checking porque:
- Gera muitos casos de teste automaticamente cobrindo o domínio de queries de leitura
- Captura edge cases que testes manuais podem perder (e.g., queries com keywords em strings)
- Fornece garantias fortes de que o comportamento é inalterado para todas as queries de leitura

**Test Plan**: Observar comportamento no código NÃO corrigido para queries de leitura, depois escrever property-based tests capturando esse comportamento.

**Test Cases**:
1. **SELECT Preservation**: Verificar que `SELECT * FROM users` continua passando pela validação
2. **SELECT com Keywords em Strings**: Verificar que `SELECT * FROM logs WHERE msg LIKE '%DELETE%'` continua passando
3. **SHOW Preservation**: Verificar que `SHOW TABLES`, `SHOW DATABASES` continuam passando
4. **DESCRIBE Preservation**: Verificar que `DESCRIBE users` continua passando
5. **EXPLAIN Preservation**: Verificar que `EXPLAIN SELECT * FROM users` continua passando
6. **USE Preservation**: Verificar que `USE mydb` continua passando

### Unit Tests

- Testar que cada comando de escrita (DELETE, UPDATE, INSERT, SET, ALTER, CREATE) é rejeitado
- Testar que cada comando de leitura (SELECT, SHOW, DESCRIBE, DESC, EXPLAIN, USE) é aceito
- Testar edge cases: query vazia, whitespace antes do comando, case insensitivity
- Testar que keywords de escrita dentro de strings/comentários em SELECT não causam rejeição

### Property-Based Tests

- Gerar queries aleatórias começando com comandos de leitura permitidos e verificar que passam pela validação
- Gerar queries aleatórias começando com comandos NÃO permitidos e verificar que são rejeitadas
- Gerar queries SELECT com conteúdo aleatório (incluindo keywords de escrita em strings) e verificar preservação

### Integration Tests

- Testar fluxo completo: query de leitura via `ToolsHandler.executeQuery()` retorna resultados
- Testar fluxo completo: query de escrita via `ToolsHandler.executeQuery()` retorna erro formatado
- Testar que `describe_table` continua funcionando (usa DESCRIBE internamente)
