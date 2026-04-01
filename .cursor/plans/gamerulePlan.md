# Comprehensive Rules, Scoring & Pattern Architecture for Card Games

## Executive Summary

This plan defines a **complete inheritance hierarchy** and **architectural pattern** for implementing game rules, scoring, and pattern evaluation across all card games (and extensible to other game types). It addresses:

- **Full class hierarchy**: BaseRule → BaseBonusRule → Game-specific bonus rules
- **Example hand generation**: How rules create examples using CardRanking + Scoring
- **Pattern detection vs scoring separation**: Rules detect patterns, Scoring calculates points
- **Scriptable object patterns**: TypeScript equivalents of Unity SerializedScriptableObject
- **Trump system integration**: Data-driven trump bonuses and modifiers

**Based on Unity reference implementation:** [References/Scripts/OcentraAI/LLMGames/GameMode/CardGames/](e:/ocentra-games/References/Scripts/OcentraAI/LLMGames/GameMode/CardGames/)

---

## Core Insight: Separation of Concerns

**The Problem:** Scoring formulas vary drastically across games:

- **Claim**: Hoarder's Multiplier (sequences: sum × count)
- **Three Card Brag**: Poker hand rankings with bonus values
- **Texas Hold'em**: Pure poker hand ranking (5-card, no bonus values)

**The Solution:** Four distinct layers with clear responsibilities:

1. **Pattern Rules** (BaseBonusRule) - **WHAT** patterns exist (Pair, Flush, Sequence)
2. **Game Rules** (CardGameRules) - **WHAT** actions allowed + which patterns apply
3. **Scoring Config** (CardGameScoring) - **HOW** to calculate scores FROM patterns
4. **Hand Evaluator** (PatternEvaluator) - Detects patterns in hands (game-agnostic)

**Critical Principle:** Pattern Rules define **WHAT** exists, Scoring Config defines **HOW** to score. Rules contain **NO scoring logic** - they only detect patterns and return metadata.

---

## Core Architecture: 5-Layer System

### Layer 0: Base Foundation (Shared Across ALL Games)

#### **BaseRule** (Abstract Root)
**Purpose:** Foundation for ALL rule types (card games, board games, etc.)

**Location:** `src/lib/assets/game/rules/BaseRule.ts`

```typescript
export abstract class BaseRule extends ScriptableObject {
  @serializable({ label: 'Rule Name' })
  abstract ruleName: string;

  @serializable({ label: 'Description' })
  description!: string;

  @serializable({ label: 'Priority' })
  abstract priority: number;

  @serializable({ label: 'Examples' })
  examples!: GameRulesContainer; // { LLM: string, Player: string }

  // Lifecycle: Initialize examples and metadata
  abstract initialize(gameMode: GameMode): Promise<boolean>;

  // Validation: Can this rule apply to this game?
  abstract isApplicable(gameMode: GameMode): boolean;
}
```

**Key Properties:**
- `ruleName`: Unique identifier ("pair", "flush", "sequence")
- `description`: Human-readable explanation
- `priority`: Evaluation/display order (higher = more important)
- `examples`: Dual-audience examples (Player-friendly + LLM-optimized)

**Key Methods:**
- `initialize()`: Called when GameMode loads - sets up examples, validates config
- `isApplicable()`: Checks if rule can work with this GameMode

---

### Layer 1: Card Game Pattern Rules

#### **BaseBonusRule** (Abstract, extends BaseRule)
**Purpose:** Defines **WHAT** card patterns exist (Pair, Flush, Straight, etc.)

**Location:** `src/lib/assets/game/rules/BaseBonusRule.ts`

**Unity Reference:** [BaseBonusRule.cs](e:/ocentra-games/References/Scripts/OcentraAI/LLMGames/GameMode/CardGames/Rules/BaseBonusRule.cs)

**CRITICAL:** This class contains **NO scoring logic** - it only detects patterns and returns metadata. Scoring formulas are defined in `CardGameScoring` (Layer 3).

```typescript
export abstract class BaseBonusRule extends BaseRule {
  @serializable({ label: 'Minimum Cards Required' })
  abstract minNumberOfCard: number;

  @serializable({ label: 'Default Bonus Value' })
  abstract bonusValue: number; // Default, can be overridden per game

  @serializable({ label: 'Pattern Type' })
  abstract patternType: string; // "pair", "flush", "sequence", etc.

  // Reference to parent GameMode (set during initialization)
  protected gameMode?: CardGameMode;

  // Initialize: Set up examples using CardRanking + Scoring
  abstract initialize(gameMode: CardGameMode): Promise<boolean>;

  // Evaluate: Check if hand matches this pattern
  abstract evaluate(hand: Card[], trumpCard?: Card): Promise<BonusDetail | null>;

  // Create example hand symbols (e.g., ["Q♠", "Q♦", "7♣"])
  abstract createExampleHand(
    handSize: number,
    cardRanking: CardRanking,
    trumpCard?: Card,
    coloured?: boolean
  ): string[];

  // Protected helper: Create standardized examples with scores
  protected async createExampleWithScore(
    exampleCards: string[],
    cardRanking: CardRanking,
    scoring: CardGameScoring
  ): Promise<GameRulesContainer> {
    // Calculate example score using this rule's logic
    const cards = this.convertSymbolsToCards(exampleCards, cardRanking);
    const bonusDetail = await this.evaluate(cards);

    // Format for LLM (concise)
    const llm = `${this.ruleName}: ${exampleCards.join(', ')} - Score: ${bonusDetail.totalBonus} (${bonusDetail.bonusCalculationDescriptions})`;

    // Format for Player (detailed)
    const player = `${this.description}\n` +
                   `Example: ${exampleCards.join(', ')}\n` +
                   `Score: ${bonusDetail.totalBonus} points\n` +
                   `Calculation: ${bonusDetail.bonusCalculationDescriptions}`;

    return { LLM: llm, Player: player };
  }

  // Protected helper: Convert card symbols to Card objects
  protected convertSymbolsToCards(symbols: string[], ranking: CardRanking): Card[] {
    // Implementation converts "Q♠" to { suit: Suit.Spade, value: 12, ... }
  }

  // Protected helper: Get trump card from GameMode (async event-driven)
  protected async getTrumpCard(): Promise<Card | null> {
    // Publishes GetTrumpCardEvent, waits for response (Unity pattern)
    // Decouples rules from game state management
  }
}
```

**Key Design Insights:**

1. **NO Scoring Logic in Rules** - Rules detect patterns, return `BonusDetail` with metadata
2. **Example Generation Requires Both CardRanking + Scoring:**
   - `CardRanking` provides card values (A=14, K=13, etc.)
   - `Scoring` provides multipliers/formulas for this game
   - `initialize()` method combines them to create complete examples with scores
3. **Dual-Audience Examples:** `GameRulesContainer { LLM, Player }` for different consumers
4. **Trump Support:** `getTrumpCard()` is event-driven (decoupled from deck)

---

#### **BonusDetail** (Return Type from Evaluate)
**Purpose:** Structured result of pattern evaluation with scoring breakdown

**Location:** `src/lib/assets/game/rules/BonusDetail.ts`

**Unity Reference:** [BonusDetail.cs](e:/ocentra-games/References/Scripts/OcentraAI/LLMGames/GameMode/CardGames/Rules/BonusDetail.cs)

```typescript
export class BonusDetail {
  ruleName: string;                           // "ThreeOfAKind"
  baseBonus: number;                          // 125 * (cardValue × count)
  additionalBonus: number;                    // Trump bonuses, special modifiers
  bonusDescriptions: string[];                // ["Three 7s", "Trump Card Bonus: +15"]
  bonusCalculationDescriptions: string;       // "125 * (7 + 6) + 15"
  priority: number;                           // 91 (for ranking)
  matchedCards: Card[];                       // Which cards matched the pattern

  get totalBonus(): number {
    return this.baseBonus + this.additionalBonus;
  }
}
```

**Usage:** Consumed by:
- **ScoreCalculator**: Uses `totalBonus` for final score
- **UI**: Displays `bonusDescriptions` and `bonusCalculationDescriptions`
- **AI**: Uses `bonusDescriptions` in prompts for strategy

---

#### **Concrete Pattern Rules** (Extend BaseBonusRule)

**PairRule** (`src/lib/assets/game/rules/PairRule.ts`):

```typescript
export class PairRule extends BaseBonusRule {
  static override __assetType = 'PairRule';

  ruleName = 'Pair';
  patternType = 'pair';
  minNumberOfCard = 2;
  bonusValue = 100; // Default, can be overridden
  priority = 87;

  async initialize(gameMode: CardGameMode): Promise<boolean> {
    this.gameMode = gameMode;
    this.description = 'Two cards of the same rank';

    // Get CardRanking and Scoring from GameMode
    const cardRanking = await gameMode.getCardRanking();
    const scoring = await gameMode.getScoringAsset();

    // Generate example hand
    const exampleCards = this.createExampleHand(3, cardRanking);
    // Example: ["Q♠", "Q♦", "7♣"]

    // Create examples with calculated scores
    this.examples = await this.createExampleWithScore(
      exampleCards,
      cardRanking,
      scoring
    );

    // If game uses trump, create trump examples too
    if (gameMode.useTrump) {
      const trumpCard = await this.getTrumpCard();
      const trumpExample = this.createExampleHand(3, cardRanking, trumpCard);
      const trumpExamples = await this.createExampleWithScore(
        trumpExample,
        cardRanking,
        scoring
      );

      // Append trump examples
      this.examples.LLM += `\nTrump Example: ${trumpExamples.LLM}`;
      this.examples.Player += `\n\nWith Trump:\n${trumpExamples.Player}`;
    }

    return true;
  }

  async evaluate(hand: Card[], trumpCard?: Card): Promise<BonusDetail | null> {
    // 1. Check minimum cards
    if (hand.length < this.minNumberOfCard) return null;

    // 2. Detect pattern using HandUtility
    const pairRanks = HandUtility.findPairs(hand, trumpCard, this.gameMode?.useTrump);
    if (pairRanks.length === 0) return null;

    // 3. Calculate base bonus
    const pairRank = pairRanks[0];
    let baseBonus: number;
    let calculation: string;

    if (this.gameMode?.useTrump && hand.some(c => c.id === trumpCard?.id)) {
      // Trump logic: different calculation
      baseBonus = this.bonusValue * (pairRank.value + trumpCard!.value);
      calculation = `${this.bonusValue} * (${pairRank.value} + ${trumpCard!.value})`;
    } else {
      baseBonus = this.bonusValue * pairRank.value * 2;
      calculation = `${this.bonusValue} * (${pairRank.value} * 2)`;
    }

    // 4. Calculate additional bonuses (trump bonuses)
    let additionalBonus = 0;
    const descriptions: string[] = [`Pair of ${pairRank.name}s`];

    if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
      const trumpBonus = this.gameMode.trumpBonusValues?.pairBonus ?? 0;
      additionalBonus += trumpBonus;
      descriptions.push(`Trump Card Bonus: +${trumpBonus}`);
      calculation += ` + ${trumpBonus}`;
    }

    // 5. Return BonusDetail
    return {
      ruleName: this.ruleName,
      baseBonus,
      additionalBonus,
      bonusDescriptions: descriptions,
      bonusCalculationDescriptions: calculation,
      priority: this.priority,
      matchedCards: hand.filter(c => c.value === pairRank.value),
    };
  }

  createExampleHand(
    handSize: number,
    cardRanking: CardRanking,
    trumpCard?: Card,
    coloured: boolean = true
  ): string[] {
    // Generate example: pick random rank for pair
    const pairRank = CardRanking.getRandomRank(cardRanking, Rank.Two, Rank.King);
    const suits = [Suit.Spade, Suit.Diamond, Suit.Heart, Suit.Club];

    const hand: string[] = [];

    // Add pair (2 cards of same rank)
    hand.push(CardUtility.getRankSymbol(suits[0], pairRank, coloured));
    hand.push(CardUtility.getRankSymbol(suits[1], pairRank, coloured));

    // Fill remaining with random cards (ensure no duplicates)
    while (hand.length < handSize) {
      const randomRank = CardRanking.getRandomRank(cardRanking);
      if (randomRank.value !== pairRank.value) {
        hand.push(CardUtility.getRankSymbol(suits[2], randomRank, coloured));
      }
    }

    return hand;
  }

  isApplicable(gameMode: GameMode): boolean {
    return gameMode instanceof CardGameMode;
  }
}
```

**Other Concrete Rules (Same Pattern):**
- `FlushRule` - Same suit, not sequence
- `StraightRule` - Sequence, different suits
- `StraightFlushRule` - Sequence, same suit
- `ThreeOfAKindRule` - Three same rank
- `FourOfAKindRule` - Four same rank
- `FullHouseRule` - Three + two combo
- `RoyalFlushRule` - A-K-Q same suit
- `HighCardRule` - Fallback when no pattern

**Files:** `src/lib/assets/game/rules/*.ts` (one file per rule)

---

### Layer 2: Game Rules (Game-Specific)

#### **CardGameRules** (extends GameRules)
**Purpose:** Define **WHAT** actions are allowed + which patterns apply to this game

**Location:** `src/lib/assets/game/gameRules/CardGameRules.ts`

```typescript
export class CardGameRules extends GameRules {
  static override __assetType = 'CardGameRules';

  @serializable({ label: 'Move Validity Conditions' })
  moveValidityConditions!: Record<string, string>;
  // Example: { "pick_up": "Valid when floor card available", ... }

  @serializable({ label: 'Bonus Rules (GUIDs)' })
  bonusRuleGuids!: string[];
  // GUIDs of BaseBonusRule assets that apply to this game

  @serializable({ label: 'Use Trump Cards' })
  useTrump!: boolean;

  @serializable({ label: 'Trump Bonus Values' })
  trumpBonusValues?: TrumpBonusValues;

  // Loaded bonus rules (from GUIDs)
  private bonusRules?: BaseBonusRule[];

  async loadBonusRules(): Promise<BaseBonusRule[]> {
    if (this.bonusRules) return this.bonusRules;

    // Load each GUID from asset registry
    this.bonusRules = await Promise.all(
      this.bonusRuleGuids.map(guid => AssetRegistry.loadAsset<BaseBonusRule>(guid))
    );

    return this.bonusRules;
  }

  getBonusRule<T extends BaseBonusRule>(ruleType: new () => T): T | null {
    return (this.bonusRules?.find(r => r instanceof ruleType) as T) ?? null;
  }
}
```

**TrumpBonusValues** (Data-driven trump modifiers):

```typescript
export class TrumpBonusValues {
  @serializable() cardInMiddleBonus: number = 5;
  @serializable() fiveOfKindBonus: number = 25;
  @serializable() flushBonus: number = 20;
  @serializable() fourOfKindBonus: number = 20;
  @serializable() threeOfKindBonus: number = 15;
  @serializable() pairBonus: number = 5;
  @serializable() trumpCardBonus: number = 10;
  @serializable() wildCardBonus: number = 10;
  @serializable() rankAdjacentBonus: number = 5;

  getBonusForSet(size: number): number {
    switch (size) {
      case 5: return this.fiveOfKindBonus;
      case 4: return this.fourOfKindBonus;
      case 3: return this.threeOfKindBonus;
      case 2: return this.pairBonus;
      default: return 0;
    }
  }
}
```

**Concrete Game Rules:**

**ClaimRules** (`packages/asset-editor/Resources/GameMode/CardGames/claim/claimRules.asset`):

```yaml
__assetType: CardGameRules
LLM: "Claim: Declare suit, pick up floor cards, call showdown at 27+ points"
Player: "Claim Card Game: Declare your suit, pick up floor cards..."
moveValidityConditions:
  pick_up: "Valid when floor card available"
  decline: "Always valid"
  declare_intent: "Valid if not already declared"
  call_showdown: "Valid if 27+ points and declared"
  # NOTE: Claim has NO raise, bet, fold - these are game-specific!
bonusRuleGuids: [] # Claim uses sequences, not poker patterns (custom logic in ClaimScoreCalculator)
useTrump: false
```

**Important:** Claim uses **custom sequence detection logic** in `ClaimScoreCalculator`, not `PatternEvaluator`. It doesn't use poker pattern rules because sequences work differently (consecutive cards in declared suit).

**ThreeCardBragRules** (`packages/asset-editor/Resources/GameMode/CardGames/threeCardBrag/threeCardBragRules.asset`):

```yaml
__assetType: CardGameRules
LLM: "Three Card Brag: 3 cards, bet blind/see, raise/call/fold..."
Player: "Three Card Brag: Get 3 cards, bet or fold..."
moveValidityConditions:
  bet_blind: "Valid if hand not seen"
  see_hand: "Valid if hand not seen"
  raise: "Valid if have enough coins"  # Has raise - different from Claim!
  call: "Valid when bet to call"
  fold: "Always valid"
  # NOTE: Move validity is game-specific - each game defines its own actions
bonusRuleGuids:
  - <pair-rule-guid>
  - <flush-rule-guid>
  - <straight-rule-guid>
  - <three-of-kind-rule-guid>
  - <royal-flush-rule-guid>
  - <straight-flush-rule-guid>
useTrump: true
trumpBonusValues:
  threeOfKindBonus: 15
  pairBonus: 5
  flushBonus: 20
  trumpCardBonus: 10
```

**Key Point:** Move validity conditions are **game-specific**. Claim has no betting actions, while Three Card Brag has raise/call/fold. This is defined in `CardGameRules`, not in pattern rules.

---

### Layer 3: Scoring Configuration (Game-Specific)

#### **CardGameScoring** (extends Scoring)
**Purpose:** Define **HOW** to calculate scores FROM detected patterns

**Location:** `src/lib/assets/game/scoring/CardGameScoring.ts`

```typescript
export class CardGameScoring extends Scoring {
  static override __assetType = 'CardGameScoring';

  @serializable({ label: 'Scoring Type' })
  scoringType!: ScoringType; // "poker_ranking" | "hoarders_multiplier" | "custom"

  @serializable({ label: 'Pattern Multipliers' })
  patternMultipliers?: Record<string, number>;
  // Example: { "three_of_kind": 125, "royal_flush": 1000, ... }

  @serializable({ label: 'Priority Order' })
  priorityOrder?: string[];
  // Which pattern wins if multiple match: ["royal_flush", "straight_flush", ...]

  @serializable({ label: 'Card Ranking Asset' })
  override cardRankingAsset!: CardRanking;

  getMultiplier(patternType: string): number {
    return this.patternMultipliers?.[patternType] ?? 0;
  }

  getHighestPriorityPattern(patterns: string[]): string | null {
    if (!this.priorityOrder) return null;

    for (const priority of this.priorityOrder) {
      if (patterns.includes(priority)) return priority;
    }

    return patterns[0] ?? null;
  }
}

export enum ScoringType {
  PokerRanking = 'poker_ranking',       // Three Card Brag, Texas Hold'em
  HoardersMultiplier = 'hoarders_multiplier', // Claim
  Custom = 'custom'                      // Game-specific logic
}
```

**Concrete Scoring Configs:**

**ClaimScoring** (`packages/asset-editor/Resources/GameMode/CardGames/claim/claimScoring.asset`):

```yaml
__assetType: CardGameScoring
scoringType: hoarders_multiplier
scoringFormula: "(Sum of sequence card values) × (Number of cards in sequence)"
cardRankingAsset: <claim-ranking-guid>
patternMultipliers: {} # Not used - sequences calculated dynamically
priorityOrder: [] # Not used - highest sum wins
```

**ThreeCardBragScoring** (`packages/asset-editor/Resources/GameMode/CardGames/threeCardBrag/threeCardBragScoring.asset`):

```yaml
__assetType: CardGameScoring
scoringType: poker_ranking
scoringFormula: "Base bonus value × rank multiplier"
cardRankingAsset: <standard-ranking-guid>
patternMultipliers:
  three_of_kind: 125
  royal_flush: 1000
  straight_flush: 500
  flush: 100
  straight: 90
  pair: 50
  high_card: 10
priorityOrder:
  - three_of_kind
  - royal_flush
  - straight_flush
  - flush
  - straight
  - pair
  - high_card
```

**TexasHoldemScoring** (`packages/asset-editor/Resources/GameMode/CardGames/texasHoldem/texasHoldemScoring.asset`):

```yaml
__assetType: CardGameScoring
scoringType: poker_ranking
scoringFormula: "Poker hand ranking (no bonus values)"
cardRankingAsset: <standard-ranking-guid>
patternMultipliers: {} # Not used - pure ranking only
priorityOrder:
  - royal_flush
  - straight_flush
  - four_of_kind
  - full_house
  - flush
  - straight
  - three_of_kind
  - two_pair
  - pair
  - high_card
```

**Key Difference:** Texas Hold'em uses pure ranking (no bonus values), while Three Card Brag uses bonus multipliers. Both use the same pattern rules, but different scoring configs.

---

### Layer 4: Hand Evaluator (Shared Engine)

#### **PatternEvaluator**
**Purpose:** Detect patterns in hands (game-agnostic)

**Location:** `src/engine/logic/PatternEvaluator.ts`

```typescript
export class PatternEvaluator {
  constructor(
    private rules: BaseBonusRule[],
    private trumpCard?: Card
  ) {}

  /**
   * Evaluate hand against all applicable patterns
   * Returns all matching patterns (sorted by priority)
   */
  async evaluateAllPatterns(hand: Card[]): Promise<BonusDetail[]> {
    const results: BonusDetail[] = [];

    for (const rule of this.rules) {
      const detail = await rule.evaluate(hand, this.trumpCard);
      if (detail) {
        results.push(detail);
      }
    }

    // Sort by priority (highest first)
    return results.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Evaluate hand against specific pattern
   */
  async evaluatePattern(
    hand: Card[],
    rule: BaseBonusRule
  ): Promise<BonusDetail | null> {
    return rule.evaluate(hand, this.trumpCard);
  }

  /**
   * Get highest priority matching pattern
   */
  async getBestPattern(hand: Card[]): Promise<BonusDetail | null> {
    const all = await this.evaluateAllPatterns(hand);
    return all[0] ?? null;
  }
}
```

**HandUtility** (Pattern detection helpers):

**Location:** `src/engine/logic/HandUtility.ts`

```typescript
export class HandUtility {
  /**
   * Check if hand is a pair (with trump support)
   */
  static findPairs(
    hand: Card[],
    trumpCard?: Card,
    useTrump: boolean = false
  ): Rank[] {
    const rankCounts = this.getRankCounts(hand, trumpCard, useTrump);
    return Object.entries(rankCounts)
      .filter(([_, count]) => count === 2)
      .map(([rank, _]) => Rank.fromString(rank));
  }

  /**
   * Check if hand is flush (all same suit)
   */
  static isFlush(hand: Card[]): boolean {
    if (hand.length === 0) return false;
    const firstSuit = hand[0].suit;
    return hand.every(c => c.suit === firstSuit);
  }

  /**
   * Check if hand is sequence (consecutive ranks)
   */
  static isSequence(hand: Card[]): boolean {
    const sorted = [...hand].sort((a, b) => a.value - b.value);

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].value !== sorted[i - 1].value + 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if trump card is in middle of sequence
   */
  static isTrumpInMiddle(hand: Card[], trumpCard: Card): boolean {
    if (!hand.some(c => c.id === trumpCard.id)) return false;

    const sorted = [...hand].sort((a, b) => a.value - b.value);
    const trumpIndex = sorted.findIndex(c => c.id === trumpCard.id);

    return trumpIndex > 0 && trumpIndex < sorted.length - 1;
  }

  /**
   * Get rank counts (with trump wildcard support)
   */
  static getRankCounts(
    hand: Card[],
    trumpCard?: Card,
    useTrump: boolean = false
  ): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const card of hand) {
      const rank = card.rank.name;
      counts[rank] = (counts[rank] || 0) + 1;
    }

    // If trump, it can act as wildcard (implementation detail)
    if (useTrump && trumpCard) {
      // Logic for trump as wildcard
    }

    return counts;
  }

  // ... more pattern detection methods (IsThreeOfAKind, IsFourOfAKind, etc.)
}
```

---

### Layer 5: Score Calculator (Game-Specific)

#### **CardGameScoreCalculator**
**Purpose:** Calculate final scores using PatternEvaluator + Scoring config

**Location:** `src/engine/logic/scoring/CardGameScoreCalculator.ts`

```typescript
export class CardGameScoreCalculator {
  constructor(
    private scoring: CardGameScoring,
    private rules: BaseBonusRule[],
    private trumpCard?: Card
  ) {}

  /**
   * Calculate score for a hand (poker-style games)
   */
  async calculateScore(hand: Card[]): Promise<ScoreBreakdown> {
    const evaluator = new PatternEvaluator(this.rules, this.trumpCard);

    // Get all matching patterns
    const patterns = await evaluator.evaluateAllPatterns(hand);

    if (patterns.length === 0) {
      return {
        baseScore: 0,
        multiplier: 1,
        positivePoints: 0,
        penalties: 0,
        bonuses: 0,
        totalScore: 0,
        bonusDetails: { patterns: [] },
        matchedPattern: null,
      };
    }

    // Use highest priority pattern
    const best = patterns[0];

    // Get multiplier from scoring config
    const multiplier = this.scoring.getMultiplier(best.ruleName.toLowerCase());

    // Calculate score: baseBonus (from rule) + multiplier (from scoring)
    const baseScore = best.baseBonus;
    const additionalBonus = best.additionalBonus;
    const totalScore = baseScore + additionalBonus;

    return {
      baseScore,
      multiplier: 1, // For poker games, multiplier is baked into baseBonus
      positivePoints: baseScore,
      penalties: 0,
      bonuses: additionalBonus,
      totalScore,
      bonusDetails: {
        patterns,
        winner: best,
      },
      matchedPattern: best.ruleName,
    };
  }
}
```

**ClaimScoreCalculator** (Custom for Claim's Hoarder's Multiplier):

**Location:** `src/engine/logic/scoring/ClaimScoreCalculator.ts`

**Important:** Claim uses **custom sequence detection logic**, not `PatternEvaluator`. It doesn't use poker pattern rules because sequences work differently (consecutive cards in declared suit, not poker patterns).

```typescript
export class ClaimScoreCalculator {
  constructor(
    private scoring: CardGameScoring,
    private cardRanking: CardRanking
  ) {}

  /**
   * Calculate score using Hoarder's Multiplier
   * (Sum of sequence card values) × (Number of cards in sequence)
   */
  calculateScore(hand: Card[], declaredSuit: Suit): ScoreBreakdown {
    // Separate cards by suit
    const declaredCards = hand.filter(c => c.suit === declaredSuit);
    const penaltyCards = hand.filter(c => c.suit !== declaredSuit);

    // Find sequences in declared suit
    const sequences = this.findSequences(declaredCards);

    // Calculate sequence points
    const sequencePoints = sequences.reduce((sum, seq) => sum + seq.sequenceValue, 0);

    // Multiplier = number of declared suit cards
    const multiplier = declaredCards.length;

    // Positive points = sequencePoints × multiplier
    const positivePoints = sequencePoints * multiplier;

    // Penalties = sum of non-declared suit card values
    const penalties = penaltyCards.reduce((sum, c) => sum + c.value, 0);

    // Bonuses
    let bonuses = 0;
    const bonusDetails: Record<string, boolean | number> = {};

    // Clean sweep bonus (+50)
    if (penaltyCards.length === 0) {
      bonuses += 50;
      bonusDetails.cleanSweep = true;
    }

    // Long run bonus (+25 per 4+ card sequence)
    const longRuns = this.countLongRuns(declaredCards);
    bonuses += longRuns * 25;
    bonusDetails.longRuns = longRuns;

    // Total score
    const totalScore = positivePoints + bonuses - penalties;

    return {
      baseScore: sequencePoints,
      multiplier,
      positivePoints,
      penalties,
      bonuses,
      totalScore,
      bonusDetails,
      sequences: {
        declaredSuitSequences: sequences,
        penaltySequences: this.findSequences(penaltyCards),
      },
    };
  }

  private findSequences(cards: Card[]): SequenceInfo[] {
    // Implementation: group by suit, find consecutive runs
  }

  private countLongRuns(cards: Card[]): number {
    // Count sequences of 4+ consecutive cards
  }
}
```

---

## Full Inheritance Hierarchy

```
ScriptableObject (base for all assets)
│
├── BaseRule (abstract)
│   ├── BaseBonusRule (abstract, card-specific)
│   │   ├── PairRule
│   │   ├── FlushRule
│   │   ├── StraightRule
│   │   ├── StraightFlushRule
│   │   ├── ThreeOfAKindRule
│   │   ├── FourOfAKindRule
│   │   ├── FullHouseRule
│   │   ├── RoyalFlushRule
│   │   └── HighCardRule
│   │
│   └── (Future: BoardGameRule, DiceGameRule, etc.)
│
├── GameRules (abstract)
│   ├── CardGameRules (concrete)
│   │   ├── ClaimRules (asset instance)
│   │   ├── ThreeCardBragRules (asset instance)
│   │   └── TexasHoldemRules (asset instance)
│   │
│   └── (Future: BoardGameRules, etc.)
│
├── Scoring (abstract)
│   ├── CardGameScoring (concrete)
│   │   ├── ClaimScoring (asset instance)
│   │   ├── ThreeCardBragScoring (asset instance)
│   │   └── TexasHoldemScoring (asset instance)
│   │
│   └── (Future: BoardGameScoring, etc.)
│
└── GameMode (abstract)
    ├── BettingGameMode (abstract)
    │   └── TurnBasedGameMode (abstract)
    │       └── CardGameMode (concrete)
    │           ├── ClaimGameMode (asset instance - future)
    │           ├── ThreeCardBragGameMode (asset instance - future)
    │           └── TexasHoldemGameMode (asset instance - future)
    │
    └── (Future: BoardGameMode, etc.)
```

---

## Example Hand Generation Flow

**When BaseBonusRule.initialize() is called:**

```typescript
// In PairRule.initialize()
async initialize(gameMode: CardGameMode): Promise<boolean> {
  this.gameMode = gameMode;
  this.description = 'Two cards of the same rank';

  // 1. Load dependencies from GameMode
  const cardRanking = await gameMode.getCardRanking();
  const scoring = await gameMode.getScoringAsset();

  // 2. Generate example hand structure (rule knows HOW to create valid example)
  const exampleCards = this.createExampleHand(3, cardRanking);
  // Returns: ["Q♠", "Q♦", "7♣"]

  // 3. Convert symbols to Card objects
  const cards = this.convertSymbolsToCards(exampleCards, cardRanking);

  // 4. Evaluate example to get scoring details
  const bonusDetail = await this.evaluate(cards);

  // 5. Format for LLM (token-efficient)
  const llmExample =
    `Pair of Queens: ${exampleCards.join(', ')} - ` +
    `Score: ${bonusDetail.totalBonus} ` +
    `(${bonusDetail.bonusCalculationDescriptions})`;

  // 6. Format for Player (human-readable)
  const playerExample =
    `${this.description}\n` +
    `Example: ${exampleCards.join(', ')}\n` +
    `Score: ${bonusDetail.totalBonus} points\n` +
    `Calculation: ${bonusDetail.bonusCalculationDescriptions}`;

  this.examples = {
    LLM: llmExample,
    Player: playerExample
  };

  // 7. If game uses trump, create trump examples
  if (gameMode.useTrump) {
    const trumpCard = await this.getTrumpCard();
    const trumpExampleCards = this.createExampleHand(3, cardRanking, trumpCard);
    const trumpCards = this.convertSymbolsToCards(trumpExampleCards, cardRanking);
    const trumpBonusDetail = await this.evaluate(trumpCards, trumpCard);

    this.examples.LLM +=
      `\nWith Trump: ${trumpExampleCards.join(', ')} - ` +
      `Score: ${trumpBonusDetail.totalBonus} ` +
      `(${trumpBonusDetail.bonusCalculationDescriptions})`;

    this.examples.Player +=
      `\n\nWith Trump Card:\n` +
      `Example: ${trumpExampleCards.join(', ')}\n` +
      `Score: ${trumpBonusDetail.totalBonus} points\n` +
      `Calculation: ${trumpBonusDetail.bonusCalculationDescriptions}`;
  }

  return true;
}
```

**Key Insights:**
1. **Rule creates structure** (what cards make a pair)
2. **CardRanking provides values** (Queen = 12)
3. **Rule evaluates itself** to get scoring
4. **Scoring config provides multipliers** (pair multiplier from game config)
5. **Examples include calculated scores** for UI and AI
6. **Trump examples generated separately** (if game uses trump)

---

## Complete Data Flow: Three Card Brag Example

### 1. Game Initialization

```typescript
// GameMode loads
const gameMode = await AssetRegistry.loadAsset<CardGameMode>('three-card-brag');

// GameMode loads related assets
const rules = await gameMode.loadGameRules(); // CardGameRules
const scoring = await gameMode.loadScoring(); // CardGameScoring

// Rules asset loads bonus rules
const bonusRules = await rules.loadBonusRules();
// Returns: [PairRule, FlushRule, StraightRule, ThreeOfAKindRule, etc.]

// Each bonus rule initializes
for (const rule of bonusRules) {
  await rule.initialize(gameMode);
  // Creates examples with scores using CardRanking + Scoring
}
```

### 2. UI Displays Rules

```typescript
// Display game rules text
ui.showRules(rules.Player);

// Display each pattern rule with examples
for (const rule of bonusRules) {
  ui.showPatternRule({
    name: rule.ruleName,
    description: rule.description,
    example: rule.examples.Player, // Includes calculated score
  });
}
```

### 3. AI Receives Context

```typescript
// Build AI prompt
const prompt = `
Game: Three Card Brag
Rules: ${rules.LLM}

Hand Rankings:
${bonusRules.map(r => r.examples.LLM).join('\n')}

Scoring: ${scoring.scoringFormula}
`;

// AI now knows:
// - Game rules (what actions allowed)
// - Pattern examples (what hands are valuable)
// - Scoring formula (how points calculated)
```

### 4. Hand Evaluation

```typescript
// Player has hand
const hand: Card[] = [
  { suit: Suit.Spade, value: 12, rank: Rank.Queen, ... },
  { suit: Suit.Diamond, value: 12, rank: Rank.Queen, ... },
  { suit: Suit.Club, value: 7, rank: Rank.Seven, ... }
];

// Evaluate using PatternEvaluator
const evaluator = new PatternEvaluator(bonusRules, trumpCard);
const patterns = await evaluator.evaluateAllPatterns(hand);

// Returns:
// [
//   {
//     ruleName: "Pair",
//     baseBonus: 1200,  // 50 (multiplier) × 12 (Queen) × 2
//     additionalBonus: 5, // Trump bonus
//     bonusDescriptions: ["Pair of Queens", "Trump Card Bonus: +5"],
//     bonusCalculationDescriptions: "50 * (12 * 2) + 5",
//     priority: 87,
//     matchedCards: [Q♠, Q♦],
//     totalBonus: 1205
//   }
// ]
```

### 5. Score Calculation

```typescript
// Calculate final score using CardGameScoreCalculator
const calculator = new CardGameScoreCalculator(scoring, bonusRules, trumpCard);
const scoreBreakdown = await calculator.calculateScore(hand);

// Returns:
// {
//   baseScore: 1200,
//   multiplier: 1,
//   positivePoints: 1200,
//   penalties: 0,
//   bonuses: 5,
//   totalScore: 1205,
//   bonusDetails: { patterns: [...], winner: {...} },
//   matchedPattern: "Pair"
// }
```

### 6. UI Display

```typescript
ui.showScore({
  score: scoreBreakdown.totalScore,
  breakdown: scoreBreakdown.bonusDetails.winner.bonusDescriptions,
  calculation: scoreBreakdown.bonusDetails.winner.bonusCalculationDescriptions
});

// Shows:
// "Score: 1205 points
//  Pair of Queens
//  Trump Card Bonus: +5
//  Calculation: 50 * (12 * 2) + 5"
```

---

## Complete Data Flow: Claim Example (Custom Logic)

### 1. Game Initialization

```typescript
// GameMode loads
const gameMode = await AssetRegistry.loadAsset<CardGameMode>('claim');

// GameMode loads related assets
const rules = await gameMode.loadGameRules(); // CardGameRules
const scoring = await gameMode.loadScoring(); // CardGameScoring

// Claim has NO bonus rules (uses custom sequence logic)
// bonusRuleGuids: [] in claimRules.asset
```

### 2. UI Displays Rules

```typescript
// Display game rules text
ui.showRules(rules.Player);

// Claim has no pattern rules to display
// Sequences are explained in rules text itself
```

### 3. AI Receives Context

```typescript
// Build AI prompt
const prompt = `
Game: Claim
Rules: ${rules.LLM}
Scoring: ${scoring.scoringFormula}  // Hoarder's Multiplier
`;

// AI now knows:
// - Game rules (declare suit, pick up cards, call showdown)
// - Scoring formula (sum × count for sequences)
// - NO pattern rules (Claim uses custom logic)
```

### 4. Hand Evaluation (Custom Logic)

```typescript
// Player has hand: [A♠, K♠, 2♠, 3♠, 4♠] (declared Spades)
// Claim uses ClaimScoreCalculator, NOT PatternEvaluator

const calculator = new ClaimScoreCalculator(scoring, cardRanking);
const scoreBreakdown = calculator.calculateScore(hand, Suit.Spade);

// ClaimScoreCalculator uses custom sequence detection:
// - Finds sequences in declared suit (A-K, 2-3-4)
// - Calculates: (sum × count) for each sequence
// - Applies multiplier (number of declared suit cards)
// - Subtracts penalties (non-declared suit cards)

// Returns:
// {
//   sequences: [
//     { cards: [A♠, K♠], sum: 27, count: 2 },
//     { cards: [2♠, 3♠, 4♠], sum: 9, count: 3 }
//   ],
//   baseScore: 36,  // 27 + 9
//   multiplier: 5,  // 5 cards in declared suit
//   positivePoints: 180,  // 36 × 5
//   penalties: 0,  // All cards in declared suit
//   bonuses: 0,
//   totalScore: 180
// }
```

### 5. Score Calculation (Hoarder's Multiplier)

```typescript
// ClaimScoreCalculator uses Hoarder's Multiplier:
// Sequence 1: 27 × 2 = 54
// Sequence 2: 9 × 3 = 27
// Total sequence points: 54 + 27 = 81
// Multiplier: 5 (number of declared suit cards)
// Final: 81 × 5 = 405 (if all cards were in sequences)

// Note: This is DIFFERENT from poker-style scoring
// Claim doesn't use patternMultipliers or priorityOrder
```

**Key Difference:** Claim bypasses `PatternEvaluator` entirely and uses custom `ClaimScoreCalculator` with custom sequence detection. This is intentional - not all games need pattern rules.

---

## File Structure

```
src/
├── lib/
│   ├── assets/
│   │   ├── game/
│   │   │   ├── rules/
│   │   │   │   ├── BaseRule.ts                 # Layer 0: Abstract root
│   │   │   │   ├── BaseBonusRule.ts            # Layer 1: Abstract card pattern
│   │   │   │   ├── BonusDetail.ts              # Result payload
│   │   │   │   ├── PairRule.ts                 # Concrete pattern
│   │   │   │   ├── FlushRule.ts
│   │   │   │   ├── StraightRule.ts
│   │   │   │   ├── StraightFlushRule.ts
│   │   │   │   ├── ThreeOfAKindRule.ts
│   │   │   │   ├── FourOfAKindRule.ts
│   │   │   │   ├── FullHouseRule.ts
│   │   │   │   ├── RoyalFlushRule.ts
│   │   │   │   ├── HighCardRule.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── gameRules/
│   │   │   │   ├── GameRules.ts                # Base (existing)
│   │   │   │   ├── CardGameRules.ts            # Layer 2: Card-specific
│   │   │   │   ├── TrumpBonusValues.ts         # Trump modifier data
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── scoring/
│   │   │       ├── Scoring.ts                  # Base (existing)
│   │   │       ├── CardGameScoring.ts          # Layer 3: Card-specific
│   │   │       └── index.ts
│   │   │
│   │   ├── card/
│   │   │   └── cardRanking/
│   │   │       └── CardRanking.ts              # Card values (existing)
│   │   │
│   │   └── gameMode/
│   │       └── cardGameMode/
│   │           └── CardGameMode.ts             # Concrete (existing)
│   │
│   └── serialization/
│       └── ScriptableObject.ts                 # Base for all assets (existing)
│
├── gameMode/
│   └── core/
│       ├── GameMode.ts                         # Abstract base (existing)
│       ├── BettingGameMode.ts                  # Abstract (existing)
│       └── TurnBasedGameMode.ts                # Abstract (existing)
│
├── engine/
│   └── logic/
│       ├── PatternEvaluator.ts                 # Layer 4: Pattern detection
│       ├── HandUtility.ts                      # Pattern helpers
│       ├── RuleEngine.ts                       # Move validation (existing)
│       └── scoring/
│           ├── CardGameScoreCalculator.ts      # Layer 5: Poker-style scoring
│           └── ClaimScoreCalculator.ts         # Layer 5: Claim-specific (existing)
│
└── types/
    └── game.ts                                  # Card, Suit, Rank, etc. (existing)

packages/asset-editor/Resources/
├── Cards/
│   ├── claimRankings.asset                     # CardRanking instance
│   └── standardRankings.asset                  # CardRanking instance
│
└── GameMode/CardGames/
    ├── CommonCardRules/                         # Pattern rule instances
    │   ├── pair.asset                           # PairRule instance
    │   ├── flush.asset                          # FlushRule instance
    │   ├── straight.asset                       # StraightRule instance
    │   ├── straightflush.asset
    │   ├── threeofakind.asset
    │   ├── fourofakind.asset
    │   ├── fullhouse.asset
    │   ├── royalflush.asset
    │   └── highcard.asset
    │
    ├── claim/
    │   ├── claim.asset                          # CardGameMode instance
    │   ├── claimRules.asset                     # CardGameRules instance
    │   ├── claimScoring.asset                   # CardGameScoring instance
    │   ├── claimDescription.asset
    │   └── claimTips.asset
    │
    ├── threeCardBrag/
    │   ├── threeCardBrag.asset                  # CardGameMode instance
    │   ├── threeCardBragRules.asset             # CardGameRules instance
    │   ├── threeCardBragScoring.asset           # CardGameScoring instance
    │   ├── threeCardBragDescription.asset
    │   └── threeCardBragTips.asset
    │
    └── texasHoldem/
        ├── texasHoldem.asset
        ├── texasHoldemRules.asset
        ├── texasHoldemScoring.asset
        ├── texasHoldemDescription.asset
        └── texasHoldemTips.asset
```

---

## Implementation Phases

### Phase 1: Foundation Classes (Week 1)

**Tasks:**
1. Create `BaseRule.ts` (abstract foundation)
2. Create `BaseBonusRule.ts` (abstract card pattern)
3. Create `BonusDetail.ts` (evaluation result)
4. Create `CardGameRules.ts` (extends GameRules)
5. Create `CardGameScoring.ts` (extends Scoring)
6. Create `TrumpBonusValues.ts` (data structure)

**Deliverables:**
- Base class hierarchy compiling
- Unit tests for BonusDetail
- Documentation for each class

---

### Phase 2: Pattern Rules (Week 2)

**Tasks:**
1. Create `PairRule.ts` with full implementation
   - `initialize()` method
   - `evaluate()` method
   - `createExampleHand()` method
2. Create `FlushRule.ts`
3. Create `StraightRule.ts`
4. Create `ThreeOfAKindRule.ts`
5. Create `HighCardRule.ts` (fallback)

**Deliverables:**
- 5 working pattern rules
- Unit tests for each rule's `evaluate()` method
- Example generation tests

---

### Phase 3: Hand Utilities (Week 2)

**Tasks:**
1. Create `HandUtility.ts` with pattern detection methods:
   - `findPairs()`
   - `isFlush()`
   - `isSequence()`
   - `isTrumpInMiddle()`
   - `getRankCounts()`
2. Create `PatternEvaluator.ts` (orchestrates rules)

**Deliverables:**
- Complete HandUtility with tests
- PatternEvaluator with integration tests

---

### Phase 4: Remaining Pattern Rules (Week 3)

**Tasks:**
1. Create `StraightFlushRule.ts`
2. Create `FourOfAKindRule.ts`
3. Create `FullHouseRule.ts`
4. Create `RoyalFlushRule.ts`
5. Migrate YAML rule assets to use TypeScript classes

**Deliverables:**
- All 9 pattern rules complete
- Asset migration complete
- Integration tests pass

---

### Phase 5: Score Calculators (Week 3)

**Tasks:**
1. Create `CardGameScoreCalculator.ts` (poker-style)
2. Refactor `ClaimScoreCalculator.ts` to use new architecture
3. Create unit tests for both calculators
4. Integration tests with PatternEvaluator

**Deliverables:**
- Working score calculation for poker games
- Working score calculation for Claim
- End-to-end tests

---

### Phase 6: Game Assets Integration (Week 4)

**Tasks:**
1. Create Three Card Brag game assets:
   - `threeCardBragRules.asset`
   - `threeCardBragScoring.asset`
2. Create Texas Hold'em game assets:
   - `texasHoldemRules.asset`
   - `texasHoldemScoring.asset`
3. Update CardGameMode to load and initialize rules
4. Test full initialization flow

**Deliverables:**
- Working Three Card Brag game
- Working Texas Hold'em game
- Working Claim game (migrated)

---

### Phase 7: UI Integration (Week 4)

**Tasks:**
1. Update Asset Editor to support BaseBonusRule editing
2. Create inspector UI for CardGameRules
3. Create inspector UI for CardGameScoring
4. Display pattern examples in game UI
5. Display score breakdowns in game UI

**Deliverables:**
- Asset editor supports all new types
- Game UI shows pattern rules
- Game UI shows score calculations

---

### Phase 8: AI Integration (Week 5)

**Tasks:**
1. Update AI prompts to use `rules.LLM` text
2. Update AI prompts to include pattern `examples.LLM`
3. Test AI understanding of new rules format
4. Optimize prompt token usage

**Deliverables:**
- AI correctly understands game rules
- AI makes strategic decisions based on patterns
- Token usage optimized

---

## Critical Files to Modify

### New Files (Create)

1. **`src/lib/assets/game/rules/BaseRule.ts`**
2. **`src/lib/assets/game/rules/BaseBonusRule.ts`**
3. **`src/lib/assets/game/rules/BonusDetail.ts`**
4. **`src/lib/assets/game/rules/PairRule.ts`** (and 8 other pattern rules)
5. **`src/lib/assets/game/gameRules/CardGameRules.ts`**
6. **`src/lib/assets/game/gameRules/TrumpBonusValues.ts`**
7. **`src/lib/assets/game/scoring/CardGameScoring.ts`**
8. **`src/engine/logic/PatternEvaluator.ts`**
9. **`src/engine/logic/HandUtility.ts`**
10. **`src/engine/logic/scoring/CardGameScoreCalculator.ts`**

### Existing Files (Modify)

1. **`src/lib/assets/game/gameRules/GameRules.tsx`**
   - Keep existing LLM/Player fields
   - Remove moveValidityConditions (move to CardGameRules)

2. **`src/lib/assets/game/scoring/Scoring.tsx`**
   - Keep existing cardRankingAsset
   - Remove scoringRules (move to CardGameScoring)

3. **`src/lib/assets/gameMode/cardGameMode/CardGameMode.ts`**
   - Add methods: `loadBonusRules()`, `getCardRanking()`, `getScoringAsset()`
   - Add properties: `useTrump`, `trumpBonusValues`

4. **`src/engine/logic/scoring/ClaimScoreCalculator.ts`**
   - Refactor to use new architecture
   - Keep Hoarder's Multiplier logic

5. **`src/lib/core/registry/assetTypeMap.generated.ts`**
   - Add all new rule types to registry

### Asset Files (Create/Migrate)

1. **`packages/asset-editor/Resources/GameMode/CardGames/CommonCardRules/*.asset`**
   - Migrate YAML to use TypeScript class instances
   - Add example generation

2. **`packages/asset-editor/Resources/GameMode/CardGames/threeCardBrag/*.asset`**
   - Create threeCardBragRules.asset
   - Create threeCardBragScoring.asset

3. **`packages/asset-editor/Resources/GameMode/CardGames/texasHoldem/*.asset`**
   - Create texasHoldemRules.asset
   - Create texasHoldemScoring.asset

---

## Design Principles

### 1. Separation of Concerns

- **Rules define patterns** (what is a pair, flush, etc.)
- **Scoring defines formulas** (how to calculate points)
- **Evaluators detect patterns** (using HandUtility)
- **Calculators compute scores** (using pattern results + formulas)

### 2. Reusability

- Pattern rules (Pair, Flush) work across multiple games
- HandUtility methods reused by all rules
- PatternEvaluator works with any rule set
- ScoreCalculator adapts to different scoring types

### 3. Data-Driven Configuration

Three levels of customization:
1. **Code** (BaseBonusRule classes, HandUtility)
2. **Configuration** (TrumpBonusValues, patternMultipliers)
3. **Content** (GameRulesContainer text, examples)

Designers can modify levels 2-3 without touching code.

### 4. Dual-Audience Design

`GameRulesContainer { LLM, Player }` pattern:
- **LLM**: Concise, token-efficient, structured
- **Player**: Detailed, conversational, beginner-friendly

Examples stored separately for each audience.

### 5. Scriptable Object Architecture

All assets extend `ScriptableObject`:
- Serializable with `@serializable` decorator
- Loadable from YAML/JSON files
- Hot-reloadable in dev environment
- Editable in Asset Editor UI

### 6. Example Hands Include Scores

Pattern rules generate examples during `initialize()`:
- Use `createExampleHand()` to build valid hand
- Use `evaluate()` on example to get score
- Use CardRanking for card values
- Use Scoring config for multipliers
- Format for LLM and Player separately

**Result:** Examples are educational and complete.

### 7. Event-Driven Trump Resolution

Rules don't know how to get trump - they ask via event:
```typescript
protected async getTrumpCard(): Promise<Card | null> {
  const event = new GetTrumpCardEvent();
  await EventBus.instance.publishAsync(event);
  return event.trumpCard;
}
```

**Benefit:** Rules decoupled from game state/deck.

---

## Key Design Decisions

Based on the separation of concerns architecture:

### 1. Pattern Rules ≠ Scoring
- **Pattern Rules** define **WHAT** exists (Pair, Flush, Sequence)
- **Scoring Config** defines **HOW** to calculate scores FROM patterns
- Rules contain **NO scoring logic** - they only detect patterns and return metadata

### 2. Scoring Config is Game-Specific
- Each game has its own scoring formula:
  - **Claim**: Hoarder's Multiplier (sequences: sum × count)
  - **Three Card Brag**: Poker rankings with bonus multipliers
  - **Texas Hold'em**: Pure poker ranking (no bonus values)
- Same pattern rules (Pair, Flush) work across all games, but scoring differs

### 3. Pattern Evaluation is Shared
- `PatternEvaluator` is game-agnostic - detects patterns across all games
- `HandUtility` provides reusable pattern detection methods
- Games can use custom evaluators (e.g., Claim uses `ClaimScoreCalculator` for sequences)

### 4. Move Validity in Game Rules
- What actions are allowed is **game-specific**
- Claim has no betting actions (no raise, bet, fold)
- Three Card Brag has betting actions (raise, call, fold)
- Defined in `CardGameRules.moveValidityConditions`, not in pattern rules

### 5. UI/AI Display Uses Both
- **Game Rules** provide context (what actions allowed, game flow)
- **Pattern Rules** provide details (what patterns exist, examples)
- **Scoring Config** provides formulas (how points calculated)
- All three combined give complete information to UI and AI

### 6. Claim Uses Custom Logic
- Claim doesn't use `PatternEvaluator` or poker pattern rules
- Uses `ClaimScoreCalculator` with custom sequence detection
- Sequences work differently (consecutive cards in declared suit)
- This is intentional - not all games need pattern rules

---

## Benefits

### 1. Reusability
- Pattern rules (Pair, Flush, Straight) work across multiple games
- Same `PairRule` asset referenced by Three Card Brag, Texas Hold'em, etc.
- HandUtility methods reused by all rules

### 2. Flexibility
- Each game defines its own scoring formula without code changes
- Change `patternMultipliers` in asset file → scoring changes
- Add new game → create new scoring config, reuse pattern rules

### 3. Clarity
- Clear separation: rules define patterns, scoring calculates points
- Easy to understand: "What patterns exist?" vs "How to score them?"
- No confusion about where scoring logic lives

### 4. UI/AI Friendly
- Pattern descriptions/examples are separate from scoring logic
- UI can display patterns without knowing scoring formulas
- AI receives complete context (rules + patterns + scoring)

### 5. Extensibility
- New games add scoring config, reuse pattern rules
- New patterns add new rule class, works with all games
- Custom games (like Claim) can bypass pattern rules entirely

### 6. Maintainability
- Scoring changes don't affect pattern detection
- Pattern changes don't affect scoring formulas
- Each layer has single responsibility

---

## Testing Strategy

### Unit Tests

1. **Rule Evaluation Tests**
   - Test each rule's `evaluate()` with valid hands
   - Test each rule's `evaluate()` with invalid hands
   - Test trump card scenarios

2. **Example Generation Tests**
   - Test `createExampleHand()` produces valid hands
   - Test examples pass their own `evaluate()` check

3. **HandUtility Tests**
   - Test pattern detection methods
   - Test edge cases (Ace wraparound, trump wildcards)

### Integration Tests

1. **PatternEvaluator Tests**
   - Test evaluating hand against multiple rules
   - Test priority ordering
   - Test trump integration

2. **ScoreCalculator Tests**
   - Test poker-style scoring
   - Test Hoarder's Multiplier scoring
   - Test bonus calculation

### End-to-End Tests

1. **Game Flow Tests**
   - Load game mode → load rules → initialize → evaluate hand → calculate score
   - Test Three Card Brag complete flow
   - Test Claim complete flow

---

## Success Criteria

✅ **Pattern rules work across multiple games** (Pair rule used in both Three Card Brag and Texas Hold'em)

✅ **Example hands show complete information** (pattern + score + calculation)

✅ **Scoring is data-driven** (change patternMultipliers without code changes)

✅ **Rules are reusable** (same PairRule asset referenced by multiple games)

✅ **Trump system is flexible** (data-driven bonuses, event-driven card retrieval)

✅ **AI receives complete context** (rules + patterns + examples + scoring)

✅ **UI displays rich information** (pattern descriptions + examples + scores)

✅ **Asset editor supports all types** (BaseBonusRule, CardGameRules, CardGameScoring)

✅ **Tests pass** (unit + integration + end-to-end)

---

## Migration Path

### Existing Claim Game

1. **Keep ClaimScoreCalculator** (Hoarder's Multiplier is unique)
2. **Migrate claimRules.asset** to CardGameRules format
3. **Keep claimScoring.asset** (already compatible)
4. **No pattern rules needed** (Claim uses sequences, not poker patterns)

### New Three Card Brag

1. **Create threeCardBragRules.asset** (CardGameRules with bonusRuleGuids)
2. **Create threeCardBragScoring.asset** (poker_ranking type)
3. **Link pattern rules** (pair, flush, straight, etc.)
4. **Use CardGameScoreCalculator** (poker-style)

### New Texas Hold'em

1. **Create texasHoldemRules.asset** (CardGameRules with bonusRuleGuids)
2. **Create texasHoldemScoring.asset** (poker_ranking type, different multipliers)
3. **Reuse same pattern rules** (pair, flush, etc.)
4. **Use CardGameScoreCalculator** (poker-style)

---

## Design Decisions (Based on Unity Implementation)

### 1. Trump System: **Fully Data-Driven**
- Use `TrumpBonusValues` class (matches Unity pattern)
- All bonuses configurable via asset properties
- No game-specific trump code in rules
- Rules ask for trump card via events (decoupled)

### 2. Pattern Priority: **Defined in Each Rule**
- Each BaseBonusRule has `priority` property (Unity pattern)
- Priority determines evaluation order AND ranking
- NOT overridable per game (keeps it simple)
- Higher priority = more valuable hand

### 3. Example Generation: **Generated Once and Cached**
- Examples created during `initialize()` (Unity pattern)
- Cached in `examples` property
- No regeneration (examples are deterministic)
- Includes both regular and trump variants

### 4. Asset Migration: **Core 5 Rules First, Then Expand**
**Phase 1 (Immediate):**
- PairRule
- FlushRule
- StraightRule
- ThreeOfAKindRule
- HighCardRule

**Phase 2 (Later):**
- StraightFlushRule
- FourOfAKindRule
- FullHouseRule
- RoyalFlushRule
- Other specialty rules

### 5. Scoring Formula: **Free Text**
- Keep `scoringFormula` as free-text string (Unity uses descriptions)
- Used for UI display only
- Actual calculation in ScoreCalculator classes

---

## Current Problem: Asset Loading Failures

### Error Analysis
```
[AssetRegistry] No metadata found in assetTypeMap
Object { assetType: "BonusRule", normalizedType: "BonusRule" }

[GameRegistry] Skipping /GameMode/CardGames/CommonCardRules/straightflush.asset:
missing guid or assetType
```

### Root Cause
1. ❌ YAML assets declare `__assetType: "BonusRule"`
2. ❌ No TypeScript class `BonusRule` exists
3. ❌ Type not registered in `assetTypeMap.generated.ts`
4. ❌ AssetRegistry can't instantiate → assets skipped

### Solution
1. ✅ Create TypeScript classes (BaseBonusRule + concrete rules)
2. ✅ Register types in assetTypeMap
3. ✅ Update YAML assets to use specific types (e.g., `ThreeOfAKindRule` not `BonusRule`)

---

## Implementation Roadmap

### Phase 0: Type Registration & Base Classes (Day 1-2)

**Goal:** Fix asset loading by creating the type hierarchy

**Tasks:**
- [ ] Create `src/lib/assets/game/rules/BaseRule.ts`
- [ ] Create `src/lib/assets/game/rules/BaseBonusRule.ts`
- [ ] Create `src/lib/assets/game/rules/BonusDetail.ts`
- [ ] Create `src/lib/assets/game/gameRules/CardGameRules.ts`
- [ ] Create `src/lib/assets/game/gameRules/TrumpBonusValues.ts`
- [ ] Create `src/lib/assets/game/scoring/CardGameScoring.ts`
- [ ] Register types in `assetTypeMap.generated.ts`:
  ```typescript
  BaseRule: () => import('@/lib/assets/game/rules/BaseRule').then(m => m.BaseRule),
  BaseBonusRule: () => import('@/lib/assets/game/rules/BaseBonusRule').then(m => m.BaseBonusRule),
  CardGameRules: () => import('@/lib/assets/game/gameRules/CardGameRules').then(m => m.CardGameRules),
  CardGameScoring: () => import('@/lib/assets/game/scoring/CardGameScoring').then(m => m.CardGameScoring),
  ```

**Deliverables:**
- Base class hierarchy compiles
- Types registered in AssetRegistry
- Ready for concrete rules

**Test:**
```bash
npm run type-check  # Should pass
```

---

### Phase 1: Core Pattern Rules (Day 3-5)

**Goal:** Create 5 essential pattern rules to unblock assets

**Tasks:**
- [ ] Create `src/lib/assets/game/rules/PairRule.ts`
  - `static __assetType = 'PairRule'`
  - `initialize()` method (stub for now)
  - `evaluate()` method (stub for now)
  - `createExampleHand()` method (stub for now)
- [ ] Create `src/lib/assets/game/rules/FlushRule.ts`
- [ ] Create `src/lib/assets/game/rules/StraightRule.ts`
- [ ] Create `src/lib/assets/game/rules/ThreeOfAKindRule.ts`
- [ ] Create `src/lib/assets/game/rules/HighCardRule.ts`
- [ ] Register concrete types in `assetTypeMap.generated.ts`:
  ```typescript
  PairRule: () => import('@/lib/assets/game/rules/PairRule').then(m => m.PairRule),
  FlushRule: () => import('@/lib/assets/game/rules/FlushRule').then(m => m.FlushRule),
  StraightRule: () => import('@/lib/assets/game/rules/StraightRule').then(m => m.StraightRule),
  ThreeOfAKindRule: () => import('@/lib/assets/game/rules/ThreeOfAKindRule').then(m => m.ThreeOfAKindRule),
  HighCardRule: () => import('@/lib/assets/game/rules/HighCardRule').then(m => m.HighCardRule),
  ```

**Deliverables:**
- 5 concrete rule classes (stubs)
- Registered in AssetRegistry
- Assets can load (even if logic is incomplete)

**Test:**
```bash
# Check that assets load without "missing guid or assetType" errors
npm run dev
# Open browser console, check GameRegistry logs
```

---

### Phase 2: Asset Migration (Day 5)

**Goal:** Update YAML assets to use concrete types

**Tasks:**
- [ ] Update `packages/asset-editor/Resources/GameMode/CardGames/CommonCardRules/pairrule.asset`:
  ```yaml
  __schemaVersion: 1
  __assetType: PairRule  # Changed from BonusRule
  __assetId: pair
  __guid: <generate-new-guid>
  metadata:
    gameModeId: claim
    assetId: pair
    assetType: PairRule
    createdAt: "2025-01-20T00:00:00.000Z"
    updatedAt: "2025-01-20T00:00:00.000Z"
  minNumberOfCard: 2
  bonusValue: 100
  priority: 87
  ruleName: Pair
  patternType: pair
  description: "Two cards of the same rank"
  examples:
    LLM: ""
    Player: ""
  ```
- [ ] Update `flush.asset` → `__assetType: FlushRule`
- [ ] Update `threeofakind.asset` → `__assetType: ThreeOfAKindRule`
- [ ] Update other core rule assets
- [ ] Generate GUIDs for all assets (if missing)

**Deliverables:**
- 5 assets load successfully
- No "missing guid or assetType" errors
- Assets appear in Asset Editor

**Test:**
```bash
# Run dev server, check console
npm run dev
# Should see: "[AssetRegistry] Loaded PairRule" etc.
```

---

### Phase 3: HandUtility & Pattern Detection (Day 6-8)

**Goal:** Implement pattern detection logic

**Tasks:**
- [ ] Create `src/engine/logic/HandUtility.ts`:
  ```typescript
  export class HandUtility {
    static findPairs(hand: Card[], trumpCard?: Card, useTrump?: boolean): Rank[]
    static isFlush(hand: Card[]): boolean
    static isSequence(hand: Card[]): boolean
    static isStraight(hand: Card[]): boolean
    static isThreeOfAKind(hand: Card[], trumpCard?: Card, useTrump?: boolean): boolean
    static getRankCounts(hand: Card[], trumpCard?: Card, useTrump?: boolean): Record<string, number>
    static getSuitCounts(hand: Card[]): Record<string, number>
    static isTrumpInMiddle(hand: Card[], trumpCard: Card): boolean
    static isRankAdjacentToTrump(hand: Card[], trumpCard: Card): boolean
    // ... more helpers
  }
  ```
- [ ] Write unit tests for each method:
  - `HandUtility.spec.ts`
  - Test with valid hands
  - Test with invalid hands
  - Test with trump cards

**Deliverables:**
- Complete HandUtility implementation
- 100% test coverage
- All tests passing

**Test:**
```bash
npm run test -- HandUtility.spec.ts
```

---

### Phase 4: Rule Evaluation Logic (Day 9-11)

**Goal:** Implement `evaluate()` method for each rule

**Tasks:**
- [ ] Implement `PairRule.evaluate()`:
  ```typescript
  async evaluate(hand: Card[], trumpCard?: Card): Promise<BonusDetail | null> {
    if (hand.length < this.minNumberOfCard) return null;

    const pairRanks = HandUtility.findPairs(hand, trumpCard, this.gameMode?.useTrump);
    if (pairRanks.length === 0) return null;

    const pairRank = pairRanks[0];
    let baseBonus: number;
    let calculation: string;

    if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
      baseBonus = this.bonusValue * (pairRank.value + trumpCard.value);
      calculation = `${this.bonusValue} * (${pairRank.value} + ${trumpCard.value})`;
    } else {
      baseBonus = this.bonusValue * pairRank.value * 2;
      calculation = `${this.bonusValue} * (${pairRank.value} * 2)`;
    }

    let additionalBonus = 0;
    const descriptions: string[] = [`Pair of ${pairRank.name}s`];

    if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
      const trumpBonus = this.gameMode.trumpBonusValues?.pairBonus ?? 0;
      additionalBonus += trumpBonus;
      descriptions.push(`Trump Card Bonus: +${trumpBonus}`);
      calculation += ` + ${trumpBonus}`;
    }

    return {
      ruleName: this.ruleName,
      baseBonus,
      additionalBonus,
      bonusDescriptions: descriptions,
      bonusCalculationDescriptions: calculation,
      priority: this.priority,
      matchedCards: hand.filter(c => c.value === pairRank.value),
    };
  }
  ```
- [ ] Implement `FlushRule.evaluate()`
- [ ] Implement `StraightRule.evaluate()`
- [ ] Implement `ThreeOfAKindRule.evaluate()`
- [ ] Implement `HighCardRule.evaluate()`
- [ ] Write unit tests for each rule's evaluate method

**Deliverables:**
- All 5 rules can evaluate hands
- Return correct BonusDetail
- Tests passing

**Test:**
```bash
npm run test -- PairRule.spec.ts
npm run test -- FlushRule.spec.ts
# etc.
```

---

### Phase 5: Example Hand Generation (Day 12-14)

**Goal:** Implement `createExampleHand()` and `initialize()`

**Tasks:**
- [ ] Implement `PairRule.createExampleHand()`:
  ```typescript
  createExampleHand(
    handSize: number,
    cardRanking: CardRanking,
    trumpCard?: Card,
    coloured: boolean = true
  ): string[] {
    const pairRank = this.getRandomRank(cardRanking, Rank.Two, Rank.King);
    const suits = [Suit.Spade, Suit.Diamond, Suit.Heart, Suit.Club];
    const hand: string[] = [];

    // Add pair
    hand.push(CardUtility.getRankSymbol(suits[0], pairRank, coloured));
    hand.push(CardUtility.getRankSymbol(suits[1], pairRank, coloured));

    // Fill rest with random non-duplicate cards
    while (hand.length < handSize) {
      const randomRank = this.getRandomRank(cardRanking);
      if (randomRank.value !== pairRank.value) {
        hand.push(CardUtility.getRankSymbol(suits[2], randomRank, coloured));
      }
    }

    return hand;
  }
  ```
- [ ] Implement `PairRule.initialize()`:
  ```typescript
  async initialize(gameMode: CardGameMode): Promise<boolean> {
    this.gameMode = gameMode;
    this.description = 'Two cards of the same rank';

    const cardRanking = await gameMode.getCardRanking();
    const scoring = await gameMode.getScoringAsset();

    // Generate regular example
    const exampleCards = this.createExampleHand(3, cardRanking);
    this.examples = await this.createExampleWithScore(exampleCards, cardRanking, scoring);

    // Generate trump example if applicable
    if (gameMode.useTrump) {
      const trumpCard = await this.getTrumpCard();
      const trumpExampleCards = this.createExampleHand(3, cardRanking, trumpCard);
      const trumpExamples = await this.createExampleWithScore(trumpExampleCards, cardRanking, scoring);

      this.examples.LLM += `\nWith Trump: ${trumpExamples.LLM}`;
      this.examples.Player += `\n\nWith Trump:\n${trumpExamples.Player}`;
    }

    return true;
  }
  ```
- [ ] Implement same for other 4 rules
- [ ] Create `CardUtility.ts` helper (if doesn't exist):
  ```typescript
  export class CardUtility {
    static getRankSymbol(suit: Suit, rank: Rank, coloured: boolean = true): string
    static getCardFromSymbol(symbol: string): Card
    static getRandomSuit(): Suit
    // ... more helpers
  }
  ```
- [ ] Write tests for example generation

**Deliverables:**
- Rules generate valid example hands
- Examples include scores
- Initialize creates dual-audience text

**Test:**
```bash
npm run test -- PairRule.spec.ts  # Test createExampleHand
# Manually test: load game, check rule.examples.Player in console
```

---

### Phase 6: PatternEvaluator & ScoreCalculator (Day 15-17)

**Goal:** Orchestrate pattern detection and scoring

**Tasks:**
- [ ] Create `src/engine/logic/PatternEvaluator.ts`:
  ```typescript
  export class PatternEvaluator {
    constructor(private rules: BaseBonusRule[], private trumpCard?: Card) {}

    async evaluateAllPatterns(hand: Card[]): Promise<BonusDetail[]> {
      const results: BonusDetail[] = [];

      for (const rule of this.rules) {
        const detail = await rule.evaluate(hand, this.trumpCard);
        if (detail) results.push(detail);
      }

      return results.sort((a, b) => b.priority - a.priority);
    }

    async getBestPattern(hand: Card[]): Promise<BonusDetail | null> {
      const all = await this.evaluateAllPatterns(hand);
      return all[0] ?? null;
    }
  }
  ```
- [ ] Create `src/engine/logic/scoring/CardGameScoreCalculator.ts`:
  ```typescript
  export class CardGameScoreCalculator {
    constructor(
      private scoring: CardGameScoring,
      private rules: BaseBonusRule[],
      private trumpCard?: Card
    ) {}

    async calculateScore(hand: Card[]): Promise<ScoreBreakdown> {
      const evaluator = new PatternEvaluator(this.rules, this.trumpCard);
      const patterns = await evaluator.evaluateAllPatterns(hand);

      if (patterns.length === 0) {
        return { baseScore: 0, totalScore: 0, /* ... */ };
      }

      const best = patterns[0];
      const totalScore = best.baseBonus + best.additionalBonus;

      return {
        baseScore: best.baseBonus,
        bonuses: best.additionalBonus,
        totalScore,
        bonusDetails: { patterns, winner: best },
        matchedPattern: best.ruleName,
      };
    }
  }
  ```
- [ ] Write integration tests

**Deliverables:**
- PatternEvaluator working
- CardGameScoreCalculator working
- Integration tests passing

**Test:**
```bash
npm run test -- PatternEvaluator.spec.ts
npm run test -- CardGameScoreCalculator.spec.ts
```

---

### Phase 7: CardGameMode Integration (Day 18-19)

**Goal:** Connect rules to GameMode

**Tasks:**
- [ ] Update `src/lib/assets/gameMode/cardGameMode/CardGameMode.ts`:
  ```typescript
  export class CardGameMode extends TurnBasedGameMode {
    @serializable({ label: 'Use Trump Cards', group: 'Card Rules' })
    useTrump: boolean = false;

    @serializable({ label: 'Trump Bonus Values', group: 'Card Rules' })
    trumpBonusValues?: TrumpBonusValues;

    async getCardRanking(): Promise<CardRanking> {
      if (!this.scoringAsset) throw new Error('Scoring asset not loaded');
      return this.scoringAsset.cardRankingAsset;
    }

    async getScoringAsset(): Promise<CardGameScoring> {
      if (!this.scoringAsset) throw new Error('Scoring asset not loaded');
      return this.scoringAsset as CardGameScoring;
    }

    async loadBonusRules(): Promise<BaseBonusRule[]> {
      const rules = await this.gameRulesAsset?.loadBonusRules() ?? [];

      // Initialize all rules
      for (const rule of rules) {
        await rule.initialize(this);
      }

      return rules;
    }
  }
  ```
- [ ] Update `src/lib/assets/game/gameRules/GameRules.tsx`:
  - Keep existing LLM/Player fields
  - Don't break existing Claim game

**Deliverables:**
- CardGameMode can load rules
- Rules initialize correctly
- Backward compatible with Claim

**Test:**
```bash
# Load Claim game, ensure it still works
npm run dev
# Open Claim game, check console for errors
```

---

### Phase 8: Game Assets (Three Card Brag) (Day 20-22)

**Goal:** Create Three Card Brag game with pattern rules

**Tasks:**
- [ ] Create `packages/asset-editor/Resources/GameMode/CardGames/threeCardBrag/threeCardBragRules.asset`:
  ```yaml
  __schemaVersion: 1
  __assetType: CardGameRules
  __assetId: three-card-brag-rules
  __guid: <generate-guid>
  metadata:
    assetId: three-card-brag-rules
    assetType: CardGameRules
    createdAt: "2025-01-20T00:00:00.000Z"
    updatedAt: "2025-01-20T00:00:00.000Z"
  LLM: "Three Card Brag: 3 cards, bet blind/see, raise/call/fold..."
  Player: "Three Card Brag: Get 3 cards, bet or fold..."
  moveValidityConditions:
    bet_blind: "Valid if hand not seen"
    see_hand: "Valid if hand not seen"
    raise: "Valid if have enough coins"
    call: "Valid when bet to call"
    fold: "Always valid"
  bonusRuleGuids:
    - <pair-rule-guid>
    - <flush-rule-guid>
    - <straight-rule-guid>
    - <threeofakind-rule-guid>
    - <highcard-rule-guid>
  useTrump: true
  trumpBonusValues:
    cardInMiddleBonus: 5
    threeOfKindBonus: 15
    pairBonus: 5
    flushBonus: 20
    trumpCardBonus: 10
  ```
- [ ] Create `packages/asset-editor/Resources/GameMode/CardGames/threeCardBrag/threeCardBragScoring.asset`:
  ```yaml
  __schemaVersion: 1
  __assetType: CardGameScoring
  __assetId: three-card-brag-scoring
  __guid: <generate-guid>
  metadata:
    assetId: three-card-brag-scoring
    assetType: CardGameScoring
    createdAt: "2025-01-20T00:00:00.000Z"
    updatedAt: "2025-01-20T00:00:00.000Z"
  scoringType: poker_ranking
  scoringFormula: "Base bonus value × rank multiplier"
  cardRankingAsset: <standard-ranking-guid>
  patternMultipliers:
    pair: 50
    flush: 100
    straight: 90
    three_of_kind: 125
    high_card: 10
  priorityOrder:
    - three_of_kind
    - flush
    - straight
    - pair
    - high_card
  ```
- [ ] Create `packages/asset-editor/Resources/GameMode/CardGames/threeCardBrag/threeCardBrag.asset`:
  ```yaml
  __schemaVersion: 2
  __assetType: CardGameMode
  __assetId: three-card-brag
  __guid: <generate-guid>
  metadata:
    gameId: three-card-brag
    gameName: "Three Card Brag"
    displayName: "Three Card Brag"
    category: CardGames
  initialPlayerCoins: 10000
  minRounds: 1
  maxRounds: 10
  turnDuration: 60
  baseBet: 5
  initialNumberOfCards: 3
  maxNumberOfCards: 3
  minDecks: 1
  maxDecks: 1
  scoringAsset: <three-card-brag-scoring-guid>
  gameRulesAsset: <three-card-brag-rules-guid>
  minPlayers: 2
  maxPlayers: 13
  useTrump: true
  trumpBonusValues:
    threeOfKindBonus: 15
    pairBonus: 5
    flushBonus: 20
  ```
- [ ] Test game loads and rules initialize

**Deliverables:**
- Three Card Brag game asset
- Rules asset with bonus rules
- Scoring asset with multipliers
- Game loads successfully

**Test:**
```bash
npm run dev
# Navigate to Three Card Brag game
# Check console: rules loaded, examples generated
```

---

### Phase 9: Remaining Pattern Rules (Day 23-25)

**Goal:** Add advanced pattern rules

**Tasks:**
- [ ] Create `StraightFlushRule.ts`
- [ ] Create `FourOfAKindRule.ts`
- [ ] Create `FullHouseRule.ts`
- [ ] Create `RoyalFlushRule.ts`
- [ ] Register in assetTypeMap
- [ ] Create corresponding .asset files
- [ ] Add to Three Card Brag bonusRuleGuids
- [ ] Write tests

**Deliverables:**
- All 9 pattern rules complete
- Registered and loadable
- Three Card Brag uses all rules

**Test:**
```bash
npm run test -- *Rule.spec.ts
```

---

### Phase 10: UI Integration (Day 26-28)

**Goal:** Display rules and scoring in UI

**Tasks:**
- [ ] Create `src/lib/assets/game/rules/BaseBonusRuleInspector.tsx`:
  ```typescript
  export function BaseBonusRuleInspector({ asset }: { asset: BaseBonusRule }) {
    return (
      <div>
        <TextField label="Rule Name" value={asset.ruleName} readOnly />
        <TextField label="Pattern Type" value={asset.patternType} />
        <NumberField label="Minimum Cards" value={asset.minNumberOfCard} />
        <NumberField label="Bonus Value" value={asset.bonusValue} onChange={...} />
        <NumberField label="Priority" value={asset.priority} onChange={...} />
        <TextAreaField label="Description" value={asset.description} onChange={...} />
        <div>
          <h3>Examples (Player)</h3>
          <pre>{asset.examples?.Player}</pre>
        </div>
        <div>
          <h3>Examples (LLM)</h3>
          <pre>{asset.examples?.LLM}</pre>
        </div>
      </div>
    );
  }
  ```
- [ ] Create `CardGameRulesInspector.tsx`
- [ ] Create `CardGameScoringInspector.tsx`
- [ ] Register inspectors in inspector registry
- [ ] Test in Asset Editor

**Deliverables:**
- Asset Editor shows rule properties
- Can edit bonus values, priorities
- Can view generated examples

**Test:**
```bash
npm run dev
# Open Asset Editor
# Load pair.asset
# Verify all fields display correctly
```

---

### Phase 11: Game UI Display (Day 29-30)

**Goal:** Show pattern rules in game UI

**Tasks:**
- [ ] Create `src/ui/components/game/PatternRulesDisplay.tsx`:
  ```typescript
  export function PatternRulesDisplay({ rules }: { rules: BaseBonusRule[] }) {
    return (
      <div className="pattern-rules">
        <h2>Hand Rankings</h2>
        {rules.map(rule => (
          <div key={rule.ruleName} className="rule-card">
            <h3>{rule.ruleName}</h3>
            <p>{rule.description}</p>
            <div className="examples">
              {rule.examples?.Player}
            </div>
          </div>
        ))}
      </div>
    );
  }
  ```
- [ ] Create `ScoreBreakdownDisplay.tsx`:
  ```typescript
  export function ScoreBreakdownDisplay({ breakdown }: { breakdown: ScoreBreakdown }) {
    return (
      <div className="score-breakdown">
        <h3>Score: {breakdown.totalScore}</h3>
        <div>Pattern: {breakdown.matchedPattern}</div>
        <div>
          <h4>Breakdown:</h4>
          <ul>
            {breakdown.bonusDetails?.winner?.bonusDescriptions.map((desc, i) => (
              <li key={i}>{desc}</li>
            ))}
          </ul>
        </div>
        <div>Calculation: {breakdown.bonusDetails?.winner?.bonusCalculationDescriptions}</div>
      </div>
    );
  }
  ```
- [ ] Integrate into game UI

**Deliverables:**
- Rules display in game UI
- Score breakdown shows in game UI
- Examples visible to players

**Test:**
```bash
npm run dev
# Play Three Card Brag
# Check rules display
# Make a hand, check score breakdown
```

---

### Phase 12: Testing & Refinement (Day 31-35)

**Goal:** Comprehensive testing and bug fixes

**Tasks:**
- [ ] Write end-to-end tests:
  ```typescript
  describe('Three Card Brag Full Flow', () => {
    it('should load game, initialize rules, evaluate hand, calculate score', async () => {
      const gameMode = await AssetRegistry.loadAsset('three-card-brag');
      const rules = await gameMode.loadBonusRules();

      expect(rules.length).toBeGreaterThan(0);

      const hand: Card[] = [/* pair of queens */];
      const evaluator = new PatternEvaluator(rules);
      const result = await evaluator.getBestPattern(hand);

      expect(result?.ruleName).toBe('Pair');
      expect(result?.totalBonus).toBeGreaterThan(0);
    });
  });
  ```
- [ ] Test trump card scenarios
- [ ] Test all pattern combinations
- [ ] Test edge cases (Ace wraparound, etc.)
- [ ] Fix bugs found during testing
- [ ] Performance optimization
- [ ] Code cleanup

**Deliverables:**
- 100% test coverage for critical paths
- All tests passing
- No console errors
- Performance acceptable

**Test:**
```bash
npm run test
npm run test:e2e
npm run lint
npm run type-check
```

---

## Critical Files: Complete List

### Files to Create (New)

#### Base Classes
1. `src/lib/assets/game/rules/BaseRule.ts`
2. `src/lib/assets/game/rules/BaseBonusRule.ts`
3. `src/lib/assets/game/rules/BonusDetail.ts`
4. `src/lib/assets/game/rules/index.ts`

#### Concrete Pattern Rules (Phase 1)
5. `src/lib/assets/game/rules/PairRule.ts`
6. `src/lib/assets/game/rules/FlushRule.ts`
7. `src/lib/assets/game/rules/StraightRule.ts`
8. `src/lib/assets/game/rules/ThreeOfAKindRule.ts`
9. `src/lib/assets/game/rules/HighCardRule.ts`

#### Concrete Pattern Rules (Phase 2)
10. `src/lib/assets/game/rules/StraightFlushRule.ts`
11. `src/lib/assets/game/rules/FourOfAKindRule.ts`
12. `src/lib/assets/game/rules/FullHouseRule.ts`
13. `src/lib/assets/game/rules/RoyalFlushRule.ts`

#### GameRules Extensions
14. `src/lib/assets/game/gameRules/CardGameRules.ts`
15. `src/lib/assets/game/gameRules/TrumpBonusValues.ts`
16. `src/lib/assets/game/gameRules/CardGameRulesInspector.tsx`

#### Scoring Extensions
17. `src/lib/assets/game/scoring/CardGameScoring.ts`
18. `src/lib/assets/game/scoring/CardGameScoringInspector.tsx`

#### Engine Logic
19. `src/engine/logic/HandUtility.ts`
20. `src/engine/logic/PatternEvaluator.ts`
21. `src/engine/logic/scoring/CardGameScoreCalculator.ts`

#### Utilities
22. `src/lib/utils/CardUtility.ts` (if doesn't exist)

#### UI Components
23. `src/lib/assets/game/rules/BaseBonusRuleInspector.tsx`
24. `src/ui/components/game/PatternRulesDisplay.tsx`
25. `src/ui/components/game/ScoreBreakdownDisplay.tsx`

#### Tests
26. `src/lib/assets/game/rules/__tests__/PairRule.spec.ts`
27. `src/lib/assets/game/rules/__tests__/FlushRule.spec.ts`
28. `src/engine/logic/__tests__/HandUtility.spec.ts`
29. `src/engine/logic/__tests__/PatternEvaluator.spec.ts`
30. `src/engine/logic/scoring/__tests__/CardGameScoreCalculator.spec.ts`
31. `src/__tests__/e2e/ThreeCardBrag.spec.ts`

### Files to Modify (Existing)

#### Core Types
32. `src/lib/core/registry/assetTypeMap.generated.ts` - Add 13+ new types
33. `src/types/game.ts` - Add BonusDetail, ScoreBreakdown types (if not exist)

#### GameMode
34. `src/lib/assets/gameMode/cardGameMode/CardGameMode.ts` - Add rule loading methods
35. `src/gameMode/core/GameMode.ts` - No changes needed (keep as-is)

#### Existing Assets
36. `src/lib/assets/game/gameRules/GameRules.tsx` - Keep backward compatible
37. `src/lib/assets/game/scoring/Scoring.tsx` - Keep backward compatible

#### Score Calculator
38. `src/engine/logic/scoring/ClaimScoreCalculator.ts` - Keep as-is (Claim-specific)

### Asset Files to Create/Migrate

#### Pattern Rule Assets
39. `packages/asset-editor/Resources/GameMode/CardGames/CommonCardRules/pair.asset` - Update to PairRule
40. `packages/asset-editor/Resources/GameMode/CardGames/CommonCardRules/flush.asset` - Update to FlushRule
41. `packages/asset-editor/Resources/GameMode/CardGames/CommonCardRules/straight.asset` - Update to StraightRule
42. `packages/asset-editor/Resources/GameMode/CardGames/CommonCardRules/threeofakind.asset` - Update to ThreeOfAKindRule
43. `packages/asset-editor/Resources/GameMode/CardGames/CommonCardRules/highcard.asset` - Update to HighCardRule
44. `packages/asset-editor/Resources/GameMode/CardGames/CommonCardRules/straightflush.asset` - Update to StraightFlushRule
45. `packages/asset-editor/Resources/GameMode/CardGames/CommonCardRules/fourofakind.asset` - Update to FourOfAKindRule
46. `packages/asset-editor/Resources/GameMode/CardGames/CommonCardRules/fullhouse.asset` - Update to FullHouseRule
47. `packages/asset-editor/Resources/GameMode/CardGames/CommonCardRules/royalflush.asset` - Update to RoyalFlushRule

#### Three Card Brag Assets
48. `packages/asset-editor/Resources/GameMode/CardGames/threeCardBrag/threeCardBrag.asset` - Create new
49. `packages/asset-editor/Resources/GameMode/CardGames/threeCardBrag/threeCardBragRules.asset` - Create new
50. `packages/asset-editor/Resources/GameMode/CardGames/threeCardBrag/threeCardBragScoring.asset` - Create new
51. `packages/asset-editor/Resources/GameMode/CardGames/threeCardBrag/threeCardBragDescription.asset` - Create new
52. `packages/asset-editor/Resources/GameMode/CardGames/threeCardBrag/threeCardBragTips.asset` - Create new

#### Card Rankings
53. `packages/asset-editor/Resources/Cards/standardRankings.asset` - Create if doesn't exist

---

## Execution Checklist

### Week 1: Foundation
- [ ] Day 1: Create BaseRule, BaseBonusRule, BonusDetail
- [ ] Day 2: Create CardGameRules, TrumpBonusValues, CardGameScoring
- [ ] Day 3: Register types in assetTypeMap
- [ ] Day 4: Create 5 core pattern rule stubs (Pair, Flush, Straight, ThreeOfAKind, HighCard)
- [ ] Day 5: Migrate 5 core YAML assets to use concrete types

### Week 2: Pattern Detection
- [ ] Day 6-7: Implement HandUtility with all pattern detection methods
- [ ] Day 8: Write HandUtility tests
- [ ] Day 9-10: Implement evaluate() for 5 core rules
- [ ] Day 11: Write evaluate() tests

### Week 3: Examples & Integration
- [ ] Day 12-13: Implement createExampleHand() for 5 core rules
- [ ] Day 14: Implement initialize() for 5 core rules
- [ ] Day 15-16: Create PatternEvaluator and CardGameScoreCalculator
- [ ] Day 17: Write integration tests

### Week 4: Game Assets & UI
- [ ] Day 18: Update CardGameMode with rule loading
- [ ] Day 19: Test backward compatibility with Claim
- [ ] Day 20-21: Create Three Card Brag assets
- [ ] Day 22: Test Three Card Brag loads and works
- [ ] Day 23-24: Create remaining 4 pattern rules (StraightFlush, FourOfAKind, FullHouse, RoyalFlush)
- [ ] Day 25: Add advanced rules to Three Card Brag

### Week 5: UI & Testing
- [ ] Day 26-27: Create inspector UIs for rules and scoring
- [ ] Day 28: Create game UI components (PatternRulesDisplay, ScoreBreakdownDisplay)
- [ ] Day 29: Integrate UI components into game
- [ ] Day 30: Manual testing and bug fixes
- [ ] Day 31-35: Comprehensive testing, refinement, documentation

---

## Success Metrics

### Technical Metrics
- ✅ Zero "missing guid or assetType" errors in console
- ✅ All 9+ pattern rules registered and loadable
- ✅ Test coverage >90% for rule evaluation
- ✅ Pattern detection works for all combinations
- ✅ Score calculation accurate for all scenarios
- ✅ Trump system works correctly
- ✅ Example generation produces valid hands

### Functional Metrics
- ✅ Claim game still works (backward compatibility)
- ✅ Three Card Brag game fully playable
- ✅ Rules display correctly in UI
- ✅ Score breakdowns show in UI
- ✅ Asset Editor supports all rule types
- ✅ AI receives complete rule context

### Performance Metrics
- ✅ Asset loading <500ms
- ✅ Hand evaluation <50ms
- ✅ Example generation <100ms
- ✅ No memory leaks
- ✅ No console errors/warnings

---

**Ready to start implementation following this roadmap!**

