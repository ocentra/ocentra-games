# Ocentra Games CI/CD Architecture

This directory contains the GitHub Actions workflows that power the Ocentra Games monorepo. 

To keep the pipeline incredibly fast, easily maintainable, and completely DRY (Don't Repeat Yourself), we use a **Modular Orchestrator Architecture**.

## Architecture Overview

Instead of putting all steps into one massive file, the pipeline is split into three layers:
1. **The Orchestrator:** `ci-gate.yml` is the traffic controller. It listens for `push` events and dictates *what* runs and in *what order*.
2. **The Modules (Reusable Workflows):** Files like `pull-request-checks.yml`, `cloudflare-preflight.yml`, and `sync-r2.yml` are modules. They contain the actual test/deploy logic.
3. **The Machine Builder (Composite Action):** EVERY workflow calls `.github/actions/setup-ci`. Instead of manually installing Node/Python/k6 over and over, workflows just pass feature flags to this single function to configure their isolated Ubuntu runners.

---

## The Pipeline Execution Flow

When you push code, `ci-gate.yml` executes the following visual sequence.

*Note: Parallel tracks merge and wait for each other before proceeding to the next security/deployment gate.*

```mermaid
graph LR
    %% Phase 0 & 1 & 2: Sequential Core Checks
    FF("Fail Fast<br/>(Install, Build, Lint, Types)") --> SS("Secrets and<br/>Sensitive Files")
    SS --> Cflight("Cloudflare<br/>Prebuild Preflight")

    %% Phase 3: Parallel PR Checks
    Cflight --> BWA("Build Web App")
    
    Cflight --> CQ("Code Quality")
    CQ --> MWS("Mobile Web<br/>Smoke E2E")
    
    Cflight --> BRC("Build Rust<br/>Contracts")
    BRC --> SIT("Solana<br/>Integration Tests")

    %% Merge Phase 3 into Phase 4
    BWA --> CTG("Cloudflare<br/>Test Gates")
    MWS --> CTG
    SIT --> CTG

    %% Phase 5: Parallel Security Scans
    CTG --> CDSec("Cloudflare<br/>Dynamic Security")
    CTG --> CSSec("Cloudflare<br/>Static Security")

    %% Phase 6: Top Track (Dev Deployment)
    CDSec -.-> R2_Dev("R2 sync - dev")
    CSSec -.-> R2_Dev
    R2_Dev --> W_Dev("Worker - dev")
    W_Dev --> P_Dev("Pages - main")

    %% Phase 6: Bottom Track (Prod Deployment)
    CDSec -.-> R2_Prod("R2 sync - prod")
    CSSec -.-> R2_Prod
    R2_Prod --> W_Prod("Worker - prod")
    W_Prod --> P_Prod("Pages - production")
    
    %% Styling
    classDef gate fill:#2a2a2a,stroke:#e1a024,stroke-width:2px,color:#fff;
    classDef action fill:#1a1a1a,stroke:#4a4a4a,stroke-width:1px,color:#ccc;
    classDef deploy fill:#142314,stroke:#3fb950,stroke-width:2px,color:#fff;
    
    class FF,CTG,CDSec,CSSec gate;
    class P_Dev,P_Prod,W_Dev,W_Prod,R2_Dev,R2_Prod deploy;
```

### Why we "Fail Fast"
The very first job (`Fail Fast`) is the bottleneck. It runs `npm ci`, builds your domains, lints the code, and runs the strict TypeScript compiler (`tsc --noEmit`). 
If you missed a comma or broke an interface, the pipeline instantly dies here to save CI minutes, preventing execution of the expensive parallel testing machines.

### How `setup-ci` works
Since GitHub Actions spins up a strictly blank machine for **every single node** in the graph above, we must install Node.js numerous times. 

To prevent copy-pasting install scripts, every job uses:
```yaml
- uses: ./.github/actions/setup-ci
  with:
    install-mode: ci-only          # Valid options: full, ci-only, skip
    build-domains: 'true'          # Runs turbo build on internal packages
    install-python: 'true'         # Dynamically installs python if needed
    install-cloudflared: 'true'    # Dynamically installs tunnels
    install-k6: 'true'             # Dynamically installs load-testing tools
```

---

## Detailed Node Breakdown

Here is exactly what runs under the hood inside each phase of the pipeline:

### 1. Fail Fast (`fail-fast.yml`)
**Role:** The absolute gatekeeper.
**Executes:**
- `npm ci` (Installs all dependencies)
- `npm run build:domains` (Turbo builds internal `@ocentra` packages)
- `npm run lint` (Runs ESLint across the entire source code)
- `npm run type-check` (Runs `tsc -b --force` to validate all TypeScript typings)

### 2. Secrets and Sensitive Files (`secret-scan.yml`)
**Role:** Security check against hardcoded keys.
**Executes:**
- `node scripts/security/scan-staged-secrets.mjs --repo` (Custom regex-based repo scanner)
- `gitleaks detect --source . --redact` (Open-source credential scanner)

### 3. Cloudflare Prebuild Preflight (`cloudflare-preflight.yml`)
**Role:** Infrastructure typings and script validation.
**Executes:**
- `npm run prebuild` (Autogenerates logging modules via `generate-log-modules.ts`)
- `npm run dev:prep:worker` (Reads `wrangler.toml` to generate static typing for DB/KV bindings)

### 4. Phase 3: Parallel Checks & Compilation
Because the preflight succeeded, `ci-gate.yml` concurrently boots 4 isolated nodes:

**A. Unit Tests (`unit-tests.yml`)**
- **Executes:** `npm test` -> `vitest --run`
- Runs all standard, pure-logic Javascript tests indiscriminately across the monorepo.

**B. Mobile Web Smoke (`mobile-smoke.yml`) - Waits for Unit Tests**
- **Executes:** `npx playwright install` -> `npm run test:e2e -- --project=db-mobile-e2e`
- Runs headless chromium mobile-viewport UI interaction tests.

**C. Build Web App (`build-web.yml`)**
- **Executes:** `npm run build` -> `vite build`
- Packages the React frontend.

**D. Solana Integration Pipeline (`solana-tests.yml`)**
- **Executes:** `anchor build` -> Compiles Rust smart contracts.
- **Executes:** `npm run test:integration` -> Spins up a local Devnet cluster to execute blockchain assertions using the compiled artifact.

### 5. Cloudflare End-To-End Test Gates (`cloudflare-security-tests.yml`)
**Role:** Heavy E2E server orchestration and fuzzing.
**Executes:**
- `wrangler dev` (Boots local backend worker in Miniflare)
- `cloudflared tunnel` (Exposes local `wrangler` server to the internet)
- **Node: Dynamic Security:** Runs `schemathesis --workers 50` (Forcefully fuzzes your OpenAPI specification)
- **Node: Static Security:** Runs `k6 run tests/k6/concurrency.test.js` (Stress-tests memory limits and connection scaling)

### 6. Deployment (R2, Worker, Pages)
**Role:** Production Rollout (Runs sequentially).
**Executes:**
- `npm run sync:assets:prod` (`sync-r2.yml` hashes and uploads game assets)
- `npm run deploy` (`deploy-worker.yml` pushes backend to edge)
- `wrangler pages deploy` (`deploy-pages.yml` pushes Vite dist to Pages)
