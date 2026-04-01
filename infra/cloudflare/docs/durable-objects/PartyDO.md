# PartyDO

**Purpose:** Party state: create, join, leave, invite, kick, transfer-leader. Max 8 members, 32 invites. PartyState: partyId, leaderId, members, invites, createdAt.

**Shard key:** partyId (handler: create uses new UUID; else extractIdFromPath path).

**HTTP surface:** POST `/${PartyDOSegment.Create}` (body userId, partyId); POST Join, Leave, Invite, Kick, TransferLeader; GET state (PartyDOPaths.State). Paths from endpoint-domain.

**Message types:** N/A (HTTP only).

**Storage:** PartyDOStoragePrefix (boundary-domain): party state.

**Handlers:** [handlePartyRequest](../features/party.md) (feature-handlers.ts).

**Domain constants:** endpoint-domain: PartyDOSegment, PartyDOPaths; boundary-domain: PartyDOStoragePrefix.

```mermaid
sequenceDiagram
  participant Handler
  participant PartyDO
  Handler->>PartyDO: fetch Create/Join/Leave/Invite/...
  PartyDO->>PartyDO: create/join/leave/invite/kick; storage
  PartyDO-->>Handler: JSON
```
