# Test System Architecture

This directory contains the core test infrastructure with enforced contracts and auto-registration.

## Overview

The test system provides:
- **Interface-based contracts**: All tests implement `ITest` or extend `BaseTest`
- **Auto-registration**: Tests register themselves on construction
- **Organized structure**: One test per file, organized by category
- **Enforced rules**: Clear patterns that developers must follow

## Architecture

### Core Components

1. **`types.ts`**: Type definitions and interfaces
   - `ITest`: Contract all tests must implement
   - `TestMetadata`: Required test metadata
   - `TestCategory`: Test classification
   - `ClusterRequirement`: Cluster execution requirements

2. **`base.ts`**: Base test class
   - `BaseTest`: Abstract base class with common functionality
   - Provides assertion helpers
   - Handles setup/teardown
   - Enforces contract

3. **`registry.ts`**: Test registry system
   - Auto-discovers all tests
   - Provides querying capabilities
   - Tracks test metadata

4. **`loader.ts`**: Test loader
   - Ensures all tests are loaded before Mocha runs
   - Provides discovery utilities

5. **`mocha-adapter.ts`**: Mocha integration
   - Adapts ITest interface to Mocha's framework
   - Organizes tests by category

## Test Pattern

### Required Pattern

Every test file must follow this pattern:

```typescript
import { BaseTest } from '../core/base';
import { TestCategory, ClusterRequirement } from '../core/types';

class MyTestNameTest extends BaseTest {
  constructor() {
    super({
      id: 'my-test-name',  // Must match file name (without .test.ts)
      name: 'Human Readable Test Name',
      description: 'What this test verifies',
      tags: {
        category: TestCategory.LIFECYCLE,  // Required
        cluster: ClusterRequirement.ANY,   // Required
        game: 'claim',                     // Optional: game-specific
        requiresSetup: true,               // Optional: needs setup
        requiresRegistry: true,            // Optional: needs registry
        expensive: false,                  // Optional: skip on devnet
      },
    });
  }

  async run(): Promise<void> {
    // Test implementation here
    this.assertEqual(actual, expected);
  }
}

// Auto-register on construction
const _test = new MyTestNameTest();
```

### File Organization

Tests are organized in a clear folder structure:

```
tests/
  core/              # Core test infrastructure
    types.ts
    base.ts
    registry.ts
    loader.ts
    mocha-adapter.ts
  
  common/            # Common tests (shared across games)
    setup/           # Setup tests
      program-loaded.test.ts
      accounts-have-sol.test.ts
      ...
    
    registry/        # Registry tests
      register-game.test.ts
      update-game.test.ts
      ...
    
    lifecycle/       # Match lifecycle tests
      create-match.test.ts
      join-match.test.ts
      start-match.test.ts
      ...
    
    moves/           # Move tests (common)
      submit-move.test.ts
      batch-moves.test.ts
      ...
    
    errors/          # Error case tests
      invalid-payload.test.ts
      unauthorized.test.ts
      ...
    
    stress/          # Stress tests
      multiple-matches.test.ts
      rapid-creation.test.ts
      ...
  
  games/
    claim/           # CLAIM-specific tests
      moves/
        declare-intent.test.ts
        pick-up-floor-card.test.ts
        ...
      actions/
        reveal-floor-card.test.ts
        ...
      validation/
        turn-validation.test.ts
        ...
```

### Naming Convention

- **File names**: `kebab-case.test.ts` (e.g., `creates-claim-match.test.ts`)
- **Class names**: `PascalCaseTest` (e.g., `CreatesClaimMatchTest`)
- **Test IDs**: Match file name without extension (e.g., `creates-claim-match`)
- **Test names**: Human-readable description

## Test Categories

### SETUP
Basic setup and configuration tests that verify the environment.

### REGISTRY
Game registry functionality (register, update, query games).

### LIFECYCLE
Match lifecycle operations (create, join, start, end).

### MOVES
Game moves and actions (submit move, batch moves).

### ERRORS
Error handling and edge cases (invalid inputs, unauthorized access).

### STRESS
Performance and stress tests (high transaction volume, rapid operations).

### GAME_SPECIFIC
Game-specific tests (CLAIM, Poker, etc.).

## Cluster Requirements

### ANY
Test runs on any cluster (localnet, devnet, mainnet).

### LOCALNET_ONLY
Test runs only on localnet (stress tests, expensive operations).

### DEVNET_ALLOWED
Test runs on localnet and devnet (with rate limiting).

### MAINNET_ONLY
Test requires mainnet (production validation).

## Best Practices

1. **One test per file**: Each test file contains exactly one test class
2. **Clear naming**: File and class names should clearly describe what's tested
3. **Proper categorization**: Use correct category for organization
4. **Tag appropriately**: Set cluster requirements and expensive flags correctly
5. **Use base helpers**: Leverage BaseTest assertion helpers
6. **Dynamic imports**: Import helpers dynamically to avoid circular dependencies
7. **Auto-register**: Instantiate test class at module level for auto-registration

## Example Migration

### Before (Old Pattern)
```typescript
// In match-lifecycle.test.ts
describe("Match Lifecycle", function() {
  it("Creates a CLAIM match with proper UUID", async () => {
    // Test code
  });
});
```

### After (New Pattern)
```typescript
// In common/lifecycle/creates-claim-match.test.ts
import { BaseTest } from '../../core/base';
import { TestCategory, ClusterRequirement } from '../../core/types';

class CreatesClaimMatchTest extends BaseTest {
  constructor() {
    super({
      id: 'creates-claim-match',
      name: 'Creates a CLAIM match with proper UUID',
      description: 'Verifies match creation with valid UUID',
      tags: {
        category: TestCategory.LIFECYCLE,
        cluster: ClusterRequirement.ANY,
        game: 'claim',
        requiresSetup: true,
        requiresRegistry: true,
      },
    });
  }

  async run(): Promise<void> {
    // Test code
  }
}

const _test = new CreatesClaimMatchTest();
```

## Migration Plan

1. ✅ Create core infrastructure (types, base, registry, loader)
2. ⏳ Create example test showing the pattern
3. ⏳ Migrate existing tests one by one
4. ⏳ Organize into folder structure
5. ⏳ Update documentation
6. ⏳ Remove old test files

