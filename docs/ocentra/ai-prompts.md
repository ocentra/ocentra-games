# AI Prompt Pipeline

## Overview

- AI-facing text is generated dynamically each turn so the LLM receives fresh context about rules, player state, and possible moves.
- `AIHelper` owns prompt assembly. It composes a long-form system message from static game configuration and produces a per-turn user prompt by querying live game state via the event bus.
- `AIModelManager` brokers provider selection, loads credentials, and forwards requests to the appropriate `BaseLLMService` implementation (Azure OpenAI, OpenAI, Claude, or local models).

## System & User Prompt Construction

- The system prompt stitches together multiple `GameMode` fields: human-readable/LLM-specific rule text, ranking tables, bonus descriptions, bluffing hints, and move validity notes.
- The user prompt awaits asynchronous data about the requesting player’s hand, shared state (pot, floor cards, remaining deck), and the roster of human/computer participants.

```18:102:References/Scripts/OcentraAI/LLMGames/LLMServices/AIHelper.cs
        public string GetSystemMessage(GameMode gameMode)
        {
            return "You are an expert AI player in a Three Card Brag game. " +
                   "Your goal is to make the best betting decisions based on the strength of your hand, the game rules, and the behavior of the human player. " +
                   $"Game Rules: {gameMode.GameRules.LLM}. " +
                   $"Card Rankings: {gameMode.CardRankings}. " +
                   $"Bonus Rules: {GetBonusRules(gameMode.BonusRules)}. " +
                   $"Strategy Tips: {gameMode.StrategyTips}. " +
                   $"Bluffing Strategies: {BluffSetting(gameMode.GetBluffSettingConditions())}. " +
                   $"Example Hand Descriptions: {GetExampleHandDescriptions(gameMode.GetExampleHandOdds())}. " +
                   $"Possible Moves: {GetPossibleMoves(gameMode.GetMoveValidityConditions())}. " +
                   $"Difficulty Levels: {GetDifficultyLevel()}";
        }

        public string GetUserPrompt(ulong playerID)
        {
            return $"Current Hand: {GetHandDetails(playerID)}. " +
                   $"Current Game State: {GetGameStateDetails()}. " +
                   $"Move Options: {GetMoveWord()}";
        }

        private async UniTask<string> GetHandDetails(ulong playerID)
        {
            UniTaskCompletionSource<(bool success,string hand)> dataSource = new UniTaskCompletionSource<(bool success, string hand)>();
            await EventBus.Instance.PublishAsync<RequestPlayerHandDetailEvent>(new RequestPlayerHandDetailEvent(playerID,dataSource));
            (bool success, string hand) dataSourceTask = await dataSource.Task;

            if (dataSourceTask.success)
            {
                string hand = dataSourceTask.hand;

                return $"{hand}";
            }
            return "Failed to retrieve Hand details.";
        }

        private async UniTask<string> GetGameStateDetails()
        {
            string scoreManagerDetails = await GetScoreManagerDetails();
            string deckDetails = await GetDeckDetails();
            string floorDetails = await GetFloorDetails();
            string playerDetails = await GetPlayerDetails();

            return $"ScoreManagerDetails: {scoreManagerDetails}{Environment.NewLine}" +
                   $"Deck: {deckDetails}{Environment.NewLine}" +
                   $"FloorCard: {floorDetails}{Environment.NewLine}" +
                   $"Players: {playerDetails}";
        }
```

## Event Bus Integration

- Each `Get*Details` call uses an asynchronous event that returns via `UniTaskCompletionSource`. Producers listening on the bus fill in domain-specific data (hand contents, pot, deck, player roster, etc.).
- Events carry a unique ID and are disposable, so repeating requests do not pollute the bus.

```5:14:References/Scripts/OcentraAI/LLMGames/Events/GameEvents/RequestPlayerHandDetailEvent.cs
    public class RequestPlayerHandDetailEvent : EventArgsBase
    {
        public ulong PlayerId;
        public UniTaskCompletionSource<(bool success, string hand)> PlayerHandDetails { get; }

        public RequestPlayerHandDetailEvent( ulong playerID, UniTaskCompletionSource<(bool success, string card)> playerHandDetails)
        {
            PlayerHandDetails = playerHandDetails;
            PlayerId = playerID;
        }
    }
```

- The shared `EventBus` guarantees delivery to late subscribers by queuing events until handlers register, so UI, gameplay managers, and AI helpers can initialize in any order.

## Provider & Transport Layer

- `AIModelManager` gathers all `ILLMService` implementations from `Resources`, matches them to provider enums, and ensures each receives configuration credentials before use.
- Providers implement `BaseLLMService`, which serializes chat messages, posts JSON via `UnityWebRequest`, and normalizes responses per model.

```70:112:References/Scripts/OcentraAI/LLMGames/LLMServices/AIModelManager.cs
        public async UniTask SetLLMProvider(LLMProvider provider)
        {
            if (ConfigManager == null)
            {
                UniTaskCompletionSource<IConfigManager> completionSource = new UniTaskCompletionSource<IConfigManager>();
                await EventBus.Instance.PublishAsync(new RequestConfigManagerEvent<UnityServicesManager>(completionSource));
                ConfigManager = await completionSource.Task;
            }

            if (ConfigManager != null)
            {
                if (ConfigManager.TryGetConfigForProvider(provider, out ILLMConfig config))
                {
                    if (Providers.TryGetValue(provider, out ILLMService llmService))
                    {
                        llmService.InitializeAsync(config);
                    }
                }
                else
                {
                    Debug.LogError($"Configuration for provider {provider} not found or is invalid!");
                }
            }
        }

        public async UniTask<string> GetLLMResponse(GameMode gameMode, ulong playerID)
        {
            (string systemMessage, string userPrompt) = AIHelper.Instance.GetAIInstructions(gameMode, playerID);
            if (CurrentLLMService == null)
            {
                Debug.LogError("LLM Service is not initialized!");
                return null;
            }

            return await CurrentLLMService.GetResponseAsync(systemMessage, userPrompt);
        }
```

```30:82:References/Scripts/OcentraAI/LLMGames/LLMServices/BaseLLMService.cs
        public async UniTask<string> GetResponseAsync(string systemMessage, string userPrompt)
        {
            try
            {
                object requestContent = GenerateRequestContent(systemMessage, userPrompt);
                string jsonData = JsonConvert.SerializeObject(requestContent);
                UnityWebRequest webRequest = new UnityWebRequest(LLMConfig.Endpoint + LLMConfig.ApiUrl, "POST")
                {
                    uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(jsonData)),
                    downloadHandler = new DownloadHandlerBuffer()
                };
                webRequest.SetRequestHeader("Content-Type", "application/json");
                webRequest.SetRequestHeader("Authorization", "Bearer " + LLMConfig.ApiKey);

                UnityWebRequestAsyncOperation operation = webRequest.SendWebRequest();

                while (!operation.isDone)
                {
                    await Task.Yield();
                }

                if (webRequest.result == UnityWebRequest.Result.Success)
                {
                    return ProcessResponse(webRequest.downloadHandler.text);
                }

                string errorContent = webRequest.downloadHandler.text;
                Debug.LogError(
                    $"Error calling LLM API: {webRequest.responseCode} - {webRequest.error} - {errorContent}");
                return "Error";
            }
            catch (Exception ex)
            {
                Debug.LogError($"Exception occurred: {ex.Message}");
                return "Error";
            }
        }
```

## Porting Notes

- Replicate the event-driven data sourcing pattern so prompts stay accurate without tight coupling to gameplay code.
- Keep system prompts declarative (`GameMode` assets) and user prompts reactive (live UniTask event queries) to preserve explainability across future game modes.
- Mirror the provider abstraction so swapping Azure/OpenAI/Claude/local services remains a configuration change instead of a code rewrite.

