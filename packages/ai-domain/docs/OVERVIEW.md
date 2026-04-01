# AI in Ocentra — Overview

**Single source of truth for AI: what we have, what's missing, where things live.**  
Plan: web app first (current), then web + mobile + desktop.

---

## 1. How it works

AI gets **system prompt** from GameMode/Rules assets (static) and **user prompt** from live game state via **EventBus**: AIHelper publishes request events (e.g. `RequestPlayerHandDetailEvent`), something must subscribe and resolve the event's `deferred` with data, then AIHelper builds the user prompt. A **provider** (local transformers.js or external API) turns (system, user) into a response. Same idea for any game type; only the runtime and provider differ.

---

## 2. Where things live

| Layer | Location | Purpose |
|-------|----------|---------|
| **Domain package** | `packages/ai-domain/` | Types, constants, providers, prompts, validators, registry |
| **Prompts & game state** | `src/ai/AIHelper.ts` | Builds system prompt from GameMode assets; user prompt via request events |
| **Orchestration** | `src/lib/managers/ai/AIManager.ts` | Gets prompts from AIHelper, calls current provider |
| **Adapters** | `src/adapters/ai/` | Browser-local, worker proxy, local server, HuggingFace, IDB |
| **Unified service** | `src/services/ai/ai-service.ts` | Switches between browser-local, worker, local-server backends |
| **Managers** | `src/lib/managers/ai/` | AIManager, ModelManager, ProviderManager |
| **Pipelines** | `src/lib/pipelines/` | TextGeneration, TextToSpeech, Whisper; BasePipeline, PipelineDBHandler |
| **Dev UI** | `src/ui/pages/dev/AIPlayground/` | Test models and game rules without full game |
| **Settings** | `src/ui/pages/Settings/tabs/` | InferenceSettingsTab, ModelSelectionTab, ProviderConfigTab |
| **Worker** | `infra/cloudflare/src/handlers/ai.ts` | Forwards to external `aiServiceUrl`; stores decisions in R2 |

**ai-domain providers:** OpenAI, Anthropic, OpenRouter, Groq, Ollama, LM Studio, DeepSeek, Mistral, Gemini, Fireworks, Perplexity, Cohere, Together, KoboldCpp, LocalAI, vLLM, browser-local (transformers.js).

---

## 3. What's done

- **AIHelper**: Asset-based GameMode (`gameRulesAsset`, `gameInfoAsset`, `strategyAsset`). System and user prompt; user prompt uses EventBus request events + deferred promises.
- **ai-domain**: Pure logic package; types, constants, providers, prompts, validators. No DOM or Cloudflare APIs.
- **Local inference (transformers.js)**: Streaming, stop generation, TTFT/TPS, conditional inference settings, past_key_values cache.
- **Pipelines**: TextGeneration, TTS, Whisper; PipelineDBHandler; IndexedDB for model files.
- **AIPlayground**: Dev testing of models and game rules.
- **Worker AI**: Forwards to external AI service; stores decisions in R2; API keys in Durable Objects (never in browser).
- **Adapters**: Browser-local, worker proxy, local server; unified ai-service switches between them.

---

## 4. What's not done (gaps)

- **Event handlers for game state requests**: AIHelper publishes five request events, but **no subscriber resolves them**. `GetUserPrompt()` would hang in a real game. Need subscribers in Engine or game session for: `RequestPlayerHandDetailEvent`, `RequestScoreManagerDetailsEvent`, `RequestRemainingCardsCountEvent`, `RequestFloorCardsDetailEvent`, `RequestAllPlayersDataEvent`.

---

## 5. Prompt construction

**System prompt** = Static from GameMode (rules, rankings, strategy, bonus rules, move validity, bluff settings, examples). Uses `.LLM` variant (detailed, AI-focused), not `.Player` variant (concise, UI).

**User prompt** = Dynamic from live game state. AIHelper publishes request events, waits on `deferred.promise` for each, formats response. Pattern:

```
User Prompt = "CURRENT GAME STATE: YOUR HAND: [from event] SCORE: [from event] DECK: [from event] ..."
```

**Universal:** Same pattern for any game type; only which GameMode properties and events differ.

---

## 6. Event-driven pattern

All cross-domain communication is event-driven. AI does not access game state directly.

**Flow:**
1. AIHelper creates request events (each has `deferred`)
2. Publishes via EventBus
3. Waits on `Promise.all(events.map(e => e.deferred.promise))`
4. Engine (or game session) subscribes and resolves each `deferred` with current state
5. AIHelper formats user prompt from responses

**Request events:** `RequestPlayerHandDetailEvent`, `RequestScoreManagerDetailsEvent`, `RequestRemainingCardsCountEvent`, `RequestFloorCardsDetailEvent`, `RequestAllPlayersDataEvent`.

**Files:** Events in `src/lib/eventing/events/game/`; AIHelper publishes from `src/ai/AIHelper.ts` (`GetUserPrompt`). Subscribers must be added where game state lives (Engine or Claim game session).

---

## 7. Setup vs usage

| Phase | What | Where |
|-------|------|-------|
| **Setup** | Providers, models, API keys, inference settings | Settings UI → Worker (keys stored encrypted in DO) |
| **Usage (in-game)** | AIManager + AIHelper → provider | Game with AI player |
| **Usage (worker)** | App calls Worker → Worker forwards to `aiServiceUrl` | HTTP |
| **Usage (dev)** | AIPlayground: load model, chat, test rules | Dev page |

---

## 8. Worker AI

- Endpoint: `POST /api/v1/ai/generate` (and related keys endpoints)
- Keys stored in Durable Objects (AES-256-GCM), never in browser
- Worker forwards to external `aiServiceUrl`; no local inference on worker
- AI decisions can be stored in R2
- Tests: `infra/cloudflare/tests/` for AI handlers

---

## 9. Where to start

1. **Wire in-game AI**: Add subscribers in Engine or game session for the five request events. On each event, resolve `event.deferred` with current data. Run game with AI player.
2. **Test models**: AIPlayground → pick model, load, chat or use Game Rules panel.
3. **Change prompts**: `src/ai/AIHelper.ts` (GetSystemMessage / GetUserPrompt).
4. **Add provider**: Implement in ai-domain; register and select via ProviderManager.

---

## 10. Related docs

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | ai-domain structure, flows, connections |
| [TODO.md](./TODO.md) | Actionable list |
