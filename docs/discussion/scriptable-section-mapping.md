# Selected Game Page → Scriptable Asset Mapping

> **Purpose:** The game detail page (selected game) displays content from multiple JSON sections. When we switch from DuckDB/JSON to scriptables, the page must read from scriptables. This document maps each displayed section to its scriptable source and lists required field upgrades.

---

## What the Page Displays (from `GameDetailOverlay` + `renderSection`)

### 1. Header / Meta (from `Game` summary + `detail.cursorFind`)

| Displayed | Current source | Target scriptable |
|-----------|----------------|-------------------|
| game.name | list name | **GameInfo** (hero.title, or routePath-derived) |
| quality | list quality | **GameInfo** (add `quality?: string`) |
| category, subcategory | list | **GameInfo** ✓ (gameCategory, subcategory) |
| players | list | **GameInfo** ✓ (playersDisplay) |
| deck | list | **GameInfo** ✓ (deck) |
| duration | list | **GameInfo** ✓ (duration) |
| difficulty | list | **GameInfo** ✓ (difficulty) |
| completeness | list | **GameInfo** (add `completeness?: Record<string, boolean>`) |
| alsoKnownAs | detail.cursorFind | **GameInfo** ✓ (alsoKnownAs) |

**GameInfo upgrades done:** gameCategory, subcategory, playerMode, difficulty, duration, origin, deck, alsoKnownAs, playersDisplay.

**Optional additions:** `quality`, `completeness` (for explorer-style badges).

---

### 2. Overview Section

**JSON shape:** `overview: { description, type, origin, players, deck, difficulty, duration }`

**Display:** description, type, origin, players, deck, difficulty, duration (formatted by `renderSection`)

| Field | Target scriptable |
|-------|-------------------|
| description | **GameInfo** ✓ (description) |
| type | **GameInfo** (add `overviewType?: string` or fold into category) |
| origin | **GameInfo** ✓ (origin) |
| players | **GameInfo** ✓ (playersDisplay) |
| deck | **GameInfo** ✓ (deck) |
| difficulty | **GameInfo** ✓ (difficulty) |
| duration | **GameInfo** ✓ (duration) |

**Status:** Mostly covered by GameInfo. Optional: `overviewType` if we want a separate "type" label.

---

### 3. History Section

**JSON shape:** `history: { origins, originCountries?, timeline[], evolution, cultural }`

**Display:** origins + timeline (bullet list) + evolution + cultural

**Target:** **GameInfo** — add structured `history` content.

| Scriptable | Add field | Type |
|------------|-----------|------|
| **GameInfo** | `historyContent` | `{ origins?: string; timeline?: string[]; evolution?: string; cultural?: string }` |

Alternative: store as a **GameInfo.sections** PageSection with content blocks. For JSON→scriptable 1:1 mapping, a dedicated `historyContent` (or `history`) field is simpler.

---

### 4. Setup Section

**JSON shape:** `setup: { players, deck, equipment, dealing }`

**Display:** players, deck, equipment, dealing (formatted lines)

**Target options:**
- **GameInfo** — add `setupContent: { players?, deck?, equipment?, dealing? }` (narrative setup)
- **GameRules** — setup is rules-adjacent but GameRules focuses on gameplay/validation

**Recommendation:** **GameInfo.setupContent** — setup is display content for the info page, not engine logic.

---

### 5. Rules Section

**JSON shape:** `rules: { objective, gameplay, keyRules[] }` + `scoring: { description, winCondition, cardValues, penalties, ... }`

**Display:** objective, gameplay, scoring description, keyRules (bullets)

| Content | Target scriptable | Current | Upgrade |
|---------|-------------------|---------|---------|
| objective | **GameRules** | — | Add `objective: string` |
| gameplay | **GameRules** | Player (blob) | Add `gameplay: string` or keep Player |
| keyRules | **GameRules** | — | Add `keyRules: string[]` |
| scoring (description, winCondition) | **CardGameScoring** | — | Add `description: string`, `winCondition: string` |
| scoring (cardValues, penalties, etc.) | **CardGameScoring** | patternMultipliers | Add `cardValues`, `winCondition`, `penalties`, `targetScore`, `scoringDirection` (per discussion doc) |

**GameRules upgrades:**
- `objective: string`
- `gameplay: string` (or use `Player` as combined gameplay text — but explicit is better for conversion)
- `keyRules: string[]`

**CardGameScoring upgrades:**
- `description: string` (player-facing scoring explanation)
- `winCondition: string`
- `cardValues: Record<string, number>` (already in discussion)
- `penalties: string`
- `targetScore: number | null`
- `scoringDirection` (already in discussion)

---

### 6. Strategy Section

**JSON shape:** `strategy: { basic, intermediate, advanced, tips[] }`

**Display:** basic, intermediate, advanced, tips (bullets)

**Strategy asset current:** `LLM`, `Player` (strings), `tips: StrategyTip[]` (each: title, icon, description, example)

| JSON field | Strategy field | Action |
|------------|----------------|--------|
| basic | — | Add `basic: string` |
| intermediate | — | Add `intermediate: string` |
| advanced | — | Add `advanced: string` |
| tips[] (strings) | tips: StrategyTip[] | Map: `{ description: tip, title: '' }` or add `tipStrings: string[]` |

**Strategy upgrades:**
- `basic: string`
- `intermediate: string`
- `advanced: string`
- Keep `tips: StrategyTip[]` for structured tips; converter maps JSON tips → StrategyTip (description = tip).

---

### 7. Variations Section

**JSON shape:** `variations: { list: Array<{ id, name, description, overrides }>, noVariationsReason? }`

**Display:** list of variation names/descriptions (bullets)

**Target:** **GameInfo** — add `variationsContent: { list: VariationItem[], noVariationsReason?: string }`.

We need a `VariationItem`-like type. For simplicity:
- `variationsContent: { list: Array<{ id: string; name: string; description: string }>, noVariationsReason?: string }`

---

### 8. AI Section

**JSON shape:** `ai: { difficulty: { easy, medium, hard }, considerations[] }`

**Display:** difficulty by level, considerations (bullets)

**Target:** **GameInfo** or **Strategy**. AI content is strategy-adjacent but often separate on info pages.

**Recommendation:** **GameInfo.aiContent** — keeps Strategy focused on player-facing strategy; AI is a separate "how to build AI for this game" section.

---

### 9. Sources Section

**JSON shape:** `sources: { primary: Array<{ name, url }>, additional?: string[] }`

**Display:** primary (name — url), additional

**Target:** **GameInfo** — add `sourcesContent: { primary: Array<{ name: string; url: string }>, additional?: string[] }`.

---

## Summary: Required Upgrades by Scriptable

### GameInfo
| Field | Type | Purpose |
|-------|------|---------|
| `historyContent` | `{ origins?: string; timeline?: string[]; evolution?: string; cultural?: string }` | History section |
| `setupContent` | `{ players?: string; deck?: string; equipment?: string; dealing?: string }` | Setup section |
| `variationsContent` | `{ list: Array<{ id: string; name: string; description: string }>; noVariationsReason?: string }` | Variations section |
| `aiContent` | `{ difficulty?: { easy?: string; medium?: string; hard?: string }; considerations?: string[] }` | AI section |
| `sourcesContent` | `{ primary: Array<{ name: string; url: string }>; additional?: string[] }` | Sources section |
| `quality?` | `string` | Explorer quality badge |
| `completeness?` | `Record<string, boolean>` | Section completeness dots |

### GameRules
| Field | Type | Purpose |
|-------|------|---------|
| `objective` | `string` | Rules section — objective |
| `gameplay` | `string` | Rules section — gameplay (or keep using Player) |
| `keyRules` | `string[]` | Rules section — key rules list |

### CardGameScoring
| Field | Type | Purpose |
|-------|------|---------|
| `description` | `string` | Player-facing scoring explanation |
| `winCondition` | `string` | Win condition text |
| `cardValues` | `Record<string, number>` | Card point values |
| `penalties` | `string` | Penalties description |
| `targetScore` | `number \| null` | Target score if applicable |
| `scoringDirection` | `ScoringDirection` | asc/desc/NA |

### Strategy
| Field | Type | Purpose |
|-------|------|---------|
| `basic` | `string` | Strategy section — basic |
| `intermediate` | `string` | Strategy section — intermediate |
| `advanced` | `string` | Strategy section — advanced |

---

## How the Page Assembles Content (Future)

When the page reads from scriptables:

1. **Header** — GameInfo (hero, gameCategory, subcategory, playersDisplay, deck, duration, difficulty, alsoKnownAs)
2. **Overview** — GameInfo (description, meta fields)
3. **History** — GameInfo.historyContent → `renderSection`-equivalent
4. **Setup** — GameInfo.setupContent
5. **Rules** — GameRules (objective, gameplay, keyRules) + CardGameScoring (description, winCondition, etc.)
6. **Strategy** — Strategy (basic, intermediate, advanced, tips)
7. **Variations** — GameInfo.variationsContent
8. **AI** — GameInfo.aiContent
9. **Sources** — GameInfo.sourcesContent

The page (or a thin adapter) would fetch GameInfo + GameRules + Strategy + CardGameScoring for the selected game, then pass the relevant fields to a `renderSection`-style helper that produces the same UI.

---

## Converter Implications

The JSON→scriptable converter (future script) must:

1. **GameInfo** — map overview, history, setup, variations, ai, sources from JSON into the new content fields.
2. **GameRules** — map rules.objective, rules.gameplay, rules.keyRules.
3. **CardGameScoring** — map scoring.description, scoring.winCondition, scoring.cardValues, etc.
4. **Strategy** — map strategy.basic, strategy.intermediate, strategy.advanced, strategy.tips.

This mapping is the contract for the converter. Once scriptables have these fields, the converter is a straightforward field-by-field assignment.
