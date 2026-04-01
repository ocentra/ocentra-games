# Shared Test Data

**Location:** `test-data/` at repo root — single source of truth for test fixtures.  
Realistic data for E2E tests (Rust/Anchor, TypeScript, Cloudflare). No mocks — we use real JSON fixtures.

## Purpose

- **Mock DATA (not mock tests)**: Realistic test data that flows through the entire system
- **E2E Consistency**: Same data used in Rust tests → Solana → Cloudflare → TypeScript tests
- **Real System Flow**: Data format matches what flows through production (game → Solana → Cloudflare)

## Data Flow

```
Game Engine → MatchRecord (canonical JSON)
    ↓
Solana (stores hash + metadata)
    ↓
Cloudflare R2 (stores full canonical JSON)
    ↓
Tests verify consistency across all layers
```

## Files

- `matches/` - Canonical match records (MatchRecord format)
- `leaderboard/` - Leaderboard entries
- `users/` - User account data
- `games/` - Game registry entries
- `disputes/` - Dispute records
- `batches/` - Batch manifests

## Usage

### In Rust/Anchor Tests
```typescript
import { loadMatchRecord } from "../../../test-data/loaders";
const matchRecord = loadMatchRecord("claim-4player-complete");
```

### In TypeScript Tests (main app)
```typescript
import { loadMatchRecord } from "@test-data";  // alias → test-data/loaders.ts
const matchRecord = loadMatchRecord("claim-4player-complete");
```

### In Cloudflare Worker Tests
```typescript
import { loadMatchRecord } from "../../test-data/loaders";
const matchRecord = loadMatchRecord("claim-4player-complete");
```

## Format

All data follows the **canonical MatchRecord format** per spec Section 4:
- `match_id`: UUID v4
- `version`: Schema version
- `game`: { name, ruleset }
- `start_time`, `end_time`: ISO8601 UTC
- `players`: Array of PlayerRecord
- `moves`: Array of MoveRecord
- `signatures`: Array of SignatureRecord

# Shared Test Data Strategy

## Overview

We now have **shared mock data** that flows through the entire E2E test stack:
- **Rust/Anchor tests** → Solana on-chain
- **TypeScript tests** → Solana client
- **Cloudflare tests** → R2 storage

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ test-data/ (JSON files)                                 │
│ - matches/claim-4player-complete.json                   │
│ - leaderboard/claim-top100.json                         │
│ - users/sample-users.json                               │
│ - games/registry.json                                   │
│ - disputes/sample-dispute.json                          │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Rust Tests  │  │ TS Tests     │  │ Cloudflare   │
│             │  │              │  │ Tests        │
│ Uses:       │  │ Uses:        │  │ Uses:        │
│ mock-data.ts│  │ loaders.ts   │  │ loaders.ts   │
└──────┬──────┘  └──────┬───────┘  └──────┬───────┘
       │                │                  │
       └────────────────┼──────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Real System     │
              │  (Devnet/Mainnet)│
              └──────────────────┘
```

## Benefits

1. **Consistency**: Same data used across all test layers
2. **E2E Verification**: Can verify data flows correctly through entire stack
3. **Realistic**: Data matches canonical format used in production
4. **Maintainable**: Single source of truth for test data

## Usage Examples

### In Rust/Anchor Tests
```typescript
import { loadMatchRecord, generateMockLeaderboardEntries } from './helpers/mock-data';

// Load canonical match record
const matchRecord = loadMatchRecord('claim-4player-complete');

// Generate leaderboard from shared base data
const leaderboard = generateMockLeaderboardEntries(100);
```

### In TypeScript Tests
```typescript
import { loadMatchRecord, loadLeaderboardEntries } from '@test-data/loaders';

// Load canonical match record
const matchRecord = loadMatchRecord('claim-4player-complete');

// Load leaderboard entries
const leaderboard = loadLeaderboardEntries(0, 100);
```

### In Cloudflare Worker Tests
```typescript
import { loadMatchRecord } from '../../test-data/loaders';

// Load canonical match record
const matchRecord = loadMatchRecord('claim-4player-complete');
```

## Data Format

All data follows the **canonical MatchRecord format** per spec Section 4:
- `match_id`: UUID v4
- `version`: Schema version
- `game`: { name, ruleset }
- `start_time`, `end_time`: ISO8601 UTC
- `players`: Array of PlayerRecord
- `moves`: Array of MoveRecord
- `signatures`: Array of SignatureRecord

## Adding New Test Data

1. Create JSON file in appropriate directory (`test-data/matches/`, `test-data/users/`, etc.)
2. Follow canonical format
3. Update loaders if needed
4. Document in this file

## Migration Notes

- Old inline mock data generators still work (fallback)
- New loaders prefer shared JSON files
- Fallback to generated data if files not found
- Both approaches work, but shared data is preferred for E2E consistency

