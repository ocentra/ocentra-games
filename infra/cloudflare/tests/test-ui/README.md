# Test UI - minimal UI to drive Cloudflare API

Single-page test UI for current Cloudflare Worker routes. Use it to verify backend behavior without wiring the main app. Works with manual clicks or Playwright E2E.

## What it covers

- Config: API base URL, user ID, origin (CORS)
- Auth: GET profile to confirm token works
- Lobby: list rooms, create room, join, leave
- Matchmaking: join queue, leave queue, get status
- Presence: get status, update status
- Audit / transparency / compliance / data: log, query, verify, export, report
- Shop: list products, get product by ID
- Social: message list, feed list, party create/state, notification list
- Marketplace and tournament: marketplace list, tournament bracket by ID
- Sync and replay: sync health, get replay by match ID
- Progression and rewards: XP, daily status, claim daily
- Guardian Shield: fraud check, anticheat report, security event

## Run manually

1. Start the worker in `infra/cloudflare`:

```bash
npm run dev
```

2. Serve the test UI:

```bash
npx serve tests/test-ui -l 3999
```

3. Open it in the browser:

```text
http://localhost:3999
```

Set the API base to `http://localhost:8787` if needed.

## Run Playwright E2E

From `infra/cloudflare`:

1. Install Playwright browsers once:

```bash
npx playwright install chromium
```

2. Start the worker in one terminal:

```bash
npm run dev
```

3. Run the UI E2E tests:

```bash
npm run test:ui:e2e
```

## CORS

If you get CORS errors, set Origin in the test UI to the exact origin of the page, for example `http://localhost:3999`.

## Extending it

- Add buttons and handlers in `app.js`, result areas in `index.html`, and `data-testid` for Playwright.
- Add new specs in `tests/test-ui/e2e/*.spec.ts`.
- Use the log area and console to confirm request and response behavior.
