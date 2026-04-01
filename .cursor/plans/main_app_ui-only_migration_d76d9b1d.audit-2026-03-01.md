# Main App UI-Only Migration Reality Re-Audit (AI + Storage)

**Date:** 2026-03-01  
**Audited against:** [.cursor/plans/main_app_ui-only_migration_d76d9b1d.plan.md](/E:/ocentra-games/.cursor/plans/main_app_ui-only_migration_d76d9b1d.plan.md), [.cursor/plans/fix_codex_audit_findings_9a9c0a75.plan.md](/E:/ocentra-games/.cursor/plans/fix_codex_audit_findings_9a9c0a75.plan.md)

## Executive Verdict

The "fixed/completed" claim is still false.

1. Real migration progress happened.
2. Main app is still not UI-only for AI/storage concerns.
3. Mobile persistence is still not implemented end-to-end.
4. Quality gates are improved but still below AAA desktop/mobile readiness.

## Scoreboard (Strict)

| Status | Count |
|---|---|
| Done | 14 |
| Partial | 23 |
| Not Done | 5 |

Scope counted: Tier 1, Tier 2, Tier 3, Tier 5, Tier 6, Tier 7, A1-A12 (with `3.0/4.1` treated as one contract item).

## Plan Status Matrix (Done vs Partial vs Not Done)

| Item | Status | Reality |
|---|---|---|
| 1.1 Storage event timeout safety | Partial | Timeout exists, but fixed constant + generic timeout message; not fully configurable per plan. |
| 1.2 Remove no-op register callback | Done | No-op callback path removed; bootstrap uses direct options. |
| 1.3 SettingsAdapter replacement | Partial | Adapter type exists, but runtime wiring is incomplete and fallback still uses `localStorage`. |
| 1.4 PlatformUrlAdapter replacement | Partial | Adapter implemented and used, but host runtime injection not consistently wired. |
| 1.5 Platform detection routing | Partial | Web/desktop/mobile routing exists, but detection coverage is incomplete (Tauri/main-renderer nuances). |
| 1.6 Skip IDB when unavailable | Done | Guards are in place for warmup and cache initialization. |
| 1.7 IndexedDB open guard | Done | Explicit guard added in storage-domain. |
| 2.1 Persistent mobile backend | Not Done | Mobile bootstrap still uses in-memory fallback for non-prod; no production-grade persistent path wired. |
| 2.2 Move IDB settings adapter to storage-domain | Done | Moved out of main app and imported from storage-domain. |
| 2.3 Slim initModelManager | Partial | Still contains orchestration/config/state logic, not pure wiring. |
| 2.4 Slim AIManager | Partial | Thinner, but main-app AI orchestration still exists via app-side adapter flow. |
| 2.5 UI uses facade, not low-level storage client | Done | Model selector uses higher-level facade path. |
| 2.6 Slim ModelAsset/Quant services | Done | Main app services are thin pass-throughs; adapter setup centralized. |
| 2.7 PathResolver / app-data injection | Partial | Resolver exists; host-specific resolver wiring is incomplete. |
| 2.8 Refactor bootstrapModelStorage | Done | Supports injected model cache or IDB path with fail-fast. |
| 2.9 Non-IDB image/analytics cache | Partial | Skip behavior exists; alternative non-IDB cache backend implementations are still missing. |
| 3.0/4.1 Event handler contract cleanup | Partial | Required capability checks exist, but contract still optional-heavy. |
| 3.1 Path normalization | Done | Platform-aware default paths implemented and tested. |
| 3.2 UNC + long-path handling | Partial | UNC rejection exists; long-path handling still missing. |
| 3.3 Large blob streaming/chunking | Partial | Chunking exists, but common full-buffer assembly paths remain. |
| 3.4 keys() pagination/limits | Not Done | No pagination/limit strategy in adapter key scans. |
| 3.5 IDB quota handling | Partial | Eviction logic exists, explicit quota recovery flow not complete. |
| 3.6 RuntimeConstraintsAdapter | Not Done | Not implemented. |
| 3.7 Pipelines/fetch docs | Partial | Partial documentation, insufficient operational detail. |
| 5.0 Platform support matrix docs | Partial | Matrix exists, but some expected architecture docs are missing. |
| 5.1 Adapter selection docs | Done | Documented clearly in matrix. |
| 5.2 Host injection docs | Done | Documented and aligned with bootstrap API. |
| Tier 6 provider catalog audit | Done | Registry/catalog audit test exists and passes. |
| 7.1 storage-domain tests | Partial | Test setup exists, but coverage depth is insufficient for AAA. |
| 7.2 ai-domain browser-local tests | Done | Unit path stabilized and package tests pass. |
| 7.3 verification checklist | Partial | Checklist exists, but manual/CI smoke evidence remains incomplete. |
| A1 bootstrap idempotency | Partial | Teardown paths exist, but lifecycle wiring is incomplete end-to-end. |
| A2 startup order enforcement | Done | Storage-before-AI guard and regression test exist. |
| A3 WorkerSecretAdapter cleanup | Partial | Stub runtime path removed, but stale docs still reference old stub behavior. |
| A4 token/secret hardening | Partial | Policy doc exists; plaintext persistence paths still present. |
| A5 cache integrity/recovery | Not Done | No checksum validation and purge/refetch recovery path. |
| A6 tighten adapter contract | Partial | Fail-fast added, but strict split between required/optional contracts is incomplete. |
| A7 anti-regression CI gates | Partial | Boundary gate added, but missing full guard set (including IDB schema drift checks in app). |
| A8 mandatory regressions | Partial | Startup-order test exists; duplicate-bootstrap and persistence smoke tests still missing. |
| A9 no prod in-memory mobile fallback | Done | Production mobile hard-fails if persistent backend unavailable. |
| A10 adapter-only fetch in ai-domain | Not Done | Direct global `fetch` still exists in ai-domain runtime services. |
| A11 BrowserLocal manifest injection | Partial | Injection hook added, but fallback dynamic import remains in provider path. |
| A12 broaden import restrictions | Partial | Rule exists, but restriction scope and allowlist policy are not complete. |

## Main App Boundary Check (Strict)

### Legit in main app (currently acceptable)

1. Thin domain wiring/bootstrap entrypoints.
2. UI page state and UI-facing service pass-through wrappers.

### Violations still in main app (must move out)

1. AI orchestration/config logic in [src/ai/initModelManager.ts](/E:/ocentra-games/src/ai/initModelManager.ts).
2. Game-mode AI orchestration in [src/lib/managers/ai/AIGameAdapter.ts](/E:/ocentra-games/src/lib/managers/ai/AIGameAdapter.ts).
3. Pipeline state orchestration in [src/lib/managers/pipelines/PipelineStateManager.ts](/E:/ocentra-games/src/lib/managers/pipelines/PipelineStateManager.ts).
4. Platform storage policy/fallback decisions in [src/bootstrap/storageBootstrap.ts](/E:/ocentra-games/src/bootstrap/storageBootstrap.ts).

Main conclusion: boundary is improved, but still mixed. Not UI-only yet.

## Quality Gate Reality (Latest Command Evidence)

1. `cd packages/storage-domain && npm test` passed (3 files, 10 tests).
2. `cd packages/ai-domain && npm test` passed (18 files, 225 tests, 4 skipped).
3. `npm run lint` (root) passed (warnings only).
4. `npm test` (root) failed in this workspace, including network-dependent/integration failures.

## AAA Blockers (No-BS Priority)

1. Finish real mobile persistence wiring (2.1) and restart persistence smoke tests (A8).
2. Remove direct global fetch from ai-domain runtime services (A10).
3. Implement cache integrity validation and corruption recovery (A5).
4. Add key-scan scale controls and quota recovery hardening (3.4, 3.5).
5. Complete strict adapter contract split and CI boundary enforcement breadth (A6, A7, A12).

## Bottom Line

This is not fake progress, but it is not done.  
Current state is a serious partial migration with real improvements and real unresolved risk.
