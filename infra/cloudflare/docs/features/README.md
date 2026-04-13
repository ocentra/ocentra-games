# Feature docs

One doc per feature area. Content comes from handler, flow, and DO code.

```mermaid
flowchart LR
  Router[Route manifest] --> Handlers[Feature handlers]
  Handlers --> Flows[Flow orchestration]
  Flows --> Social[Social features]
  Flows --> Realtime[Realtime features]
  Flows --> Economy[Economy features]
  Flows --> AI[AI features]
  Flows --> Discovery[Discovery features]
```

## Feature index

| Feature | Doc |
| ------- | --- |
| Lobby | [lobby.md](lobby.md) |
| Matchmaking | [matchmaking.md](matchmaking.md) |
| Presence and friends | [presence-and-friends.md](presence-and-friends.md) |
| Signaling | [signaling.md](signaling.md) |
| Profile | [profile.md](profile.md) |
| Messages | [messages.md](messages.md) |
| Activity feed | [activity-feed.md](activity-feed.md) |
| Party | [party.md](party.md) |
| Leaderboard | [leaderboard.md](leaderboard.md) |
| Notifications | [notifications.md](notifications.md) |
| Discovery | [discovery.md](discovery.md) |
| Credits and economy | [credits-and-economy.md](credits-and-economy.md) |
| Payments and Stripe | [payments-and-stripe.md](payments-and-stripe.md) |
| Match coordination | [match-coordination.md](match-coordination.md) |
| AI integration | [ai-integration.md](ai-integration.md) |

See [../flows/README.md](../flows/README.md) for the flow layer that coordinates multi-DO work.
See [../ARCHITECTURE.md](../ARCHITECTURE.md#component-breakdown) for the handler-to-feature table.
