# External Tools Used in Test Suite

This document lists external tools used by the test suite and how they are invoked. All commands assume you are in `infra/cloudflare/` unless noted.

## npm Packages (via npx)

These are installed via npm and invoked using `npx`:

1. **vitest** - Test framework
   - Command: `npx vitest run ...`
   - Purpose: Runs unit, integration, and E2E tests
   - Status: ✅ Correct

2. **tsx** - TypeScript executor
   - Command: `npx --yes tsx ...`
   - Purpose: Runs TypeScript scripts (analytics tests, report generation)
   - Status: ✅ Correct

3. **Stryker** - Mutation testing
   - Command: `npm run test:mutation` (which runs `stryker run`)
   - Purpose: Tests test quality by mutating code
   - Status: ✅ Correct

4. **wrangler** - Cloudflare CLI
   - Command: Via `npm run worker:start` or direct `npx wrangler`
   - Purpose: Runs Cloudflare Workers locally
   - Status: ✅ Correct

## Python Tools (via pip/pipx)

These must be installed separately and are called directly:

1. **schemathesis** - API fuzzing
   - Command: `schemathesis run ...`
   - Installation: `pip install schemathesis` or `pipx install schemathesis`
   - Purpose: Property-based API fuzzing based on OpenAPI spec
   - Status: ✅ Fixed (was incorrectly using `npx --yes schemathesis`)
   - **SECURITY TEST CLASSIFICATION**: Security Test
   - **THREAT MAPPING** (ocentra-security-rules.mdc):
     - Rule 14.3: Input Validation & Schema Enforcement (Rule 5.1, 5.2)
     - Rule 14.4: URL / Path Manipulation
     - Rule 2.1: Authentication & Session Boundaries (Rule 2.1.1-2.1.14)
     - Rule 14.15: Request Smuggling & Protocol Attacks (Rule 9.1, 9.2)
     - Rule 14.8: Replay / Duplication (Rule 6.1, 6.2)
   - **SECURITY GUARANTEES VERIFIED** (ocentra-security-rules.mdc):
     - Rule 0.1.6 (G6): Authorization Safety - "No unauthenticated request mutates state"
     - Rule 0.1.1 (G1): Economic Safety - "Replay must never produce profit"
   - **INVARIANTS ASSERTED**:
     - Schema violations are rejected at boundary
     - Unauthenticated requests are rejected (401/403)
     - Malformed inputs are rejected (400/422)
     - Replayed requests are idempotent or rejected
   - **WHAT FAILURE MEANS**: API contract violations indicate security gaps (missing auth, schema bypass, replay vulnerabilities)

2. **semgrep** - Static analysis
   - Command: `semgrep --config=auto ...`
   - Installation: `pip install semgrep` or `pipx install semgrep`
   - Purpose: Security-focused static analysis
   - Status: ✅ Correct

## Standalone Binaries

These must be installed separately and are called directly:

1. **k6** - Load testing
   - Command: `k6 run ...`
   - Installation:
     - Windows: `choco install k6`
     - macOS: `brew install k6`
     - Linux: See https://k6.io/docs/getting-started/installation/
   - Purpose: Concurrency and load testing
   - Status: ✅ Fixed (was incorrectly using `npx --yes k6`)
   - **SECURITY TEST CLASSIFICATION**: Security Test
   - **THREAT MAPPING** (ocentra-security-rules.mdc):
     - Rule 15.5: Concurrency as First-Class Threat (Rule 15.5.1, 15.5.2, 15.5.5)
     - Rule 14.10: DDoS & Resource Exhaustion (Rule 14.10.5, 14.10.6)
   - **SECURITY GUARANTEES VERIFIED** (ocentra-security-rules.mdc):
     - Rule 0.1.1 (G1): Economic Safety - "No sequence of actions can increase user value illegitimately"
     - Rule 0.1.4 (G4): State Safety - "No partial failure can be profitable"
   - **INVARIANTS ASSERTED**:
     - Concurrent purchase requests maintain balance correctness
     - Economic correctness under load (no double spending)
     - Graceful degradation under load (Rule 4.3.1)
   - **WHAT FAILURE MEANS**: If correctness rate drops, concurrent requests can cause economic violations
   - **Default test file**: `tests/k6/concurrency.test.js` (invoked by `npm run test:load`). Other k6 scripts in `tests/k6/` (e.g. `badge-concurrent-unlock.test.js`, `idempotency-concurrent.test.js`) can be run manually: `k6 run tests/k6/<script>.js`.

2. **CodeQL** - Static analysis
   - Command: `codeql database create ...` and `codeql database analyze ...`
   - Installation: Download from https://github.com/github/codeql-cli-binaries/releases
   - Purpose: Advanced static analysis for security vulnerabilities
   - Status: ✅ Correct

3. **Trivy** - Vulnerability scanning
   - Command: `trivy fs --severity CRITICAL,HIGH ...`
   - Installation: See https://aquasecurity.github.io/trivy/latest/getting-started/installation/
   - Purpose: Scans for known vulnerabilities in dependencies
   - Status: ✅ Correct
   - **SECURITY TEST CLASSIFICATION**: Security Test
   - **THREAT MAPPING** (ocentra-security-rules.mdc):
     - Rule 11.1: CI/CD & Supply Chain (Rule 11.1.1, 11.1.2)
   - **SECURITY GUARANTEES VERIFIED** (ocentra-security-rules.mdc):
     - Rule 0.1.1 (G1): Economic Safety - "Attacker cost ≥ system cost" (prevents supply chain attacks)
   - **INVARIANTS ASSERTED**:
     - No CRITICAL or HIGH vulnerabilities in dependencies
     - Dependency integrity maintained
   - **WHAT FAILURE MEANS**: Known vulnerabilities in dependencies create exploit vectors

## System Tools

1. **PowerShell** (Windows only)
   - Command: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File ...`
   - Purpose: Used by legacy scripts where needed (e.g. file execution). Worker logs use NDJSON/tunnel; wrangler tail is not used.
   - Status: ✅ Correct

## Summary

All tools are now correctly invoked:
- ✅ npm packages use `npx` or `npm run`
- ✅ Python tools are called directly (not via npx)
- ✅ Standalone binaries are called directly (not via npx)
- ✅ Error handling detects missing tools and provides installation instructions

## Installation Checklist

To run the full test suite, install:

- [x] Node.js and npm (for npm packages)
- [ ] schemathesis: `pip install schemathesis`
- [ ] semgrep: `pip install semgrep`
- [ ] k6: Platform-specific (see above)
- [ ] CodeQL: Download from GitHub releases
- [ ] Trivy: Platform-specific (see above)
