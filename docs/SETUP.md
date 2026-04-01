# Local setup — env, Wrangler, Firebase

Cloning the repo and running `npm install` is not enough. The main app expects **Vite env vars**, optional **Firebase client config**, and a **local Cloudflare Worker** (or a pointed-at deployed worker) for APIs, assets, and matches.

Use this doc together with:

- [`README.md`](../README.md) — dev launcher (`npm run dev`) and platforms
- [`.env.example`](../.env.example) — minimal **root** env template
- [`infra/cloudflare/README.md`](../infra/cloudflare/README.md) — worker package
- [`infra/cloudflare/docs/TEST-README.md`](../infra/cloudflare/docs/TEST-README.md) — worker tests
- [`infra/firebase/README.md`](../infra/firebase/README.md) — Firebase **admin** / rules (not the same as client keys)

---

## 1. Prerequisites

| Requirement | Notes |
| --- | --- |
| **Node.js** | `>=22.15` (see root `package.json` `engines`) |
| **npm** | `11+` (see `packageManager` in root `package.json`) |
| **Wrangler** | Used as `npx wrangler` from `infra/cloudflare`; `npm run login` there runs `wrangler login` |
| **Cloudflare account** | `wrangler login` links the CLI for remote resources used in dev (`wrangler dev --env development` still talks to Cloudflare for KV/R2 bindings as configured) |
| **Optional** | Rust + Solana + Anchor for `Rust/ocentra-games`; Android Studio / Xcode for mobile shells |

If `npm install` fails on a lifecycle script (e.g. Stellar/Trezor), use `npm install --ignore-scripts` once, then retry native builds only when needed (see [`AGENTS.md`](../AGENTS.md) troubleshooting).

---

## 2. Root install

From the repository root:

```bash
npm install
```

Workspace packages under `packages/*` are linked via npm workspaces.

---

## 3. Root `.env` (main app + Vite)

Copy the template and edit:

```bash
cp .env.example .env
```

### 3.1 Worker URLs (required for “local backend” flows)

The example file points the app at a **local claim-storage worker**:

| Variable | Typical local value | Purpose |
| --- | --- | --- |
| `VITE_CLAIM_STORAGE_URL` | `http://127.0.0.1:8787` | Base URL for the worker (matches, credits, assets API) |
| `VITE_R2_WORKER_URL` | `http://127.0.0.1:8787` | Legacy alias; keep in sync |
| `VITE_ASSETS_PUBLIC_URL` | `http://127.0.0.1:8787/api/v1/assets` | Public asset HTTP API |

`vite.config.ts` also defaults missing `VITE_CLAIM_STORAGE_URL` / `VITE_ASSETS_PUBLIC_URL` toward `127.0.0.1:8787` in dev, but **being explicit in `.env` avoids surprises**.

### 3.2 Bucket names (labels for UI / tooling)

Defaults in `.env.example` (`VITE_R2_BUCKET_NAME`, `VITE_R2_ASSETS_BUCKET`) should match how you name buckets in Wrangler; local dev uses **test** bucket names from [`infra/cloudflare/wrangler.toml`](../infra/cloudflare/wrangler.toml) under `[env.development]`.

### 3.3 Firebase (optional — sign-in, Firestore, Storage, Functions)

If these are **missing**, the app still boots; Firebase runs in **offline mode** (see [`src/adapters/firebase/config.ts`](../src/adapters/firebase/config.ts)).

To enable Firebase, add a standard **web app** config from the Firebase console:

| Variable | Required for “hasFirebaseConfig” |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Yes |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Yes |
| `VITE_FIREBASE_STORAGE_BUCKET` | Optional (enables Storage when set) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Optional |
| `VITE_FIREBASE_APP_ID` | Optional |

Never commit real `.env` files.

### 3.4 Google OAuth (Asset Editor desktop sign-in)

For Tauri Google sign-in in the Asset Editor package, set **`VITE_GOOGLE_OAUTH_CLIENT_ID`** (see comments in [`.env.example`](../.env.example)). Use a **Desktop** OAuth client where required; web client flows differ.

### 3.5 AI provider keys (optional)

Local or cloud LLM keys are usually configured in **Settings** in the app or via provider env vars documented in [`packages/ai-domain/README.md`](../packages/ai-domain/README.md). The worker may proxy AI calls; see worker secrets below.

---

## 4. Cloudflare Worker (`infra/cloudflare`)

The **claim-storage** worker is the main backend for local development when you choose **local** backend in `npm run dev`.

### 4.1 Install and Wrangler login

```bash
cd infra/cloudflare
npm install
npm run login
```

`login` runs `wrangler login` and stores Cloudflare credentials for the CLI.

### 4.2 Local worker process

```bash
npm run dev
```

This runs asset seeding and **`wrangler dev --env development`** (see [`infra/cloudflare/package.json`](../infra/cloudflare/package.json)). Expect HTTP on **`http://127.0.0.1:8787`** (default Wrangler port unless overridden).

**Important first-run warning:** the first local boot can be slow while seeding/repairing the local R2 bucket mirror. You may see logs like “detected N missing bucket file(s)” and upload progress (`uploaded X/Y`). Let it finish; this is normal. Subsequent runs should be much faster because only drifted files are synced.

Keep this terminal running while using the main app with **local** backend, or use the root script:

```bash
# from repo root
npm run dev:worker
```

### 4.3 Wrangler config

| File | Role |
| --- | --- |
| [`wrangler.toml`](../infra/cloudflare/wrangler.toml) | Dev env `claim-storage-dev`, R2/KV/DO bindings, migrations |
| [`wrangler.production.toml`](../infra/cloudflare/wrangler.production.toml) | Production deploy |

Worker **name**, **R2 bucket** names, and **KV namespace** IDs are in `wrangler.toml`. Changing them requires matching resources in the Cloudflare dashboard (or Wrangler-created resources).

### 4.4 Secrets (not in git)

Production and many integrations use **`wrangler secret put`** (Stripe, Firebase admin material, AI keys, etc.). They are **not** checked into the repo. For local dev, some paths work with Miniflare defaults; if a handler errors on missing secrets, read the worker logs and add the secret for your dev environment or stub the feature.

Reference: [`infra/cloudflare/docs/WORKFLOW-UPDATE-GUIDE.md`](../infra/cloudflare/docs/WORKFLOW-UPDATE-GUIDE.md) (CI, deploy, env facts).

### 4.4.1 R2 presigned asset URLs (local `download-url`)

For **`GET /api/v1/assets/download-url`** to return presigned R2 URLs when **`ASSETS_PUBLIC_URL`** is empty, create **`infra/cloudflare/.dev.vars`** from the template:

- Copy [`infra/cloudflare/.dev.vars.example`](../infra/cloudflare/.dev.vars.example) → **`.dev.vars`** in the same folder.
- Fill **`CLOUDFLARE_ACCOUNT_ID`**, **`R2_ASSETS_BUCKET_NAME`** (must match the dev `ASSETS_BUCKET` bucket name in [`wrangler.toml`](../infra/cloudflare/wrangler.toml)), **`R2_ACCESS_KEY_ID`**, **`R2_SECRET_ACCESS_KEY`** from **Cloudflare → R2 → Manage R2 API Tokens** (S3-compatible keys, not the global API token).

Full checklist: [`docs/ocentra/asset-handling.md`](../docs/ocentra/asset-handling.md) (section *Deploy and environment variables*).

### 4.5 Local `.env` in `infra/cloudflare` (if present)

Some developers keep a **local-only** `infra/cloudflare/.env` for Wrangler or scripts. It is **gitignored**. Do not paste real values into issues.

---

## 5. Firebase (server-side / admin) — optional

If you deploy or run **Firebase Functions**, **rules**, or **admin scripts** under [`infra/firebase`](../infra/firebase), see [`infra/firebase/README.md`](../infra/firebase/README.md). That uses **`FIREBASE_PROJECT_ID`**, **`FIREBASE_SERVICE_ACCOUNT_PATH`** (or ADC), etc. — distinct from the **`VITE_*`** client keys in section 3.3.

---

## 6. Asset Editor package env

The Asset Editor expects the same **worker / asset** URLs when talking to claim-storage. Align:

- `VITE_CLAIM_STORAGE_URL`
- `VITE_ASSETS_PUBLIC_URL`

See [`packages/asset-editor/README.md`](../packages/asset-editor/README.md) for preferred env names and Google sign-in.

---

## 7. Minimal “make it run” checklist

1. `npm install` at repo root  
2. `cp .env.example .env` and set **`VITE_CLAIM_STORAGE_URL`** / **`VITE_ASSETS_PUBLIC_URL`** for `127.0.0.1:8787`  
3. `cd infra/cloudflare && npm install && npm run login && npm run dev` (worker on **8787**)  
4. In another terminal, repo root: `npm run dev` → choose **2** (web HMR + local worker) or your platform  

Add **`VITE_FIREBASE_*`** when you need real auth/storage, not offline mode.

---

## 8. Production backend without local worker

If you point the app at a **deployed** worker, set **`VITE_CLAIM_STORAGE_URL`** (and derived asset URL) to that origin and use the **production** backend option in the dev launcher where applicable. You still need a valid deployment and CORS allowlist for your origin.

---

## 9. Further reading

| Topic | Doc |
| --- | --- |
| Worker architecture | [`infra/cloudflare/docs/ARCHITECTURE.md`](../infra/cloudflare/docs/ARCHITECTURE.md) |
| Worker tests | [`infra/cloudflare/docs/TEST-README.md`](../infra/cloudflare/docs/TEST-README.md) |
| Desktop | [`platforms/desktop/tauri/README.md`](../platforms/desktop/tauri/README.md) |
| Mobile | [`platforms/mobile/README.md`](../platforms/mobile/README.md) |
| Solana program | [`Rust/ocentra-games/README.md`](../Rust/ocentra-games/README.md) |
