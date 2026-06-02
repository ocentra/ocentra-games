# Authored Game Asset Readiness Pass - 2026-06-01

## Current State

This pass moved the authored card-game catalog into a stricter, inspectable state, but it is not a full gameplay beta yet.

- 1,413 CardGameMode assets are present in the authored game tree.
- 28,313 `.asset` files pass strict asset validation.
- Selected-game readiness runs across all 1,413 card games with zero blocking failures.
- Placeholder carousel/banner/icon/deck art is allowed only as tracked work-left, not as silent success.
- The local worker was reseeded, and the main app now reads the repaired slices.
- The main app selected-game route can render repaired authored game data and deck previews.
- All 1,413 games have nonblank GameInfo buckets, core rule fields, and Rule `exampleHands`; the generated-example blank-value pattern is now guarded by validation and currently scans clean.

## Code Changes

- Tightened selected-game readiness validation so missing or unknown deck-card images are blocking failures.
- Added explicit placeholder-card image handling so placeholder deck pieces pass with `deck-card-image-placeholder` warnings.
- Repaired processed-game public identity generation so migrated assets use canonical source `name`, `overview.description`, and rules text instead of copied prompt/synthesis text.
- Added transfer-contract validation to fail future migrations when `processedSource.name` does not match the public GameInfo hero title.
- Added runtime selected-game identity validation so stale or corrupted public GameInfo text is caught.
- Added selected-game readiness validation for bad generated rule examples such as blank opening-deal values.
- Repaired generated Rule `exampleHands` so incomplete engine blueprints fall back to source setup/player/deck text instead of rendering blank values.
- Added selected-game readiness validation for required rule fields: `objective`, `gameplay`, `keyRules`, `setup`, `turnFlow`, `moveValidityConditions`, and `exampleHands`.
- Added selected-game readiness validation for hand-wavy move-validity conditions. WIP games keep these as tracked work-left warnings; public games are blocked.
- Strengthened public migrated-game promotion so `migrationReview.status = verified` is not enough by itself; verified public migrations must include reviewer, reviewedAt, and verified checks.
- Filled Claim's custom `claimRules.asset` with explicit objective, gameplay, key rules, and turn flow.
- Fixed local dev JSON slice caching so `localhost` / `127.0.0.1` worker slice fetches bypass IndexedDB and browser HTTP cache.

## Validation Proof

Command: `cmd /c npm run validate:main`

Result: passed.

- Asset validation: 28,313 passed, 0 failed.
- Selected-game readiness: 1,413 CardGameMode assets scanned, 0 blocking failures.
- Core rules scan: 0 missing required rule fields across 1,413 CardGameMode assets.
- Main-app lint/type-check gate: passed.

Saved validation evidence:

- `docs/audits/authored-game-visual-pass-2026-06-01/validate-game-assets-after-repair.txt`
- `docs/audits/authored-game-visual-pass-2026-06-01/validate-game-assets-after-readiness-hardening.stdout.txt`
- `docs/audits/authored-game-visual-pass-2026-06-01/validate-game-assets-after-readiness-hardening.stderr.txt`
- `docs/audits/authored-game-visual-pass-2026-06-01/validate-main-after-readiness-hardening.stdout.txt`
- `docs/audits/authored-game-visual-pass-2026-06-01/validate-main-after-readiness-hardening.stderr.txt`
- `docs/audits/authored-game-visual-pass-2026-06-01/fresh-app-slices-after-repair/`
- `infra/cloudflare/.wrangler/seed-assets-local-report.json`

Local worker seed result:

- Bucket: `ocentra-assets-test`
- Mode: `local-upload`
- Files: 31,942
- Latest seed report hash: `040ccf785065ddbd88c24b76015b16834ea26a5a4d0656b5f8a1c3b5cc444e0c`

## Chrome Proof

Asset editor deck preview screenshots:

- `screenshots/editor-standard-52.png`: standard deck preview rendered, 0 broken images.
- `screenshots/editor-standard-40-italian.png`: Italian deck preview rendered, 0 broken images.
- `screenshots/editor-tiddlywink-placeholder.png`: placeholder card-back deck preview rendered, 0 broken images.
- `screenshots/editor-double-15-domino-placeholder.png`: placeholder domino tiles rendered, 0 broken images.
- `screenshots/editor-mahjong-160-placeholder.png`: mahjong placeholder tiles rendered, 0 broken images.
- `screenshots/editor-kabufuda-40-placeholder.png`: Kabufuda placeholder deck rendered, 0 broken images.

Main app route screenshots:

- `screenshots/after-repair-main-claim.png`
- `screenshots/after-repair-main-briscola.png`
- `screenshots/after-repair-main-buta-no-shippo.png`
- `screenshots/after-repair-main-booleo.png`
- `screenshots/after-repair-main-comet.png`
- `screenshots/after-cache-fix-main-crazy-eights.png`
- `screenshots/after-cache-fix-main-crazy-eights-deck.png`

Main app Chrome metrics after the cache fix:

- `/games/crazy-eights?qa=cache-fix-20260601` renders `Crazy Eights`, not stale `Comet`.
- `Game Not Found`: false.
- Loading hang count: 0.
- Console errors/warnings captured by Chrome: 0.
- Deck tab click succeeded.
- Deck tab showed 54 visible images including 52 card images, all complete, 0 broken images.

Evidence JSON:

- `chrome-main-after-cache-fix.json`
- `chrome-main-after-cache-fix-deck.json`
- `chrome-main-after-repair-audit.json`
- `chrome-visual-audit.json`

## Remaining Work-Left Warnings

These are non-blocking only because the game status is WIP. They are still real release work.

| Count | Warning                           | Meaning                                                                                       |
| ----: | --------------------------------- | --------------------------------------------------------------------------------------------- |
| 7,055 | `placeholder-image-used`             | Shared fallback art is still used for banners, icons, or carousel slides.                     |
| 1,412 | `visual-art-needs-final`             | Carousel art is intentionally not final.                                                      |
|   322 | `move-validity-needs-source-review`  | Move-validity text is too generic and needs source-checked conditions before public release.  |
|   181 | `deck-too-small-for-initial-deal`    | Source/player/deal policy needs review before the game can be trusted for actual play.        |
|   119 | `deck-card-image-placeholder`        | A deck has all required card/tile assets, but at least one piece uses shared placeholder art. |
|     2 | `game-info-not-complete`             | GameInfo quality is not complete.                                                             |
|     2 | `game-info-incomplete-flag`          | GameInfo completeness flags remain false.                                                     |

The two GameInfo quality warnings are:

- `gamemode/cardgames/games/poker/357-poker/info.asset`
- `gamemode/cardgames/games/shedding/commercial/whot-nigerian/info.asset`

## Shortfalls

- This is not a guarantee that all 1,413 games are truly playable. It proves the authored asset graph, selected-game page data, deck metadata, and representative deck rendering path are no longer silently missing or stale.
- Actual game-engine launch, single-player flow, multiplayer create/join, and two-browser gameplay were not completed for every migrated game in this pass.
- Claim remains the only known local pilot path called out by repo guidance as ready; the rest should stay WIP/Coming soon until engine-specific playtests pass.
- AI opponents/coaches are not wired for these migrated games. That is correctly deferred until gameplay rules and engine flows are proven.
- 322 games still have move-validity conditions that are too generic for release; those are WIP-only warnings and become blocking if promoted to public release status.
- 181 games/deck combinations still need source review around initial deal math, deck count, player count, or setup policy.
- The worker asset API still cannot upload very large generated files such as `index/entry.json`; local reseed works with Wrangler upload fallback. Production/dev sync should either keep that fallback or add chunking/compression before relying on the API path.
- Main app still references `OcentraLogoCommet.png` on selected-game pages. It loads successfully, but the spelling/name looks like old shared visual baggage and should be cleaned up in a UI polish pass.
- Claim is no longer an exception in the structural rules scan; its custom `claimRules.asset` now has objective, gameplay, key rules, and turn flow. Claim still needs gameplay/playtest proof like every public pilot.

## Practical Next Stage

The repo is now in a better early-beta-prep state for authored card-game pages: data is present, deck assets exist, placeholder art is tracked, validation is strict, local worker data is current, and representative Chrome proof exists.

The next true beta gate is gameplay, not asset existence:

- Pick the first 10-25 games to promote from WIP to playable.
- For each game, resolve any `deck-too-small-for-initial-deal` warning.
- Run engine-level first-deal assertions against expected hand sizes and table zones.
- Run Chrome/Playwright create-game and join-game flows, including two-browser multiplayer where applicable.
- Only then move a game from WIP/Coming soon toward public playable status.
