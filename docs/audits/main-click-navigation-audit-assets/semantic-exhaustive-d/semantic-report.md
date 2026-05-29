# Semantic Exhaustive Click Audit

Generated: 2026-05-27T21:08:37.949Z
Base: `http://localhost:3000`

This pass enumerates visible semantic controls from the live DOM at desktop and mobile breakpoints, excluding decorative SVG internals unless they expose a semantic role, pointer cursor, href, tabindex, label, or form/control tag.

## Coverage Counts

| Viewport | Page | Route | Controls found | Clicked | Click errors | No visible change | Route changes | Dialog/popup | Console issues | Request failures |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| desktop | Lobby | `/lobby` | 48 | 48 | 0 | 0 | 11 | 1 | 0 | 0 |
| desktop | Matchmaking | `/matchmaking` | 13 | 13 | 0 | 0 | 9 | 1 | 0 | 0 |
| desktop | Admin | `/admin` | 6 | 6 | 0 | 0 | 0 | 2 | 0 | 0 |
| desktop | Admin Users | `/admin/users` | 6 | 6 | 0 | 0 | 0 | 2 | 0 | 0 |
| desktop | Admin Tools | `/admin/tools` | 6 | 6 | 0 | 0 | 0 | 2 | 0 | 0 |
| desktop | Editor Alias | `/Editor` | 6 | 6 | 0 | 0 | 0 | 2 | 0 | 0 |
| mobile | Lobby | `/lobby` | 44 | 44 | 0 | 0 | 10 | 1 | 0 | 0 |
| mobile | Matchmaking | `/matchmaking` | 10 | 10 | 0 | 0 | 6 | 1 | 0 | 0 |
| mobile | Admin | `/admin` | 6 | 6 | 0 | 0 | 0 | 2 | 0 | 0 |
| mobile | Admin Users | `/admin/users` | 6 | 6 | 0 | 0 | 0 | 2 | 0 | 0 |
| mobile | Admin Tools | `/admin/tools` | 6 | 6 | 0 | 0 | 0 | 2 | 0 | 0 |
| mobile | Editor Alias | `/Editor` | 6 | 6 | 0 | 0 | 0 | 2 | 0 | 0 |

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

