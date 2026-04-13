# Load Testing with k6

k6 load tests run against the local Cloudflare Worker via `npm run test:k6` and the other load-test entry points in `infra/cloudflare`.

## Entry points

- `npm run test:k6` - main concurrency/load suite
- `npm run test:k6:soak` - soak test
- `npm run test:k6:memory` - memory pressure test
- `npm run test:k6:fd` - file-descriptor / socket pressure test

## Worker startup

The k6 runner auto-starts the worker if needed. If port `8787` is stale or the worker is unhealthy, the harness will kill the stale process and start a fresh one.

## Contract

- Use the shared endpoint-domain route and payload helpers.
- Use the shared idempotency and auth helpers from the k6 test runner.
- Do not invent local request shapes or raw path strings in new load tests.

## Test focus

The current baseline covers credits contention, same-user contention, idempotency, burst load, soak, memory pressure, cross-endpoint contention, badge unlock contention, and websocket/socket pressure.

When adding new scenarios, keep them tied to real worker routes and real domain contracts.
