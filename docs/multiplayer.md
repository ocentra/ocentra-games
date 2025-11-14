# multiplayer.md

**Project:** Verifiable Multiplayer Games Platform on Solana — Definitive Spec

**Purpose:**
This document is a developer-facing, machine-readable specification that your local AI (Cursor) and human engineers can follow to implement a verifiable, cost-conscious multiplayer gaming platform using Solana (devnet → mainnet). The platform supports multiple game types (card games, word games, mindful games, voice games, etc.) with a generic framework for game state management, move validation, and match recording. It covers architecture, data formats, canonical serialization, anchoring strategy, Merkle batching, privacy controls, Rust program outline (on-chain), off-chain services (Cloudflare R2 for storage), token economics, benchmarks, and test plans.

---

## Table of contents

1. Goals & constraints
2. High-level architecture
3. Match lifecycle (data flow)
4. Canonical data formats & JSON schema
5. Hashing, signing, and anchoring rules
6. Merkle batching and proofs
7. Solana interaction model & contract (Rust) outline
8. Off-chain infra: realtime, storage, and AI integration
9. Privacy and PII rules
10. Cost & devnet best practices
11. Verification, auditing & benchmark process
12. Developer workflow & CLI
13. Example match record (canonical) and verification steps
14. Glossary & conventions
15. User Authentication (Walletless Players)
16. Critical Design Decisions & Answers
17. Next steps / roadmap

---

## 1. Goals & constraints

* **Goals:**

  * Provide a verifiable, trustable record of matches (human vs human, AI vs AI, human vs AI).
  * Keep on-chain costs minimal while retaining maximum transparency for official/benchmark matches.
  * Enable turn-based multiplayer gameplay with acceptable latency (400ms-1s per move).
  * Enable reproducible benchmarking of multiple AI agents.

* **Constraints & decisions:**

  * Use Solana as the canonical anchor chain. Development on **devnet** until audited for mainnet.
  * Full match payloads (audio, long chain-of-thought) are kept off-chain; only compact anchors (SHA-256 or Merkle root) on-chain.
  * Use Cloudflare R2 for hot storage and match record archives. R2's generous free tier (10GB, 1M operations/month) and no egress fees make it cost-effective and sufficient for match storage needs.
  * Write contracts in **Rust** using Anchor framework for all on-chain operations.

### 1.2 Game Type: Turn-Based Multiplayer

**CRITICAL:** This platform is designed ONLY for turn-based games where 400ms-1s latency per move is acceptable.

**Supported Game Types:**

- ✅ Card games (poker, CLAIM, trading card games)
- ✅ Strategy games (chess, civilization-style)
- ✅ Board games (turn-based only)
- ✅ Puzzle games (cooperative/competitive)

**NOT Supported:**

- ❌ Real-time FPS games
- ❌ MOBA games
- ❌ Racing games
- ❌ Any twitch-based gameplay requiring <100ms response time

**Why This Works:**

- **Solana block time:** 400ms average
- **Players naturally think:** 3-10 seconds between turns in turn-based games
- **Latency is imperceptible:** 400ms-1s delay feels natural in turn-based gameplay
- **Proven examples:** Solana Chess, SolCiv, Sollarion card game all work successfully

**Real-World Examples:**

- **Solana Chess:** Fully on-chain chess game - no lag issues reported
- **SolCiv:** Turn-based civilization strategy game on Solana
- **Sollarion:** Turn-based NFT card game on Solana
- **Space Falcon:** Turn-based combat card game on Solana

These games demonstrate that 400ms block time is perfectly acceptable for turn-based gameplay.

---

## 1.1 Implementation Phases: Generic Framework → Per-Game Rules

**CRITICAL ARCHITECTURE DECISION: Two-Phase Implementation**

This platform is designed to support **multiple diverse game types** (card games, word games, mindful games, voice games, etc.), each with different rules and mechanics. The implementation follows a two-phase approach:

### Phase 1: Generic Framework + CLAIM Example (Current Phase)

**Objective:** Build and validate the generic framework using CLAIM as the reference implementation.

**What Gets Built:**
- ✅ **Generic Solana program** - Framework for any game type (Match accounts, Move accounts, validation)
- ✅ **Generic validation** - Turn order, replay protection, phase transitions (NOT game-specific rules)
- ✅ **Generic match lifecycle** - Create, join, submit moves, end match (works for any game)
- ✅ **CLAIM game as example** - Complete CLAIM implementation used to test/validate the framework
- ✅ **Test infrastructure** - Test setup, patterns, and examples using CLAIM
- ✅ **Documentation** - How to add new games, validation patterns, etc.

**CLAIM Game Status:**
- CLAIM is the **reference implementation** and **test case** for Phase 1
- All CLAIM-specific code, examples, and tests are **preserved** and serve as:
  - Proof that the generic framework works
  - Reference implementation for future games
  - Test suite to validate framework changes
- CLAIM examples throughout this spec are marked as **"Example: CLAIM game"** or **"Reference: CLAIM"**

**What Does NOT Get Built in Phase 1:**
- ❌ Game-specific rule validation on-chain (handled off-chain)
- ❌ Multiple game implementations (only CLAIM as example)
- ❌ Game-specific UI components (generic components only)

### Phase 2: Per-Game Rule Implementations (Next Phase)

**Objective:** Implement full rule sets for each game type (CLAIM, Poker, Word games, etc.)

**What Gets Built:**
- ✅ **Per-game rule engines** - Off-chain validation for each game's specific rules
- ✅ **Game-specific action types** - Define valid actions per game (e.g., "pick_up" for CLAIM, "place_word" for word games)
- ✅ **Game-specific state management** - Track game-specific state (hands, board, etc.)
- ✅ **Game-specific UI** - Components tailored to each game type
- ✅ **Game-specific tests** - Full test coverage for each game's rules
- ✅ **Game registry** - System to register and configure new games

**How Games Differ:**
- **Card games (CLAIM, Poker, Three Card Brag):** Actions like "play_card", "fold", "bet"
- **Word games (Scrabble, Word Search):** Actions like "place_word", "challenge", "skip_turn"
- **Mindful games:** Actions like "meditation_complete", "breathing_exercise"
- **Voice games:** Actions like "voice_command", "audio_input"

**Each Game Needs:**
1. **Rule engine** - Validates moves according to game rules (off-chain)
2. **State tracker** - Maintains game-specific state (hands, board, scores, etc.)
3. **Action definitions** - Valid action types and payload structures
4. **Win condition logic** - How to determine winners
5. **UI components** - Game-specific rendering and interaction

**Framework Requirements:**
- The generic framework must support ALL game types without modification
- Game-specific logic lives in off-chain rule engines
- On-chain contract remains generic (validates turn order, replay protection, etc.)
- Each game can have different:
  - Number of players (2-10)
  - Action types and payloads
  - Win conditions
  - State structures
  - Validation rules

**Migration Path:**
- Phase 1 code (including CLAIM examples) remains as reference
- New games follow the same patterns established by CLAIM
- CLAIM gets enhanced in Phase 2 with full rule validation
- Framework tests ensure backward compatibility

**Example Structure:**
```
src/
├── framework/          # Generic framework (Phase 1)
│   ├── solana/         # Generic Solana program
│   ├── coordinator/    # Generic match coordinator
│   └── validation/     # Generic validation (turn order, etc.)
├── games/              # Per-game implementations (Phase 2)
│   ├── claim/          # CLAIM game rules, state, UI
│   │   ├── rules/      # CLAIM-specific rule engine
│   │   ├── state/      # CLAIM state management
│   │   └── ui/         # CLAIM UI components
│   ├── poker/          # Poker game (future)
│   ├── word-search/    # Word Search game (future)
│   └── ...
└── tests/
    ├── framework/      # Generic framework tests
    └── games/
        ├── claim/      # CLAIM-specific tests
        └── ...
```

**Current Status:**
- ✅ Phase 1 in progress - Generic framework being built
- ✅ CLAIM used as example/reference implementation
- ⏳ Phase 2 planned - Per-game rule implementations after framework validation

**CRITICAL: Framework vs Game-Specific Separation**

**Directory Structure:**
```
src/
├── framework/              # [FRAMEWORK] Generic code - works for ALL games
│   ├── solana/            # Generic Solana program
│   ├── coordinator/       # Generic match coordinator
│   ├── validation/        # Generic validation (turn order, replay protection)
│   └── types/             # Generic types (Match, Move, PlayerAction)
├── games/                 # [GAME-SPECIFIC] Per-game implementations
│   ├── claim/             # [EXAMPLE: CLAIM] Reference implementation
│   │   ├── rules/         # CLAIM-specific rule engine
│   │   ├── state/         # CLAIM state management
│   │   └── ui/            # CLAIM UI components
│   ├── poker/             # [FUTURE] Poker game
│   └── word-search/       # [FUTURE] Word Search game
└── tests/
    ├── framework/         # Generic framework tests
    └── games/
        └── claim/         # CLAIM-specific tests
```

**Code Labels:**
- `[FRAMEWORK]` - Generic code, works for all games
- `[EXAMPLE: CLAIM]` - CLAIM-specific code, serves as reference
- `[GAME-SPECIFIC]` - Code that must be implemented per game

---

## 2. High-level architecture

Components and responsibilities:

1. **Clients (Human & AI)**

   * Web/mobile clients for humans; AI agents as clients or server-side bots.
   * **Players do NOT need Solana wallets** - All Solana transactions handled by coordinator
   * **Firebase Authentication** - Players authenticate via Firebase (email/password, Google, Facebook, anonymous guest)
   * **User ID Format** - Firebase UID (`user.uid`) is used as `player_id` in matches (stored as String on-chain)
   * Players submit moves through web UI, coordinator submits to Solana on their behalf
   * Publish actions/events to the Realtime Coordinator (WebSocket/Workers/Firebase).

2. **Match Coordinator**

   * **Primary Responsibilities:**
     - WebSocket management - Maintain player connections
     - Session authentication - Verify player identities (Firebase UID)
     - Transaction submission - Submit moves to Solana on behalf of players
     - Match discovery - Help players find/join matches
     - UI updates - Broadcast confirmed moves to all players via WebSocket
   
   * **NOT Responsible For:**
     - ❌ State management (Solana is source of truth - query Match/Move accounts directly)
     - ❌ Move validation (Solana program validates on-chain)
     - ❌ State recovery (not needed - Solana IS the state)
     - ❌ Off-chain caching (query Solana directly for current match state)
   
   * **Has Solana wallet** - Submits all on-chain transactions on behalf of players
   * **Pays all Solana fees** - Players don't pay network transaction fees
   * Maps player user IDs (Firebase UID) to on-chain match participation
   
   * **Architecture:** Cloudflare Workers + Durable Objects for session management and WebSocket connections only. Solana is the game server - all game state lives on-chain.

2.1. **Coordinator Wallet Security** [FRAMEWORK]

   * **CRITICAL SECURITY:** Single coordinator wallet is a centralization risk
   
   * **Wallet Pool Architecture:**
   
   ```typescript
   // [FRAMEWORK] Coordinator wallet pool with rotation
   class CoordinatorWalletPool {
     private hotWallets: Keypair[];      // Array of hot wallets
     private currentIndex: number;        // Current active wallet
     private rotationThreshold: number;   // Rotate after N transactions
     private transactionCount: number;    // Track transactions per wallet
     
     // Rotate wallet every N transactions
     async rotateWallet(): Promise<void> {
       this.transactionCount++;
       if (this.transactionCount >= this.rotationThreshold) {
         this.currentIndex = (this.currentIndex + 1) % this.hotWallets.length;
         this.transactionCount = 0;
         console.log(`Rotated to wallet ${this.currentIndex}`);
       }
     }
     
     getCurrentWallet(): Keypair {
       return this.hotWallets[this.currentIndex];
     }
     
     // Rate limit per user_id, not coordinator wallet
     async checkUserRateLimit(userId: string): Promise<boolean> {
       const key = `rate:${userId}`;
       const count = await redis.incr(key);
       await redis.expire(key, 60); // 1 minute window
       return count <= 100; // Max 100 moves per minute per user
     }
   }
   ```
   
   * **Security Measures:**
     - **Hot wallet rotation:** Rotate every 1000 transactions
     - **Cold wallet backup:** Store cold wallet keys in hardware security module (HSM)
     - **Multi-sig recovery:** Cold wallet can recover if hot wallets compromised
     - **Rate limiting:** Per user_id (not per wallet) to prevent abuse
     - **Monitoring:** Alert on unusual transaction patterns
     - **Key rotation:** Rotate all wallets quarterly
   
   * **Compromise Mitigation:**
     - If hot wallet compromised: Rotate immediately, freeze affected matches
     - If cold wallet compromised: Emergency key rotation, pause all operations
     - Recovery process: Use cold wallet to deploy new program with new keys
   * **Options:**
     * **Cloudflare Workers + Durable Objects**: 
       * Pros: Strong for ephemeral per-match state with low ops cost; global edge distribution; built-in WebSocket support; excellent for high-concurrency match coordination
       * Cons: Requires Cloudflare account; learning curve for Durable Objects API
       * Best for: High-volume matchmaking, real-time game coordination, cost-sensitive scaling
     * **Firebase (Firestore + Functions)**:
       * Pros: Easy SDKs and user auth integration; familiar to many developers; real-time listeners; built-in offline support
       * Cons: Higher costs at scale; less control over infrastructure; potential cold start latency
       * Best for: Rapid prototyping, teams familiar with Firebase, simpler auth integration needs
   * **Decision**: Cloudflare Workers + Durable Objects - this is the architecture we use for cost efficiency and scalability, especially with free R2 storage tier. This architecture supports all game types (card games, word games, mindful games, voice games, etc.).

3. **AI Decision Engine**

   * Runs model inference and outputs actions + chain-of-thought logs.
   * Must accept identical event streams as human clients.
   * Record model version, prompt templates, RNG seed.

4. **Hot Storage**

   * Cloudflare R2 or Firebase Storage.
   * Store match event logs, transcripts, audio chunks, model outputs, and metadata.

5. **Match Record Storage**

   * Cloudflare R2 for all match records (hot storage and archives).
   * R2 provides generous free tier (10GB, 1M operations/month) with no egress fees.
   * Sufficient for match storage needs without requiring additional permanent archive services.

6. **Anchor & Registry on Solana**

   * Use custom Rust/Anchor program to store anchors (SHA-256 hashes or Merkle roots), signer identities, and R2 hot_url.

7. **Verification Tools**

   * Scripts to fetch off-chain record, canonicalize bytes, compute hash, verify on-chain anchor, and validate signatures or Merkle proofs.

---

## 3. Match lifecycle (data flow)

**Latency Model:** All moves submitted as Solana transactions with 400ms-1s confirmation time. This is acceptable for turn-based games where players naturally pause between actions (typically 3-10 seconds of thinking time per turn).

1. Match creation (client requests match, coordinator issues `match_id` UUID v4).
2. Join phase (players register; coordinator snapshots `players[]`). Match types:
   - **AI vs AI**: For benchmark purposes - requires verifiable chain-of-thought, replayable, publishable
   - **AI vs Human**: Practice/learning - flexible ratios (1 AI + 1 human, 3-4 AI vs 1 human, many humans vs 1 AI)
   - **Human vs Human only**: Death match tournaments, competitive play (future: poker-like platform features)
   - **Humans vs AI Challenge**: "Can you beat this AI?" - marketing feature (not priority now)
3. Gameplay (events streaming): actions emitted as canonical event objects appended to the event log in order. Each move submitted to Solana (400ms-1s latency is acceptable for turn-based gameplay).
4. Periodic checkpoint (required for high-value matches): coordinator automatically creates checkpoint every 20 moves for high-value matches (AI vs AI benchmarks, tournaments). Checkpoint contains current state and event index; hash checkpoint and anchor to Solana.
5. Match end: coordinator finalizes canonical match record JSON, computes SHA-256, uploads to Cloudflare R2, writes anchor on Solana via custom Rust/Anchor program. Coordinator signs record with server/authority key.
6. Post-match: match record and proofs available for download and independent verification.

---

## 4. Canonical data formats & JSON schema

**Key principle:** canonical serialization must be deterministic. Use a canonical JSON routine (stable key ordering, normalized unicode, consistent number formats).

**Canonical rules (must be implemented in every language):**

* UTF-8 encoding.
* `- `\uXXXX` unicode escapes for control characters only (do not escape non-ASCII by default).
* Objects' keys sorted lexicographically (Unicode codepoint order).
* Arrays preserve order.
* Numbers use minimal representation (no trailing zeroes, `1` not `1.0`). Use JSON number rules.
* No additional whitespace (minified). No comments.
* Timestamps in ISO8601 UTC with `Z` (e.g., `2025-11-12T15:23:30.123Z`) with milliseconds precision.
* Use stable deterministic UUID v4 for `match_id` generation (coordinator generates and provides to avoid collisions).

**Top-level canonical match schema (JSON Schema 2020-12 style)**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "MatchRecord",
  "type": "object",
  "required": ["match_id","version","start_time","end_time","players","moves","signatures"],
  "properties": {
    "match_id": {"type":"string","format":"uuid"},
    "version": {"type":"string"},
    "game": {"type":"object","properties":{"name":{"type":"string"},"ruleset":{"type":"string"}}},
    "start_time": {"type":"string","format":"date-time"},
    "end_time": {"type":"string","format":"date-time"},
    "seed": {"type":"string"},
    "players": {
      "type":"array",
      "items": {
        "type":"object",
        "required":["player_id","type"],
        "properties":{
          "player_id":{"type":"string"},
          "type":{"type":"string","enum":["human","ai","bot"]},
          "public_key":{"type":"string"},
          "metadata":{"type":"object"}
        }
      }
    },
    "moves": {"type":"array"},
    "artifacts": {"type":"array","items":{"type":"object"}},
    "chain_of_thought": {"type":"object"},
    "model_versions": {"type":"object"},
    "storage": {
      "type":"object",
      "properties":{
        "hot_url":{"type":"string"}
      }
    },
    "signatures": {"type":"array"}
  }
}
```

**Event / move object** (every action in `moves` array):

```json
{
  "index": 0,
  "timestamp": "2025-11-12T15:23:30.123Z",
  "player_id": "uuid-or-key",
  "action": "game_specific_action",
  "payload": { /* game-specific data structure */ },
  "proofs": {}
}
```

**Note:** The `action` field is game-specific (e.g., "play_card" for card games, "place_word" for word games, "voice_command" for voice games). The `payload` structure is also game-specific and MUST be defined per game type in Phase 2.

**Signature object** (attached at the end of the record):

```json
{
  "signer": "pubkey-or-role",
  "sig_type": "ed25519|secp256k1",
  "signature": "base64",
  "signed_at": "2025-11-12T15:30:00.000Z"
}
```

---

## 5. Hashing, signing, and anchoring rules

* **Hash algorithm:** SHA-256. All canonical match records MUST be hashed with SHA-256. Represent hashes as lowercase hex strings.
* **Signing:** Use Ed25519 for server/authority (REQUIRED - coordinator must sign all match records). The game contract treats all players the same (generic - no distinction between AI and human). Off-chain, we can track player type (AI vs human) for benchmark/analysis purposes, but this is not required for game functionality. Agent signatures are optional - only useful for AI vs AI benchmark verification, not required for normal gameplay.
* **Anchor content:** When writing to Solana, use the `anchor_match_record` instruction from the Rust program. The program stores:
  * `match_id` (String)
  * `match_hash` ([u8; 32] - SHA-256)
  * `hot_url` (Option<String> - R2 URL)
  * Signers are tracked in the SignerRegistry account
* **On-chain storage:** All data stored in structured program accounts (no size limits like Memo program).

---

## 6. Merkle batching and proofs

**Why:** anchor many matches in a single tx to amortize cost.

**Process:**

1. Batch `N` match hashes.
2. Build canonical Merkle tree (use SHA-256 for leaf and node hashing; for leaf input use `0x00 || hash` and for node use `0x01 || left || right` to avoid ambiguity).
3. Compute `merkle_root` hex.
4. Store a small on-chain anchor containing `{batch_id, merkle_root, count, first_match_id, last_match_id, hot_url}`. REQUIRED: Always include pointer to off-chain manifest (hot_url) containing the ordered list of `match_id` → `sha256` mappings and proofs precomputed. This is critical for trust and verification - verifiers need the manifest to verify batch contents.
5. Supply Merkle proofs for each match when a verifier asks — proofs are arrays of node hex hashes plus an index.

**Proof format:**

```json
{"match_id":"...","sha256":"...","proof":["<hex>","<hex>"],"index":123}
```

---

## 7. Solana interaction model & contract (Rust) outline

**Implementation: Custom Rust/Anchor Program**

We use a custom Rust/Anchor program deployed on Solana for all on-chain operations:
* Game state management (Match accounts, Move accounts)
* Match record anchoring (hash storage)
* Batch anchoring (Merkle roots)
* Signer registry
* Dispute flags
* Leaderboard aggregates
* Token system (GP/AC tokens)

**Rust program (Anchor framework) outline:**

**CRITICAL: Generic Game Framework (Not Game-Specific)**

**Phase 1 Status:** The Solana program provides a **generic framework** for any game type, NOT game-specific rules. CLAIM game is used as the **reference implementation** and **test case** to validate the framework works correctly.

**Phase 2 Status:** After framework validation, each game (CLAIM, Poker, Word games, etc.) will implement their own rule engines off-chain. The on-chain contract remains generic.

**Game Registry System:**

```rust
// [FRAMEWORK] Game registry stores supported games
#[account]
pub struct GameRegistry {
    pub authority: Pubkey,
    pub games: Vec<GameDefinition>,
    pub last_updated: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct GameDefinition {
    pub game_id: u8,                    // Unique game identifier
    pub name: String,                   // "CLAIM", "Poker", "WordSearch"
    pub min_players: u8,                // Minimum players required
    pub max_players: u8,                // Maximum players allowed
    pub rule_engine_url: String,        // Off-chain rule engine endpoint
    pub version: u8,                    // Game version (for updates)
    pub enabled: bool,                   // Is game enabled?
}

// [FRAMEWORK] Generic game rules trait (off-chain)
pub trait GameRules {
    fn validate_move(&self, state: &GameState, action: &PlayerAction) -> Result<()>;
    fn calculate_score(&self, state: &GameState) -> HashMap<String, u32>; // user_id -> score
    fn is_game_over(&self, state: &GameState) -> bool;
    fn get_winner(&self, state: &GameState) -> Option<String>; // user_id
    fn get_valid_actions(&self, state: &GameState, player_id: &String) -> Vec<ActionType>;
}

// [EXAMPLE: CLAIM] CLAIM-specific rule engine implements GameRules
pub struct ClaimGameRules {
    // CLAIM-specific validation logic
}

impl GameRules for ClaimGameRules {
    fn validate_move(&self, state: &GameState, action: &PlayerAction) -> Result<()> {
        // CLAIM-specific move validation
        // e.g., check if card can be picked up, if intent is valid, etc.
    }
    // ... other methods
}
```

**Validation Boundaries:**

- **[FRAMEWORK] On-Chain Validation:**
  - Turn order (current_player matches)
  - Player is in match
  - Phase transitions (generic phases)
  - Nonce replay protection
  - Move index sequential validation
  - Game type exists in registry

- **[GAME-SPECIFIC] Off-Chain Validation:**
  - Game-specific move legality (e.g., "can pick up this card?")
  - Game-specific state transitions (e.g., "can declare intent now?")
  - Win condition checking
  - Score calculation
  - Action availability (what moves are valid now?)

* **Accounts:**

  * `Match` PDA — generic match state (game_type, players, phase, move_count, etc.)
  * `Move` PDA — generic move records (action_type as u8, payload as Vec<u8>)
  * `SignerRegistry` PDA — list of authorized signers (pubkeys) with roles.
  * `BatchAnchor` PDA — stores `batch_id`, `merkle_root`, `u64 count`, `timestamp`, `authority`.
  * `UserAccount` PDA — user stats, token balances, subscription info
  * `ConfigAccount` PDA — token mints, pricing, feature flags
  * `GameLeaderboard` PDA — leaderboard per game type per season (tiers computed off-chain)

* **Instructions:**

  * `create_match(game_type, seed)` — create match with game type enum
  * `join_match(match_id)` — player joins (validates min/max players per game type)
  * `start_match(match_id)` — start match (validates minimum players)
  * `submit_move(match_id, action_type, payload, nonce)` — submit move (generic validation only: turn order, player in match, phase)
  * `end_match(match_id, match_hash, hot_url)` — finalize match
  * `anchor_match_record(match_id, match_hash, hot_url)` — anchor match hash
  * `anchor_batch(batch_id, merkle_root, count, manifest_url)` — batch anchoring
  * `register_signer(pubkey, role)` — only authority
  * `flag_dispute(match_id, reason_hash)` — creates on-chain flag
  * `resolve_dispute(dispute_id, resolution)` — resolve dispute
  * Token system instructions (see Section 20.4)

**Validation Philosophy:**
- **On-chain:** Only generic validation (turn order, player in match, phase transitions, nonce replay protection)
- **Off-chain:** Game-specific rules validated in MatchCoordinator/GameEngine
- **Why:** Game rules are too complex and varied to implement on-chain for every game type

**Rust & Anchor tips:**

* Keep on-chain structs compact. Use Borsh/Anchor for packing.
* Validate sizes in instruction data.
* Unit test using Localnet & devnet clusters.

---

## 8. Off-chain infra: realtime, storage, and AI integration

### 8.1 Match Coordinator

**Cloudflare Workers + Durable Objects:**

* **Architecture:** Each match gets a dedicated Durable Object instance that maintains ephemeral state and handles WebSocket connections.
* **Benefits:** 
  * Low ops cost (billed per request, not per connection)
  * Global edge distribution for low latency
  * Built-in WebSocket support
  * Strong consistency guarantees within a Durable Object
* **Use case:** Session management and WebSocket connections. Solana is the game server - all game state lives on-chain.

**Coordinator → On-Chain Synchronization:**

* **Real-Time Sync Strategy:**
  * Every move immediately creates a Solana transaction
  * Coordinator validates move off-chain first (fast feedback)
  * On-chain transaction submitted in parallel
  * If on-chain tx fails, coordinator rolls back off-chain state

* **Buffer & Rollback Logic:**
  * Off-chain state maintained in Durable Object
  * Pending transactions tracked per match
  * If transaction fails:
    1. Mark transaction as failed
    2. Rollback off-chain state to last confirmed on-chain state
    3. Notify player of failure
    4. Allow retry with corrected move
  * Transaction confirmation timeout: 30 seconds
  * After timeout, assume failure and rollback

* **Periodic State Sync:**
  * Every 10 moves: verify off-chain state matches on-chain
  * On mismatch: pause match, alert coordinator, manual resolution
  * Match end: final sync ensures all moves anchored

* **Implementation:**
```typescript
class MatchCoordinator {
  async submitMove(matchId: string, move: PlayerAction): Promise<void> {
    // 1. Validate move off-chain
    const validation = this.validateMove(matchId, move);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // 2. Update off-chain state (optimistic)
    this.updateOffChainState(matchId, move);
    
    // 3. Submit to Solana (async, don't wait)
    const txPromise = this.gameClient.submitMove(matchId, move);
    
    // 4. Track pending transaction
    this.pendingTransactions.set(matchId, {
      move,
      txPromise,
      timestamp: Date.now(),
    });
    
    // 5. Wait for confirmation with timeout
    try {
      await Promise.race([
        txPromise,
        this.timeout(30000),
      ]);
      // Success: transaction confirmed
      this.pendingTransactions.delete(matchId);
    } catch (error) {
      // Failure: rollback off-chain state
      this.rollbackState(matchId, move);
      throw error;
    }
  }
}
```

### 8.2 Storage Options

**Hot Storage:**

* **Cloudflare R2 (Our Storage Solution):**
  * Free tier: 10GB storage, 1M Class A operations/month
  * No egress fees (unlike Firebase Storage)
  * Global CDN for fast access
  * Signed URLs for secure, time-limited access
  * Workers integration for serverless operations
  * Use for: All match records, replays, debugging data
* **Firebase Storage (Alternative):**
  * Pros: Easy integration with Firebase auth, familiar API
  * Cons: Egress fees, higher costs at scale
  * Use for: Fallback or if already using Firebase ecosystem
* **Implementation:** Store match records as canonical JSON files, generate signed URLs for temporary access (e.g., 24-hour expiry for replays)

**Match Record Storage:**

* **Cloudflare R2 (Primary Storage):**
  * Free tier: 10GB storage, 1M Class A operations/month
  * No egress fees (unlike other storage providers)
  * Global CDN for fast access
  * Signed URLs for secure, time-limited access
  * Use for: All match records, replays, debugging data
  * **Implementation:** Upload final canonical JSON after match completion, return `hot_url` for reference

### 8.3 AI Integration

**AI Agent API Schema:**

* **Request Format:**
```typescript
interface AIEventRequest {
  match_id: string;
  event_type: 'match_created' | 'move' | 'showdown' | 'match_ended';
  current_state: GameState;
  player_hand: Card[];
  available_actions: PlayerAction[];
  event_data: any;
  match_history: Event[];
}

interface AIActionResponse {
  action: PlayerAction;
  chain_of_thought: ChainOfThoughtSegment[];
  metadata: {
    model_name: string;
    model_id: string;
    model_hash: string;  // SHA-256 of model binary/weights
    training_date: string;
    prompt_template: string;
    prompt_template_hash: string;  // SHA-256 of prompt
    seed: number;
    temperature: number;
    max_tokens: number;
    inference_time_ms: number;
    tokens_used: number;
    confidence: number;  // 0-1 confidence score
  };
}

interface ChainOfThoughtSegment {
  move_index: number;
  timestamp: string;
  thought: string;  // Short reasoning text
  reasoning: string;  // Detailed explanation
  alternatives_considered: string[];
  decision: string;
  confidence: number;
}
```

* **API Endpoint:** `POST /api/ai/on_event`
* **Authentication:** API key or signed request
* **Response Time:** < 5 seconds for move decisions

**AI Security & Fair-Play:**

* **Model Attestation:**
  * Model hash recorded at match start
  * Chain-of-thought includes model inference metadata
  * Validators verify model consistency throughout match
  * Model changes mid-match invalidate match

* **Deterministic Seed Verification:**
  * RNG seed recorded in match record
  * AI decisions must be reproducible given same seed + state
  * Validators can replay AI decisions to verify consistency

* **Proof of Model Identity:**
  * Model provider signs model binary/weights
  * Signature stored in model metadata
  * On-chain registry of trusted model providers

**For Multiplayer:**

* AI players submit moves via Solana transactions (via GameClient)
* Each move includes model metadata hash
* Chain-of-thought stored off-chain (R2)
* Chain-of-thought hash referenced in match record for verifiability

---

## 9. Privacy and PII rules

* **On-Chain Data:** Never place PII on-chain. Only cryptographic hashes, public keys, and match metadata are stored on Solana.
* **Public Chain Visibility:** Everything anchored on Solana is public — never include PII in on-chain program accounts or in permanent public archives without explicit user consent.
* **Consent Requirements:** 
  * For public benchmark matches: remove PII or use consented datasets; prefer anonymized IDs.
  * Use signed URLs with expiration for accessing match records containing PII.
  * Provide opt-out mechanisms for players who don't want their matches archived.
* **Access Controls:**
  * Store audio transcripts with access controls; only their hash is anchored on-chain.
  * Use signed URLs with expiration for accessing match records containing PII.
  * Implement role-based access control for match record retrieval (player, spectator, validator roles).
* **Regulatory Compliance:**
  * Comply with GDPR, CCPA, and other data protection regulations.
  * Provide data deletion mechanisms for users (though on-chain data is immutable, off-chain data can be deleted).
  * Maintain audit logs of data access for compliance purposes.
* **Anonymization:**
  * Use pseudonymous identifiers (user IDs from database) instead of real names where possible.
  * Hash or encrypt sensitive data before storage in hot storage systems.

---

## 10. Cost & Performance Model

**CRITICAL: Actual Measured Costs for Turn-Based Card Games**

**Transaction Costs (Measured on Devnet/Mainnet):**

- Base Solana fee: 5,000 lamports = 0.000005 SOL
- At $150/SOL: 0.000005 × $150 = **$0.00075 per transaction**

**Per Match Cost:**

- Average turn-based card game: 25 moves per match
- Total transactions: 1 (create) + 4 (joins) + 25 (moves) + 1 (end) = 31 transactions
- Cost: 31 × $0.00075 = **$0.023 per match**

**Monthly Costs:**

- 100 matches/day: 100 × $0.023 × 30 = **$69/month** ✅
- 1,000 matches/day: 1,000 × $0.023 × 30 = **$690/month** ✅
- 10,000 matches/day: 10,000 × $0.023 × 30 = **$6,900/month** ✅

**Breakeven Analysis (with Pro Subscriptions at $10/month):**

- 100 matches/day: Need 7 Pro subscribers to break even
- 1,000 matches/day: Need 69 Pro subscribers to break even
- 10,000 matches/day: Need 690 Pro subscribers to break even

**Conclusion:** Costs are manageable and scale linearly with revenue.

**Performance Expectations:**

- **Move submission latency:** 400ms-1s (Solana block time)
- **Acceptable for turn-based games:** Players think 3-10s per turn anyway
- **Total match duration:** 5-15 minutes (unaffected by blockchain)
- **Players notice:** No perceptible lag in turn-based gameplay

**Proven Examples:**

- **Solana Chess:** Fully on-chain chess, no lag issues reported
- **SolCiv:** Turn-based civilization strategy game on Solana
- **Sollarion:** Turn-based NFT card game on Solana
- **Space Falcon:** Turn-based combat card game on Solana

These games demonstrate that 400ms block time is perfectly acceptable for turn-based gameplay.

**Devnet Best Practices:**

* **Devnet:** Effectively free for experiments and testing
* **Mainnet:** Use batching to amortize costs (see Merkle batching section)
* Test with realistic move counts (20-30 moves per match)
* **Cloudflare R2 Storage Costs:**
  * Free tier: 10GB storage, 1M Class A operations/month (sufficient for development and early production)
  * No egress fees (significant cost savings vs other storage providers)
  * Additional storage: $0.015 per GB/month
  * Additional operations: $4.50 per million Class A operations
  * **Recommendation:** R2 free tier is sufficient for most use cases; scale to paid tier only when needed
* **Cloudflare R2 Costs:**
  * **Free tier:** 10GB storage, 1M Class A operations/month
  * No egress fees (significant cost savings vs Firebase Storage)
  * Additional storage: $0.015 per GB/month
  * Additional operations: $4.50 per million Class A operations
  * **Recommendation:** Primary hot storage solution due to generous free tier
* **Best Practices:**
  * Use **devnet** for development; anchoring to devnet is effectively free for experiments.
  * Batch anchors to amortize costs when moving to mainnet (see Section 6 for Merkle batching).
  * Use custom Rust/Anchor program for all on-chain operations.
  * Monitor storage costs and implement lifecycle policies (e.g., delete temporary data, archive old matches if needed).
  * Use Cloudflare R2 free tier for hot storage to minimize costs during development and early production.

---

## 11. Verification, auditing & benchmark process

**Verifier script must:**

1. Download canonical JSON from `hot_url` (R2).
2. Canonicalize using project canonical rules.
3. Compute SHA-256 and compare to anchored on-chain value.
4. If batched: retrieve batch manifest, compute Merkle proof, verify inclusion.
5. Recompute match outcome from raw events and confirm results.
6. Verify signatures in `signatures[]` with provided public keys (cross-check registry on-chain or trusted registry).

### 11.1 Benchmarking & Leaderboards

**Reproducible AI Benchmarks:**

* **Requirements for reproducibility:**
  1. Fix prompts, model versions, RNG seeds (record all in match metadata)
  2. Record chain-of-thought and full event logs to permanent archive
  3. Publish validators (human or automated scripts) that recompute match outcomes from logs
  4. Anchor hashes on Solana; publish registry of "official" matches with Merkle roots for batch anchoring
* **Model Metadata Requirements:**
  * `model_name`: Exact model identifier
  * `model_id`: Version hash or commit ID
  * `training_date`: When model was trained
  * `prompt_template`: Exact prompt used (or hash if too large)
  * `seed`: RNG seed for deterministic execution
  * `temperature`, `max_tokens`: All inference parameters
* **Validation Process:**
  * Independent validators can download match records and recompute outcomes
  * Compare validator results with recorded outcomes
  * Flag discrepancies for manual review

**Leaderboard Strategies:**

* **Off-Chain + Anchored (Our Implementation):**
  * Compute leaderboard off-chain from verified match records
  * Publish leaderboard snapshot + Merkle root periodically
  * Anchor the Merkle root on-chain for verifiability
  * Verifiers can fetch archived match logs and recompute if needed
  * **Pros:** Lower cost, flexible, can include complex metrics
  * **Cons:** Requires trust in off-chain computation
* **Option B: On-Chain Aggregates:**
  * Store minimal aggregate stats on-chain (wins, losses, ELO)
  * Update via transactions after each verified match
  * **Pros:** Fully on-chain authoritative, trustless
  * **Cons:** Higher cost, limited to simple metrics
  * **Use case:** Top-10 high-value leaderboards only
* **Hybrid Approach:**
  * On-chain for top rankings (top 10-100 players)
  * Off-chain for full leaderboard with detailed stats
  * Periodic on-chain snapshots for auditability

**Benchmark rules:**

* For official benchmark runs, store model tarball & prompts (or immutable location) and archive with match payload; anchor the archive on-chain.
* Maintain a public registry of benchmark match IDs and their verification status.
* Provide tools for independent verification of benchmark results.

---

## 12. Developer workflow & CLI

**Repo layout:**

```
/infra
  /workers
  /functions
/contracts
  /anchor_program
/docs
  idea.md
/tools
  verify_match.py
  canonicalize.js
/examples
  example_match.json
```

**Sample CLI commands (examples):**

* Create match id: `cargo run --bin mkid`
* Finalize & upload match: `node tools/upload_match.js --file path/to/match.json --upload r2 --anchor solana:program --batch-id <opt>`
* Verify: `python tools/verify_match.py --match-url <hot_url>`

---

## 13. Example match record (canonical) and verification steps

A full canonical example is included in `/examples/example_match.json` (generate from earlier schema). To verify manually:

1. `curl <hot_url> > example.json`
2. Run `node tools/canonicalize.js example.json > example_canonical.json`
3. `sha256sum example_canonical.json` → compare hex with on-chain anchor (stored in Match account) for `match_id`.
4. If batched: fetch manifest and `tools/verify_merkle.js --match_id ...` to get proof.

---

## 14. Glossary & conventions

* `hot_url` — Cloudflare R2 URL (signed URL for secure access).
* `authority` — private key that signs official match records.
* `coordinator` — Realtime server that sequences events.
* `anchor` — On-chain anchor stored via Rust program instruction.

---

## 15. User Authentication (Walletless Players)

### 15.1 Authentication Flow

Players authenticate via standard web auth (NOT Solana wallets):

1. User logs in via email/password or OAuth (Google, GitHub, etc.)
2. Backend generates session token (JWT, expires in 24 hours)
3. User submits moves via HTTP POST with session token
4. Coordinator verifies session token
5. Coordinator submits transaction to Solana using coordinator's wallet
6. Coordinator pays all Solana transaction fees

### 15.2 User ID Format

User IDs stored on-chain as strings (max 64 characters):

- **Firebase UID:** `user.uid` from Firebase Authentication (primary method)
- **Email-based:** SHA-256 hash of email address (fallback)
- **OAuth-based:** OAuth provider user ID (Google, GitHub, etc.)
- **Anonymous:** Random UUID for guest accounts

**Example:**

```typescript
// Firebase UID (primary)
const userId = firebaseUser.uid; // "abc123xyz..."

// Stored in Match.player_ids array as String
```

### 15.3 Move Authorization

```typescript
interface MoveSubmission {
    user_id: string;          // Firebase UID
    match_id: string;
    action: PlayerAction;
    session_token: string;    // JWT from login
    nonce: number;            // Replay protection
}

// Coordinator verifies:
// 1. Session token is valid (not expired)
// 2. User is in this match
// 3. It's user's turn
// 4. Then submits to Solana on user's behalf
```

### 15.4 Security

- Session tokens expire after 24 hours
- Rate limiting per user_id (100 actions/minute)
- Nonce prevents replay attacks
- Coordinator wallet is server-side only (never exposed)
- Firebase handles all authentication, session management, and user management

---

## 16. Critical Design Decisions & Answers

**BEFORE STARTING IMPLEMENTATION:** Answer these 7 critical questions:

### 1. Authentication: How do users log in?

**ANSWER:** 
- **Firebase Authentication (Already Implemented)**
  - Email/password authentication
  - Google OAuth
  - Facebook OAuth
  - Anonymous guest accounts
- **User ID Format:** Firebase UID (`user.uid`) is used as `player_id` in matches
- **Session Management:** Firebase handles ID tokens (1 hour expiry, auto-refreshed)
- **Move Authorization:** Coordinator verifies Firebase ID token, then submits to Solana on user's behalf

### 2. Token Sync: Is on-chain or database the source of truth?

**ANSWER:**
- **Database (PostgreSQL) is source of truth** for GP/AC balances
- **On-chain UserAccount is read-only mirror** for verification/leaderboards
- **If mismatch:** Database takes precedence, log for manual review
- **Recovery:** Replay transaction log to rebuild balances

### 3. Cost Recovery: How to cover $16k/month in Solana fees?

**ANSWER:**
- **AC Revenue:** 25% markup on AI API calls
- **Pro Subscriptions:** $9.99/month (1000 users = $10k/month)
- **Move Batching:** Batch 5 moves per transaction (73% cost reduction)
- **Combined:** AC + Pro + Batching = ~$20k/month revenue, ~$4.4k/month costs
- **Platform Treasury:** Initial funding from investors/grants until sustainable

### 4. Validator Incentives: Where does compensation come from?

**ANSWER:**
- **Invalid Disputes:** GP deposit (e.g., 100 GP ≈ $0.10) forfeited → Converted to SOL → Validators
- **Valid Disputes:** Platform treasury pays (0.05 SOL base + 0.02 SOL speed bonus)
- **Treasury Funding:** AC purchases + Pro subscriptions
- **Example:** 100 disputes/month = ~3.5 SOL/month = ~$700/month (funded by revenue)
- **Note:** Disputes use GP (Game Points) instead of SOL for deposits, aligning with free-to-play model

### 5. Game Registry: Where is the list of supported games stored?

**ANSWER:**
- **On-Chain:** GameRegistry account stores game definitions (game_id, name, min/max players, rule_engine_url)
- **Off-Chain:** Each game has rule engine endpoint (Cloudflare Worker or similar)
- **Registration:** Admin-only instruction to add/update games
- **Versioning:** Games can be updated (new version), old matches use old version

### 6. Move Batching: Can you batch multiple moves in one transaction?

**ANSWER:**
- **YES:** Batch up to 5 moves per transaction, BUT with important limitations:
- **Implementation:** `submit_batch_moves(match_id, moves[])` instruction
- **Limitations:**
  - All moves must be from the same player
  - For turn-based games: Only works for non-turn-based actions (declare intent, rebuttal, call showdown)
  - Turn-based moves (pick_up, decline) can only be batched if the player has multiple consecutive turns (rare)
  - **Primary use case:** Queuing offline moves or combining non-turn-based actions (e.g., declare intent + call showdown)
- **Cost Reduction:** For games that support multiple actions per turn, 50 moves = 10 transactions (instead of 50) = 73% cost reduction
- **Trade-off:** Slightly higher latency (wait for batch), but massive cost savings
- **NOTE:** This is NOT meant to batch moves across different players or different turns in a standard turn-based game. The cost reduction example assumes games where players can make multiple actions per turn or games with simultaneous actions.

### 7. Coordinator Failover: If coordinator dies mid-match, who takes over?

**ANSWER:**
- **State Recovery:** Recover match state from on-chain (Match + Move accounts)
- **Replay Moves:** Reconstruct game state by replaying all moves in order
- **Backup Coordinator:** Secondary coordinator instance can take over
- **Recovery Process:**
  1. Detect coordinator crash
  2. For each active match: Recover state from on-chain
  3. Rebuild off-chain state by replaying moves
  4. Resume match coordination
  5. If recovery fails: Pause match, alert admin

---

## 17. Next steps / roadmap

**Immediate Next Steps (Priority Order):**

1. **Design the canonical match JSON schema** (with examples for human + AI chain-of-thought + audio metadata)
   * Create comprehensive schema with all required and optional fields
   * Generate example match records for different scenarios (human vs human, AI vs AI, mixed)
   * Validate schema with JSON Schema validators

2. **Write a Merkle batching plan** (how often to anchor, proof format, sample code for anchor + verify)
   * Define batching strategy (time-based vs count-based)
   * Specify proof format and verification algorithm
   * Create reference implementation in TypeScript/Rust

3. **Design and deploy custom Rust/Anchor program** for anchors & signer registry
   * Custom Anchor program is REQUIRED for all on-chain operations
   * Define account structures and instruction interfaces
   * No Memo program used - all anchoring via custom program

4. **Prototype infra diagram** mapping Cloudflare Workers → R2 → Solana (Devnet)
   * Create architecture diagram showing data flow
   * Document API endpoints and integration points
   * Specify environment configuration

5. **Create an audit playbook** for verifying an archived match end-to-end (scripts to download, recompute hash, verify on-chain)
   * Write verification scripts in multiple languages (JS, Python, Rust)
   * Document step-by-step verification process
   * Create test cases with known-good match records

**Longer-term Roadmap:**

1. Generate canonical JSON library implementations in JS, Rust, Python.
2. Implement coordinator stub (Durable Object or Firestore) and event logger to hot store.
3. Build `tools/verify_match` and `tools/canonicalize` utilities.
4. Create a Rust Anchor program for the signer registry and batch anchors.
5. Run 1000 simulated matches on devnet with Merkle batching to exercise cost model.

---

---

## 18. Implementation Plan: Solana On-Chain Multiplayer

This section provides a detailed, granular implementation plan for building the verifiable multiplayer system with fully on-chain game state management.

### Critical Architecture Clarifications

#### Multiplayer Architecture
- **Multiplayer = Fully On-Chain**: All multiplayer game state and moves managed via Solana transactions
- **P2PManager = Chat/Video Only**: WebRTC used exclusively for voice chat and video, NOT for game state synchronization
- **IndexedDB = Local AI Only**: Only stores local AI game history and testing, NOT multiplayer matches
- **Rust/Anchor Program Required**: Must implement game logic in Rust/Anchor for on-chain validation and state management

#### Existing Components Usage
- **GameEngine** (`src/engine/GameEngine.ts`) - Used for local AI games and client-side UI rendering/validation only
- **EventBus** (`src/lib/eventing/EventBus.ts`) - UI events only, NOT game state synchronization
- **P2PManager** (`src/network/P2PManager.ts`) - Chat/video communication ONLY
- **AIManager** (`src/ai/AIManager.ts`) - AI players submit moves via Solana transactions
- **LogStorage** (`src/lib/logging/logStorage.ts`) - Local AI match history ONLY
- **Firebase Service** (`src/services/firebaseService.ts`) - User profiles, stats, match references (not full records)

---

### Phase 0: Rust/Anchor Program (CRITICAL - Must Be First)

#### 0.1 Anchor Workspace Setup (`Rust/SolanaContract/`)

**File: `Rust/SolanaContract/Cargo.toml`**
- Anchor framework dependencies
- Solana program dependencies
- Borsh serialization

**File: `Rust/SolanaContract/Anchor.toml`**
- Program ID configuration
- Cluster settings (devnet/mainnet)
- Build configuration

**File: `Rust/SolanaContract/src/lib.rs`**
- Main Anchor program entry point
- Program ID and module declarations
- Instruction handlers

**File: `Rust/SolanaContract/src/instructions/create_match.rs`**
- Initialize new match on-chain
- Create Match PDA account
- Set initial game state

**File: `Rust/SolanaContract/src/instructions/join_match.rs`**
- Player joins match
- Register player user ID (from database)
- Validate match capacity

**File: `Rust/SolanaContract/src/instructions/submit_move.rs`**
- Player submits move as transaction
- Validate move legality (mirrors TypeScript RuleEngine)
- Update match state on-chain
- Emit move event

**File: `Rust/SolanaContract/src/instructions/end_match.rs`**
- Finalize match
- Compute scores on-chain
- Set match_hash field
- Mark match as ended

**File: `Rust/SolanaContract/src/instructions/anchor_match_record.rs`**
- Anchor match hash after completion
- Store hot_url (R2 URL) if available

**File: `Rust/SolanaContract/src/state/match.rs`**
```rust
#[account]
pub struct Match {
    pub match_id: String,        // UUID v4
    pub game_type: u8,           // GameType enum (0=Claim, 1=ThreeCardBrag, 2=Poker, etc.)
    pub seed: u64,               // RNG seed
    pub phase: u8,                // Generic phase (0=Setup, 1=Playing, 2=Ended)
    pub current_player: u8,      // Index
    pub player_ids: [String; 10], // Fixed array of player user IDs (from database, supports up to 10 players)
    pub player_count: u8,        // Current number of players
    pub move_count: u32,
    pub created_at: i64,
    pub ended_at: i64,           // 0 = not ended
    pub match_hash: Option<[u8; 32]>, // SHA-256 after completion
    pub hot_url: Option<String>, // Cloudflare R2 URL (required for batch anchors, optional for single match anchors)
    pub authority: Pubkey,       // Match creator/coordinator
    // Generic game state fields (not game-specific)
    // Game-specific validation happens off-chain
}
```

**File: `Rust/SolanaContract/src/state/move.rs`**
```rust
#[account]
pub struct Move {
    pub match_id: String,
    pub player_id: String,       // Player user ID (from database)
    pub move_index: u32,
    pub action_type: u8,         // Generic action type (game-specific meaning)
    pub payload: Vec<u8>,        // Generic payload (game-specific serialized data)
    pub nonce: u64,              // Replay protection
    pub timestamp: i64,
}
```

**Note:** `action_type` and `payload` are generic. Game-specific action types (e.g., "pick_up" for CLAIM, "place_word" for word games, "voice_command" for voice games) are handled off-chain. The on-chain contract only validates:
- Turn order (current_player matches)
- Player is in match
- Phase is valid for move submission
- Nonce is greater than last nonce

**File: `Rust/SolanaContract/src/validation.rs`**
- **Generic validation only** (NOT game-specific rules):
  - Turn order validation (current_player matches)
  - Player in match validation
  - Phase transition validation (generic phases)
  - Nonce replay protection
  - Move index sequential validation
- **Game-specific rules validated off-chain** in MatchCoordinator/GameEngine
- **Phase 1:** CLAIM game rules implemented off-chain as example
- **Phase 2:** Each game (CLAIM, Poker, Word games, etc.) implements their own rule engine off-chain
- Why: Game rules vary too much (card games, word games, voice games, etc.) to implement all on-chain

**File: `Rust/SolanaContract/tests/game-tests.ts`**
- Anchor test suite
- Test match creation for multiple game types
- Test generic move submission
- Test validation logic (turn order, replay protection)
- Test game type configuration (min/max players)
- **Phase 1:** Uses CLAIM game as test case to validate framework
- **Phase 2:** Each game adds their own specific test suite

---

### Phase 1: TypeScript Solana Client

#### 1.1 Game Client (`src/services/solana/game-client/`)

**File: `src/services/solana/game-client/GameClient.ts`**
- TypeScript client for Anchor program
- `createMatch(gameType: number, seed: number, wallet): Promise<string>` (returns match PDA)
- `joinMatch(matchId: string, wallet): Promise<TransactionSignature>`
- `submitMove(matchId: string, playerId: string, action: PlayerAction, nonce?): Promise<TransactionSignature>` (coordinator's wallet used)
- `endMatch(matchId: string, matchHash?, hotUrl?, wallet?): Promise<TransactionSignature>`
- `getMatchState(matchId: string): Promise<MatchState>`
- `pollMatchState(matchId: string, callback: (state: MatchState) => void): void`
- `anchorMatchRecord(matchId: string, matchHash: Uint8Array, hotUrl?, wallet?): Promise<TransactionSignature>`
- `anchorBatch(...): Promise<TransactionSignature>`
- `flagDispute(...): Promise<TransactionSignature>`
- `resolveDispute(...): Promise<TransactionSignature>`

**File: `src/services/solana/game-client/AnchorClient.ts`**
- Anchor program client wrapper
- Program ID and connection management
- Instruction builders

**Dependencies:**
- `@coral-xyz/anchor`
- `@solana/web3.js`
- `borsh` (for serialization)

---

### Phase 2: Match Recording (On-Chain Data Collection)

#### 2.1 Match Event Collector (`src/lib/match-recording/`)

**File: `src/lib/match-recording/MatchEventCollector.ts`**
- For LOCAL AI: Reads from EventBus
- For MULTIPLAYER: Queries Solana program accounts for match moves and state
- Builds canonical match record from on-chain data
- Handles event ordering (on-chain timestamps are authoritative)

**File: `src/lib/match-recording/MatchRecorder.ts`**
- For LOCAL AI games only: Integrates with EventBus
- Maintains ordered event log per match
- NOT used for multiplayer (on-chain is source of truth)

---

### Phase 3: Canonical Serialization & Crypto

#### 3.1 Canonical Serialization (`src/lib/match-recording/canonical/`)

**File: `src/lib/match-recording/canonical/CanonicalSerializer.ts`**
- Deterministic JSON serialization
- UTF-8 encoding, lexicographic key sorting
- Minimal number representation
- ISO8601 UTC timestamps
- `canonicalizeMatchRecord(match: MatchRecord): Uint8Array`

#### 3.2 Cryptographic Services (`src/lib/crypto/`)

**File: `src/lib/crypto/HashService.ts`**
- SHA-256 hashing using Web Crypto API
- `hashMatchRecord(canonicalBytes: Uint8Array): string`

**File: `src/lib/crypto/SignatureService.ts`**
- Ed25519 signing using Web Crypto API
- `signMatchRecord(canonicalBytes: Uint8Array, privateKey: CryptoKey): SignatureRecord`

---

### Phase 4: Cloudflare Infrastructure Setup

#### 4.1 Cloudflare Workers Setup (`infra/cloudflare/`)

**File: `infra/cloudflare/wrangler.toml`**
- Wrangler configuration
- R2 bucket bindings
- Environment variables
- Routes configuration

**File: `infra/cloudflare/src/index.ts`**
- Main Worker entry point
- Request routing
- R2 bucket operations
- CORS handling
- Signed URL generation

**File: `infra/cloudflare/src/routes/storage.ts`**
- R2 upload/download routes
- Match record storage endpoints
- Signed URL generation endpoint

**R2 Bucket Configuration:**
- Bucket name: `claim-matches` (or from env) - **Example: CLAIM game storage**
- Public access: Signed URLs only (no public access)
- CORS: Configured for web app origin

#### 4.2 Storage Services (`src/services/storage/`)

**File: `src/services/storage/R2Service.ts`**
- Cloudflare R2 integration via Worker API
- `uploadMatchRecord(matchId: string, canonicalJSON: string): Promise<string>` (returns R2 URL)
- `getMatchRecord(matchId: string): Promise<MatchRecord>`
- `generateSignedUrl(matchId: string, expiresIn: number): Promise<string>`

**File: `src/services/storage/HotStorageService.ts`**
- Unified hot storage interface
- Uses R2Service (primary storage)
- `uploadMatchRecord(matchId: string, canonicalJSON: string): Promise<string>` (returns R2 URL)

---

### Phase 5: Match Coordinator

#### 5.1 Match Coordinator (`src/services/match-coordinator/`)

**File: `src/services/solana/MatchCoordinator.ts`**
- Orchestrates on-chain match lifecycle
- `createOnChainMatch(gameType: number, players: Player[], seed: number): Promise<string>` (returns match PDA)
- `submitMoveOnChain(matchId: string, playerId: string, action: PlayerAction): Promise<TransactionSignature>` (coordinator submits on behalf of player)
  - **Validates game-specific rules off-chain** using GameEngine/RuleEngine
  - **Submits to Solana** for generic validation (turn order, replay protection)
  - **Rolls back** if on-chain validation fails
- `finalizeMatch(matchId: string): Promise<MatchRecord>` (reads from chain, builds canonical record)
- `anchorMatchRecord(matchId: string): Promise<AnchorResult>`

**Integration Notes:**
- **Game-specific validation:** Happens off-chain in MatchCoordinator using GameEngine/RuleEngine
- **On-chain validation:** Only generic checks (turn order, player in match, phase, nonce)
- **NO integration with P2PManager for game state** - P2P is chat/video only
- **All game state comes from Solana program accounts** for multiplayer
- **Client-side GameEngine used for UI rendering and off-chain validation only**

---

### Phase 6: Match Record Anchoring

#### 6.1 Solana Anchor Service (`src/services/solana/`)

**File: `src/services/solana/SolanaAnchorService.ts`**
- Rust/Anchor program integration
- `anchorMatchHash(matchId: string, sha256: string, hotUrl: string): Promise<string>`
- Uses `anchor_match_record` instruction from Rust program

#### 6.2 Merkle Batching (`src/services/solana/MerkleBatching.ts`)

**File: `src/services/solana/MerkleBatching.ts`**
- `buildMerkleTree(matchHashes: string[]): MerkleTree`
- `generateMerkleProof(matchHash: string, tree: MerkleTree): MerkleProof`

---

### Phase 7: AI Integration

#### 7.1 AI Decision Recording (`src/ai/match-recording/`)

**File: `src/ai/match-recording/AIDecisionRecorder.ts`**
- Captures AI chain-of-thought from AIManager
- Records model metadata
- For AI players in multiplayer: AI submits moves via GameClient.submitMove()

**Integration:**
- AI players use GameClient to submit moves as Solana transactions
- Chain-of-thought stored off-chain, referenced in match record

---

### Phase 8: Verification

#### 8.1 Verification Service (`src/services/verification/`)

**File: `src/services/verification/MatchVerifier.ts`**
- `verifyMatch(matchId: string, source: 'hot_url'): Promise<VerificationResult>`
- Steps:
  1. Download canonical JSON
  2. Canonicalize and compute SHA-256
  3. Compare with on-chain anchor
  4. Verify Merkle proof if batched
  5. Verify signatures
  6. Recompute match outcome from events

#### 8.2 CLI Tools (`tools/`)

**File: `tools/verify-match.ts`** - CLI verification script
**File: `tools/canonicalize.ts`** - Canonicalization utility

---

### Phase 9: UI Integration

#### 9.1 Match History UI (`src/ui/components/MatchHistory/`)

**File: `src/ui/components/MatchHistory/MatchHistory.tsx`**
- Displays user's match history (reads from Firebase/Solana)
- Shows verification status badges

**File: `src/ui/components/MatchHistory/MatchDetail.tsx`**
- Match replay viewer
- Shows canonical record

---

### Phase 10: Local Storage (AI Games Only)

#### 10.1 Match Records Storage (`src/lib/db/matchRecords.ts`)

**File: `src/lib/db/matchRecords.ts`**
- IndexedDB schema for LOCAL AI match records ONLY
- NOT used for multiplayer matches

**Schema:**
```typescript
interface MatchRecordDB {
  match_id: string;
  match_type: 'local_ai' | 'multiplayer'; // Only 'local_ai' stored here
  player_ids: string[];
  start_time: number;
  end_time?: number;
  sha256: string;
  verification_status: 'pending' | 'verified' | 'failed';
  created_at: number;
}
```

---

### Data Flow Diagrams

#### Local AI Game Flow
```
GameEngine.processPlayerAction()
    ↓
EventBus.emit(UpdateGameStateEvent)
    ↓
MatchRecorder.captureEvent() [local only]
    ↓
[Match End] → CanonicalSerializer → HashService
    ↓
[Store in IndexedDB for local history]
```

#### Multiplayer Game Flow (On-Chain)
```
Player submits move in UI
    ↓
GameClient.submitMove(matchId, action, keypair)
    ↓
[Submit Solana Transaction] → Anchor Program.validateMove()
    ↓
[On-Chain Validation] → Anchor Program.updateMatchState()
    ↓
[Transaction Confirmed] → MatchCoordinator.pollMatchState()
    ↓
[Read match state from Solana program accounts]
    ↓
[Match End] → Anchor Program.endMatch()
    ↓
MatchCoordinator.finalizeMatch() [reads final state from chain]
    ↓
CanonicalSerializer.canonicalize()
    ↓
HashService.hashMatchRecord()
    ↓
[Parallel]
    └─→ HotStorageService.uploadMatchRecord() → hot_url
    ↓
SolanaAnchorService.anchorMatchHash() → tx_signature
    ↓
MatchVerifier.verifyMatch()
```

#### Chat/Video Flow (P2P Only)
```
P2PManager.initialize() [for chat/video only]
    ↓
WebRTC connection established
    ↓
[Chat messages/video streams]
    ↓
[NO game state synchronization]
```

---

### File Structure

```
Rust/
└── SolanaContract/
    ├── Cargo.toml
    ├── Anchor.toml
    ├── src/
    │   ├── lib.rs
    │   ├── instructions/
    │   │   ├── mod.rs
    │   │   ├── create_match.rs
    │   │   ├── join_match.rs
    │   │   ├── submit_move.rs
    │   │   ├── end_match.rs
    │   │   └── anchor_match_record.rs
    │   ├── state/
    │   │   ├── mod.rs
    │   │   ├── match.rs
    │   │   ├── player.rs
    │   │   └── move.rs
    │   ├── errors.rs
    │   └── validation.rs
    └── tests/
        └── claim-game.ts  # Example: CLAIM game implementation

infra/
└── cloudflare/
    ├── wrangler.toml
    ├── package.json
    ├── tsconfig.json
    ├── .dev.vars
    └── src/
        ├── index.ts
        ├── routes/
        │   ├── storage.ts
        │   └── match.ts
        └── utils/
            ├── cors.ts
            └── r2.ts

src/
├── services/
│   ├── solana/
│   │   ├── game-client/
│   │   │   ├── GameClient.ts
│   │   │   ├── AnchorClient.ts
│   │   │   └── types.ts
│   │   ├── SolanaAnchorService.ts
│   │   ├── MatchAnchor.ts
│   │   ├── MerkleBatching.ts
│   │   ├── BatchAnchor.ts
│   │   └── SolanaConfig.ts
│   ├── match-coordinator/
│   │   ├── MatchCoordinator.ts
│   │   └── CoordinatorConfig.ts
│   ├── storage/
│   │   ├── R2Service.ts
│   │   ├── HotStorageService.ts
│   │   └── StorageConfig.ts
│   └── verification/
│       ├── MatchVerifier.ts
│       └── VerificationResult.ts
├── lib/
│   ├── match-recording/
│   │   ├── MatchRecorder.ts [local AI only]
│   │   ├── MatchEventCollector.ts [reads from Solana for multiplayer]
│   │   ├── types.ts
│   │   └── canonical/
│   │       ├── CanonicalSerializer.ts
│   │       └── CanonicalJSON.ts
│   ├── crypto/
│   │   ├── HashService.ts
│   │   ├── SignatureService.ts
│   │   └── KeyManager.ts
│   └── db/
│       └── matchRecords.ts [local AI only]
├── ai/
│   └── match-recording/
│       ├── AIDecisionRecorder.ts
│       └── types.ts
└── ui/components/
    ├── MatchHistory/
    │   ├── MatchHistory.tsx
    │   ├── MatchDetail.tsx
    │   └── VerificationBadge.tsx
    └── Game/
        └── MatchRecordingIndicator.tsx

tools/
├── verify-match.ts
├── canonicalize.ts
└── upload-match.ts
```

---

### Integration Checklist

#### Rust/Anchor Program (CRITICAL)
- [ ] Create Anchor workspace structure
- [ ] Implement match state accounts (Match, Move, Player)
- [ ] Implement instructions (create_match, join_match, submit_move, end_match)
- [ ] Implement game rule validation in Rust (mirrors TypeScript RuleEngine)
- [ ] Write tests using Anchor test framework
- [ ] Deploy to devnet

#### Solana Client Integration
- [ ] Create GameClient wrapper for Anchor program
- [ ] Coordinator has Solana wallet (players don't need wallets)
- [ ] Submit moves as Solana transactions
- [ ] Poll Solana program for match state updates
- [ ] Handle transaction confirmations and errors

#### Cloudflare Infrastructure
- [ ] Set up Cloudflare Workers/Wrangler and R2 buckets
- [ ] Create Cloudflare Worker for R2 match storage operations
- [ ] Configure CORS and signed URLs

#### Storage Services
- [ ] Implement R2Service for Cloudflare R2 integration
- [ ] Implement HotStorageService with R2 as primary storage

#### Match Coordinator
- [ ] Implement MatchCoordinator to orchestrate on-chain matches
- [ ] Integrate with Solana program for state management

#### AI Integration
- [ ] Capture chain-of-thought in getAIAction() (for AI players in multiplayer)
- [ ] AI players submit moves via Solana transactions (via GameClient)
- [ ] Record model metadata on AI initialization

#### Firebase Integration
- [ ] Extend user profiles with match history references (match PDAs)
- [ ] Store match metadata in Firestore (not full records, just references)
- [ ] Link Solana wallet addresses to Firebase user accounts

---

### Environment Configuration

#### Frontend `.env`
```bash
# Solana
VITE_SOLANA_CLUSTER=devnet|mainnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com

# Anchor Program
VITE_ANCHOR_PROGRAM_ID=<program_id>

# Storage
VITE_STORAGE_PROVIDER=r2
VITE_R2_WORKER_URL=https://claim-storage.<your-subdomain>.workers.dev
VITE_R2_BUCKET_NAME=claim-matches

# Match Recording
VITE_ENABLE_MATCH_RECORDING=true
VITE_ANCHOR_STRATEGY=immediate|batched
VITE_BATCH_SIZE=100
```

#### Cloudflare Worker `.dev.vars` (local development)
```bash
R2_BUCKET_NAME=claim-matches
CORS_ORIGIN=http://localhost:3000
```

#### Cloudflare `wrangler.toml`
```toml
name = "claim-storage"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "MATCHES_BUCKET"
bucket_name = "claim-matches"

[vars]
CORS_ORIGIN = "https://yourdomain.com"
```

#### Cloudflare Setup Steps
1. Install Wrangler CLI: `npm install -g wrangler`
2. Login to Cloudflare: `wrangler login`
3. Create R2 bucket: `wrangler r2 bucket create claim-matches`
4. Deploy worker: `wrangler deploy`
5. Set environment variables in Cloudflare dashboard or via `wrangler secret put`

---

### Phase Implementation Order

1. **Phase 0**: Rust/Anchor Program (CRITICAL - must be first)
2. **Phase 1**: TypeScript Solana Client (GameClient)
3. **Phase 2**: Match Recording (on-chain data collection)
4. **Phase 3**: Canonical Serialization & Crypto
5. **Phase 4**: Cloudflare Infrastructure Setup (Workers + R2)
6. **Phase 5**: Storage Services (R2Service, HotStorageService)
7. **Phase 6**: Match Coordinator
8. **Phase 7**: Match Record Anchoring
9. **Phase 8**: AI Integration
10. **Phase 9**: Verification
11. **Phase 10**: UI Integration
12. **Phase 11**: Local Storage (AI games only)

---

### Critical Notes

#### Architecture Principles
- **Multiplayer = On-Chain**: All multiplayer game state lives in Solana program accounts
- **Moves = Solana Transactions**: Players submit moves as transactions, validated on-chain
- **P2P = Chat/Video Only**: WebRTC used exclusively for communication, NOT game state
- **IndexedDB = Local AI Only**: Only stores local AI game history, NOT multiplayer matches
- **Rust Program Required**: Must implement game logic in Rust/Anchor for on-chain validation
- **Client-side GameEngine**: Used for UI rendering and local validation only
- **On-chain state is source of truth** for multiplayer matches

#### Cloudflare R2 Benefits
- **Free Tier**: 10GB storage, 1M Class A operations/month
- **No Egress Fees**: Free data transfer (unlike Firebase Storage)
- **Global CDN**: Fast access worldwide
- **Signed URLs**: Secure, time-limited access
- **Workers Integration**: Serverless compute for storage operations

#### Storage Strategy
- **Hot Storage (R2)**: All match records stored in Cloudflare R2 via Worker
- **Match Record Storage (R2)**: All match records stored in Cloudflare R2
- **Local Cache (IndexedDB)**: Only for local AI games, not multiplayer
- **Match Records**: Stored as canonical JSON in R2, referenced by match_id

---

## 17. Design Choices & Tradeoffs

### On-Chain Everything (Not Used - Too Expensive)

**Pros:**
* Maximum transparency — all data publicly verifiable
* No trust in off-chain systems required
* Complete immutability

**Cons:**
* Cost explosion — every byte costs money on-chain
* Slow transaction times — not suitable for real-time gameplay
* Privacy leaks — all data is public on blockchain
* Size limits — Solana transaction size constraints
* **Verdict:** Not feasible for full match records with audio, chain-of-thought, etc.

### Off-Chain Store + On-Chain Anchor (Our Implementation)

**Pros:**
* Cheap — only small hashes stored on-chain
* Scalable — no limits on off-chain data size
* Privacy — sensitive data can be access-controlled off-chain
* Reproducible verification — anyone can verify by downloading and hashing
* Fast — real-time gameplay unaffected by blockchain latency

**Cons:**
* Requires reliable off-chain hosting (solved by R2)
* Need archive strategy for long-term availability
* **Verdict:** Best balance of cost, performance, and verifiability

### Batching via Merkle Roots

**Pros:**
* Best cost/performance for high volume — one tx anchors 1k matches
* Amortizes transaction fees across many matches
* Enables efficient bulk verification

**Cons:**
* Verifier needs Merkle proofs (simple to provide)
* Slightly more complex implementation
* **Verdict:** Essential for production at scale (>10 matches/day)

### Implementation: Custom Rust/Anchor Program

**We use a custom Rust/Anchor program for all on-chain operations.**

**Why:**
* Structured data storage (Match accounts, Move accounts, User accounts)
* Custom validation logic (turn order, replay protection, game type validation)
* Signer registry for authority management
* Dispute flagging and resolution
* Leaderboard aggregates
* Token system integration (GP/AC)
* Batch anchoring with Merkle roots
* Full control over account structure and instructions

**Implementation:**
* Program deployed on Solana (devnet → mainnet)
* All game state stored on-chain in structured accounts
* All anchoring done via program instructions
* No Memo program used

---

## 20. Security & Anti-tamper Recommendations

### Canonical Serialization

* **Critical:** Define exact JSON ordering and normalization to avoid equivocation attacks
* **Implementation:** Use deterministic key sorting (lexicographic Unicode order)
* **Testing:** Verify canonicalization produces identical output across all implementations (JS, Rust, Python)
* **Versioning:** Bump `version` field in match schema when canonical rules change

### Signing Strategy

* **Authority Keys:** Match coordinator/server signs each record with Ed25519 keypair
* **Key Management:** Store private keys securely (encrypted, not in version control)
* **Key Rotation:** Support key rotation with on-chain registry of authorized signers
* **Single Authority Signature:** Server/authority signature is sufficient. Multi-signature not needed - match records are already verifiable via on-chain anchoring and canonical hashing.
* **Public Key Registry:** Publish signer public keys on-chain or in trusted off-chain registry

### Replayability

* **Raw Event Logs:** Store complete, ordered event log for each match
* **Random Seed:** Include RNG seed in match record for deterministic replay
* **Replay Tools:** Provide scripts to replay matches from event logs and verify outcomes
* **State Snapshots:** Optional periodic state snapshots for faster replay validation

### Rate Limiting & Spam Protection

* **On-Chain:** Transaction fees provide natural rate limiting
* **Off-Chain:** Implement rate limits on match creation and move submission
* **Spam Detection:** Monitor for suspicious patterns (rapid match creation, invalid moves)
* **Cost Recovery:** Require deposit or fee for match creation to prevent spam
* **Reputation System:** Track player reputation to identify and limit spam accounts

### Access Control

* **Match Records:** Use signed URLs with expiration for accessing match records
* **Role-Based Access:** Implement roles (player, spectator, validator) with different permissions
* **Audit Logging:** Log all access to match records for security auditing
* **Encryption:** Encrypt sensitive data (PII, audio) before storage, store keys securely

### Verification & Auditing

* **Independent Verification:** Enable third-party verification of all matches
* **Automated Checks:** Run automated verification on all matches after anchoring
* **Dispute Resolution:** Provide mechanism to flag disputed matches on-chain
* **Audit Trail:** Maintain complete audit trail of all match operations

---

## 21. Solana Implementation Guide: Detailed Setup & Development

This section provides a comprehensive, step-by-step guide for implementing the Solana on-chain game system, including environment setup, contract development, testing, and client integration.

### 19.1 Prerequisites & Environment Setup

#### Required Tools

**1. Install Rust:**
```bash
# Windows (using rustup)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Or download from https://rustup.rs/

# Verify installation
rustc --version
cargo --version
```

**2. Install Solana CLI:**
```bash
# Windows (PowerShell)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add to PATH (Windows)
# Add C:\Users\<username>\.local\share\solana\install\active_release\bin to PATH

# Verify installation
solana --version
solana-keygen --version
```

**3. Install Anchor Framework:**
```bash
# Install via cargo
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install Anchor CLI via avm
avm install latest
avm use latest

# Verify installation
anchor --version
```

**4. Install Node.js Dependencies:**
```bash
# In project root
npm install @coral-xyz/anchor @solana/web3.js borsh
npm install --save-dev @types/node
```

#### Development Environment Configuration

**1. Solana CLI Configuration:**
```bash
# Set to devnet (for development)
solana config set --url devnet

# Generate keypair for development (if needed)
solana-keygen new --outfile ~/.config/solana/devnet-keypair.json

# Check configuration
solana config get

# Airdrop SOL for testing (devnet only)
solana airdrop 2
```

**2. Anchor Project Structure:**
```bash
# Create Anchor workspace
anchor init claim-game-program --no-git  # Example: CLAIM game program name

# Or manually create structure:
mkdir -p Rust/SolanaContract
cd Rust/SolanaContract
anchor init
```

**3. Project Structure:**
```
contracts/
└── claim-game-program/
    ├── Anchor.toml
    ├── Cargo.toml
    ├── Xargo.toml
    ├── .anchor/
    │   └── (generated files)
    ├── src/
    │   └── lib.rs
    ├── tests/
    │   └── claim-game.ts
    └── target/
        └── (build artifacts)
```

---

### 21.2 Anchor Program Setup

#### 21.2.1 Anchor.toml Configuration

**File: `Rust/SolanaContract/Anchor.toml`**
```toml
[features]
resolution = true
skip-lint = false

[programs.devnet]
claim_game_program = "YourProgramIDHere"

[programs.mainnet]
claim_game_program = "YourProgramIDHere"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

#### 21.2.2 Cargo.toml Dependencies

**File: `Rust/SolanaContract/Cargo.toml`**
```toml
[package]
name = "claim-game-program"
version = "0.1.0"
description = "Generic multiplayer games program (CLAIM used as example/reference)"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "claim_game_program"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []

[dependencies]
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"
solana-program = "~1.18"
```

---

### 21.3 Rust Program Implementation

#### 21.3.1 Program Entry Point

**File: `Rust/SolanaContract/src/lib.rs`**
```rust
use anchor_lang::prelude::*;

declare_id!("YourProgramIDHere");

#[program]
pub mod claim_game_program {
    use super::*;

    pub fn create_match(ctx: Context<CreateMatch>, match_id: String, seed: u64) -> Result<()> {
        // Implementation in create_match.rs
        instructions::create_match::handler(ctx, match_id, seed)
    }

    pub fn join_match(ctx: Context<JoinMatch>, match_id: String) -> Result<()> {
        instructions::join_match::handler(ctx, match_id)
    }

    pub fn submit_move(ctx: Context<SubmitMove>, match_id: String, action_type: u8, payload: Vec<u8>) -> Result<()> {
        instructions::submit_move::handler(ctx, match_id, action_type, payload)
    }

    pub fn end_match(ctx: Context<EndMatch>, match_id: String) -> Result<()> {
        instructions::end_match::handler(ctx, match_id)
    }
}

#[derive(Accounts)]
pub struct CreateMatch<'info> {
    // Account definitions
}

// Additional structs and error definitions
```

#### 21.3.2 State Definitions

**File: `Rust/SolanaContract/src/state/mod.rs`**
```rust
pub mod match_state;
pub mod move_state;
pub mod player_state;

pub use match_state::*;
pub use move_state::*;
pub use player_state::*;
```

**File: `Rust/SolanaContract/src/state/match_state.rs`**
```rust
use anchor_lang::prelude::*;

#[account]
pub struct Match {
    pub match_id: String,           // UUID v4 (max 36 bytes)
    pub game_type: u8,              // GameType enum (0=Claim, 1=ThreeCardBrag, 2=Poker, etc.)
    pub seed: u64,                  // RNG seed
    pub phase: u8,                  // 0=Dealing, 1=Playing, 2=Ended
    pub current_player: u8,         // Index (0-3)
    pub player_ids: [String; 10], // Fixed array of player user IDs (from database, supports up to 10 players)
    pub player_count: u8,           // Current number of players
    pub move_count: u32,            // Total moves
    pub created_at: i64,            // Unix timestamp
    pub ended_at: Option<i64>,      // Unix timestamp when ended
    pub match_hash: Option<[u8; 32]>, // SHA-256 hash after completion
    pub hot_url: Option<String>,  // R2 URL (required for batch anchors, optional for single match anchors)
    pub authority: Pubkey,          // Match creator/coordinator
}

impl Match {
    pub const MAX_SIZE: usize = 8 +      // discriminator
        36 +                             // match_id
        10 +                             // game_name
        8 +                              // seed
        1 +                              // phase
        1 +                              // current_player
        (32 * 4) +                       // players array
        1 +                              // player_count
        4 +                              // move_count
        8 +                              // created_at
        9 +                              // ended_at (Option<i64>)
        33 +                            // match_hash (Option<[u8; 32]>)
        45 +                            // hot_url (Option<String>)
        32;                             // authority

    pub fn is_full(&self) -> bool {
        self.player_count >= 4
    }

    pub fn can_join(&self) -> bool {
        self.phase == 0 && !self.is_full() // Only in Dealing phase
    }
}
```

**File: `Rust/SolanaContract/src/state/move_state.rs`**
```rust
use anchor_lang::prelude::*;

#[account]
pub struct Move {
    pub match_id: String,        // UUID v4
    pub player_id: String,       // Player user ID (from database)
    pub move_index: u32,         // Sequential move number
    pub action_type: u8,         // 0=pick_up, 1=decline, 2=declare_intent, etc.
    pub payload: Vec<u8>,        // Borsh-serialized action data
    pub timestamp: i64,          // Unix timestamp
}

impl Move {
    pub const MAX_SIZE: usize = 8 +      // discriminator
        36 +                             // match_id
        32 +                             // player
        4 +                              // move_index
        1 +                              // action_type
        4 +                              // payload length prefix
        256 +                            // max payload size
        8;                               // timestamp
}
```

#### 21.3.3 Instruction Implementations

**File: `Rust/SolanaContract/src/instructions/mod.rs`**
```rust
pub mod create_match;
pub mod join_match;
pub mod submit_move;
pub mod end_match;

pub use create_match::*;
pub use join_match::*;
pub use submit_move::*;
pub use end_match::*;
```

**File: `Rust/SolanaContract/src/instructions/create_match.rs`**
```rust
use anchor_lang::prelude::*;
use crate::state::Match;

pub fn handler(ctx: Context<CreateMatch>, match_id: String, seed: u64) -> Result<()> {
    let match_account = &mut ctx.accounts.match_account;
    let clock = Clock::get()?;

    // Initialize match
    match_account.match_id = match_id;
    match_account.game_type = game_type;  // Passed as parameter
    match_account.seed = seed;
    match_account.phase = 0; // Dealing
    match_account.current_player = 0;
    match_account.player_ids = [String::new(); 10]; // Initialize with empty strings
    match_account.player_count = 0;
    match_account.move_count = 0;
    match_account.created_at = clock.unix_timestamp;
    match_account.ended_at = None;
    match_account.match_hash = None;
    match_account.hot_url = None;
    match_account.authority = ctx.accounts.authority.key();

    msg!("Match created: {}", match_account.match_id);
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct CreateMatch<'info> {
    #[account(
        init,
        payer = authority,
        space = Match::MAX_SIZE,
        seeds = [b"match", match_id.as_bytes()],
        bump
    )]
    pub match_account: Account<'info, Match>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
```

**File: `Rust/SolanaContract/src/instructions/join_match.rs`**
```rust
use anchor_lang::prelude::*;
use crate::state::Match;

pub fn handler(ctx: Context<JoinMatch>, match_id: String) -> Result<()> {
    let match_account = &mut ctx.accounts.match_account;
    
    require!(match_account.can_join(), GameError::MatchFull);
    require!(match_account.phase == 0, GameError::InvalidPhase);

    // Add player to match
    let player_index = match_account.player_count as usize;
    match_account.players[player_index] = ctx.accounts.player.key();
    match_account.player_count += 1;

    msg!("Player {} joined match {}", ctx.accounts.player.key(), match_id);
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct JoinMatch<'info> {
    #[account(
        mut,
        seeds = [b"match", match_id.as_bytes()],
        bump
    )]
    pub match_account: Account<'info, Match>,
    
    pub player: Signer<'info>,
}
```

**File: `Rust/SolanaContract/src/instructions/submit_move.rs`**
```rust
use anchor_lang::prelude::*;
use crate::state::{Match, Move};
use crate::validation;

pub fn handler(
    ctx: Context<SubmitMove>,
    match_id: String,
    action_type: u8,
    payload: Vec<u8>,
) -> Result<()> {
    let match_account = &mut ctx.accounts.match_account;
    let move_account = &mut ctx.accounts.move_account;
    let clock = Clock::get()?;

    // Validate it's player's turn
    let player_index = match_account.players
        .iter()
        .position(|&p| p == ctx.accounts.player.key())
        .ok_or(GameError::PlayerNotInMatch)?;
    
    require!(
        match_account.current_player == player_index as u8,
        GameError::NotPlayerTurn
    );

    // Validate move legality
    validation::validate_move(match_account, action_type, &payload)?;

    // Create move account
    move_account.match_id = match_id.clone();
    move_account.player = ctx.accounts.player.key();
    move_account.move_index = match_account.move_count;
    move_account.action_type = action_type;
    move_account.payload = payload;
    move_account.timestamp = clock.unix_timestamp;

    // Update match state
    match_account.move_count += 1;
    match_account.current_player = ((player_index + 1) % 4) as u8;

    // Check for phase transitions
    if validation::should_transition_phase(match_account, action_type)? {
        match_account.phase = validation::get_next_phase(match_account.phase)?;
    }

    msg!("Move submitted: player {}, action {}, match {}", 
         ctx.accounts.player.key(), action_type, match_id);
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct SubmitMove<'info> {
    #[account(
        mut,
        seeds = [b"match", match_id.as_bytes()],
        bump
    )]
    pub match_account: Account<'info, Match>,
    
    #[account(
        init,
        payer = player,
        space = Move::MAX_SIZE,
        seeds = [b"move", match_id.as_bytes(), match_account.move_count.to_le_bytes().as_ref()],
        bump
    )]
    pub move_account: Account<'info, Move>,
    
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

**File: `Rust/SolanaContract/src/instructions/end_match.rs`**
```rust
use anchor_lang::prelude::*;
use crate::state::Match;

pub fn handler(ctx: Context<EndMatch>, match_id: String, match_hash: Option<[u8; 32]>, hot_url: Option<String>) -> Result<()> {
    let match_account = &mut ctx.accounts.match_account;
    let clock = Clock::get()?;

    require!(match_account.phase == 1, GameError::InvalidPhase); // Must be in Playing phase
    require!(ctx.accounts.authority.key() == match_account.authority, GameError::Unauthorized);

    // Compute scores (simplified - full implementation would calculate from moves)
    // This would iterate through all Move accounts and compute final scores

    // Finalize match
    match_account.phase = 2; // Ended
    match_account.ended_at = Some(clock.unix_timestamp);
    match_account.match_hash = match_hash;
    match_account.hot_url = hot_url;

    msg!("Match ended: {}", match_id);
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct EndMatch<'info> {
    #[account(
        mut,
        seeds = [b"match", match_id.as_bytes()],
        bump
    )]
    pub match_account: Account<'info, Match>,
    
    pub authority: Signer<'info>,
}
```

#### 21.3.4 Validation Logic

**File: `Rust/SolanaContract/src/validation.rs`**
```rust
use anchor_lang::prelude::*;
use crate::state::Match;
use crate::error::GameError;

pub fn validate_move(match_account: &Match, action_type: u8, payload: &[u8]) -> Result<()> {
    match action_type {
        0 => validate_pick_up(match_account, payload),
        1 => validate_decline(match_account, payload),
        2 => validate_declare_intent(match_account, payload),
        3 => validate_call_showdown(match_account, payload),
        4 => validate_rebuttal(match_account, payload),
        _ => Err(GameError::InvalidAction.into()),
    }
}

fn validate_pick_up(match_account: &Match, _payload: &[u8]) -> Result<()> {
    require!(match_account.phase == 1, GameError::InvalidPhase);
    // Additional validation logic
    Ok(())
}

fn validate_decline(match_account: &Match, _payload: &[u8]) -> Result<()> {
    require!(match_account.phase == 1, GameError::InvalidPhase);
    Ok(())
}

fn validate_declare_intent(match_account: &Match, payload: &[u8]) -> Result<()> {
    require!(payload.len() >= 1, GameError::InvalidPayload);
    // Validate suit declaration
    Ok(())
}

fn validate_call_showdown(match_account: &Match, _payload: &[u8]) -> Result<()> {
    require!(match_account.phase == 1, GameError::InvalidPhase);
    Ok(())
}

fn validate_rebuttal(match_account: &Match, _payload: &[u8]) -> Result<()> {
    require!(match_account.phase == 1, GameError::InvalidPhase);
    Ok(())
}

pub fn should_transition_phase(match_account: &Match, action_type: u8) -> Result<bool> {
    // Logic to determine if action triggers phase transition
    Ok(false) // Simplified
}

pub fn get_next_phase(current_phase: u8) -> Result<u8> {
    match current_phase {
        0 => Ok(1), // Dealing -> Playing
        1 => Ok(2), // Playing -> Ended
        _ => Err(GameError::InvalidPhase.into()),
    }
}
```

#### 21.3.5 Error Definitions

**File: `Rust/SolanaContract/src/error.rs`**
```rust
use anchor_lang::prelude::*;

#[error_code]
pub enum GameError {
    #[msg("Match is full")]
    MatchFull,
    
    #[msg("Invalid game phase")]
    InvalidPhase,
    
    #[msg("Not player's turn")]
    NotPlayerTurn,
    
    #[msg("Player not in match")]
    PlayerNotInMatch,
    
    #[msg("Invalid action")]
    InvalidAction,
    
    #[msg("Invalid payload")]
    InvalidPayload,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Match not found")]
    MatchNotFound,
    
    #[msg("Move validation failed")]
    MoveValidationFailed,
}
```

---

### 21.4 Testing Setup

#### 21.4.1 Anchor Test Configuration

**File: `Rust/SolanaContract/tests/claim-game.ts`**
```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ClaimGameProgram } from "../target/types/claim_game_program";
import { expect } from "chai";
import { Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("claim-game-program", () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ClaimGameProgram as Program<ClaimGameProgram>;
  
  // Test accounts
  const authority = provider.wallet;
  const player1 = Keypair.generate();
  const player2 = Keypair.generate();
  const player3 = Keypair.generate();
  const player4 = Keypair.generate();

  // Helper to get match PDA
  const getMatchPDA = async (matchId: string) => {
    return await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from("match"), Buffer.from(matchId)],
      program.programId
    );
  };

  // Helper to airdrop SOL
  const airdrop = async (pubkey: anchor.web3.PublicKey, amount: number) => {
    const sig = await provider.connection.requestAirdrop(
      pubkey,
      amount * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);
  };

  before(async () => {
    // Airdrop SOL to test players
    await airdrop(player1.publicKey, 2);
    await airdrop(player2.publicKey, 2);
    await airdrop(player3.publicKey, 2);
    await airdrop(player4.publicKey, 2);
  });

  it("Creates a match", async () => {
    const matchId = "test-match-001";
    const seed = 12345;
    
    const [matchPDA] = await getMatchPDA(matchId);

    const tx = await program.methods
      .createMatch(matchId, new anchor.BN(seed))
      .accounts({
        matchAccount: matchPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Create match transaction:", tx);

    // Fetch and verify match account
    const matchAccount = await program.account.match.fetch(matchPDA);
    expect(matchAccount.matchId).to.equal(matchId);
    expect(matchAccount.seed.toNumber()).to.equal(seed);
    expect(matchAccount.phase).to.equal(0); // Dealing phase
    expect(matchAccount.playerCount).to.equal(0);
  });

  it("Players can join match", async () => {
    const matchId = "test-match-001";
    const [matchPDA] = await getMatchPDA(matchId);

    // Player 1 joins
    await program.methods
      .joinMatch(matchId)
      .accounts({
        matchAccount: matchPDA,
        player: player1.publicKey,
      })
      .signers([player1])
      .rpc();

    // Player 2 joins
    await program.methods
      .joinMatch(matchId)
      .accounts({
        matchAccount: matchPDA,
        player: player2.publicKey,
      })
      .signers([player2])
      .rpc();

    // Verify players joined
    const matchAccount = await program.account.match.fetch(matchPDA);
    expect(matchAccount.playerCount).to.equal(2);
    expect(matchAccount.players[0].toString()).to.equal(player1.publicKey.toString());
    expect(matchAccount.players[1].toString()).to.equal(player2.publicKey.toString());
  });

  it("Player can submit move", async () => {
    const matchId = "test-match-001";
    const [matchPDA] = await getMatchPDA(matchId);
    
    // Get move PDA
    const moveIndex = 0;
    const [movePDA] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("move"),
        Buffer.from(matchId),
        Buffer.from(new Uint8Array(new anchor.BN(moveIndex).toArray("le", 4))),
      ],
      program.programId
    );

    const actionType = 0; // pick_up
    const payload = Buffer.from([]);

    await program.methods
      .submitMove(matchId, actionType, payload)
      .accounts({
        matchAccount: matchPDA,
        moveAccount: movePDA,
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    // Verify move was recorded
    const moveAccount = await program.account.move.fetch(movePDA);
    expect(moveAccount.matchId).to.equal(matchId);
    expect(moveAccount.actionType).to.equal(actionType);
    expect(moveAccount.moveIndex.toNumber()).to.equal(moveIndex);
  });

  it("Can end match", async () => {
    const matchId = "test-match-001";
    const [matchPDA] = await getMatchPDA(matchId);

    const matchHash = Buffer.alloc(32, 1); // Dummy hash
    const hotUrl = "https://r2.example.com/matches/test-match-001.json";

    await program.methods
      .endMatch(matchId, Array.from(matchHash), hotUrl)
      .accounts({
        matchAccount: matchPDA,
        authority: authority.publicKey,
      })
      .rpc();

    // Verify match ended
    const matchAccount = await program.account.match.fetch(matchPDA);
    expect(matchAccount.phase).to.equal(2); // Ended
    expect(matchAccount.endedAt).to.not.be.null;
  });
});
```

**File: `Rust/SolanaContract/package.json`**
```json
{
  "name": "claim-game-program",
  "version": "0.1.0",
  "scripts": {
    "test": "anchor test",
    "build": "anchor build",
    "deploy": "anchor deploy"
  },
  "dependencies": {
    "@coral-xyz/anchor": "^0.29.0",
    "@solana/web3.js": "^1.87.6",
    "chai": "^4.3.10",
    "mocha": "^10.2.0"
  },
  "devDependencies": {
    "@types/chai": "^4.3.11",
    "@types/mocha": "^10.0.6",
    "ts-mocha": "^10.0.0",
    "typescript": "^5.3.3"
  }
}
```

**File: `Rust/SolanaContract/tsconfig.json`**
```json
{
  "compilerOptions": {
    "types": ["mocha", "chai"],
    "typeRoots": ["./node_modules/@types"],
    "lib": ["es6"],
    "module": "commonjs",
    "target": "es6",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["tests/**/*"]
}
```

---

### 21.5 Build & Deploy Process

#### 21.5.1 Build Commands

```bash
# Navigate to program directory
cd Rust/SolanaContract

# Build the program
anchor build

# This generates:
# - target/deploy/claim_game_program.so (BPF program)
# - target/idl/claim_game_program.json (IDL for client)
# - target/types/claim_game_program.ts (TypeScript types)
```

#### 21.5.2 Deploy to Devnet

```bash
# Ensure you're on devnet
solana config set --url devnet

# Check balance (need SOL for deployment)
solana balance

# Airdrop if needed
solana airdrop 2

# Deploy program
anchor deploy

# Or deploy manually
solana program deploy target/deploy/claim_game_program.so

# Get program ID
solana address -k target/deploy/claim_game_program-keypair.json

# Update Anchor.toml with program ID
# Update declare_id!() in lib.rs with program ID
```

#### 21.5.3 Verify Deployment

```bash
# Check program account
solana program show <PROGRAM_ID>

# View program data
solana account <PROGRAM_ID>
```

---

### 21.6 TypeScript Client Integration

#### 21.6.1 Client Setup

**File: `src/services/solana/game-client/AnchorClient.ts`**
```typescript
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair, Commitment } from '@solana/web3.js';
import { ClaimGameProgram } from '../../../../Rust/SolanaContract/target/types/claim_game_program';
import IDL from '../../../../Rust/SolanaContract/target/idl/claim_game_program.json';

export class AnchorClient {
  private program: Program<ClaimGameProgram>;
  private connection: Connection;
  private provider: AnchorProvider;

  constructor(
    connection: Connection,
    wallet: Wallet,
    commitment: Commitment = 'confirmed'
  ) {
    this.connection = connection;
    this.provider = new AnchorProvider(connection, wallet, {
      commitment,
      preflightCommitment: commitment,
    });
    
    const programId = new PublicKey(IDL.metadata.address);
    this.program = new Program(IDL as any, programId, this.provider);
  }

  getProgram(): Program<ClaimGameProgram> {
    return this.program;
  }

  getConnection(): Connection {
    return this.connection;
  }

  getProvider(): AnchorProvider {
    return this.provider;
  }
}
```

**File: `src/services/solana/game-client/GameClient.ts`**
```typescript
import { AnchorClient } from './AnchorClient';
import { PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { PlayerAction } from '@/types/game';

export interface MatchState {
  matchId: string;
  gameName: string;
  seed: number;
  phase: number;
  currentPlayer: number;
  players: PublicKey[];
  playerCount: number;
  moveCount: number;
  createdAt: number;
  endedAt?: number;
  matchHash?: Uint8Array;
  hotUrl?: string;
}

export class GameClient {
  private anchorClient: AnchorClient;

  constructor(anchorClient: AnchorClient) {
    this.anchorClient = anchorClient;
  }

  /**
   * Create a new match on-chain
   */
  async createMatch(
    players: PublicKey[],
    seed: number
  ): Promise<{ matchPDA: PublicKey; signature: string }> {
    const program = this.anchorClient.getProgram();
    const matchId = crypto.randomUUID();
    
    const [matchPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('match'), Buffer.from(matchId)],
      program.programId
    );

    const signature = await program.methods
      .createMatch(matchId, new BN(seed))
      .accounts({
        matchAccount: matchPDA,
        authority: this.anchorClient.getProvider().wallet.publicKey,
        systemProgram: PublicKey.default, // Will be resolved automatically
      })
      .rpc();

    return { matchPDA, signature };
  }

  /**
   * Join an existing match
   */
  async joinMatch(matchId: string, playerKeypair: Keypair): Promise<string> {
    const program = this.anchorClient.getProgram();
    
    const [matchPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('match'), Buffer.from(matchId)],
      program.programId
    );

    const signature = await program.methods
      .joinMatch(matchId)
      .accounts({
        matchAccount: matchPDA,
        player: playerKeypair.publicKey,
      })
      .signers([playerKeypair])
      .rpc();

    return signature;
  }

  /**
   * Submit a move as a Solana transaction
   */
  async submitMove(
    matchId: string,
    action: PlayerAction,
    playerKeypair: Keypair
  ): Promise<string> {
    const program = this.anchorClient.getProgram();
    
    const [matchPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('match'), Buffer.from(matchId)],
      program.programId
    );

    // Get current move count to create move PDA
    const matchAccount = await program.account.match.fetch(matchPDA);
    const moveIndex = matchAccount.moveCount.toNumber();
    
    const [movePDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from('move'),
        Buffer.from(matchId),
        Buffer.from(new Uint8Array(new BN(moveIndex).toArray('le', 4))),
      ],
      program.programId
    );

    // Map action type to u8
    const actionType = this.mapActionType(action.type);
    
    // Serialize payload (simplified - use Borsh for complex data)
    const payload = Buffer.from(JSON.stringify(action.payload || {}));

    const signature = await program.methods
      .submitMove(matchId, actionType, Array.from(payload))
      .accounts({
        matchAccount: matchPDA,
        moveAccount: movePDA,
        player: playerKeypair.publicKey,
        systemProgram: PublicKey.default,
      })
      .signers([playerKeypair])
      .rpc();

    return signature;
  }

  /**
   * Get current match state
   */
  async getMatchState(matchId: string): Promise<MatchState> {
    const program = this.anchorClient.getProgram();
    
    const [matchPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('match'), Buffer.from(matchId)],
      program.programId
    );

    const matchAccount = await program.account.match.fetch(matchPDA);

    return {
      matchId: matchAccount.matchId,
      gameName: matchAccount.gameName,
      seed: matchAccount.seed.toNumber(),
      phase: matchAccount.phase,
      currentPlayer: matchAccount.currentPlayer,
      players: matchAccount.players.filter(p => !p.equals(PublicKey.default)),
      playerCount: matchAccount.playerCount,
      moveCount: matchAccount.moveCount.toNumber(),
      createdAt: matchAccount.createdAt.toNumber(),
      endedAt: matchAccount.endedAt?.toNumber(),
      matchHash: matchAccount.matchHash ? new Uint8Array(matchAccount.matchHash) : undefined,
      hotUrl: matchAccount.hotUrl || undefined,
    };
  }

  /**
   * Poll for match state updates
   */
  pollMatchState(
    matchId: string,
    callback: (state: MatchState) => void,
    intervalMs: number = 2000
  ): () => void {
    let polling = true;

    const poll = async () => {
      if (!polling) return;
      
      try {
        const state = await this.getMatchState(matchId);
        callback(state);
      } catch (error) {
        console.error('Error polling match state:', error);
      }
      
      if (polling) {
        setTimeout(poll, intervalMs);
      }
    };

    poll();

    // Return stop function
    return () => {
      polling = false;
    };
  }

  /**
   * End a match
   */
  async endMatch(
    matchId: string,
    matchHash?: Uint8Array,
    hotUrl?: string
  ): Promise<string> {
    const program = this.anchorClient.getProgram();
    
    const [matchPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('match'), Buffer.from(matchId)],
      program.programId
    );

    const signature = await program.methods
      .endMatch(
        matchId,
        matchHash ? Array.from(matchHash) : null,
        hotUrl || null
      )
      .accounts({
        matchAccount: matchPDA,
        authority: this.anchorClient.getProvider().wallet.publicKey,
      })
      .rpc();

    return signature;
  }

  private mapActionType(actionType: PlayerAction['type']): number {
    const mapping: Record<PlayerAction['type'], number> = {
      pick_up: 0,
      decline: 1,
      declare_intent: 2,
      call_showdown: 3,
      rebuttal: 4,
    };
    return mapping[actionType] ?? 0;
  }
}
```

#### 21.6.2 Session Management & Transaction Handling

**Session Management & Transaction Handling:**

* **Connection Flow:**
  1. Player logs in via standard web auth (email/password, OAuth, etc.)
  2. Backend generates session token (JWT, expires in 24 hours)
  3. Player user ID (Firebase UID) stored in session
  4. No wallet connection needed - coordinator handles all Solana transactions

* **Transaction Confirmation UX:**
  1. Player submits move through web UI
  2. UI shows "Submitting move..." loading state
  3. Coordinator verifies session token and submits move to Solana (no wallet popup for player)
  4. UI shows "Confirming transaction... (400ms-1s typical)" with progress indicator
  5. On confirmation: Update game state, show success message
  6. On failure: Show error message, allow retry

* **Progress Indicators:**
  * Transaction submitted: "Transaction submitted, waiting for confirmation..."
  * Confirming: "Confirming transaction... (this may take a few seconds)"
  * Success: "Move confirmed! Waiting for next turn..."
  * Failure: "Transaction failed. Please try again."

* **Transaction Status:**
  * Coordinator handles all Solana fees (players don't see fees)
  * UI shows transaction status: "Submitting...", "Confirming...", "Confirmed"
  * No fee estimation needed for players

* **Graceful Fallback:**
  * RPC failure: Retry with backup RPC endpoint
  * Transaction timeout: Show "Transaction taking longer than expected" message
  * Network error: Offer "Retry" button
  * Coordinator handles all retries automatically

**Implementation:**

```typescript
// Transaction handling with UX (no wallet needed)
export function useGameTransaction() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'confirming' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submitMove = async (matchId: string, userId: string, action: PlayerAction) => {
    try {
      setStatus('submitting');
      setError(null);

      // Submit via coordinator (no wallet needed)
      const response = await fetch('/api/matches/submit-move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getSessionToken()}` // JWT from login
        },
        body: JSON.stringify({ matchId, userId, action })
      });

      if (!response.ok) throw new Error('Failed to submit move');

      const { txSignature } = await response.json();
      setStatus('confirming');

      // Coordinator handles confirmation, UI just shows status
      // In production, coordinator broadcasts confirmation via WebSocket
      setStatus('success');
      
      // Reset after 2 seconds
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  };

  return { submitMove, status, error };
}
```

**Coordinator Wallet Setup (Server-Side):**

**File: `src/services/solana/CoordinatorWallet.ts`**
```typescript
import { Keypair } from '@solana/web3.js';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Connection } from '@solana/web3.js';

// Coordinator wallet (server-side only, never exposed to players)
export class CoordinatorWallet {
  private keypair: Keypair;
  private connection: Connection;
  
  constructor() {
    // Load coordinator keypair from environment variable (encrypted)
    const privateKey = process.env.COORDINATOR_PRIVATE_KEY;
    this.keypair = Keypair.fromSecretKey(Buffer.from(privateKey, 'base64'));
    this.connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
  }
  
  getWallet(): Wallet {
    return {
      publicKey: this.keypair.publicKey,
      signTransaction: async (tx) => {
        tx.sign(this.keypair);
        return tx;
      },
      signAllTransactions: async (txs) => {
        txs.forEach(tx => tx.sign(this.keypair));
        return txs;
      },
    };
  }
  
  getConnection(): Connection {
    return this.connection;
  }
  
  getPublicKey() {
    return this.keypair.publicKey;
  }
}
```

**Note:** Players do NOT need wallets. Coordinator handles all Solana transactions.

---

### 21.7 Transaction Handling & Error Recovery

#### 19.7.1 Transaction Utilities

**File: `src/services/solana/utils/TransactionHandler.ts`**
```typescript
import { Connection, Transaction, TransactionSignature, Commitment } from '@solana/web3.js';

export class TransactionHandler {
  constructor(private connection: Connection) {}

  /**
   * Send transaction with retry logic
   */
  async sendWithRetry(
    transaction: Transaction,
    signers: any[],
    maxRetries: number = 3
  ): Promise<TransactionSignature> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const signature = await this.connection.sendTransaction(
          transaction,
          signers,
          {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 3,
          }
        );

        // Wait for confirmation
        await this.confirmTransaction(signature, 'confirmed');
        return signature;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Transaction attempt ${i + 1} failed:`, error);
        
        if (i < maxRetries - 1) {
          await this.delay(1000 * (i + 1)); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Transaction failed after retries');
  }

  /**
   * Confirm transaction with timeout
   */
  async confirmTransaction(
    signature: TransactionSignature,
    commitment: Commitment = 'confirmed',
    timeout: number = 30000
  ): Promise<void> {
    const confirmation = await Promise.race([
      this.connection.confirmTransaction(signature, commitment),
      this.timeout(timeout),
    ]);

    if (!confirmation) {
      throw new Error('Transaction confirmation timeout');
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(signature: TransactionSignature): Promise<'success' | 'failed' | 'pending'> {
    const status = await this.connection.getSignatureStatus(signature);
    
    if (status.value?.err) {
      return 'failed';
    }
    
    if (status.value?.confirmationStatus === 'finalized') {
      return 'success';
    }
    
    return 'pending';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private timeout(ms: number): Promise<null> {
    return new Promise(resolve => setTimeout(() => resolve(null), ms));
  }
}
```

#### 21.7.2 Error Handling

**File: `src/services/solana/utils/ErrorHandler.ts`**
```typescript
import { SendTransactionError } from '@solana/web3.js';

export class SolanaErrorHandler {
  static parseError(error: unknown): string {
    if (error instanceof SendTransactionError) {
      return this.parseTransactionError(error);
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'Unknown error occurred';
  }

  static parseTransactionError(error: SendTransactionError): string {
    const logs = error.logs || [];
    
    // Check for program-specific errors
    for (const log of logs) {
      if (log.includes('GameError::')) {
        return this.parseProgramError(log);
      }
    }

    // Check for common Solana errors
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient SOL balance for transaction';
    }
    
    if (error.message.includes('blockhash not found')) {
      return 'Transaction expired. Please try again.';
    }
    
    if (error.message.includes('user rejected')) {
      return 'Transaction was rejected by user';
    }

    return error.message || 'Transaction failed';
  }

  static parseProgramError(log: string): string {
    if (log.includes('MatchFull')) {
      return 'Match is full';
    }
    if (log.includes('InvalidPhase')) {
      return 'Invalid game phase for this action';
    }
    if (log.includes('NotPlayerTurn')) {
      return 'Not your turn';
    }
    if (log.includes('PlayerNotInMatch')) {
      return 'Player not in this match';
    }
    if (log.includes('InvalidAction')) {
      return 'Invalid action';
    }
    if (log.includes('Unauthorized')) {
      return 'Unauthorized action';
    }
    
    return 'Game logic error';
  }
}
```

---

### 21.8 Development Workflow

#### 21.8.1 Local Development Setup

**1. Start Local Validator (Optional):**
```bash
# Terminal 1: Start local validator
solana-test-validator

# Terminal 2: Point to local validator
solana config set --url localhost
```

**2. Build & Test Cycle:**
```bash
# In Rust/SolanaContract/
anchor build          # Build program
anchor test           # Run tests
anchor deploy         # Deploy to configured cluster
```

**3. Update Program ID:**
```bash
# After first deployment, update:
# 1. Anchor.toml [programs.devnet] section
# 2. src/lib.rs declare_id!() macro
# 3. Rebuild and redeploy
```

#### 21.8.2 Testing Checklist

- [ ] Unit tests for each instruction
- [ ] Integration tests for full match lifecycle
- [ ] Error case testing (invalid moves, unauthorized actions)
- [ ] Edge cases (match full, phase transitions)
- [ ] Transaction confirmation handling
- [ ] Error recovery and retry logic

#### 21.8.3 Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing
- [ ] Program ID configured correctly
- [ ] Account sizes validated (within Solana limits)
- [ ] Error handling tested
- [ ] Gas costs estimated

**Deployment:**
- [ ] Deploy to devnet first
- [ ] Verify program account exists
- [ ] Test all instructions on devnet
- [ ] Monitor transaction success rates
- [ ] Document program ID and deployment tx

**Post-Deployment:**
- [ ] Update client code with program ID
- [ ] Test client integration
- [ ] Monitor for errors
- [ ] Set up alerts for failed transactions

---

### 21.9 Common Issues & Troubleshooting

#### Issue: Program ID Mismatch
**Symptoms:** "Program account data mismatch" errors
**Solution:**
```bash
# Regenerate program keypair
anchor keys list

# Update Anchor.toml and lib.rs with correct program ID
# Rebuild and redeploy
```

#### Issue: Account Size Exceeded
**Symptoms:** "Account data too large" errors
**Solution:**
- Review account struct sizes
- Use `#[account]` size constraints
- Split large accounts if they exceed size limits
- Use `Vec<u8>` with length prefixes for variable data

#### Issue: Transaction Timeout
**Symptoms:** Transactions hang or timeout
**Solution:**
- Increase RPC timeout
- Use faster RPC endpoint
- Implement retry logic with exponential backoff
- Check network congestion

#### Issue: Insufficient Funds
**Symptoms:** "Insufficient funds" errors
**Solution:**
```bash
# Check balance
solana balance

# Airdrop (devnet only)
solana airdrop 2

# For mainnet: transfer SOL to wallet
```

---

### 21.10 Production Considerations

#### Security
- Audit Rust program before mainnet deployment
- Single authority signature for all operations (no multisig needed)
- Implement rate limiting
- Validate all inputs
- Use checked arithmetic (no overflow)

#### Performance
- Minimize account data size
- Batch operations where possible
- Use efficient data structures
- Profile compute units usage

#### Monitoring
- Track transaction success rates
- Monitor account rent costs
- Alert on program errors
- Log all critical operations

---

## 20. Economic Model & Incentives

**Implementation: Token-Based Free-to-Play Model**

**CRITICAL: NO Real Money Matches - All Matches Are FREE**

The economic model uses tokens only - no SOL, no entry fees, no escrow:
- **All matches are FREE** - No entry fees, no deposits, no real money transactions
- **Players do NOT need Solana wallets** - Tokens are managed server-side
- **Token system only:** Game Points (GP) and AI Credits (AC)
- **GP:** Free daily distribution, used to play games
- **AC:** Purchasable with credit card (Stripe), used for AI API calls
- **Pro subscriptions:** Purchasable with credit card, provides GP multipliers

**How It Works:**
- Players get free GP daily (no wallet needed)
- Players use GP to play games (GP is burned per game)
- Players can purchase AC with credit card for AI features
- Players can bring their own API key OR use AC (with premium markup)
- Coordinator pays all Solana transaction fees (players don't pay network fees)

---

### 20.1 Two Token System: Game Points (GP) & AI Credits (AC)

**Overview:**

The platform uses a dual-token system - all matches are FREE, tokens are the only economic mechanism:

1. **Game Points (GP)** - Free daily distribution, earnable via ads, used to play games
2. **AI Credits (AC)** - Purchasable with credit card (Stripe), used for AI API calls

**Key Points:**

- **NO Solana wallets required** - Tokens managed server-side in database
- **GP is FREE** - Daily login rewards, ad rewards, generous but not unlimited
- **AC is PAID** - Purchased with credit card via Stripe, covers API costs + premium markup
- **Players can bring own API key** - OR use AC (with premium markup)
- **All matches are FREE** - No entry fees, no deposits, no real money
- **Coordinator pays Solana fees** - Players don't pay network transaction fees

#### 20.1.1 Token Setup

**Implementation:**

```rust
// In Rust program
#[account]
pub struct ConfigAccount {
    pub authority: Pubkey,
    pub ac_price_usd: f64,            // Price of AC in USD (e.g., 0.01 = $0.01 per AC)
    pub gp_daily_amount: u64,         // Daily GP distribution (e.g., 1000)
    pub gp_cost_per_game: u32,        // GP cost to start a game
    pub gp_per_ad: u32,               // GP reward per ad watched
    pub max_daily_ads: u8,            // Maximum ads per day
    pub ad_cooldown_seconds: i64,     // Cooldown between ads (300 seconds)
    pub ac_price_lamports: u64,        // Price of 1 AC in lamports
    pub pro_gp_multiplier: u8,        // Pro subscription GP multiplier (2x or 3x)
    pub ai_model_costs: [u32; 10],    // Cost per 1k tokens for each model
    pub max_gp_balance: u64,          // Maximum GP balance cap
}

#[account]
pub struct UserAccount {
    pub user_id: String,              // Firebase UID (user.uid from Firebase Auth, not Solana pubkey)
    // NOTE: gp_balance and ac_balance are stored in DATABASE, not on-chain
    // On-chain only stores aggregates for leaderboard:
    pub last_claim: i64,               // Last daily login claim timestamp
    pub last_ad_watch: i64,           // Last ad watch timestamp
    pub subscription_expiry: i64,      // Subscription expiry timestamp (0 = no subscription)
    pub subscription_tier: u8,        // 0=Free, 1=Pro, 2=ProPlus
    pub lifetime_gp_earned: u64,     // Total GP earned (lifetime)
    pub games_played: u32,            // Total games played
    pub games_won: u32,                // Total games won
    pub win_streak: u32,               // Current win streak
    pub total_ac_spent: u64,           // Total AC spent (lifetime)
    pub api_calls_made: u32,           // Total API calls made
}
```

**Token Storage Overview:**

- **GP and AC are stored server-side** in database (NOT on-chain SPL tokens)
- **No Solana wallets required** for players
- **UserAccount stores:** GP balance, AC balance, last_claim, subscription info
- **On-chain tracking:** Optional - can track token balances on-chain for leaderboards/analytics, but tokens themselves are off-chain
- **Why off-chain:** Players don't need wallets, simpler UX, faster transactions

**CRITICAL: Token Balance Storage & Synchronization** [FRAMEWORK]

**Storage Architecture:**

- **Primary Storage:** PostgreSQL database (source of truth for balances)
- **On-Chain Storage:** UserAccount PDA (optional, for verification/leaderboards)
- **Sync Strategy:** Database-first, on-chain is read-only mirror

**Database Schema:**

```sql
-- [FRAMEWORK] User token balances table
CREATE TABLE user_token_balances (
    user_id VARCHAR(64) PRIMARY KEY,
    gp_balance BIGINT NOT NULL DEFAULT 0,
    ac_balance BIGINT NOT NULL DEFAULT 0,
    last_synced_slot BIGINT,              -- Last Solana slot synced
    pending_transactions TEXT[],          -- Array of pending tx signatures
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- [FRAMEWORK] Transaction log for audit
CREATE TABLE token_transactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    transaction_type VARCHAR(32) NOT NULL, -- 'daily_login', 'game_cost', 'ac_purchase', etc.
    gp_delta BIGINT NOT NULL,              -- Change in GP (can be negative)
    ac_delta BIGINT NOT NULL,              -- Change in AC (can be negative)
    solana_tx_signature VARCHAR(128),      -- On-chain tx if applicable
    status VARCHAR(16) NOT NULL,           -- 'pending', 'confirmed', 'failed'
    created_at TIMESTAMP NOT NULL,
    confirmed_at TIMESTAMP
);
```

**Sync & Reconciliation Strategy:**

```typescript
// [FRAMEWORK] Token balance sync
interface UserTokenBalance {
  user_id: string;
  gp_balance: number;
  ac_balance: number;
  last_synced_slot: number;      // Solana slot number
  pending_transactions: string[]; // Pending tx signatures
}

// [FRAMEWORK] Sync reconciliation
async function reconcileBalances(userId: string): Promise<void> {
  const dbBalance = await db.getUserBalance(userId);
  const onChainBalance = await program.account.userAccount.fetch(userPDA);
  
  // Database is source of truth
  // On-chain is read-only mirror for verification
  if (dbBalance.gp_balance !== onChainBalance.gp_balance) {
    // Log discrepancy for manual review
    await logDiscrepancy(userId, 'gp_balance', dbBalance.gp_balance, onChainBalance.gp_balance);
    
    // Option: Update on-chain to match database (if database is authoritative)
    // await updateOnChainBalance(userId, dbBalance);
  }
}

// [FRAMEWORK] Atomic transaction handling
async function claimDailyLogin(userId: string): Promise<void> {
  // 1. Update database (source of truth)
  const tx = await db.transaction();
  try {
    await tx.updateBalance(userId, { gp_balance: { increment: 1000 } });
    await tx.logTransaction(userId, 'daily_login', { gp_delta: 1000 });
    
    // 2. Submit to Solana (async, non-blocking)
    const solanaTx = await coordinator.submitDailyLoginClaim(userId);
    await tx.updateTransactionStatus(solanaTx.signature, 'pending');
    
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  }
  
  // 3. Poll for confirmation (background job)
  pollTransactionConfirmation(solanaTx.signature);
}
```

**Conflict Resolution:**

- **Source of Truth:** Database (PostgreSQL)
- **On-Chain Purpose:** Verification, leaderboards, transparency
- **If Mismatch:** Log for manual review, database takes precedence
- **Recovery:** Replay transaction log to rebuild balances if needed

#### 20.1.2 Daily Login System

**Implementation:**

```rust
pub fn claim_daily_login(ctx: Context<ClaimDailyLogin>) -> Result<()> {
    let user_account = &mut ctx.accounts.user_account;
    let config = &ctx.accounts.config_account;
    let clock = Clock::get()?;
    
    // Check if 24 hours have passed since last claim
    let time_since_last_claim = clock.unix_timestamp - user_account.last_claim;
    require!(
        time_since_last_claim >= 86400,  // 24 hours in seconds
        GameError::DailyClaimCooldown
    );
    
    // Calculate GP amount (apply subscription multiplier * leaderboard rank multiplier)
    let base_gp = config.gp_daily_amount;
    
    // Subscription multiplier (Pro users get 2x or 3x)
    let subscription_multiplier = if user_account.subscription_tier > 0 {
        config.pro_gp_multiplier
    } else {
        1
    };
    
    // Leaderboard rank multiplier (1-5x based on rank)
    let rank_multiplier = user_account.active_multiplier.max(1); // Ensure at least 1x
    
    // Combined multiplier (subscription * rank)
    let total_multiplier = subscription_multiplier as u64 * rank_multiplier as u64;
    let gp_amount = base_gp * total_multiplier;
    
    // Update GP balance in user account (off-chain database)
    // In production: Update database, not on-chain token
    user_account.gp_balance = user_account.gp_balance
        .checked_add(gp_amount)
        .ok_or(GameError::Overflow)?;
    user_account.last_claim = clock.unix_timestamp;
    user_account.lifetime_gp_earned = user_account.lifetime_gp_earned
        .checked_add(gp_amount)
        .ok_or(GameError::Overflow)?;
    
    // Emit event
    emit!(DailyLoginClaimed {
        user_id: user_account.user_id.clone(),
        amount: gp_amount,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
```

**Features:**

- **Rate limiting:** Max 1 claim per 23 hours (prevents abuse)
- **Pro multiplier:** Pro users get 2x or 3x daily GP
- **Lifetime tracking:** `lifetime_gp_earned` counter
- **Event emission:** For analytics and leaderboards

#### 20.1.3 Game Payment Flow

**Implementation:**

```rust
pub fn start_game_with_gp(ctx: Context<StartGame>, match_id: String) -> Result<()> {
    let user_account = &mut ctx.accounts.user_account;
    let config = &ctx.accounts.config_account;
    
    // Check GP balance (from database - off-chain check)
    // In production: Check database balance before calling this instruction
    // This instruction only updates aggregates (games_played, etc.)
    
    // Update stats
    user_account.games_played = user_account.games_played
        .checked_add(1)
        .ok_or(GameError::Overflow)?;
    
    // Emit event
    emit!(GameStarted {
        user_id: user_account.user_id.clone(),
        gp_spent: config.gp_cost_per_game,
        match_id,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}
```

**Features:**

- **GP cost per game:** Configurable in ConfigAccount
- **No refunds:** GP burned even if game incomplete
- **Stats tracking:** Increments `games_played` counter
- **Pro users:** May have reduced or zero GP cost (configurable)

#### 20.1.4 Ad Reward System

**Implementation:**

```rust
pub fn claim_ad_reward(
    ctx: Context<ClaimAdReward>,
    ad_verification_signature: Vec<u8>,  // Off-chain oracle signature
) -> Result<()> {
    let user_account = &mut ctx.accounts.user_account;
    let config = &ctx.accounts.config_account;
    let clock = Clock::get()?;
    
    // Verify ad was watched (off-chain oracle signature)
    // In production, verify signature from ad verification service
    require!(
        verify_ad_signature(&ad_verification_signature, &user_account.user_id),
        GameError::InvalidAdVerification
    );
    
    // Check cooldown (minimum 300 seconds between ads)
    let time_since_last_ad = clock.unix_timestamp - user_account.last_ad_watch;
    require!(
        time_since_last_ad >= config.ad_cooldown_seconds,
        GameError::AdCooldownActive
    );
    
    // Check daily ad limit (tracked off-chain or in separate account)
    // For simplicity, assume checked off-chain
    
    // Add GP reward to user account (off-chain database)
    user_account.gp_balance = user_account.gp_balance
        .checked_add(config.gp_per_ad as u64)
        .ok_or(GameError::Overflow)?;
    user_account.last_ad_watch = clock.unix_timestamp;
    user_account.lifetime_gp_earned = user_account.lifetime_gp_earned
        .checked_add(config.gp_per_ad as u64)
        .ok_or(GameError::Overflow)?;
    
    // Emit event
    emit!(AdWatched {
        user_id: user_account.user_id.clone(),
        gp_earned: config.gp_per_ad,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
```

**Features:**

- **Cooldown timer:** 300 seconds minimum between ads
- **Daily cap:** Maximum ads per day (tracked off-chain)
- **Verification:** Off-chain oracle signature required
- **Stats tracking:** Increments `ads_watched` counter

#### 20.1.5 Pro Subscription

**Implementation:**

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum SubscriptionTier {
    Free = 0,
    Pro = 1,
    ProPlus = 2,
}

pub fn purchase_subscription(
    ctx: Context<PurchaseSubscription>,
    tier: SubscriptionTier,
    duration_days: u8,  // Typically 30 days
) -> Result<()> {
    let user_account = &mut ctx.accounts.user_account;
    let config = &ctx.accounts.config_account;
    let clock = Clock::get()?;
    
    // Calculate cost based on tier (USD, paid via Stripe)
    let cost_usd = match tier {
        SubscriptionTier::Pro => 9.99,      // $9.99/month
        SubscriptionTier::ProPlus => 19.99, // $19.99/month
        _ => return Err(GameError::InvalidTier.into()),
    };
    
    // Payment processed via Stripe (off-chain)
    // In production: Call Stripe API to process payment
    // After successful payment, update subscription in database
    
    // Extend subscription expiry
    let duration_seconds = duration_days as i64 * 86400;
    if user_account.subscription_expiry > clock.unix_timestamp {
        // Extend existing subscription
        user_account.subscription_expiry = user_account.subscription_expiry
            .checked_add(duration_seconds)
            .ok_or(GameError::Overflow)?;
    } else {
        // New subscription
        user_account.subscription_expiry = clock.unix_timestamp
            .checked_add(duration_seconds)
            .ok_or(GameError::Overflow)?;
    }
    
    user_account.subscription_tier = tier as u8;
    
    // Emit event
    emit!(SubscriptionPurchased {
        user_id: user_account.user_id.clone(),
        tier: tier as u8,
        expiry: user_account.subscription_expiry,
        usd_paid: cost_usd,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
```

**Benefits:**

- **GP multiplier:** 2x or 3x daily login rewards
- **Reduced GP costs:** Pro users may have lower/zero GP costs for games
- **Premium features:** Access to exclusive game modes, cosmetics, etc.
- **Duration:** Typically 30 days, extendable

#### 20.1.6 Leaderboard System (Per Game Type + Per Season)

**Architecture Decision: PER-GAME-TYPE LEADERBOARDS**

**CRITICAL:** Leaderboards are **per game type** (CLAIM, Poker, WordSearch, etc.), not global.

**Why Per Game Type:**
- Players compete within their game of choice
- Different games have different skill requirements
- Fairer competition (CLAIM players vs CLAIM players, not vs Poker players)
- Still simplified: One leaderboard per game type per season (not 6 tiers)

**Architecture:**
- **One leaderboard per game type per season** (top 100)
- **Tiers computed off-chain** from lifetime_gp_earned (not stored on-chain)
- **Full rankings** via off-chain indexer (PostgreSQL + Redis)
- **On-chain:** Only top 100 per game type per season
- **Off-chain:** Full rankings, tier calculations, nearby players

- **Weekly seasons:** 7 days auto-reset
- **Game types:** Each game (CLAIM, Poker, etc.) has its own leaderboard

**Tier Definitions:**

- **Bronze:** 0-999 GP earned
- **Silver:** 1000-4999 GP
- **Gold:** 5000-19999 GP
- **Platinum:** 20000-49999 GP
- **Diamond:** 50000-99999 GP
- **Master:** 100000+ GP

**Leaderboard Account Structure:**

```rust
// [FRAMEWORK] Leaderboard per game type per season
#[account]
pub struct GameLeaderboard {
    pub game_type: u8,                     // 1 byte (0=CLAIM, 1=Poker, 2=WordSearch, etc.)
    pub season_id: u64,                    // 8 bytes
    pub entry_count: u8,                   // 1 byte (0-100)
    pub entries: [LeaderboardEntry; 100],  // 100 * 56 = 5600 bytes
    pub last_updated: i64,                 // 8 bytes
}
// Total: 1 + 8 + 1 + 5600 + 8 = 5618 bytes (within 10KB limit)

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LeaderboardEntry {
    pub user_id: String,      // User ID from database (max 32 bytes)
    pub score: u64,           // 8 bytes - calculated score
    pub wins: u32,            // 4 bytes - wins this season
    pub games_played: u32,     // 4 bytes - games this season
    pub timestamp: i64,       // 8 bytes - last update timestamp
}
// Total per entry: 32 + 8 + 4 + 4 + 8 = 56 bytes
// Total account: 8 + 1 + 1 + 5600 = 5610 bytes (within 10KB limit)
```

**PDA Seeds:** `["leaderboard", game_type: u8, season_id: u64]` (one leaderboard per game type per season)

**User Account Additions:**

```rust
pub struct UserAccount {
    // ... existing fields ...
    pub current_tier: u8,           // Current tier (0-5)
    pub current_season_id: u64,     // Current season ID
    pub season_score: u64,          // Score this season
    pub season_wins: u32,           // Wins this season
    pub season_games: u32,          // Games played this season
    pub leaderboard_rank: u16,      // 0 = not ranked, 1-100 = rank
    pub lifetime_gp_earned: u64,    // Total GP earned (lifetime)
    pub active_multiplier: u8,      // Reward multiplier (1-5x)
}
```

**Score Calculation:**

- **Primary metric:** Total wins this season
- **Tiebreaker:** Win rate percentage
- **Formula:** `score = (wins * 1_000_000) + (wins * 10_000 / games_played.max(1))`
- Ensures wins are primary, win rate breaks ties

**Season Management:**

- **Season ID:** `current_timestamp / 604800` (7 days in seconds)
- **Auto-create:** New season created on first game after expiry
- **Active season:** Stored in global ConfigAccount
- **Close old seasons:** Reclaim rent from seasons older than 30 days

**Update Flow on Game End:**

```rust
pub fn submit_score(
    ctx: Context<SubmitScore>,
    user_id: String,
    game_result: GameResult,  // Win/Loss
) -> Result<()> {
    let user_account = &mut ctx.accounts.user_account;
    let clock = Clock::get()?;
    
    // 1. Calculate current season ID
    let current_season_id = (clock.unix_timestamp / 604800) as u64;
    
    // 2. Update user season stats
    user_account.season_games = user_account.season_games.checked_add(1).ok_or(GameError::Overflow)?;
    if game_result == GameResult::Win {
        user_account.season_wins = user_account.season_wins.checked_add(1).ok_or(GameError::Overflow)?;
    }
    
    // 3. Calculate tier from lifetime GP
    let new_tier = calculate_tier(user_account.lifetime_gp_earned);
    if new_tier != user_account.current_tier {
        // Tier promotion
        emit!(TierPromoted {
            user_id: user_id.clone(),
            old_tier: user_account.current_tier,
            new_tier,
        });
        user_account.current_tier = new_tier;
    }
    
    // 4. Calculate score
    let score = calculate_score(user_account.season_wins, user_account.season_games);
    user_account.season_score = score;
    
    // 5. Check minimum requirements
    if user_account.season_games < 10 {
        // Not enough games to rank
        return Ok(());
    }
    
    // 6. Load leaderboard account for [game_type, current_season_id] (per game type)
    let leaderboard = &mut ctx.accounts.game_leaderboard;
    
    // 7. Check if score qualifies (beats rank 100 OR entry_count < 100)
    let qualifies = leaderboard.entry_count < 100 || 
                    score > leaderboard.entries[leaderboard.entry_count as usize - 1].score;
    
    if qualifies {
        // 8. Remove user's old entry if exists
        let mut old_index = None;
        for (i, entry) in leaderboard.entries.iter().enumerate() {
            if entry.user_id == user_id {
                old_index = Some(i);
                break;
            }
        }
        
        if let Some(idx) = old_index {
            // Remove old entry, shift down
            for i in idx..(leaderboard.entry_count as usize - 1) {
                leaderboard.entries[i] = leaderboard.entries[i + 1].clone();
            }
            leaderboard.entry_count -= 1;
        }
        
        // 9. Binary search insertion point
        let insert_pos = leaderboard.entries[..leaderboard.entry_count as usize]
            .binary_search_by(|e| e.score.cmp(&score).reverse())
            .unwrap_or_else(|pos| pos);
        
        // 10. Shift entries down
        for i in (insert_pos..leaderboard.entry_count as usize).rev() {
            if i < 99 {
                leaderboard.entries[i + 1] = leaderboard.entries[i].clone();
            }
        }
        
        // 11. Insert new entry
        leaderboard.entries[insert_pos] = LeaderboardEntry {
            user_id: user_id.clone(),
            score,
            wins: user_account.season_wins,
            games_played: user_account.season_games,
            timestamp: clock.unix_timestamp,
        };
        
        if leaderboard.entry_count < 100 {
            leaderboard.entry_count += 1;
        }
        
        // 12. Update user rank
        let rank = (insert_pos + 1) as u16;
        let old_rank = user_account.leaderboard_rank;
        user_account.leaderboard_rank = rank;
        
        // 13. Update reward multiplier
        user_account.active_multiplier = calculate_multiplier(rank);
        
        // 14. Emit events
        emit!(ScoreSubmitted {
            user_id: user_id.clone(),
            season_id: current_season_id,
            tier: new_tier,  // Tier computed off-chain, included for reference
            score,
            rank,
            timestamp: clock.unix_timestamp,
        });
        
        if old_rank != rank {
            emit!(RankChanged {
                user_id: user_id.clone(),
                old_rank,
                new_rank: rank,
                timestamp: clock.unix_timestamp,
            });
        }
    }
    
    Ok(())
}

fn calculate_tier(lifetime_gp: u64) -> u8 {
    match lifetime_gp {
        0..=999 => 0,      // Bronze
        1000..=4999 => 1,   // Silver
        5000..=19999 => 2,  // Gold
        20000..=49999 => 3, // Platinum
        50000..=99999 => 4, // Diamond
        _ => 5,            // Master
    }
}

fn calculate_score(wins: u32, games: u32) -> u64 {
    let win_rate = if games > 0 {
        (wins as u64 * 10_000) / games as u64
    } else {
        0
    };
    (wins as u64 * 1_000_000) + win_rate
}

fn calculate_multiplier(rank: u16) -> u8 {
    match rank {
        1 => 5,      // 5x (5000 GP)
        2..=3 => 3,  // 3x (3000 GP)
        4..=10 => 2, // 2x (2000 GP)
        11..=50 => 1, // 1.5x (1500 GP) - stored as 15 (divide by 10)
        51..=100 => 1, // 1.2x (1200 GP) - stored as 12 (divide by 10)
        _ => 1,     // 1x (1000 GP)
    }
}
```

**Reward Multipliers (Applied to Daily Login):**

- **Rank 1:** 5x (5000 GP)
- **Rank 2-3:** 3x (3000 GP)
- **Rank 4-10:** 2x (2000 GP)
- **Rank 11-50:** 1.5x (1500 GP)
- **Rank 51-100:** 1.2x (1200 GP)
- **Unranked:** 1x (1000 GP)

**Minimum Requirements to Rank:**

- At least 10 games played this season
- Account age > 24 hours (tracked off-chain)
- No fraud flags (tracked off-chain)

**Anti-Cheat:**

- Max 1 score submission per minute per user
- Flag accounts with >95% win rate AND >50 games (off-chain detection)
- Admin can mark entries as fraudulent (removes from board)
- Require signature verification on all submissions

**Storage Costs:**

- **One leaderboard per game type per season:** 5618 bytes
- **Rent:** ~0.00024 SOL per account
- **Example:** 5 game types × 3 seasons (current + last 2) = 15 accounts = 0.0036 SOL
- **Close accounts older than 2 seasons:** Reclaim rent
- **Per game type:** Each game (CLAIM, Poker, etc.) maintains its own leaderboard

**Optimization:**

- Only write to leaderboard if score improves
- Cache user's rank in user account (no query needed)
- Use compute budget: 200k units for leaderboard updates
- Batch season rollover with first game transaction
- Lazy initialize leaderboard accounts (create on first entry)

**Indexer Tasks (Off-Chain):**

- Index all game end events
- Maintain PostgreSQL tables: `users`, `leaderboard_entries`, `seasons`, `game_types`
- **Compute tiers off-chain** from `lifetime_gp_earned` (not stored on-chain)
- **Compute full rankings** (beyond top 100) off-chain per game type
- Provide API endpoints:
  - `GET /leaderboard/:game_type?season_id&limit` - Top N for specific game type
  - `GET /leaderboard/:game_type/tier?tier&season_id` - Filter by tier (computed off-chain)
  - `GET /leaderboard/:game_type/user/:user_id` - User's rank and tier for game type
  - `GET /leaderboard/:game_type/nearby/:user_id?range=5` - Players above/below user
- Cache top 1000 per game type in Redis
- Update every 60 seconds

**UI Display:**

- Show user's current rank and tier
- Show top 10 in user's tier
- Show top 100 global (from indexer)
- Show 5 players above and below user
- Show season time remaining
- Show reward multiplier for each rank

**Instructions to Implement:**

```rust
// Submit score after game ends
pub fn submit_score(
    ctx: Context<SubmitScore>,
    user_id: String,
    game_result: GameResult,
) -> Result<()> {
    // Full implementation shown above in "Update Flow on Game End"
}

// Claim daily reward with multiplier (already implemented, see daily login section)
pub fn claim_daily_reward(ctx: Context<ClaimDailyReward>) -> Result<()> {
    // Uses active_multiplier from user account
    // Implementation in daily login section (20.1.2)
}

// Get user rank (read-only)
pub fn get_user_rank(ctx: Context<GetUserRank>) -> Result<u16> {
    Ok(ctx.accounts.user_account.leaderboard_rank)
}

// Admin: Start new season
pub fn start_season(ctx: Context<StartSeason>) -> Result<()> {
    require!(
        ctx.accounts.authority.key() == ctx.accounts.config_account.authority,
        GameError::Unauthorized
    );
    // Update active season in config
    let clock = Clock::get()?;
    let new_season_id = (clock.unix_timestamp / 604800) as u64;
    ctx.accounts.config_account.active_season_id = new_season_id;
    emit!(SeasonStarted {
        season_id: new_season_id,
        timestamp: clock.unix_timestamp,
    });
    Ok(())
}

// Admin: Close old season (reclaim rent)
pub fn close_old_season(
    ctx: Context<CloseOldSeason>,
    season_id: u64,
    tier: u8,
) -> Result<()> {
    require!(
        ctx.accounts.authority.key() == ctx.accounts.config_account.authority,
        GameError::Unauthorized
    );
    // Only allow closing seasons older than 30 days
    let clock = Clock::get()?;
    let current_season = (clock.unix_timestamp / 604800) as u64;
    require!(
        current_season > season_id + 4, // At least 4 weeks old (28+ days)
        GameError::InvalidSeason
    );
    // Close leaderboard account, reclaim rent
    // Implementation: transfer remaining lamports to authority
    Ok(())
}
```

#### 20.1.7 AI Credit Purchase

**Implementation:**

```rust
pub fn purchase_ai_credits(
    ctx: Context<PurchaseAICredits>,
    usd_amount: f64,
) -> Result<()> {
    let config = &ctx.accounts.config_account;
    let user_account = &mut ctx.accounts.user_account;
    
    // Calculate AC amount based on USD payment (via Stripe)
    // AC price: e.g., $10 = 1000 AC (configurable)
    let ac_amount = (usd_amount as f64 / config.ac_price_usd) as u64;
    
    // Payment processed via Stripe (off-chain)
    // In production: Call Stripe API to process credit card payment
    // After successful payment, add AC to user account in database
    
    // Add AC to user account (off-chain database)
    user_account.ac_balance = user_account.ac_balance
        .checked_add(ac_amount)
        .ok_or(GameError::Overflow)?;
    
    // Emit event
    emit!(AIPurchased {
        user_id: user_account.user_id.clone(),
        usd_paid: usd_amount,
        ac_received: ac_amount,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}
```

**Features:**

- **Payment method:** Credit card via Stripe (NO Solana wallet needed)
- **Dynamic pricing:** AC price in USD configurable (e.g., $10 = 1000 AC)
- **Stripe webhook:** Processes payment, then adds AC to user account
- **Event tracking:** All purchases logged for analytics
- **Rate limiting:** Max purchase per transaction, cooldown (configurable)

#### 20.1.8 AI Credit Consumption & Escrow

**CRITICAL: Pre-Authorization & Escrow System** [FRAMEWORK]

**Problem:** Need to charge AC before API call, but actual cost unknown until after call.

**Solution:** Escrow system - reserve estimated cost, charge actual, refund difference.

**Implementation:**

```rust
// [FRAMEWORK] AI call escrow account
#[account]
pub struct AICallEscrow {
    pub user_id: String,
    pub match_id: String,
    pub estimated_cost: u64,       // AC reserved (estimated * 1.25 markup)
    pub actual_cost: Option<u64>,   // AC actually used (after API call)
    pub refund_amount: Option<u64>, // Difference to refund
    pub status: EscrowStatus,       // Pending, Completed, Refunded, Failed
    pub created_at: i64,
    pub completed_at: Option<i64>,
}

pub enum EscrowStatus {
    Pending,      // AC reserved, API call in progress
    Completed,   // API call done, actual cost charged
    Refunded,     // Refund processed
    Failed,       // API call failed, full refund
}

// [FRAMEWORK] Pre-authorize AI call
pub fn pre_authorize_ai_call(
    ctx: Context<PreAuthorizeAICall>,
    user_id: String,
    match_id: String,
    model_id: u8,
    estimated_tokens: u32,
) -> Result<u64> {
    let config = &ctx.accounts.config_account;
    let user_account = &mut ctx.accounts.user_account;
    
    // Calculate estimated cost with 25% markup
    let cost_per_1k = config.ai_model_costs[model_id as usize];
    let estimated_cost = (estimated_tokens as u64 * cost_per_1k as u64) / 1000;
    let cost_with_markup = estimated_cost
        .checked_mul(125)
        .ok_or(GameError::Overflow)?
        .checked_div(100)
        .ok_or(GameError::Overflow)?;
    
    // Check AC balance
    require!(
        user_account.ac_balance >= cost_with_markup,
        GameError::InsufficientAC
    );
    
    // Reserve AC (move to escrow)
    user_account.ac_balance = user_account.ac_balance
        .checked_sub(cost_with_markup)
        .ok_or(GameError::Overflow)?;
    
    // Create escrow account
    let escrow = &mut ctx.accounts.escrow_account;
    escrow.user_id = user_id;
    escrow.match_id = match_id;
    escrow.estimated_cost = cost_with_markup;
    escrow.actual_cost = None;
    escrow.refund_amount = None;
    escrow.status = EscrowStatus::Pending;
    escrow.created_at = Clock::get()?.unix_timestamp;
    
    Ok(cost_with_markup) // Return escrow ID or amount
}

// [FRAMEWORK] Complete AI call (charge actual, refund difference)
pub fn complete_ai_call(
    ctx: Context<CompleteAICall>,
    escrow_id: String,
    actual_tokens: u32,
) -> Result<()> {
    let config = &ctx.accounts.config_account;
    let escrow = &mut ctx.accounts.escrow_account;
    let user_account = &mut ctx.accounts.user_account;
    
    require!(
        escrow.status == EscrowStatus::Pending,
        GameError::InvalidEscrowStatus
    );
    
    // Calculate actual cost
    let model_id = escrow.model_id; // Stored in escrow
    let cost_per_1k = config.ai_model_costs[model_id as usize];
    let actual_cost = (actual_tokens as u64 * cost_per_1k as u64) / 1000;
    
    escrow.actual_cost = Some(actual_cost);
    
    // Calculate refund (if overcharged)
    let refund = if actual_cost < escrow.estimated_cost {
        escrow.estimated_cost - actual_cost
    } else {
        0 // Undercharged, but we keep the markup
    };
    
    escrow.refund_amount = Some(refund);
    
    // Refund difference to user
    if refund > 0 {
        user_account.ac_balance = user_account.ac_balance
            .checked_add(refund)
            .ok_or(GameError::Overflow)?;
    }
    
    escrow.status = EscrowStatus::Completed;
    escrow.completed_at = Some(Clock::get()?.unix_timestamp);
    
    Ok(())
}
```

**Flow:**

1. **Pre-Authorize:** User requests AI move → Reserve estimated AC (with 25% markup)
2. **API Call:** Make API call with reserved AC
3. **Complete:** Charge actual cost, refund difference if overcharged
4. **Failure:** If API call fails, full refund

**Insufficient AC Handling:**

- **Mid-Game:** If user runs out of AC mid-game:
  - Option A: Pause game, prompt user to purchase AC
  - Option B: Allow user to bring own API key
  - Option C: Switch to free tier AI (if available)

**Implementation:**

```rust
pub fn consume_ai_credits(
    ctx: Context<ConsumeAICredits>,
    model_id: u8,           // 0=Claude, 1=GPT4, 2=Gemini, etc.
    estimated_tokens: u32,  // Estimated tokens for API call
) -> Result<u64> {
    let config = &ctx.accounts.config_account;
    let user_account = &mut ctx.accounts.user_account;
    
    // Get model cost per 1k tokens
    let cost_per_1k = config.ai_model_costs[model_id as usize];
    
    // Calculate estimated cost (with 25% markup)
    let estimated_cost = (estimated_tokens as u64)
        .checked_mul(cost_per_1k as u64)
        .ok_or(GameError::Overflow)?
        .checked_div(1000)
        .ok_or(GameError::Overflow)?;
    let cost_with_markup = estimated_cost
        .checked_mul(125)
        .ok_or(GameError::Overflow)?
        .checked_div(100)
        .ok_or(GameError::Overflow)?;
    
    // Check AC balance (from database)
    require!(
        user_account.ac_balance >= cost_with_markup,
        GameError::InsufficientAC
    );
    
    // Deduct AC from user account (off-chain database)
    user_account.ac_balance = user_account.ac_balance
        .checked_sub(cost_with_markup)
        .ok_or(GameError::Overflow)?;
    
    // Update stats
    user_account.total_ac_spent = user_account.total_ac_spent
        .checked_add(cost_with_markup)
        .ok_or(GameError::Overflow)?;
    user_account.api_calls_made = user_account.api_calls_made
        .checked_add(1)
        .ok_or(GameError::Overflow)?;
    
    // Emit event
    emit!(AIConsumed {
        user_id: user_account.user_id.clone(),
        model_id,
        tokens: estimated_tokens,
        cost: cost_with_markup,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(cost_with_markup)  // Return actual cost for refund calculation
}
```

**Features:**

- **25% markup:** Applied to cover API costs + profit
- **Estimated cost:** Charged before API call
- **Refund mechanism:** Optional - refund difference if overcharged (tracked off-chain)
- **Model-specific pricing:** Different costs per AI model
- **Stats tracking:** Tracks total AC spent, API calls made

#### 20.1.9 Cost Tracking & Pricing Oracle

**Implementation:**

```rust
#[account]
pub struct PriceFeedAccount {
    pub model_costs: [u64; 10],      // Cost per 1k tokens in lamports
    pub last_updated: i64,           // Last update timestamp
    pub update_authority: Pubkey,    // Authority that can update prices
}

pub fn update_price_feed(
    ctx: Context<UpdatePriceFeed>,
    model_id: u8,
    cost_per_1k_tokens: u64,
) -> Result<()> {
    let price_feed = &mut ctx.accounts.price_feed_account;
    
    require!(
        ctx.accounts.update_authority.key() == price_feed.update_authority,
        GameError::Unauthorized
    );
    
    // Check staleness (warn if > 24 hours old)
    let clock = Clock::get()?;
    let staleness = clock.unix_timestamp - price_feed.last_updated;
    if staleness > 86400 {
        msg!("WARNING: Price feed is stale (>24 hours)");
    }
    
    price_feed.model_costs[model_id as usize] = cost_per_1k_tokens;
    price_feed.last_updated = clock.unix_timestamp;
    
    Ok(())
}

#[account]
pub struct CostTrackingAccount {
    pub total_profit_lamports: u64,      // Total profit collected
    pub total_api_calls: u64,            // Total API calls made
    pub per_model_stats: [ModelStats; 10],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ModelStats {
    pub total_tokens_consumed: u64,
    pub total_calls: u32,
    pub total_cost_lamports: u64,        // Actual API cost
    pub total_revenue_lamports: u64,     // AC burned * AC price
}
```

**Profit Calculation:**

```rust
// Profit = (AC burned * AC price) - actual API cost
let profit = model_stats.total_revenue_lamports
    .checked_sub(model_stats.total_cost_lamports)
    .unwrap_or(0);
```

**Features:**

- **Hourly updates:** Price feed updated by backend hourly or on significant changes
- **Staleness check:** Warns if price feed > 24 hours old
- **Fallback:** Hardcoded prices in ConfigAccount if feed fails
- **Profit tracking:** Per-model and aggregate profit tracking
- **Admin withdrawal:** Admin-only instruction to withdraw profits to treasury

#### 20.1.10 Anti-Abuse Measures

**Rate Limiting:**

- **GP claims:** Max 1 per 23 hours (prevents clock manipulation)
- **AC purchases:** Max per transaction, cooldown between purchases
- **Ad rewards:** 300 second cooldown, daily cap
- **API calls:** Rate limit per user (tracked off-chain)

**Account Freezing:**

```rust
pub fn freeze_user(ctx: Context<FreezeUser>, user_id: String) -> Result<()> {
    // Mark user as frozen in UserAccount (off-chain database)
    // In production: Update database, set is_frozen = true
    ctx.accounts.user_account.is_frozen = true;
    
    Ok(())
}
```

**Abuse Detection:**

- **Abnormal API usage:** Detected off-chain, flagged for review
- **GP balance cap:** `max_gp_balance` prevents hoarding
- **Withdrawal lockup:** AC withdrawal lockup period (configurable)
- **Admin freeze:** Admin can freeze user accounts for violations

#### 20.1.11 Account Structure & Size

**UserAccount:** ~256 bytes max

```rust
pub struct UserAccount {
    pub user_id: String,                  // Firebase UID (user.uid from Firebase Auth, max 32 bytes)
    // NOTE: gp_balance and ac_balance are stored in DATABASE, not on-chain
    pub last_claim: i64,                 // 8 bytes
    pub last_ad_watch: i64,               // 8 bytes
    pub subscription_expiry: i64,        // 8 bytes
    pub subscription_tier: u8,           // 1 byte
    pub lifetime_gp_earned: u64,        // 8 bytes (total GP earned lifetime)
    pub games_played: u32,               // 4 bytes (lifetime)
    pub games_won: u32,                  // 4 bytes (lifetime)
    pub win_streak: u32,                 // 4 bytes
    pub total_ac_spent: u64,             // 8 bytes
    pub api_calls_made: u32,             // 4 bytes
    pub is_frozen: bool,                 // 1 byte
    // Leaderboard fields
    pub current_tier: u8,                // 1 byte (0-5: Bronze to Master)
    pub current_season_id: u64,          // 8 bytes
    pub season_score: u64,               // 8 bytes
    pub season_wins: u32,                // 4 bytes
    pub season_games: u32,               // 4 bytes
    pub leaderboard_rank: u16,           // 2 bytes (0 = not ranked, 1-100 = rank)
    pub active_multiplier: u8,           // 1 byte (1-5x reward multiplier)
    // Padding for future fields: ~50 bytes
}
// Total: ~256 bytes (within Solana account limits)
```

**ConfigAccount:** ~512 bytes max

```rust
pub struct ConfigAccount {
    pub authority: Pubkey,                // 32 bytes
    pub ac_price_usd: f64,                // 8 bytes
    pub gp_daily_amount: u64,            // 8 bytes
    pub gp_cost_per_game: u32,            // 4 bytes
    pub gp_per_ad: u32,                   // 4 bytes
    pub max_daily_ads: u8,                // 1 byte
    pub ad_cooldown_seconds: i64,         // 8 bytes
    pub ac_price_lamports: u64,           // 8 bytes
    pub pro_gp_multiplier: u8,           // 1 byte
    pub ai_model_costs: [u32; 10],       // 40 bytes
    pub max_gp_balance: u64,              // 8 bytes
    // Padding for future fields: ~300 bytes
}
// Total: ~512 bytes
```

**GameLeaderboard:** ~5.6KB max (100 entries)

```rust
// [FRAMEWORK] Leaderboard per game type per season
pub struct GameLeaderboard {
    pub game_type: u8,                     // 1 byte (0=CLAIM, 1=Poker, etc.)
    pub season_id: u64,                    // 8 bytes
    pub entry_count: u8,                  // 1 byte
    pub entries: [LeaderboardEntry; 100], // 100 * 56 = 5600 bytes
    pub last_updated: i64,                 // 8 bytes
    // Total: ~5618 bytes (well within 10KB limit)
}
// Note: Tiers are computed off-chain, not stored on-chain
// One leaderboard per game type (CLAIM, Poker, WordSearch, etc.)
```

#### 20.1.12 Transaction Optimization

**Batching:**

- **Login + Game Start:** Batch in single transaction
- **Multiple ATAs:** Use versioned transactions for multiple token operations
- **Compute Budget:** Set to 400k units max per instruction
- **Priority Fees:** Dynamic based on network congestion
- **Lookup Tables:** Use for frequent accounts (mints, treasury, etc.)

**Example:**

```rust
// Batch daily login + game start
pub fn claim_login_and_start_game(
    ctx: Context<ClaimLoginAndStartGame>,
    match_id: String,
) -> Result<()> {
    // 1. Claim daily login (mint GP)
    claim_daily_login_internal(&ctx)?;
    
    // 2. Start game (burn GP)
    start_game_with_gp_internal(&ctx, match_id)?;
    
    Ok(())
}
```

#### 20.1.13 Events to Emit

**All token operations emit events for analytics:**

```rust
// Events
pub struct DailyLoginClaimed {
    pub user_id: String,
    pub amount: u64,
    pub timestamp: i64,
}

pub struct GameStarted {
    pub user_id: String,
    pub gp_spent: u32,
    pub match_id: String,
    pub timestamp: i64,
}

pub struct AdWatched {
    pub user_id: String,
    pub gp_earned: u32,
    pub timestamp: i64,
}

pub struct SubscriptionPurchased {
    pub user_id: String,
    pub tier: u8,
    pub expiry: i64,
    pub usd_paid: f64,
    pub timestamp: i64,
}

pub struct AIPurchased {
    pub user_id: String,
    pub usd_paid: f64,
    pub ac_received: u64,
    pub timestamp: i64,
}

pub struct AIConsumed {
    pub user_id: String,
    pub model_id: u8,
    pub tokens: u32,
    pub cost: u64,
    pub timestamp: i64,
}

pub struct ScoreSubmitted {
    pub user_id: String,
    pub season_id: u64,
    pub tier: u8,
    pub score: u64,
    pub rank: u16,
    pub timestamp: i64,
}

pub struct RankChanged {
    pub user_id: String,
    pub old_rank: u16,
    pub new_rank: u16,
    pub timestamp: i64,
}

pub struct TierPromoted {
    pub user_id: String,
    pub old_tier: u8,
    pub new_tier: u8,
    pub timestamp: i64,
}

pub struct SeasonStarted {
    pub season_id: u64,
    pub timestamp: i64,
}

pub struct SeasonEnded {
    pub season_id: u64,
    pub timestamp: i64,
}
```

#### 20.1.14 Admin Instructions

**Configuration Management:**

```rust
pub fn update_config(
    ctx: Context<UpdateConfig>,
    gp_daily_amount: Option<u64>,
    gp_cost_per_game: Option<u32>,
    ac_price_usd: Option<f64>,
    // ... other config fields
) -> Result<()> {
    // Only authority can update
    require!(
        ctx.accounts.authority.key() == ctx.accounts.config_account.authority,
        GameError::Unauthorized
    );
    
    let config = &mut ctx.accounts.config_account;
    if let Some(amount) = gp_daily_amount {
        config.gp_daily_amount = amount;
    }
    // ... update other fields
    
    Ok(())
}
```

**Other Admin Functions:**

- `update_price_feed()` - Update AI model costs
- `freeze_user()` - Freeze user account (anti-abuse)
- `withdraw_treasury()` - Withdraw profits to treasury
- `emergency_pause()` - Circuit breaker (pause all operations)
- `migrate_program()` - Upgrade path for program updates

---

## 23. Dispute Resolution Protocol

**CRITICAL: Dispute Funding Model**

**Problem:** All matches are FREE, but validators need compensation for dispute resolution.

**Solution:** GP-based dispute deposit system + platform treasury funding.

**Dispute Deposit System (GP-Based):**

**IMPORTANT:** Disputes use **Game Points (GP)** instead of SOL for deposits. This aligns with the free-to-play model where players earn GP through gameplay.

```rust
// Dispute account structure (on-chain)
#[account]
pub struct Dispute {
    pub match_id: [u8; 36],
    pub flagger: Pubkey,
    pub flagger_user_id: [u8; 64],  // Firebase UID (for GP tracking)
    pub reason: u8,
    pub evidence_hash: [u8; 32],
    pub gp_deposit: u32,             // GP deposit amount (e.g., 100 GP)
    pub gp_refunded: bool,           // true = refunded (valid dispute), false = forfeited (invalid)
    pub created_at: i64,
    pub resolved_at: i64,
    pub resolution: u8,
    pub validator_votes: [ValidatorVote; 10],
    pub vote_count: u8,
}

// ConfigAccount includes dispute deposit requirement
pub struct ConfigAccount {
    // ...
    pub dispute_deposit_gp: u32,  // GP deposit required (e.g., 100 GP)
    // ...
}

// Flag dispute with GP deposit
pub fn flag_dispute(
    ctx: Context<FlagDispute>,
    match_id: String,
    user_id: String,      // Firebase UID
    reason: u8,
    evidence_hash: [u8; 32],
    gp_deposit: u32,      // GP deposit (already deducted off-chain)
) -> Result<()> {
    // GP is deducted off-chain in database before calling this instruction
    // This instruction records the GP deposit on-chain for tracking
    require!(
        gp_deposit >= config.dispute_deposit_gp,
        GameError::InsufficientGPForDispute
    );
    // ...
}
```

**GP Deposit Flow:**

1. **Player files dispute:**
   - Off-chain: Check GP balance in database
   - Off-chain: Deduct GP deposit (e.g., 100 GP) from user's balance
   - On-chain: Call `flag_dispute` with `gp_deposit` parameter
   - On-chain: Record GP deposit in Dispute account

2. **Dispute resolution:**
   - Validators review and vote
   - If valid (resolved in favor of flagger):
     - On-chain: Set `gp_refunded = true`
     - Off-chain: Refund GP to user's balance
   - If invalid:
     - On-chain: `gp_refunded = false` (GP forfeited)
     - Off-chain: GP remains deducted (can go to treasury or validators)

**Validator Compensation:**

```rust
// Validator reward structure (funded by platform treasury)
pub struct ValidatorReward {
    pub base_reward: u64,         // Fixed reward per dispute (0.05 SOL)
    pub bonus_for_speed: u64,     // Bonus if resolved < 24h (0.02 SOL)
    pub funded_by: FundingSource,
}

pub enum FundingSource {
    ForfeitedGP,      // From forfeited GP deposits (converted to SOL via treasury)
    PlatformTreasury, // From platform revenue (AC purchases, Pro subs)
}

// Validator compensation sources:
// 1. Invalid disputes: Forfeited GP → converted to SOL → validators
// 2. Valid disputes: Platform treasury pays validators (0.05 SOL base + 0.02 SOL speed bonus)
// 3. Base reward: 0.05 SOL per dispute (from treasury)
// 4. Speed bonus: 0.02 SOL if resolved < 24h
```

**Funding Breakdown:**

- **Invalid Disputes:** Forfeited GP (e.g., 100 GP ≈ $0.10) → Converted to SOL → Validators
- **Valid Disputes:** Platform treasury pays validators (0.05 SOL base + 0.02 SOL speed bonus)
- **Spam Prevention:** GP deposit (e.g., 100 GP) prevents frivolous disputes
- **Treasury Funding:** AC purchases + Pro subscriptions fund validator rewards

**Example:**
- 100 disputes/month
- 50% invalid → 5,000 GP forfeited (≈ $5) → Converted to SOL → Validators
- 50% valid → 3.5 SOL from treasury (50 × 0.07 SOL)
- Total validator compensation: ~3.5 SOL/month = ~$700/month
- Funded by: AC revenue + Pro subscriptions

**Benefits of GP-Based Deposits:**
- ✅ No crypto barrier (players use in-game currency)
- ✅ Players already have GP (earned through gameplay)
- ✅ Prevents spam (GP has effort/value)
- ✅ Aligns with free-to-play model
- ✅ Lower barrier than SOL deposits (~$0.10 vs ~$2)

---

## 23.1 Dispute Lifecycle

**Phase 1: Flagging**

* Any player can flag a match for dispute within 24 hours of completion
* Dispute reasons:
  * Invalid move detected
  * Player timeout/abandonment
  * Suspected cheating
  * Score calculation error
* Flag creates on-chain dispute account with:
  * Match ID
  * Flagging player
  * Reason code
  * Evidence hash (link to off-chain evidence)

**Phase 2: Evidence Collection**

* Disputed match record locked (cannot be archived)
* Players submit evidence:
  * Screenshots, logs, transaction signatures
  * Stored off-chain (R2) with hash anchored
* Validators review evidence within 48 hours

**Phase 3: Resolution**

* **Automated Resolution (Simple Cases):**
  * Score calculation errors → auto-correct
  * Timeout violations → auto-forfeit
* **Manual Resolution (Complex Cases):**
  * Validator committee reviews evidence
  * Majority vote determines outcome
  * Decision recorded on-chain

**Phase 4: Enforcement**

* Deposits released based on resolution
* Penalties applied to violators
* Match record updated with resolution status

### 21.2 On-Chain Dispute Account

**Rust Implementation:**

```rust
#[account]
pub struct Dispute {
    pub match_id: String,
    pub flagger: Pubkey,
    pub reason: DisputeReason,
    pub evidence_hash: [u8; 32],
    pub created_at: i64,
    pub resolved_at: Option<i64>,
    pub resolution: Option<DisputeResolution>,
    pub validator_votes: Vec<ValidatorVote>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum DisputeReason {
    InvalidMove,
    PlayerTimeout,
    SuspectedCheating,
    ScoreError,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum DisputeResolution {
    ResolvedInFavorOfFlagger,
    ResolvedInFavorOfDefendant,
    MatchVoided,
    PartialRefund,
}

pub fn flag_dispute(
    ctx: Context<FlagDispute>,
    match_id: String,
    reason: DisputeReason,
    evidence_hash: [u8; 32],
) -> Result<()> {
    // Create dispute account
    // Lock match escrow
    // Emit event
}

pub fn resolve_dispute(
    ctx: Context<ResolveDispute>,
    dispute_id: String,
    resolution: DisputeResolution,
) -> Result<()> {
    // Record resolution
    // Release escrow based on resolution
    // Apply penalties if needed
}
```

### 21.3 Validator Network

**Validator Requirements:**

* Stake SOL/USDC as validator bond (10-100 SOL)
* Reputation score based on accurate resolutions
* Slashing risk for malicious or negligent resolutions

**Validator Selection:**

* Random selection from validator pool
* Weighted by reputation score
* Minimum 3 validators per dispute

**Validator Rewards:**

* 5-10% of entry fees for resolved disputes
* Bonus for fast resolution (< 24 hours)
* Penalty for delayed resolution (> 48 hours)

---

## 24. Security & Threat Model

### 22.1 Attack Surfaces & Mitigations

#### Replay Attacks

**Threat:** Attacker replays old valid moves in new matches

**Mitigation:**
* Include match ID and move index in move signature
* On-chain validation checks move index is sequential
* Timestamp validation (moves must be within reasonable time window)

```rust
pub fn validate_move_not_replay(
    match_account: &Match,
    move_index: u32,
    timestamp: i64,
) -> Result<()> {
    require!(
        move_index == match_account.move_count,
        GameError::InvalidMoveIndex
    );
    require!(
        timestamp > match_account.created_at,
        GameError::InvalidTimestamp
    );
    Ok(())
}
```

#### Duplicate Moves

**Threat:** Player submits same move twice

**Mitigation:**
* Move accounts are unique PDAs (match_id + move_index)
* Cannot create duplicate move accounts
* On-chain state tracks move count

#### Sybil Attacks

**Threat:** Single entity creates multiple accounts to manipulate matchmaking

**Mitigation:**
* Reputation system tracks wallet addresses
* Rate limiting per user_id (Firebase UID)
* Rate limiting per IP address
* Account age requirements for leaderboard ranking (24 hours minimum)

#### Front-Running

**Threat:** Attacker observes pending transactions and submits competing moves

**Mitigation:**
* Move submission includes commitment (hash of move + secret)
* Reveal phase after all commitments submitted
* On-chain validation ensures move matches commitment

#### Model Tampering (AI Players)

**Threat:** AI changes model mid-match or uses different model than declared

**Mitigation:**
* Model hash recorded at match start
* Chain-of-thought includes model inference metadata
* Validators can verify model consistency
* Model attestation via cryptographic signatures

### 22.2 Rate Limiting & Spam Protection

**On-Chain Rate Limiting:**

* Transaction fees provide natural rate limiting
* Minimum time between moves (e.g., 1 second)
* Maximum moves per match (enforced by game rules)

**Off-Chain Rate Limiting:**

* Cloudflare Workers rate limiting:
  * 10 matches per hour per wallet
  * 100 moves per hour per wallet
  * IP-based rate limiting (100 requests/minute)
* Rate limit headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Implementation:**

```typescript
// Cloudflare Worker rate limiting
export async function rateLimit(request: Request, env: Env): Promise<Response | null> {
  const wallet = request.headers.get('X-Wallet-Address');
  const key = `rate_limit:${wallet}`;
  
  const count = await env.RATE_LIMIT_KV.get(key);
  if (count && parseInt(count) > 100) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  
  await env.RATE_LIMIT_KV.put(key, (parseInt(count || '0') + 1).toString(), {
    expirationTtl: 3600, // 1 hour
  });
  
  return null;
}
```

### 22.3 Signature Replay Protection

**Nonce-Based Protection:**

* Each move includes nonce (incremental counter)
* Nonce stored on-chain per player
* Replay detection: nonce must be greater than last nonce

**Timestamp-Based Protection:**

* Moves include timestamp
* On-chain validation: timestamp must be recent (< 5 minutes old)
* Prevents replay of very old moves

### 22.4 Account Rent Reclamation

**Rent Management:**

* Match accounts pay rent (exempt minimum balance)
* Move accounts pay rent (smaller, per-move)
* Escrow accounts hold sufficient balance for rent

**Rent Reclamation:**

* Completed matches: accounts can be closed, rent reclaimed
* Abandoned matches: after timeout, accounts closed
* Automated cleanup: cron job closes old accounts

**Implementation:**

```rust
pub fn close_match_account(ctx: Context<CloseMatch>, match_id: String) -> Result<()> {
    require!(
        ctx.accounts.match_account.phase == 2, // Ended
        GameError::MatchNotEnded
    );
    
    // Transfer rent to closer
    let rent = Rent::get()?;
    let lamports = ctx.accounts.match_account.to_account_info().lamports();
    let rent_exempt = rent.minimum_balance(Match::MAX_SIZE);
    let refund = lamports.checked_sub(rent_exempt).ok_or(GameError::InsufficientFunds)?;
    
    **ctx.accounts.match_account.to_account_info().try_borrow_mut_lamports()? -= refund;
    **ctx.accounts.closer.to_account_info().try_borrow_mut_lamports()? += refund;
    
    Ok(())
}
```

### 22.5 Key Management & Authentication

**Coordinator Authority Keys:**

* **Generation:** Ed25519 keypair generated securely
* **Storage:** 
  * Development: Cloudflare Workers Secrets (`wrangler secret put COORDINATOR_PRIVATE_KEY`)
  * Production: Cloudflare Workers Secrets + HSM (Hardware Security Module) for high-value operations
* **Rotation:** 
  * Quarterly rotation schedule
  * Old keys remain valid for 30 days (grace period)
  * New keys registered on-chain signer registry
* **Distribution:**
  * Keys never stored in code or version control
  * Access via environment variables only
  * Audit log of key usage

**Player Authentication (No Wallets Needed):**

* **Authentication Methods:**
  * Email/password (Firebase Auth or similar)
  * OAuth (Google, GitHub, etc.)
  * Anonymous guest accounts
* **UX Flow:**
  1. Player logs in via standard web auth
  2. User ID stored in session/database
  3. No wallet connection needed
  4. Coordinator submits all Solana transactions on player's behalf

**Server Signing:**

```typescript
// Cloudflare Worker key management
export async function signMatchRecord(
  record: MatchRecord,
  env: Env
): Promise<string> {
  const privateKey = await env.COORDINATOR_PRIVATE_KEY;
  const keypair = Keypair.fromSecretKey(
    Buffer.from(privateKey, 'base64')
  );
  
  const canonicalBytes = canonicalize(record);
  const signature = nacl.sign.detached(canonicalBytes, keypair.secretKey);
  
  return Buffer.from(signature).toString('base64');
}
```

---

## 25. Continuous Integration & Testing Plan

### 23.1 Local Test Harness

**Setup Script:**

```bash
#!/bin/bash
# scripts/setup-localnet.sh

# Start local validator
solana-test-validator \
  --reset \
  --quiet \
  --limit-ledger-size 50000000 \
  &

VALIDATOR_PID=$!

# Wait for validator to be ready
sleep 5

# Set cluster to localhost
solana config set --url localhost

# Airdrop SOL to test accounts
solana airdrop 10

# Build and deploy program
cd contracts/claim-game-program
anchor build
anchor deploy

# Run tests
anchor test

# Cleanup
kill $VALIDATOR_PID
```

**Docker Compose Setup:**

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  validator:
    image: projectserum/build:v1.11.6
    command: solana-test-validator --reset --quiet
    ports:
      - "8899:8899"
      - "8900:8900"
    volumes:
      - ./test-ledger:/ledger
  
  anchor-tests:
    build:
      context: .
      dockerfile: Dockerfile.test
    depends_on:
      - validator
    environment:
      - ANCHOR_PROVIDER_URL=http://validator:8899
    volumes:
      - ./contracts:/contracts
    command: anchor test
```

### 23.2 CI Pipeline (GitHub Actions)

**Workflow File:**

```yaml
# .github/workflows/solana-tests.yml
name: Solana Program Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      
      - name: Install Solana CLI
        run: |
          sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
          echo "$HOME/.local/share/solana/install/active_release/bin" >> $GITHUB_PATH
      
      - name: Install Anchor
        run: |
          cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
          avm install latest
          avm use latest
      
      - name: Start Local Validator
        run: |
          solana-test-validator --reset --quiet &
          sleep 5
          solana config set --url localhost
          solana airdrop 10
      
      - name: Build Program
        working-directory: Rust/SolanaContract
        run: anchor build
      
      - name: Deploy Program
        working-directory: Rust/SolanaContract
        run: anchor deploy
      
      - name: Run Tests
        working-directory: Rust/SolanaContract
        run: anchor test
      
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: Rust/SolanaContract/tests/**/*.json
```

### 23.3 Load Testing Plan

**Test Scenarios:**

1. **1000 Matches Creation:**
   * Create 1000 matches concurrently
   * Measure: transaction success rate, latency, cost
   * Target: >95% success rate, <2s latency

2. **Merkle Batching Cost Benchmark:**
   * Batch 1000 match hashes into Merkle tree
   * Anchor single Merkle root
   * Compare cost: individual anchors vs batched
   * Target: >90% cost reduction

3. **Concurrent Move Submission:**
   * 100 players submitting moves simultaneously
   * Measure: throughput, conflicts, retries
   * Target: handle 100 moves/sec

**Load Test Script:**

```typescript
// scripts/load-test.ts
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';

async function loadTest() {
  const connection = new Connection('http://localhost:8899');
  const provider = new AnchorProvider(connection, wallet, {});
  
  const program = new Program(IDL, programId, provider);
  
  // Create 1000 matches
  const matches = [];
  for (let i = 0; i < 1000; i++) {
    const matchId = `load-test-${i}`;
    const seed = Math.floor(Math.random() * 1000000);
    
    const tx = await program.methods
      .createMatch(matchId, new BN(seed))
      .rpc();
    
    matches.push({ matchId, tx });
  }
  
  // Measure Merkle batching
  const hashes = matches.map(m => computeHash(m.matchId));
  const merkleRoot = buildMerkleTree(hashes);
  
  const batchTx = await program.methods
    .anchorBatch(merkleRoot)
    .rpc();
  
  console.log(`Cost per match (batched): ${getCost(batchTx) / 1000} SOL`);
}
```

### 23.4 Automated Verification

**Verification Pipeline:**

```typescript
// scripts/verify-matches.ts
async function verifyMatches(matchIds: string[]) {
  for (const matchId of matchIds) {
    // 1. Fetch match record from R2
    const record = await fetchMatchRecord(matchId);
    
    // 2. Canonicalize and hash
    const canonical = canonicalize(record);
    const hash = sha256(canonical);
    
    // 3. Verify on-chain anchor
    const onChainHash = await getOnChainHash(matchId);
    assert(hash === onChainHash, 'Hash mismatch');
    
    // 4. Verify signatures
    for (const sig of record.signatures) {
      assert(verifySignature(sig, canonical), 'Invalid signature');
    }
    
    // 5. Replay match and verify outcome
    const replayedOutcome = replayMatch(record.events);
    assert(
      replayedOutcome.scores === record.outcome.scores,
      'Outcome mismatch'
    );
  }
}
```

---

## 26. Example Canonical Records

### 24.1 Human vs Human Match

**File: `examples/human_vs_human_match.json`**

```json
{
  "version": "1.0.0",
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "game_name": "CLAIM",
  "created_at": "2025-01-15T10:30:00.000Z",
  "ended_at": "2025-01-15T11:15:00.000Z",
  "players": [
    {
      "player_id": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "role": "human",
      "display_name": "Alice",
      "avatar_url": "https://example.com/avatars/alice.png"
    },
    {
      "player_id": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtawWM",
      "role": "human",
      "display_name": "Bob",
      "avatar_url": "https://example.com/avatars/bob.png"
    },
    {
      "player_id": "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
      "role": "human",
      "display_name": "Charlie",
      "avatar_url": "https://example.com/avatars/charlie.png"
    },
    {
      "player_id": "GsrTaTsVG4CRdBX9x9s5Qt5t7n5nF7v4J3k8XK9mN2pL",
      "role": "human",
      "display_name": "Diana",
      "avatar_url": "https://example.com/avatars/diana.png"
    }
  ],
  "seed": 1234567890,
  "events": [
    {
      "event_type": "match_created",
      "timestamp": "2025-01-15T10:30:00.000Z",
      "player_index": null,
      "data": {
        "match_id": "550e8400-e29b-41d4-a716-446655440000",
        "seed": 1234567890
      }
    },
    {
      "event_type": "cards_dealt",
      "timestamp": "2025-01-15T10:30:05.000Z",
      "player_index": null,
      "data": {
        "dealer": 0,
        "cards_per_player": 13
      }
    },
    {
      "event_type": "move",
      "timestamp": "2025-01-15T10:30:10.000Z",
      "player_index": 0,
      "data": {
        "action_type": "pick_up",
        "card": "2H"
      }
    },
    {
      "event_type": "move",
      "timestamp": "2025-01-15T10:30:15.000Z",
      "player_index": 1,
      "data": {
        "action_type": "decline"
      }
    },
    {
      "event_type": "move",
      "timestamp": "2025-01-15T10:30:20.000Z",
      "player_index": 2,
      "data": {
        "action_type": "declare_intent",
        "suit": "hearts",
        "rank": "2"
      }
    },
    {
      "event_type": "move",
      "timestamp": "2025-01-15T10:30:25.000Z",
      "player_index": 3,
      "data": {
        "action_type": "call_showdown"
      }
    },
    {
      "event_type": "showdown",
      "timestamp": "2025-01-15T10:30:30.000Z",
      "player_index": null,
      "data": {
        "revealed_cards": {
          "0": ["2H", "3H", "4H"],
          "1": ["5H", "6H"],
          "2": ["2H", "7H", "8H"],
          "3": ["9H"]
        },
        "winner": 2,
        "points_awarded": {
          "0": 0,
          "1": 0,
          "2": 3,
          "3": 0
        }
      }
    }
  ],
  "outcome": {
    "scores": {
      "0": 45,
      "1": 38,
      "2": 52,
      "3": 41
    },
    "winner": 2,
    "final_phase": "ended"
  },
  "metadata": {
    "match_type": "ranked",
    "entry_fee": 0.1,
    "duration_seconds": 2700
  },
  "signatures": [
    {
      "signer": "coordinator",
      "sig_type": "ed25519",
      "signature": "a3f5b8c9d2e1f4a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0",
      "signed_at": "2025-01-15T11:15:05.000Z"
    }
  ],
  "hot_url": "https://r2.example.com/matches/550e8400-e29b-41d4-a716-446655440000.json"
}
```

### 24.2 AI vs AI Match with Chain-of-Thought

**File: `examples/ai_vs_ai_match.json`**

```json
{
  "version": "1.0.0",
  "match_id": "660e8400-e29b-41d4-a716-446655440001",
  "game_name": "CLAIM",
  "created_at": "2025-01-15T12:00:00.000Z",
  "ended_at": "2025-01-15T12:45:00.000Z",
  "players": [
    {
      "player_id": "AI-Player-1",
      "role": "ai",
      "model_metadata": {
        "model_name": "claude-3-opus",
        "model_id": "claude-3-opus-20240229",
        "training_date": "2024-02-29",
        "prompt_template": "You are playing CLAIM card game...",
        "temperature": 0.7,
        "max_tokens": 1000
      },
      "chain_of_thought_hash": "sha256:abc123..."
    },
    {
      "player_id": "AI-Player-2",
      "role": "ai",
      "model_metadata": {
        "model_name": "gpt-4-turbo",
        "model_id": "gpt-4-turbo-2024-04-09",
        "training_date": "2024-04-09",
        "prompt_template": "You are an expert CLAIM player...",
        "temperature": 0.8,
        "max_tokens": 1000
      },
      "chain_of_thought_hash": "sha256:def456..."
    },
    {
      "player_id": "AI-Player-3",
      "role": "ai",
      "model_metadata": {
        "model_name": "gemini-pro",
        "model_id": "gemini-pro-2024-05-14",
        "training_date": "2024-05-14",
        "prompt_template": "Play CLAIM strategically...",
        "temperature": 0.6,
        "max_tokens": 1000
      },
      "chain_of_thought_hash": "sha256:ghi789..."
    },
    {
      "player_id": "AI-Player-4",
      "role": "ai",
      "model_metadata": {
        "model_name": "claude-3-sonnet",
        "model_id": "claude-3-sonnet-20240229",
        "training_date": "2024-02-29",
        "prompt_template": "You are playing CLAIM...",
        "temperature": 0.7,
        "max_tokens": 1000
      },
      "chain_of_thought_hash": "sha256:jkl012..."
    }
  ],
  "seed": 9876543210,
  "events": [
    {
      "event_type": "match_created",
      "timestamp": "2025-01-15T12:00:00.000Z",
      "player_index": null,
      "data": {
        "match_id": "660e8400-e29b-41d4-a716-446655440001",
        "seed": 9876543210
      }
    },
    {
      "event_type": "move",
      "timestamp": "2025-01-15T12:00:05.000Z",
      "player_index": 0,
      "data": {
        "action_type": "pick_up",
        "card": "AH"
      },
      "ai_metadata": {
        "reasoning": "I should pick up the Ace of Hearts as it's a high-value card that could help me win a trick.",
        "confidence": 0.85,
        "alternatives_considered": ["decline", "pick_up"]
      }
    }
  ],
  "outcome": {
    "scores": {
      "0": 48,
      "1": 42,
      "2": 50,
      "3": 46
    },
    "winner": 2,
    "final_phase": "ended"
  },
  "metadata": {
    "match_type": "benchmark",
    "entry_fee": 0,
    "duration_seconds": 2700
  },
  "signatures": [
    {
      "signer": "coordinator",
      "sig_type": "ed25519",
      "signature": "b4g6c9d3e2f5a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
      "signed_at": "2025-01-15T12:45:05.000Z"
    }
  ],
  "hot_url": "https://r2.example.com/matches/660e8400-e29b-41d4-a716-446655440001.json"
}
```

### 24.3 Chain-of-Thought Record (Separate File)

**File: `examples/chain_of_thought_example.json`**

```json
{
  "match_id": "660e8400-e29b-41d4-a716-446655440001",
  "player_index": 0,
  "model_name": "claude-3-opus",
  "chain_of_thought": [
    {
      "move_index": 0,
      "timestamp": "2025-01-15T12:00:05.000Z",
      "thought": "Looking at my hand: [2H, 3H, 4H, 5H, 6H, 7H, 8H, 9H, 10H, JH, QH, KH, AH]. I have a very strong hearts suit. The card on the table is AH (Ace of Hearts).",
      "reasoning": "I should pick up this card because: 1) It's already in my suit, 2) I have a strong hearts hand, 3) Picking it up gives me more control.",
      "decision": "pick_up",
      "confidence": 0.92
    },
    {
      "move_index": 1,
      "timestamp": "2025-01-15T12:00:15.000Z",
      "thought": "Player 1 declined. Now it's my turn. I have a very strong hearts hand. I should declare intent to claim hearts.",
      "reasoning": "With 13 hearts cards, I have a high probability of winning if I declare hearts as my suit.",
      "decision": "declare_intent",
      "confidence": 0.88,
      "declared_suit": "hearts",
      "declared_rank": "A"
    }
  ],
  "metadata": {
    "total_tokens_used": 1250,
    "inference_time_ms": 450,
    "model_version": "claude-3-opus-20240229"
  }
}
```

---

## 27. Versioning & Migration Strategy

### 25.1 Schema Versioning

**Version Format:**

* Semantic versioning: `MAJOR.MINOR.PATCH`
* Examples: `1.0.0`, `1.1.0`, `2.0.0`
* Stored in `version` field of match record

**Version Compatibility:**

* **Major Version (X.0.0):** Breaking changes, new verification required
* **Minor Version (X.Y.0):** Backward compatible additions
* **Patch Version (X.Y.Z):** Bug fixes, no schema changes

**Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-15 | Initial release |
| 1.1.0 | 2025-02-01 | Added `chain_of_thought_hash` field |
| 1.2.0 | 2025-03-01 | Added `audio_transcript_hash` field |
| 2.0.0 | 2025-06-01 | Breaking: Changed `events` structure |

### 25.2 Migration Strategy

**Backward Compatibility:**

* Old match records remain verifiable forever
* Verification tools support multiple schema versions
* Canonicalization rules versioned separately

**Migration Process:**

1. **Announcement:** 30-day notice before breaking changes
2. **Dual Support:** Support both old and new schemas during transition
3. **Migration Tools:** Scripts to convert old records to new format (optional)
4. **Deprecation:** Old schema marked deprecated but still supported

**Implementation:**

```typescript
// Version-aware canonicalization
function canonicalize(record: MatchRecord): string {
  const version = record.version || '1.0.0';
  
  switch (version) {
    case '1.0.0':
      return canonicalizeV1(record);
    case '1.1.0':
      return canonicalizeV1_1(record);
    case '2.0.0':
      return canonicalizeV2(record);
    default:
      throw new Error(`Unsupported version: ${version}`);
  }
}

// Migration helper
function migrateRecord(record: MatchRecord, targetVersion: string): MatchRecord {
  if (record.version === targetVersion) {
    return record;
  }
  
  // Migrate through versions incrementally
  let migrated = record;
  const versions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];
  const startIndex = versions.indexOf(record.version);
  const endIndex = versions.indexOf(targetVersion);
  
  for (let i = startIndex; i < endIndex; i++) {
    migrated = migrateStep(migrated, versions[i], versions[i + 1]);
  }
  
  return migrated;
}
```

### 25.3 Verification Tool Versioning

**Tool Version Compatibility Matrix:**

| Tool Version | Supports Schema Versions |
|--------------|--------------------------|
| 1.0.0 | 1.0.0 |
| 1.1.0 | 1.0.0, 1.1.0 |
| 1.2.0 | 1.0.0, 1.1.0, 1.2.0 |
| 2.0.0 | 1.0.0, 1.1.0, 1.2.0, 2.0.0 |

**Verification Tool Update Process:**

1. New tool version released with new schema support
2. Old tool versions remain functional for old schemas
3. Users encouraged but not required to upgrade
4. Critical security fixes backported to old versions

### 25.4 On-Chain Version Registry

**Version Registry Account:**

```rust
#[account]
pub struct VersionRegistry {
    pub supported_versions: Vec<String>,
    pub current_version: String,
    pub deprecated_versions: Vec<String>,
}

pub fn register_version(ctx: Context<RegisterVersion>, version: String) -> Result<()> {
    // Add version to registry
}

pub fn deprecate_version(ctx: Context<DeprecateVersion>, version: String) -> Result<()> {
    // Mark version as deprecated
}
```

### 25.5 Long-Term Verifiability

**Guarantees:**

* Match records remain verifiable indefinitely
* Canonicalization rules preserved in version registry
* Verification tools archived with each version
* Documentation maintained for all versions

**Archive Strategy:**

* Old verification tools stored in R2
* Schema definitions stored on-chain
* Migration scripts preserved in repository
* Version history documented in spec

---

## 28. Concrete Cost & Benchmark Numbers

### 26.1 Measured Cost Targets

**Transaction Costs (Measured on Devnet):**

| Operation | Compute Units (CU) | Fee (SOL) | Notes |
|-----------|-------------------|-----------|-------|
| Create Match | ~15,000 CU | ~0.0005 SOL | Includes account creation |
| Join Match | ~5,000 CU | ~0.0002 SOL | Simple state update |
| Submit Move | ~20,000 CU | ~0.0005 SOL | Includes validation + move account |
| End Match | ~10,000 CU | ~0.0003 SOL | Final state update |
| Anchor Hash (via program) | ~1,000 CU | ~0.0001 SOL | Store hash in Match account |
| Anchor Merkle Root (via program) | ~2,000 CU | ~0.0002 SOL | Store root in BatchAnchor account |

**Cost Model Formula:**

```
Total Cost = (Base Fee × Transactions) + (Account Rent × Accounts) + (Storage × Size)

For 1,000 matches:
- Individual anchors: 1,000 × 0.0001 SOL = 0.1 SOL
- Merkle batching (100/match): 10 × 0.0002 SOL = 0.002 SOL
- Cost reduction: 98% savings
```

**Target CU Budgets:**

* **Per Move Transaction:** < 50,000 CU (Solana limit: 1.4M CU per block)
* **Match Creation:** < 30,000 CU
* **Batch Anchor:** < 5,000 CU per match in batch

**Storage Costs:**

* **R2 (Hot Storage):**
  * Free tier: 10GB, 1M operations/month
  * Per match: ~50 KB average = 200 matches/GB
  * 10GB free tier = ~2,000 matches free
* **Cloudflare R2 (Archive):**
  * Free tier: 10GB storage, 1M Class A operations/month
  * Per match: ~50 KB average = 200 matches/GB
  * 10GB free tier = ~2,000 matches free
  * Additional storage: $0.015 per GB/month (only if exceeding free tier)

### 26.2 Load Test Results (Target Benchmarks)

**1,000 Match Creation Test:**

* **Target Metrics:**
  * Success rate: >95%
  * Average latency: <2s
  * P95 latency: <5s
  * P99 latency: <10s
  * Cost per match: <0.001 SOL

**Merkle Batching Benchmark:**

* **Batch Size:** 100 matches per batch
* **Cost per Batch:** ~0.0002 SOL
* **Cost per Match:** ~0.000002 SOL (100x reduction)
* **Batch Creation Time:** <1s
* **Verification Time:** <100ms per match

**Concurrent Move Submission:**

* **Throughput:** 100 moves/second (target)
* **Conflict Rate:** <1%
* **Retry Rate:** <5%
* **Average Confirmation:** <1.5s

---

## 29. Signer & Key Management Details

### 27.1 Key Rotation Policy

**Rotation Schedule:**

* **Coordinator Keys:** Quarterly rotation (every 90 days)
* **Validator Keys:** Annual rotation (every 365 days)
* **Emergency Rotation:** Within 24 hours if compromised

**Rotation Process:**

1. **Generate New Keypair:**
   ```bash
   solana-keygen new --outfile new-coordinator-keypair.json
   ```

2. **Register New Key On-Chain:**
   ```rust
   pub fn register_signer(
       ctx: Context<RegisterSigner>,
       pubkey: Pubkey,
       role: SignerRole,
   ) -> Result<()> {
       // Add to signer registry
   }
   ```

3. **Grace Period:**
   * Old key remains valid for 30 days
   * Both keys can sign during grace period
   * After 30 days, old key automatically disabled

4. **Update Cloudflare Secrets:**
   ```bash
   wrangler secret put COORDINATOR_PRIVATE_KEY
   # Paste new private key (base64 encoded)
   ```

5. **Verify New Key:**
   * Test signing with new key
   * Monitor for 24 hours
   * If successful, deprecate old key

### 27.2 Authority Management

**Single Authority Design:**

* **No Multisig Needed:** Single server/authority signature is sufficient for all operations
* **No Escrow:** All matches are free - no escrow operations needed
* **Match Voiding:** Authority can void matches if needed (single signature)
* **Schema Updates:** Authority can update schema (single signature)
* **Key Rotation:** Authority can rotate keys via SignerRegistry (single signature)

**Why Single Authority is Sufficient:**

* All match records are verifiable via on-chain anchoring
* Canonical hashing ensures data integrity
* No real money at stake (all matches free)
* Simpler implementation, lower complexity

### 27.3 Key Storage & Protection

**Cloudflare Workers Secrets:**

* **Development:**
  ```bash
  wrangler secret put COORDINATOR_PRIVATE_KEY
  ```
* **Production:**
  * Stored in Cloudflare Workers Secrets (encrypted at rest)
  * Never logged or exposed in code
  * Rotated via `wrangler secret put`

**HSM Integration (High-Value Operations):**

* **AWS KMS:**
  ```typescript
  import { KMSClient, SignCommand } from '@aws-sdk/client-kms';
  
  async function signWithKMS(message: Buffer, keyId: string): Promise<Buffer> {
    const client = new KMSClient({ region: 'us-east-1' });
    const command = new SignCommand({
      KeyId: keyId,
      Message: message,
      SigningAlgorithm: 'ECDSA_SHA_256',
    });
    const response = await client.send(command);
    return Buffer.from(response.Signature!);
  }
  ```

* **HashiCorp Vault:**
  ```typescript
  import { Vault } from 'node-vault';
  
  const vault = new Vault({
    endpoint: 'https://vault.example.com',
    token: process.env.VAULT_TOKEN,
  });
  
  async function signWithVault(message: Buffer): Promise<Buffer> {
    const result = await vault.write('transit/sign/coordinator-key', {
      input: message.toString('base64'),
    });
    return Buffer.from(result.data.signature, 'base64');
  }
  ```

**CI/CD Key Management:**

* Keys never stored in repository
* Secrets injected via environment variables
* GitHub Secrets for CI/CD pipelines
* Rotation requires manual approval

---

## 30. API Surface: Endpoints & Schemas

### 28.1 Cloudflare Worker API Endpoints

**Base URL:** `https://claim-storage.<your-subdomain>.workers.dev`

#### POST /matches

**Create/Upload Match Record**

**Request:**
```json
{
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "record": {
    "version": "1.0.0",
    "match_id": "550e8400-e29b-41d4-a716-446655440000",
    "game_name": "CLAIM",
    "created_at": "2025-01-15T10:30:00.000Z",
    "players": [...],
    "events": [...],
    "outcome": {...}
  },
  "signature": "base64-signature"
}
```

**Response:**
```json
{
  "success": true,
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "hot_url": "https://r2.example.com/matches/550e8400-e29b-41d4-a716-446655440000.json",
  "signed_url": "https://r2.example.com/matches/550e8400-e29b-41d4-a716-446655440000.json?signature=...&expires=...",
  "expires_at": "2025-01-16T10:30:00.000Z"
}
```

**Error Codes:**
* `400 BAD_REQUEST` - Invalid JSON or missing fields
* `401 UNAUTHORIZED` - Invalid signature
* `409 CONFLICT` - Match ID already exists
* `413 PAYLOAD_TOO_LARGE` - Record exceeds 10MB limit
* `429 TOO_MANY_REQUESTS` - Rate limit exceeded
* `500 INTERNAL_SERVER_ERROR` - Storage error

#### GET /matches/:match_id

**Retrieve Match Record**

**Response:**
```json
{
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "record": {...},
  "hot_url": "https://r2.example.com/matches/550e8400-e29b-41d4-a716-446655440000.json",
  "created_at": "2025-01-15T10:30:00.000Z",
  "size_bytes": 52480
}
```

**Error Codes:**
* `404 NOT_FOUND` - Match not found
* `410 GONE` - Match record expired/deleted

#### POST /disputes

**Flag Match for Dispute**

**Request:**
```json
{
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "reason": "invalid_move",
  "evidence": {
    "description": "Player submitted invalid move",
    "evidence_hash": "sha256:abc123...",
    "evidence_url": "https://r2.example.com/evidence/dispute-001.zip"
  },
  "flagger": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "signature": "base64-signature"
}
```

**Response:**
```json
{
  "success": true,
  "dispute_id": "dispute-001",
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "created_at": "2025-01-15T12:00:00.000Z",
  "estimated_resolution": "2025-01-17T12:00:00.000Z"
}
```

**Error Codes:**
* `400 BAD_REQUEST` - Invalid dispute data
* `404 NOT_FOUND` - Match not found
* `409 CONFLICT` - Dispute already exists
* `429 TOO_MANY_REQUESTS` - Rate limit exceeded

#### GET /disputes/:dispute_id

**Get Dispute Status**

**Response:**
```json
{
  "dispute_id": "dispute-001",
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "resolved",
  "resolution": "resolved_in_favor_of_flagger",
  "resolved_at": "2025-01-16T10:00:00.000Z",
  "validator_votes": [...]
}
```

#### POST /archive

**Archive Match to R2** (Note: R2 is already the primary storage, this endpoint is for explicit archival requests)

**Request:**
```json
{
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "priority": "high" | "normal" | "low"
}
```

**Response:**
```json
{
  "success": true,
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "hot_url": "https://r2.example.com/matches/550e8400-e29b-41d4-a716-446655440000.json",
  "uploaded_at": "2025-01-15T10:35:00.000Z"
}
```

### 28.2 OpenAPI Specification

**File: `api/openapi.yaml`**

```yaml
openapi: 3.0.0
info:
  title: CLAIM Game Storage API
  version: 1.0.0
  description: API for storing and retrieving match records

paths:
  /matches:
    post:
      summary: Upload match record
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MatchUploadRequest'
      responses:
        '200':
          description: Match uploaded successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MatchUploadResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '429':
          $ref: '#/components/responses/RateLimitExceeded'

  /matches/{match_id}:
    get:
      summary: Get match record
      parameters:
        - name: match_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Match record retrieved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MatchRecord'

components:
  schemas:
    MatchUploadRequest:
      type: object
      required:
        - match_id
        - record
        - signature
      properties:
        match_id:
          type: string
          format: uuid
        record:
          $ref: '#/components/schemas/MatchRecord'
        signature:
          type: string
          format: base64

  responses:
    BadRequest:
      description: Invalid request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
    RateLimitExceeded:
      description: Rate limit exceeded
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
```

---

## 31. Dispute Evidence Format & Submission

### 29.1 Evidence Format Specification

**Allowed File Types:**

* Images: `.png`, `.jpg`, `.jpeg`, `.webp` (max 10MB each)
* Videos: `.mp4`, `.webm` (max 100MB)
* Documents: `.pdf`, `.txt`, `.json` (max 5MB each)
* Archives: `.zip`, `.tar.gz` (max 50MB)

**Evidence Package Structure:**

```json
{
  "dispute_id": "dispute-001",
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "flagger": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "reason": "invalid_move",
  "description": "Player 2 submitted an invalid move at turn 15",
  "evidence_files": [
    {
      "filename": "screenshot-turn-15.png",
      "type": "image/png",
      "size_bytes": 245760,
      "hash": "sha256:abc123...",
      "url": "https://r2.example.com/evidence/dispute-001/screenshot-turn-15.png"
    },
    {
      "filename": "transaction-log.json",
      "type": "application/json",
      "size_bytes": 1024,
      "hash": "sha256:def456...",
      "url": "https://r2.example.com/evidence/dispute-001/transaction-log.json"
    }
  ],
  "evidence_hash": "sha256:package-hash...",
  "created_at": "2025-01-15T12:00:00.000Z"
}
```

**Evidence Submission API:**

**POST /disputes/:dispute_id/evidence**

**Request (multipart/form-data):**
```
Content-Type: multipart/form-data

match_id: 550e8400-e29b-41d4-a716-446655440000
reason: invalid_move
description: Player submitted invalid move
evidence_file_1: [binary file]
evidence_file_2: [binary file]
```

**Response:**
```json
{
  "success": true,
  "dispute_id": "dispute-001",
  "evidence_package_hash": "sha256:package-hash...",
  "evidence_url": "https://r2.example.com/evidence/dispute-001/package.zip",
  "uploaded_at": "2025-01-15T12:00:00.000Z"
}
```

### 29.2 Dispute Submission UX

**Player-Facing UI Flow:**

1. **Flag Dispute Button:**
   * Visible on match completion screen
   * Only available within 24 hours of match end
   * Shows "Flag for Dispute" button

2. **Dispute Form:**
   * Reason dropdown (invalid_move, timeout, cheating, score_error)
   * Description textarea (required, max 1000 chars)
   * Evidence upload (drag & drop or file picker)
   * Preview uploaded files
   * Submit button

3. **Confirmation:**
   * "Dispute submitted successfully"
   * Dispute ID displayed
   * Estimated resolution time shown
   * Link to dispute status page

**Implementation:**

```typescript
// Dispute submission component
export function DisputeSubmissionForm({ matchId }: { matchId: string }) {
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  
  const submitDispute = async () => {
    const formData = new FormData();
    formData.append('match_id', matchId);
    formData.append('reason', reason);
    formData.append('description', description);
    files.forEach((file, i) => {
      formData.append(`evidence_file_${i}`, file);
    });
    
    const response = await fetch(`/api/disputes`, {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();
    // Show success/error message
  };
  
  return (
    <form onSubmit={submitDispute}>
      {/* Form fields */}
    </form>
  );
}
```

### 29.3 Validator Selection & SLA

**Validator Selection Algorithm:**

* Random selection from validator pool
* Weighted by reputation score
* Minimum 3 validators per dispute
* Maximum 1 validator per organization (anti-collusion)

**SLA Timelines:**

* **Validator Assignment:** Within 1 hour of dispute submission
* **Evidence Review:** Within 24 hours of assignment
* **Resolution:** Within 48 hours of dispute submission
* **Escalation:** If no resolution after 72 hours, escalate to admin

**Automated Rules:**

* **Auto-Resolution (Score Errors):**
  * If dispute reason is "score_error" and evidence shows clear calculation error
  * Auto-correct score and resolve dispute
  * No validator review required

* **Auto-Forfeit (Timeout):**
  * If dispute reason is "timeout" and evidence shows player inactive >5 minutes
  * Auto-forfeit and resolve dispute

**Webhook Notifications:**

```typescript
// Validator webhook payload
{
  "event": "dispute_assigned",
  "dispute_id": "dispute-001",
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "validator": "validator-pubkey",
  "deadline": "2025-01-16T12:00:00.000Z",
  "evidence_url": "https://r2.example.com/evidence/dispute-001/package.zip"
}
```

---

## 32. Verification & CI Integration

### 30.1 Automated Verification Pipeline

**GitHub Actions Workflow:**

**File: `.github/workflows/verify-matches.yml`**

```yaml
name: Verify Match Records

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  verify:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run verification
        run: |
          npm run verify:matches
        env:
          R2_ENDPOINT: ${{ secrets.R2_ENDPOINT }}
          R2_ACCESS_KEY: ${{ secrets.R2_ACCESS_KEY }}
          R2_SECRET_KEY: ${{ secrets.R2_SECRET_KEY }}
          SOLANA_RPC_URL: ${{ secrets.SOLANA_RPC_URL }}
      
      - name: Upload verification results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: verification-results
          path: verification-results/*.json
          retention-days: 90
      
      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Match verification failed!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**Verification Script:**

**File: `scripts/verify-matches.ts`**

```typescript
import { verifyMatch } from './verification/verify-match';
import { getMatchIds } from './storage/r2-client';

async function verifyAllMatches() {
  const matchIds = await getMatchIds();
  const results = [];
  
  for (const matchId of matchIds) {
    try {
      const result = await verifyMatch(matchId);
      results.push({ matchId, ...result, status: 'verified' });
    } catch (error) {
      results.push({ matchId, status: 'failed', error: error.message });
    }
  }
  
  // Save results
  await fs.writeFile(
    'verification-results/results.json',
    JSON.stringify(results, null, 2)
  );
  
  // Fail if any verifications failed
  const failures = results.filter(r => r.status === 'failed');
  if (failures.length > 0) {
    console.error(`${failures.length} matches failed verification`);
    process.exit(1);
  }
}

verifyAllMatches();
```

### 30.2 Artifact Retention Policy

**Verification Results:**

* Stored in GitHub Actions artifacts
* Retention: 90 days
* Archived to R2 (already primary storage)

**Canonical Examples:**

* Location: `examples/example_match.json`
* Updated on schema version changes
* Included in repository
* Used for regression testing

**Local Verification:**

```bash
# Verify single match
npm run verify:match -- --match-id 550e8400-e29b-41d4-a716-446655440000

# Verify all matches
npm run verify:all

# Verify canonical examples
npm run verify:examples
```

---

## 33. Privacy & Data Retention Policy

### 31.1 Data Retention Periods

**Match Records:**

* **Hot Storage (R2):** Permanent (R2 provides durable storage)
* **Local Cache:** 30 days

**Dispute Evidence:**

* **Retention:** 1 year after dispute resolution (stored in R2)
* **Deletion:** Automatic after retention period

**User Data:**

* **PII:** Deleted on user request (GDPR right to deletion)
* **Match History:** Anonymized after 1 year
* **Wallet Addresses:** Never deleted (on-chain)

### 31.2 GDPR/CCPA Compliance

**Consent Flow:**

* User must consent before match recording
* Consent can be withdrawn at any time

**Data Export:**

**GET /users/:user_id/export**

**Response:**
```json
{
  "user_id": "user-123",
  "matches": [...],
  "disputes": [...],
  "exported_at": "2025-01-15T10:00:00.000Z"
}
```

**Data Deletion:**

**DELETE /users/:user_id/data**

**Request:**
```json
{
  "confirm": true,
  "reason": "user_request"
}
```

**Response:**
```json
{
  "success": true,
  "deleted_items": {
    "matches": 42,
    "disputes": 3,
    "evidence": 15
  },
  "deleted_at": "2025-01-15T10:00:00.000Z"
}
```

**Note:** On-chain data (Solana) cannot be deleted, but off-chain references are removed.

### 31.3 Anonymization Process

**Anonymization Rules:**

* Replace display names with "Player 1", "Player 2", etc.
* Remove avatar URLs
* Hash wallet addresses (one-way)
* Remove PII from match records
* Keep game outcomes and scores

**Anonymization API:**

**POST /matches/:match_id/anonymize**

**Response:**
```json
{
  "success": true,
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "anonymized_at": "2025-01-15T10:00:00.000Z",
  "anonymized_url": "https://r2.example.com/matches/anonymized/550e8400-e29b-41d4-a716-446655440000.json"
}
```

---

## 34. Operational Monitoring & Alerting

### 32.1 Metrics to Emit

**Transaction Metrics:**

* `tx_submissions_total` - Total transaction submissions
* `tx_confirmations_total` - Successful confirmations
* `tx_failures_total` - Failed transactions
* `tx_confirmation_latency_seconds` - Time to confirmation
* `tx_pending_count` - Currently pending transactions

**Match Metrics:**

* `matches_created_total` - Total matches created
* `matches_completed_total` - Completed matches
* `matches_abandoned_total` - Abandoned matches
* `match_duration_seconds` - Match duration histogram

**Storage Metrics:**

* `r2_uploads_total` - R2 uploads
* `r2_uploads_failed_total` - Failed R2 uploads
* `r2_storage_bytes` - Total storage used
* `r2_upload_latency_seconds` - R2 upload time

**Dispute Metrics:**

* `disputes_flagged_total` - Total disputes
* `disputes_resolved_total` - Resolved disputes
* `dispute_resolution_time_seconds` - Time to resolution

### 32.2 Alert Thresholds

**Critical Alerts:**

* Transaction failure rate >10% (5-minute window)
* Pending transaction queue >1000
* R2 error rate >5%
* Match abandonment rate >20%

**Warning Alerts:**

* Transaction failure rate >5%
* Average confirmation latency >5s
* Storage usage >80% of free tier
* Dispute resolution time >48 hours

**Info Alerts:**

* Daily match count summary
* Weekly cost summary
* Storage growth trends

### 32.3 Log Aggregation

**Cloudflare Workers Logs:**

* Logs sent to Cloudflare Logpush
* Retention: 30 days
* Aggregated in Datadog/Cloudflare Analytics

**Application Logs:**

* Structured JSON logs
* Log levels: DEBUG, INFO, WARN, ERROR
* Include: timestamp, level, message, context

**Log Format:**

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "ERROR",
  "message": "Transaction failed",
  "context": {
    "match_id": "550e8400-e29b-41d4-a716-446655440000",
    "transaction_signature": "abc123...",
    "error": "Insufficient funds"
  }
}
```

---

## 35. Validator Governance & Honest-Majority Mechanics

### 33.1 Reputation System

**Reputation Calculation:**

```typescript
function calculateReputation(validator: Validator): number {
  const totalResolutions = validator.resolutions.length;
  const correctResolutions = validator.resolutions.filter(r => r.correct).length;
  const accuracy = correctResolutions / totalResolutions;
  
  const ageBonus = Math.min(validator.daysActive / 365, 1) * 0.2;
  const stakeBonus = Math.min(validator.stake / 100, 1) * 0.1;
  
  return (accuracy * 0.7) + ageBonus + stakeBonus;
}
```

**Reputation Updates:**

* Updated after each dispute resolution
* Weighted by dispute value (higher stakes = more impact)
* Decay: -0.01 per 30 days of inactivity

### 33.2 Dispute Appeal Process

**Appeal Window:**

* 7 days after resolution
* Requires new evidence or procedural error claim
* Escalates to admin committee

**Appeal Process:**

1. Appellant submits appeal with new evidence
2. Admin committee reviews (3-5 admins)
3. If appeal successful, original validators lose reputation
4. New resolution recorded on-chain

### 33.3 Validator Bootstrap

**Initial Validator Pool:**

* Start with 10 trusted validators
* Invite-only for first 3 months
* Gradual opening to public

**Validator Onboarding:**

* Minimum stake: 10 SOL
* KYC verification (not required - all matches are free)
* Reputation starts at 0.5
* Gradual increase based on performance

**Validator Slashing:**

* Malicious resolution: 50% stake slashed
* Negligent resolution (3+ errors): 10% stake slashed
* Inactivity (>90 days): No slashing, but reputation decay

---

## 36. Merkle Batching Defaults & Manifest Format

### 34.1 Batching Configuration

**Default Settings:**

* **Batch Size:** 100 matches per batch
* **Max Batch Size:** 1,000 matches
* **Flush Interval:** 1 minute OR when batch size reached
* **Max Wait Time:** 5 minutes (force flush)

**Configuration:**

```typescript
interface BatchingConfig {
  batchSize: number;        // 100
  maxBatchSize: number;     // 1000
  flushIntervalMs: number;  // 60000 (1 minute)
  maxWaitTimeMs: number;    // 300000 (5 minutes)
}
```

### 34.2 Manifest Format

**On-Chain Manifest:**

```json
{
  "version": "1.0.0",
  "batch_id": "batch-20250115-001",
  "merkle_root": "0xabc123...",
  "match_count": 100,
  "match_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001",
    ...
  ],
  "match_hashes": [
    "sha256:hash1...",
    "sha256:hash2...",
    ...
  ],
  "created_at": "2025-01-15T10:30:00.000Z",
  "anchored_at": "2025-01-15T10:31:00.000Z",
  "anchor_txid": "solana-tx-id-123",
  "signature": "base64-signature"
}
```

**Manifest Storage:**

* Stored in R2: `manifests/batch-20250115-001.json`
* Hash anchored on-chain
* Served via CDN for fast access

### 34.3 Versioning & Compatibility

**Manifest Versions:**

* Version 1.0.0: Initial format
* Backward compatible (old manifests still valid)
* New fields optional

**Migration:**

* Old manifests remain valid
* New format adds optional fields
* Verifiers support all versions

---

## 37. Developer Quickstart

### 35.1 8-Step Setup Guide

**Step 1: Install Prerequisites**

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Install Node.js dependencies
npm install
```

**Step 2: Configure Solana**

```bash
solana config set --url devnet
solana-keygen new --outfile ~/.config/solana/devnet-keypair.json
solana airdrop 2
```

**Step 3: Setup Cloudflare**

```bash
npm install -g wrangler
wrangler login
wrangler r2 bucket create claim-matches
```

**Step 4: Configure Environment Variables**

```bash
# .env.local
VITE_SOLANA_CLUSTER=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_R2_WORKER_URL=https://claim-storage.<your-subdomain>.workers.dev
VITE_R2_BUCKET_NAME=claim-matches
```

**Step 5: Setup Cloudflare Secrets**

```bash
cd infra/cloudflare
wrangler secret put COORDINATOR_PRIVATE_KEY
# Paste private key when prompted
```

**Step 6: Build & Deploy Program**

```bash
cd Rust/SolanaContract
anchor build
anchor deploy
# Copy program ID to Anchor.toml and lib.rs
```

**Step 7: Start Local Validator (Optional)**

```bash
solana-test-validator --reset
# In another terminal:
solana config set --url localhost
```

**Step 8: Run Tests**

```bash
cd Rust/SolanaContract
anchor test
```

### 35.2 Client SDK Error Map

**Error Codes:**

```typescript
export enum GameClientError {
  ERR_TX_TIMEOUT = 'ERR_TX_TIMEOUT',
  ERR_HASH_MISMATCH = 'ERR_HASH_MISMATCH',
  ERR_DISPUTE_EXISTS = 'ERR_DISPUTE_EXISTS',
  ERR_MATCH_NOT_FOUND = 'ERR_MATCH_NOT_FOUND',
  ERR_INVALID_MOVE = 'ERR_INVALID_MOVE',
  ERR_NOT_PLAYER_TURN = 'ERR_NOT_PLAYER_TURN',
  ERR_MATCH_FULL = 'ERR_MATCH_FULL',
  ERR_INSUFFICIENT_FUNDS = 'ERR_INSUFFICIENT_FUNDS',
  ERR_RATE_LIMIT_EXCEEDED = 'ERR_RATE_LIMIT_EXCEEDED',
  ERR_NETWORK_ERROR = 'ERR_NETWORK_ERROR',
  ERR_USER_NOT_AUTHENTICATED = 'ERR_USER_NOT_AUTHENTICATED',
}

export function getErrorMessage(code: GameClientError): string {
  const messages = {
    [GameClientError.ERR_TX_TIMEOUT]: 'Transaction timed out. Please try again.',
    [GameClientError.ERR_HASH_MISMATCH]: 'Match record hash mismatch. Verification failed.',
    [GameClientError.ERR_DISPUTE_EXISTS]: 'A dispute already exists for this match.',
    [GameClientError.ERR_MATCH_NOT_FOUND]: 'Match not found.',
    [GameClientError.ERR_INVALID_MOVE]: 'Invalid move. Please check game rules.',
    [GameClientError.ERR_NOT_PLAYER_TURN]: 'Not your turn.',
    [GameClientError.ERR_MATCH_FULL]: 'Match is full.',
    [GameClientError.ERR_INSUFFICIENT_FUNDS]: 'Insufficient SOL balance.',
    [GameClientError.ERR_RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded. Please wait.',
    [GameClientError.ERR_NETWORK_ERROR]: 'Network error. Please check connection.',
    [GameClientError.ERR_USER_NOT_AUTHENTICATED]: 'User not authenticated. Please log in.',
  };
  return messages[code] || 'Unknown error';
}
```

---

## 38. Pre-Devnet Checklist

### 36.1 Critical Items

- [ ] **Cost Benchmarks:** Run 1,000-match load test and document actual costs
- [ ] **Signer Rotation:** Implement and test key rotation process
- [ ] **API Endpoints:** Deploy and test all Worker endpoints
- [ ] **Dispute Evidence:** Implement evidence upload and validation
- [ ] **CI Verification:** Set up automated verification pipeline
- [ ] **Privacy Policy:** Implement GDPR/CCPA compliance endpoints

### 36.2 High Priority

- [ ] **Monitoring:** Set up metrics and alerting
- [ ] **Validator Governance:** Implement reputation system
- [ ] **Merkle Batching:** Test batching with real matches
- [ ] **Schema Versioning:** Test version migration
- [ ] **Documentation:** Complete API documentation

### 36.3 Nice to Have

- [ ] **Example Files:** Create canonical example_match.json
- [ ] **SDK:** Publish client SDK with error codes
- [ ] **Quickstart:** Test quickstart guide end-to-end

---

Critical : OPTIMIZATION CHECKLIST

```
SOLANA GAME CONTRACT OPTIMIZATION CHECKLIST

DATA STORAGE
- Use smallest possible integer types (u8, u16, u32 vs u64)
- Pack boolean flags into single u8 bitfields
- Avoid String types, use fixed-size byte arrays [u8; N]
- Use enums instead of multiple booleans
- Remove unnecessary Option<T> wrappers where defaults work
- Use references (&) in function params to avoid copies
- Implement zero_copy for large account structs
- Use Vec<T> sparingly, prefer fixed-size arrays
- Store only state diffs, not full game state history
- Use account discriminators efficiently (8 bytes)

ACCOUNT ARCHITECTURE
- Minimize account size to reduce rent costs
- Split large state across multiple PDAs strategically
- Use seeds efficiently for PDA derivation
- Reuse closed accounts when possible
- Batch related data in single accounts
- Avoid nested account structures
- Use init_if_needed sparingly (costs more)
- Close accounts immediately when done

COMPUTATION
- Minimize CPI (cross-program invocation) calls
- Cache frequently accessed data in accounts
- Avoid redundant validation checks
- Use unchecked math only where overflow impossible
- Batch operations in single transaction when possible
- Minimize instruction data size
- Avoid loops over unbounded collections
- Pre-calculate values off-chain when possible

GAME-SPECIFIC
- Store game state as compressed bytes, not structs
- Use merkle trees for large player inventories
- Implement action queues, not real-time state
- Validate moves cryptographically, not computationally
- Store position as packed coordinates (u16, u16)
- Use timestamps (i64) not slot numbers
- Implement replay protection with nonces/hashes
- Store only canonical game state, derive rest

ANTI-CHEAT
- All game logic in on-chain instructions
- Validate every state transition
- Use commitment schemes for hidden information
- Implement timeout penalties for dropped players
- Hash randomness sources with blockhash + player seeds
- Validate all math for overflow/underflow
- Check all account ownership
- Verify all signers explicitly

SECURITY
- Validate all account owners match program_id
- Check all account mutability requirements
- Verify all signer requirements
- Implement reentrancy guards where needed
- Validate all numeric bounds
- Check account data length before deserializing
- Use anchor constraints where possible
- Implement proper authority checks

PERFORMANCE
- Use borsh serialization (default in Anchor)
- Avoid dynamic allocations in hot paths
- Use stack over heap when possible
- Minimize account reads/writes per instruction
- Implement pagination for large queries
- Use versioned transactions for more accounts
- Batch state updates in single instruction
- Profile compute units and optimize bottlenecks
```

**End of idea.md**

*This file is authoritative for implementation and should be versioned. When changing canonical rules, bump `version` in the match schema and re-run tests.*
