# Firebase Infrastructure

This package owns Firebase Functions, Firestore rules, and admin automation scripts.

## Canonical docs

- `docs/ARCHITECTURE.md` - runtime behavior, auth boundaries, and mermaid flows.

## Current implementation scope

- Functions runtime: `nodejs20` (`firebase.json`).
- Callable functions in `functions/src/index.ts`:
  - `checkAdminStatus`
  - `setAdminStatus`
- Firestore rules in `rules/firestore.rules`.
- Admin scripts:
  - `scripts/set-admin-users.ts`
  - `scripts/check-admin-status.ts`

## Quick commands

```bash
cd infra/firebase
npm install
npm run dev
npm run build
npm run deploy:rules
npm run deploy:functions
```

## Admin scripts

Scripts use Firebase Admin SDK (server credentials), not client SDK rules.

```bash
cd infra/firebase
npm run scripts:set-admin
npm run scripts:check-admin -- user@example.com
npm run scripts:check-admin
```

Required env values (repo root `.env`):

- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_PATH` or ADC via `gcloud auth application-default login`
- `FIREBASE_ADMIN_EMAILS` for `scripts:set-admin`

## Deployment notes

- Project aliases in `.firebaserc` currently map to the same project ID (`claim-b020c`).
- Default deploy commands avoid Storage setup requirements:
  - `npm run deploy` -> Firestore rules only
  - `npm run deploy:rules` -> Firestore rules only
- Deploy all Firebase resources with `npm run deploy:all`.

## Cloudflare admin integration

Cloudflare admin routes read Firestore user role state and require:

- `users/{uid}.isAdmin` boolean in Firestore
- `FIREBASE_PROJECT_ID` in worker environment
- `FIREBASE_SERVICE_ACCOUNT_JSON` in worker environment

This service-account JSON is used by worker-side Firestore reads for admin checks and dashboard data assembly.

## Real Firebase smoke checks

Use Cloudflare-side smoke checks to validate end-to-end service-account auth and Firestore access:

```bash
cd infra/cloudflare
npm run test -- tests/integration/firebase-service-auth-real.test.ts
```

Or run the dedicated script:

```bash
cd infra/cloudflare
npx tsx scripts/run-firebase-real-smoke.ts
```

Required env for these checks:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_JSON_PATH`
