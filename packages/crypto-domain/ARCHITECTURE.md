# crypto-domain — architecture

## Role

`@ocentra/crypto-domain` is a compact, dependency-free crypto layer for
cross-runtime hashing and Ed25519 operations.

## Module map

```mermaid
flowchart TB
  HS[HashService]
  KM[KeyManager]
  SS[SignatureService]

  KM --> SS
```

- `HashService` computes SHA-256 hex digests from canonical bytes or strings.
- `KeyManager` handles Ed25519 key generation and hex import/export.
- `SignatureService` signs/verifies canonical bytes; derives public key from private
  key material for signing metadata.

## Consumer view

```mermaid
flowchart LR
  APP[Main app] --> CRYPTO[@ocentra/crypto-domain]
  SOL[solana-domain] --> CRYPTO
  VERIFY[verification flows] --> CRYPTO
  SCRIPTS[CLI / scripts] --> CRYPTO
```

## Data flow

```mermaid
sequenceDiagram
  participant C as Caller
  participant H as HashService
  participant K as KeyManager
  participant S as SignatureService

  C->>H: hashMatchRecord(canonicalBytes)
  H-->>C: sha256Hex
  C->>K: generateKeyPair()
  K-->>C: CryptoKeyPair
  C->>S: signMatchRecord(canonicalBytes, privateKey)
  S-->>C: SignatureRecord(signature/publicKey/timestamp)
  C->>S: verifySignature(canonicalBytes, signature, publicKey)
  S-->>C: boolean
```

## Boundaries and guarantees

- No storage, network, or event bus integration in this package.
- No external npm runtime dependencies.
- All outputs are deterministic for a given input/key.
- API contract is intentionally narrow to reduce crypto drift across runtimes.
