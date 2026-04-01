# Test UI – minimal UI to drive Cloudflare API

Single-page test UI for **lobby**, **matchmaking**, **presence**, **auth**, **audit**, **transparency**, **compliance**, **data**, **shop**, **social (Plan G)**, and **marketplace/tournament (Plan H)**. Use it to verify backend behaviour without wiring the main app. Works with manual clicks or **Playwright** E2E.

## What it does

- **Config**: API base URL, user ID, origin (CORS). Same auth as tests: `Bearer test-token:<userId>`.
- **Auth**: GET profile to confirm token works.
- **Lobby**: List rooms, create room (host), join/leave by room ID.
- **Matchmaking**: Join queue, leave queue, get status.
- **Presence**: Get status, update status (online / away / in-lobby / in-game / offline).
- **Audit / Transparency / Compliance / Data**: Log, query, verify, export, report.
- **Shop**: List products, get product by ID.
- **Admin Products (Plan A)**: List products, get product by ID (admin API).
- **Social (Plan G)**: Message list (by conversation), feed list, party create/state, notification list.
- **Marketplace & Tournament (Plan H)**: Marketplace list, tournament bracket by ID.
- **Sync & Replay (Plan B)**: Sync health, get replay by match ID.
- **Progression & Rewards (Plan E)**: Get XP, daily status, claim daily.
- **Guardian Shield (Plan F)**: Fraud check, anticheat report, security event.
- **Log**: All requests and responses are logged in the page (approx behaviour) and to console.

## Run manually

1. **Start the worker** (in this directory: `infra/cloudflare`):
   ```bash
   npm run dev
   ```
   Worker runs at `http://localhost:8787` (or port from wrangler).

2. **Serve the test UI** (from `infra/cloudflare`):
   ```bash
   npx serve tests/test-ui -l 3999
   ```
   Or use any static server; serve `tests/test-ui` on a port your worker CORS allows (e.g. dev often allows localhost).

3. **Open in browser**:
   ```
   http://localhost:3999
   ```
   Set **API base** to `http://localhost:8787` if needed. Click through Lobby, Matchmaking, Presence.

   Optional query: `?apiBase=http://localhost:8787` so the page loads with that base.

## Run Playwright E2E

From `infra/cloudflare`:

1. **Install Playwright browsers** (once):
   ```bash
   npx playwright install chromium
   ```

2. **Start the worker** in one terminal:
   ```bash
   npm run dev
   ```

3. **Run Playwright** (starts test-ui server and runs specs):
   ```bash
   npm run test:ui:e2e
   ```

Playwright starts the test-ui static server on port 3999 and runs `tests/test-ui/e2e/*.spec.ts`. Specs assume the worker is at `http://localhost:8787` and pass `apiBase` in the URL so the test UI calls the worker.

## CORS

In **development** the worker often allows any origin. If you get CORS errors, set **Origin** in the test UI to the exact origin of the page (e.g. `http://localhost:3999`). For pool/integration tests, `CORS_ORIGIN` in test bindings is `http://localhost:5173`; dev `wrangler dev` may allow other localhost origins. Use the same origin as the page if needed.

## Adding more flows

- Add buttons and handlers in `app.js`, result areas in `index.html`, and `data-testid` for Playwright.
- Add new specs in `tests/test-ui/e2e/*.spec.ts`.
- Use the log area (and console) to confirm request/response behaviour.
