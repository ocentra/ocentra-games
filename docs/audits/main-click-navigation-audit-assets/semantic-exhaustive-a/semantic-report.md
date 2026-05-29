# Semantic Exhaustive Click Audit

Generated: 2026-05-27T20:50:49.829Z
Base: `http://localhost:3000`

This pass enumerates visible semantic controls from the live DOM at desktop and mobile breakpoints, excluding decorative SVG internals unless they expose a semantic role, pointer cursor, href, tabindex, label, or form/control tag.

## Coverage Counts

| Viewport | Page | Route | Controls found | Clicked | Click errors | No visible change | Route changes | Dialog/popup | Console issues | Request failures |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| desktop | Social | `/social` | 7 | 7 | 0 | 0 | 0 | 2 | 0 | 0 |
| desktop | Games Alias | `/games` | 3 | 3 | 0 | 0 | 1 | 1 | 0 | 0 |
| desktop | Games Catalog Legacy | `/CardGamesExplorer` | 3 | 3 | 0 | 0 | 1 | 1 | 0 | 0 |
| desktop | Card Games Alias | `/card-games` | 40 | 40 | 0 | 0 | 1 | 1 | 0 | 0 |
| desktop | Category Classics | `/categories/classics` | 40 | 40 | 0 | 0 | 1 | 1 | 0 | 0 |
| mobile | Shop | `/shop` | 29 | 28 | 1 | 0 | 1 | 0 | 16 | 0 |
| mobile | Social | `/social` | 7 | 7 | 0 | 0 | 0 | 2 | 0 | 0 |
| mobile | Games Alias | `/games` | 3 | 3 | 0 | 0 | 1 | 1 | 0 | 0 |
| mobile | Games Catalog Legacy | `/CardGamesExplorer` | 38 | 38 | 0 | 0 | 1 | 1 | 0 | 0 |
| mobile | Games Catalog Public | `/games/card-games` | 38 | 38 | 0 | 0 | 1 | 1 | 0 | 0 |
| mobile | Card Games Alias | `/card-games` | 38 | 38 | 0 | 0 | 1 | 1 | 0 | 0 |
| mobile | Category Classics | `/categories/classics` | 38 | 38 | 0 | 0 | 1 | 1 | 0 | 0 |

## No Visible Change Or Click Errors

| Viewport | Page | Control | Status | Proof | Notes |
|---|---|---|---|---|---|
| mobile | Shop | 5TREASURY | error | [png](./semantic-exhaustive/screenshots/mobile-shop-007-5treasury.png) | locator.click: Timeout 3000ms exceeded.
Call log:
[2m  - waiting for locator('div#root > div > div > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type( |

## Slow Or Late Feedback

| Viewport | Page | Control | Route ms | Body ms | Spinner ms | Dialog ms | Proof |
|---|---|---|---:|---:|---:|---:|---|
| desktop | Category Classics | Filter category: Patience |  | 608 | 608 |  | [png](./semantic-exhaustive/screenshots/desktop-category-classics-024-filter-category-patience.png) |

## Raw Artifacts

- [semantic-results.json](./semantic-exhaustive/semantic-results.json)
- [semantic-inventory.json](./semantic-exhaustive/semantic-inventory.json)
- [semantic-summary.json](./semantic-exhaustive/semantic-summary.json)
- [screenshots](./semantic-exhaustive/screenshots/)

