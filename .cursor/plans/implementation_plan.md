# API Hardening Implementation Plan: Zod Migration

## Objective
Harden the Cloudflare Worker API by replacing all manual JSON/text parsing with strict Zod-based validation. This ensures 100% OpenAPI contract compliance, prevents backend crashes from malicious payloads, and provides edge-level security.

## Core Checklist

### 1. Eliminate Manual Body Parsing
- [ ] **Find & Replace:** Search for all `request.json()`, `request.text()`, and manual `JSON.parse()` calls in handlers (primarily `POST`, `PUT`, `PATCH`).
- [ ] **Single Read Enforcement:** Ensure the request body is read **exactly once**. Replace multiple reads with a single `validateZodBody` call.
- [ ] **Standard Utility:** Every mutation must use `validateZodBody(request, env, Schema)`.

### 2. Canonical Validation Pattern
- [ ] Implement this exact pattern in every targeted handler:
  ```typescript
  const { data, errorResponse } = await validateZodBody(request, env, Schema);
  if (errorResponse) return errorResponse;
  const body = data!; // Non-null assertion is safe after errorResponse check
  ```
- [ ] **Anti-Pattern Check:** Ensure NO code checks `instanceof Response` on the `validateZodBody` return value (which is an object, not a Response).

### 3. Handler-Specific Hardening

#### [credits.ts](file:///E:/ocentra-games/infra/cloudflare/src/handlers/credits.ts)
- [ ] **Handle Redeem:** Fix `handleCreditsRedeem` to use `redeemResult` (the return of logic) instead of shadowing with `result`.
- [ ] **Non-Null Property Access:** Use `body!.ac_amount` and `body!.amount` consistently to satisfy TypeScript after validation.
- [ ] **Variable Scoping:** Ensure `cors`, `bodyLength`, and `contentType` are defined before logging or header construction.

#### [feature-handlers.ts](file:///E:/ocentra-games/infra/cloudflare/src/handlers/feature-handlers.ts)
- [ ] **Consistency:** Standardize variable names. Use `body` instead of `messageBody` or `marketplaceBody` to keep `doFetch` calls clean.
- [ ] **Sub-path Logic:** For generic handlers (Lobby, Presence, Marketplace), ensure the `data` from Zod is correctly merged with context (like `userId`) before stringifying for Durable Object fetch.
- [ ] **Passthrough for Generics:** Use `z.record(z.any()).passthrough()` for endpoints that simply proxy to Durable Objects, but enforce specific schemas for "Send Message" or "Status Update" endpoints.

### 4. Integration & Testing
- [ ] **OpenAPI Sync:** Verify that the Zod schemas in handlers match the documentation in `openapi.ts`.
- [ ] **Fuzzing Validation:** Run `npm run test:schemathesis`. The goal is "Green" results with zero crashes/500 errors on invalid inputs.
- [ ] **Lint Sweep:** Run `npm run lint` in `infra/cloudflare` to catch any remaining "possibly undefined" errors.

## Critical Rules to Follow
1. **Never read the body twice.** If you need it twice, use `request.clone()` before the first read.
2. **Handle errorResponse first.** Always `if (errorResponse) return errorResponse;` immediately after the Zod call.
3. **No string literals for logic.** Use constants from `@ocentra/endpoint-domain` or `@ocentra/boundary-domain`.
4. **Strict `as const` patterns.** For all new schemas and constants.
