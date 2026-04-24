# Option A Proposal: Source-First Workspace Resolution (Permanent Fix)

## Objective

Eliminate recurring stale `dist` failures by making local development, type-checking, and tests resolve workspace packages from source (`src`) instead of package build artifacts (`dist`).

This plan intentionally avoids short-term script patches and addresses the root cause: resolver topology mismatch across TypeScript, Vite, Vitest, and workspace package exports.

---

## Problem Statement

### What keeps breaking

The repo behaves inconsistently because:

1. Workspace packages (for example `@ocentra/core-ui`, `@ocentra/game-asset-domain`) export from `dist`.
2. Some workflows rebuild dependencies, others do not.
3. Consumers (`asset-editor`, `main-app`) type-check and run against whatever `dist` currently contains.

Result:

- `src` changes in a dependency package can be invisible to a consumer until manual rebuild.
- Old declarations in `dist/*.d.ts` create false compile/runtime failures.
- Turbo helps schedule tasks but does not alter module resolution semantics.

### Why this will keep recurring without architecture change

As long as local tooling resolves workspace deps via `dist`, stale output is always possible.
No amount of discipline can guarantee everyone runs exactly the right build chain every time.

---

## Non-Goals

- No temporary script-only workaround (for example forcing extra prebuild in one package script).
- No dependency on manual “remember to rebuild package X.”
- No CI-only fixes that leave local dev unstable.

---

## Target End State

For local workspace development:

- TS/Vite/Vitest/Node resolve `@ocentra/*` workspace dependencies to **source**.
- `dist` freshness is no longer a local blocker for app/editor iteration.
- CI and release pipelines can still use dist-oriented package boundaries for publish realism.

In short:

- **Dev mode:** source-first
- **CI/release mode:** dist-first (explicit)

---

## Architecture Overview

### Resolution Modes

#### Mode 1: Workspace Dev Resolution (new default for local app/editor work)

- `asset-editor` and root app consume workspace package source through explicit alias mapping.
- Type declarations are derived directly from source during TS analysis.
- Vite/Vitest runtime imports follow same source mapping.

#### Mode 2: Package Dist Resolution (for CI publish integrity)

- Package exports stay valid and tested against `dist`.
- Build and publish checks continue validating external-consumer behavior.

This dual-mode model preserves package hygiene while removing local stale-dist fragility.

---

## Design Principles

1. **Single resolver truth**  
   Maintain one canonical workspace alias map consumed by TS + Vite + Vitest.

2. **No hidden fallback to dist in local dev**  
   Local app/editor commands should not accidentally resolve workspace deps from `dist`.

3. **Toolchain parity**  
   Type checking and runtime must resolve the same targets.

4. **Deterministic CI boundary**  
   CI must still test package export correctness to prevent publish regressions.

5. **Incremental migration with measurable gates**  
   Roll out package groups in phases; each phase has objective pass criteria.

---

## Scope

### In scope

- Root app + `packages/asset-editor` resolution behavior.
- Shared workspace package dependency consumption (`@ocentra/*`).
- TS + Vite + Vitest + Node script resolver consistency.
- CI guardrails to prevent alias leakage in emitted declarations.

### Out of scope

- Replacing package exports architecture entirely.
- Monorepo tool replacement.
- Runtime feature development unrelated to resolver behavior.

---

## Proposed Implementation

## Phase 0: Inventory and Resolver Baseline

### Goals

- Enumerate current resolution paths for all app/editor workspace imports.
- Identify where `dist` is currently consumed in local commands.
- Capture baseline failure examples and timings.

### Tasks

1. Create dependency matrix:
   - Consumer (`main app`, `asset-editor`) -> dependency package -> current resolved path.
2. Record command matrix:
   - `type-check`, `dev`, `test`, `lint`, script runners.
3. Flag inconsistent behavior where one command path resolves source and another resolves dist.

### Deliverables

- `resolver-baseline.md` under `.cursor/plans` appendix section.
- List of packages to migrate first (high impact/high churn).

---

## Phase 1: Canonical Workspace Alias Map

### Goals

- Define one canonical alias source for workspace dependencies.
- Avoid duplicating alias definitions across tools.

### Tasks

1. Add a root-level alias map module (for example `scripts/config/workspace-source-aliases.ts`) containing:
   - `@ocentra/core-ui/*` -> `packages/core-ui/src/*`
   - `@ocentra/game-asset-domain/<subpath>` -> mapped source file roots
   - same for other frequently consumed workspace packages.
2. Add helper builders:
   - Vite alias output
   - Vitest alias output
   - TS paths output generator (or checked-in sync file).

### Constraints

- No wildcard that masks third-party packages.
- Must preserve existing `@/` app aliases.

### Deliverables

- Canonical alias file.
- A small validation script that checks alias targets exist.

---

## Phase 2: TypeScript Source-First Resolution

### Goals

- Ensure `asset-editor` and root app TS checks resolve workspace dependencies to source.

### Tasks

1. Add generated or maintained `paths` in:
   - `packages/asset-editor/tsconfig.json`
   - root app tsconfig(s) used by `type-check`.
2. Include workspace subpath mappings where needed, not just top-level package names.
3. Validate by tracing resolution:
   - `tsc --traceResolution` spot checks for key imports.

### Pass Criteria

- `type-check` for app/editor succeeds with source-first resolution and no dependency package rebuild precondition.

---

## Phase 3: Vite + Vitest Runtime Alignment

### Goals

- Runtime behavior in dev/test matches TS compile-time resolution.

### Tasks

1. Apply same alias map in:
   - root `vite.config.ts`
   - `packages/asset-editor/vite.config.ts`
   - relevant Vitest configs (`vitest.config.ts`, editor config variants).
2. Ensure no resolver divergence:
   - import from app/editor hits source path in both dev server and tests.
3. Add a resolution smoke test:
   - logs/resolves module URL for a known workspace dependency and asserts source path.

### Pass Criteria

- No command path in dev/test consumes stale `dist` for mapped workspace packages.

---

## Phase 4: Node Script Compatibility

### Goals

- Scripts run consistently with source-first dependency resolution where required.

### Tasks

1. Audit scripts that import workspace packages directly (tsx/node).
2. For scripts needing source-first behavior:
   - run through tsx with matching tsconfig paths and ESM resolver support.
3. For scripts that must remain dist-oriented:
   - explicitly document as release/package integrity scripts.

### Pass Criteria

- No script silently mixes source and stale dist for same dependency in one workflow.

---

## Phase 5: CI Mode Separation and Guardrails

### Goals

- Keep dev DX source-first while preserving publish correctness.

### Tasks

1. Add explicit CI checks for dist correctness:
   - package build
   - export import smoke checks
   - declaration scan for private aliases (`@/` leakage in dist `.d.ts`).
2. Separate commands:
   - `validate:workspace` (source-first local-integrity checks)
   - `validate:dist` (publish/export integrity checks).
3. Ensure CI runs both modes where applicable.

### Pass Criteria

- CI fails on declaration alias leakage and export contract drift.
- Local dev no longer blocked by dist freshness.

---

## Phase 6: Progressive Package Expansion

### Goals

- Start with highest pain packages, then extend coverage.

### Migration Order (recommended)

1. `@ocentra/core-ui`
2. `@ocentra/game-asset-domain`
3. `@ocentra/game-domain`
4. `@ocentra/asset-domain`
5. remaining `@ocentra/*` as needed

### Strategy

- Migrate package group -> run gates -> merge.
- Avoid all-at-once blast radius.

---

## Technical Risks and Mitigations

## Risk 1: Alias mismatch across TS/Vite/Vitest

- **Impact:** compile passes but runtime fails (or reverse).
- **Mitigation:** single canonical alias source, generated consumers, parity tests.

## Risk 2: ESM/CJS edge behavior in scripts

- **Impact:** script import failures.
- **Mitigation:** explicit script mode policy and targeted wrappers for source-first scripts.

## Risk 3: Subpath alias incompleteness

- **Impact:** partial fallback to dist.
- **Mitigation:** resolver trace tests for critical subpaths, automated missing mapping detector.

## Risk 4: Performance regressions in local dev

- **Impact:** slower startup from source transpilation.
- **Mitigation:** optimize include/exclude in Vite; map only workspace packages actually used by each consumer.

## Risk 5: Hidden declaration-quality regressions

- **Impact:** publish consumers break later.
- **Mitigation:** retain dist validation CI with `.d.ts` alias-leak scanning.

---

## Acceptance Criteria (Definition of Done)

1. `asset-editor` type-check succeeds immediately after editing source in a dependency package without rebuilding that package dist.
2. `asset-editor` tests/dev resolve same dependency imports to source paths.
3. Root app dev/typecheck similarly source-first for selected workspace packages.
4. CI has explicit dist integrity checks (export + declaration hygiene).
5. No recurring stale-dist incidents for migrated packages across two full sprint cycles.

---

## Validation Matrix

For each migrated package:

1. Edit a type in dependency source (breaking + non-breaking case).
2. Run in consumer without dependency rebuild:
   - `type-check`
   - `test`
   - `dev` startup.
3. Confirm behavior matches source change immediately.
4. Run CI dist validation to ensure publish surface remains correct.

---

## Operational Rollout Plan

## Stage 1 (Pilot)

- Apply Option A to `asset-editor` + `core-ui` + `game-asset-domain`.
- Measure:
  - stale-dist incidents
  - command reliability
  - local iteration time.

## Stage 2 (Expand)

- Add root app with same alias framework.
- Migrate additional `@ocentra/*` packages by priority.

## Stage 3 (Standardize)

- Document source-first as default workspace pattern.
- Add guardrail CI checks and onboarding docs.

---

## Backout Strategy

If migration causes critical regressions:

1. Keep canonical alias map but disable package group entries via config flag.
2. Revert affected consumer to dist resolution temporarily.
3. Keep CI declaration/export checks to avoid regressions while remediating.

Backout is configuration-level, not codebase-wide rollback.

---

## Ownership and Responsibilities

- **Platform/Tooling Owner:** alias framework, config integration, CI checks.
- **App/Editor Owners:** validate runtime parity and command workflows.
- **Domain Package Owners:** ensure source imports and declaration hygiene.

---

## Documentation Updates Required

1. `AGENTS.md`:
   - add workspace resolution policy section.
2. `.cursor/rules` (if desired):
   - codify source-first local resolver expectation.
3. `docs/ocentra`:
   - add monorepo resolution architecture and troubleshooting.

---

## Success Metrics

1. Stale-dist incident count: target near-zero after migration.
2. First-run local command reliability:
   - `type-check`/`test` success without hidden prebuild steps.
3. Reduced “works after rebuild” class of failures.
4. CI catches declaration/export issues before merge.

---

## Decision Log

- Chosen approach: **Option A (source-first local workspace resolution)**.
- Rejected:
  - ad hoc prebuild-only patches
  - discipline-based “always build first” process
  - Turbo-only expectation as resolver fix.

---

## Next Action Checklist

1. Approve this architecture and migration order.
2. Implement Phase 1 canonical alias source.
3. Integrate Phase 2+3 for `asset-editor` pilot.
4. Run pilot validation matrix and publish results.

