# Implementation Plan

## Overview

Replace the blocklist-based `QueryValidator` with an allowlist approach that only permits read-only SQL operations (SELECT, SHOW, DESCRIBE, DESC, EXPLAIN, USE) through `execute_query`. Uses the bug condition methodology: explore the bug with property-based tests, preserve existing behavior, then implement and validate the fix.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Write Operations Pass Validation Without Blocking
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Setup**: Install Vitest and fast-check as dev dependencies (`npm install -D vitest fast-check`), add `"test": "vitest --run"` script to package.json, create `src/query-validator.test.ts`
  - **Scoped PBT Approach**: Scope the property to concrete failing cases — generate queries starting with write keywords (DELETE, UPDATE, INSERT, SET, ALTER, CREATE) followed by arbitrary SQL content
  - **Bug Condition from design**: `isBugCondition(input)` is true when `firstKeyword NOT IN ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'USE']` AND query does not match existing DANGEROUS_PATTERNS
  - **Property assertion**: For all queries where isBugCondition is true, `QueryValidator.validate(query)` SHOULD throw an error containing "leitura" (expected behavior after fix)
  - **Generator**: Use fast-check to generate queries like `fc.constantFrom('DELETE', 'UPDATE', 'INSERT', 'SET', 'ALTER', 'CREATE')` combined with `fc.string()` for the rest of the query body
  - Run test on UNFIXED code — expect FAILURE (this confirms the bug exists: write queries pass validation without error)
  - Document counterexamples found (e.g., "DELETE FROM users WHERE id = 5 does not throw, UPDATE users SET name = 'x' does not throw")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Read-Only Queries Continue Passing Validation
  - **IMPORTANT**: Follow observation-first methodology
  - **Setup**: Use the same test file `src/query-validator.test.ts` with Vitest and fast-check
  - Observe: `QueryValidator.validate('SELECT * FROM users')` does NOT throw on unfixed code
  - Observe: `QueryValidator.validate('SHOW TABLES')` does NOT throw on unfixed code
  - Observe: `QueryValidator.validate('DESCRIBE users')` does NOT throw on unfixed code
  - Observe: `QueryValidator.validate('EXPLAIN SELECT * FROM users')` does NOT throw on unfixed code
  - Observe: `QueryValidator.validate('USE mydb')` does NOT throw on unfixed code
  - Observe: `QueryValidator.validate("SELECT * FROM logs WHERE msg LIKE '%DELETE%'")` does NOT throw on unfixed code
  - **Property assertion**: For all queries whose first keyword is one of ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'USE'], `QueryValidator.validate(query)` SHALL NOT throw — regardless of whether the query body contains write keywords in string literals or comments
  - **Generator**: Use fast-check to generate queries starting with `fc.constantFrom('SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'USE')` followed by arbitrary content (including write keywords embedded in strings)
  - **Preservation Requirements from design**: Queries beginning with allowed read prefixes must pass validation unchanged
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Implement allowlist-based QueryValidator

  - [x] 3.1 Replace DANGEROUS_PATTERNS with ALLOWED_PREFIXES and rewrite validate()
    - Replace `private static readonly DANGEROUS_PATTERNS` array with `private static readonly ALLOWED_PREFIXES = ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'USE']`
    - Rewrite `validate()` method: keep empty query check, extract first keyword via `normalizedQuery.split(/\s+/)[0].toUpperCase()`, check if keyword is in ALLOWED_PREFIXES
    - If keyword is NOT in ALLOWED_PREFIXES, throw `new Error("Apenas operações de leitura são permitidas (SELECT, SHOW, DESCRIBE, EXPLAIN, USE)")`
    - Keep `sanitizeTableName()` method completely unchanged
    - _Bug_Condition: isBugCondition(input) where firstKeyword NOT IN ALLOWED_PREFIXES_
    - _Expected_Behavior: validate() throws Error with message containing "leitura" for all write operations_
    - _Preservation: All queries starting with SELECT, SHOW, DESCRIBE, DESC, EXPLAIN, USE continue to pass validation without error_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Write Operations Are Now Rejected
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (write queries should throw)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — all write operations are now rejected)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Read-Only Queries Still Pass After Fix
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — all read operations still work)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite (`npm test`) and confirm all property-based tests pass
  - Verify: Property 1 (Bug Condition) test passes — write operations are rejected
  - Verify: Property 2 (Preservation) test passes — read operations still work
  - Run `npm run build` to confirm TypeScript compilation succeeds
  - Ensure all tests pass, ask the user if questions arise

## Task Dependency Graph

```json
{
  "waves": [
    ["1", "2"],
    ["3.1"],
    ["3.2", "3.3"],
    ["4"]
  ]
}
```

## Notes

- Test framework: Vitest + fast-check (property-based testing) — neither exists in the project yet, task 1 handles setup
- All code changes are in `src/index.ts` (single-file architecture)
- Error messages are in Portuguese (pt-BR) per project conventions
- The `QueryValidator` class is not currently exported; tests will need to import it or test through `ToolsHandler`
