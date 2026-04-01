---
name: Gap fill and verify
overview: Make game JSON implementation-ready so we can build games from it. Fill gaps and upgrade with real data only—no placeholders or nonsense. Manual only. No scripts. No delete.
todos: []
isProject: false
---

# Gap-Fill: Workflow

**→ Strict regulation (all agents):** [GapFillRegulation.md](GapFillRegulation.md) — real buildable games, no BS fill, no pass-only validation.  
**→ Full game list:** [game-checklist.md](game-checklist.md)  
**→ Rules and Ready Gate:** [GameReadyValidation.md](GameReadyValidation.md)

---

## Goal

Make each JSON **implementation-ready**: good enough to **start building the game** from it. Every field must carry real, meaningful data. No placeholders, no filler, no nonsense—only data that supports actual game implementation.

---

## How to work

1. **Open [game-checklist.md](game-checklist.md)** – All 1,097 games with JSON path, URLs, and Local HTML status.
2. **Pick an order:**
   - **One by one** – Start at #1, work through.
   - **By alphabet** – Use the A–Z sections.
   - **By status** – Focus on `[ ]` unchecked items.
3. **Per game:** Open JSON → identify gaps or outdated content → fill/upgrade with **real, implementation-useful data** from sources (URLs in the checklist) → verify URLs, game name, and sources match → run `npm run validate` (or `npx tsx src/scripts/validate-with-ts-schema.ts src/processed-games/<id>.json --skip-url-check`) → mark `[x]` when Ready Gate passes and the game can be built from it.
4. **Commit** every 10–15 files.

---

## Verify: URLs, game name, and sources must match

Before marking a game `[x]`, ensure:

- **URL** – Checklist URL and JSON `url` (or equivalent) refer to the same resource.
- **Game name** – Checklist entry and JSON `name` / `title` refer to the same game.
- **Sources** – Pagat, Wikipedia, Local HTML, etc. listed in checklist and JSON are consistent and point to the correct game.

Fix mismatches; do not mark `[x]` until these align.

---

## Sources

- **game_names_pagat.txt** – name → JSON → Pagat URL (in `src/schema/`)
- **game-checklist.md** – merged list with all URLs and Local HTML status
- **src/processed-games/** – the JSON files to edit (do not create new files)
