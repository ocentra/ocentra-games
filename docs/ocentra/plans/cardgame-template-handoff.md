# Card Game Template Handoff

## What This Is
This branch of work is the visual template route for card games, not the gameplay rewrite itself.

Current route:
- `/games/cardgame/template`

Purpose:
- shape the old card-game shell into a clean layered template
- keep the visual system configurable before we move more of it into assets/editor controls
- separate template work from the real playable Claim route

## Why We Are Doing It
The original plan was to have a common card-game UI shell that could be tuned per game:
- background
- header and footer chrome
- center table
- HUD
- seat ring
- card fan
- per-game visual knobs

This template route is the place where we are figuring out the layer model and the visual relationships first, before turning those pieces into scriptable/editor-driven layout data.

## What Is Already In Place

### Route and shell
- The template route exists and loads the old shell.
- The page already has layer toggles for:
  - background
  - header
  - table
  - seats
  - cards
  - HUD
  - tools
  - footer

### Background stack
Current background order:
1. tiled `CardBg.png`
2. gradient overlay
3. 8 anchored symbol groups

The symbol groups are split into:
- `A` club with card
- `B` club without card
- `C` diamond with card
- `D` diamond without card
- `E` spade without card
- `F` heart with card
- `G` heart without card
- `H` spade with card

The groups are rendered as paired units so the two cards move together.

### HUD and cards
- The HUD is a separate layer.
- The card fan is a child of the HUD.
- The fan scales from the HUD center, not from raw viewport size.
- The fan controls are temporary and hidden by default.

### Glass / blur work
- The temporary blur test box was removed.
- The gradient overlay was moved back below the card groups.
- The frosted effect for the special card groups was reduced and is still being tuned.
- The HUD left/right panels now use a lighter glass treatment.

## Important Files

### Shell and route
- [`src/ui/components/GameScreen/CardGameScreen/GameScreen.tsx`](/E:/ocentra-games/src/ui/components/GameScreen/CardGameScreen/GameScreen.tsx)
- [`src/ui/components/GameScreen/CardGameScreen/GameScreen.css`](/E:/ocentra-games/src/ui/components/GameScreen/CardGameScreen/GameScreen.css)
- [`src/ui/pages/games/SelectedGame/SelectedGamePage.tsx`](/E:/ocentra-games/src/ui/pages/games/SelectedGame/SelectedGamePage.tsx)
- [`src/ui/pages/games/SelectedGame/SelectedGamePage.css`](/E:/ocentra-games/src/ui/pages/games/SelectedGame/SelectedGamePage.css)

### Background and layers
- [`src/ui/components/game/GameBackground.tsx`](/E:/ocentra-games/src/ui/components/game/GameBackground.tsx)
- [`src/ui/components/game/GameBackground.css`](/E:/ocentra-games/src/ui/components/game/GameBackground.css)
- [`src/ui/components/game/BackgroundCardPair.tsx`](/E:/ocentra-games/src/ui/components/game/BackgroundCardPair.tsx)

### HUD and cards
- [`src/ui/components/GameScreen/CardGameScreen/GameHUD.tsx`](/E:/ocentra-games/src/ui/components/GameScreen/CardGameScreen/GameHUD.tsx)
- [`src/ui/components/GameScreen/CardGameScreen/GameHUD.css`](/E:/ocentra-games/src/ui/components/GameScreen/CardGameScreen/GameHUD.css)
- [`src/ui/components/GameScreen/CardGameScreen/CardGameComponents/CardInHand.tsx`](/E:/ocentra-games/src/ui/components/GameScreen/CardGameScreen/CardGameComponents/CardInHand.tsx)
- [`src/ui/components/GameScreen/CardGameScreen/CardGameComponents/CardInHand.css`](/E:/ocentra-games/src/ui/components/GameScreen/CardGameScreen/CardGameComponents/CardInHand.css)
- [`src/ui/components/GameScreen/CardGameScreen/CardGameComponents/CardInHand.constants.ts`](/E:/ocentra-games/src/ui/components/GameScreen/CardGameScreen/CardGameComponents/CardInHand.constants.ts)

### Table and seats
- [`src/ui/components/GameScreen/CardGameScreen/CardGameComponents/CenterTableSvg.tsx`](/E:/ocentra-games/src/ui/components/GameScreen/CardGameScreen/CardGameComponents/CenterTableSvg.tsx)
- [`src/ui/components/GameScreen/CardGameScreen/PlayersOnTable.tsx`](/E:/ocentra-games/src/ui/components/GameScreen/CardGameScreen/PlayersOnTable.tsx)
- [`src/ui/components/GameScreen/CardGameScreen/PlayerUI.tsx`](/E:/ocentra-games/src/ui/components/GameScreen/CardGameScreen/PlayerUI.tsx)

## What We Learned
- The blur test confirmed `backdrop-filter` works in this UI.
- The confusing part was layer order, not the blur API itself.
- The frosted blur needs to be applied to the correct background plane, not directly to the card art.
- The overlay and background need to stay separated so the cards can blur the intended surface.

## Current Design Rules
- Keep the template visually editable.
- Keep the card fan as a child of the HUD.
- Keep background texture, overlay, and symbol groups as separate layers.
- Keep temporary debug controls hidden by default.
- Do not mix this template work with the actual gameplay route unless explicitly needed.

## Next Likely Steps
- Tune the frosted effect on the special card groups.
- Tune HUD glass strength if needed.
- Refine background pair positions and spacing.
- Later: move the stable layer knobs into layout assets/editor controls.

## Short Version For A New Chat
We are polishing `/games/cardgame/template`, which is the visual template shell for card games. The route already works. The main task is tuning layer order and styling for:
- tiled `CardBg.png` background
- gradient overlay
- 8 paired symbol groups
- HUD + card fan
- header/footer chrome

The key files are the ones listed above.
