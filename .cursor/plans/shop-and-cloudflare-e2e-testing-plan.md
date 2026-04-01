# Shop + Cloudflare E2E Testing Plan

**Goal:** Don’t struggle with “shop works in isolation but not in the app” again. Tests should cover the **real path**: browser → Vite (3000) → proxy/middleware → worker (8787).

---

## 1. What We Have Today (Audit)

### 1.1 Tests that hit the **worker only** (no Vite, no proxy)

| Test | Location | What it does | Path covered |
|------|----------|--------------|--------------|
| **admin-products-shop.test.ts** | infra/cloudflare/tests/integration/ | `worker.fetch(TestApiUrlPlaceholder + /api/v1/shop/products)` | Worker + KV only |
| **shop-ui-payment.test.ts** | infra/cloudflare/tests/e2e/ | Worker: init payment, webhook, balance | Worker only |
| **shop.spec.ts** (Test UI) | infra/cloudflare/tests/test-ui/e2e/ | Playwright on port **3999**, `?apiBase=http://localhost:8787` | Static test harness → **direct 8787** |
| **real-worker.test.ts** | infra/cloudflare/tests/e2e/ | Various endpoints via worker.fetch() | Worker only |

**Conclusion:** None of these go through Vite. The bug we hit (serve-duckdb returning 404 for `/api/v1/shop/products`) would **not** be caught by any of them.

---

### 1.2 Tests that **do** go through the app (Vite + proxy)

| Test | Location | What it does | Path covered |
|------|----------|--------------|--------------|
| **shop-purchase.spec.ts** | src/ui/pages/Shop/__tests__/e2e/ | Playwright: baseURL **3000**, `page.goto('/shop')`, asserts Treasury tab (AC packages, Buy buttons, checkout) | **Browser → Vite (3000) → proxy → worker** |

**Playwright config:** `webServer: { command: 'npm run dev', url: 'http://localhost:3000' }`.  
Since `npm run dev` is now full-stack (worker + seed + Vite), when you run `playwright test --project shop-e2e`, the full path is in theory exercised.

**Gap:** The spec only asserts:
- Treasury tab: “Arena Credits”, “100/500/1200 Arena Credits”, Buy buttons, checkout.
It does **not** assert:
- Elite tab: Arena Pass, Champion’s, Founder cards visible.
- That `/api/v1/shop/products` returns subscription products when requested **via the app** (through Vite).

So when the proxy was broken, the products array was empty; “100 Arena Credits” could be missing and the test could fail—but we never had an **explicit** assertion on “subscription products load through the app” or “Elite tab shows membership tiers.”

---

## 2. What We’re Missing (Gaps)

1. **No assertion that the shop API is reachable through Vite**
   - E.g. “GET http://localhost:3000/api/v1/shop/products returns 200 and body.products includes SUBSCRIPTION products.”
   - This would have failed as soon as serve-duckdb returned 404 for unknown `/api` paths.

2. **No E2E assertion that Elite tab shows membership products**
   - E.g. “On /shop, Elite tab shows Arena Pass, Champion’s Pass, Founder.”
   - Would fail if products are empty or API is blocked.

3. **No single place that documents “full dev stack” contract**
   - E.g. “When Vite is running with proxy, these API paths must reach the worker.”
   - So we don’t accidentally break the path again (e.g. new middleware swallowing `/api`).

---

## 3. Plan: What / Where / How

### 3.1 Add E2E that hits the app and asserts subscription products (recommended)

- **What:** Playwright test: open `/shop`, switch to Elite tab, assert that Arena Pass, Champion’s, Founder (or at least one subscription product) are visible.
- **Where:** `src/ui/pages/Shop/__tests__/e2e/shop-purchase.spec.ts` (or a new `shop-elite.spec.ts` in the same folder).
- **How:** Same as existing shop e2e: `baseURL: 3000`, `webServer: npm run dev`. Add a test that:
  - Goes to `/shop`
  - Clicks Elite tab
  - Asserts that subscription tier names (e.g. “Arena Pass”, “Champion’s”, “Founder”) appear in the UI.
- **Why:** This exercises the full path (browser → Vite → proxy → worker) and would have failed when the middleware returned 404.

### 3.2 Optional: “Dev proxy” / “full stack API” test

- **What:** A test that, with the dev server running (or started by the test runner), does `fetch('http://localhost:3000/api/v1/shop/products')` and asserts: status 200, `body.products` is an array, and at least one product has `productType === 'SUBSCRIPTION'`.
- **Where:** Either:
  - A small Node script run in CI after starting `npm run dev` (or dev:full), or
  - A Playwright test that does `page.request.get(baseURL + '/api/v1/shop/products')` and asserts the same.
- **How:** Run only when the full stack is up (e.g. in CI: start worker + Vite, then run this check). Doesn’t require a browser; just HTTP.
- **Why:** Catches “something in front of the worker blocks or alters the shop API” (e.g. middleware, proxy config) without relying on UI.

### 3.3 Optional: Document “dev stack contract”

- **What:** Short doc or comment: “When running `npm run dev`, requests to /api/v1/* must be proxied to the worker. No middleware should return 404 for /api/v1/shop/*.”
- **Where:** e.g. `docs/ocentra/` or next to `vite.config.ts` / `serve-duckdb` (e.g. in a README or ARCHITECTURE).
- **How:** One markdown section or inline comment that future changes (new plugins, middleware) can be checked against.

---

## 4. Recommended order

1. **Do first:** Add the Playwright E2E for Elite tab (Arena Pass / Champion’s / Founder visible). Low effort, high value; uses existing Playwright + dev server setup.
2. **Do next (if you want extra safety):** Add the “dev proxy” test (GET shop products via localhost:3000, assert 200 + subscription in body).
3. **Do when convenient:** Document the dev-stack contract so new middleware/plugins don’t silently break the proxy path.

---

## 5. What each test type catches

| Test type | Catches |
|-----------|--------|
| **Integration (worker only)** | Worker bug, KV wrong/empty, wrong route on worker. |
| **E2E (browser → 3000 → /shop, assert Elite tab)** | Proxy broken, middleware 404, wrong baseURL, UI not showing subscription products. |
| **Dev proxy (GET 3000/api/v1/shop/products)** | Proxy broken, middleware 404, API path misconfigured. |

The bug we hit is in the “E2E” and “Dev proxy” rows; integration alone was not enough.
