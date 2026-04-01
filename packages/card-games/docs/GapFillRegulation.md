# Gap-Fill Regulation — Strict Contract (No Exceptions)

**Purpose:** This document is the **authoritative regulation** for all gap-fill work on processed game JSON. It applies to every human and every agent (main or sub-agent). The goal is **buildable games with real data**, not "pass validation."

**Source of truth for field-level rules:** [GameReadyValidation.md](GameReadyValidation.md). This document adds **behavioral and process rules** that must never be broken.

---

## 1. The Real Goal (What We Are Doing)

| We are doing | We are NOT doing |
|--------------|------------------|
| Making each game **buildable** — an implementer can build `xyz.json` and have all data, rules, and engine needed | Making files "pass validation" with filler or placeholders |
| Filling gaps with **real data** from sources (local HTML, Pagat, Wikipedia, BGG) | Filling gaps with made-up, generic, or "good enough to pass" text |
| So we can say: **"We can now build this game"** — data is real and valid | So we can say "validation passed" while data is still useless for building |

**Definition of done per game:** A game is done when (1) `npm run validate` passes for that file, and (2) **every filled field is traceable to a source** and answers "Can I build this?" (see GameReadyValidation.md § Ready Gate and Self-check). Schema pass alone is **not** enough.

---

## 2. What We WILL Do (Mandatory)

- **Read sources first.** For each game: use `sources.primary[].url`, `localHtml`, game_names_pagat.txt, SourceHtml/, then web search (Pagat, Wikipedia, BGG) when needed. Fill only from what we find.
- **One game at a time.** One JSON file per unit of work. No bulk "fix all deck errors" across 100 files in one edit.
- **Edit in place.** Only update values in existing `processed-games/<id>.json`. No delete of sections/fields/keys. No new files.
- **Validate after each game.** Run validation for the file we changed (single-file or full run). Fix until it passes **and** the Ready Gate / "Can I build this?" is satisfied.
- **Use only named deck/suit/rank types.** If the game's deck exists in @ocentra/game-domain deck (deckTypes, deckFamilies) and ALLOWED_TRIPLES — use it. If it's new, look up from sources; if we can determine composition, add the type and triple; if we cannot, **stop and ask the user** — never use Custom, never guess.
- **Real descriptions.** deckDescription, suitDescription, rankDescription: at least 15 words, real explanation (composition, suits, ranks, jokers). No "See Pagat", no "Wikipedia: ..." in UI-facing text.
- **Real playerActions / customActions.** Every action in phases.legalActions that the game uses must have supported:true and real description, constraints, effectType (and cost if applicable). Unsupported actions must have a 15+ char reason explaining why they don't apply to this game.
- **Keep working until all failing games are properly filled.** Do not stop after 1, 2, 5, or 10 games. The job is done when every game in scope is buildable and validated. If you are an agent, continue with the next game until the list is exhausted or the user explicitly stops you.
- **Commit in batches.** Per GameReadyValidation.md: commit every 10–15 files. This gives a revert point; we never put the repo in a state where hundreds of files are edited with no way to undo.

---

## 3. What We Will NEVER Do (Forbidden)

- **Never "fill to pass".** Do not add text or values whose only purpose is to satisfy the schema (e.g. 15 words of generic fluff, Unknown→NA without the game genuinely lacking that mechanic). If we cannot find real data, we stop and ask or skip that game for now; we do not invent.
- **Never use Custom** for deckType, suitSet, or rankSet. Never guess or make up a deck type. Use existing named types or add from sources; otherwise ask the user.
- **Never use scripts** for gap fill. No automation that edits JSON in bulk. Manual edits only (one game at a time).
- **Never delete** sections, fields, or keys to pass validation. Fill gaps only.
- **Never bulk-edit** many files in one change (e.g. "replace all deckType NA with Standard 52" across 50 files). That creates an unrevertable mess if we can't commit per game. One game per logical edit batch.
- **Never mark a game done** without (a) validation pass and (b) "Can I build this?" satisfied with real data. No marking done "because validation passed" when descriptions are placeholder or actions are still NA where the game uses them.
- **Never leave sub-agents without this regulation.** Any sub-agent or batch agent must receive the same strict rules: real data, no BS fill, no pass-only validation, one game at a time, keep going until all are done, commit every 10–15 files.

---

## 4. Cheating = Invalid (Explicit List)

The following count as cheating; any work that does this is invalid and must be redone:

- Changing `Unknown` → `NA` only to pass validation (NA is only when the game genuinely lacks that feature).
- Deleting or removing fields/sections to pass validation.
- Marking playerActions/customActions as supported:false or leaving them NA when the game actually uses those actions.
- supported:false without a 15+ character reason explaining why the action does not apply to this specific game.
- Generic boilerplate (e.g. "See Pagat", "Wikipedia says...") instead of real structure and descriptions.
- Any text that is not traceable to a source and does not help an implementer build the game.

---

## 5. Safe Editing (No Unrevertable Mass Edits)

- **One game per focused edit.** When editing, change one `processed-games/<id>.json` (or a small, explicit set e.g. "games 101–105") so that a revert or review is possible per game.
- **Do not** run a single script or single "replace all" that touches dozens or hundreds of files. If we cannot commit after each game, we must still be able to revert or reason about changes in small batches.
- **Commit every 10–15 files** (per GameReadyValidation.md). This is the revert point. If working as an agent, pause to suggest or note "batch ready for commit" after that many games.

---

## 6. Agent and Sub-Agent Rules

- **Same regulation.** Every agent (main or sub) must follow this document and GameReadyValidation.md. No "faster" or "lazy" mode.
- **Continue until done.** Do not stop after N games because "it's a lot." Continue until every game in the assigned list is properly filled and validated, or the user explicitly says to stop.
- **No shortcuts.** Real source lookup, real descriptions, real actions. No bulk code edits that put the repo in an unrevertable state.
- **Strict prompt.** When spawning or briefing sub-agents, include: (1) link to this document, (2) link to GameReadyValidation.md, (3) "Goal: buildable games, real data; never fill to pass only; one game at a time; no scripts; no Custom; keep going until all assigned games are done."

---

## 7. Summary: Will vs Never

| We WILL | We NEVER |
|--------|----------|
| Make games buildable with real data | Fill to pass validation only |
| Read local HTML and do web search when needed | Make up or guess data |
| One game at a time, validate, then next | Bulk-edit many files in one go |
| Use named deck/suit/rank or add from sources or ask | Use Custom or invent types |
| Keep working until all are properly filled | Stop after a few games |
| Commit every 10–15 files | Leave repo with huge unrevertable edits |
| Give sub-agents the same strict rules | Let any agent use shortcuts or "pass only" |

---

**This regulation overrides convenience, speed, and any suggestion to "just pass validation." The real work is tough and has no shortcuts.**
