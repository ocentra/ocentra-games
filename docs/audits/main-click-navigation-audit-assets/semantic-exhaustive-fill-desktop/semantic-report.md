# Semantic Exhaustive Click Audit

Generated: 2026-05-27T21:55:35.475Z
Base: `http://localhost:3000`

This pass enumerates visible semantic controls from the live DOM at desktop and mobile breakpoints, excluding decorative SVG internals unless they expose a semantic role, pointer cursor, href, tabindex, label, or form/control tag.

## Coverage Counts

| Viewport | Page | Route | Controls found | Clicked | Click errors | No visible change | Route changes | Dialog/popup | Console issues | Request failures |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| desktop | Home | `/` | 20 | 20 | 0 | 0 | 11 | 3 | 0 | 0 |
| desktop | Shop | `/shop` | 32 | 32 | 0 | 0 | 1 | 1 | 0 | 0 |
| desktop | Games Catalog Public | `/games/card-games` | 40 | 40 | 0 | 0 | 1 | 1 | 0 | 0 |
| desktop | Rules Claim | `/rules/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c` | 20 | 20 | 0 | 0 | 11 | 3 | 0 | 0 |
| desktop | Competition | `/competition` | 22 | 22 | 0 | 0 | 1 | 1 | 0 | 0 |
| desktop | Events | `/events` | 23 | 23 | 0 | 0 | 1 | 1 | 0 | 0 |
| desktop | Leaderboard | `/leaderboard` | 55 | 55 | 0 | 0 | 1 | 1 | 0 | 0 |
| desktop | AI Benchmarks Leaderboard | `/leaderboard/ai-benchmarks` | 55 | 55 | 0 | 0 | 1 | 1 | 0 | 0 |
| desktop | Claim Leaderboard | `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c/leaderboard` | 55 | 55 | 0 | 0 | 1 | 1 | 0 | 0 |
| desktop | Selected Game Claim | `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c` | 23 | 23 | 0 | 0 | 3 | 2 | 0 | 0 |
| desktop | Claim Lobby | `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c/lobby` | 48 | 48 | 0 | 0 | 10 | 1 | 0 | 0 |
| desktop | Claim Matchmaking | `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c/matchmaking` | 13 | 13 | 0 | 0 | 9 | 1 | 0 | 0 |
| desktop | Claim Play | `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c/play` | 8 | 8 | 0 | 0 | 1 | 1 | 8 | 0 |

## No Visible Change Or Click Errors

No semantic click target in this pass was completely inert.

## Slow Or Late Feedback

| Viewport | Page | Control | Route ms | Body ms | Spinner ms | Dialog ms | Proof |
|---|---|---|---:|---:|---:|---:|---|

## Raw Artifacts

- [semantic-results.json](./semantic-exhaustive/semantic-results.json)
- [semantic-inventory.json](./semantic-exhaustive/semantic-inventory.json)
- [semantic-summary.json](./semantic-exhaustive/semantic-summary.json)
- [screenshots](./semantic-exhaustive/screenshots/)

