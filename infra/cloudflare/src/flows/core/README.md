# Flow Core Boundary

Handlers validate requests, then hand off to exactly one flow for orchestration.
Flows coordinate cross-domain work.
Durable Objects own local state and invariants.
Do not add sibling-DO orchestration here.
