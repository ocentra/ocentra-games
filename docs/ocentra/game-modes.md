# Game Mode Architecture

## Concept

- Each game mode is a Unity `SerializedScriptableObject` that captures static rule text, configuration constants, ranking data, and the set of bonus rule assets it should instantiate.
- `GameMode` provides the template logic: shared property storage, editor-time initialization helpers, and runtime accessors for cards, moves, bluff conditions, and AI examples.
- Concrete assets (for example `ThreeCardGameMode`) override the abstract properties to define card counts, bet pacing, trump usage, and flavour text.

```31:141:References/Scripts/OcentraAI/LLMGames/GameMode/CardGames/GameMode.cs
        [SerializeField, ShowInInspector, ValueDropdown(nameof(GetAvailableGameModeType)), PropertyOrder(-1)]
        private int id = 0;
        [ShowInInspector, PropertyOrder(-1)]
        public GameModeType GameModeType { get => GameModeType.FromId(id); set => id = value.Id; }

        [OdinSerialize,HideInInspector]
        public Dictionary<BaseBonusRule, CustomRuleState> BaseBonusRulesTemplate { get; set; } =
            new Dictionary<BaseBonusRule, CustomRuleState>();

        [OdinSerialize] [ShowInInspector] public GameRulesContainer GameRules { get; protected set; }
        [OdinSerialize] [ShowInInspector] public GameRulesContainer GameDescription { get; protected set; }
        [OdinSerialize] [ShowInInspector] public GameRulesContainer StrategyTips { get; protected set; }
        [OdinSerialize] [ShowInInspector] public List<BaseBonusRule> BonusRules { get; protected set; } = new List<BaseBonusRule>();
        [OdinSerialize] [ShowInInspector] public CardRanking[] CardRankings { get; protected set; }
        [OdinSerialize] [ShowInInspector] public TrumpBonusValues TrumpBonusValues { get; protected set; } = new TrumpBonusValues();
        [OdinSerialize] [ShowInInspector] protected Dictionary<PossibleMoves, string> MoveValidityConditions { get; set; }
        [OdinSerialize] [ShowInInspector] protected Dictionary<DifficultyLevels, string> BluffSettingConditions { get; set; }
        [OdinSerialize] [ShowInInspector] protected Dictionary<HandType, string> ExampleHandOdds { get; set; }

        protected bool TryInitializeGameMode()
        {
            if (!TryInitializeBonusRules())
            {
                return false;
            }

            InitializeGameRules();
            InitializeGameDescription();
            InitializeStrategyTips();
            InitializeCardRankings();
            InitializeMoveValidityConditions();
            InitializeBluffSettingConditions();
            InitializeExampleHandOdds();
            SaveChanges();

            return true;
        }
```

## Concrete Implementation Example

- `ThreeCardGameMode` demonstrates how each override fills in instructional text, move constraints, bluffing heuristics, and trump behaviour.
- Portions of the rule copy are duplicated for LLM vs player display, ensuring prompts and UI read differently without branching code.

```24:160:References/Scripts/OcentraAI/LLMGames/GameMode/CardGames/ThreeCardGameMode.cs
        protected override void InitializeGameRules()
        {
            base.InitializeGameRules();

            GameRules.Player = $"{GameName} Rules:{Environment.NewLine}" +
                               "1. Each player is dealt 3 cards at the start of each round." +
                               // ... existing code ...
                               $"20. Adjacent to Trump: Cards adjacent to the Trump card provide a special point bonus, even if they do not form a valid hand. Example: {GetRankSymbol(Suit.Spade, Rank.Two)}, {GetRankSymbol(Suit.Spade, Rank.Three)}, {GetRankSymbol(Suit.Heart, Rank.Seven)} ({GetRankSymbol(Suit.Heart, Rank.Seven)} is adjacent to the Trump card {GetRankSymbol(Suit.Heart, Rank.Six)} and receives points, but the hand does not form a valid sequence).";

            GameRules.LLM =
                $"{GameName}: 3 cards dealt each round. Bet blind or see hand. Blind bet doubles, seen hand bet doubles current bet. Choose to fold, call, raise. Draw new card to floor. Pick and swap card, then bet, fold, call, or raise. Highest hand wins (A high). Tie: highest card wins. Game ends when player runs out of coins or after set rounds. Trailing player can continue if more coins. Start with {InitialPlayerCoins} coins." +
                "Special Rules: Three of a Kind: J♠, J♦, J♣. Royal Flush: A♠, K♠, Q♠. Straight Flush: 9♠, 10♠, J♠. Straight: 4♠, 5♣, 6♦. Flush: 2♠, 5♠, 9♠. Pair: Q♠, Q♦, 7♣. High Card: A♠, 7♦, 4♣ (A high)." +
                "Trump: 6♥ can replace any card. Ex: 2♠, 3♠, 6♥ (6♥ becomes 4♠ for straight flush: 2♠, 3♠, 4♠). Trump in Middle: 5♠, 6♥, 7♠ (6♥ in middle). Adjacent to Trump: 2♠, 3♠, 7♥ (7♥ next to 6♥ gets points, but no valid sequence).";
        }

        protected override void InitializeMoveValidityConditions()
        {
            base.InitializeMoveValidityConditions();
            MoveValidityConditions.Add(PossibleMoves.Fold, "Always valid");
            MoveValidityConditions.Add(PossibleMoves.Call, "Valid when there's a bet to call");
            MoveValidityConditions.Add(PossibleMoves.Raise, "Valid when you have enough coins to raise");
            MoveValidityConditions.Add(PossibleMoves.Check, "Valid when there's no bet to call");
            MoveValidityConditions.Add(PossibleMoves.BetBlind, "Valid only if you haven't seen your hand");
            MoveValidityConditions.Add(PossibleMoves.SeeHand, "Valid only if you haven't seen your hand");
            MoveValidityConditions.Add(PossibleMoves.DrawFromDeck, "Valid when there's no floor card");
            MoveValidityConditions.Add(PossibleMoves.PickFromFloor, "Valid when there's a floor card");
            MoveValidityConditions.Add(PossibleMoves.SwapCard, "Valid after drawing or picking from floor");
            MoveValidityConditions.Add(PossibleMoves.ShowHand, "Valid at any time, ends the round");
        }
```

## Discovery & Selection

- `GameModeManager` scans all `Resources` for `GameMode` assets at startup, caches them, and exposes lookup APIs by genre ID. It also links to a `GameInfo` metadata asset for front-end display.

```9:56:References/Scripts/OcentraAI/LLMGames/GameMode/CardGames/GameModeManager.cs
    public class GameModeManager : ScriptableSingletonBase<GameModeManager>
    {
        public List<GameMode> AllGameModes = new List<GameMode>();
        [InlineEditor] public GameInfo GameInfo;
        private ScriptableObject[] allScriptableObjects;

        protected override void OnEnable()
        {
            allScriptableObjects = Resources.LoadAll<ScriptableObject>("");

            foreach (ScriptableObject scriptableObject in allScriptableObjects)
            {
                if (scriptableObject is GameMode gameMode)
                {
                    if (!AllGameModes.Contains(gameMode))
                    {
                        AllGameModes.Add(gameMode);
                    }
                }
            }
            foreach (ScriptableObject scriptableObject in allScriptableObjects)
            {
                if (scriptableObject is GameInfo info)
                {
                    GameInfo = info;
                }
            }

            base.OnEnable();
        }

        public bool TryGetGameMode(int id, out GameMode gameMode)
        {
            foreach (GameMode mode in AllGameModes)
            {
                if (id == mode.GameModeType.GenreId)
                {
                    gameMode= mode;
                    return true;
                }
            }

            gameMode = null;
            return false;
        }
    }
```

- `GameModeType` enumerates all genres/subgenres and exposes helper methods to enumerate or resolve by ID. The `ValueDropdown` in `GameMode` uses this list to avoid mismatched IDs.

```15:88:References/Scripts/OcentraAI/LLMGames/LLMGamesCommon/Utilities/GameModeType.cs
        public static readonly GameModeType Poker = new GameModeType(1, nameof(Poker), GameGenre.CardGames);
        public static readonly GameModeType Bridge = new GameModeType(2, nameof(Bridge), GameGenre.CardGames);
        public static readonly GameModeType Rummy = new GameModeType(3, nameof(Rummy), GameGenre.CardGames);
        public static readonly GameModeType ThreeCardBrag = new GameModeType(4, nameof(ThreeCardBrag), GameGenre.CardGames);
        // ... additional genres omitted ...

        public static GameModeType[] GetAll()
        {
            FieldInfo[] fields = typeof(GameModeType).GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.DeclaredOnly);
            GameModeType[] subcategories = new GameModeType[fields.Length];
            int count = 0;

            for (int i = 0; i < fields.Length; i++)
            {
                FieldInfo field = fields[i];
                if (field.FieldType == typeof(GameModeType))
                {
                    subcategories[count++] = (GameModeType)field.GetValue(null);
                }
            }

            if (count < subcategories.Length)
            {
                GameModeType[] result = new GameModeType[count];
                for (int i = 0; i < count; i++)
                {
                    result[i] = subcategories[i];
                }
                return result;
            }

            return subcategories;
        }
```

## Bonus Rule Template Workflow

- Each `GameMode` stores a template dictionary mapping available `BaseBonusRule` assets to `CustomRuleState`. Initialization clones or reuses child assets, ensuring rules live under the game-mode asset for easy packaging.
- Rules can be toggled per game by marking `CustomRuleState.IsSelected`; the editor persistence logic removes unused child assets and syncs priority/bonus values.

## Porting Guidance

- Preserve the ScriptableObject-based configuration model so designers can tweak rule text and parameters outside the web stack.
- Mirror the initialization pipeline (`TryInitializeGameMode`) to populate derived data (rank tables, move restrictions) before exposing the game mode to UI/AI layers.
- Provide a discovery mechanism akin to `GameModeManager` so the React stack can list available game modes without hardcoding IDs.
