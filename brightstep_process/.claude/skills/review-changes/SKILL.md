---
name: review-changes
description: Security and architecture review of current changes. Checks OWASP top 10, DDD violations, missing tests, and stale docs. Read-only — does not modify files.
model: opus
context: fork
agent: Explore
---

# Review Changes

Perform a thorough code review of the current changes. This runs in a read-only forked context — you cannot modify files, only report findings.

## Gather the Diff

```bash
git diff HEAD
git diff --cached
git diff --name-only HEAD
```

If there's no diff, check the last commit:
```bash
git diff HEAD~1
git log -1 --format="%H %s"
```

## Review Checklist

### 1. Security Review (OWASP Top 10)

For each changed file, check for:
- **Injection**: SQL injection (raw string interpolation in queries), command injection (unsanitized input in shell commands), XSS (unescaped user input in templates)
- **Broken auth**: Hardcoded credentials, missing auth checks on endpoints
- **Sensitive data exposure**: Secrets in code, PII logging, credentials in error messages
- **Insecure deserialization**: Unpickling untrusted data, unsafe JSON parsing
- **Misconfiguration**: Debug mode in production, permissive CORS, missing security headers

### 2. DDD Bounded Context Violations

Check for:
- Cross-context imports that bypass public APIs (importing internal modules from another bounded context)
- Domain logic leaking into infrastructure or CLI layers
- Entities from one context being mutated by another

### 3. Missing Tests

For each new function, class, or endpoint:
- Is there a corresponding test?
- Do tests cover error paths, not just happy paths?
- For bug fixes: Is there a regression test that would catch the bug?

### 4. Documentation Staleness

Check if changed code invalidates existing docs:
- CLI changes vs `docs/cli-usage.md`
- Port/service changes vs `docs/runbook.md`
- Schema changes vs `docs/schema.md`
- Architecture changes vs `docs/architecture.md`

### 5. Code Quality

- No `any` types in TypeScript
- No hardcoded config values in Python (should use `get_settings()`)
- No bare `except:` clauses
- Proper async/await usage (no forgotten awaits)
- Resource cleanup (connections, file handles)

## Report Format

Output a structured review:

```
## Security
- [PASS/WARN/FAIL] <finding with file:line reference>

## Architecture
- [PASS/WARN/FAIL] <finding with file:line reference>

## Tests
- [PASS/WARN/FAIL] <finding>

## Documentation
- [PASS/WARN/FAIL] <finding>

## Code Quality
- [PASS/WARN/FAIL] <finding>

## Summary
- Critical issues: N
- Warnings: N
- All clear: N
```

Flag critical issues prominently. Include specific file:line references for every finding.
