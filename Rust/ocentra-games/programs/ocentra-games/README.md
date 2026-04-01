# Ocentra Games Solana Program

This directory contains the Rust Solana program that implements on-chain multiplayer game logic for Ocentra Games.

## Overview

The program is built using the **Anchor framework** and provides:
- Game registry system for managing multiple game types
- Match lifecycle management (create, join, start, end)
- Move submission with replay protection
- Economic model (GP, AC, subscriptions, rewards)
- Dispute resolution system
- Batch anchoring for efficient match recording

## Program Structure

```
programs/ocentra-games/src/
├── lib.rs                    # Program entry point, instruction handlers
├── state/                    # Account state structures
│   ├── match_state.rs        # Match account (players, phase, state)
│   ├── move_state.rs         # Move account (action, payload, nonce)
│   ├── game_registry.rs      # Game registry (registered games)
│   ├── game_config.rs        # Game-specific configuration
│   ├── user_account.rs       # User economic state (GP, AC, subscriptions)
│   ├── config_account.rs     # Global configuration
│   ├── dispute.rs            # Dispute records
│   ├── batch_anchor.rs       # Batch anchoring records
│   ├── signer_registry.rs    # Authorized signers
│   └── validator_reputation.rs  # Validator reputation tracking
│
├── instructions/             # Instruction handlers
│   ├── common/               # Instructions shared across all games
│   │   ├── registry/         # Game registry management
│   │   ├── accounts/         # Account management (close, etc.)
│   │   ├── batches/          # Batch anchoring
│   │   ├── disputes/         # Dispute system
│   │   ├── economic/         # Economic model (GP, AC, rewards)
│   │   ├── scores/           # Score calculation
│   │   ├── signers/          # Signer registration
│   │   └── validators/       # Validator slashing
│   │
│   └── games/                # Game-specific instructions
│       ├── match_lifecycle/  # Match creation, joining, starting, ending
│       └── moves/            # Move submission (individual and batch)
│
├── games/                    # Game logic implementations
│   ├── dispatcher.rs         # Routes moves to game-specific handlers
│   ├── trait_def.rs          # Game trait definition
│   └── claim/                # CLAIM game implementation
│       ├── actions.rs        # CLAIM action types and handlers
│       ├── rules.rs          # CLAIM game rules
│       └── validation.rs    # CLAIM-specific validation
│
├── common/                   # Shared utilities
│   ├── validation_base.rs    # Base validation logic
│   └── replay_protection.rs # Nonce-based replay protection
│
├── card_games/               # Card game utilities
│   ├── hand_management.rs   # Hand tracking and validation
│   ├── floor_card.rs         # Floor card management
│   ├── suit_declarations.rs  # Suit declaration logic
│   └── validation.rs        # Card game validation
│
└── error.rs                  # Custom error types
```

## Entry Point: `lib.rs`

The `lib.rs` file defines the Anchor program module with all instruction handlers:

```rust
#[program]
pub mod ocentra_games {
    // Instruction handlers delegate to organized modules
    pub fn create_match(...) -> Result<()> {
        instructions::games::match_lifecycle::create_match::handler(...)
    }
    
    pub fn submit_move(...) -> Result<()> {
        instructions::games::moves::submit_move::handler(...)
    }
    
    // ... more instructions
}
```

Each instruction handler:
1. Receives a `Context` with accounts and instruction data
2. Delegates to the appropriate handler module
3. Returns `Result<()>` for success or error

## State Management (`state/`)

### MatchState (`match_state.rs`)
Stores match information:
- Match ID (UUID string, truncated to 31 bytes)
- Game type and configuration
- Players (up to 4)
- Current phase (waiting, playing, ended)
- Current player index
- Match flags and metadata
- Timestamps (created, started, ended)

### MoveState (`move_state.rs`)
Stores individual move information:
- Match ID and player
- Action type and payload
- Nonce (for replay protection)
- Timestamp

### GameRegistry (`game_registry.rs`)
Stores registered games:
- Game ID, name, version
- Min/max players
- Rule engine URL
- Enabled status

### UserAccount (`user_account.rs`)
Stores user economic state:
- Game Points (GP) balance
- AI Credits (AC) balance
- Subscription status
- Daily login streak
- Leaderboard scores

## Instructions (`instructions/`)

### Common Instructions

#### Registry (`common/registry/`)
- `initialize_registry`: Initialize the game registry
- `register_game`: Register a new game type
- `update_game`: Update game configuration

#### Match Lifecycle (`games/match_lifecycle/`)
- `create_match`: Create a new match with UUID
- `join_match`: Player joins a match
- `start_match`: Start the match (requires minimum players)
- `commit_hand`: Commit hand hash (for card games)
- `end_match`: End the match and record final state
- `anchor_match_record`: Anchor match record with hash

#### Moves (`games/moves/`)
- `submit_move`: Submit a single move with replay protection
- `submit_batch_moves`: Submit up to 5 moves in one transaction

#### Economic (`common/economic/`)
- `game_payment`: Pay GP to start a game
- `daily_login`: Claim daily login reward
- `claim_ad_reward`: Claim ad viewing reward
- `purchase_subscription`: Purchase pro subscription
- `purchase_ai_credits`: Purchase AI credits
- `consume_ai_credits`: Consume AI credits for AI usage

#### Disputes (`common/disputes/`)
- `flag_dispute`: Flag a dispute with evidence
- `resolve_dispute`: Resolve a dispute (validator action)

### Instruction Pattern

Each instruction follows this pattern:

```rust
// In instructions/games/moves/submit_move.rs
pub fn handler(
    ctx: Context<SubmitMove>,
    match_id: String,
    user_id: String,
    action_type: u8,
    payload: Vec<u8>,
    nonce: u64,
) -> Result<()> {
    // 1. Load accounts
    let match_account = &mut ctx.accounts.match_account;
    let move_account = &mut ctx.accounts.move_account;
    
    // 2. Validate state
    require!(match_account.phase == 1, ErrorCode::InvalidPhase);
    require!(match_account.current_player == player_index, ErrorCode::NotPlayerTurn);
    
    // 3. Validate replay protection
    require!(nonce > match_account.last_nonce, ErrorCode::InvalidNonce);
    
    // 4. Dispatch to game-specific handler
    games::dispatcher::handle_move(ctx, action_type, payload)?;
    
    // 5. Update state
    match_account.move_count += 1;
    match_account.current_player = (match_account.current_player + 1) % match_account.player_count;
    
    Ok(())
}
```

## Game System (`games/`)

### Game Trait (`trait_def.rs`)
Defines the interface all games must implement:
- `validate_move`: Validate move according to game rules
- `apply_move`: Apply move and update game state
- `check_win_condition`: Check if game is won

### Dispatcher (`dispatcher.rs`)
Routes moves to game-specific handlers based on game type:
```rust
pub fn handle_move(ctx: Context, action_type: u8, payload: Vec<u8>) -> Result<()> {
    match game_type {
        0 => claim::handle_move(ctx, action_type, payload),
        _ => Err(ErrorCode::InvalidGameType.into()),
    }
}
```

### CLAIM Game (`claim/`)
Implementation of the CLAIM card game:
- **Actions** (`actions.rs`): Action types (PICK_UP, DECLINE, DECLARE_INTENT, etc.)
- **Rules** (`rules.rs`): Game rules and state transitions
- **Validation** (`validation.rs`): CLAIM-specific move validation

## Common Utilities (`common/`)

### Validation Base (`validation_base.rs`)
Base validation functions:
- Match ID format validation (UUID)
- User ID validation
- Payload size limits
- Phase validation

### Replay Protection (`replay_protection.rs`)
Nonce-based replay protection:
- Ensures nonces are strictly increasing
- Prevents replay attacks
- Tracks last nonce per player

## Card Game Utilities (`card_games/`)

Shared utilities for card games:
- **Hand Management**: Track player hands, validate hand sizes
- **Floor Card**: Manage floor card state and reveals
- **Suit Declarations**: Validate and track suit declarations
- **Validation**: Card game-specific validation logic

## Error Handling (`error.rs`)

Custom error codes using Anchor's error system:

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid match ID format")]
    InvalidMatchId,
    #[msg("Match is not in the correct phase")]
    InvalidPhase,
    #[msg("Not player's turn")]
    NotPlayerTurn,
    #[msg("Invalid nonce (replay protection)")]
    InvalidNonce,
    // ... more errors
}
```

## Account Constraints

Anchor uses constraints to validate accounts:

```rust
#[derive(Accounts)]
pub struct SubmitMove<'info> {
    #[account(mut)]
    pub match_account: Account<'info, MatchState>,
    
    #[account(
        init,
        payer = player,
        space = 8 + MoveState::LEN,
        seeds = [b"move", match_id.as_bytes(), player.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub move_account: Account<'info, MoveState>,
    
    #[account(mut)]
    pub player: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
```

Constraints:
- `mut`: Account is mutable
- `init`: Initialize account (creates PDA)
- `payer`: Who pays for account creation
- `space`: Account size in bytes
- `seeds`: PDA derivation seeds
- `bump`: PDA bump seed

## PDA (Program Derived Address) Derivation

PDAs are deterministic addresses derived from seeds:

```rust
// Match PDA
let (match_pda, _bump) = Pubkey::find_program_address(
    &[b"match", match_id.as_bytes()],
    program_id
);

// Move PDA
let (move_pda, _bump) = Pubkey::find_program_address(
    &[b"move", match_id.as_bytes(), player.as_ref(), &nonce.to_le_bytes()],
    program_id
);
```

**Important**: Match IDs are truncated to 31 bytes to fit in PDA seeds (32-byte limit).

## Testing

Tests are written in TypeScript (see `tests/README.md`). The Rust program is tested by:
1. Building the program (`anchor build`)
2. Generating IDL (`target/idl/ocentra_games.json`)
3. TypeScript tests use the IDL to call instructions
4. Tests verify account state and error handling

## Building and Deploying

### Build
```bash
anchor build
```

Generates:
- `target/deploy/ocentra_games.so` - BPF bytecode
- `target/idl/ocentra_games.json` - IDL for TypeScript client

### Deploy
```bash
anchor deploy
```

Deploys to the cluster specified in `Anchor.toml`.

## Program ID

**Program ID**: `7eWx3H8bXMif7SDyPS1j5LZw1yUGDNZY592WzEKNf696`

Defined in:
- `lib.rs`: `declare_id!("7eWx3H8bXMif7SDyPS1j5LZw1yUGDNZY592WzEKNf696")`
- `Anchor.toml`: `[programs.devnet]` and `[programs.mainnet]`

## Key Design Decisions

### 1. Organized Instruction Modules
Instructions are organized by category (`common/` vs `games/`) for maintainability.

### 2. Game Trait System
Games implement a trait for extensibility. New games can be added by implementing the trait.

### 3. Replay Protection
Nonce-based system prevents replay attacks and ensures move ordering.

### 4. Batch Moves
Up to 5 moves can be submitted in one transaction for efficiency, but only for the same player's turn to prevent deadlocks.

### 5. Economic Model
Separate accounts for user economic state (GP, AC, subscriptions) separate from game logic.

### 6. Dispute System
On-chain dispute flagging and resolution for validator consensus.

## Adding New Instructions

1. Add handler function in appropriate module (`instructions/common/` or `instructions/games/`)
2. Add instruction to `lib.rs` `#[program]` module
3. Define accounts struct with `#[derive(Accounts)]`
4. Add error codes if needed in `error.rs`
5. Write tests in TypeScript
6. Run `anchor build` to regenerate IDL
7. Tests automatically get new instruction types

## Adding New Games

1. Create game module in `games/` (e.g., `games/poker/`)
2. Implement `GameTrait` from `games/trait_def.rs`
3. Add game to dispatcher in `games/dispatcher.rs`
4. Register game in tests using `register_game` instruction
5. Write game-specific tests in `tests/games/poker/`

## Resources

- **Anchor Documentation**: https://www.anchor-lang.com/
- **Solana Documentation**: https://docs.solana.com/
- **Test System**: See `../../tests/README.md`
- **Main Crate**: See `../../README.md`

