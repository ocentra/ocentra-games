# Phase 1: crypto-domain – Migration Plan

**Audit reference:** `docs/ocentra/Architecture/MAIN-APP-UI-ONLY-AUDIT-REPORT.md` lines 530-533

**Goal:** Extract `src/services/crypto/*` into `packages/crypto-domain` with the same structure, tooling, and quality as existing domains.

---

## 1. What Existing Domains Look Like

### 1.1 Reference Domains Reviewed

| Domain | Dependencies | Exports style | Tests |
|--------|--------------|---------------|-------|
| **boundary-domain** | None | Direct per-file (no barrel) | No |
| **storage-domain** | eventing-domain, logging-domain | Direct per-file | vitest |
| **eventing-domain** | boundary-domain, logging-domain | Direct per-file | vitest |
| **endpoint-domain** | effect-schema | Direct per-file | No |

### 1.2 Shared Structure (All Domains)

```
packages/<domain>/
├── package.json       # name: @ocentra/<domain>
├── tsconfig.json      # target ES2022, module ESNext, outDir dist, rootDir src
├── eslint.config.js   # js + tseslint, project ref
├── .gitignore         # dist/, node_modules/, *.tsbuildinfo
├── README.md          # What it owns, usage, relationship to other packages
├── src/
│   └── <structure>/
└── dist/              # emitted by tsc
```

### 1.3 package.json Pattern

- `"type": "module"`
- `"exports"`: **explicit per-file** – no barrel, no `"./": "./dist/index.js"`
- `"scripts"`: `build`, `prepare`, `type-check`, `lint`, `lint:fix`
- `build`: `tsc && tsc-alias` (when using path aliases)
- `devDependencies`: typescript ~5.9.3, tsc-alias, eslint, typescript-eslint
- Dependencies: **minimal** – boundary-domain has none; storage-domain has eventing + logging

### 1.4 tsconfig.json Pattern

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "baseUrl": "./src",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**crypto-domain:** Add `"DOM"` to `lib` for Web Crypto API (`crypto.subtle`).

### 1.5 Export Convention

- **No barrel imports.** Each export is explicit:
  ```json
  "./services/HashService": { "import": "./dist/services/HashService.js", "types": "./dist/services/HashService.d.ts" }
  ```
- Consumers import: `import { HashService } from '@ocentra/crypto-domain/services/HashService'`

---

## 2. Current Crypto Services

| File | Dependencies | Notes |
|------|--------------|-------|
| **HashService.ts** | None (uses `crypto.subtle`) | Pure SHA-256 hash |
| **KeyManager.ts** | None | Ed25519 key generation, import/export |
| **SignatureService.ts** | `@ocentra/logging-domain` (MainAppLogger, getStackTrace) | Sign/verify Ed25519; **logging must be removed** for "no internal app deps" |

### 2.1 SignatureService Logging Removal

**Current:** On `verifySignature` failure, calls `logError(...)`.

**Decision:** Remove logging from crypto-domain. Audit requires "small, self-contained, no internal app deps". Callers (MatchVerifier, BatchManager, MatchCoordinator) can log if needed. The domain returns `false` on verification failure; that contract stays.

**Change:** Delete the logging import and `logError` call in the `catch` block. Keep the `return false`.

---

## 3. Consumers (Must Update Imports)

| Consumer | Current Import | New Import |
|----------|----------------|------------|
| src/services/solana/MerkleBatching.ts | @services/crypto/HashService | @ocentra/crypto-domain/services/HashService |
| src/services/solana/MatchCoordinator.ts | @services/crypto/HashService, SignatureService | @ocentra/crypto-domain/services/HashService, SignatureService |
| src/services/solana/BatchManager.ts | @services/crypto/SignatureService | @ocentra/crypto-domain/services/SignatureService |
| src/services/verification/MatchVerifier.ts | @services/crypto/HashService, SignatureService | @ocentra/crypto-domain/services/HashService, SignatureService |
| src/services/__tests__/integration/match-lifecycle.test.ts | @services/crypto/HashService | @ocentra/crypto-domain/services/HashService |
| src/services/__tests__/benchmarks/verification.bench.ts | @services/crypto/HashService | @ocentra/crypto-domain/services/HashService |
| scripts/solana/verification/canonicalize.ts | @services/crypto/HashService | @ocentra/crypto-domain/services/HashService |
| scripts/test/load-test/merkle-batching-benchmark.ts | @services/crypto/HashService | @ocentra/crypto-domain/services/HashService |
| scripts/test/measure-costs/measure-batch-costs.ts | @services/crypto/HashService | @ocentra/crypto-domain/services/HashService |

**Scripts:** May use `@services/*` via tsconfig paths. Ensure scripts' tsconfig / bundler resolves `@ocentra/crypto-domain` (e.g. workspace dependency).

---

## 4. Proposed Package Layout

```
packages/crypto-domain/
├── package.json
├── tsconfig.json
├── eslint.config.js
├── .gitignore
├── README.md
├── src/
│   ├── services/
│   │   ├── HashService.ts
│   │   ├── KeyManager.ts
│   │   └── SignatureService.ts
│   └── types/
│       └── SignatureRecord.ts   # extract interface from SignatureService
└── tests/
    └── HashService.test.ts      # unit tests for hash logic
```

**Optional:** Extract `SignatureRecord` into `types/SignatureRecord.ts` if we want a clean types export. Currently it's in `SignatureService.ts` – acceptable to leave there for minimal scope.

---

## 5. package.json (Draft)

```json
{
  "name": "@ocentra/crypto-domain",
  "version": "1.0.0",
  "type": "module",
  "description": "Cryptographic primitives for match hashing and Ed25519 signing. Shared by main app, Solana services, and scripts.",
  "exports": {
    "./services/HashService": {
      "import": "./dist/services/HashService.js",
      "types": "./dist/services/HashService.d.ts"
    },
    "./services/KeyManager": {
      "import": "./dist/services/KeyManager.js",
      "types": "./dist/services/KeyManager.d.ts"
    },
    "./services/SignatureService": {
      "import": "./dist/services/SignatureService.js",
      "types": "./dist/services/SignatureService.d.ts"
    }
  },
  "scripts": {
    "build": "tsc && tsc-alias",
    "prepare": "npm run build",
    "type-check": "tsc --noEmit",
    "lint": "eslint --cache src && tsc --noEmit",
    "lint:eslint": "eslint --cache src",
    "lint:fix": "eslint --cache src --fix",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@eslint/js": "^9.15.0",
    "eslint": "^9.15.0",
    "globals": "^15.12.0",
    "tsc-alias": "^1.8.16",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.15.0",
    "vitest": "^2.0.0"
  }
}
```

**Dependencies:** None. Zero runtime deps; only Web Crypto API.

---

## 6. build:domains Order

Root `build:domains` currently:

```
logging → endpoint → boundary → eventing → ai → asset → storage → card-games
```

crypto-domain has **no domain dependencies**. It can be built **first** (with logging, endpoint, boundary) or in parallel. Simplest: add after `logging-domain`:

```
logging → crypto → endpoint → boundary → eventing → ai → asset → storage → card-games
```

---

## 7. Root package.json

Add to `dependencies`:

```json
"@ocentra/crypto-domain": "file:./packages/crypto-domain"
```

Add to `build:domains` script (after logging-domain):

```
cd packages/logging-domain && npm run build && cd ../crypto-domain && npm run build && cd ../endpoint-domain && ...
```

---

## 8. tsconfig References

- Add `packages/crypto-domain` to root `tsconfig.json` references if using project references (optional).
- Ensure `tsconfig.app.json` can resolve `@ocentra/crypto-domain` via the workspace dependency (no extra config needed when using `file:` deps).

---

## 9. Tests

Per `ocentra-test-rules.mdc`:

- **HashService:** Deterministic hash output; same input → same output. Test with known vectors.
- **KeyManager:** Generate/import/export round-trip; reject invalid hex.
- **SignatureService:** Sign then verify round-trip; verify rejects tampered payload; verify rejects wrong key.

Use **vitest**, same as storage-domain. No mocks for crypto logic – test real behavior.

---

## 10. Checklist (Execution Order)

1. [x] Create `packages/crypto-domain/` directory
2. [ ] Create `package.json` (no deps, explicit exports)
3. [ ] Create `tsconfig.json` (lib: ES2022, DOM)
4. [ ] Create `eslint.config.js` (mirror boundary-domain)
5. [ ] Create `.gitignore`
6. [ ] Copy `HashService.ts`, `KeyManager.ts` into `src/services/`
7. [ ] Copy `SignatureService.ts` into `src/services/`, **remove** logging-domain import and `logError` call
8. [ ] Add `vitest.config.ts` if needed (or use default)
9. [ ] Add unit tests for HashService, KeyManager, SignatureService
10. [ ] Create `README.md`
11. [ ] Add `@ocentra/crypto-domain` to root `package.json` and `build:domains`
12. [ ] Update all 9 consumers to import from `@ocentra/crypto-domain`
13. [ ] Delete `src/services/crypto/` from main app
14. [ ] Remove `@services/crypto/*` path if it becomes unused (or leave for other services)
15. [ ] Run `npm run build:domains` and `npm run build` from root
16. [ ] Run `npm test` and integration tests

---

## 11. README.md Outline

- **Purpose:** Single source for match hashing (SHA-256) and Ed25519 signing/verification.
- **What it owns:** HashService, KeyManager, SignatureService.
- **Consumers:** Main app (via solana services), scripts, Cloudflare worker (if applicable).
- **No barrel imports.** Import from specific paths.
- **Usage example:**
  ```ts
  import { HashService } from '@ocentra/crypto-domain/services/HashService';
  import { SignatureService } from '@ocentra/crypto-domain/services/SignatureService';
  ```

---

## 12. Risks and Notes

| Risk | Mitigation |
|------|------------|
| Scripts can't resolve `@ocentra/crypto-domain` | Ensure scripts run from repo root; workspace `file:` dep should work |
| KeyManager uses deprecated `substr` | Already fixed in SignatureService (`substring`); check KeyManager |
| Web Crypto in Node <19 | Scripts and app use Node 22+; acceptable |
| Tests need DOM/Web Crypto | Vitest uses Node; Node 19+ has `crypto.subtle` globally |

---

**Plan complete.** Execute checklist to create and wire crypto-domain.
