# Semantic Exhaustive Click Audit

Generated: 2026-05-27T20:37:09.615Z
Base: `http://localhost:3000`

This pass enumerates visible semantic controls from the live DOM at desktop and mobile breakpoints, excluding decorative SVG internals unless they expose a semantic role, pointer cursor, href, tabindex, label, or form/control tag.

## Coverage Counts

| Viewport | Page | Route | Controls found | Clicked | Click errors | No visible change | Route changes | Dialog/popup | Console issues | Request failures |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| desktop | Event Detail Sample | `/events/demo-event` | 24 | 24 | 0 | 0 | 1 | 1 | 47 | 0 |
| desktop | Tournaments | `/tournaments` | 28 | 22 | 6 | 0 | 1 | 1 | 0 | 0 |
| desktop | Tournament Detail Sample | `/tournaments/demo-tournament` | 23 | 23 | 0 | 0 | 1 | 1 | 46 | 0 |
| mobile | Competition | `/competition` | 16 | 16 | 0 | 0 | 1 | 1 | 0 | 0 |
| mobile | Event Detail Sample | `/events/demo-event` | 18 | 18 | 0 | 0 | 1 | 1 | 36 | 0 |
| mobile | Tournaments | `/tournaments` | 16 | 16 | 0 | 0 | 1 | 1 | 0 | 0 |
| mobile | Tournament Detail Sample | `/tournaments/demo-tournament` | 17 | 17 | 0 | 0 | 1 | 1 | 34 | 0 |

## No Visible Change Or Click Errors

| Viewport | Page | Control | Status | Proof | Notes |
|---|---|---|---|---|---|
| desktop | Tournaments | FEATURED PROGRAMSNo featured competition is open right nowComing Soon | error | [png](./semantic-exhaustive/screenshots/desktop-tournaments-017-featured-programsno-featured-competition-is-open-right-nowcoming-soon.png) | locator.click: Element is outside of the viewport
Call log:
[2m  - waiting for locator('div#root > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nt |
| desktop | Tournaments | EVENTSNo event registration is open right nowComing Soon | error | [png](./semantic-exhaustive/screenshots/desktop-tournaments-018-eventsno-event-registration-is-open-right-nowcoming-soon.png) | locator.click: Element is outside of the viewport
Call log:
[2m  - waiting for locator('div#root > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nt |
| desktop | Tournaments | TOURNAMENTSNo tournament registration is open right nowComing Soon | error | [png](./semantic-exhaustive/screenshots/desktop-tournaments-019-tournamentsno-tournament-registration-is-open-right-nowcoming-soon.png) | locator.click: Element is outside of the viewport
Call log:
[2m  - waiting for locator('div#root > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nt |
| desktop | Tournaments | Coming Soon | error | [png](./semantic-exhaustive/screenshots/desktop-tournaments-025-coming-soon.png) | locator.click: Element is outside of the viewport
Call log:
[2m  - waiting for locator('div#root > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nt |
| desktop | Tournaments | Coming Soon | error | [png](./semantic-exhaustive/screenshots/desktop-tournaments-026-coming-soon.png) | locator.click: Element is outside of the viewport
Call log:
[2m  - waiting for locator('div#root > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nt |
| desktop | Tournaments | Coming Soon | error | [png](./semantic-exhaustive/screenshots/desktop-tournaments-027-coming-soon.png) | locator.click: Element is outside of the viewport
Call log:
[2m  - waiting for locator('div#root > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nt |

## Slow Or Late Feedback

| Viewport | Page | Control | Route ms | Body ms | Spinner ms | Dialog ms | Proof |
|---|---|---|---:|---:|---:|---:|---|
| desktop | Tournaments | TOURNAMENTS |  | 417 | 417 |  | [png](./semantic-exhaustive/screenshots/desktop-tournaments-004-tournaments.png) |
| desktop | Tournaments | Coming Soon |  | 473 | 473 |  | [png](./semantic-exhaustive/screenshots/desktop-tournaments-024-coming-soon.png) |

## Raw Artifacts

- [semantic-results.json](./semantic-exhaustive/semantic-results.json)
- [semantic-inventory.json](./semantic-exhaustive/semantic-inventory.json)
- [semantic-summary.json](./semantic-exhaustive/semantic-summary.json)
- [screenshots](./semantic-exhaustive/screenshots/)

