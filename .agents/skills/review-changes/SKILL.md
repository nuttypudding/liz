---
name: review-changes
description: Security and architecture review of current changes. Checks OWASP top 10, missing tests, stale docs. Read-only — does not modify files.
---

# /review-changes — Code Review

Run as a **read-only** review. Do NOT modify any files.

## Process

1. Get the diff:
```bash
git diff HEAD
git diff --cached
```

2. Launch an Explore agent (forked, read-only) to review all changes against this checklist:

### Security (OWASP Top 10)
- [ ] SQL/NoSQL injection — parameterized queries?
- [ ] XSS — user input escaped in templates/responses?
- [ ] Authentication/authorization — proper checks on all endpoints?
- [ ] Sensitive data exposure — no secrets in code, logs, or responses?
- [ ] Insecure deserialization — safe parsing of external data?
- [ ] Security misconfiguration — proper CORS, headers, defaults?

### Architecture
- [ ] Clean separation of concerns
- [ ] No circular dependencies between modules
- [ ] Configuration via environment variables, not hardcoded

### Tests
- [ ] New code has corresponding tests
- [ ] Error paths are tested
- [ ] Edge cases covered (empty input, large data, unicode)

### Documentation
- [ ] Changed behavior reflected in docs
- [ ] API changes documented
- [ ] No stale references to removed code

### Code Quality
- [ ] No `any` types (TypeScript) or bare `except` (Python)
- [ ] No hardcoded URLs, ports, or credentials
- [ ] Proper error handling (not swallowing exceptions)
- [ ] Resources properly cleaned up (connections, file handles)

## Output

For each category, report: **PASS**, **WARN**, or **FAIL** with file:line references for any issues found.
