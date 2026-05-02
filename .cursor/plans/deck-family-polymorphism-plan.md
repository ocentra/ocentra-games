# Deck Family Polymorphism – Rethink for 1000+ Games and Multi-Deck Assets

## Context

- **Original design:** One “claim game” → one notion of suit (spades/hearts/diamonds/clubs), one rank (2–14), one deck (Standard 52). Types and assets are French-only.
- **Current reality:** 1000+ games in corpus; catalog already has many deck types (French, Tarot, Hanafuda, Domino, Mahjong, etc.) in `game-domain` (`DECK_TYPE_VALUES`, `SUIT_SET_VALUES`, `RANK_SET_VALUES`).
- **Goal:** Support many deck families so we can create **.asset** files for various decks and card rankings that show up correctly in the asset editor and align with the corpus. Use abstraction, base vs extended, and polymorphism as needed.

---

## Card-games is the stable boundary (non-negotiable)

- **packages/card-games** validates 1000+ game JSONs and is the critical surface. We do **least to no changes** there. Nothing that could upset validation or the schema.
- **game-domain** changes that affect card-games must be **additive only**: no renames, no removals, no signature changes to any export that card-games imports. Existing module paths and export names stay. New exports (e.g. CardIdentity, DeckFamily, DECK_TYPE_TO_FAMILY) are fine as long as card-games is not forced to use them.
- **Scriptables** (game-asset-domain, asset-editor, main app claim game) only have a single claim game today. We **rearrange and fix scriptables** as needed; no obligation to preserve backward compatibility for .assets or inspectors. We can change CardRanking, Card, DeckType, and all related UI freely.

**card-games imports from game-domain (do not break):**  
game/categories, game/playerMode, game/difficulty, game/actionId, game/effect, deck/deckTypes, deck/deckFamilies, deck/deckCompatibility, game/categoryMechanics, game/categorySubcategoryMap, game/zone, game/zoneId, game/phaseActor, deck/drawRules, game/discard, game/cardVisibility, game/trump, game/meld, game/trick, game/market, game/roundConfig, game/turnOrder, game/playerConfig, game/banking, game/declaration, game/fishing, game/handRanks, game/patience, game/scoring, game/shedding, game/buyCosts, game/rngUsed, game/bettingLimits, game/specialCards, game/visibility, and schema/data (override-paths, scoring-requirements) and db (games-list-payload) and scripts (classify-deck-errors, fill-standard-deck-descriptions). Any change in game-domain that touches these surfaces must be additive or internal-only.

---

## 1. First-class deck family (game-domain)

**1.1 Deck family as discriminant**

- Introduce a **deck family** concept that drives card identity and UI, aligned with the existing catalog.
- In game-domain, define a subset of “asset-supported” families first (expand later):
  - **French** – suit (4) + rank (2–14). Current behavior.
  - **Tarot** – major arcana (0–21) or minor (suit + rank). Optional phase: minor-only first.
  - **Hanafuda** – month (1–12) + card name within month.
  - **Domino** – two pips (e.g. 0–6 for double-6). Optional phase.
- Add in game-domain something like:
  - `DECK_FAMILY_VALUES` or reuse a refined `SUIT_SET_VALUES` / a new `DeckFamily` type.
  - A **registry or map**: `DeckFamily` → metadata (display name, identity schema name, whether we have asset support).

**1.2 Single catalog, family as view**

- Keep **one** catalog: `DECK_TYPE_VALUES`, `SUIT_SET_VALUES`, `RANK_SET_VALUES`, `deckCompatibility` (triples).
- Add a **family view**: for each deck type (or triple), we can derive “which family this belongs to” (e.g. "Standard 52" → French, "Hanafuda 48" → Hanafuda). So:
  - Either add `deckTypeToFamily(deckType: string): DeckFamily | null` in game-domain, or
  - A table `DECK_TYPE_TO_FAMILY` so assets and editor know which family a deck type uses.
- This keeps corpus as source of truth and makes “family” a lens over it for assets/editor.

---

## 2. Polymorphic card identity (game-domain)

**2.1 Base: “card identity” is family-dependent**

- Today: a card is `{ suit: Suit, value: CardValue }` (French only).
- Target: **CardIdentity** = discriminated union by family, e.g.:

```ts
// game-domain: e.g. deck/cardIdentity.ts or types/cardIdentity.ts
type FrenchCardIdentity = { family: 'French'; suit: Suit; value: CardValue };
type HanafudaCardIdentity = { family: 'Hanafuda'; month: number; cardName: string };
type TarotMinorCardIdentity = { family: 'Tarot_minor'; suit: string; rank: number };
type TarotMajorCardIdentity = { family: 'Tarot_major'; number: number };
type DominoCardIdentity = { family: 'Domino'; leftPip: number; rightPip: number };

export type CardIdentity =
  | FrenchCardIdentity
  | HanafudaCardIdentity
  | TarotMinorCardIdentity
  | TarotMajorCardIdentity
  | DominoCardIdentity;
```

- **Suit** and **CardValue** stay in game-domain as the **French** identity building blocks; other families get their own fields. No duplication of “suit” across families: French uses `Suit`, Hanafuda has no suit, Tarot minor has a string suit name.

**2.2 Piece id / card id**

- Today: `CardPieceId = \`${CardValue}_of_${Suit}\`` (French only).
- Generalize: **piece id** is a string that uniquely identifies a card **within a deck family**. For French it can stay `rank_of_suit`; for Hanafuda e.g. `month_cardName` or a slug. So:
  - `computeCardPieceId(identity: CardIdentity): string` in game-domain (or game-asset-domain) that dispatches on `identity.family`.
  - Existing `computeCardPieceId(suit, rank)` becomes the French branch or a helper that builds `FrenchCardIdentity` and calls the generic one.
- This keeps a single “id” concept while allowing different shapes per family.

---

## 3. CardRanking: base + family-specific payload (game-asset-domain)

**3.1 Base CardRanking**

- **CardRanking** remains one scriptable type (one .asset type) so the asset editor does not need a different asset type per family.
- Add a required **deck family** (from game-domain): `deckFamily: DeckFamily`.
- Current fields that are French-specific become **one branch** of a polymorphic payload:
  - `deckType`: keep as **catalog string** (from game-domain `DECK_TYPE_VALUES`), e.g. `"Standard 52"`, `"Hanafuda 48"`. This aligns with corpus and validation.
  - `expectedCardCount`, `includesJokers`, `backCardCount`: keep as common.
  - **Family-specific data:** e.g. `familyPayload: FrenchCardRankingPayload | HanafudaCardRankingPayload | ...` where:
    - `FrenchCardRankingPayload`: `{ suits: CardSuitEntry[], rankings: CardRankingEntry[] }` (current shape).
    - `HanafudaCardRankingPayload`: `{ months: { month: number, cards: { name, symbol?, order }[] }[] }` or similar.
    - Tarot: major list + minor suits/ranks, etc.
- So: **base** = common fields + `deckFamily` + `deckType` (catalog) + `familyPayload`; **extended** = one payload type per family.

**3.2 Scriptables only**

- No need to preserve backward compatibility for .asset files. We can fix or migrate existing StandardCardRanking.asset when we change the shape (e.g. add `deckFamily` and `familyPayload`). If we want a one-time migration path we can; otherwise we just rearrange and fix scriptables.

---

## 4. Card (asset): polymorphic identity

**4.1 Card scriptable**

- **Card** stays one asset type; its “identity” becomes family-aware.
- Replace fixed `suit` + `rank` with a single field that can hold any **CardIdentity** (e.g. `cardIdentity: CardIdentity`), or keep `suit`/`rank` as optional and add `cardIdentity?: CardIdentity` for non-French (then deprecate suit/rank for non-French over time). Cleaner long-term: **one** field `cardIdentity`; for French it’s `{ family: 'French', suit, value }`.
- Card still references a **CardRanking** asset (which defines the deck family and ordering). So when we have a French CardRanking, cards use FrenchCardIdentity; when we have a Hanafuda CardRanking, cards use HanafudaCardIdentity.
- **Piece id:** Card’s `getCardId()` (or equivalent) uses `computeCardPieceId(cardIdentity)` so it works for all families.

**4.2 Deck.asset**

- Deck already references CardRanking and a list of card templates (Card assets). No structural change beyond: cards in that list can have any `CardIdentity` matching the CardRanking’s family. Validation: every card’s `cardIdentity.family` must equal the Deck’s CardRanking’s `deckFamily`.

---

## 5. Asset editor: family-aware inspectors

**5.1 CardRanking inspector**

- **Single inspector component** that switches on `deckFamily`:
  - `French`: current UI (suits list + rankings list).
  - `Hanafuda`: month/card editor (new UI).
  - `Tarot`: major + minor definition UI (new).
  - `Domino`: pip ranges / tile list (new).
- Alternatively: **registry** `DeckFamily → React component** so each family’s editor lives in its own file. Same idea: no single “one game” UI; family drives the form.

**5.2 Card inspector**

- Same idea: switch on `cardIdentity.family` (or inferred from CardRanking). French: current suit + rank dropdowns. Hanafuda: month + card dropdown, etc.

**5.3 Deck inspector**

- Largely unchanged; it already shows card list and CardRanking reference. Optional: show deck family badge and validate that all cards match the ranking’s family.

**5.4 Previews and lists**

- CardRankingPreview, DeckPreview, etc. become family-aware: they use the same discriminant to choose how to render (e.g. French matrix, Hanafuda by month, etc.).

---

## 6. game-domain layout (concrete) – additive only for card-games

- **types/game.ts** – Keep `Suit`, `CardValue`, `Card` (engine runtime) **unchanged** (card-games does not import these directly; game-asset-domain and engine do). Additive: optionally add `FrenchCardIdentity` or a shared rank-values constant in a **new** file so we don’t change existing exports.
- **deck/deckTypes.ts** – **Do not remove or rename** `DECK_TYPE_VALUES`, `DeckType`, `DECK_TYPE_CUSTOM`, domino/tile sets (card-games and schema use them). Additive only: e.g. new export `DECK_TYPE_TO_FAMILY` or `deckTypeToFamily(deckType: string)` in this file or a new deck/familyMap.ts.
- **deck/deckFamilies.ts** – **Do not remove or rename** `SUIT_SET_VALUES`, `RANK_SET_VALUES`, `SuitFamily`, `RankFamily`. Additive only: e.g. `DECK_FAMILY_VALUES` in a new file (deck/deckFamily.ts) so scriptables can use it without touching catalog surface.
- **deck/cardIdentity.ts** (new) – Define `CardIdentity` union, `FrenchCardIdentity`, etc., and `computeCardPieceId(identity: CardIdentity)`. New module; no change to existing deck/* that card-games imports.
- **deck/cardIds.ts** – Keep for catalog. If we refactor to use `Suit` and a shared rank list, do it **internally** (implementation only); the public export `getCardIds(deckType, suitSet, rankSet)` stays the same so nothing in card-games breaks.
- **deck/deckCompatibility.ts** – **Do not change** export names or signatures (card-games uses `isValidDeckTriple`, types). Additive only if needed.

---

## 7. game-asset-domain layout (concrete) – rearrange/fix freely

- **CardRanking** – Add `deckFamily: DeckFamily` (from game-domain); add `familyPayload` (discriminated by family); use catalog string for `deckType` (from game-domain `DECK_TYPE_VALUES`). Replace current `suits`/`rankings` with `familyPayload.french`; no need to preserve old .asset format – we can fix scriptables.
- **Card** – Replace `suit`/`rank` with `cardIdentity: CardIdentity`. `getCardId()` uses `computeCardPieceId(cardIdentity)` (from game-domain or game-asset-domain).
- **piece-id.ts** – Generalize to `computeCardPieceId(identity: CardIdentity): string`; French branch builds from `FrenchCardIdentity`. Can keep a helper `computeFrenchCardPieceId(suit, rank)` that builds identity and calls the generic one.
- **CardRankingFactory** – Create ranking by family using catalog `deckType` strings and the right `familyPayload` shape.
- **DeckType.ts** – Remove or replace: scriptables use catalog deck type string from game-domain. If editor needs a “quick create” list, use a small preset list that maps to catalog strings (no separate enum that diverges from catalog).

---

## 8. Phasing

1. **Phase 1 – Single source + no new families yet**  
   - **game-domain (additive only):** Add new module e.g. deck/cardIdentity.ts with `CardIdentity`, `FrenchCardIdentity`, `computeCardPieceId(identity)` (French only for now). Add deck/deckFamily.ts (or similar) with `DECK_FAMILY_VALUES = ['French']` and `DECK_TYPE_TO_FAMILY` for French deck types. Do **not** change existing exports or signatures used by card-games. Optionally consolidate French suit/rank in one place for internal use (e.g. cardIds) without changing public API.  
   - **Scriptables (rearrange/fix):** CardRanking: add `deckFamily`, `familyPayload`; move suits/rankings into `familyPayload.french`. Card: replace suit/rank with `cardIdentity: CardIdentity` (French only). piece-id: generalize to identity-based; keep French helper. Update asset-editor inspectors/previews to use new shape. Existing .assets can be fixed manually or with a one-time migration; no requirement to support old format.

2. **Phase 2 – One more family (e.g. Hanafuda)**  
   - Add `HanafudaCardIdentity` and Hanafuda in `DECK_FAMILY_VALUES` and `DECK_TYPE_TO_FAMILY` for Hanafuda 48/52.  
   - CardRanking: add `HanafudaCardRankingPayload` and editor UI for Hanafuda (month + cards).  
   - Card: support `HanafudaCardIdentity`; Card inspector for Hanafuda.  
   - Asset editor: Hanafuda CardRanking and Card inspectors/previews.  
   - Create sample Hanafuda CardRanking.asset and Deck.asset.

3. **Phase 3 – Tarot, Domino, more**  
   - Repeat: add identity type, payload type, editor UI, and sample assets per family.  
   - Expand `DECK_TYPE_TO_FAMILY` and validation so corpus deck types line up with asset-supported families where applicable.

---

## 9. Asset creation strategy: CardRanking, Deck, and Card .assets for all deck types

**Goal:** At some point we need .asset files for (at least) every deck type in `DECK_TYPE_VALUES` (68 entries): CardRanking, Deck, and Cards (suits, ranks, etc.) so they exist in the asset editor and can be used by games.

**9.1 How many of what**

- **ALLOWED_TRIPLES** has ~97 rows; each row is `[deckType, suitSet, rankSet]`. Many deck types share the same **(suitSet, rankSet)** (e.g. "Standard 52", "Standard 52 + Joker(s)", "Double 52" all use French + Standard_52). So:
  - **CardRanking.asset:** One per **unique (suitSet, rankSet)** (or per deck-family variant). That gives roughly 40–50 distinct rankings, not 68. Each CardRanking defines suits and ranks (or the family-equivalent) for that combination.
  - **Deck.asset:** One per **deck type** we want to support (up to 68). Each Deck references one CardRanking (the one for its triple’s suitSet + rankSet) and specifies card set (and joker count / deck count where applicable). So multiple Deck.assets can reference the same CardRanking (e.g. Standard 52 and Standard 52 + Joker(s) both use the same French Standard_52 CardRanking).
  - **Card.asset:** One per **card identity** in a deck. For French Standard 52 that’s 52 (+ optional jokers). Cards can be **shared** across decks that use the same (suitSet, rankSet): e.g. put them under `Cards/French_Standard_52/` and have both "Standard 52" and "Standard 52 + Joker(s)" decks reference that set plus jokers. So we need one pool of card assets per unique (suitSet, rankSet), not per deck type. Total card assets = sum over unique (suitSet, rankSet) of (number of card ids for that triple). game-domain’s `getCardIds(deckType, suitSet, rankSet)` (or per-triple) gives the list of ids; we create one Card.asset per id in that list (with the right CardIdentity).

**9.2 Source of truth: game-domain**

- **Catalog:** `DECK_TYPE_VALUES`, `ALLOWED_TRIPLES`, `SUIT_SET_VALUES`, `RANK_SET_VALUES` already define what deck types and triples exist. card-games keeps using these as-is.
- **Card list per triple:** Today `getCardIds(deckType, suitSet, rankSet)` only implements French 52 (and 52+jokers). To support “all” deck types we need either:
  - **Option A:** Extend `getCardIds` (or add a parallel API) in game-domain to return card identities (or at least id strings) for every triple in ALLOWED_TRIPLES. For families we don’t implement yet, return [] or a placeholder so generation doesn’t break. Implement per family as we add CardIdentity (French first, then Hanafuda, Domino, Tarot, etc.).
  - **Option B:** A separate module that, for each triple, derives the list of card identities from (suitSet, rankSet) and deck-type metadata (e.g. joker count). That module uses only game-domain types and catalog; card-games does not depend on it.
- **Metadata per deck type:** We may need (in game-domain or a data file) things like: expected card count, includes jokers (and count), back card count, “number of decks” for double/quad. Either derive from deck type name or add a small table keyed by deck type. Used by generator to create Deck.asset and to know how many Card.assets to create.

**9.3 Generation flow**

1. **Enumerate unique (suitSet, rankSet)** from ALLOWED_TRIPLES (or from DECK_TYPE_VALUES via the triple for each deck type). Dedupe to get the set of “ranking keys.”
2. **For each ranking key:**  
   - Create **one CardRanking.asset** (name/path e.g. from suitSet + rankSet, e.g. `French_Standard_52.asset`). Content: deckFamily, deckType (pick a canonical deck type for this triple, e.g. "Standard 52" for French Standard_52), familyPayload with suits and rankings (from game-domain or from a preset per family).  
   - Get card id list from game-domain (`getCardIds` for a representative deck type that uses this triple).  
   - Create **one Card.asset per card id** in a folder e.g. `Cards/French_Standard_52/<id>.asset`, with cardIdentity set from that id (French: suit + value; others when we add families).  
3. **For each DECK_TYPE_VALUES entry:**  
   - Resolve its triple (deckType, suitSet, rankSet) from ALLOWED_TRIPLES.  
   - Find the CardRanking.asset for (suitSet, rankSet).  
   - Create **one Deck.asset** (name from deck type, e.g. `Standard52.asset`, `Hanafuda48.asset`) that references that CardRanking and the corresponding card folder (or list of card template paths). Set joker count / deck count from metadata if needed.  
4. **Naming and paths:** Use a convention so that “ensure assets for deck type X” is deterministic, e.g.:
   - `CardRankings/<suitSet>_<rankSet>.asset` or `CardRankings/<deckFamily>_<variant>.asset`
   - `Decks/<deckTypeSlug>.asset` (e.g. Standard52, Hanafuda48)
   - `Cards/<rankingKey>/<cardId>.asset`

**9.4 Where the generator lives**

- **Option A:** Script in asset-editor (or in a scripts/ folder in repo) that imports game-domain (deckTypes, deckCompatibility, deckFamilies, getCardIds, and later CardIdentity / deckFamily). It writes .asset files to Resources/GameMode/CardGames/ (or a configurable output path). Run once per “generate all” or “generate for deck types [list].”  
- **Option B:** A “Generate decks” command inside the asset-editor app that does the same, so users can refresh or add missing deck types from the UI.  
- Either way, **game-domain stays the single source** for DECK_TYPE_VALUES, triples, and card id lists; no duplication of that logic in scriptables.

**9.5 Phasing for “all” deck types**

- **Phase 1:** Only French triples. Extend `getCardIds` (or equivalent) to support all French (suitSet, rankSet) combinations that appear in ALLOWED_TRIPLES (French + Standard_52, French + Stripped_32, French + Pinochle_48, etc.). Generator creates CardRanking + Deck + Card .assets for French deck types only. So we get e.g. 20–30 French deck types fully asset-backed first.  
- **Phase 2:** Add one non-French family (e.g. Hanafuda). Implement card identities and getCardIds (or card list) for that family. Generator creates Hanafuda CardRankings and Decks and Cards.  
- **Phase 3:** Add more families (Tarot, Domino, …) and extend generator so that over time we cover all 68 DECK_TYPE_VALUES (or an allowlist we care about). Custom / obscure deck types can return empty card list until we add support.

**9.6 Summary (asset creation)**

- We do **not** need 68 separate CardRankings; we need one CardRanking per unique (suitSet, rankSet), then one Deck per deck type that references the right CardRanking, and one pool of Card.assets per (suitSet, rankSet) shared by all decks using that triple.  
- game-domain remains the source of truth (catalog + card id list per triple); a generator (script or editor command) creates/updates CardRanking, Deck, and Card .assets so that at one point we can have .assets for all DECK_TYPE_VALUES (or a chosen subset), with naming and layout deterministic and family-aware.

---

## 10. .asset JSON validation: single source (Effect Schema) – card-games, main app, asset-editor agree

**.asset files are JSON; they need strict validation (Effect Schema) in one place so card-games, main app, and asset-editor all use the same definition.**

**10.1 Current spread**

- **game-asset-domain** (`packages/game-asset-domain/src/schemas/asset/`): Effect Schema schemas for .asset envelope (`AssetSystemSchema`) and per-asset-type `data` (Deck, Card, CardRanking, PlayingCard*, Hanafuda*, Domino*, Mahjong*, etc.). Entry: `validateAssetFile(json)` in `asset-file-schema.ts`. Used by: runtime (ScriptableObject via `registerRuntimeAssetValidation`), game-asset-domain scripts (validate-decks, validate-cards, etc.).
- **scripts/assets/requiredFieldValidation.ts**: Separate, constructor-based validation (asset type map, `getSerializableFields`, `requiredFieldsMap`). Used by `scripts/validate-assets-only.ts` → asset-editor `npm run validate:assets` (and thus editor lint). So CI for assets does **not** use Effect Schema today.
- **card-games**: Does not validate .asset files (only game JSON). When it ever does, it must use the same validator.

**10.2 Single source of truth**

- **All .asset JSON shape and strict validation:** Effect Schema schemas in **game-asset-domain** (`schemas/asset/*`). Every asset type emitted by the editor must have a corresponding Effect Schema data schema in `AssetTypeToDataSchema` in `asset-file-schema.ts`. Add or tighten schemas (e.g. `.strict()`, required fields) so “strict” is fully in Effect Schema.

**10.3 Unify CI and editor on Effect Schema**

- Make asset-editor `validate:assets` use game-asset-domain’s `validateAssetFile()`:
  - Add a small script (e.g. in game-asset-domain or repo scripts) that: globs `.asset` files, parses JSON (JSON5 if needed), calls `validateAssetFile()` from `@ocentra/game-asset-domain/schemas/asset/asset-file-schema`, exits non-zero and prints schema errors on failure.
  - Wire asset-editor `npm run validate:assets` to this script (e.g. pattern `packages/asset-editor/Resources/**/*.asset`).
- Result: one code path for “is this .asset file valid?” → Effect Schema in game-asset-domain.

**10.4 Constructor-based validation**

- Once CI uses Effect Schema, do **not** use the constructor/requiredFieldsMap path for file validation. Keep it only for editor UI (e.g. inspector “required” hints) if needed; derive or document from Effect Schema where possible. Update `docs/asset-schema-changes.md`: .asset shape and strict validation are defined only in game-asset-domain Effect Schema; new required fields go there first; producers (editor, Rust manifest, etc.) follow.

**10.5 Who uses the single source**

- **Runtime:** Already uses game-asset-domain via `registerRuntimeAssetValidation`.
- **asset-editor CI:** Switch to Effect Schema-based script above.
- **card-games:** No change until it validates .assets; then it must use `validateAssetFile()` from game-asset-domain (or a thin wrapper). Document in AGENTS.md or asset-validation doc.

**10.6 Alignment with deck/card polymorphism**

- When CardRanking and Card get `deckFamily` and `familyPayload` (and Card gets `cardIdentity`), their **Effect Schema data schemas** in game-asset-domain are the only definition for those .asset types. Add/update schemas there as part of the polymorphism work so generated and hand-edited .assets stay valid.

**10.7 Required-assets report script (no fake green)**

- **Script:** `scripts/required-assets-report.ts`. Run: `npm run validate:required-assets` or `npx tsx scripts/required-assets-report.ts [glob] [--check-images]`.
- **Purpose:** Enumerate from game-domain catalog (ALLOWED_TRIPLES, getCardIds) every required CardRanking (per unique suitSet+rankSet), Deck (per deck type), and Card pool (per ranking). Validate existing .asset files with strict Effect Schema. Report: invalid .assets (schema failures), missing CardRankings, missing Decks (count), missing Cards per ranking. Option `--check-images`: fail when a Card .asset has no image ref so you know to provide images.
- **Full inventory (mandatory):** The report must list **every** .asset of the relevant types, not just counts or samples. For each type, show the complete list so we know what we have and what to fix:
  - **Every CardRanking .asset** — path and status: valid (Effect Schema) or invalid (Effect Schema error). Even if it fails, we see it and know what to do.
  - **Every Deck .asset** — path and status: valid or invalid + reason.
  - **Every Card .asset** — path and status: valid or invalid + reason (incomplete/troubled is fine to show; we need to know what to fill).
  So: no hiding. We see every CardRanking, every Deck, every Card; failures are explicit and actionable.
- **Policy: let them fail.** No backward compatibility in scriptables; no fake green. Strict validation, no lenient fallbacks. If something fails (e.g. missing `cardIdentity`, missing `deckFamily`, no image for xyz), the script and `validate:assets` fail so gaps are visible and fixable. More real failures is desired: we let them fail so we can pass with correct implementation and gaps filled. No hand-waving, no shortcuts, no barrel, no re-export, no fake passing validation or tests.
- **Deck .asset:** Deck schema does not yet store `deckType`; script reports required deck-type count vs. how many Deck .assets passed Effect Schema. Add `deckType` to Deck data schema to verify per-type coverage when needed.

**10.8 Philosophy: fail = good; visibility over fake green**

- **Fail for the right reason = good.** Unhappy when it passes with fake or unusable behaviour. At this point, fail = good.
- **Full visibility.** We want to see every CardRanking, every Deck, every Card — even if it fails, is incomplete, or troubled. Then we know what we need and what we need to fix and fill; we do not hide anything. We expect a lot of failures; the structure and needed ideas exist.
- **Do not worry.** Temporary failures are acceptable. Core need: we know what we need, we know what we need to fix and fill, not hide. Target correct behaviours first.
- **TDD mindset.** Write correct behaviours; do not worry if it passes. A failing test or validation that correctly catches a problem = success. We set correct behaviours; how we pass is the next cycle of refinement. Do not target pass; target a failing test/validation that reflects reality.

---

## 11. Summary

- **card-games:** No breaking changes. All current game-domain imports and usage stay valid. game-domain may only add new exports or internal refactors that do not change public API of modules consumed by card-games.  
- **One catalog** (game-domain): deck types, suit sets, rank sets, triples – unchanged as source of truth for 1000+ games.  
- **Deck family** as first-class (new, additive in game-domain): drives polymorphic card identity and asset editor UI.  
- **Polymorphic card identity** (new module in game-domain): `CardIdentity` union so we can create cards and rankings for many deck types.  
- **Scriptables:** Rearranged and fixed as needed; no obligation to preserve backward compatibility for .assets or inspectors. CardRanking and Card become family-aware; asset editor gets family-driven UI.  
- **.asset for various decks:** Same Deck and CardRanking asset types; family and payload vary. We fix scriptables and .assets as we go.  
- **.asset JSON validation (Section 10):** Single source = game-asset-domain Effect Schema. asset-editor CI and main app runtime use it; card-games uses it when it ever validates .assets. No separate constructor-based file validation; one place so card-games, main app, and asset-editor all agree.

This keeps the 1000+ validated games safe and confines churn to scriptables and additive game-domain surface. Section 9 describes asset creation for all DECK_TYPE_VALUES; Section 10 ensures all .asset validation is strict Effect Schema in one place and shared by all consumers.
