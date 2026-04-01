# AI — What to Do Next

**Start here after reading [OVERVIEW.md](./OVERVIEW.md).**

---

## Must do (in-game AI)

- [ ] **Wire game state into AI prompts**  
  Subscribe to the five request events wherever game state lives (Engine or game session), and resolve each event's `deferred` with current data:
  - `RequestPlayerHandDetailEvent` → resolve with player's hand (Card[])
  - `RequestScoreManagerDetailsEvent` → resolve with score/pot details
  - `RequestRemainingCardsCountEvent` → resolve with deck count (number)
  - `RequestFloorCardsDetailEvent` → resolve with floor cards (Card[])
  - `RequestAllPlayersDataEvent` → resolve with all players (LobbyPlayer[])  
  Files: event definitions in `src/lib/eventing/events/game/`; AIHelper publishes from `src/ai/AIHelper.ts` (GetUserPrompt). Add subscribers where state is owned (Engine or Claim game session).

---

## Should do (docs and clarity)

- [ ] Optional: add "Worker AI" section to OVERVIEW if more detail needed
- [ ] Optional: add "Setup vs usage" subsection if more detail needed

---

## Done (no action)

- Local transformers.js: streaming, stop, TTFT/TPS, conditional inference, events
- AIHelper: asset-based system prompt; user prompt built from events (handlers still missing)
- AIPlayground: dev testing of models and rules
- Worker: forward to external AI URL, store decisions
- ai-domain: types, constants, providers, prompts, validators, registry
- Adapters: browser-local, worker proxy, local server

---

## Out of scope here

- Payment / AI token tracking: use architecture and implementation status in [ARCHITECTURE.md](./ARCHITECTURE.md) and [OVERVIEW.md](./OVERVIEW.md)
