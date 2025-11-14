# Solana Games Program

On-chain Solana program for managing multiplayer games (card games, word puzzles, etc.).

## Overview

This Anchor program provides on-chain game state management for multiplayer matches across multiple game types. All game state and moves are stored on Solana, ensuring verifiability and immutability. Currently supports CLAIM card game, with architecture designed to support additional games.

## Architecture

- **Match Account**: Stores match metadata, player list, phase, and final hash
- **Move Accounts**: Individual move records linked to matches via PDAs
- **Instructions**: 
  - `create_match(game_type, seed)`: Initialize a new match with specific game type
  - `join_match`: Player joins a match (game-specific min/max players)
  - `start_match`: Start the match (requires game-specific minimum players)
  - `submit_move`: Player submits a game move
  - `end_match`: Finalize match and record hash
  - `anchor_match_record`: Anchor match record hash after completion

## Supported Game Types

- `0`: **CLAIM** - Min: 2, Max: 4 players
- `1`: **ThreeCardBrag** - Min: 2, Max: 6 players
- `2`: **Poker** - Min: 2, Max: 10 players
- `3`: **Bridge** - Min: 4, Max: 4 players
- `4`: **Rummy** - Min: 2, Max: 6 players
- `5`: **Scrabble** - Min: 2, Max: 4 players
- `6`: **WordSearch** - Min: 1, Max: 10 players
- `7`: **Crosswords** - Min: 1, Max: 10 players

## Setup

### Prerequisites

1. Install Rust: https://rustup.rs/
2. Install Solana CLI: https://docs.solana.com/cli/install-solana-cli-tools
3. Install Anchor: `cargo install --git https://github.com/coral-xyz/anchor avm --locked --force`

### Build

```bash
cd Rust/SolanaContract
anchor build
```

### Deploy to Devnet

```bash
# Set to devnet
solana config set --url devnet

# Airdrop SOL (if needed)
solana airdrop 2

# Deploy
anchor deploy
```

### Run Tests

```bash
anchor test
```

## Program Structure

```
src/
├── lib.rs                 # Main program entry point
├── state/                 # Account state definitions
│   ├── mod.rs
│   ├── match_state.rs     # Match account struct
│   └── move_state.rs      # Move account struct
├── instructions/          # Instruction handlers
│   ├── mod.rs
│   ├── create_match.rs
│   ├── join_match.rs
│   ├── submit_move.rs
│   ├── end_match.rs
│   └── anchor_match_record.rs
├── validation.rs          # Game rule validation
└── error.rs               # Custom error codes
```

## Game Phases

- `0` (Dealing): Players joining, initial setup
- `1` (Playing): Active gameplay, moves being submitted
- `2` (Ended): Match completed, hash recorded

## Action Types

- `0`: Pick Up
- `1`: Decline
- `2`: Declare Intent
- `3`: Call Showdown
- `4`: Rebuttal

## Notes

- Program ID is generated on first build - update `Anchor.toml` and `lib.rs` after deployment
- Match accounts use PDAs with seeds: `["match", match_id]`
- Move accounts use PDAs with seeds: `["move", match_id, move_index]`
- Player limits: Game-specific (see Supported Game Types above)
- Each game type has its own min/max player requirements stored on-chain
- All moves are validated on-chain before state updates

