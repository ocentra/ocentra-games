# AntiCheatDO

**Purpose:** Per-user anti-cheat: analyze (matchId, events, moveTimingMs), report (reporterId, targetId, reason, matchId), status. Stored profile: status (clear/flagged/suspended), trustScore, analysisCount, flagCount. Max 500 reports retained.

**Shard key:** userId.

**HTTP surface:** POST `/${AntiCheatDOSegment.Analyze}`, `/${AntiCheatDOSegment.Report}`; GET `/${AntiCheatDOSegment.Status}`.

**Message types:** N/A (HTTP only).

**Storage:** AntiCheatDOStoragePrefix (boundary-domain): profile, reports.

**Handlers:** handleAntiCheatRequest (feature-handlers.ts).

**Domain constants:** endpoint-domain: AntiCheatDOSegment, Http*; boundary-domain: AntiCheatDOStoragePrefix.

```mermaid
sequenceDiagram
  participant Handler
  participant AntiCheatDO
  Handler->>AntiCheatDO: fetch Analyze/Report/Status
  AntiCheatDO->>AntiCheatDO: analyze/report; storage
  AntiCheatDO-->>Handler: JSON
```
