# Semantic Exhaustive Click Audit

Generated: 2026-05-27T22:21:13.768Z
Base: `http://localhost:3000`

This pass enumerates visible semantic controls from the live DOM at desktop and mobile breakpoints, excluding decorative SVG internals unless they expose a semantic role, pointer cursor, href, tabindex, label, or form/control tag.

## Coverage Counts

| Viewport | Page | Route | Controls found | Clicked | Click errors | No visible change | Route changes | Dialog/popup | Console issues | Request failures |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| mobile | Home | `/` | 17 | 17 | 0 | 0 | 8 | 3 | 0 | 0 |
| mobile | Rules Claim | `/rules/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c` | 17 | 17 | 0 | 0 | 8 | 3 | 0 | 0 |
| mobile | Events | `/events` | 17 | 17 | 0 | 0 | 1 | 1 | 0 | 0 |
| mobile | AI Benchmarks Leaderboard | `/leaderboard/ai-benchmarks` | 44 | 44 | 0 | 0 | 1 | 1 | 0 | 0 |
| mobile | Claim Leaderboard | `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c/leaderboard` | 44 | 44 | 0 | 0 | 1 | 1 | 0 | 0 |
| mobile | Selected Game Claim | `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c` | 22 | 22 | 0 | 0 | 3 | 2 | 0 | 0 |
| mobile | Claim Lobby | `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c/lobby` | 44 | 44 | 0 | 0 | 9 | 1 | 0 | 0 |
| mobile | Claim Matchmaking | `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c/matchmaking` | 10 | 10 | 0 | 0 | 6 | 1 | 0 | 0 |
| mobile | Claim Play | `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c/play` | 7 | 7 | 0 | 0 | 1 | 1 | 7 | 0 |

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

