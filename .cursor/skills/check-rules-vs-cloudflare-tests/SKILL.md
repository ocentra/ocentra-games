---
name: check-rules-vs-cloudflare-tests
description: Validates infra/cloudflare code and tests against Ocentra rule documents (security, test, mutation, endpoint-domain, durable-objects, cloudflare-logging). Use when the user asks to check rules compliance, audit Cloudflare tests, validate tests against rules, or run a rules compliance check on infra/cloudflare.
---

# Rules vs Cloudflare Tests Compliance Check

Run this workflow when asked to **check rules against Cloudflare tests**, **audit Cloudflare tests for rule compliance**, or **validate infra/cloudflare against Ocentra rules**.

## Scope

- **Code under review**: `infra/cloudflare/` (handlers, Durable Objects, services, and especially `infra/cloudflare/tests/`).
- **Rules to check**: All listed in [REFERENCE.md](REFERENCE.md). Read each rule file from `.cursor/rules/` when performing the check.

## Workflow

1. **Identify scope**  
   Confirm with the user if the check is: (a) full `infra/cloudflare/` sweep, (b) only `infra/cloudflare/tests/`, or (c) specific files (e.g. one handler + its tests).

2. **Load rule documents**  
   Read the relevant rule files (see REFERENCE.md). Do not summarize rules from memory; use the actual documents for pass/fail criteria.

3. **Run the checklists**  
   For each rule document, work through the checkpoints in REFERENCE.md. For each checkpoint:
   - Determine which files are in scope (e.g. all `*.test.ts` under `tests/`, or specific handlers/DOs).
   - Search or read those files and mark: **Pass**, **Fail** (with file:line or excerpt), or **Gap** (not implemented / not testable as stated).

4. **Produce the report**  
   Output a structured compliance report:

```markdown
## Rules vs Cloudflare – Compliance Report

**Scope:** [e.g. infra/cloudflare/tests/]

### 1. ocentra-security-rules.mdc
- [ ] Checkpoint A: [Pass | Fail: file:line | Gap: reason]
- [ ] Checkpoint B: ...

### 2. ocentra-security-guidelines.mdc
...

### 3. ocentra-test-rules.mdc
...

### 4. ocentra-mutation-rules.mdc
...

### 5. ocentra-endpoint-domain-rules.mdc
...

### 6. ocentra-durable-objects-rules.md
...

### 7. ocentra-cloudflare-logging.mdc
...

## Summary
- Pass: N  Fail: N  Gap: N
```

5. **Failures and gaps**  
   For each Fail or Gap, cite the rule (section or rule number if present) and the file/location. Do not suggest fixes unless the user asks; the report is evidence for follow-up.

## Execution Notes

- Use **grep** and **codebase_search** to find patterns (e.g. `Logger.instance`, `logInfo(`, `describe(`, `it(`) across `infra/cloudflare/`.
- For security and test rules, sample both integration and e2e tests; for logging, sample handlers and DOs.
- If a rule has many sub-rules (e.g. security Rule 14.x), either check a representative set or list which sub-rules were checked and which were skipped with reason.

## When to Apply This Skill

- User says: "check my rules against cloudflare tests", "audit cloudflare tests", "validate tests against rules", "run rules compliance on infra/cloudflare", "do the rules check".
- User references compliance with `.cursor/rules` in the context of `infra/cloudflare` or Cloudflare tests.
