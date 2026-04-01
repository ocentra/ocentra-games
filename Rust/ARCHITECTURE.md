# Rust Architecture

## Scope

`Rust` is a container for Solana program workspaces. Each workspace can combine:

- Rust crates for on-chain execution
- Anchor configuration
- Node.js/TypeScript orchestration for tests and migrations

At the moment, `Rust/ocentra-games` is the active workspace.

## Workspace Map

```mermaid
flowchart TD
  R[Rust]
  W[ocentra-games workspace]
  P[programs/ocentra-games]
  T[tests and migrations]
  C[Anchor.toml and Cargo workspace]

  R --> W
  W --> P
  W --> T
  W --> C
```

## Cross-Language Build And Test Flow

```mermaid
sequenceDiagram
  participant Dev as Developer
  participant Rust as Rust program code
  participant Anchor as Anchor CLI
  participant IDL as Generated IDL
  participant TS as TypeScript tests
  participant Net as Solana cluster

  Dev->>Anchor: anchor build
  Anchor->>Rust: compile program
  Anchor-->>IDL: emit IDL JSON
  Dev->>Anchor: anchor test
  Anchor->>TS: run test command from Anchor.toml
  TS->>Net: send transactions via Anchor TS client
  Net-->>TS: return account data and errors
```

## Boundaries

- Rust code is the source of truth for instruction behavior and account constraints.
- TypeScript here is for test and migration orchestration, not protocol ownership.
- The generated IDL is the contract between Rust and TypeScript tooling.
