# Ocentra Games Rust Architecture

## Scope

This workspace is an Anchor project that combines:

- On-chain Rust program code
- Anchor build/deploy pipeline
- Node.js/TypeScript integration tests and migrations

## High-Level Components

```mermaid
flowchart TD
  W[Rust/ocentra-games workspace]
  A[Anchor CLI and config]
  R[programs/ocentra-games Rust crate]
  T[tests TypeScript suite]
  M[migrations TypeScript scripts]
  I[target/idl/ocentra_games.json]
  S[target/deploy/ocentra_games.so]

  W --> A
  W --> R
  W --> T
  W --> M
  R --> A
  A --> I
  A --> S
  I --> T
  I --> M
```

## Program Layering

```mermaid
flowchart LR
  LIB[lib.rs program entry]
  INST[instructions]
  STATE[state]
  GAME[games]
  COMMON[common utilities]
  ERR[error codes]

  LIB --> INST
  LIB --> STATE
  INST --> GAME
  INST --> COMMON
  INST --> STATE
  LIB --> ERR
```

## Runtime Interaction

```mermaid
sequenceDiagram
  participant Test as TypeScript test
  participant Client as Anchor TS client
  participant RPC as Solana RPC
  participant Program as ocentra_games program
  participant Accounts as PDA accounts

  Test->>Client: Build instruction call
  Client->>RPC: Submit transaction
  RPC->>Program: Execute handler from lib.rs
  Program->>Accounts: Validate and mutate state
  Program-->>RPC: Return result or error
  RPC-->>Client: Confirm transaction
  Client-->>Test: Read state for assertions
```

## Node And Rust Boundaries

- Rust is authoritative for instruction logic and state constraints.
- TypeScript orchestrates execution and validation of outcomes.
- IDL is the shared contract produced from Rust by Anchor build.
- Test aliases in `tsconfig.json` are scoped to the `tests` tree.

## Primary Entry Files

- `programs/ocentra-games/src/lib.rs`
- `programs/ocentra-games/Cargo.toml`
- `Anchor.toml`
- `package.json`
- `tests/root-hooks.ts`
