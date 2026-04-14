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

Here is exactly what happens under the hood inside each node of the pipeline:

### 1. Fail Fast (Install, Build, Lint, Types)
- **Role:** The absolute gatekeeper.
- **Actions:** Uses `setup-ci` to install Node and run `npm ci`. Runs a Turbo build of internal `@ocentra` domain packages. Executes ESLint and exactly type-checks the entire monorepo using `tsc -b --force`.
- **Why:** Catches 90% of developer errors (typos, bad imports, mismatched types) in under 5 minutes without wasting CI cost.

### 2. Secrets and Sensitive Files (`secret-scan.yml`)
- **Role:** Security check.
- **Actions:** Uses `setup-ci` (but skips `npm install` because it only needs the Node binary). Runs custom scripts and the `gitleaks` CLI.
- **Why:** Ensures no API keys, Stripe secrets, or private certificates were accidentally committed. Dies immediately if a leak is found.

### 3. Cloudflare Prebuild Preflight (`cloudflare-preflight.yml`)
- **Role:** Infrastructure validation.
- **Actions:** Installs Cloudflare's `wrangler` CLI and runs `wrangler types`.
- **Why:** Ensures that your Cloudflare `wrangler.toml` configuration is valid and all expected environment bindings are correctly typed before proceeding to deep testing.

### 4. Pull Request Checks (The Parallel Split)
This module (`pull-request-checks.yml`) spins up multiple machines simultaneously:
- **Build Web App:** Runs Vite to compile the React frontend. Proves the web app successfully bundles.
- **Build Rust Contracts:** Installs the Solana CLI, Anchor, and Rust toolchain. Compiles the game's smart contracts. If successful, passes the generated `.idl` files to the next step.
- **Solana Integration Tests:** Takes the Rust contracts and spins up local tests against a Solana Devnet cluster to ensure blockchain logic works.
- **Code Quality / Unit Tests:** Runs `npm test` (Vitest) to execute all fast logic unit tests.
- **Mobile Web Smoke E2E:** Requires "Code Quality" to finish first. Installs Playwright on a Linux machine and runs lightning-fast headless browser tests on mobile viewport dimensions.

### 5. Cloudflare Test Gates (`cloudflare-security-tests.yml`)
- **Role:** End-to-end integration proving ground.
- **Actions:** This is the most complex node. It waits for the entire Pull Request Checks block to pass. It then spins up the Cloudflare Worker locally, starts the Logging Domain bridge, and opens a `cloudflared` tunnel exposing the local worker to the internet. 

### 6. Security Gates
Once the Cloudflare Tunnel is open, two heavy scans pound the live local worker:
- **Cloudflare Dynamic Security:** Runs `schemathesis`. It dynamically reads your OpenAPI spec and forcefully generates thousands of malicious HTTP requests (mutating parameters, headers, and payloads) to try and crash your application bounds.
- **Cloudflare Static Security:** Runs load testing (`k6`) to ensure concurrency isn't causing memory leaks or race conditions in Durable Objects.

### 7. Deployment (Sync R2 -> Deploy Worker -> Deploy Pages)
- **Role:** The final rollout.
- **Actions:** If we are on `main` or explicitly deploying:
  1. `sync-r2.yml` hashes and uploads your static game assets exactly as specified in `app-assets`.
  2. `deploy-worker.yml` runs a final `wrangler deploy` to push your backend code to Cloudflare's edge servers.
  3. `deploy-pages.yml` pushes the compiled React Frontend to Cloudflare Pages.
