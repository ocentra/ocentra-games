# Rule & Bonus Abstraction

## Core Responsibilities

- Bonus logic is encapsulated in `BaseBonusRule` ScriptableObjects. Each rule owns the metadata required for editors (name, description, priority, examples) and runtime behaviour (evaluation, bonus calculation, trump support).
- Rules are attached as sub-assets under a `GameMode`, enabling per-mode customization while sharing code.

```13:145:References/Scripts/OcentraAI/LLMGames/GameMode/CardGames/Rules/BaseBonusRule.cs
    public abstract class BaseBonusRule : SerializedScriptableObject
    {
        [OdinSerialize, ShowInInspector, ReadOnly] public abstract int MinNumberOfCard { get; protected set; }
        [OdinSerialize, ShowInInspector] public abstract int BonusValue { get; protected set; }
        [OdinSerialize, ShowInInspector] public abstract int Priority { get; protected set; }
        [OdinSerialize, ShowInInspector, ReadOnly] public abstract string RuleName { get; protected set; }
        [OdinSerialize, ShowInInspector, ReadOnly] public string Description { get; protected set; }
        [OdinSerialize, ShowInInspector, ReadOnly] public GameMode GameMode { get; protected set; }
        [OdinSerialize, ShowInInspector] public GameRulesContainer Examples { get; protected set; } = new GameRulesContainer();

        public void UpdateRule(int bonusValue, int priority)
        {
            BonusValue = bonusValue;
            Priority = priority;
        }

        public bool SetGameMode(GameMode gameMode)
        {
            GameMode = gameMode;
            return Initialize(gameMode);
        }

        public abstract bool Initialize(GameMode gameMode);
        public abstract bool Evaluate(Hand hand, out BonusDetail bonusDetail);
        public abstract string[] CreateExampleHand(int handSize, string trumpCard = null, bool coloured = true);

        protected Card GetTrumpCard()
        {
            Card trumpCard = GetTrumpCardAsync().GetAwaiter().GetResult();
            if (trumpCard == null)
            {
                GameLoggerScriptable.Instance.LogError("TrumpCard retrieval failed. Default behavior will apply.", this);
            }
            return trumpCard;
        }

        protected BonusDetail CreateBonusDetails(string ruleName, int baseBonus, int priority,
            List<string> descriptions, string bonusCalculationDescriptions, int additionalBonus = 0)
        {
            return new BonusDetail
            {
                RuleName = ruleName,
                BaseBonus = baseBonus,
                AdditionalBonus = additionalBonus,
                BonusDescriptions = descriptions,
                Priority = priority,
                BonusCalculationDescriptions = bonusCalculationDescriptions
            };
        }

        protected bool TryCreateExample(string ruleName, string description, int bonusValue,
            List<string> playerExamples,
            List<string> llmExamples, List<string> playerTrumpExamples,
            List<string> llmTrumpExamples, bool useTrump)
        {
            // Builds paired Player/LLM example text, adding trump variants when available.
            // ... existing code ...
        }
    }
```

## Result Payloads

- Evaluation returns a `BonusDetail` object that captures rule identification, base/extra bonus, textual explanations, and final priority (used for ordering payouts).

```10:20:References/Scripts/OcentraAI/LLMGames/GameMode/CardGames/Rules/BonusDetail.cs
    public class BonusDetail : IBonusDetail
    {
        [OdinSerialize] [ShowInInspector] public string RuleName { get; set; }
        [OdinSerialize] [ShowInInspector] public int BaseBonus { get; set; }
        [OdinSerialize] [ShowInInspector] public int AdditionalBonus { get; set; }
        [OdinSerialize] [ShowInInspector] public List<string> BonusDescriptions { get; set; } = new List<string>();
        [OdinSerialize] [ShowInInspector] public string BonusCalculationDescriptions { get; set; }
        [OdinSerialize] [ShowInInspector] public int Priority { get; set; }
        [OdinSerialize] [ShowInInspector] public int TotalBonus => BaseBonus + AdditionalBonus;
    }
```

## Example: Four of a Kind

- Concrete rules use `HandUtility` helpers to detect patterns, apply trump logic, and build human-readable explanations with coloured symbols.

```11:178:References/Scripts/OcentraAI/LLMGames/GameMode/CardGames/Rules/FourOfAKind.cs
    public class FourOfAKind : BaseBonusRule
    {
        public override int MinNumberOfCard { get; protected set; } = 4;
        public override string RuleName { get; protected set; } = $"{nameof(FourOfAKind)}";
        public override int BonusValue { get; protected set; } = 135;
        public override int Priority { get; protected set; } = 93;

        public override bool Evaluate(Hand hand, out BonusDetail bonusDetail)
        {
            bonusDetail = null;
            if (!hand.VerifyHand(GameMode, MinNumberOfCard))
            {
                return false;
            }

            Card trumpCard = GetTrumpCard();

            if (hand.IsFourOfAKind(trumpCard, GameMode.UseTrump))
            {
                bonusDetail = CalculateBonus(hand, trumpCard);
                return true;
            }

            return false;
        }

        private BonusDetail CalculateBonus(Hand hand, Card trumpCard)
        {
            // Computes base bonus differently when trump participates and appends human-readable breakdown.
            // ... existing code ...
        }

        public override bool Initialize(GameMode gameMode)
        {
            Description =
                "Four cards of the same rank (2 to K, excluding A and trump rank), optionally using one Trump card to upgrade Three of a Kind.";
            // Generates Player/LLM example strings (with trump variants) via TryCreateExample.
            // ... existing code ...
            return TryCreateExample(RuleName, Description, BonusValue, playerExamples, llmExamples, playerTrumpExamples,
                llmTrumpExamples, gameMode.UseTrump);
        }
    }
```

## Supporting Structures

- `CustomRuleState` stores per-game toggles for rule templates, letting designers adjust priority/bonus values without editing the original asset.

```7:18:References/Scripts/OcentraAI/LLMGames/GameMode/CardGames/CustomRuleState.cs
    public class CustomRuleState
    {
        public CustomRuleState(BaseBonusRule rule)
        {
            Priority = rule.Priority;
            BonusValue = rule.BonusValue;
        }

        [OdinSerialize] [ShowInInspector] public float Priority { get; set; }
        [OdinSerialize] [ShowInInspector] public float BonusValue { get; set; }
        [OdinSerialize] [ShowInInspector] public bool IsSelected { get; set; }
    }
```

- `TrumpBonusValues` exposes per-pattern modifiers that live alongside the game mode, so trump-related bonuses remain data-driven.

```6:64:References/Scripts/OcentraAI/LLMGames/GameMode/CardGames/TrumpBonusValues.cs
    public class TrumpBonusValues
    {
        [Tooltip("Bonus for having the Trump card in the middle of a sequence")]
        public int CardInMiddleBonus = 5;
        [Tooltip("Bonus for Five of a Kind with Trump card")]
        public int FiveOfKindBonus = 25;
        public int FlushBonus = 20;
        [Tooltip("Bonus for Four of a Kind with Trump card")]
        public int FourOfKindBonus = 20;
        [Tooltip("Bonus for FullHouseBonus")] public int FullHouseBonus = 100;
        public int HighCardBonus = 10;
        [Tooltip("Bonus for a Pair with Trump card")]
        public int PairBonus = 5;
        [Tooltip("Bonus for having a card adjacent in rank to the Trump card")]
        public int RankAdjacentBonus = 5;
        public int RoyalFlushBonus = 35;
        [Tooltip("Bonus for having cards of the same color")]
        public int SameColorBonus = 5;
        [Tooltip("Bonus for a Sequence with Trump card")]
        public int SequenceBonus = 15;
        public int StraightBonus = 25;
        [Tooltip("Bonus for a Straight Flush with Trump card")]
        public int StraightFlushBonus = 15;
        [Tooltip("Bonus for Three of a Kind with Trump card")]
        public int ThreeOfKindBonus = 15;
        public int TripletsBonus = 75;
        [Tooltip("Bonus for having the Trump card in hand")]
        public int TrumpCardBonus = 10;
        [Tooltip("Bonus for using the Trump card as a wild card")]
        public int WildCardBonus = 10;
    }
```

- `HandUtility` partials provide the reusable pattern detection (`IsFourOfAKind`, `GetTripletRanks`, `IsFullHouse`) that every rule taps into, ensuring consistent hand evaluation across scores, AI prompts, and UI displays.

## Trump & Event Bus Flow

- Trump evaluation is event-driven: rules call `GetTrumpCard()` which publishes `GetTrumpCardEvent` and waits (with timeout) for gameplay managers to respond. That keeps rules decoupled from concrete deck implementations while still supporting dynamic trump assignment.

## Porting Notes

- Keep rule definitions declarative (ScriptableObjects or equivalent JSON descriptors) so multiple games can share the same scoring engine.
- Provide utility helpers mirroring `HandUtility` to avoid duplicating tricky combinatorics across the stack.
- Preserve the `BonusDetail` shape—AI prompts, UI overlays, and scoreboards depend on the structured explanation strings and totals.
- Maintain a trump-event mechanism; bonus rules assume they can query the current trump asynchronously instead of hardcoding it.
