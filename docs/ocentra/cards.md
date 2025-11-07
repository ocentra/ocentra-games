# Card Data Pipeline

## Big Picture

- Card content lives in Unity `ScriptableObject` assets so designers can tweak without rebuilding code.
- Runtime systems always resolve cards through the singleton `Deck` asset, which guarantees a 52-card set plus `BackCard` and `NullCard` sentinels.
- Helper utilities (`CardUtility`, `HandUtility`) provide rank/suit math, string conversions, and evaluation helpers that gameplay, UI, and AI layers reuse.
- Editor automation (custom inspectors and asset post-processors) keeps data tidy: any imported `Card` moves into `Resources/Cards`, sprites auto-assign, and Odin inspectors show rich previews.

## Scriptable Primitives

- `Rank` and `Suit` are serialized classes with static instances for every standard playing-card value. They support comparison, hashing, random selection, and metadata like UTF symbols.
- A `Card` asset stores a `(Suit, Rank)` pair plus derived metadata (identifier, sprite path, coloured symbol). Updating the rank automatically recomputes identifiers and asset paths so downstream tools stay in sync.

```13:42:References/Scripts/OcentraAI/LLMGames/GameMode/CardGames/ScriptableSingletons/Card.cs
    [CreateAssetMenu(fileName = nameof(Card), menuName = "LLMGames/Card")]
    public class Card : SerializedScriptableObject, IComparable<Card>, ISaveScriptable
    {
        [SerializeField, HideInInspector] private string id;
        [SerializeField, HideInInspector] private string path;
        [SerializeField, HideInInspector] private Rank rank;
        [SerializeField, HideInInspector] private string rankSymbol;
        [SerializeField, HideInInspector] private Texture2D texture2D;
        [SerializeField, HideInInspector] private Suit suit;

        [ShowInInspector]
        public Rank Rank
        {
            get => rank;
            set
            {
                rank = value;
                id = $"{rank.Alias}_{suit.Symbol}";
                rankSymbol = CardUtility.GetRankSymbol(suit, rank);
                path = rank.Name == "BackCard"
                    ? "Assets/Images/Cards/BackCard.png"
                    : $"Assets/Images/Cards/{rank.Alias}_of_{suit.Name.ToLower() + "s"}.png";
            }
        }
        // ... existing code ...
```

- The Odin-powered `CardEditor` renders the coloured rank symbol and pushes edits through `EditorSaveManager`, so asset tweaks persist immediately.

## Deck Singleton & Asset Hygiene

- `Deck` extends `CustomGlobalConfig<T>`; Unity stores exactly one instance in `Assets/Resources`. Gameplay code references `Deck.Instance` for card lookup and draw operations.
- `LoadCardsFromResources` auto-populates the deck from existing `Card` assets, creating missing ones or fixing duplicates. Validation enforces a full 52-card deck.

```61:166:References/Scripts/OcentraAI/LLMGames/GameMode/CardGames/ScriptableSingletons/Deck.cs
        private void LoadCardsFromResources()
        {
            List<Card> allCards = Resources.LoadAll<Card>("Cards").ToList();

            NullCard = allCards.FirstOrDefault(card => card.name == nameof(NullCard));
            if (NullCard == null)
            {
                CreateNullCard();
            }

            BackCard = allCards.FirstOrDefault(card => card.name == nameof(BackCard));
            if (BackCard == null)
            {
                CreateBackCard();
            }

            CardTemplates = new List<Card>();
            foreach (Card card in allCards)
            {
                if (card.name != nameof(BackCard) && card.name != nameof(NullCard))
                {
                    CardTemplates.Add(card);
                }
            }

            if (CardTemplates.Count == 0)
            {
                CreateAllCards();
            }
            else if (ValidateStandardDeck() == false)
            {
                CreateMissingCards();
            }

            SaveChanges();
        }

        private bool ValidateStandardDeck()
        {
            if (CardTemplates.Count != 52)
            {
                Debug.LogError($"Invalid number of cards in the deck. Expected 52, but found {CardTemplates.Count}");
                return false;
            }

            foreach (Suit suit in Suit.GetStandardSuits())
            {
                if (suit == Suit.None)
                {
                    continue;
                }

                foreach (Rank rank in Rank.GetStandardRanks())
                {
                    if (rank == Rank.None)
                    {
                        continue;
                    }

                    if (!CardTemplates.Any(card => card.Suit == suit && card.Rank == rank))
                    {
                        Debug.LogError($"Missing card: {rank} of {suit}");
                        return false;
                    }
                }
            }

            var cardGroups = CardTemplates.GroupBy(card => new {suit = card.Suit, rank = card.Rank});
            foreach (var group in cardGroups)
            {
                if (group.Count() > 1)
                {
                    Debug.LogError($"Duplicate card found: {group.Key.rank} of {group.Key.suit}");
                    return false;
                }
            }

            return true;
        }
```

- At runtime `Deck.GetCard(suit, rank)` returns the shared asset, so comparisons use reference equality and stay allocation-free.
- Development-only helpers (`CreateAllCards`, `GetRandomCard`, shuffle) live behind `#if UNITY_EDITOR` guards so builds ship with a clean asset catalog.

## Editor Automation

- `CardAssetPostprocessor` watches imports and relocates any `Card` asset to `Assets/Resources/Cards`, guaranteeing the deck loader can discover it.

```8:29:References/Scripts/OcentraAI/LLMGames/Editor/CardAssetPostprocessor.cs
public class CardAssetPostprocessor : AssetPostprocessor
{
    private static void OnPostprocessAllAssets(string[] importedAssets, string[] deletedAssets, string[] movedAssets,
        string[] movedFromAssetPaths)
    {
        foreach (string assetPath in importedAssets)
        {
            Card card = AssetDatabase.LoadAssetAtPath<Card>(assetPath);
            if (card != null)
            {
                string resourcesPath = "Assets/Resources/Cards/";
                if (!assetPath.StartsWith(resourcesPath))
                {
                    string assetName = Path.GetFileName(assetPath);
                    string newAssetPath = resourcesPath + assetName;
                    Directory.CreateDirectory(resourcesPath);
                    AssetDatabase.MoveAsset(assetPath, newAssetPath);
                    Debug.Log($"Moved card to: {newAssetPath}");
                }
            }
        }
    }
}
```

- The Odin custom inspector shows coloured rank symbols and triggers `EditorSaveManager` when values change, so designer edits persist instantly.
- `DevCard` provides a lightweight serializable `(Suit, Rank)` for tooling, JSON fixtures, or deterministic tests without touching live assets.

## Runtime Utilities

- `CardUtility` converts between symbols and `Card` instances, maintains colour metadata, and powers rule example generation.
- The partial `HandUtility` implements the ranking logic (n-of-a-kind, sequences, trump-aware evaluations) used by both scoring and AI prompts.

```131:158:References/Scripts/OcentraAI/LLMGames/GameMode/CardGames/Hand/HandUtility.RuleRelated.cs
        public static bool IsMultiplePairs(this Hand hand, Card trumpCard, bool useTrump, out List<Rank> pairRanks)
        {
            pairRanks = new List<Rank>();
            if (hand == null || hand.Count() < 4)
            {
                return false;
            }

            Dictionary<Rank, int> rankCounts = hand.GetRankCounts();
            int trumpCount = useTrump && trumpCard != null
                ? hand.Count(c => c.Suit == trumpCard.Suit && c.Rank == trumpCard.Rank)
                : 0;

            pairRanks = rankCounts
                .Where(kv => kv.Value >= 2 || (kv.Value == 1 && trumpCount > 0 && kv.Key == trumpCard.Rank))
                .Select(kv => kv.Key)
                .ToList();

            return pairRanks.Count >= 2;
        }
```

- Because every gameplay system leans on these helpers, the new stack can replicate legacy behaviour by mapping its own card structures onto the same rank/suit semantics or by reusing the Unity assets directly.

## Porting Checklist

- Preserve the asset-driven `Card` → `Deck` pipeline so the rule and AI systems can keep referencing shared data.
- Mirror the `Rank`/`Suit` singletons (values, symbols, colours) to keep evaluations and AI prompts faithful.
- Reimplement (or bridge to) the utility APIs that convert human-readable symbols into card objects—the AI prompt generator, rule evaluators, and UI text all depend on them.

