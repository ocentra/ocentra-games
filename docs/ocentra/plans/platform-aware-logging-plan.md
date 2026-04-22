# Implementation Plan: Platform-Aware Logging Architecture

This plan outlines the transition from monorepo-hardcoded logging to a flexible, tiered architecture that supports Development, Desktop/Mobile (Tauri), and Web platforms.

## 1. Core Architectural Changes (logging-domain)

### 1.1 Transport Decoupling
Introduce `ILogTransport` to allow multiple destinations (Console, Bridge, Tauri/Native, Analytics).
- [x] Create `ILogTransport` interface.
- [x] Update `BaseLogger` to support multiple transports.
- [x] Refactor `MainAppLogger` and `AssetEditorLogger` to iterate over transports.

### 1.2 Storage & Retention
Refactor `createAppLogStorage` and `appNdjsonWriter` to be platform-agnostic and support session retention.
- [x] Update `getDefaultAppDbPath` to avoid `fs` operations in non-Node environments.
- [x] Implement `keepCount` in `deleteAppNdjsonFiles` for rolling session logs.
- [x] Configure retention: Desktop (10 sessions), Mobile/Web (2-5 sessions).

### 2. Validation & Testing
- [x] Create `transport.test.ts` (unit tests for transports and retention).
- [x] Create `smoke-test-logging.ts` (physical filesystem validation).
- [x] Verify: `npx tsx scripts/smoke-test-logging.ts` passes.
- [x] Build and Lint: Monorepo build and root lint pass with zero errors.
    - Resolves the native log directory (`AppData` or `~/Library/Logs`).
    - Writes entries to `.ndjson` files.
    - (Optional) Manages a local DuckDB for on-device log querying.

### 2.2 Web (Production)
- [ ] Implement `AnalyticsTransport` (e.g., Sentry, Axiom) for high-level monitoring.
- [ ] Use `BridgeTransport` only for development or internal dashboards.

## 3. Integration Walkthrough

### 3.1 Main App & Asset Editor
Update initialization logic to detect environment and register appropriate transports.

```typescript
// Example Initialization in App
const logger = MainAppLogger.instance;

if (window.__TAURI__) {
  // Use native Rust logging for built desktop app
  const { invoke } = await import('@tauri-apps/api/core');
  logger.addTransport(new TauriTransport(invoke));
} else if (process.env.NODE_ENV === 'development') {
  // Use bridge for local dev
  logger.addTransport(new BridgeTransport(DEFAULT_BRIDGE_URL));
}
```

## 4. Benefits
- **Zero Cost**: Local NDJSON/DuckDB on desktop apps doesn't incur 3rd-party costs.
- **Privacy**: User logs stay on their machine unless a critical error triggers an analytics upload.
- **Unified API**: Developers use the same `logger.info()` call everywhere; the transport layer handles the "where" and "how".

---
**Next Steps**:
1. Implement `TauriTransport` in `logging-domain`.
2. Refactor `AppLogDuckDb` to handle non-Node environments safely.
3. Update Asset Editor's initialization to use the new architecture.
