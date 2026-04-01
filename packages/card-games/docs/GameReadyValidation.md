# Game Ready Validation

Manual workflow to enrich game JSON so each file is **schema-compliant and buildable**. One game at a time. **No scripts. No delete.** Fill gaps only.

**→ For strict behavioral rules (no BS fill, no pass-only validation, safe edits, keep going until done):** [GapFillRegulation.md](GapFillRegulation.md)

---

## What "Ready" Means

Before marking a game done, ask: **"Can I build this?"**

| Criterion | Must NOT be |
|-----------|-------------|
| Player mode | Missing — every game must have `overview.playerMode` and `engine.playerConfig.playerMode` (`singleplayer` or `multiplayer`) |
| Player count | Missing or `"Unknown"`. When `singleplayer`, minPlayers and maxPlayers must both be 1. |
| Deck type | `"Unknown"` or `"Custom"` (use a named type or add one; see § Deck, suit, and rank — never use Custom) |
| Card mechanics | Unknown or incomplete |
| Phases | Missing or vague |
| Win condition | `"Unknown"` or empty |
| Edge cases | Missing when game has them |
| Scoring | `"Unknown"` when game has scoring |

**If any are missing or Unknown → not buildable.** Fill from sources (SourceHtml, Pagat, Wikipedia, BGG). Schema pass alone is not enough.

### Self-check: "Can I build this?"

Before marking done, verify each question is answered by real data (not Unknown/NA when the game has that mechanic):

| # | Question | Field(s) that answer it |
|---|----------|-------------------------|
| 1 | How does the game start? | `engine.phases[0]`, `phases[0].legalActions`, `phases[0].actor` |
| 2 | What happens next? | `engine.phases[].nextPhase`, `conditionalNext`, `loopIndex`/`totalLoops` |
| 3 | Who deals / who acts? | `engine.phases[].actor`, `engine.turnOrder` |
| 4 | Single or multiplayer? | `overview.playerMode` (required), `engine.playerConfig.playerMode`, `minPlayers`, `maxPlayers`, `partnerships`. When `singleplayer`, min/max must be 1. |
| 5 | What can each player do right now? | `engine.phases[].legalActions` → `engine.playerActions` or `engine.customActions` (supported, description, constraints, effectType) |
| 6 | How do cards move and become visible? | `engine.zones`, `engine.cardVisibility`, `phases[].cardVisibilityChanges` |
| 7 | How does the game end? | Last phase with `nextPhase: null`, `scoring.winCondition`, `rules.objective` |
| 8 | What deck? | `engine.deckType`, `deckCount`, `suitSet`, `rankSet` |
| 9 | How are hands/scoring evaluated? | `engine.handRanks`, `scoring.winCondition`, `scoring.splitRules` |
| 10 | Edge cases / special rules? | `engine.rules.edgeCases` |
| 11 | Betting structure? (if betting) | `engine.playerActions` (bet, call, raise, etc.), `bettingLimits`, costs |
| 12 | Initial setup / deal pattern? | `engine.initialHandSize`, `dealPattern`, `setup.dealing` |

If the answer is missing or Unknown/NA where the game has that mechanic → **not buildable**. Use NA only when the game genuinely lacks it.

### Blocking edge cases

Additional edge cases that can block building a game when data is missing or inconsistent:

#### Phase & Flow

| Edge case | What breaks | Field(s) to check |
|-----------|-------------|-------------------|
| Broken phase chain | `nextPhase` targets a non-existent phase id | `phases[].id`, `phases[].nextPhase` |
| No terminal phase | Game has no end | Some phase has `nextPhase: null` |
| Phase with no legal actions | Engine can't pick an action | `phases[].legalActions` must be non-empty when `phases[].actor` is player-type |
| Phase references undefined action | Action in `legalActions` not in `playerActions` or `customActions` | `phases[].legalActions` vs `playerActions` keys + `customActions[].id` |
| Loop never exits | `loopIndex`/`totalLoops` inconsistent or wrong | `loopIndex`, `totalLoops`, `nextPhase` after loop |

#### Turn Order & Actors

| Edge case | What breaks | Field(s) to check |
|-----------|-------------|-------------------|
| "left_of_dealer" but no dealer | Can't determine first player | `turnOrder.startsWith`, dealer-related phases |
| Actor type unknown | Engine doesn't know who acts | `phases[].actor` (dealer, each_player, etc.) |
| `minPlayers` > `maxPlayers` | Invalid config | `playerConfig.minPlayers`, `maxPlayers` |
| `playerMode: singleplayer` but min/maxPlayers ≠ 1 | Invalid config | `playerMode`, `minPlayers`, `maxPlayers` |

#### Deck & Zones

| Edge case | What breaks | Field(s) to check |
|-----------|-------------|-------------------|
| Zones referenced but missing | Deal/buy targets or UI layout references non-existent zone | `engine.zones[]` vs zones in deal/buy/play and `synthesis.uiLayout.zones` (use `hand`, not `player_hand`) |
| Deck type unknown | Can't build deck | `deckType`, `suitSet`, `rankSet` |
| Deal size mismatch | Hand size doesn't match deal pattern | `initialHandSize`, `dealPattern`, `finalHandSize` |

#### Mechanics the Game Uses

| Edge case | What breaks | Field(s) to check |
|-----------|-------------|-------------------|
| Trick game, no trick config | Can't resolve trick winner | `trickConfig` when game has tricks |
| Draw/discard game, no config | Can't implement draw/discard | `drawConfig`, `discardConfig` |
| Trump game, no trump config | Can't apply trump | `trumpConfig` |
| Market/buy game, no market config | Can't run market/buy | `marketConfig`, `buyCosts` |
| Meld/rummy game, no meld config | Can't evaluate melds | `meldConfig` |

#### Scoring & Win Condition

| Edge case | What breaks | Field(s) to check |
|-----------|-------------|-------------------|
| Win condition unknown or generic | Can't detect winner | `scoring.winCondition`, `rules.objective` |
| High-low game, no low hand spec | Can't split pot or evaluate low | `handRanks.low`, `lowQualifier` |
| Split pot, no split rules | Can't divide winnings | `scoring.splitRules` |
| Tiebreaker missing | Can't resolve ties | `rules.edgeCases`, tie/odd-chip rules |

#### Betting & Economy

| Edge case | What breaks | Field(s) to check |
|-----------|-------------|-------------------|
| Betting phases, no bet actions | Betting rounds unplayable | `playerActions` for bet/call/raise/fold/check |
| Buy action, no costs | Can't apply buy cost | `buyCosts`, action `cost` when game has buying |
| Ante phase, ante amount missing | Can't collect ante | `constants.ante` or action cost for ante |

#### Consistency Across Sections

| Edge case | What breaks | Field(s) to check |
|-----------|-------------|-------------------|
| Overview vs engine player count mismatch | Ambiguous player range | `overview.players` vs `engine.playerConfig` |
| Rules text vs engine (e.g. "5 cards" vs `initialHandSize: 2`) | Rules don't match engine | `rules.gameplay`, `initialHandSize`, phases |
| Declaration phase, no mechanism | Can't handle declarations | `declarationMechanism` when phases use declare |

#### Solitaire-Specific

| Edge case | What breaks | Field(s) to check |
|-----------|-------------|-------------------|
| No actor / no turn order | Engine doesn't know who acts | `phases[].actor`, `turnOrder` |
| Patience game, no patience config | Can't implement layout/rules | `patienceConfig` |

---

### Engine = playable game

The `engine` object drives the game implementation. **If engine fields are NA/Unknown, the game cannot be built.** Ask: *"If every player action is NA, what can the player actually do?"* Nothing. Fill with real intelligence from sources.

---

## Engine Fields — Must Be Filled With Real Intelligence

**NA everywhere = unplayable.** The engine needs real values to implement the game. See Zod schema in `src/schema/zod/game-schema.ts` for full spec.

### engine.playerActions (CRITICAL)

Every action in `phases[].legalActions` **must** have `supported: true` with real values:

| Field | When supported=true | When supported=false |
|-------|---------------------|----------------------|
| description | What the action does (from rules) | `"NA"` |
| constraints | When/why it's legal | `"NA"` |
| effectType | draw, play, discard, bet, etc. | `"NA"` |
| cost | `"0"`, `"match_current_bet"`, `flat:N`, etc. | `"NA"` |
| reason | — | **Required.** 15+ chars explaining WHY this action does not apply to this game. |

**If play_card, draw, discard, bet, etc. are used in phases → they MUST have real description, constraints, effectType.** Otherwise the engine has no idea what to implement.

Phases can reference **customActions** (e.g. `deal_3_each_turn_trump`, `play_any_card`). Add them to `engine.customActions` with full playerAction schema: `id`, `supported: true`, `description`, `cost`, `constraints`, `effectType`, `isTerminating`. Custom action IDs must not clash with standard action IDs.

Actions the game genuinely doesn't have → `supported: false`, all NA values **plus** a `reason` (e.g. "Abyssinia is poker; there is no melding mechanic."). Schema rejects bare NA without reason. Actions the game HAS → `supported: true`, fill from sources.

### Other engine fields (fill when game has them)

| Field | Purpose | NA only when |
|-------|---------|--------------|
| phases | Game loop: who acts, what's legal, next phase | — |
| suitSet, rankSet | Cards in deck | Game has no suits/ranks |
| deckType | 52 cards, 32 cards, dominoes, etc. | — |
| handRanks | Poker hands, trick ranking | Game has no hand comparison |
| bettingLimits | No Limit, Fixed Limit, etc. | Game has no betting |
| playerConfig | min/max players, partnerships | — |
| drawConfig, discardConfig | How draw/discard works | Players never draw/discard |
| trickConfig | Trick-taking rules | Not a trick game |
| rules.winCondition | How to win | — |

**Default: the game probably has it.** Mark NA only when sources explicitly say it doesn't.

When engine fields are null/NA (drawConfig, discardConfig, specialCards, shedding, fishingConfig, roundConfig), you **must** provide `engine.notApplicableReasons` with a 15+ char explanation per key (e.g. "drawConfig": "Players acquire cards by buying from market; there is no draw-from-pile mechanic."). Schema rejects null/NA configs without reasons. **No "Pagat:" or "Wikipedia:" in UI-facing text** — use plain explanations. Source citation in `reason` is OK; not in notApplicableReasons or text that leaks to UI.

**engine.zones** must list every zone the game uses. Each zone needs `id`, `type` (stack/hand/pool/etc.), `visibility`, `owner`. `synthesis.uiLayout.zones` must only reference zone IDs that exist in `engine.zones` (e.g. `hand`, `stock`, `custom:trick_pile` — not `player_hand`).

**variations.overrides**: Valid paths are `engine.constants.*` (numeric; use `optimal_players` for player-count variants), `engine.buyCosts.sources.*`, `engine.cardVisibility.*`, `engine.finalHandSize`, `engine.dealPattern`. `engine.playerConfig.optimalPlayers` is **not** a valid override — use `engine.constants.optimal_players` instead.

When scoring.targetScore or scoring.scoringDirection is null/NA and scoring.hasPlaceholders is false, provide `scoring.nullReasons.targetScore` (and `scoringDirection` if applicable). Same for history (evolution, cultural), strategy (basic, intermediate, advanced), and ai.difficulty (easy, medium, hard) when hasPlaceholders is false.

---

## Deck, suit, and rank — never use Custom

**Custom is disallowed.** Schema validation will fail if `engine.deckType`, `engine.suitSet`, or `engine.rankSet` is `"Custom"`. You must use a named type. If you cannot find a matching type or add one from sources, **stop and ask the user** to add it — do not guess or make one up.

### 1. Check what we already have

- **Deck types:** `@ocentra/game-domain/deck/deckTypes` — `DECK_TYPE_VALUES` (e.g. Standard 52, Tarot 78, Hanafuda 48, Whot 54, …).
- **Suit sets:** `@ocentra/game-domain/deck/deckFamilies` — `SUIT_SET_VALUES` (e.g. French, Italian, Dominoes, Hanafuda, …).
- **Rank sets:** same module — `RANK_SET_VALUES` (e.g. Standard_52, Stripped_32, Domino_double6, Whot, …).
- **Valid combinations:** `@ocentra/game-domain/deck/deckCompatibility` — `ALLOWED_TRIPLES`. The triple `(deckType, suitSet, rankSet)` must appear there. No triple → invalid.

Pick an existing `(deckType, suitSet, rankSet)` that matches the game’s deck. If one fits, use it.

### 2. If the deck is completely new: add a new entry or ask the user

Do **not** use Custom and do **not** guess. Either add a proper named type (if you can determine the deck from sources) or **stop and ask the user** to add the type.

1. **Look up the deck** from the game’s source:
   - Use the game JSON’s `sources.primary[].url` or `localHtml` (e.g. in `SourceHtml/`).
   - Or web search (Pagat, Wikipedia, BGG) for the deck name and composition (suits, ranks, card count, any special cards).
2. **Add the deck type** (if new): in `packages/game-domain/src/deck/deckTypes.ts`, add a new string to `DECK_TYPE_VALUES` (e.g. a named deck like `"Some Deck 42"`).
3. **Add suit or rank set** (if new): in `packages/game-domain/src/deck/deckFamilies.ts`, add to `SUIT_SET_VALUES` or `RANK_SET_VALUES` as needed.
4. **Register the triple:** in `packages/game-domain/src/deck/deckCompatibility.ts`, add a row to `ALLOWED_TRIPLES`: `[deckType, suitSet, rankSet]`.
5. **Use that triple in the game JSON:** set `engine.deckType`, `engine.suitSet`, `engine.rankSet` to these named values (and keep `deckDescription` / `suitDescription` / `rankDescription` non-empty and at least 15 words when the type is novel or needs explanation).

**If you cannot find or add a matching type:** stop and ask the user to add the deck/suit/rank type. Do not guess or invent one.

Result: every game uses a named deck/suit/rank from the type files and compatibility matrix; no Custom.

---

## Folders & Files

| Path | Purpose |
|------|---------|
| `packages/card-games/src/processed-games/` | Game JSON. Read and write. Fill gaps here. |
| `packages/card-games/src/SourceHtml/` | Pre-downloaded source HTML. Use when available. |
| `packages/card-games/src/schema/` | Zod game schema; [game_names_pagat.txt](src/schema/game_names_pagat.txt) |
| `packages/card-games/src/scripts/` | `validate-with-ts-schema.ts` — run via `npm run validate`. |

### Source lookup order

1. **game_names_pagat.txt** — game name → Pagat URL → JSON path
2. **SourceHtml/** — local HTML before web fetch
3. Web search (Pagat, Wikipedia, BGG) if not local
4. **404?** Use alternate source (Wikipedia etc.); update URL in JSON and game_names_pagat.txt. Validation requires at least one reachable URL.

### Quick lookup for efficient gap fill

| Resource | Purpose |
|----------|---------|
| [json-descriptors.txt](json-descriptors.txt) | Quick lookup of game JSON summaries (name, category, overview) |
| [html-descriptors.txt](html-descriptors.txt) | Quick lookup of cached HTML content summaries |
| [SourceHtml/manifest.json](src/SourceHtml/manifest.json) | Maps each HTML file → source URL. Use to find which local file corresponds to a URL. |

**Each game JSON** already has `sources.primary` and `sources.additional` with `url` (remote) and `localHtml` (local file in SourceHtml/) when available. Use these to avoid hunting — open the JSON, read the `localHtml` refs, and load from SourceHtml/ directly.

---

## Workflow (per game)

```
Validate → Collect failures → Inspect gaps → Source lookup → Fill → Validate again
```

1. **Validate** — `npm run validate` (or `npx tsx src/scripts/validate-with-ts-schema.ts src/processed-games/{id}.json [--skip-url-check]`)
2. **Collect failures** — Every schema error (path + message). Don't skip any.
3. **Inspect** — List fields to fill: validation errors + Unknown/NA/empty from heuristics below.
4. **Source lookup** — game_names_pagat.txt → SourceHtml → web search if needed.
5. **Fill** — Update gaps only. In place. No delete, no create.
6. **Validate again** — If fail → back to step 2.

### Validate (step 1 & 6)

```bash
npm run validate
```

- Needs at least one reachable `sources.primary[].url`. Use `--skip-url-check` only for offline schema check.
- Passing schema is **not enough** to mark done — see Ready Gate below.

### Inspect & source lookup (steps 2–4)

- Read JSON + Zod schema (game-schema.ts)
- List gaps: validation errors + Unknown/NA/empty per heuristics
- Check game_names_pagat.txt (src/schema/) for name + URL
- Source order: game_names_pagat.txt → SourceHtml → web search
- **404?** Use Wikipedia, BVS Solitaire, etc.; fill from there; update `sources.primary[0].url` and game_names_pagat.txt

### Fill (step 5)

- Fill identified gaps only. Edit in place.
- **Never delete** sections, fields, or keys — even to pass validation.
- **No scripts** — no use or creation of automation scripts.
- Populate `alsoKnownAs` with every alias from game_names_pagat that points to this JSON.

---

## Ready Gate — must ALL be yes before marking done

- [ ] Game identity correct in game_names_pagat.txt (name + URL + JSON path)
- [ ] Only `processed-games/{id}.json` edited
- [ ] No scripts used or created; no sections/fields deleted to pass
- [ ] Gaps filled from real sources (no placeholder swaps)
- [ ] No fake fixes: `Unknown` → `NA` only when mechanic is truly absent
- [ ] `alsoKnownAs` includes every alias from game_names_pagat for this JSON
- [ ] `schemaVersion` and `engineModelVersion` populated
- [ ] `sources.primary[].id` and `retrievedAt` (ISO date) set; URL correct
- [ ] Engine-facing fields have no avoidable `Unknown` or empty strings
- [ ] **engine.playerActions / customActions**: every action in phases.legalActions has supported=true with real description, constraints, effectType, cost — no NA for actions the game uses
- [ ] `npm run validate` passes (Zod schema: validate-with-ts-schema.ts)
- [ ] `extraction.status` = `validated` when complete
- [ ] Commit every 10–15 files

### Reference examples (validated)

These pass `npm run validate`. Fix was done by reading SourceHtml + JSON and deriving real content. Use as examples when fixing other games.

| Category | File | Source |
|----------|------|--------|
| Poker | [abyssinia-poker.json](src/processed-games/abyssinia-poker.json) | Pagat, Wikipedia |
| Patience | [accordion.json](src/processed-games/accordion.json) | Wikipedia |
| Climbing | [big-two.json](src/processed-games/big-two.json) | Pagat, Wikipedia |
| Trick-taking | [briscola.json](src/processed-games/briscola.json) | Pagat, Wikipedia |

Validate one file: `npx tsx src/scripts/validate-with-ts-schema.ts src/processed-games/<id>.json --skip-url-check`

---

## Gap detection — treat as gap when

- Field is `"Unknown"`, `"NA"`, empty, or generic → **fill with real data** (do not "fix" by changing Unknown → NA)
- **engine.playerActions / customActions**: action in phases.legalActions has description/constraints/effectType = NA or supported=false → game is unplayable, fill it (or add to customActions if custom)
- `overview.origin` is `"Various"` or `"USA"` with no region
- `rules.objective` is boilerplate
- Schema requires it and it's missing
- `alsoKnownAs` is empty or missing aliases from game_names_pagat for this JSON

---

## Rules (non-negotiable)

| Rule | Meaning |
|------|---------|
| **Manual only** | One game at a time. No batch automation. |
| **Fill only** | Update values. No delete. No create. No new files or top-level keys. Never remove fields to pass. |
| **No cheating** | `Unknown`→`NA` or `unsupported` just to pass = invalid. Fill with real data. |
| **alsoKnownAs** | Every alias in game_names_pagat that points to this JSON must be in `alsoKnownAs`. |
| **NA usage** | `NA` only when the game genuinely lacks that feature. Never for "I don't know." |
| **Engine-ready** | Engine-facing fields must have real values. Unknown/empty = invalid. |
| **playerActions / customActions** | Every action in phases.legalActions must exist in playerActions or customActions with supported=true + real description, constraints, effectType. NA = unplayable. |
| **No scripts** | No use or creation of scripts. Manual only. |
| **No delete** | Never delete sections, fields, or keys from JSON to pass validation. Fill gaps only. |
| **No Pagat/Wikipedia in UI text** | Do not use "Pagat:" or "Wikipedia:" in notApplicableReasons, descriptions, or any text that may reach UI. Source citation in `reason` for unsupported actions is OK. |

### Cheating = invalid

- Changing `Unknown` → `NA` to pass validation
- Deleting sections, fields, or keys to pass validation
- **Marking playerActions/customActions `supported: false` or `"NA"` when the game uses them** — if phases reference an action, it MUST exist in playerActions or customActions with real description/constraints/effectType. Otherwise the game has nothing to do.
- **supported: false without `reason`** — every unsupported action must have a 15+ char `reason` explaining why it does not apply. Bare NA is rejected.
- Generic boilerplate (e.g. "See Pagat") instead of real structure

---

# Wikipedia Source Workflow

Manual workflow to add Wikipedia sources when Pagat is unavailable or as an additional source.

1. **Search** — https://en.wikipedia.org/wiki/Special:Search for game name
2. **Download HTML** — Save to `packages/card-games/src/SourceHtml/` as `wiki_[GameName]_[shortId].html`
3. **Update JSON** — Add to `sources.primary`:
   ```json
   {
     "id": "src:wikipedia_[game_id]",
     "name": "Wikipedia - [Game Name]",
     "url": "https://en.wikipedia.org/wiki/[Game_Page]",
     "retrievedAt": "YYYY-MM-DD",
     "sections": []
   }
   ```
4. **Update game_names_pagat.txt** — Add or append Wikipedia URL to the game's line


