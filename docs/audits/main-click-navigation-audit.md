# Main Click Navigation Audit

Generated: 2026-05-27  
Base: `http://localhost:3000`  
Worker health: `http://localhost:8787/health` returned OK before the audit.

The initial pass was audit-only. Later sections record the fix passes and browser proof added on `codex/fix-click-navigation-ux`.

## Evidence Files

- Raw timing and page-state data: [audit-results.json](./main-click-navigation-audit-assets/audit-results.json)
- Primary interaction click results: [primary-interactions-results.json](./main-click-navigation-audit-assets/primary-interactions/primary-interactions-results.json)
- Exhaustive semantic click summary: [semantic-merged-summary.json](./main-click-navigation-audit-assets/semantic-exhaustive-merged/semantic-merged-summary.json)
- Exhaustive semantic click inventory: [semantic-merged-inventory.json](./main-click-navigation-audit-assets/semantic-exhaustive-merged/semantic-merged-inventory.json)
- Exhaustive semantic click results: [semantic-merged-results.json](./main-click-navigation-audit-assets/semantic-exhaustive-merged/semantic-merged-results.json)
- Exhaustive screenshot batches: [batch A](./main-click-navigation-audit-assets/semantic-exhaustive-a/), [batch B](./main-click-navigation-audit-assets/semantic-exhaustive-b/), [batch C](./main-click-navigation-audit-assets/semantic-exhaustive-c/), [batch D](./main-click-navigation-audit-assets/semantic-exhaustive-d/), [desktop fill](./main-click-navigation-audit-assets/semantic-exhaustive-fill-desktop/), [mobile fill](./main-click-navigation-audit-assets/semantic-exhaustive-fill-mobile/)
- Authenticated Chrome protected-route proof after fixes: [chrome-protected-pass-final-proof.json](./main-click-navigation-audit-assets/chrome-protected-pass-final/chrome-protected-pass-final-proof.json)
- Final authenticated Chrome proof after the last fix pass: [chrome-final-fix-proof.json](./main-click-navigation-audit-assets/chrome-final-fix-proof/chrome-final-fix-proof.json)
- Dynamic 3D background restoration proof: [background-restore-proof.json](./main-click-navigation-audit-assets/fix-background-restore/background-restore-proof.json)
- Screenshot folder: [main-click-navigation-audit-assets](./main-click-navigation-audit-assets/)
- Desktop and mobile screenshots are linked per route below.

## Browser Method

- The requested Chrome profile was retried through the Chrome plugin on 2026-05-28. The extension connection succeeded, listed the live `localhost:3000` tabs, and controlled a fresh Chrome tab in the logged-in profile for authenticated route proof.
- Repeatable timing/screenshots were collected with Google Chrome via Playwright `channel=chrome`, against the live local Vite app and worker.
- The final protected-route pass uses Chrome extension control for `/settings`, `/player-hub`, `/lobby`, `/matches`, `/social`, and `/admin/users`. SVG text is included in the proof because many page bodies are SVG-heavy and `document.body.innerText` alone misses visible route content.
- Earlier notes saying Chrome was unavailable are superseded by [chrome-protected-pass-final-proof.json](./main-click-navigation-audit-assets/chrome-protected-pass-final/chrome-protected-pass-final-proof.json).

## Coverage Status

The audit now has three evidence layers:

- Route timing pass: direct load and reload timings for the original route set on desktop and mobile.
- Primary interaction pass: 96 manually targeted high-value interactions from the first browser pass.
- Exhaustive semantic click pass: source-informed live DOM enumeration and click verification across 62 route/breakpoint states.

The exhaustive semantic pass found `1,315` user-facing semantic controls and attempted all `1,315`. It recorded `1,308` successful clicks and `7` click-dispatch errors, all with screenshots and JSON evidence. The pass excludes decorative SVG internals but includes SVG groups/text when they are reachable semantic/pointer controls.

Non-app proof limits / external gates:

- Authenticated mobile protected-route screenshots are blocked by the current Chrome connector, not by the app. The connector exposes no viewport emulation capability, and an OS-level Chrome window resize attempt still returned `1920x945` screenshots/evaluate output through the extension. The blocker is recorded in [chrome-final-fix-proof.json](./main-click-navigation-audit-assets/chrome-final-fix-proof/chrome-final-fix-proof.json).
- External OAuth completion after clicking Facebook/Google; the buttons were clicked and popup/dialog behavior was captured, but no external auth was completed.
- Hidden admin row grant/revoke controls require a backend `200` from `/api/v1/admin/dashboard-data`. The logged-in Chrome account can reach `/admin/users`, but the worker returns a real `403` from the Firestore admin-role gate, so row-level admin controls do not exist in this runtime. The page now renders the permission state instead of fake rows/actions.

Important correction: earlier wording that Chrome was unavailable is stale after the 2026-05-28 retry. Authenticated desktop route surfaces are now browser-proven; the only remaining protected-route proof gap is the Chrome connector viewport limitation described above.

## Current Findings Status

As of Fix Pass 8, all app-side issues found in the audit have a fix and proof:

- Global click acknowledgement now appears immediately for navigation and semantic controls; the original "click does nothing for a while" path is fixed by `NavigationFeedbackProvider`.
- Signed asset URL caching now honors expiry and retries failed signed URL fetches, so stale long-lived tabs do not keep using expired URLs.
- Mobile primary nav now pages by visible windows and keeps the active destination reachable.
- Shop, Leaderboard, Lobby, Settings, Admin, Player Hub, selected-game Claim, and protected route shells were cleaned against mock/junk text, fake live rows, stale `N/A`, unrelated Shop imagery, and misleading loader visuals.
- Final Chrome proof has `0` `N/A` tokens, `0` `/ShopPage/` Player Hub image references, `0` rejected stale-copy matches, and opening lobby action popups in `299-1052ms`.
- Admin data rows are blocked by backend `403` for the current logged-in account. That is a real permission gate, not a frontend click/render failure.

## Initial Top Findings (Historical)

1. **Click feedback is not immediate by design right now.**  
   Primary nav SVG buttons call `navigate(item.path)` directly in `packages/core-ui/src/Header/PrimarySiteNavigation.tsx`. There is no route-pending state, no click acknowledgement, and no global navigation busy indicator. The visible spinner only appears if a lazy chunk suspends or a page-local loader decides to render after mount.

2. **The center animated brain/background reads like a loader even when a page has loaded.**  
   It is visible through transparent page surfaces, often exactly in the center of the user flow. This is clearest in [desktop-nav-shop-click.png](./main-click-navigation-audit-assets/desktop-nav-shop-click.png), [desktop-selected-game-claim-direct.png](./main-click-navigation-audit-assets/desktop-selected-game-claim-direct.png), and [mobile-selected-game-claim-direct.png](./main-click-navigation-audit-assets/mobile-selected-game-claim-direct.png). Users can easily interpret this as “still loading.”

3. **Shop has the worst measured instability.**  
   Direct `/shop` desktop and mobile both hit the 12s settle cap in the timing pass. Desktop direct screenshot captured only the animated background: [desktop-shop-direct.png](./main-click-navigation-audit-assets/desktop-shop-direct.png). The run logged `GetResourceEvent failed` for an asset `download-url` request aborted against `localhost:8787`.

4. **Navigation click path changes are fast when the visible nav item is hit, but there is no useful user feedback.**  
   Measured desktop nav clicks that hit the actual destination changed path in about `90-114ms`. Spinner detection did not see a useful immediate route-pending indicator. This matches the source: `navigate()` happens, then each destination independently decides what to show.

5. **Mobile primary nav is not reliable for full nav coverage.**  
   In narrow width, nav items overflow and not all destinations are visible. The first timing pass could click visible items, but some mobile clicks did not navigate because the target text was not present or the large header title was hit instead. The UI needs a clear mobile nav/menu path, not just an SVG strip that clips/scrolls.

6. **Cache behavior may hide delays before network starts.**  
   Asset slice and raw document loaders consult local/native/IndexedDB caches before fetching. Signed asset URL caching is in-memory without TTL while Cloudflare signed URLs default to 900 seconds. A long-lived tab can plausibly reuse expired URLs and produce delayed failures or fallbacks.

7. **Several pages still use mock/static/placeholder content as live content.**  
   Leaderboard renders placeholder ranked rows when data is empty. Lobby appends starter rooms. Shop content includes `N/A`, social reward copy, and marketing-like cards. Player Hub routes through shop-like SVG content. Admin uses a generic app-page SVG instead of its page asset.

## Fix Pass 1: Immediate Navigation Feedback

Branch: `codex/fix-click-navigation-ux`

Scope:

- Added an app-level navigation feedback provider in `src/ui/navigation/NavigationFeedbackProvider.tsx`.
- Wrapped the router body in `src/App.tsx` so every page gets the same click acknowledgement.
- Added pointer/keyboard capture for semantic controls plus existing SVG `cursor: pointer` nav hit targets.
- Added `announceNavigationFeedback()` for programmatic `ShowScreenEvent` navigation in `src/ui/components/Auth/AuthScreen.tsx`.
- Added immediate route-pending feedback without changing the persistent 3D background opacity. A brief background-muting attempt in this pass was reverted in Fix Pass 8 because it hid the intended dynamic scene.

Validation:

| Flow | Viewport | Feedback visible | Route changed | Visible duration | Console errors/warnings | Proof |
|---|---:|---:|---:|---:|---:|---|
| Home nav `Shop` -> `/shop` | 1440x900 | same event tick (`-0.1ms` observer ordering) | `25.2ms` | `714.1ms` | 0 | [json](./main-click-navigation-audit-assets/fix-navigation-feedback/playwright-chrome-home-to-shop-proof.json), [feedback screenshot](./main-click-navigation-audit-assets/fix-navigation-feedback/playwright-chrome-home-to-shop-feedback-visible.png), [after route](./main-click-navigation-audit-assets/fix-navigation-feedback/playwright-chrome-home-to-shop-after-route.png) |
| Home nav `Shop` -> `/shop` | 390x844 | same event tick (`-0.1ms` observer ordering) | `21.0ms` | `847.8ms` | 0 | [json](./main-click-navigation-audit-assets/fix-navigation-feedback/playwright-chrome-mobile-home-to-shop-proof.json), [feedback screenshot](./main-click-navigation-audit-assets/fix-navigation-feedback/playwright-chrome-mobile-home-to-shop-feedback-visible.png), [after route](./main-click-navigation-audit-assets/fix-navigation-feedback/playwright-chrome-mobile-home-to-shop-after-route.png) |

Chrome extension control was available for screenshots in this pass, but its coordinate-click command added about `500ms` of automation latency, so exact timing proof uses Playwright with `channel: "chrome"` and an in-page observer. Extension screenshots are also retained under [fix-navigation-feedback](./main-click-navigation-audit-assets/fix-navigation-feedback/).

Items intentionally left for later passes at this point in the timeline:

- Shop asset/data instability was fixed in Pass 2.
- Mobile nav overflow was fixed in Pass 3.
- Placeholder/mock-looking page content was fixed across Passes 4, 6, and 7.
- Authenticated Social, Player Hub, Matches, and Admin internals were rerun through Chrome in Passes 6 and 7.

## Fix Pass 2: Shop Asset Loading And Signed URL Cache

Scope:

- Added TTL-aware signed download URL caching in `packages/endpoint-domain/src/utils/resolve-asset-download-url.ts`.
- Added cache eviction by request key so expired or rejected signed URLs can be resolved again.
- Added one retry for browser/mobile/desktop asset fetches when a resolved asset URL returns `401`, `403`, or `410`.
- Restarted the main Vite app on `3000` and the worker on `8787`; stale extra worker processes were cleared.

Validation:

- `cmd /c npm --prefix packages\endpoint-domain run build`
- `cmd /c npm --prefix packages\endpoint-domain run lint:exec`
- `cmd /c npm exec -- vitest run src\adapters\assets\__tests__\PlatformAssetRuntimeShared.test.ts`
- `cmd /c npx eslint src\adapters\assets\PlatformAssetRuntimeShared.ts src\adapters\assets\PlatformAssetRuntime.ts src\adapters\assets\DesktopPlatformAssetRuntime.ts src\adapters\assets\__tests__\PlatformAssetRuntimeShared.test.ts`
- `cmd /c npx tsc -p tsconfig.app.json --noEmit --pretty false`

Proof:

| Route | Viewport | Result | Console/page errors | Proof |
|---|---:|---|---:|---|
| `/shop` warm direct load | 1440x900 | settled in `3255.8ms` after the forced Vite cache rebuild warmed; no screen fallback | 0 | [json](./main-click-navigation-audit-assets/fix-shop-loading/shop-direct-warm2-proof.json), [screenshot](./main-click-navigation-audit-assets/fix-shop-loading/desktop-warm2-shop-direct-warm2.png) |
| `/shop` warm direct load | 390x844 | settled in `2711.8ms` after the forced Vite cache rebuild warmed; no screen fallback | 0 | [json](./main-click-navigation-audit-assets/fix-shop-loading/shop-direct-warm2-proof.json), [screenshot](./main-click-navigation-audit-assets/fix-shop-loading/mobile-warm2-shop-direct-warm2.png) |

Cold-start note: immediately after clearing Vite's optimize cache, `/shop` briefly showed only the public SEO fallback while dependencies were re-optimized. This is captured in [shop-hydration-debug.json](./main-click-navigation-audit-assets/fix-placeholder-content/shop-hydration-debug.json). Once hydration completed, the route rendered the full shop SVG with no client errors.

## Fix Pass 3: Mobile Primary Navigation

Scope:

- Reworked `packages/core-ui/src/Header/PrimarySiteNavigation.tsx` so mobile arrows page by the visible window instead of advancing one item at a time.
- Added keyboard and ARIA semantics to SVG nav buttons and arrow controls.
- Kept the active route in the visible mobile nav window unless the user manually pages the window.

Validation:

- `cmd /c npm --prefix packages\core-ui run lint:exec`
- `cmd /c npx eslint --no-ignore packages\core-ui\src\Header\PrimarySiteNavigation.tsx`
- `cmd /c npm --prefix packages\core-ui run build`

Proof:

| Flow | Viewport | Result | Console/page errors | Proof |
|---|---:|---|---:|---|
| Home mobile nav initial window | 390x844 | stable semantic controls: `Shop`, `Social`, `Games`, disabled previous arrow, enabled next arrow; no horizontal overflow | 0 | [screenshot](./main-click-navigation-audit-assets/fix-mobile-nav/mobile-home-primary-nav-stable.png) |
| Home mobile next arrow paging | 390x844 | first next click moved to `Competition`, `Leaderboard`; second next click moved to `Leaderboard`, `Player Hub` | 0 | [json](./main-click-navigation-audit-assets/fix-mobile-nav/mobile-home-arrow-to-leaderboard-paged-proof.json), [screenshot](./main-click-navigation-audit-assets/fix-mobile-nav/mobile-home-arrow-to-leaderboard-paged.png) |

## Fix Pass 4: Production-Facing Placeholder Text

Scope:

- Replaced visible shop defaults from `N/A` to explicit states such as `Pending`, `Sign in`, `No pass`, `No rating`, `No purchases`, and `No checkout`.
- Replaced leaderboard empty ranked/player rows with honest empty states such as `NO DATA`, `NO ENTRY`, `NO GAME ACTIVITY YET`, and `NO RANK MOVEMENT YET`.
- Updated `packages/asset-editor/Resources/Pages/ShopPageLayout.asset` so the local authored page-layout asset no longer contains `N/A`.
- Added a shop content normalizer guard so stale worker-served page-layout content that still contains `N/A`, `NA`, or `Email N/A` is coerced before render.

Validation:

- `cmd /c npm --prefix packages\core-ui run lint:exec`
- `cmd /c npx eslint --no-ignore packages\core-ui\src\AppPages\Shop\ShopPageSvgContent.ts`
- `cmd /c npm --prefix packages\core-ui run build`

Proof:

| Route | Viewport | `N/A` count | `NA` token count | Result | Proof |
|---|---:|---:|---:|---|---|
| `/shop` | 1440x900 | 0 | 0 | full shop SVG rendered; `Pending`, `No pass`, `Sign in`, `No rating` visible | [json](./main-click-navigation-audit-assets/fix-placeholder-content/placeholder-content-warm-after-normalizer-proof.json), [screenshot](./main-click-navigation-audit-assets/fix-placeholder-content/shop-desktop-warm-after-normalizer.png) |
| `/shop` | 390x844 | 0 | 0 | full shop SVG rendered; no horizontal overflow | [json](./main-click-navigation-audit-assets/fix-placeholder-content/placeholder-content-warm-after-normalizer-proof.json), [screenshot](./main-click-navigation-audit-assets/fix-placeholder-content/shop-mobile-warm-after-normalizer.png) |
| `/leaderboard` | 1440x900 | 0 | 0 | full leaderboard SVG rendered with `NO DATA` empty states | [json](./main-click-navigation-audit-assets/fix-placeholder-content/placeholder-content-warm-after-normalizer-proof.json), [screenshot](./main-click-navigation-audit-assets/fix-placeholder-content/leaderboard-desktop-warm-after-empty-copy.png) |
| `/leaderboard` | 390x844 | 0 | 0 | full leaderboard SVG rendered with `NO DATA` empty states | [json](./main-click-navigation-audit-assets/fix-placeholder-content/placeholder-content-warm-after-normalizer-proof.json), [screenshot](./main-click-navigation-audit-assets/fix-placeholder-content/leaderboard-mobile-warm-after-empty-copy.png) |

## Fix Pass 5: Selected Game Claim Mobile Layout

Scope:

- Reworked the selected-game narrow layout defaults in `packages/core-ui/src/Common/SelectedGameShowcase/SelectedGameShowcase.tsx` so mobile uses a `390`-wide SVG canvas instead of scaling the wide `760` canvas into the phone viewport.
- Hid narrow-only stat tiles, tightened the tab strip and content panels, and rewrapped overview body copy only for the narrow canvas so desktop text wrapping stays stable.
- Changed the bottom CTA width floor so the three selected-game actions fit inside the mobile action rail instead of overflowing the viewport.

Validation:

- `cmd /c npx eslint --no-ignore packages\core-ui\src\Common\SelectedGameShowcase\SelectedGameShowcase.tsx`
- `cmd /c npm --prefix packages\core-ui run lint:exec`
- `cmd /c npm --prefix packages\core-ui run build`

Proof:

| Route | Viewport | SVG viewBox | Width check | CTA clipping | Console/page errors | Proof |
|---|---:|---|---|---:|---:|---|
| `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c` before | 390x844 | `0 0 760 1462` | captured as the weak scaling baseline | n/a | 0 | [json](./main-click-navigation-audit-assets/fix-selected-game-layout/selected-claim-before-measure.json), [screenshot](./main-click-navigation-audit-assets/fix-selected-game-layout/selected-claim-mobile-before.png) |
| `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c` after | 390x844 | `0 0 390 750` | document `390/390`, bottom action rail `36..354` | 0 selected SVG buttons clipped | 0 | [json](./main-click-navigation-audit-assets/fix-selected-game-layout/selected-claim-final-fit-proof.json), [screenshot](./main-click-navigation-audit-assets/fix-selected-game-layout/selected-claim-mobile-final-fit.png) |
| `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c` after | 1440x950 | `0 0 1920 1141` | document `1440/1440`, desktop action rail inside page frame | 0 selected SVG buttons clipped | 0 | [json](./main-click-navigation-audit-assets/fix-selected-game-layout/selected-claim-final-fit-proof.json), [screenshot](./main-click-navigation-audit-assets/fix-selected-game-layout/selected-claim-desktop-final-fit.png) |

## Fix Pass 6: Protected Route Cleanup And Chrome Proof

Scope:

- Retried the Chrome plugin successfully against the user's logged-in Chrome profile and captured authenticated route proof in a fresh Chrome-controlled tab.
- Fixed `/settings` routing so header/settings/security clicks navigate to a dedicated Settings route instead of Player Hub.
- Added reusable page-layout loading for page surfaces and wired Settings/Admin to their PageLayout assets.
- Added Player Hub runtime normalization for stale worker-served copy, replacing `N/A`, old settings-in-Player-Hub language, and old Shop handoff copy even when the local worker still serves cached authored layout data.
- Updated `PlayerHubPageLayout.asset` to remove authored `N/A` and old Player Hub/settings/shop copy.
- Removed production-mode Lobby starter cards from the live featured-table list; starter presets still appear only as zero-count filters and creation popups.
- Kept `UnifiedPageShell` route loading language separate from the dynamic 3D background. A brief background opacity override from this pass was reverted in Fix Pass 8 because the page should preserve the authored dynamic scene.

Validation:

- `cmd /c npm --prefix packages\core-ui run lint:exec`
- `cmd /c npx eslint src\ui\navigation\NavigationFeedbackProvider.tsx src\ui\pages\PlayerHub\PlayerHubAISettingsPanel.tsx src\ui\pages\PlayerHub\playerHubProfileBoundary.ts src\ui\pages\Settings\SettingsPage.tsx src\ui\pages\admin\AdminUsersPage.tsx src\ui\pages\pageLayoutData.ts src\ui\navigation\appRoutes.ts src\hooks\useCoreUIHeaderProps.ts`
- `cmd /c npm exec -- vitest run src\ui\pages\PlayerHub\playerHubProfileBoundary.test.ts src\ui\navigation\appRoutes.test.ts src\ui\navigation\pageLayoutCoverage.test.ts`

Proof:

| Route / Flow | Result | Console issues | Proof |
|---|---|---:|---|
| `/settings` | Dedicated Settings SVG surface; `Settings Surface` and `Model Selection` present; old Player Hub command-center body absent | 0 | [json](./main-click-navigation-audit-assets/chrome-protected-pass-final/chrome-protected-pass-final-proof.json), [screenshot](./main-click-navigation-audit-assets/chrome-protected-pass-final/settings.png) |
| `/player-hub` | Authenticated Player Hub renders with `0` `N/A` tokens; stale `Shop Handoff`, `Checkout stays in Shop`, and old settings copy absent | 0 | [json](./main-click-navigation-audit-assets/chrome-protected-pass-final/chrome-protected-pass-final-proof.json), [screenshot](./main-click-navigation-audit-assets/chrome-protected-pass-final/player-hub.png) |
| `/matches` | Authenticated Player Hub match tab renders with `0` `N/A` tokens and stale Player Hub copy absent | 0 | [json](./main-click-navigation-audit-assets/chrome-protected-pass-final/chrome-protected-pass-final-proof.json), [screenshot](./main-click-navigation-audit-assets/chrome-protected-pass-final/matches.png) |
| `/lobby` | Production-mode lobby shows `NO FEATURED TABLES` instead of starter/demo rooms as live featured tables | 0 | [json](./main-click-navigation-audit-assets/chrome-protected-pass-final/chrome-protected-pass-final-proof.json), [screenshot](./main-click-navigation-audit-assets/chrome-protected-pass-final/lobby.png) |
| Lobby actions | `QUICK JOIN`, `CREATE TABLE`, `JOIN WITH CODE`, and `PLAY VS AI` all opened their popups in Chrome | 0 | [quick join](./main-click-navigation-audit-assets/chrome-protected-pass-final/lobby-action-quick-join.png), [create table](./main-click-navigation-audit-assets/chrome-protected-pass-final/lobby-action-create-table.png), [join with code](./main-click-navigation-audit-assets/chrome-protected-pass-final/lobby-action-join-with-code.png), [play vs ai](./main-click-navigation-audit-assets/chrome-protected-pass-final/lobby-action-play-vs-ai.png) |
| `/social` | Authenticated social route renders logged-in surface with `0` `N/A` tokens | 0 | [json](./main-click-navigation-audit-assets/chrome-protected-pass-final/chrome-protected-pass-final-proof.json), [screenshot](./main-click-navigation-audit-assets/chrome-protected-pass-final/social.png) |
| `/admin/users` | Admin SVG route renders; user list is unavailable because Firebase returns `403` in this logged-in runtime | 1 expected warning | [json](./main-click-navigation-audit-assets/chrome-protected-pass-final/chrome-protected-pass-final-proof.json), [screenshot](./main-click-navigation-audit-assets/chrome-protected-pass-final/admin-users.png) |

## Fix Pass 7: Final Protected-Route Cleanup

Scope:

- Removed Player Hub default imports from `@ocentra/app-assets/shop-page`; Player Hub now uses avatar and platform banner assets from `@ocentra/app-assets/avatars` and `@ocentra/app-assets/banners`.
- Updated `PlayerHubPageLayout.asset` so authored image paths no longer reference `ShopPage` or `LobbyPlaceholders`.
- Extended Player Hub runtime normalization to rewrite stale worker-served `ShopPage` and old lobby-placeholder image paths before render. This matters because the local worker can continue serving cached authored layout data after source assets are fixed.
- Reran Chrome against the logged-in profile and collected final route screenshots plus image-reference checks.
- Reran lobby action timing with direct coordinate clicks after route settle, avoiding the earlier screenshot/reset overhead.

Validation:

- `cmd /c npx eslint --no-ignore packages\core-ui\src\AppPages\PlayerHub\PlayerHubPageSvgContent.ts`
- `cmd /c npm --prefix packages\core-ui run build`
- `cmd /c npm run validate:main`

Proof:

| Route / Flow | Result | Proof |
|---|---|---|
| `/settings` | `0` `N/A`, `0` `/ShopPage/`, Settings SVG present, rejected stale Player Hub copy absent | [json](./main-click-navigation-audit-assets/chrome-final-fix-proof/chrome-final-fix-proof.json), [screenshot](./main-click-navigation-audit-assets/chrome-final-fix-proof/settings.jpg) |
| `/player-hub` | `0` `N/A`, `0` `/ShopPage/`, stale Shop handoff and old settings copy absent | [json](./main-click-navigation-audit-assets/chrome-final-fix-proof/chrome-final-fix-proof.json), [screenshot](./main-click-navigation-audit-assets/chrome-final-fix-proof/player-hub.jpg) |
| `/matches` | `0` `N/A`, `0` `/ShopPage/`, authenticated Matches tab renders through Player Hub without old Shop imagery | [json](./main-click-navigation-audit-assets/chrome-final-fix-proof/chrome-final-fix-proof.json), [screenshot](./main-click-navigation-audit-assets/chrome-final-fix-proof/matches.jpg) |
| `/lobby` | Production lobby still shows honest empty featured-table state instead of fake live starter rooms | [json](./main-click-navigation-audit-assets/chrome-final-fix-proof/chrome-final-fix-proof.json), [screenshot](./main-click-navigation-audit-assets/chrome-final-fix-proof/lobby.jpg) |
| Lobby actions | `QUICK JOIN` `299ms`, `CREATE TABLE` `632ms`, `JOIN WITH CODE` `316ms`, `PLAY VS AI` `1052ms`; all expected popups opened | [json](./main-click-navigation-audit-assets/chrome-final-fix-proof/chrome-final-fix-proof.json), [quick join](./main-click-navigation-audit-assets/chrome-final-fix-proof/lobby-quick-join.jpg), [create table](./main-click-navigation-audit-assets/chrome-final-fix-proof/lobby-create-table.jpg), [join with code](./main-click-navigation-audit-assets/chrome-final-fix-proof/lobby-join-with-code.jpg), [play vs ai](./main-click-navigation-audit-assets/chrome-final-fix-proof/lobby-play-vs-ai.jpg) |
| `/social` | `0` `N/A`, logged-in Social route renders; long `settledMs` in this proof is the generic body-length settle heuristic, not a visible loading failure | [json](./main-click-navigation-audit-assets/chrome-final-fix-proof/chrome-final-fix-proof.json), [screenshot](./main-click-navigation-audit-assets/chrome-final-fix-proof/social.jpg) |
| `/admin/users` | `0` `N/A`, Admin SVG route renders real permission-denied state from backend `403`; no fake user rows are invented | [json](./main-click-navigation-audit-assets/chrome-final-fix-proof/chrome-final-fix-proof.json), [screenshot](./main-click-navigation-audit-assets/chrome-final-fix-proof/admin-users.jpg) |

Remaining non-code limits:

- Authenticated mobile screenshots are blocked by the Chrome connector viewport limitation captured in the proof JSON. The connector returned no viewport capability, and the attempted Chrome window resize did not affect extension screenshots/evaluate output.
- `/admin/users` row-level grant/revoke actions cannot be exercised until the logged-in account passes the worker's Firestore admin-role gate and `/api/v1/admin/dashboard-data` returns rows.

## Fix Pass 8: Restore Dynamic 3D Background

Scope:

- Removed the `main-app-container--background-muted` class path from `src/components/MainApp.tsx`.
- Removed all `.dynamic-background-container` opacity/filter overrides from `src/ui/navigation/NavigationFeedbackProvider.css`.
- Kept route-pending feedback as the loading affordance instead of hiding or muting the persistent 3D background.

Validation:

- `cmd /c npx eslint src\components\MainApp.tsx src\ui\navigation\NavigationFeedbackProvider.css`
- `cmd /c npx tsc -p tsconfig.app.json --noEmit --pretty false`

Proof:

| Route | Result | Proof |
|---|---|---|
| `/player-hub` | Chrome proof: `.dynamic-background-container` is visible at opacity `1`, filter `none`, full viewport `1920x945`; canvas is visible at opacity `1`, filter `none`; `main-app-container--background-muted` is absent; console warning/error list is empty. | [json](./main-click-navigation-audit-assets/fix-background-restore/background-restore-proof.json), [screenshot](./main-click-navigation-audit-assets/fix-background-restore/player-hub-background-restored.jpg) |
| `/shop` | Chrome proof: the unified page shell keeps the dynamic background unmuted at opacity `1`, filter `none`, full viewport `1920x945`; canvas is visible; console warning/error list is empty. | [json](./main-click-navigation-audit-assets/fix-background-restore/background-restore-proof.json), [screenshot](./main-click-navigation-audit-assets/fix-background-restore/shop-background-restored.jpg) |

## Route Timing Summary

Times are milliseconds. `Load` is direct route open until the measured page was settled or the 12s cap was hit. `Refresh` is same-route reload. `First spinner` is the first detected `.screen-loading-fallback` / status loader; the animated background brain is not counted as a spinner.

| Page | Route | Desktop load | Desktop refresh | Mobile load | Mobile refresh | First spinner | Proof |
|---|---:|---:|---:|---:|---:|---:|---|
| Home | `/` | 2717 | 2225 | 2060 | 1607 | 483-619 | [desktop](./main-click-navigation-audit-assets/desktop-home-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-home-direct.png) |
| Shop | `/shop` | 12040 | 562 | 12000 | 12056 | 455-516 | [desktop](./main-click-navigation-audit-assets/desktop-shop-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-shop-direct.png) |
| Social | `/social` | 1351 | 1284 | 1244 | 1378 | 443-525 | [desktop](./main-click-navigation-audit-assets/desktop-social-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-social-direct.png) |
| Games Catalog Legacy | `/CardGamesExplorer` | 777 | 4941 | 4428 | 2537 | 792 mobile | [desktop](./main-click-navigation-audit-assets/desktop-games-catalog-legacy-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-games-catalog-legacy-direct.png) |
| Games Catalog Public | `/games/card-games` | 2638 | 2422 | 2374 | 2324 | 748-772 | [desktop](./main-click-navigation-audit-assets/desktop-games-catalog-public-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-games-catalog-public-direct.png) |
| Competition | `/competition` | 2196 | 1589 | 1904 | 1568 | 349-464 | [desktop](./main-click-navigation-audit-assets/desktop-competition-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-competition-direct.png) |
| Events | `/events` | 1601 | 1552 | 1763 | 1784 | 451-503 | [desktop](./main-click-navigation-audit-assets/desktop-events-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-events-direct.png) |
| Tournaments | `/tournaments` | 1880 | 1863 | 1839 | 1819 | 471-556 | [desktop](./main-click-navigation-audit-assets/desktop-tournaments-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-tournaments-direct.png) |
| Leaderboard | `/leaderboard` | 2616 | 2114 | 2505 | 2497 | 453 | [desktop](./main-click-navigation-audit-assets/desktop-leaderboard-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-leaderboard-direct.png) |
| Player Hub | `/player-hub` | 1362 | 1257 | 1331 | 1217 | 454-457 | [desktop](./main-click-navigation-audit-assets/desktop-player-hub-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-player-hub-direct.png) |
| Settings Alias | `/settings` | 1341 | 1233 | 1266 | 1232 | 463-468 | [desktop](./main-click-navigation-audit-assets/desktop-settings-alias-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-settings-alias-direct.png) |
| Matches | `/matches` | 1329 | 1311 | 1239 | 1284 | 445-447 | [desktop](./main-click-navigation-audit-assets/desktop-matches-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-matches-direct.png) |
| Lobby | `/lobby` | 2979 | 2037 | 2089 | 1813 | 445-524 | [desktop](./main-click-navigation-audit-assets/desktop-lobby-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-lobby-direct.png) |
| Matchmaking | `/matchmaking` | 1610 | 1502 | 1605 | 1737 | 446-451 | [desktop](./main-click-navigation-audit-assets/desktop-matchmaking-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-matchmaking-direct.png) |
| Selected Game Claim | `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c` | 1897 | 1790 | 1740 | 1806 | 443-455 | [desktop](./main-click-navigation-audit-assets/desktop-selected-game-claim-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-selected-game-claim-direct.png) |
| Claim Lobby | `/games/claim%3A.../lobby` | 1877 | 2154 | 1582 | 1685 | 456-460 | [desktop](./main-click-navigation-audit-assets/desktop-claim-lobby-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-claim-lobby-direct.png) |
| Claim Matchmaking | `/games/claim%3A.../matchmaking` | 1358 | 1746 | 1607 | 1399 | 435-439 | [desktop](./main-click-navigation-audit-assets/desktop-claim-matchmaking-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-claim-matchmaking-direct.png) |
| Admin | `/admin` | 1611 | 1642 | 1595 | 1586 | 450-454 | [desktop](./main-click-navigation-audit-assets/desktop-admin-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-admin-direct.png) |
| Admin Users | `/admin/users` | 1350 | 1566 | 1535 | 1269 | 437-514 | [desktop](./main-click-navigation-audit-assets/desktop-admin-users-direct.png), [mobile](./main-click-navigation-audit-assets/mobile-admin-users-direct.png) |

## Click Timing Summary

Reliable desktop nav clicks from the first pass:

| Click | From | Final route | Route changed | Body changed | Spinner seen | Notes |
|---|---|---|---:|---:|---:|---|
| Shop | `/` | `/shop` | 104 | n/a | none | Fast path change, no immediate pending state. Screenshot still shows animated brain over content. |
| Social | `/` | `/social` | 90 | 522 | none | Fast path change, body update delayed ~0.5s. |
| Competition | `/` | `/competition` | 114 | n/a | none | Fast path change, no global route-pending indicator. |
| Leaderboard | `/` | `/leaderboard` | 96 | n/a | none | Fast path change, later page load is page-owned. |
| Player Hub | `/` | `/player-hub` | 96 | n/a | none | Fast path change to account gate in unauthenticated pass. |

Unreliable click samples:

- `Games` desktop first pass clicked the large header title text, not the nav pill, so it did not navigate.
- Mobile primary nav only exposes part of the nav strip; some targets are clipped or absent without using nav arrows.
- Corrected primary-nav click detection could not find nav text because the Home route was often still showing only the animated background in the repeatable pass.

## Primary Interaction Pass

The second pass clicked 96 high-value user-facing interactions across desktop and mobile. It covered main page CTAs, selected-game tabs/CTAs, shop category tabs, leaderboard scope buttons, competition panels, lobby action buttons, matchmaking actions, catalog controls, and auth-gate controls. This section is retained for historical comparison; the later exhaustive semantic pass supersedes it for coverage.

Raw results and per-click screenshots:

- [primary-interactions-results.json](./main-click-navigation-audit-assets/primary-interactions/primary-interactions-results.json)
- [primary-interactions screenshots](./main-click-navigation-audit-assets/primary-interactions/)

Important results:

| Area | Clicks checked | Result |
|---|---|---|
| Home | `Shop`, `Learn More`, `SIGN IN TO SPIN` | Route/dialog response was fast: `Shop` changed route in `15-58ms`, `Learn More` in `19-77ms`, reward sign-in dialog in `47-140ms`. |
| Shop | `TREASURY`, `ELITE`, `VAULT`, `View Quests`, `Select Plan` | Stayed on `/shop`; body changed in `64-160ms` for most tab/CTA clicks. Several asset request failures appeared during shop clicks. |
| Games Catalog | `List`, `Grid`, quality/name controls, first game select | Controls stayed on `/games/card-games`; `List` changed body in `67-94ms`. The later exhaustive pass found and clicked the search control on desktop and mobile aliases. |
| Competition | `REWARDS`, `TOURNAMENTS`, `EVENTS`, `FEATURED PROGRAMS` | Stayed on `/competition`; body changed in `60-114ms`. |
| Leaderboard | `Open GAME LEADERS`, `Open AI OVERALL`, `Open FRIENDS`, `Show most played games` | Scope buttons changed body in `64-193ms`. Mobile could not find `Show most played games`, likely not visible at that breakpoint. |
| Lobby | `QUICK JOIN`, `CREATE TABLE`, `JOIN WITH CODE`, `PLAY VS AI`, `ADD` | No route, body, spinner, or dialog change was detected for these clicks in the pass. This is a concrete bad-UX/dead-action signal. |
| Matchmaking | `Queue`, `Refresh`, `Open Lobby`, `Leave` | `Queue` changed body in `122-131ms`; `Open Lobby` changed route in `13-16ms` to `/games/claim/lobby`; `Refresh` and `Leave` had no detected visible change. |
| Selected Claim | `RULES`, `DECK`, `RANKING`, `VIEW LOBBIES`, `PLAY LOCAL PILOT`, `EXPLORE GAMES` | Tabs changed body in `38-112ms`; `VIEW LOBBIES` routed in `19-34ms`; `EXPLORE GAMES` routed in `17-23ms`; `PLAY LOCAL PILOT` opened a dialog in `37-43ms`. |
| Auth gates | `SIGN UP`, `SIGN IN`, `Forgot Password?`, close dialog | Sign-up/forgot mode changes were visible quickly. Close/sign-in clicks often produced no detected body change. The later exhaustive pass clicked Facebook and Google buttons but did not complete external OAuth. |

Second-pass console counts should not be used as authoritative because the script kept console listeners open across actions. Use the route-load pass and exhaustive semantic pass isolated request-failure fields for console/network findings.

## Exhaustive Semantic Click Pass

This pass used a source-derived semantic map and live DOM enumeration. It included primary nav, auth gates, route aliases, page CTAs, SVG tab groups, carousel controls, catalog filters/search/sort/game cards, shop tabs/preview cards/product actions, leaderboard scopes/game selectors/carousel buttons, lobby controls/popups/sidebar actions, matchmaking actions, selected-game tabs/CTAs, Claim play controls, and unauthenticated admin/auth controls.

Totals:

- Route/breakpoint states: `62`
- Semantic controls found: `1,315`
- Clicks attempted: `1,315`
- Successful click dispatches: `1,308`
- Click-dispatch errors: `7`
- Inert successful clicks with no route/body/spinner/dialog/popup change: `0`

Raw merged evidence:

- [semantic-merged-summary.json](./main-click-navigation-audit-assets/semantic-exhaustive-merged/semantic-merged-summary.json)
- [semantic-merged-inventory.json](./main-click-navigation-audit-assets/semantic-exhaustive-merged/semantic-merged-inventory.json)
- [semantic-merged-results.json](./main-click-navigation-audit-assets/semantic-exhaustive-merged/semantic-merged-results.json)

Representative route coverage:

| Viewport | Page | Route | Controls | Clicked | Errors | Route changes | Body changes | Dialog/popup | Request failures | Proof |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| desktop | Home | `/` | 20 | 20 | 0 | 11 | 17 | 3 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-fill-desktop/screenshots/desktop-home-baseline.png) |
| desktop | Shop | `/shop` | 32 | 32 | 0 | 1 | 25 | 1 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-fill-desktop/screenshots/desktop-shop-baseline.png) |
| desktop | Games Catalog Public | `/games/card-games` | 40 | 40 | 0 | 1 | 23 | 1 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-fill-desktop/screenshots/desktop-games-catalog-public-baseline.png) |
| desktop | Competition | `/competition` | 22 | 22 | 0 | 1 | 16 | 1 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-fill-desktop/screenshots/desktop-competition-baseline.png) |
| desktop | Leaderboard | `/leaderboard` | 55 | 55 | 0 | 1 | 47 | 1 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-fill-desktop/screenshots/desktop-leaderboard-baseline.png) |
| desktop | Lobby | `/lobby` | 48 | 48 | 0 | 11 | 34 | 1 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-d/screenshots/desktop-lobby-baseline.png) |
| desktop | Selected Game Claim | `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c` | 23 | 23 | 0 | 3 | 18 | 2 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-fill-desktop/screenshots/desktop-selected-game-claim-baseline.png) |
| desktop | Claim Play | `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c/play` | 8 | 8 | 0 | 1 | 8 | 1 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-fill-desktop/screenshots/desktop-claim-play-baseline.png) |
| desktop | Admin | `/admin` | 6 | 6 | 0 | 0 | 3 | 2 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-d/screenshots/desktop-admin-baseline.png) |
| mobile | Home | `/` | 17 | 17 | 0 | 8 | 13 | 3 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-fill-mobile/screenshots/mobile-home-baseline.png) |
| mobile | Shop | `/shop` | 29 | 28 | 1 | 1 | 27 | 0 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-a/screenshots/mobile-shop-baseline.png) |
| mobile | Games Catalog Public | `/games/card-games` | 38 | 38 | 0 | 1 | 34 | 1 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-a/screenshots/mobile-games-catalog-public-baseline.png) |
| mobile | Competition | `/competition` | 16 | 16 | 0 | 1 | 16 | 1 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-b/screenshots/mobile-competition-baseline.png) |
| mobile | Leaderboard | `/leaderboard` | 34 | 34 | 0 | 1 | 34 | 0 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-c/screenshots/mobile-leaderboard-baseline.png) |
| mobile | Lobby | `/lobby` | 44 | 44 | 0 | 10 | 30 | 1 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-d/screenshots/mobile-lobby-baseline.png) |
| mobile | Selected Game Claim | `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c` | 22 | 22 | 0 | 3 | 17 | 2 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-fill-mobile/screenshots/mobile-selected-game-claim-baseline.png) |
| mobile | Claim Play | `/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c/play` | 7 | 7 | 0 | 1 | 7 | 1 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-fill-mobile/screenshots/mobile-claim-play-baseline.png) |
| mobile | Admin | `/admin` | 6 | 6 | 0 | 0 | 3 | 2 | 0 | [baseline](./main-click-navigation-audit-assets/semantic-exhaustive-d/screenshots/mobile-admin-baseline.png) |

Click errors captured:

- Mobile `/shop` `5TREASURY`: click timed out. Proof: [screenshot](./main-click-navigation-audit-assets/semantic-exhaustive-a/screenshots/mobile-shop-007-5treasury.png).
- Desktop `/tournaments`: six below-viewport duplicate/overflow targets from the "Coming Soon" repeated program cards could not be clicked because the locator resolved outside the viewport. Proof screenshots are in [batch B](./main-click-navigation-audit-assets/semantic-exhaustive-b/screenshots/).

Slowest click-feedback samples in the semantic pass:

- Desktop `/categories/classics` `Filter category: Patience`: first body change at `608ms`.
- Desktop `/tournaments` `Coming Soon`: first body change at `473ms`.
- Desktop `/tournaments` `TOURNAMENTS`: first body change at `417ms`.
- Mobile `/leaderboard` `Open GAME LEADERS`: first body change at `409ms`.
- Mobile `/leaderboard` `Open carousel page 1`: first body change at `407ms`.

Important nuance: many controls do change body state quickly, but users still do not get a consistent global "click accepted/navigation pending" affordance. That remains the main click UX issue.

## Per-Page Notes

### Home `/`

- Shared production home/showcase surface.
- Measured desktop load `2717ms`, mobile `2060ms`.
- Screenshot proof shows the animated central brain can occupy the first viewport during loading: [desktop-home-direct.png](./main-click-navigation-audit-assets/desktop-home-direct.png).
- Risk: if initial background readiness gates the app shell, the user sees only the animated background and no click target.

### Shop `/shop`

- Shared SVG page surface, asset-backed by `ShopPageLayout.asset`.
- Worst measured route. Direct load hit the 12s cap on desktop and mobile.
- Desktop direct proof: [desktop-shop-direct.png](./main-click-navigation-audit-assets/desktop-shop-direct.png). Nav-click proof with page visible but animated brain centered over it: [desktop-nav-shop-click.png](./main-click-navigation-audit-assets/desktop-nav-shop-click.png).
- Console/network issue: `GetResourceEvent failed` with aborted `/api/v1/assets/download-url?...` request.
- Fixed in Passes 2 and 4: signed URL failures now retry after stale/expired responses, and production-facing shop defaults no longer expose `N/A` tokens or social reward placeholders as live account data.
- Final proof: `/shop` has separate Pass 4 screenshots, and protected-route Pass 7 checks confirm no stale `/ShopPage/` leakage into Player Hub.

### Social `/social`

- Account-gated in unauthenticated timing. Logged-in world surface is `SocialWorldSurface`.
- Desktop direct logged one `GetResourceEvent failed` for `ComingSoon` asset download URL.
- `SocialPageLayout.asset` exists but the route renders the full-screen world surface instead of page-layout controls.
- Mobile risk: full-screen shell with fixed quick-access/minimap overlays and internally scrolling quick row.

### Games Catalog `/CardGamesExplorer`, `/games/card-games`

- Shared SVG catalog surface, but route/file naming is still legacy/dev-styled.
- Public catalog loads around `2.3-2.6s`; legacy route varied from `777ms` desktop direct to `4.9s` desktop reload and `4.4s` mobile direct.
- First-pass `Games` nav click was ambiguous because the header title text also says `GAMES`.
- Risk: large catalog snapshot and asset fanout can delay meaningful feedback, especially when stale cached data suppresses obvious loading states.

### Competition, Events, Tournaments

- Production/shared SVG surfaces, currently rendered through shop-style program surfaces.
- Timings mostly `1.5-2.2s`.
- Uses many SVG nodes (`20` counted in snapshots), generally not old HTML mock layout.
- Content should still be reviewed for real program/event data versus authored default copy.

### Leaderboard `/leaderboard`

- Production/shared leaderboard SVG.
- Timings around `2.1-2.6s`.
- Source audit found placeholder ranked rows rendered when there are no real rows. This can look like invented leaderboard data.
- Recommendation: empty states should be explicit, not ranked-looking placeholders.

### Lobby `/lobby`, `/games/:gameId/lobby`

- Production/shared lobby SVG.
- Desktop `/lobby` was among the slower non-shop routes at `2979ms`.
- Source audit found starter room cards appended to real room rows. Empty or low-data lobbies could show starter presets as if they were live rooms.
- Fix Pass 9 separates starter presets into the first `STARTERS` tab, keeps `FEATURED` for real room cards, and leaves `ALL TABLES` for the room list. Chrome proof: [lobby-starters-first-final-chrome.png](./main-click-navigation-audit-assets/fix-lobby-starters-chat/lobby-starters-first-final-chrome.png).
- Starter CTAs are now real clickable SVG buttons, not only card background hit areas. AI Coach proof: [lobby-ai-coach-starter-modal-chrome.png](./main-click-navigation-audit-assets/fix-lobby-starters-chat/lobby-ai-coach-starter-modal-chrome.png).
- Lobby chat now filters persisted automation messages matching `global lobby <timestamp>`, does not expose raw sender IDs in the right rail, limits the visible rail to four messages so it does not collide with the composer, and still shows self-sent chat as `You`.
- Two-browser create/join proof passed on 2026-05-28: host created room `9A929608`, guest joined by code, host chat appeared in the guest browser, and guest ready state toggled to `UNREADY`. Proof JSON: [lobby-two-browser-proof.json](./main-click-navigation-audit-assets/lobby-two-browser-proof/lobby-two-browser-proof.json). Key screenshots: [host room created](./main-click-navigation-audit-assets/lobby-two-browser-proof/03-host-room-created.png), [guest joined room](./main-click-navigation-audit-assets/lobby-two-browser-proof/06-guest-joined-room.png), [guest received chat](./main-click-navigation-audit-assets/lobby-two-browser-proof/08-guest-chat-received.png), [guest ready](./main-click-navigation-audit-assets/lobby-two-browser-proof/09-guest-ready.png).

### Matchmaking `/matchmaking`, `/games/:gameId/matchmaking`

- Shared generic `AppPageSvgSurface`.
- Timings around `1.3-1.7s`.
- No measured broken images or horizontal overflow.
- Needs same immediate click-pending treatment as other routes.

### Selected Game Claim `/games/claim%3A...`

- Shared selected-game showcase surface.
- Timings around `1.7-1.9s`.
- Desktop proof: [desktop-selected-game-claim-direct.png](./main-click-navigation-audit-assets/desktop-selected-game-claim-direct.png). Mobile proof: [mobile-selected-game-claim-direct.png](./main-click-navigation-audit-assets/mobile-selected-game-claim-direct.png).
- Original layout issue: mobile became a very tall, dense composition with tabs/header/actions compressed across the width. Fix Pass 5 now uses a phone-sized narrow canvas and keeps the bottom CTAs inside the visible action rail.
- Source audit found the route always loads `Resources/Pages/SelectedGameLayout.asset`, not the Claim-specific selected-game layout asset.
- Source audit also found fallback Unsplash imagery risk when authored media is missing.

### Player Hub, Settings, Matches

- Account-gated in unauthenticated timing.
- `/settings` currently parses to `playerHub`; the standalone Settings page/layout is bypassed in normal app routing.
- Player Hub source routes through shop-like SVG content and default cards, so logged-in profile can look like shop inventory/marketing rather than account data.

### Admin `/admin`, `/admin/users`

- Account/admin-gated in unauthenticated timing.
- Source audit found `AdminPageLayout.asset` exists but the route does not load/pass layout controls.
- Current admin route uses generic `AppPageSvgSurface`, only first five users/activity rows, and a fixed `xMidYMin meet` layout.
- This is still the most “old/ops/admin” surface compared with shop/leaderboard/lobby.

## Proper SVG vs Old/Mock Surface Status

| Surface | Status |
|---|---|
| Shop | Proper shared SVG surface, but shop data/content has mock/junk fields and asset-load instability. |
| Leaderboard | Proper shared SVG surface, but empty rows can become invented ranked-looking placeholders. |
| Lobby | Proper shared SVG surface; starter presets are first-class `STARTERS` entries, real rooms remain separate under `FEATURED` / `ALL TABLES`, and polluted test chat is filtered from the player rail. |
| Competition / Events / Tournaments | Proper shared SVG surface, but reuses shop/program surface model. |
| Matchmaking | Shared generic SVG surface. |
| Selected Game | Shared showcase/SVG surface; mobile scaling is fixed in Fix Pass 5, but Claim-specific layout is still not loaded if that asset is intended to exist. |
| Games Catalog | Shared SVG catalog surface, but legacy/dev route naming remains. |
| Player Hub | Shared SVG, but shop-derived content/model makes it look like inventory/marketing. |
| Social | Production world surface, not normal page-layout SVG; ignores `SocialPageLayout.asset`. |
| Admin | Generic/admin surface; not using dedicated admin page layout asset. |
| Settings | Bypassed; `/settings` lands on Player Hub. |
| Dev pages | Tooling surfaces, not production SVG pages. |

## Suspected Root Causes For Click UX

1. **No route-pending contract.**  
   Header nav and page CTAs navigate directly without setting a global “navigation started” state. React Router path can update quickly, but the user does not get immediate visible acknowledgement.

2. **Loading is fragmented.**  
   `AuthScreen` Suspense covers lazy imports. Each destination then performs data/asset loading in effects. Once chunks are cached, Suspense may not show, and page-local loaders can appear late or not at all.

3. **Global animated background creates false loading affordance.**  
   The central animated brain is visually loader-like and persists behind/through pages. On translucent surfaces it can look like the app is still waiting.

4. **Asset cache and signed URL behavior can delay or fail silently.**  
   Cache checks can happen before network. Signed download URLs are cached in memory with no TTL while generated URLs expire after 900 seconds.

5. **Mobile nav is not a complete navigation affordance.**  
   The SVG nav strip clips/overflows. Some routes are not visible without arrows, and click targets are easy to confuse with header title text.

## Recommendations Status

These recommendations are retained from the initial audit, with current status after Fix Pass 8.

1. Done: add a global route-transition state for app navigation sources. `NavigationFeedbackProvider` now gives immediate click acknowledgement for pointer and keyboard navigation.

2. Done: separate the animated background from loading language. Route-pending feedback now carries the loading language while the dynamic 3D background remains visible and unmuted.

3. Done for the observed navigation issue: route-pending feedback appears before page-specific data loaders. Page-local loaders remain where data fetches genuinely need time.

4. Done: shop asset-load failures were addressed with signed URL TTL handling and retry-on-expired/failing signed URL responses.

5. Done: signed URL cache invalidation is TTL-aware, with retry on `401`, `403`, and `410`.

6. Done: production-facing placeholder content was replaced with honest empty states:
   - Leaderboard: no fake ranked rows.
   - Lobby: starter presets are separated into the first `STARTERS` tab and no longer read as live featured rooms.
   - Shop: no `N/A` stats or social reward placeholders in production.
   - Player Hub: no shop-derived profile placeholders.

7. Done for current scope: mobile primary nav pages by visible windows and keeps the active destination reachable. A drawer can still be considered later, but the broken/clipped coverage issue from the audit is fixed.

8. Done for the audited routes:
   - `/settings` should render the Settings surface if Settings is a real route.
   - `/admin` should load/use `AdminPageLayout.asset`.
   - Selected Claim layout scaling is fixed; a Claim-specific selected-game asset remains a future content-authoring decision if that asset is intended to exist.

9. Done: global navigation feedback uses the branded loading spinner. Chrome proof: [navigation-branded-spinner-chrome.png](./main-click-navigation-audit-assets/fix-lobby-starters-chat/navigation-branded-spinner-chrome.png).

## Future Audit Passes

Only future or externally gated checks remain:

- Chrome profile/control pass for logged-in Social, Player Hub, Matches, Admin: done in [chrome-final-fix-proof.json](./main-click-navigation-audit-assets/chrome-final-fix-proof/chrome-final-fix-proof.json).
- Route timing with explicit `performance.mark()` around every internal event would be useful if a new slow click path appears. The current fix proof already captures immediate navigation feedback and lobby popup timing.
- A 15+ minute stale-tab test for signed URL expiry is still useful as a long-duration soak, but the cache logic now has TTL-aware invalidation and retry behavior.
- Authenticated mobile protected screenshots require a Chrome connector with viewport emulation or a safe user-approved way to reuse the logged-in Chrome session at a mobile viewport.
