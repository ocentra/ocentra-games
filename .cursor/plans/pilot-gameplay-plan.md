# Pilot Gameplay Loop Plan

## Objective
Transition the current local pilot from a "validation harness" to a polished, asset-driven gameplay experience. Ensure the UI at `http://localhost:3000/games/claim/play` matches the premium aesthetics of the Asset Editor and supports a full gameplay loop for Claim, Three Card Brag, and Briscola.

## Current State vs. Target State

### Current State
- **Hardcoded Overlays**: `GameScreenPage.tsx` uses a temporary `arenaOverlay` to show hardcoded zones (Pot, Deck, Floor, Discard) that are only partially relevant to each game.
- **Seat Overlap**: The "live" seats are rendered as a custom layer in `GameScreenPage`, bypassing the layout system's default seat rendering.
- **Gated Access**: Only `claim` is enabled in `localPilotCatalog.ts` and `playableSession.ts`.
- **Limited Interaction**: Clicking the deck or table zones doesn't trigger engine actions (only HUD buttons work).

### Target State
- **Unified Contract**: The `CardGameLayout` asset defines all table zones (Deck, Discard, Pot, Trump, Floor) and their coordinates.
- **Generic Zone Rendering**: `CardGamePreviewSurface` automatically renders any zone defined in the layout asset, binding them to the `GameEngine` state.
- **Interactive Deck/Table**: Players can click the deck to "draw" or click a zone to "play/discard" if the current phase allows it.
- **Full Pilot Lineup**: Claim (Trick-taking), Three Card Brag (Vying/Betting), and Briscola (Trick-taking) are all fully playable with their specific UI needs.

---

## UI Components to Implement

### 1. Unified Score UI
- **Location**: Top right or near player avatars.
- **Binding**: Connect `gameState.players[i].score` and `gameState.round`.
- **Style**: Premium glassmorphism panel with gold accents for the leader.

### 2. Interactive Deck Component
- **Location**: Defined by `Layout` asset (typically right side).
- **Function**: Click to dispatch `draw_card` or `pick_up` action.
- **Visuals**: 3D-stacked deck appearance with a "card count" label.

### 3. Dynamic Table Zones (Mechanics Binding)
- **Concept**: A "Zone" in the layout can be bound to `mechanicsContext` properties.
- **Types**:
    - `FloorCard`: Shows a single card (e.g., Claim).
    - `Pot`: Shows currency/chips (e.g., TCB).
    - `Trick/TableCards`: Shows cards played by all players in the current trick.
    - `Trump`: Shows the current trump suit/card (e.g., Briscola).

### 4. Special Cards / Wildcards Area
- **Location**: Top of the screen (per Unity reference).
- **Function**: Display current active wildcards or trump conditions.

---

## Implementation Phases

### Phase 1: Layout Contract Stabilization
- Update `CardGameLayoutDocument` to include a `zones` array.
- Each zone should have: `id`, `label`, `position (x/y)`, `type (deck/pot/card/list)`, and `engineBinding`.
- Re-export and build `@ocentra/game-layout-domain`.

### Phase 2: Generic Zone Component
- Create a `TableZone` component in `packages/card-game-ui`.
- Implement different renderers based on the `type`:
    - `card`: Render a single `Card` component.
    - `pot`: Render a chip icon + amount.
    - `deck`: Render a card back + count.
    - `list`: Render a spread of cards (for tricks).
- Update `CardGamePreviewSurface` to map over `document.layout.zones`.

### Phase 3: Game State Binding in Pilot
- Refactor `GameScreenPage.tsx` to remove the hardcoded `arenaOverlay` content.
- Pass the "live" `gameState` down to `CardGameTemplatePage` (which passes it to the surface).
- Implement a `useGameStateBinding` hook to map `gameState` values into the zone renderers.

### Phase 4: Action Integration
- Add `onClick` handlers to `TableZone`.
- Map zone clicks to engine actions based on `legalActions`:
    - Click Deck -> `draw`
    - Click Table -> `play_card` (if a card is selected)
- Add "drag and drop" support from hand to zone for premium feel.

### Phase 5: Ungating and Family Kernels
- Add `three-card-brag` and `briscola` to `READY_LOCAL_PILOT_GAMES`.
- Update `playableSession.ts` to support different `SUPPORTED_PILOT_FAMILY` types.
- Verify that TCB's Betting/Showdown flow and Briscola's Trump logic work with the new generic zones.

---

## Test Plan
- **Asset Editor**: Verify that adding a "Pot" zone in the editor shows up in the preview.
- **Claim Pilot**: Play a full 13-trick match using only clicks on the deck and table.
- **TCB Pilot**: Verify that the Pot updates correctly after a `bet` action.
- **Briscola Pilot**: Verify that the Trump card is clearly visible and correctly identified from the deck.
