# Schemathesis Fuzzing Failures - Tracking Document

**Date:** 2026-04-09
**Latest Full Run:** examples passed, fuzzing reported 31 failures and 1 health-check error in the fuzzing phase
**Status:** In Progress

---

## Failure Categories

| Category | Description |
| --- | --- |
| Validation Gap | API accepts schema-violating requests or ignores mutated parameters |
| Contract Mismatch | API rejects schema-compliant requests or documents the wrong shape |
| Undocumented Status | API returns a status code missing from OpenAPI |
| Server Error | Handler returned a 500 during fuzzing |

---

## Manual Verification Ledger

Use this table as the running checklist. `Full run` records what the latest complete suite reported. `Single route` records what happened when the endpoint was run alone with `TARGET_ENDPOINT`.

| Endpoint | Full run | Single route | Reason |
| --- | --- | --- | --- |
| `POST /api/v1/ai/generate` | Undocumented `409` | `pass` | Single-route run completed cleanly; the `409` is stable only in the full-suite context. |
| `POST /api/v1/admin/credits/plan` | Schema violation accepted | `pass` | Single-route run did not reproduce the full-suite acceptance case. |
| `POST /api/v1/party` | Invalid auth `503` | `pass` | Single-route run completed cleanly; the full-suite `503` looks transient or load-related. |
| `POST /api/v1/notifications/push` | Missing auth `503` | `pass` | Single-route run completed cleanly; full-suite `503` looks transient. |
| `POST /api/v1/admin/moderation/report` | Invalid auth `503` | `pass` | Single-route run completed cleanly; the full-suite `503` looks transient or load-related. |
| `GET /api/v1/tournaments/{tournamentId}` | Schema violation accepted | `pass` | Single-route run now returns `404` for registration-phase or missing tournaments. |
| `GET /api/v1/logs/query` | Schema mismatch accepted | `pass` | Single-route run did not reproduce the invalid-query acceptance. |
| `POST /api/v1/matchmaking/leave` | Schema violation accepted | `pass` | Single-route run completed cleanly. |
| `POST /api/v1/matchmaking/queue` | Schema violation accepted | `pass` | Single-route run completed cleanly. |
| `POST /api/v1/rewards/daily/claim` | Schema violation accepted | `pass` | Single-route run completed cleanly. |
| `POST /api/v1/security/penalty/issue` | Schema violation accepted | `pass` | Single-route run completed cleanly. |
| `GET /api/v1/data-export/{userId}` | Schema violation accepted | `pass` | Single-route run now rejects malformed encoded path values and passes Schemathesis isolation checks. |
| `GET /api/v1/anticheat/status/{userId}` | Schema violation accepted | `pass` | Single-route run now rejects malformed nested user IDs and passes Schemathesis isolation checks. |
| `GET /api/v1/fraud/risk/{userId}` | Schema violation accepted | `pass` | Single-route run now rejects malformed nested user IDs and passes Schemathesis isolation checks. |
| `POST /api/v1/rooms/{roomId}/join` | Schema violation accepted | `pass` | Single-route run returned 404/warning-only behavior; the earlier acceptance is not reproducible in isolation. |
| `POST /api/v1/rooms/{roomId}/spectate` | Undocumented `409` | `pass` | Single-route run stayed in the warning-only path. |
| `POST /api/v1/archive/{matchId}` | Schema violation accepted | Pending | Archive route still returns success for mutated IDs. |
| `POST /api/v1/rooms/{roomId}/leave` | Schema violation accepted | Pending | Mutated leave payload still succeeds. |
| `GET /api/v1/presence/{userId}` | Schema violation accepted | `pass` | Single-route run completed cleanly. |
| `GET /api/v1/profiles/{userId}` | Schema violation accepted | `pass` | Single-route run completed cleanly. |
| `GET /api/v1/settings/{userId}` | Schema violation accepted | `pass` | Single-route run completed cleanly. |
| `POST /api/v1/anticheat/analyze` | Schema violation accepted | Pending | Mutated body still returns low-risk output. |
| `POST /api/v1/disputes/{disputeId}/evidence` | Binary format violation accepted | `pass` | Single-route run completed cleanly. |
| `POST /api/v1/matches/{matchId}` | Schema violation accepted | `fail` | Single-route run reproduced the schema-violation acceptance. |
| `POST /api/v1/matches/{matchId}/anonymize` | Schema violation accepted | Pending | Anonymize route still returned success for mutated IDs. |
| `POST /api/v1/sync/from-solana` | Schema violation accepted | Pending | Sync payload still reached the success path. |
| `GET /api/v1/disputes/{disputeId}` | Schema violation accepted | Pending | Returns seeded dispute data for mutated IDs. |
| `GET /api/v1/matches/{matchId}/transparency` | Schema violation accepted | Pending | Transparency route still returns fixture data. |
| `POST /api/v1/sync/reconcile` | Schema violation accepted | Pending | Reconcile route still returned `no_conflict`. |
| `GET /api/v1/replay/{matchId}/verify` | Schema violation accepted | Pending | Replay verification still returned `true`. |
| `GET /api/v1/replay/{matchId}` | Schema violation accepted | Pending | Replay route still returned fixture data. |
| `PUT /api/v1/matches/{matchId}` | Schema violation accepted | `fail` | Single-route run reproduced the schema-violation acceptance. |
| `DELETE /api/v1/matches/{matchId}` | Schema violation accepted | `fail` | Single-route run reproduced the schema-violation acceptance. |
| `POST /api/v1/ai/on_event` | Server error | `pass` | Single-route run completed cleanly; full-suite `500` looks seed-specific. |

---

## To Do

1. Keep classifying the remaining fuzz failures one by one with `TARGET_ENDPOINT`.
2. Record `pass`, `fail`, or `health-check` in the ledger without changing application code.
3. Re-run the full suite after the remaining fuzz failures are grouped into stable buckets.

---

## Notes

- `TARGET_ENDPOINT` works for single-route isolation runs.
- The latest single-route runs showed that several full-suite failures are not reproducible in isolation.
- The examples phase now passes, so the full suite reaches fuzzing again.
- The latest fuzzing run still leaves 31 failures plus 1 health-check error, so the remaining work is in fuzz classification and targeted fixes, not the suite gate.
