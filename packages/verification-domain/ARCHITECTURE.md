# verification-domain — architecture

## Role

`@ocentra/verification-domain` transforms match records into deterministic canonical
bytes and provides dispute decision helpers. It is a pre-crypto verification layer.

## Module map

```mermaid
flowchart TB
  T[types.ts]
  CJ[CanonicalJSON]
  CS[CanonicalSerializer]
  DR[DisputeResolver]

  T --> CS
  CJ --> CS
```

- `types.ts` defines `MatchRecord`, `PlayerRecord`, `MoveRecord`, and
  `SignatureRecord` wire shapes (including compatibility aliases).
- `CanonicalJSON` handles key ordering and number/string normalization.
- `CanonicalSerializer` maps and validates `MatchRecord` fields, then emits bytes.
- `DisputeResolver` handles auto/manual dispute resolution outcomes.

## Canonicalization flow

```mermaid
sequenceDiagram
  participant C as Caller
  participant S as CanonicalSerializer
  participant J as CanonicalJSON

  C->>S: canonicalizeMatchRecord(match)
  S->>S: normalizeMatchRecord + validateVersion
  S->>J: stringify(normalizedObject)
  J-->>S: canonical JSON string
  S-->>C: Uint8Array bytes
```

## Dispute flow

```mermaid
flowchart LR
  D[Dispute reason] --> AR[attemptAutoResolution]
  AR -->|score_error| N1[null placeholder]
  AR -->|timeout, >5m inactive| AC[auto_corrected resolution]
  AR -->|otherwise| N2[null]
  D --> MR[resolveDispute manual]
  MR --> OUT[accepted/rejected resolution]
```

## Boundaries

- No hashing/signing logic here (belongs to crypto-domain).
- No storage/event bus/network dependencies in this package.
- Output bytes are deterministic for semantically equivalent input records.
