# game-ui-types — architecture

## Role

`@ocentra/game-ui-types` is a **leaf** package: one implementation file
(`src/tableLayoutTypes.ts`) with **no** runtime dependencies and **no** imports
from other `@ocentra/*` packages. It exists so layout asset definitions and UI
editors agree on the same shape for seats and table chrome without pulling in
React or game engine code.

## Module layout

```mermaid
flowchart LR
  subgraph game_ui_types["@ocentra/game-ui-types"]
    TL["tableLayoutTypes.ts"]
  end

  subgraph consumers["Consumers (import type only)"]
    GAD["game-asset-domain\nCardGameLayout"]
    AE["asset-editor\npreview / layout services"]
  end

  TL --> GAD
  TL --> AE
```

## Type grouping

```mermaid
flowchart TB
  subgraph keys["SerializablePlayerUIKey"]
    K1["baseArcRotation"]
    K2["infoBoxAngle"]
    K3["infoBoxRotation"]
  end

  subgraph seat["Seat layout"]
    SP["SeatPosition\nx, y"]
    SL["SeatLayout\nid, position, rotation, …"]
  end

  subgraph table["Table chrome"]
    TS["TableShapeSettings\nfelt, rim, emblem, …"]
  end

  keys --> SL
  SP --> SL
```

`SeatLayout.playerOverrides` maps `SerializablePlayerUIKey` to numeric
overrides. `TableShapeSettings` is a flat bag of optional visual parameters
(dimensions, felt, rim, emblem, glow).

## Boundaries

- **Stable contracts:** Changing field names or meaning requires coordinated
  updates in `game-asset-domain` layout assets and `asset-editor` previews.
- **No logic:** Validation, defaults, and serialization belong in consumers;
  this package only types.
