# Card Games – Scoring Spec (Authoritative)

> **Goal:** Blind dev can trust this. If we have valid scoring data, we can implement the game.
>
> **Principle:** handRanking ≠ cardValues. cardValues = points to SUM. handRanking = how hands COMPARE.

---

## 1. Concepts

| Concept | Purpose | Location | Example |
|---------|---------|----------|---------|
| **cardValues** | Map rank → numeric value to **sum** (points) | `scoring.cardValues` | joker=0, ace=1, jack=10 |
| **handRanking** | Define how hands **compare** (pair vs flush) | `engine.handRankingSystem`, `engine.handRanks` | ace_high, standard_poker |
| **penalties** | Special point penalties (not per-card) | `scoring.penalties` | onderkluft=15 |

- **Poker:** handRanking (engine), not point sum → `scoring.cardValues` empty + nullReasons
- **Kluft (Shedding):** cardValues (sum hand) + penalties
- **Belote (Point-trick):** cardValues (sum tricks) + targetScore

---

## 2. Scoring Modes by Game Type

| Game Type | cardValues | targetScore | scoringDirection | penalties | splitRules |
|-----------|------------|-------------|------------------|-----------|------------|
| **Shedding** (Kluft, Yaniv) | **Required** | **Required** | **Required** | Optional | Optional |
| **Rummy** | **Required** | Often required | **Required** | Optional | Optional |
| **Climbing** | **Required** | **Required** | **Required** | Optional | Optional |
| **Point-trick** (Belote, Pinochle) | **Required** | Often N/A | **Required** | Optional | Optional |
| **Poker** | N/A | N/A | N/A | N/A | N/A |
| **Gambling** | N/A | N/A | N/A | N/A | N/A |
| **War** | N/A | N/A | N/A | N/A | N/A |
| **Vying** | N/A | N/A | N/A | N/A | N/A |
| **Trick-taking** (no points) | N/A | N/A | N/A | Optional | N/A |
| **Domino/Tile** | Varies (pip or empty) | Varies | Varies | Optional | Optional |
| **Patience** | N/A | N/A | N/A | N/A | N/A |
| **Other/Unknown** | Varies | Varies | Varies | Optional | Optional |

---

## 3. Universal Rules (All Games)

1. **cardValues empty** → `nullReasons.cardValues` required (min 15 chars)
2. **cardValues non-empty** → each value must be a numeric string (digits only, parseable)
3. **cardValues/penalties** → ban NA, Unknown, placeholder, empty string in values
4. **penalties non-empty** → each value must be numeric string
5. **targetScore null/NA** → `nullReasons.targetScore` required (min 15 chars)
6. **targetScore numeric** → must be > 0
7. **scoringDirection null** → `nullReasons.scoringDirection` required (min 15 chars)
8. **scoringDirection** → only `high_wins` | `low_wins` | `closest_to_target` or null; no "NA"/"Unknown"
9. **splitRules** → when `description` mentions halving/splitting, require splitRules or `nullReasons.splitRules`

---

## 4. Category-Dependent Rules

| Category | cardValues | targetScore | scoringDirection |
|----------|------------|-------------|------------------|
| Shedding | **Required** (non-empty) | **Required** (numeric) | **Required** |
| Rummy | **Required** (non-empty) | Often required | **Required** |
| Climbing | **Required** (non-empty) | **Required** | **Required** |
| Poker | N/A (empty + reason) | N/A | N/A |
| Gambling | N/A | N/A | N/A |
| War | N/A | N/A | N/A |
| Vying | N/A | N/A | N/A |
| Trick-taking | N/A or required (point-trick) | Varies | Varies |
| Domino | Varies | Varies | Varies |
| Tile | Varies | Varies | Varies |
| Patience | N/A | N/A | N/A |
| Accumulation | Often required | Often required | Required |
| Banking | N/A | N/A | N/A |
| Fishing | Varies | Varies | Varies |
| Matching | N/A or required | Varies | Varies |
| Other | N/A | N/A | N/A |
| Unknown | N/A | N/A | N/A |

---

## 5. Standard cardValues Keys (Engine Binding)

For shedding/rummy games using standard 52+2 deck:

- `joker`, `ace`, `two`, `three`, `four`, `five`, `six`, `seven`, `eight`, `nine`, `ten`, `jack`, `queen`, `king`

Values: numeric strings (`"0"`, `"1"`, `"10"`). Game-specific keys (e.g. "Trump Jack") allowed but engine may not bind.

---

## 6. nullReasons Schema

When a scoring field is N/A, provide:

```json
"nullReasons": {
  "cardValues": "Poker uses hand rankings, not point accumulation.",
  "targetScore": "No fixed target; play by game rules.",
  "scoringDirection": "Winner determined by hand comparison, not score."
}
```

Each entry: min 15 chars, no placeholder text.

---

## 7. Engine Linkage

- `engine.constants.target_score` ← `scoring.targetScore` (numeric)
- `engine.constants.low_threshold` ← shedding call threshold (e.g. Kluft 5)
- `engine.constants.rospisat_penalty`, `zero_penalty` ← penalties
- `engine.handRankingSystem` ← for hand-comparison games (Poker, etc.); scoring.cardValues empty
- Variations.overrides: `engine.constants.*` for variant-specific values

---

## 8. Validation Checklist

- [ ] cardValues empty → nullReasons.cardValues present, ≥15 chars
- [ ] cardValues non-empty → all values numeric strings
- [ ] Shedding/Rummy/Climbing → cardValues non-empty
- [ ] targetScore null/NA → nullReasons.targetScore present
- [ ] targetScore numeric → > 0
- [ ] scoringDirection null → nullReasons.scoringDirection present
- [ ] scoringDirection enum: no NA/Unknown
- [ ] penalties values: numeric strings when present
- [ ] splitRules: when description mentions halving, require splitRules or nullReasons.splitRules
