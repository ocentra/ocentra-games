# @ocentra/boundary-domain Architecture

`@ocentra/boundary-domain` is the canonical source for shared boundary identifiers across runtimes.

## Owns

- R2 bucket names
- R2 key path prefixes
- Firestore collection names

## Consumers

- Main app (`src/*`)
- Cloudflare worker (`infra/cloudflare/*`)
- Scripts (`scripts/*`)
- Firebase infra (`infra/firebase/*`)

## Design

```mermaid
flowchart TD
  boundaryDomain[boundary-domain]
  appRuntime[main app]
  cfWorker[cloudflare worker]
  scriptsRuntime[scripts]
  firebaseRuntime[firebase]

  appRuntime --> boundaryDomain
  cfWorker --> boundaryDomain
  scriptsRuntime --> boundaryDomain
  firebaseRuntime --> boundaryDomain
```

## Rules

- Do not hardcode bucket, path prefix, or collection names outside this package.
- Add new cross-runtime identifiers here first, then wire consumers.
