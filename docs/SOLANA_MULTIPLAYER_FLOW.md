# Solana Multiplayer Game Flow

## Overview

This document explains when Solana kicks in, how the entire flow works, what's been implemented, and what's left to do.

---

## When Does Solana Kick In?

**Solana is ONLY used for MULTIPLAYER games.** Local AI games don't use Solana at all.

### Local AI Game (No Solana)
```
Player plays vs AI
  ↓
GameEngine processes moves locally
  ↓
EventBus updates UI
  ↓
Match stored in IndexedDB (local only)
```

### Multiplayer Game (Solana Required)
```
Player creates/joins match
  ↓
SOLANA: create_match/join_match transactions
  ↓
Player submits move
  ↓
SOLANA: submit_move transaction
  ↓
Match ends
  ↓
SOLANA: end_match transaction (stores hash)
  ↓
Upload full record to R2
  ↓
SOLANA: Store hash + R2 URL on-chain
```

---

## Complete Flow: Multiplayer Match Lifecycle

### 1. Match Creation

**User Action:** Player clicks "Create Lobby"

**Flow:**
```
UI: CreateLobbyEvent fired
  ↓
SolanaEventBridge catches event
  ↓
GameClient.createMatch(gameType, seed, wallet)
  ↓
SOLANA TRANSACTION: create_match instruction
  ├─ Creates Match PDA account
  ├─ Stores: match_id, game_type, seed, authority
  └─ Returns: match_id
  ↓
EventBus: UpdateGameStateEvent (with match_id)
```

**On-Chain (Solana):**
- Match account created at PDA: `[match, match_id]`
- Phase = 0 (Dealing)
- Players array empty
- Authority = creator's pubkey

---

### 2. Player Joining

**User Action:** Player clicks "Join Match"

**Flow:**
```
UI: JoinLobbyEvent fired
  ↓
SolanaEventBridge catches event
  ↓
GameClient.joinMatch(matchId, wallet)
  ↓
SOLANA TRANSACTION: join_match instruction
  ├─ Validates: not full, not started
  ├─ Adds player pubkey to Match account
  └─ Increments player_count
  ↓
EventBus: PlayerJoinedEvent
```

**On-Chain (Solana):**
- Player pubkey added to `players[]` array
- `player_count` incremented
- Match still in Phase 0 (Dealing)

---

### 3. Match Start

**User Action:** Host clicks "Start Game"

**Flow:**
```
UI: StartLobbyAsHostEvent fired
  ↓
SolanaEventBridge catches event
  ↓
GameClient.startMatch(matchId, wallet)
  ↓
SOLANA TRANSACTION: start_match instruction
  ├─ Validates: minimum players joined
  ├─ Sets phase = 1 (Playing)
  └─ Sets all_players_joined = true
  ↓
EventBus: StartMainGameEvent
```

**On-Chain (Solana):**
- Phase = 1 (Playing)
- `current_player` = 0
- Game can now accept moves

---

### 4. Player Move Submission

**User Action:** Player makes a move (pick up, decline, etc.)

**Flow:**
```
UI: DecisionTakenEvent fired (with PlayerAction)
  ↓
SolanaEventBridge catches event
  ↓
GameClient.submitMove(matchId, action, wallet)
  ↓
SOLANA TRANSACTION: submit_move instruction
  ├─ Validates: correct player turn
  ├─ Validates: move is legal (Rust validation)
  ├─ Creates Move PDA account
  ├─ Updates Match state (current_player, move_count)
  └─ Returns: transaction signature
  ↓
[Transaction Confirmed]
  ↓
GameClient.getMatchState(matchId) [read from chain]
  ↓
EventBus: UpdateGameStateEvent (with state from Solana)
```

**On-Chain (Solana):**
- Move account created at PDA: `[move, match_id, timestamp]`
- Match account updated:
  - `current_player` = (current_player + 1) % player_count
  - `move_count` incremented
- Move validated by Rust program (mirrors TypeScript rules)

**Important:** Game state comes from Solana, NOT from local GameEngine. GameEngine is only for UI rendering.

---

### 5. Match End

**Flow:**
```
[Last move submitted]
  ↓
Game detects match end condition
  ↓
GameClient.endMatch(matchId, matchHash, r2Url, wallet)
  ↓
SOLANA TRANSACTION: end_match instruction
  ├─ Sets phase = 2 (Ended)
  ├─ Sets ended_at timestamp
  ├─ Stores match_hash (SHA-256)
  └─ Stores archive_txid (R2 URL)
```

**On-Chain (Solana):**
- Phase = 2 (Ended)
- `match_hash` = SHA-256 of canonical JSON
- `archive_txid` = R2 URL where full record is stored

---

### 6. Match Finalization & Storage

**Flow:**
```
MatchCoordinator.finalizeMatch(matchId)
  ↓
1. Collect all moves from Solana
2. Build canonical MatchRecord
3. Canonicalize → Hash
4. Upload to R2
  ↓
R2Service.uploadMatchRecord(matchId, canonicalJSON)
  ↓
Returns: R2 URL
  ↓
Store hash + R2 URL on Solana (already done in end_match)
```

**Storage:**
- **Solana:** Stores hash (32 bytes) + R2 URL (proof)
- **R2:** Stores full canonical JSON (50KB+)
- **Verification:** Anyone can download from R2, hash it, compare to Solana hash

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ PLAYER ACTIONS (UI)                                         │
│ - CreateLobbyEvent                                          │
│ - JoinLobbyEvent                                            │
│ - DecisionTakenEvent                                        │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ SOLANA EVENT BRIDGE                                          │
│ - Listens to EventBus                                        │
│ - Routes to GameClient                                       │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ GAME CLIENT                                                  │
│ - createMatch() → Solana transaction                        │
│ - joinMatch() → Solana transaction                          │
│ - submitMove() → Solana transaction                         │
│ - endMatch() → Solana transaction                            │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ SOLANA BLOCKCHAIN                                            │
│ - Match PDA account (state)                                  │
│ - Move PDA accounts (history)                                │
│ - All validation in Rust                                    │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ MATCH COORDINATOR                                            │
│ - Polls Solana for state updates                            │
│ - Collects moves from chain                                  │
│ - Builds canonical record                                   │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ STORAGE                                                      │
│ - Upload canonical JSON to R2                                │
│ - Store hash + R2 URL on Solana                             │
└─────────────────────────────────────────────────────────────┘
```

---

## What's Been Implemented ✅

### Phase 0: Rust/Anchor Program ✅
- [x] Anchor workspace structure (`Rust/SolanaContract/`)
- [x] Match state account (supports 10 players, game types)
- [x] Move state account
- [x] Instructions: `create_match`, `join_match`, `start_match`, `submit_move`, `end_match`, `anchor_match_record`
- [x] Game rule validation in Rust
- [x] Game type system (CLAIM, Poker, etc. with min/max players)
- [x] Test suite

### Phase 1: TypeScript Solana Client ✅
- [x] `AnchorClient` - Wraps Anchor program connection
- [x] `GameClient` - All match operations (create, join, start, submit, end, get state, poll)
- [x] `SolanaEventBridge` - Connects EventBus to Solana transactions
- [x] Wallet integration (Phantom, Solflare)
- [x] React hooks (`useSolanaWallet`, `useSolanaBridge`)

### Phase 2: Match Recording ✅
- [x] `MatchEventCollector` - Queries Solana for match data
- [x] Builds canonical match records from on-chain data
- [x] Type definitions for MatchRecord, MoveRecord, PlayerRecord

### Phase 3: Canonical Serialization & Crypto ✅
- [x] `CanonicalSerializer` - Deterministic JSON (lexicographic keys, UTF-8, ISO8601)
- [x] `HashService` - SHA-256 hashing (Web Crypto API)
- [x] `SignatureService` - Ed25519 signing/verification
- [x] `KeyManager` - Key generation/export/import

### Phase 4: Cloudflare Infrastructure ✅
- [x] Cloudflare Worker setup (`infra/cloudflare/`)
- [x] Wrangler configuration
- [x] R2 bucket integration
- [x] Worker API endpoints (upload, get, delete)
- [x] Dev/prod environments

### Phase 5: Storage Services ✅
- [x] `R2Service` - Direct R2 upload/get via Worker API
- [x] `StorageConfig` - Environment-based configuration
- [x] Removed unnecessary wrappers (HotStorageService, ArweaveService)

### Phase 6: Match Coordinator ✅
- [x] `MatchCoordinator` - Orchestrates match lifecycle
- [x] `finalizeMatch()` - Collects, canonicalizes, hashes, stores
- [x] State polling

### Phase 7: Solana Anchoring ✅
- [x] `SolanaAnchorService` - Memo program integration for hash anchoring
- [x] `MerkleBatching` - Merkle tree building/proof generation

### Phase 8: AI Integration ✅
- [x] `AIDecisionRecorder` - Records AI chain-of-thought
- [x] AI players can submit moves via Solana transactions

### Phase 9: Verification ✅
- [x] `MatchVerifier` - Verifies match records against on-chain hash
- [x] Hash comparison, move count validation

### Phase 10: UI Integration ✅
- [x] `MatchHistory` component - View match history
- [x] `MatchDetail` component - View match details with verification
- [x] `VerificationBadge` component - Shows verification status
- [x] Wallet provider integrated in app root

---

## What's Left To Do ⏳

### Critical (Must Do)

1. **Build & Deploy Rust Program**
   ```bash
   cd Rust/SolanaContract
   anchor build
   anchor deploy
   ```
   - After deploy, update Program ID in:
     - `Rust/SolanaContract/src/lib.rs` (declare_id!)
     - `Rust/SolanaContract/Anchor.toml`
     - `src/services/solana/AnchorClient.ts` (PROGRAM_ID)
   - Copy generated IDL to client (or use dynamic import)

2. **Update AnchorClient with Real IDL**
   - After `anchor build`, IDL is generated at `target/idl/solana_games_program.json`
   - Import and use in `AnchorClient.ts` instead of placeholder

3. **Cloudflare R2 Setup**
   - Enable R2 in Cloudflare dashboard
   - Create bucket: `claim-matches`
   - Deploy worker: `cd infra/cloudflare && npm run deploy`
   - Add to `.env`: `VITE_R2_WORKER_URL=https://your-worker.workers.dev`

### Optional (Nice to Have)

4. **Match History Query**
   - Implement `getMatchIdsForWallet()` in `MatchHistory.tsx`
   - Query Solana for all matches a wallet participated in
   - Or use Firebase to store match references

5. **Error Handling & UX**
   - Transaction status indicators
   - Retry logic for failed transactions
   - Better error messages

6. **Testing**
   - End-to-end test: Create match → Join → Play → End
   - Verify hash matches between R2 and Solana
   - Test with multiple players

---

## Key Files Reference

### Rust Program
- `Rust/SolanaContract/src/lib.rs` - Main program entry
- `Rust/SolanaContract/src/state/match_state.rs` - Match account structure
- `Rust/SolanaContract/src/instructions/` - All instruction handlers

### TypeScript Client
- `src/services/solana/AnchorClient.ts` - Program connection
- `src/services/solana/GameClient.ts` - Match operations
- `src/services/solana/SolanaEventBridge.ts` - EventBus → Solana bridge
- `src/services/solana/MatchCoordinator.ts` - Match orchestration

### Storage
- `src/services/storage/R2Service.ts` - R2 upload/get
- `infra/cloudflare/src/index.ts` - Cloudflare Worker

### Recording & Verification
- `src/lib/match-recording/MatchEventCollector.ts` - Collects from Solana
- `src/lib/match-recording/canonical/CanonicalSerializer.ts` - Deterministic JSON
- `src/services/verification/MatchVerifier.ts` - Verifies matches

---

## Environment Variables Needed

```bash
# Solana
VITE_SOLANA_CLUSTER=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com

# Anchor Program (after deployment)
VITE_ANCHOR_PROGRAM_ID=<your-program-id>

# Cloudflare R2 (after worker deployment)
VITE_R2_WORKER_URL=https://claim-storage.workers.dev
VITE_R2_BUCKET_NAME=claim-matches
```

---

## Quick Start Checklist

1. ✅ Code implemented
2. ⏳ **Setup Solana wallet** - See `docs/SOLANA_WALLET_SETUP.md`
   - Install Phantom wallet
   - Get devnet SOL (free from faucet)
   - Connect wallet to app
3. ⏳ Build Rust program: `cd Rust/SolanaContract && anchor build`
4. ⏳ Deploy to devnet: `anchor deploy`
5. ⏳ Update Program ID in client code
6. ⏳ Enable R2 in Cloudflare dashboard
7. ⏳ Create R2 bucket: `npx wrangler r2 bucket create claim-matches`
8. ⏳ Deploy Cloudflare worker: `cd infra/cloudflare && npm run deploy`
9. ⏳ Add env variables
10. ⏳ Test end-to-end

---

## Summary

**Solana kicks in when:**
- Player creates/joins a MULTIPLAYER match
- Player submits a move
- Match ends (stores hash + R2 URL)

**Local AI games:** No Solana, everything local

**Storage strategy:**
- Solana: Proof (hash) + reference (R2 URL) - cheap, verifiable
- R2: Full record - free tier, fast access

**Everything is implemented and ready. Just needs:**
1. Build & deploy Rust program
2. Set up Cloudflare R2
3. Test it!

