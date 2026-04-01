# Fill the gap — sync

**Rules:** [GameReadyValidation.md](GameReadyValidation.md) and [GapFillRegulation.md](GapFillRegulation.md). Validation is strict: no pass with bad data. Fix one JSON at a time from primary source. No scripts. No batch fill. No lazy placeholder.

**Validation commands (from `packages/card-games`):**
- `npm run validate:list` — list all failing files (no limit).
- **First N failures only:** `npm run validate:list:n1`, `validate:list:n5`, `validate:list:n10`, `validate:list:n20`, `validate:list:n50`, `validate:list:n100`.
- By batch (filename prefix): `npm run validate:list:strict:a` … `:z`, `:0` … `:9`.

---

## Instructions for agents

1. **Read this file.** Pick a batch whose **Status** is `free`. Claim it: set **Claimed by** to your name (e.g. Hulk, Agent-A), set **Status** to `in progress`.
2. **Run your list** (from repo root `packages/card-games`):  
   `npm run validate:list:strict:<batch>`  
   e.g. batch `a` → `npm run validate:list:strict:a`. Batch `0` → `npm run validate:list:strict:0`.
3. **Fix each failing file one by one.** For each file: open `src/processed-games/<file>`, read the primary source (URL or HTML in `sources.primary`), fill fields per GameReadyValidation.md. Re-run `validate:list:strict:<batch>` after the file to confirm it’s no longer in the list.
4. **Update this file** after each file you fix: bump **Done**, set **Last** to a short note (e.g. "pick-a-partner.json" or "3 files").
5. When the list for your batch is empty, set **Status** to `done`.
6. **Check the Feedback section** below when you come back; if the boss wrote something for you, fix it and update again.
7. If your batch is done, pick another `free` batch. Don’t stop while there’s free work.

---

## Batch table

| Batch | Claimed by | Status | Done | Last |
|-------|------------|--------|------|------|
| a | Agent-1 | in progress | 0 | claimed |
| b | Agent-1 | in progress | 0 | claimed |
| c | Agent-1 | in progress | 35 | calculation-strategy.json |
| d | Agent-1 | in progress | 12 | daifugo.json |
| e | Agent-1 | in progress | 4 | earl-of-coventry.json |
| f | Agent-1 | in progress | 0 | faro.json |
| g | Agent-1 | in progress | 1 | gao-ji.json |
| h | Agent-2 | in progress | 1 | hearts-turbo.json |
| i | Agent-1 | in progress | 4 | indian-poker-bull.json |
| j | | free | 0 | |
| k | | free | 0 | |
| l | | free | 0 | |
| m | | free | 0 | |
| n | | free | 0 | |
| o | | free | 0 | |
| p | | free | 0 | |
| q | | free | 0 | |
| r | | free | 0 | |
| s | | free | 0 | |
| t | | free | 0 | |
| u | | free | 0 | |
| v | | free | 0 | |
| w | | free | 0 | |
| x | | free | 0 | |
| y | | free | 0 | |
| z | | free | 0 | |
| 0 | | free | 0 | |
| 1 | | free | 0 | |
| 2 | | free | 0 | |
| 3 | | free | 0 | |
| 4 | | free | 0 | |
| 5 | | free | 0 | |
| 6 | | free | 0 | |
| 7 | | free | 0 | |
| 8 | | free | 0 | |
| 9 | | free | 0 | |

---

## Feedback (boss → agents)

Boss checks progress and adds lines here. Agents must read this when they return and fix what’s called out.

- *(none yet)*
