# Player Hub Feature Plan

## Summary

Player Hub is the private signed-in player command center for Ocentra Games. It should show the player's identity, profile/settings controls, progression, match history, lessons, AI skill tracking, tickets and passes, inventory, rewards, and credits. It must not be a generic mock page, a public profile, a shop clone, or admin tooling.

Current state on `main`:

- `/player-hub` exists and is account-gated.
- `PlayerHubPageLayout.asset` exists but only has basic `pageControls`.
- The UI still uses generic `AppPageSvgSurface`.
- Existing data only loads profile, inventory, and marketplace listings.
- Matches exist as separate private routes, but conceptually belong inside Player Hub.
- No real Player Hub asset-editor authoring surface exists.

Target:

- Build a dedicated Player Hub SVG page using the proven Shop/Competition pattern.
- Keep real user data API-backed and private.
- Use honest empty states for features not yet backed by data.
- Add proper asset-editor controls so layout, copy, and tabs can be tuned without code changes.
- Prepare the page for future Cloudflare-backed modules: lessons, AI skill tracking, competition history, rewards, and match history.

## Product Contract

- Full signed-in account users can access `/player-hub`.
- Guest users see the existing upgrade or sign-in prompt.
- Other users cannot view this private hub.
- Admin users can use their own hub, but admin management stays in Admin.
- SEO remains private and noindex.

Player Hub is private "me as a player":

- Profile identity.
- Current player status.
- Recent and active matches.
- Learning progress.
- AI-assisted skill review.
- Tournament passes and event tickets.
- Past events and tournaments.
- Inventory and equipped items.
- Rewards, badges, daily reward state.
- Credits and balance summary.
- Account, profile, privacy, AI, API, local runtime, and settings controls.

Not in scope for Player Hub:

- Full marketplace browsing. That stays in Shop.
- Public user profile. That can be a later separate player-profile surface.
- Admin player management.
- Fake production records.

## UI Plan

Use the Shop/Competition SVG page pattern as the main implementation model. Do not invent a new rough page. Start from the proven reusable page-shell behavior and adapt it to Player Hub.

Reuse:

- `ShopPageSvgSurface` layout mechanics where useful.
- Competition's pattern for adapting Shop into another product surface.
- Existing SVG visual language, icon cards, side panels, badges, tabs, carousel/list regions.
- Existing Ocentra header, footer, and page shell behavior.

Do not copy blindly:

- Remove shop-only labels, rewards wording, purchase strips, product copy, and marketplace assumptions.
- Remove competition-only terms like `Open Programs`, `Registration`, and `Tournament` unless they are inside the Competition tab.
- Do not leave duplicated tab names, old side-panel text, wrong badges, or dead click handlers.

Header:

- Title: `Player Hub`.
- Visual: player/avatar/badge-style icon, not shop or tournament art.
- Avoid long explanatory taglines inside the hero if they crowd the header.
- Check alignment on desktop and mobile.

Side panel:

- Player card: avatar or initials, display name, account type.
- Compact stats: level or rank if available, GP/AC balance, games played or win rate if available.
- Navigation tabs:
  - Overview
  - Matches
  - Learning
  - Competition
  - Inventory
  - Rewards
  - Account
- Quick actions:
  - Play
  - Matches
  - Shop
  - Account
- Bottom badge/info area can show current account or player status, similar to Shop's bottom info affordance.

Main panel tabs:

- Overview: next best actions, recent matches, learning snapshot, active ticket/pass, inventory highlights.
- Matches: active/recent/past matches, filters by game/status/date, match detail handoff.
- Learning: lessons in progress, completed lessons, recommended next lesson, AI coach insights.
- Competition: active tickets, tournament passes, check-in windows, past events/tournaments, won rewards.
- Inventory: owned items, equipped cosmetics/decks/badges, tickets/passes, empty Shop link.
- Rewards: daily reward, badges, achievements, prize/reward history.
- Account: inline profile/settings/privacy controls, linked wallet/provider state, AI settings, API settings, local runtime choices, and notification/security summary.

Empty states:

- Must be honest beta/product states.
- No fake matches, fake tickets, fake lessons, fake rewards, or fake inventory in production.
- Example: `No completed matches yet. Finished public or private room records will appear here after real match history is connected.`
- Empty states should still look designed, not blank.

## Asset Editor Plan

Add a proper Player Hub authoring surface modeled after the Competition page-layout controls.

- Extend `PlayerHubPageLayout.asset` with `playerHubControls`.
- Keep `pageControls` for generic shell values.
- Add controls for:
  - Header title/icon/image/copy.
  - Tab labels, order, enabled state, default tab.
  - Side panel modules and order.
  - Quick action labels and route targets.
  - Empty-state copy per tab.
  - Stat card labels and visibility.
  - Inventory display density.
  - Match list display mode.
  - Learning, AI, and competition section titles.
  - Preview fixture mode for editor-only demo data.

Asset editor rules:

- Asset editor authors UI structure and copy only.
- Asset editor must not author private user data, balances, matches, tickets, lessons, or inventory.
- Add a standalone asset-editor panel for Player Hub similar to `competition-page-layout-controls`.
- Use asset path `Resources/Pages/PlayerHubPageLayout.asset`.
- Save must write locally and sync through the existing PageLayout asset flow.
- Add persistence tests for Player Hub controls.

## Data And Cloudflare Plan

Use existing endpoints first, but shape the UI around the full future model.

Current usable data:

- Profile API.
- Inventory API.
- Credits and balance API.
- Player stats API.
- Marketplace exists, but should only be used lightly for Shop handoff context.
- Matches storage and handlers exist but are not yet a clean Player Hub history model.

Target data model:

- Add a future read-only aggregate endpoint: `GET /api/v1/player-hub/me`.
- Auth is required.
- Response should combine profile, credits, inventory preview, recent matches, lesson summary, AI skill summary, competition registrations, rewards, social summary, and account flags.
- First implementation may compose existing frontend calls if the aggregate API is too large for the first branch, but UI types should be ready for the aggregate shape.

Writes stay with owning domains:

- Profile update -> profile API.
- Equip item -> inventory API.
- Reward claim -> rewards API.
- Event or tournament register/check-in -> competition API.
- Lobby and match actions -> lobby/match APIs.
- Lesson progress -> future learning/progression API.

Security:

- Full hub data is owner-only.
- Public profile is a separate future surface.
- Admin viewing other users belongs in Admin, not Player Hub.
- Cloudflare handlers must use domain endpoint constants, auth middleware, and no raw boundary strings.

## Match Routes Plan

- `/matches` and `/matches/:matchId` should stop behaving like unrelated generic pages.
- Treat match history as a Player Hub module.
- Keep routes for compatibility:
  - `/matches` can redirect or render Player Hub with the Matches tab selected.
  - `/matches/:matchId` can render Player Hub match detail mode or a focused match-detail view inside the Player Hub shell.
- Match pages remain private and noindex.
- Do not merge match history into Competition. Competition is for official scheduled events and tournaments; matches are personal/user-created or played records.

## Implementation Steps

1. Create branch `codex/player-hub-real-surface`.
2. Audit current surfaces:
   - Confirm Shop, Competition, Game Explorer, and current Player Hub behavior.
   - Do not depend on the leaderboard WIP worktree until that branch is merged.
3. Build dedicated core-ui surface:
   - Replace generic `PlayerHubPageContent` body with a real Player Hub SVG surface.
   - Reuse Shop/Competition SVG layout primitives.
   - Keep responsive dimensions and vertical scroll behavior from Shop/Competition.
   - Add tab state and click behavior for all Player Hub tabs.
   - Add designed empty states for unavailable data.
4. Wire existing data:
   - Profile -> identity panel.
   - Credits/player stats -> compact stats where available.
   - Inventory -> inventory preview/tab.
   - Marketplace only as Shop handoff, not a full marketplace clone.
   - Missing lessons, AI, tickets, and matches modules show honest empty states.
5. Add Player Hub asset controls:
   - Extend asset schema/types for `playerHubControls`.
   - Add default values to `PlayerHubPageLayout.asset`.
   - Add standalone Player Hub controls panel in asset editor.
   - Save and reload controls through existing PageLayout persistence.
6. Match route consolidation:
   - Route `/matches` into Player Hub Matches tab.
   - Route `/matches/:matchId` into Player Hub match detail mode or focused private detail panel.
   - Preserve SEO/private metadata.
7. Cloudflare/data follow-up inside the same branch only if small:
   - Add a lightweight API-domain hub summary type/helper if needed.
   - Do not build the whole learning/AI/ticket backend in this first UI branch.
   - Leave clear extension points for aggregate endpoint work.
8. Live verification:
   - Start main app on port `3000` for this checkout.
   - Open `/player-hub`, `/matches`, `/matches/test-id`.
   - Verify desktop and mobile screenshots.
   - Check header alignment, tab labels, side panel content, click behavior, scroll behavior, empty states, and no leftover Shop/Competition text.
   - Open asset editor standalone Player Hub controls and verify save/reload.

## Test Plan

Unit/type tests:

- Core UI Player Hub rendering.
- Player Hub data mapping with missing/empty data.
- Route parsing for `/player-hub`, `/matches`, `/matches/:matchId`.
- SEO privacy remains noindex/nofollow for private routes.
- Asset-editor Player Hub controls persistence.

Playwright:

- `/player-hub` desktop screenshot.
- `/player-hub` mobile screenshot.
- Tab switching: Overview, Matches, Learning, Competition, Inventory, Rewards, Account.
- Empty states are visible and not blank.
- Account/profile/settings actions stay inside Player Hub; Shop and Competition are the only normal external commercial/scheduled-program handoffs.
- `/matches` opens Player Hub Matches tab.
- `/matches/:matchId` opens private match detail state.

Manual visual acceptance:

- No shop-only labels remain.
- No competition-only labels remain outside Competition tab.
- No fake production data.
- No overlapping text.
- Side panel and main panel fill space correctly after removing irrelevant blocks.
- Vertical scroll works on wide/short viewports.
- Header/icon/title alignment is checked visually.

Validation:

- `cmd /c npm --prefix packages/core-ui run lint:exec`
- `cmd /c npm --prefix packages/asset-editor run lint:exec`
- Targeted tests for route, Player Hub, and asset persistence.
- `cmd /c npm run validate:main` before PR if scope touches main route behavior.

## Assumptions And Defaults

- First branch is a real Player Hub UI and asset-editor pass, not the full backend for lessons/AI/tickets.
- Missing backend modules use honest empty states, not mock records.
- Shop remains the main marketplace/purchase surface.
- Competition remains the official events/tournaments schedule and entry surface.
- Lobby remains where public/private rooms and live game joining happen.
- Profile and Settings navigation should point to Player Hub so there is one player account surface.
- Matches become a Player Hub module, not a standalone generic page.
- Leaderboard WIP is not copied from until merged; reuse stable main-branch surfaces first.
- Main checkout uses port `3000` for visual verification.
