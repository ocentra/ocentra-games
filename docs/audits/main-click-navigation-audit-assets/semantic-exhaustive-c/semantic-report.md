# Semantic Exhaustive Click Audit

Generated: 2026-05-27T20:29:55.191Z
Base: `http://localhost:3000`

This pass enumerates visible semantic controls from the live DOM at desktop and mobile breakpoints, excluding decorative SVG internals unless they expose a semantic role, pointer cursor, href, tabindex, label, or form/control tag.

## Coverage Counts

| Viewport | Page | Route | Controls found | Clicked | Click errors | No visible change | Route changes | Dialog/popup | Console issues | Request failures |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| desktop | Player Hub | `/player-hub` | 7 | 7 | 0 | 0 | 0 | 2 | 0 | 0 |
| desktop | Settings Alias | `/settings` | 7 | 7 | 0 | 0 | 0 | 2 | 0 | 0 |
| desktop | Matches | `/matches` | 7 | 7 | 0 | 0 | 0 | 2 | 0 | 0 |
| desktop | Match Detail Sample | `/matches/demo-match` | 7 | 7 | 0 | 0 | 0 | 2 | 0 | 0 |
| mobile | Leaderboard | `/leaderboard` | 34 | 34 | 0 | 0 | 1 | 0 | 0 | 0 |
| mobile | Player Hub | `/player-hub` | 7 | 7 | 0 | 0 | 0 | 2 | 0 | 0 |
| mobile | Settings Alias | `/settings` | 7 | 7 | 0 | 0 | 0 | 2 | 0 | 0 |
| mobile | Matches | `/matches` | 7 | 7 | 0 | 0 | 0 | 2 | 0 | 0 |
| mobile | Match Detail Sample | `/matches/demo-match` | 7 | 7 | 0 | 0 | 0 | 2 | 0 | 0 |

## No Visible Change Or Click Errors

No semantic click target in this pass was completely inert.

## Slow Or Late Feedback

| Viewport | Page | Control | Route ms | Body ms | Spinner ms | Dialog ms | Proof |
|---|---|---|---:|---:|---:|---:|---|
| mobile | Leaderboard | Open GAME LEADERS |  | 409 | 409 |  | [png](./semantic-exhaustive/screenshots/mobile-leaderboard-008-open-game-leaders.png) |
| mobile | Leaderboard | Open carousel page 1 |  | 407 | 407 |  | [png](./semantic-exhaustive/screenshots/mobile-leaderboard-017-open-carousel-page-1.png) |

## Raw Artifacts

- [semantic-results.json](./semantic-exhaustive/semantic-results.json)
- [semantic-inventory.json](./semantic-exhaustive/semantic-inventory.json)
- [semantic-summary.json](./semantic-exhaustive/semantic-summary.json)
- [screenshots](./semantic-exhaustive/screenshots/)

