# Party

**Purpose:** Party create, join, leave, invite, kick, transfer-leader. PartyDO sharded by partyId. Invite checks block list via PresenceDO.

**Handlers:** `handlePartyRequest` (feature-handlers.ts). Route: Party prefix. Auth required.

**Durable Object:** [PartyDO](../durable-objects/PartyDO.md). Shard key: partyId (from path or new UUID on create).

**API surface (from code):**
- POST create: no partyId in path; handler generates partyId, stub.idFromName(partyId), POST PartyDOPaths.Create with { userId, partyId }; returns { partyId }.
- GET/POST state: PartyDOPaths.State.
- POST join/leave/invite: PartyDOPaths.Join, Leave, Invite; body includes userId from auth. Invite: handler checks isBlockedBy(env, inviteeId, userId) before DO call.
- kick: path ends with 'kick'; POST to PartyDOPaths.Base + '/kick'.
- transfer-leader: path ends with 'transfer-leader'; POST to PartyDOPaths.Base + '/transfer-leader'.
- Path segments: PartyDOSegment (Join, Leave, Invite) from endpoint-domain.

**Flow**

```mermaid
sequenceDiagram
  participant Client
  participant Worker
  participant PresenceDO
  participant PartyDO

  Client->>Worker: POST /api/v1/party (create) or /party/:partyId/...
  Worker->>Worker: requireAuth; partyId from path or new UUID
  alt invite
    Worker->>PresenceDO: block check invitee
  end
  Worker->>PartyDO: stub.idFromName(partyId); fetch(path, body)
  PartyDO->>PartyDO: storage get/put
  PartyDO-->>Worker: JSON
  Worker-->>Client: JSON + CORS
```
