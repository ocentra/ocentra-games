# @ocentra/verification-domain

Verification domain for canonical match-record serialization and dispute utilities.
This package normalizes match data into deterministic canonical bytes and provides
dispute resolution helpers.

## Scope

- **In:** match record types, canonical JSON rules, canonical serializer pipeline,
  dispute model + resolver helpers.
- **Out:** hashing/signing, storage writes, and chain submission.

## Public API (subpath exports)

- `@ocentra/verification-domain/types`
- `@ocentra/verification-domain/canonical/CanonicalJSON`
- `@ocentra/verification-domain/canonical/CanonicalSerializer`
- `@ocentra/verification-domain/services/DisputeResolver`

## Service behavior

### CanonicalJSON

- Recursively sorts object keys.
- Normalizes numbers:
  - rejects `NaN` / `Infinity`,
  - converts `-0` to `0`,
  - trims trailing decimal zeroes,
  - expands scientific notation for stable output.
- Escapes control characters consistently.
- Produces canonical JSON string via `stringify`.

### CanonicalSerializer

- Accepts a `MatchRecord` shape (including legacy aliases like `matchId`,
  `createdAt`, `endedAt`, `playerPubkey`, `moveIndex`).
- Normalizes to canonical field names and ISO timestamps.
- Validates semantic version format (`x.y.z`).
- Encodes canonical JSON to `Uint8Array` bytes for hashing/signing layers.

### DisputeResolver

- `attemptAutoResolution` currently supports:
  - `score_error` -> currently returns `null` placeholder,
  - `timeout` -> auto-corrects when inactivity exceeds 5 minutes.
- `resolveDispute` builds manual accepted/rejected outcomes with timestamp.

## Notes

- `package.json` currently declares no runtime dependencies.
- Canonical serialization is deterministic by design and intended to feed crypto
  services (hash/sign) from other domains.

## Scripts

- `npm run build`
- `npm run type-check`
- `npm run lint`
- `npm run test`

## Related docs

- `ARCHITECTURE.md` — module boundaries and canonicalization flow.
