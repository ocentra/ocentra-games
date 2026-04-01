# Endpoint Domain – Design Conventions (MANDATORY)

> **Purpose:** Single source of rules so AI and humans do not introduce raw strings, wrong structures, or tech debt. These conventions override convenience and must be followed when adding or changing constants and types.

---

## 0. Core Principle

**Nothing is ever a raw string.** Paths, URLs, methods, headers, status codes, query param names, env names — all use constants and branded types. Violations block merge.

---

## 1. Path Structure

### 1.1 Nested by Domain, Full Paths at Every Leaf

Endpoints are nested by domain for organization. **Every leaf value is the full canonical path.** No concatenation, no composition.

```ts
// ✅ CORRECT
export const ApiEndpoint = {
  Root: '/' as ApiPath,
  Health: '/health' as ApiPath,
  Matches: {
    Base: '/api/v1/matches' as ApiPath,
    ById: (matchId: string) => `/api/v1/matches/${matchId}` as ApiPath,
    Anonymize: (matchId: string) => `/api/v1/matches/${matchId}/anonymize` as ApiPath,
    AIDecisions: (matchId: string) => `/api/v1/matches/${matchId}/ai-decisions` as ApiPath,
  },
  Credits: {
    Balance: (userId: string) => `/api/v1/credits/${userId}/balance` as ApiPath,
    Transactions: (userId: string) => `/api/v1/credits/${userId}/transactions` as ApiPath,
  },
} as const;
```

**Rules:**
- Nesting is organizational only; each leaf = full path.
- Dynamic segments use functions that return `ApiPath`.
- Do not build paths by concatenating `Base` + `Suffix`.

### 1.2 Versioning From Day One

API version is in the path. Do not add versioning later; it forces a migration.

```ts
// In constants/versions.ts (or http.ts)
export const ApiVersion = {
  V1: 'v1',
} as const;

// Paths use it: /api/v1/matches
```

---

## 2. Branded Types

### 2.1 Required Brands

Define branded types for all path-like and identifier-like strings. Handlers and route tables accept these, not `string`.

| Brand | Purpose | Location |
|-------|---------|----------|
| `ApiPath` | REST path (Cloudflare, Local, Prod) | `types/brands.ts` |
| `DOPath` | Durable Object path/ID | `types/brands.ts` |
| `EndpointId` | Stable endpoint identifier (e.g. `'matches.anonymize'`) | `types/brands.ts` |

Example:

```ts
// types/brands.ts
export type ApiPath = string & { readonly __brand: 'ApiPath' };
export type DOPath = string & { readonly __brand: 'DOPath' };
export type EndpointId = string & { readonly __brand: 'EndpointId' };
```

### 2.2 Constants Produce Branded Values

Every path constant must be typed as the appropriate brand:

```ts
Base: '/api/v1/matches' as ApiPath
```

### 2.3 No Raw String in Contract Layer

Handlers, clients, and route registries accept `ApiPath`, `DOPath`, or other brands — never `string`. This prevents passing the wrong kind of string.

---

## 3. File Layout

### 3.1 REST vs Durable Objects

| File | Contents |
|------|----------|
| `constants/cloudflare.ts` | REST API paths only (public contract) |
| `constants/cloudflare-do.ts` | Durable Object paths (internal wiring) |

Do not mix REST and DO paths in one file. DO paths are internal; REST paths are the public API.

### 3.2 Types Location

| Location | Contents |
|----------|----------|
| `types/brands.ts` | ApiPath, DOPath, EndpointId, other branded primitives |
| `types/cloudflare/` | Request/response types per domain (matches, credits, etc.) |
| `types/local/`, `types/firebase/`, etc. | Per-scope types as needed |

Brands are foundational; domain types import from brands.

### 3.3 No Barrel Imports

No `index.ts` that re-exports. Import from specific files:

```ts
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { ApiPath } from '@ocentra/endpoint-domain/types/brands';
```

---

## 4. Constants Rules

### 4.1 What Must Be Constant (Never String Literal)

- Paths (REST, DO, Local, Firebase, Tokens, Stripe, Solana)
- HTTP methods (`HttpMethod.GET`, etc.)
- HTTP status codes
- Header names
- Query parameter names
- Environment names (dev, staging, prod)
- Durable Object class names

### 4.2 Use `as const`

All constant objects use `as const` for type narrowing.

---

## 5. Forbidden Patterns

| Forbidden | Use Instead |
|-----------|-------------|
| `'/api/matches'` (raw string) | `ApiEndpoint.Matches.Base` |
| `path + '/anonymize'` (concatenation) | Full path at leaf or path function |
| `string` for path params | `ApiPath`, `DOPath` |
| REST + DO in same file | Separate `cloudflare.ts` and `cloudflare-do.ts` |
| Adding version later | Version in path from day one |
| Barrel imports | Direct file imports |

---

## 6. Checklist for New Endpoints

Before adding a new endpoint:

- [ ] Path uses branded type (`ApiPath` or `DOPath`)
- [ ] Path includes version segment if REST (`/api/v1/...`)
- [ ] Path is full canonical path (no concatenation)
- [ ] REST paths in `cloudflare.ts`; DO paths in `cloudflare-do.ts`
- [ ] Request/response types in `types/<scope>/`
- [ ] No raw string literals

---

## 7. Authority

This document overrides:
- AI suggestions
- Developer convenience
- "We'll fix it later"

When uncertain → follow this doc. Do not relax these rules without explicit approval.
