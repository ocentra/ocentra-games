# SignalingDO

**Purpose:** WebRTC signaling: up to 2 WebSocket peers; HTTP POST for offer, answer, ICE candidate. In-memory pendingOffer, pendingAnswer, iceQueue (max 64); broadcast to peers.

**Shard key:** From path/session (handler or WS route addresses DO by session id).

**HTTP surface:** POST path ending `/${SignalingDOSegment.Offer}` (body sdp); POST `/${SignalingDOSegment.Answer}` (body sdp); POST `/${SignalingDOSegment.Ice}` (body candidate). Returns JSON { accepted: true }.

**WebSocket:** Upgrade accepted; new peer added to peers[]; flushPendingToPeers. WS message types (in DO): `offer`, `answer`, `ice` (SignalingMessage type).

**Storage:** None (in-memory only).

**Handlers:** Routed via feature or WS that forwards to SignalingDO.

**Domain constants:** endpoint-domain: SignalingDOSegment, Http*.

```mermaid
sequenceDiagram
  participant Client
  participant SignalingDO
  Client->>SignalingDO: POST offer/answer/ice or WS
  SignalingDO->>SignalingDO: pendingOffer/Answer/iceQueue; broadcast
  SignalingDO-->>Client: 101 WS or JSON
```
