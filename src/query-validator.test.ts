import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { QueryValidator } from './index.js';

/**
 * Property 1: Bug Condition - Write Operations Pass Validation Without Blocking
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6 (bug exists)**
 * **After fix validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 (expected behavior)**
 * 
 * For all queries where isBugCondition is true (first keyword NOT IN allowed read prefixes),
 * QueryValidator.validate(query) SHOULD throw an error containing "leitura".
 * 
 * On UNFIXED code: this test FAILS (confirms bug exists — write queries pass without error)
 * On FIXED code: this test PASSES (confirms fix works — write queries are rejected)
 */
describe('Property 1: Bug Condition - Write Operations Must Be Rejected', () => {
  const writeKeywords = fc.constantFrom('DELETE', 'UPDATE', 'INSERT', 'SET', 'ALTER', 'CREATE');

  const sqlBody = fc.oneof(
    fc.constant(' FROM users WHERE id = 5'),
    fc.constant(' users SET name = \'x\' WHERE id = 1'),
    fc.constant(' INTO users (name) VALUES (\'test\')'),
    fc.constant(' GLOBAL max_connections = 1000'),
    fc.constant(' TABLE users ADD COLUMN age INT'),
    fc.constant(' TABLE temp (id INT)'),
    fc.stringMatching(/^[a-zA-Z0-9_ .,*()=<>'"%;]+$/).filter(s => s.length > 0 && s.length <= 60)
  );

  it('**Validates: Requirements 2.1-2.6** - write operations are rejected with error containing "leitura"', () => {
    fc.assert(
      fc.property(
        writeKeywords,
        sqlBody,
        (keyword, body) => {
          const query = `${keyword}${body}`;
          expect(() => QueryValidator.validate(query)).toThrowError(/leitura/);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('specific write operations are rejected', () => {
    const writeQueries = [
      'DELETE FROM users WHERE id = 5',
      'UPDATE users SET name = \'x\' WHERE id = 1',
      'INSERT INTO users (name) VALUES (\'test\')',
      'SET GLOBAL max_connections = 1000',
      'ALTER TABLE users ADD COLUMN age INT',
      'CREATE TABLE temp (id INT)',
    ];

    for (const query of writeQueries) {
      expect(() => QueryValidator.validate(query)).toThrowError(/leitura/);
    }
  });
});

/**
 * Property 2: Preservation - Read-Only Queries Continue Passing Validation
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 * 
 * For all queries whose first keyword is one of ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'USE'],
 * QueryValidator.validate(query) SHALL NOT throw — regardless of whether the query body contains
 * write keywords in string literals or comments.
 * 
 * NOTE: On unfixed code, the existing DANGEROUS_PATTERNS blocklist incorrectly matches
 * patterns like "DROP TABLE" even inside string literals. The generator avoids these
 * patterns to test the preservation property on the current code. After the fix (allowlist),
 * these false positives will also be resolved.
 */
describe('Property 2: Preservation - Read-Only Queries Continue Passing Validation', () => {
  // Observation tests: confirm baseline behavior on unfixed code
  describe('Observations (baseline behavior)', () => {
    it('SELECT * FROM users does NOT throw', () => {
      expect(() => QueryValidator.validate('SELECT * FROM users')).not.toThrow();
    });

    it('SHOW TABLES does NOT throw', () => {
      expect(() => QueryValidator.validate('SHOW TABLES')).not.toThrow();
    });

    it('DESCRIBE users does NOT throw', () => {
      expect(() => QueryValidator.validate('DESCRIBE users')).not.toThrow();
    });

    it('EXPLAIN SELECT * FROM users does NOT throw', () => {
      expect(() => QueryValidator.validate('EXPLAIN SELECT * FROM users')).not.toThrow();
    });

    it('USE mydb does NOT throw', () => {
      expect(() => QueryValidator.validate('USE mydb')).not.toThrow();
    });

    it("SELECT * FROM logs WHERE msg LIKE '%DELETE%' does NOT throw", () => {
      expect(() => QueryValidator.validate("SELECT * FROM logs WHERE msg LIKE '%DELETE%'")).not.toThrow();
    });
  });

  // Property-based test: all read-only queries pass validation
  describe('Property: read-only queries always pass validation', () => {
    const readPrefixes = fc.constantFrom('SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'USE');

    /**
     * Generator for SQL body content that does NOT trigger existing DANGEROUS_PATTERNS.
     * The current blocklist matches: DROP DATABASE, DROP TABLE, DELETE FROM...WHERE 1=1, TRUNCATE
     * even inside string literals. We filter these out to test the preservation property
     * on the current unfixed code.
     * 
     * After the allowlist fix, queries starting with read prefixes will pass regardless
     * of body content — the fix will also resolve these false positives.
     */
    const dangerousPatterns = [
      /DROP\s+DATABASE/i,
      /DROP\s+TABLE/i,
      /DELETE\s+FROM.*WHERE.*1\s*=\s*1/i,
      /TRUNCATE/i,
    ];

    function doesNotTriggerDangerousPatterns(query: string): boolean {
      return !dangerousPatterns.some(pattern => pattern.test(query));
    }

    // Generator for SQL body that avoids triggering existing dangerous patterns
    const sqlBody = fc.oneof(
      // Simple SQL identifiers and expressions
      fc.stringMatching(/^[a-zA-Z0-9_ .,*()=<>'"%;]+$/).filter(s => s.length > 0 && s.length <= 60),
      // Write keywords embedded in string literals (preservation edge cases)
      // These demonstrate that write keywords in strings should be allowed for read queries
      fc.constantFrom(
        "* FROM logs WHERE msg LIKE '%DELETE%'",
        "* FROM audit WHERE action = 'UPDATE'",
        "* FROM events WHERE type = 'INSERT'",
        "* FROM config WHERE note = 'SET value'",
        "* FROM schema_changes WHERE op = 'ALTER'",
        "* FROM migrations WHERE cmd = 'CREATE'",
        "* FROM users",
        "TABLES",
        "DATABASES",
        "users",
        "mydb",
        "* FROM orders WHERE id > 10",
        "COUNT(*) FROM products",
        "name, email FROM customers WHERE active = 1",
        "* FROM logs WHERE level = 'ERROR'"
      )
    );

    it('**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6** - queries starting with read prefixes never throw', () => {
      fc.assert(
        fc.property(
          readPrefixes,
          sqlBody,
          (prefix, body) => {
            const query = `${prefix} ${body}`;
            // Filter: skip queries that trigger existing DANGEROUS_PATTERNS
            // (these are false positives in the current blocklist approach)
            fc.pre(doesNotTriggerDangerousPatterns(query));
            // Should NOT throw for any read-only query
            expect(() => QueryValidator.validate(query)).not.toThrow();
          }
        ),
        { numRuns: 200 }
      );
    });

    it('read prefixes are case-insensitive', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('select', 'Select', 'SHOW', 'show', 'describe', 'Describe', 'DESC', 'desc', 'explain', 'Explain', 'use', 'Use'),
          fc.constant('test_table'),
          (prefix, body) => {
            const query = `${prefix} ${body}`;
            expect(() => QueryValidator.validate(query)).not.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
