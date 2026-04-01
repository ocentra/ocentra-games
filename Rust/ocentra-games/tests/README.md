# Test Suite Structure

This directory contains a comprehensive, organized test suite for the Ocentra Games Solana program.

## Directory Structure

Tests are organized into a clear hierarchical structure:

```
tests/
├── core/                    # Test infrastructure and framework
│   ├── base.ts             # Base test class (BaseTest)
│   ├── types.ts            # Type definitions (ITest, TestMetadata)
│   ├── registry.ts         # Test registry system
│   ├── loader.ts           # Test loader and discovery
│   ├── test-decorator.ts   # Mocha integration
│   └── README.md           # Core infrastructure documentation
│
├── common/                  # Common tests (shared across all games)
│   ├── setup/              # Setup and initialization tests
│   │   ├── program-loaded.test.ts
│   │   ├── authority-has-sol.test.ts
│   │   ├── check-registry-exists.test.ts
│   │   └── ...
│   │
│   ├── registry/            # Game registry tests
│   │   ├── register-first-game.test.ts
│   │   ├── register-new-game.test.ts
│   │   ├── update-game.test.ts
│   │   └── ...
│   │
│   ├── lifecycle/          # Match lifecycle tests
│   │   ├── create-claim-match.test.ts
│   │   ├── players-join-match.test.ts
│   │   ├── start-match-minimum.test.ts
│   │   ├── end-match.test.ts
│   │   └── ...
│   │
│   ├── errors/             # Error handling tests
│   │   ├── fail-move-player-not-in-match.test.ts
│   │   ├── fail-move-invalid-action-type.test.ts
│   │   ├── fail-create-invalid-match-id-formats.test.ts
│   │   └── ...
│   │
│   ├── stress/             # Stress and performance tests
│   │   ├── batch-moves-sequence.test.ts
│   │   ├── multiple-matches-simultaneous.test.ts
│   │   └── rapid-sequential-creation.test.ts
│   │
│   ├── setup.ts            # Setup utilities
│   ├── cluster.ts          # Cluster detection utilities
│   ├── pda.ts              # PDA derivation helpers
│   ├── test-context.ts     # TestContext for better error messages
│   ├── test-data.ts        # Test data access
│   ├── match-helpers.ts    # Match creation helpers
│   ├── errors.ts           # Error handling utilities
│   ├── assertions.ts       # Custom assertion helpers
│   └── index.ts            # Common utilities re-exports
│
├── games/                   # Game-specific tests
│   └── claim/              # CLAIM game tests
│       ├── helpers.ts      # CLAIM-specific helpers
│       └── moves/         # CLAIM move tests
│           ├── declare-intent.test.ts
│           ├── call-showdown.test.ts
│           ├── commit-hand-hash.test.ts
│           ├── batch-moves-same-player.test.ts
│           └── ...
│
├── helpers.ts              # Main helpers (re-exports from common/)
├── root-hooks.ts           # Mocha root hooks for test reporting
├── mocha-hooks.ts          # Mocha integration hooks
├── report-generator.ts     # Test report generation
├── test-data-loader.ts     # Test data loading utilities
├── ocentra-games.ts        # Program client setup
└── README.md               # This file
```

## Test Organization

### Core Infrastructure (`core/`)

The core test infrastructure provides:
- **Base Test Class**: `BaseTest` abstract class that all tests extend
- **Test Registry**: Auto-discovery and registration system
- **Type Definitions**: `ITest` interface, `TestMetadata`, test categories
- **Mocha Integration**: Adapts test system to Mocha framework

See `core/README.md` for detailed documentation.

### Common Tests (`common/`)

Tests that apply to all games, organized by category:

#### Setup Tests (`common/setup/`)
- Verify program is loaded
- Check accounts have SOL
- Verify registry exists
- Derive PDAs correctly

#### Registry Tests (`common/registry/`)
- Register first game
- Register additional games
- Update game configuration
- Fetch registry data
- Handle invalid parameters

#### Lifecycle Tests (`common/lifecycle/`)
- Create matches with proper UUIDs
- Players join matches
- Start matches with minimum players
- End matches and anchor records
- Handle invalid phases and states

#### Error Tests (`common/errors/`)
- Invalid match IDs
- Invalid action types
- Player not in match
- Wrong phase for operation
- Payload too large
- Unauthorized access

#### Stress Tests (`common/stress/`)
- Batch move sequences
- Multiple simultaneous matches
- Rapid sequential creation
- High transaction volume

### Game-Specific Tests (`games/`)

Tests specific to individual games:

#### CLAIM Game (`games/claim/`)
- CLAIM-specific moves (declare intent, call showdown)
- Hand commitment
- Batch moves for same player
- CLAIM action validation

### Helper Files

- **`helpers.ts`**: Main entry point, re-exports from `common/` and `games/claim/`
- **`root-hooks.ts`**: Mocha root hooks for automatic test result capture
- **`report-generator.ts`**: Generates markdown test reports
- **`test-data-loader.ts`**: Loads canonical test data from `test-data/` directory

## Running Tests

### Quick Start

```bash
# Run ALL tests (default behavior)
anchor test

# Run only simple tests (skip complex setup)
yarn test:simple
# OR
SIMPLE_TESTS=true anchor test

# Run tests and generate report
yarn test:report

# Run specific test file (using mocha - requires Anchor env setup)
npx mocha tests/game-registry.test.ts

# Run with verbose output
anchor test -- --verbose
```

### Test Reports

After running tests, a formatted markdown report is automatically generated in the `test-reports/` directory.

**Report includes:**
- Date, time, and timestamp
- Environment information (cluster, program ID, Node version, platform)
- Test summary (total, passed, failed, skipped, duration)
- Detailed test results by suite
- Failed test details with error messages, context, and stack traces

**Report location:** `test-reports/test-report-YYYY-MM-DD-HHMMSS.md`

**Example:**
```bash
anchor test
# ... tests run ...
# 📄 Test report saved to: test-reports/test-report-2024-01-15T14-30-45.md
```

**Note:** 
- **Default (`anchor test`)**: Runs ALL tests - simple, game-registry, match-lifecycle, moves, match-end, error-cases, localnet-only, and phase2-registry
- **Simple mode (`SIMPLE_TESTS=true anchor test`)**: Only runs `simple.test.ts`, skips all complex test suites

### ⚠️ About the "websocket error"

You may see `Error: websocket error` at the start of test runs. **This is harmless and can be ignored.**

- Anchor tries to connect to the validator's websocket for real-time updates
- The HTTP RPC connection still works perfectly for all tests
- This is a known Anchor quirk when using localnet
- Tests will run normally despite this error message

### Understanding Anchor Test vs Deploy

#### Local Testing (Recommended for Development)

**Command:** `anchor test`

**What happens:**
1. ✅ Builds the program (`anchor build`)
2. ✅ Starts a local Solana validator automatically
3. ✅ Deploys the program to the local validator
4. ✅ Runs all tests in `tests/` directory
5. ✅ Cleans up (kills local validator)

**Configuration:** `Anchor.toml` → `[provider]` → `cluster = "localnet"`

**Pros:**
- Fast (no network latency)
- No airdrop limits
- Isolated (doesn't affect devnet)
- Free (no real SOL needed)

**Cons:**
- Not testing against real network conditions
- Local validator may behave slightly differently

#### Devnet Testing (For Real Network Testing)

**Step 1: Deploy to Devnet**
```bash
# Change Anchor.toml: cluster = "devnet"
anchor deploy
```

**Step 2: Run Tests Against Devnet**
```bash
anchor test
# OR if you want to skip local validator:
anchor test --skip-local-validator
```

**What happens:**
1. ✅ Tests run against the **already deployed** program on devnet
2. ✅ Uses real devnet network
3. ✅ Tests real network conditions (latency, airdrop limits, etc.)

**Configuration:** `Anchor.toml` → `[provider]` → `cluster = "devnet"`

**Pros:**
- Tests real network conditions
- Validates airdrop/transaction behavior
- Tests against actual devnet infrastructure

**Cons:**
- Slower (network latency)
- Airdrop limits (can fail)
- Costs real devnet SOL
- Requires manual deployment first

### Recommended Workflow

#### Phase 1: Local Development & Testing
```bash
# 1. Make code changes
# 2. Test locally (fast iteration)
anchor test

# 3. Fix any issues
# 4. Repeat until all tests pass
```

#### Phase 2: Devnet Validation
```bash
# 1. Update Anchor.toml: cluster = "devnet"
# 2. Deploy to devnet
anchor deploy

# 3. Run tests against devnet
anchor test

# 4. Verify everything works on real network
```

#### Phase 3: Mainnet Deployment
```bash
# 1. Update Anchor.toml: cluster = "mainnet"
# 2. Deploy to mainnet (requires mainnet SOL)
anchor deploy --provider.cluster mainnet

# 3. Test manually or with integration tests
```

### Key Points

1. **`anchor test` ALWAYS deploys** - but to different places:
   - Local validator (if `cluster = "localnet"`)
   - Devnet (if `cluster = "devnet"` and program already deployed)

2. **For devnet, deploy first** - `anchor deploy` updates the program on devnet, then `anchor test` tests against it

3. **Local testing is faster** - Use it for development, then validate on devnet before mainnet

### Commands Reference

```bash
# Local testing (current setup)
anchor test

# Build only
anchor build

# Deploy to devnet
anchor deploy

# Test against devnet (after deploying)
anchor test  # (with cluster = "devnet" in Anchor.toml)

# Check program on devnet
solana program show 7eWx3H8bXMif7SDyPS1j5LZw1yUGDNZY592WzEKNf696 --url devnet
```

## Test Coverage

### ✅ Covered Features

- Game Registry System
- Match Creation & Lifecycle
- Player Joining (with capacity limits)
- Match Starting (with minimum player validation)
- Move Submission (individual and batch)
- Hand Commitment
- Match Ending
- Error Handling (unauthorized, invalid payloads, state validation)

### Test Execution by Cluster

#### Localnet (Default)
- **All tests run** - No rate limits, unlimited transactions
- Fast execution, ideal for development
- Full test coverage including stress tests

#### Devnet
- **Core functionality tests** - Essential tests only
- **Smart airdrop handling** - Only airdrops if balance is low
- **Limited game registration** - Only registers CLAIM game (not all games)
- **Localnet-only tests skipped** - Stress tests and high-volume tests are skipped
- **Error case tests** - May be skipped if rate limits are a concern (configurable)

**Tests that run on devnet:**
- ✅ Basic match creation
- ✅ Player joining
- ✅ Match starting
- ✅ Move submission (individual)
- ✅ Match ending
- ✅ Game registry (essential games only)
- ✅ Basic error cases (unauthorized, invalid phase)

**Tests skipped on devnet:**
- ⏭️ Stress tests (multiple matches, rapid creation)
- ⏭️ Comprehensive error case testing (creates matches just to test errors)
- ⏭️ Batch operations stress tests
- ⏭️ All tests in `localnet-only.test.ts`

### ⚠️ Not Yet Tested (Future Phases)

- Economic Model (GP, AC, subscriptions) - See `plan.plan.md` for implementation plan
- Dispute System
- Batch Anchoring
- Signer Registry
- Validator Slashing

## Test Helpers

### Common Setup Functions

- `setupGameRegistry()` - Initializes GameRegistry and registers CLAIM game
- `initializeTestAccounts()` - Airdrops SOL to test accounts
- `createStartedMatch(matchId, numPlayers)` - Creates a match with players joined and started

### Test Context & Logging (NEW - Use for Meaningful Errors)

- `createTestContext(testName)` - Creates a test context with meaningful IDs and logging
- `TestContext` class - Provides structured logging and error messages with full context
  - `ctx.set(key, value)` - Store test context (match IDs, PDAs, etc.)
  - `ctx.log(message)` - Log with test name prefix
  - `ctx.error(message, error)` - Throw error with full context
  - `ctx.expect(condition, message)` - Assertion with context
  - `ctx.finish()` - Mark test as completed

### Consolidated Helpers (DRY - Avoid Duplication)

- `checkGameRegistryStatus(ctx?)` - Checks if GameRegistry exists and is valid (consolidates logic from simple.test.ts and phase2-registry.test.ts)
- `createMatchWithContext(ctx, matchId, gameId, seed)` - Creates match with full context logging
- `expectAnchorError(ctx, error, expectedCode)` - Asserts Anchor errors with context

### PDA Helpers

- `getMatchPDA(matchId)` - Derives match PDA (truncates match_id to 31 bytes)
- `getRegistryPDA()` - Derives GameRegistry PDA
- `getMovePDA(matchId, player, nonce)` - Derives move PDA
- `getBatchMovePDA(matchId, player, index)` - Derives batch move PDA

### Test Data Access

- `generateUniqueMatchId(suffix?)` - Generates unique match IDs based on test data (36 chars)
- `getTestMatchId()` - Gets base match ID from test data
- `getTestUserId(index)` - Gets real user ID from test data by index
- `getTestSeed()` - Gets real seed from test data
- `getTestMatchHash()` - Gets real match hash from test data
- `getTestHotUrl()` - Gets real hot URL from test data
- `getTestGame(gameId)` - Gets game definition from test data
- `airdrop(pubkey, amount)` - Airdrops SOL with retry logic

### Test Data

All tests use **real test data** from the `test-data/` directory:
- **No mocks/stubs** - All data comes from canonical test data files
- **Realistic data** - Test data matches production format
- **Consistent** - Same data used across all test layers (Rust → Solana → Cloudflare)

Test data files:
- `test-data/matches/` - Canonical match records
- `test-data/games/` - Game registry entries
- `test-data/users/` - User account data
- `test-data/disputes/` - Dispute records

## Best Practices

1. **Isolation**: Each test file should be independent and can run in any order
2. **Cleanup**: Tests use unique match IDs to avoid conflicts
3. **Error Testing**: Always test both success and failure cases
4. **State Validation**: Verify account state after each operation
5. **Reusability**: Use helper functions from `helpers.ts` to avoid duplication
6. **Meaningful Errors**: Use `TestContext` to log IDs, PDAs, and context so errors are actionable
7. **DRY Principle**: Use consolidated helpers (`checkGameRegistryStatus`, `createMatchWithContext`) instead of duplicating logic

### Using TestContext for Better Error Messages

```typescript
it("Creates a match", async () => {
  const ctx = createTestContext("Creates a match");
  const matchId = generateUniqueMatchId("test");
  
  ctx.set('matchId', matchId);
  ctx.set('gameId', 0);
  
  try {
    const [matchPDA] = await createMatchWithContext(ctx, matchId, 0, seed);
    ctx.log("✓ Match created successfully");
  } catch (err) {
    ctx.error("Failed to create match", err); // Includes full context in error
  }
  
  ctx.finish();
});
```

When a test fails, you'll see:
```
[Creates a match] Failed to create match
Context:
  matchId: abc123-def4-5678-9012-345678901234
  gameId: 0
  matchPDA: 7eWx3H8bXMif7SDyPS1j5LZw1yUGDNZY592WzEKNf696
Error: ConstraintSeeds...
```

This makes debugging much easier!

## Current Configuration

- **Local Testing:** `cluster = "localnet"` ✅
- **Program ID:** `7eWx3H8bXMif7SDyPS1j5LZw1yUGDNZY592WzEKNf696`
- **Test Files:** 
  - `game-registry.test.ts`
  - `match-lifecycle.test.ts`
  - `moves.test.ts`
  - `match-end.test.ts`
  - `error-cases.test.ts`

## Notes

- All tests use proper UUID format (36 characters) for match IDs
- GameRegistry must be initialized before creating matches
- Tests assume CLAIM game (game_id = 0) is registered in GameRegistry
- Batch moves are restricted to same player's turn to prevent deadlocks

## Devnet Rate Limit Handling

### Automatic Optimizations

1. **Smart Airdrops**: On devnet, only airdrops if account balance < 0.5 SOL
2. **Limited Game Registration**: On devnet, only registers CLAIM game (not all games)
3. **Conditional Test Execution**: Tests automatically detect cluster and skip expensive tests on devnet

### Test Execution Flags

Tests use flags to control execution based on cluster:

```typescript
// In helpers.ts
export const TEST_FLAGS = {
  SKIP_EXPENSIVE_ON_DEVNET: true,  // Skip expensive tests on devnet
  RUN_STRESS_TESTS: isLocalnet(),  // Only on localnet by default
  RUN_COMPREHENSIVE_ERROR_TESTS: isLocalnet(),  // Only on localnet by default
  FORCE_ALL_TESTS: false,  // Override all flags
};
```

### Environment Variables

Control test execution with environment variables:

```bash
# Run stress tests on devnet
RUN_STRESS_TESTS=true anchor test

# Run comprehensive error tests on devnet
RUN_ERROR_TESTS=true anchor test

# Force all tests (override all flags)
FORCE_ALL_TESTS=true anchor test

# Disable expensive test skipping
SKIP_EXPENSIVE_TESTS=false anchor test
```

### Running Tests

```bash
# Localnet (all tests, fast) - DEFAULT
anchor test  # cluster = "localnet" in Anchor.toml

# Devnet (essential tests only, respects rate limits)
# 1. Update Anchor.toml: cluster = "devnet"
# 2. anchor deploy
# 3. anchor test

# Devnet with stress tests (if needed)
RUN_STRESS_TESTS=true anchor test

# Devnet with all tests (not recommended - may hit rate limits)
FORCE_ALL_TESTS=true anchor test
```

### Test Categories

- **Core Tests** (always run): Basic functionality, essential operations
- **Stress Tests** (localnet only by default): Multiple matches, rapid operations
- **Error Tests** (localnet only by default): Comprehensive error case testing
- **Expensive Tests** (skipped on devnet by default): Tests that create many transactions

