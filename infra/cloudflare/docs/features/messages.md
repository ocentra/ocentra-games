# Messages

**Purpose:** Per-conversation messaging: list, send, read receipt. MessageDO sharded by conversationId (convId from path). Send checks block list via PresenceDO before forwarding to MessageDO.

**Handlers:** `handleMessageRequest` (feature-handlers.ts). Route: Message prefix. Auth required.

**Durable Object:** [MessageDO](../durable-objects/MessageDO.md). Shard key: convId (extractIdFromPath(path, ApiEndpoint.Message.Base) or 'default').

**API surface (from code):**
- POST send: path ends with 'send'; body content (capped 4096); handler checks isBlockedBy(env, participantId, userId) for each participant; stub.idFromName(convId); MessageDOPaths.Send.
- GET list: MessageDOPaths.List.
- POST read-receipt: MessageDOPaths.ReadReceipt.
- Body for send: { senderId: userId, content } added by handler.

**Flow**

```mermaid
sequenceDiagram
  participant Client
  participant Worker
  participant PresenceDO
  participant MessageDO

  Client->>Worker: POST /api/v1/messages/:convId/send
  Worker->>Worker: requireAuth; convId from path
  Worker->>PresenceDO: block check per participant
  alt blocked
    Worker-->>Client: 403
  else not blocked
    Worker->>MessageDO: stub.idFromName(convId); POST Send
    MessageDO-->>Worker: JSON
    Worker-->>Client: JSON + CORS
  end
```
