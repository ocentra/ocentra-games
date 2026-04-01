# Scripts Directory

Organized scripts for development, build, testing, and utilities.

## Structure

### `build/` - Build & Deployment Tools

- **verify-build.js** - Verifies build output (used in build process)
- **upload-assets.ts** - Uploads assets to R2 storage

### `dev/` - Development Tools

- **dev.ts** - Development server manager with port management
- **dev/dev-interactive.ts** - Interactive launcher for web/tauri/editor flows with shared backend reuse

### `solana/verification/` - Solana Match Verification Tools

- **canonicalize.ts** - CLI tool to canonicalize match records
- **verify-match.ts** - CLI tool to verify a single match record
- **upload-match.ts** - CLI tool to upload match records to R2 and anchor on Solana
- **verify-matches.ts** - Batch verification of match records

### `firebase/` - Firebase Tools

- **debug-auth.cjs** - Debug Firebase authentication
- **test-firebase.cjs** - Test Firebase configuration

### `assets/` - Asset Tools

- **debug-sync.ts** - Debug asset synchronization

### `test/` - Testing & Performance

- **monitoring/** - Monitoring scripts
- **measure-costs/** - Cost measurement scripts
- **load-test/** - Load testing scripts
- **runallwith-solana-test.ps1** - Solana test runner

## Usage

Most scripts are run via npm scripts defined in `package.json`:

```bash
npm run dev              # Start dev server
npm run build            # Build (includes verify-build)
npm run upload-assets    # Upload assets to R2
npm run verify:matches   # Verify match records
npm run debug:auth       # Debug Firebase authentication
npm run test:firebase    # Test Firebase configuration
tsx scripts/assets/debug-sync.ts  # Debug asset synchronization
```

For CLI tools in `solana/verification/`, run directly:

```bash
tsx scripts/solana/verification/canonicalize.ts <input> [output]
tsx scripts/solana/verification/verify-match.ts <matchId> [matchRecordPath]
tsx scripts/solana/verification/upload-match.ts --file <path> --upload r2
```

## Notes

- Test scripts in `test/` are for performance analysis and may require specific setup
- All scripts use `@/` path aliases configured in `tsconfig.node.json`

## Build Orchestration

- Domain package builds are orchestrated with Turbo through root scripts.
- `npm run build:domains` runs `turbo run build --filter=./packages/* --filter=!@ocentra/asset-editor`.
- `npm run validate` runs `turbo run lint type-check`.
- `npm run pretest` runs `build:domains` before tests.
- `npm run predev` runs `generate:exports-flattened`.
- The root `build` script runs registry/export generation, TypeScript build, Vite build, then build verification.
- Dev launcher flows can reuse shared worker/Turbo warm state between main app and editor starts to avoid duplicate backend startup.
