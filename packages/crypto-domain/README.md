# @ocentra/crypto-domain

Cryptographic primitives shared across Ocentra runtimes. This package provides
SHA-256 hashing and Ed25519 key/signature helpers used by verification and Solana
flows.

## Scope

- **In:** deterministic hashing (`HashService`), key generation/import/export
  (`KeyManager`), sign/verify records (`SignatureService`).
- **Out:** canonical serialization, match schema assembly, and transport logic.

## Public API

Import from explicit subpaths (no barrel export).

- `@ocentra/crypto-domain/services/HashService`
- `@ocentra/crypto-domain/services/KeyManager`
- `@ocentra/crypto-domain/services/SignatureService`

## Service behavior

### HashService

- `hashMatchRecord(canonicalBytes)` -> lowercase hex SHA-256 digest.
- `hash(data)` accepts `Uint8Array | string` and delegates to the same SHA-256 path.

### KeyManager

- Generates Ed25519 keypairs via `crypto.subtle.generateKey`.
- Exports private keys as PKCS#8 hex and public keys as raw hex.
- Imports from hex back to `CryptoKey` for sign/verify usage.

### SignatureService

- Signs canonical bytes with Ed25519 and returns:
  `signature`, derived `publicKey`, algorithm tag, and timestamp.
- Verifies signature/public key hex against canonical bytes.
- Returns `false` on parse/import/verify failures (no throw from `verifySignature`).

## Runtime requirements

- Relies on Web Crypto (`crypto.subtle`) with Ed25519 support.
- No package runtime dependencies in `package.json`.

## Scripts

- `npm run build`
- `npm run type-check`
- `npm run lint`
- `npm run test`

## Related docs

- `ARCHITECTURE.md` — service boundaries and flow diagram.
