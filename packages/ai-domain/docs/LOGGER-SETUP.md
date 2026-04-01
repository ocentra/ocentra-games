# AI Domain – Logger setup

Using the logger is **not** just importing it. The host (main app or Cloudflare Worker) must **set up** the logger so that ai-domain logs go through the same pipeline as the rest of the app (stack traces, batching, storage, etc.).

## Rule

1. **Initialize your environment logger first** (main app singleton or worker `initLogger(...)`).
2. **Build an adapter** that forwards `info` / `warn` / `error` / `debug` to that logger, including **stack trace** (and any env flags) where your logger expects them.
3. **Call `initLogger(...)` from ai-domain** with that adapter **before** any ai-domain code that logs runs.

If you skip this, ai-domain will use a no-op logger and nothing will be emitted.

---

## Main app (Vite / browser)

Your app already has a logger (e.g. `@/lib/logging` with `Logger.instance` and `getStackTrace()`). Use it when building the adapter.

**When:** During app bootstrap (e.g. in `AppInitializer` or before first use of ai-domain).

**Example:**

```ts
import { Logger, getStackTrace } from '@/lib/logging';
import { initLogger } from '@ocentra/ai-domain/logger/runtime';

const log = Logger.instance;
log.register('AiDomain', import.meta.url);

initLogger({
  info: (message, data) => log.logInfo(message, getStackTrace(), data, false),
  warn: (message, data) => log.logWarn(message, getStackTrace(), data, false),
  error: (message, data) => log.logError(message, getStackTrace(), data),
  debug: (message, data) => log.logDebug(message, getStackTrace(), data, false),
});
```

---

## Cloudflare Worker

The worker calls `initLogger(env.ANALYTICS, ...)` at the start of each request so the environment logger is configured. Then set up ai-domain’s logger so it uses that same instance.

**When:** After `initLogger(...)` in your worker’s fetch handler (or once per request if you re-init).

**Example:**

```ts
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import { initLogger } from '@ocentra/ai-domain/logger/runtime';

// After initLogger(env.ANALYTICS, env.MATCHES_BUCKET, ...) has run:
const log = Logger.instance;
log.register(import.meta.url);

initLogger({
  info: (message, data) => log.logInfo(message, getStackTrace(), data, false),
  warn: (message, data) => log.logWarn(message, getStackTrace(), data, false),
  error: (message, data) => log.logError(message, getStackTrace(), data),
  debug: (message, data) => log.logDebug(message, getStackTrace(), data, false),
});
```

---

## Tests

- Use **no-op** if you don’t care about logs: do nothing (default) or call `setLogger(noopLogger)` from `@ocentra/ai-domain/logger/noop`.
- Use **mocks** if you assert on log calls: pass an object with `info`, `warn`, `error`, `debug` and assert they were called.
- In **teardown**, call `resetLogger()` from `@ocentra/ai-domain/logger/runtime` so the next test doesn’t reuse a previous logger.

---

## API summary

| Export | Purpose |
|--------|---------|
| `initLogger(options)` | Preferred: set up logger from host (call once after env logger is ready). |
| `setLogger(instance)` | Alternative: set a full `AiDomainLogger` instance. |
| `getLogger()` | Get current logger (used by ai-domain code; host normally doesn’t call this). |
| `resetLogger()` | Reset to no-op (tests / teardown). |
| `noopLogger` | No-op implementation (tests or “logging disabled”). |

All from `@ocentra/ai-domain/logger/runtime` except `noopLogger` from `@ocentra/ai-domain/logger/noop`.
