# Durable Objects (DO) Rules

## Purpose
Durable Objects are **serialized, stateful coordinators**. Use them to guarantee **atomicity, ordering, and exactly‑once effects** for a narrow domain.

---

## The Golden Rules

1. **DO = Transaction Boundary**
   - All side effects for a transaction **must happen inside the DO**.
   - Never escape the boundary for writes (no KV/R2 writes from callers).

2. **One Writer**
   - A DO is the **only writer** for its state domain.
   - Everyone else talks to it via `fetch()` messages.

3. **Serialization Replaces Locks**
   - **No optimistic locking, ETags, retries, or compare‑and‑swap inside a DO**.
   - The platform guarantees single‑threaded execution per DO instance.

4. **Message, Not Function Call**
   - Cross‑DO or edge → DO communication **must use `stub.fetch()`**.
   - Never call shared functions that write distributed storage.

5. **Idempotency Is Mandatory**
   - Every externally triggered mutation needs a **stable idempotency key**.
   - Store processed IDs **inside the DO** (with TTL pruning).
   - **Client-provided keys are required for client requests** — server must never auto-generate keys for client requests (client needs key to retry safely).
   - Server-initiated operations (rollbacks, compensations) may use server-generated keys.

6. **State Lives in DO Storage**
   - Use `ctx.storage` for authoritative state.
   - KV = read‑through cache only. R2 = finalized artifacts only.

7. **Load Once, Persist Intentionally**
   - Load state on first request.
   - Persist after successful mutations (batch writes, not every mutation).
   - Use `ctx.waitUntil()` for async persistence when batching.

8. **Keep the DO Small**
   - Narrow responsibility, minimal endpoints.
   - Heavy compute, fan‑out, and policy checks live **outside**.

---

## What NEVER Goes Inside a DO

- ❌ Rate limiting (edge concern)
- ❌ Feature flags / AB logic
- ❌ GET‑then‑PUT patterns
- ❌ Optimistic locking / retries
- ❌ Cross‑service side effects without idempotency

---

## Storage Decision Rules (DO vs KV vs R2)

### Rule 9: Storage Selection Decision Table

| Requirement / Property          | **Durable Object (DO)**          | **KV**                 | **R2**    |
| ------------------------------- | -------------------------------- | ---------------------- | --------- |
| **Single-writer guarantee**     | ✅ **YES** (per object key)       | ❌ NO                   | ❌ NO      |
| **Strong consistency**          | ✅ **YES**                        | ❌ NO (eventual)        | ❌ NO      |
| **Atomic read-modify-write**    | ✅ **YES** (serialized)           | ❌ NO (GET→PUT race)    | ❌ NO      |
| **Exactly-once semantics**      | ✅ **YES** (with idempotency key) | ❌ NO                   | ❌ NO      |
| **Safe under high concurrency** | ✅ **YES**                        | ❌ NO (1 write/sec/key) | ❌ NO      |
| **Retry / replay safe**         | ✅ **YES**                        | ❌ NO                   | ❌ NO      |
| **Transactional boundary**      | ✅ **YES**                        | ❌ NO                   | ❌ NO      |
| **In-memory mutable state**     | ✅ **YES**                        | ❌ NO                   | ❌ NO      |
| **Durable state storage**       | ✅ **YES** (DO storage)           | ✅ YES                  | ✅ YES     |
| **Low-latency reads**           | ✅ YES                            | ✅ YES                  | ❌ NO      |
| **Large object storage**        | ❌ NO                             | ❌ NO                   | ✅ **YES** |
| **Append-only / blob storage**  | ❌ NO                             | ❌ NO                   | ✅ **YES** |
| **Audit ledger / history**      | ⚠️ SMALL / RECENT ONLY           | ❌ NO                   | ✅ **YES** |
| **Cross-request coordination**  | ✅ **YES**                        | ❌ NO                   | ❌ NO      |
| **Rate limiting primitive**     | ❌ NO                             | ❌ NO                   | ❌ NO      |
| **Edge abuse protection**       | ❌ NO                             | ❌ NO                   | ❌ NO      |

### Rule 10: Mandatory Usage Patterns

| Use Case                   | **Correct Storage**              | **Reason**                     |
| -------------------------- | -------------------------------- | ------------------------------ |
| Credit balances (GP / AC)  | **Durable Object**               | Atomic, exactly-once           |
| Award / consume operations | **Durable Object**               | Serialized state transitions   |
| Match coordination         | **Durable Object**               | Single-writer invariant        |
| Idempotency tracking       | **Durable Object**               | Replay safety                  |
| Rate limiting              | **Cloudflare Rate Limiting API** | Infrastructure-level atomicity |
| Cached reads               | **KV**                           | Fast, cheap, eventual OK       |
| Feature flags / config     | **KV**                           | Non-critical correctness       |
| Logs / artifacts           | **R2**                           | Large, append-only             |
| Historical ledger archive  | **R2**                           | Infinite history               |
| Leaderboards snapshot      | **R2 or KV (read-only)**         | Derived data only              |

### Rule 11: Hard Prohibitions (PR-Blocking)

**Rule 11.1:** Never use KV for:
- ❌ Balances
- ❌ Counters
- ❌ Rate limiting (use Cloudflare Rate Limiting API)
- ❌ Idempotency tracking
- ❌ Any GET→PUT mutation pattern

**Rule 11.2:** Never perform side effects outside a DO once a DO has decided state.

**Rule 11.3:** Never add optimistic locking inside a DO (DO serialization replaces it).

**Rule 11.4:** Never rate-limit inside a DO (rate limiting is edge-only).

### Rule 12: Common Mistakes & Failure Modes

**Rule 12.1: KV for Balances (CRITICAL)**

**Mistake:**
```typescript
// ❌ WRONG: Using KV for balance mutations
const balance = await env.KV.get(`balance:${userId}`, 'json');
balance.gp_balance += 100;
await env.KV.put(`balance:${userId}`, JSON.stringify(balance));
```

**Failure Mode:**
- Race conditions under 2+ concurrent requests
- Double-spend possible (GET→PUT is not atomic)
- KV has 1 write/second per key limit
- Replay attacks succeed

**Fix:**
```typescript
// ✅ CORRECT: Use CreditsDO
const creditsId = env.CREDITS_DO.idFromName(userId);
const creditsStub = env.CREDITS_DO.get(creditsId);
await creditsStub.fetch('/v1/award', {
  method: 'POST',
  body: JSON.stringify({ awardId, amount: 100, ... })
});
```

---

**Rule 12.2: KV for Rate Limiting (CRITICAL)**

**Mistake:**
```typescript
// ❌ WRONG: Using KV for rate limiting
const data = await env.RATE_LIMIT_KV.get(key, 'json');
if (data.count < limit) {
  await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: data.count + 1 }));
}
```

**Failure Mode:**
- GET→PUT race condition
- KV 1 write/second limit causes timeouts
- Concurrent requests bypass limits
- Tests with 15+ requests fail

**Fix:**
```typescript
// ✅ CORRECT: Use Cloudflare Rate Limiting API
const limiter = createRateLimiter(env);
const result = await limiter.check({ key, limit, windowSeconds });
```

---

**Rule 12.3: Function Calls from DO (CRITICAL)**

**Mistake:**
```typescript
// ❌ WRONG: Calling function that writes KV from DO
class MatchCoordinatorDO {
  async finalize() {
    await earnGP(this.env, playerId, 100);  // ❌ ESCAPES BOUNDARY
  }
}
```

**Failure Mode:**
- Breaks exactly-once guarantee
- Distributed operations outside DO serialization
- Race conditions on concurrent finalize calls
- Double awards on retries

**Fix:**
```typescript
// ✅ CORRECT: Use DO.fetch() message
const creditsId = this.env.CREDITS_DO.idFromName(playerId);
const creditsStub = this.env.CREDITS_DO.get(creditsId);
await creditsStub.fetch('/v1/award', { method: 'POST', ... });
```

---

**Rule 12.4: Optimistic Locking Inside DO (FORBIDDEN)**

**Mistake:**
```typescript
// ❌ WRONG: Adding optimistic locking inside DO
class CreditsDO {
  async handleAward(request) {
    const { balance, etag } = await this.ctx.storage.get('balance');
    balance.gp_balance += amount;
    const result = await this.ctx.storage.put('balance', balance, { ifMatch: etag });
    if (!result.success) {
      // retry logic... ❌ FORBIDDEN
    }
  }
}
```

**Failure Mode:**
- Two concurrency models fighting (DO serialization + optimistic locking)
- Unnecessary complexity
- Retry loops reintroduce race semantics
- Violates DO architecture

**Fix:**
```typescript
// ✅ CORRECT: DO serialization replaces optimistic locking
class CreditsDO {
  async handleAward(request) {
    // ✅ Atomic operation (DO serialization guarantees this)
    this.state.gp_balance += body.amount;
    await this.persistState();
  }
}
```

---

**Rule 12.5: Rate Limiting Inside DO (FORBIDDEN)**

**Mistake:**
```typescript
// ❌ WRONG: Rate limiting inside DO
class CreditsDO {
  async handleAward(request) {
    const rateLimit = await checkRateLimit(this.env, userId);
    if (!rateLimit.allowed) {
      return new Response('429', { status: 429 });
    }
    // ...
  }
}
```

**Failure Mode:**
- DO is already serialized (no concurrency)
- Rate limiting is edge concern, not DO concern
- Mixes infrastructure policy with business logic
- Unnecessary overhead

**Fix:**
```typescript
// ✅ CORRECT: Rate limiting at HTTP edge (before DO)
export async function handleCreditsRequest(request, env, path, rateLimiter) {
  const result = await rateLimiter.check({ key, limit, windowSeconds });
  if (!result.allowed) {
    return new Response('Too Many Requests', { status: 429 });
  }
  // Then call CreditsDO...
}
```

---

**Rule 12.6: Missing Idempotency Keys**

**Mistake:**
```typescript
// ❌ WRONG: No idempotency key
class CreditsDO {
  async handleConsume(request) {
    const body = await request.json();
    // No consumeId - retries cause double consumption
    this.state.gp_balance -= body.amount;
  }
}
```

**Failure Mode:**
- Retries cause double consumption
- Replay attacks succeed
- Network failures cause economic loss
- No replay protection

**Fix:**
```typescript
// ✅ CORRECT: Idempotency key required
class CreditsDO {
  async handleConsume(request) {
    const body = await request.json();
    const { consumeId } = body;  // ✅ Required
    
    if (this.state.processed[consumeId]) {
      return new Response(JSON.stringify({
        success: true,
        already_processed: true
      }), { status: 200 });
    }
    
    this.state.gp_balance -= body.amount;
    this.state.processed[consumeId] = Date.now();
  }
}
```

---

**Rule 12.7: Persisting on Every Mutation**

**Mistake:**
```typescript
// ❌ WRONG: Persisting on every mutation
class CreditsDO {
  async handleAward(request) {
    this.state.gp_balance += amount;
    await this.ctx.storage.put('state', this.state);  // ❌ Every time
  }
}
```

**Failure Mode:**
- Expensive (DO storage writes have cost)
- Slow (adds latency to every operation)
- Unnecessary (DO state is durable in memory)

**Fix:**
```typescript
// ✅ CORRECT: Batch persistence
class CreditsDO {
  private mutationsSinceFlush = 0;
  private readonly BATCH_FLUSH_SIZE = 5;
  
  async handleAward(request) {
    this.state.gp_balance += amount;
    this.state.mutationsSinceFlush++;
    
    if (this.state.mutationsSinceFlush >= this.BATCH_FLUSH_SIZE) {
      await this.persistState(true);  // Force flush
    } else {
      this.ctx.waitUntil(this.flushWhenReady());  // Async flush
    }
  }
}
```

---

**Rule 12.8: Unbounded Ledger Growth**

**Mistake:**
```typescript
// ❌ WRONG: No ledger pruning
class CreditsDO {
  async handleAward(request) {
    this.state.ledger.push(entry);  // ❌ Grows forever
    await this.persistState();
  }
}
```

**Failure Mode:**
- Memory exhaustion
- Slow state loading
- DO storage cost increases
- Performance degradation

**Fix:**
```typescript
// ✅ CORRECT: Prune ledger
class CreditsDO {
  private readonly MAX_LEDGER_SIZE = 1000;
  
  async handleAward(request) {
    this.state.ledger.push(entry);
    this.pruneLedger();  // ✅ Prune if too large
  }
  
  private pruneLedger() {
    if (this.state.ledger.length > this.MAX_LEDGER_SIZE) {
      const toArchive = this.state.ledger.slice(0, -this.MAX_LEDGER_SIZE);
      this.ctx.waitUntil(this.archiveLedgerEntries(toArchive));  // Archive to R2
      this.state.ledger = this.state.ledger.slice(-this.MAX_LEDGER_SIZE);
    }
  }
}
```

---

**Rule 12.9: Multiple Writers for Same State**

**Mistake:**
```typescript
// ❌ WRONG: Multiple writers
// Handler writes directly to KV
await env.KV.put(`balance:${userId}`, JSON.stringify(balance));

// DO also writes
class CreditsDO {
  async handleAward() {
    this.state.gp_balance += amount;
    await this.ctx.storage.put('state', this.state);
  }
}
```

**Failure Mode:**
- Race conditions between writers
- Inconsistent state
- Lost updates
- No single source of truth

**Fix:**
```typescript
// ✅ CORRECT: DO is only writer
// Handler routes to DO
const creditsId = env.CREDITS_DO.idFromName(userId);
const creditsStub = env.CREDITS_DO.get(creditsId);
await creditsStub.fetch('/v1/award', { ... });

// DO is authoritative
class CreditsDO {
  async handleAward() {
    this.state.gp_balance += amount;  // ✅ Only writer
    await this.persistState();
  }
}
```

---

**Rule 12.10: Rate Limiting Fail-Safe Returns 503**

**Mistake:**
```typescript
// ❌ WRONG: 503 for rate limiting failure
if (!limiter) {
  return new Response('Rate limiting unavailable', { status: 503 });
}
```

**Failure Mode:**
- 503 invites retries (service unavailable)
- Retries amplify abuse
- Attackers hammer harder
- Fail-open behavior

**Fix:**
```typescript
// ✅ CORRECT: 429 for abuse protection (fail closed)
if (!limiter) {
  logError('Rate limiter not configured, denying request for safety');
  return new Response('Too Many Requests', { status: 429 });  // ✅ Fail closed
}
```

---

### Rule 13: Storage Selection Mental Model

> **DO = transaction & truth**  
> **KV = cache**  
> **R2 = archive**

**Decision Flow:**

1. **Does it need exactly-once semantics?** → DO
2. **Does it need atomic read-modify-write?** → DO
3. **Is it money-critical?** → DO
4. **Is it a counter or balance?** → DO
5. **Is it read-only derived data?** → KV or R2
6. **Is it large or append-only?** → R2
7. **Is it a cache?** → KV

---

## Edge vs DO Responsibilities

**HTTP Edge**
- Auth, input validation
- **Rate limiting** (Cloudflare RL or edge DO fallback)
- Request shaping

**Durable Object**
- Atomic mutations
- Ordering & coordination
- Idempotency
- Audit ledger (if needed, with pruning to prevent unbounded growth)

---

## Status Codes (Recommended)

- `200 OK` — Success **and** idempotent replays
- `409 Conflict` — Business rule failure (e.g., insufficient balance)
- `404 Not Found` — Unknown route
- `5xx` — Platform or unexpected failure (retry safe if idempotent)

---

## Canonical Patterns

### Award / Mutate
- Input includes `operationId` (idempotency key)
- If `operationId` seen → return prior success (200 OK)
- Apply mutation
- Append ledger entry (prune if too large)
- Batch persist state (not every mutation)

### Read
- Pure read from in‑memory state
- No writes

---

## Testing Rules

> **Durable Objects already serialize concurrent access.**
> Your job in tests is to **verify invariants**, not to re-test Cloudflare's scheduler.

If a test setup breaks DO guarantees, the test is wrong — not the architecture.

### The Three Test Layers (Mandatory Separation)

#### Layer 1 — Deterministic Correctness (CI)

**Purpose**
- Validate business logic
- Validate economic safety
- Validate idempotency

**Rules**
- Single Worker instance
- Sequential test execution
- Deterministic inputs
- Deterministic outputs

**Allowed**
- `describe(...)`
- Single `unstable_dev`
- Unique IDs per test

**Disallowed**
- Test-runner concurrency
- Timing assertions
- Availability assumptions

**Example Assertions**
- Balance after award
- Balance after consume
- Idempotent replay returns same state
- No double spend possible

✅ **This is the foundation.**

#### Layer 2 — Concurrency Safety (Still CI)

**Purpose**
- Verify DO serialization under concurrent requests
- Verify "exactly-once" semantics
- Verify economic invariants under race conditions

**How to Test**
- Concurrency **inside a single test**
- Use `Promise.all`
- Same worker
- Same DO instance

**Correct Pattern**
```typescript
await Promise.all([
  fetch(award),
  fetch(award),
  fetch(award),
]);
```

**Assertions**
- At least one request succeeds
- Final balance is correct
- No double credit
- No negative balance

**Key Rule**
> **Concurrency belongs inside the test, not in the test runner.**

#### Layer 3 — Load & Availability (NOT CI)

**Purpose**
- Measure throughput
- Measure latency
- Observe backpressure
- Validate real production behavior

**Tools**
- k6 (preferred)
- Artillery
- Locust
- Cloudflare load testing
- Custom scripts

**Environment**
- Deployed Worker (staging)
- Real DO runtime
- Real scheduler
- Real bindings

**What to Measure**
- 429 / 503 rates
- p95 latency
- DO hot-spot behavior
- System stability

❌ **Never use Vitest/Jest for this layer.**

**Mental Model Reset**
> **You are NOT trying to prove DOs work.**
> Cloudflare already guarantees that.

You are proving **your invariants survive stress**:
- No double award
- No double spend
- No balance corruption
- No silent partial execution

**k6 Setup (Non-Negotiable)**

| Dimension   | Requirement                   |
| ----------- | ----------------------------- |
| Environment | Deployed Worker (staging)     |
| Runtime     | Real Cloudflare DO            |
| Users       | 10k virtual users             |
| Duration    | ≥ 5 minutes sustained         |
| Keys        | Realistic userId distribution |
| Idempotency | Real idempotency keys         |
| Metrics     | p95, error rate, invariants   |

**k6 Test Types You MUST Run**

**Test A — Award Storm (Hot Key)**
> Worst-case: **many requests hitting same DO**

- 10k requests
- Same `userId`
- Same awardId
- Expect:
  - Only 1 award applied
  - Others return idempotent success or rejection
  - Balance = expected

✅ Proves serialization & idempotency

**Test B — Consume Storm**
- 10k consume requests
- Same consumeId
- Expect:
  - Only one consume
  - Balance never negative

✅ Proves no double spend

**Test C — Mixed Traffic**
- 60% read (balance)
- 20% award
- 20% consume
- 10k users
- Random userIds

✅ Proves scheduler fairness & throughput

### What Test-Runner Concurrency Is (and Is Not)

#### What `describe.concurrent` DOES
- Runs tests in parallel threads
- Stresses local runtime
- Stresses emulator lifecycle
- Stresses SQLite persistence
- Stresses worker startup/shutdown
- **Can cause `env.CREDITS_DO` to become undefined** (test artifact, not production issue)

#### What it DOES NOT DO
- Simulate production traffic
- Simulate 10k users
- Simulate DO scheduling
- Simulate edge behavior
- Test production binding guarantees

> **Test-runner concurrency tests your test harness, not your system.**

**Critical Distinction**
- `describe.concurrent` = Multiple test threads racing a single `unstable_dev` instance
- Production = Multiple Workers, each with stable bindings
- These are **NOT equivalent systems**

### Durable Object Guarantees (Production)

**Guaranteed**
- Single-threaded execution per DO
- Serialized state mutations
- Atomic storage writes
- Strong consistency per key
- **DO bindings are static per worker deployment** (never undefined if configured correctly)

**Not Guaranteed**
- DO instance reuse
- Zero cold starts
- Zero latency
- Infinite throughput per key

**Implication**
- Your code must be correct
- Your tests must be invariant-based
- Availability is a separate concern

### DO Binding Availability Guarantees (CRITICAL)

**Production Reality**

| Property | Production Guarantee | Test Environment |
|----------|---------------------|------------------|
| `env.CREDITS_DO` presence | ✅ **Always available** if binding exists | ⚠️ May be undefined under test-runner concurrency |
| Binding lifetime | ✅ **Immutable per isolate** | ⚠️ Can flap during worker lifecycle |
| Configuration errors | ✅ **Fail fast** (deployment bug) | ⚠️ May appear as runtime unavailability |
| Transient unavailability | ❌ **Does not exist** for bindings | ⚠️ Can occur in `unstable_dev` |

**Key Rule**
> **If `env.CREDITS_DO === undefined` in production, that is a deployment/configuration bug, NOT a runtime availability issue.**

**Correct Handler Pattern**
```typescript
// ✅ CORRECT: Fail fast on missing binding (config error)
if (!env.CREDITS_DO) {
  // This should NEVER happen in production if deployed correctly
  // It is a deployment bug, not a transient failure
  return new Response(JSON.stringify({
    error: 'Service Unavailable',
    message: 'Credits service not configured'
  }), {
    status: HttpStatus.ServiceUnavailable, // 503
  });
}

// DO NOT retry - this is a configuration error
// DO NOT add exponential backoff - binding won't appear
// DO NOT treat as transient - it's a deployment issue
```

**What This Means for Tests**

❌ **DO NOT** use `describe.concurrent` with shared `unstable_dev` worker
- Causes `env.CREDITS_DO` to become undefined (test artifact)
- Does NOT simulate production behavior
- Tests the test harness, not the system

✅ **DO** test concurrency via `Promise.all` inside single test
- Same worker instance
- Same DO binding
- Real request-level concurrency
- Tests actual DO serialization

**Three Types of Concurrency (Do Not Confuse)**

1. **User-level concurrency** (10k users)
   - Each user has their own DO instance
   - DOs scale horizontally by key
   - Already handled by DO design

2. **Request-level concurrency** (parallel `fetch()`)
   - Same worker, same env, same DO
   - DO serializes requests automatically
   - Test with `Promise.all` inside single test

3. **Test-runner concurrency** (`describe.concurrent`)
   - Multiple threads racing single `unstable_dev` instance
   - Causes worker lifecycle issues
   - **NOT production load simulation**
   - **DO NOT use for DO integration tests**

### Correct Failure Handling Strategy

#### DO Unavailability

**Production Reality**
- DO binding is always present if configured
- Transient failures are rare
- Most "unavailability" in tests is emulator artifact

**Correct Handling**
- Fail fast on configuration errors
- Do NOT retry money mutations blindly
- Idempotency protects against retries upstream

**Never**
- Retry inside the DO
- Apply optimistic locking
- Allow partial mutations

### What NOT to Test

❌ DO scheduler correctness
❌ Cloudflare binding availability
❌ Worker lifecycle timing
❌ Emulator behavior under stress
❌ "10k users" via unit tests

Those are Cloudflare's responsibilities.

### Confidence Checklist (Ship-Blockers)

You are **production-ready** if ALL are true:

- [ ] All money state lives in DO storage
- [ ] All mutations go through the DO
- [ ] Idempotency keys are mandatory
- [ ] Final state is asserted, not request count
- [ ] Concurrency tested via `Promise.all`
- [ ] No KV for transactional state
- [ ] Load tested in staging (not CI)

### Golden Rule

> **If a test fails only under `describe.concurrent`, the test is wrong — not the system.**

### Testing Summary

- CI tests validate **correctness**
- DOs guarantee **serialization**
- Load tests validate **capacity**
- Test runners do **not** simulate production

Follow this, and your DO-based money system is **industry-grade**.

---

## "10k Users Confidence" — Production Readiness Checklist

> **Short answer:** k6 is necessary, but by itself is NOT enough. You need k6 + invariant validation.

This is **the minimum bar** to say *"I trust this in production."*

### Mental Model Reset

> **You are NOT trying to prove DOs work.**
> Cloudflare already guarantees that.

You are proving **your invariants survive stress**:
- No double award
- No double spend
- No balance corruption
- No silent partial execution

### CI (Vitest) — KEEP IT BORING

This part you already have right.

**Must-have**
- ✅ Sequential tests
- ✅ Invariant checks (final balance)
- ✅ Idempotency replay
- ✅ Concurrency via `Promise.all` *inside one test*

**Must-NOT-have**
- ❌ `describe.concurrent`
- ❌ Thread pool testing
- ❌ Availability assumptions
- ❌ Timing expectations

**Outcome:**
If CI passes → logic is correct.

👉 **CI does NOT give scale confidence. It never will.**

### Staging Load Test (k6) — THIS IS WHERE 10k CONFIDENCE COMES FROM

This is the **only place** where "10k users" means anything.

See **Layer 3 — Load & Availability** above for k6 setup requirements and test types.

### Invariant Monitoring (CRITICAL)

k6 is **not enough** unless you check **state invariants after load**.

**After each k6 run, you MUST:**

1. Query balances
2. Sum ledger
3. Verify:
   - `gp_balance >= 0`
   - `total_gp_earned - total_spent == balance`
   - No duplicate ledger IDs
   - No missing transactions

If **any invariant breaks**, system is unsafe.

### Error Budget Expectations (Reality Check)

At 10k users:

| Error             | Acceptable?         |
| ----------------- | ------------------- |
| 429 (rate limit)  | ✅ YES               |
| Increased latency | ✅ YES               |
| 503 transient     | ⚠️ YES (very low %) |
| Wrong balance     | ❌ NEVER             |
| Double credit     | ❌ NEVER             |
| Partial mutation  | ❌ NEVER             |

**Correct response to overload is refusal, not corruption.**

### What Big Orgs ACTUALLY Do

Stripe / Coinbase / Roblox-class systems:

- CI = logic only
- Staging = load + chaos
- Production = metrics + alerts

They **do not**:
- ❌ Parallelize unit tests to simulate load
- ❌ Assume local emulators reflect prod
- ❌ Treat test-runner concurrency as signal

### The Final Confidence Rule (This Is The One That Matters)

You have **10k-user confidence** when ALL are true:

- [ ] CI invariant tests pass
- [ ] k6 load test passes at 10k VUs
- [ ] No economic invariant violated
- [ ] Failures are explicit (429/503)
- [ ] Recovery via idempotency works
- [ ] No manual intervention required

At that point, **you ship**.

### Direct Answers

**Is k6 enough?**
- 🟡 **k6 + invariant validation = YES**
- 🔴 **k6 alone = NO**

**Should I use `describe.concurrent`?**
- ❌ **Never for DO systems**

**Do separate workers help?**
- ❌ No — that invalidates the test

**Am I testing the right thing now?**
- ✅ Yes — once k6 + invariant checks are in place

---

## Smell Checklist (If you see this, stop)

- Calling a helper that writes KV/R2 from a DO ❌
- Using ETags inside a DO ❌
- Rate limiting inside a DO ❌
- Multiple writers for the same balance ❌
- Persisting on every mutation (should batch) ❌
- Unbounded ledger growth (should prune) ❌
- Missing idempotency keys on economic mutations ❌

---

## Mental Model

> **A Durable Object is a single‑threaded, authoritative ledger.**
> If something must happen *exactly once*, it belongs inside a DO.

---

**Print rule:** If it can race, put it in a DO. If it can be abused, stop it at the edge.

