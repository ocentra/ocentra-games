# Adapters

App wiring that connects domain packages and external systems to the app.
Import integration entrypoints from this layer.

## Adapter Areas

- `assets`: asset loading, runtime content resolution, synthesis flows
- `image`: image loading and cache adapter selection
- `network`: event-driven resource and log routing bridge
- `storage`: storage-facing adapters and persistence bridge points
- `firebase`: auth/session and Firebase service wiring
- `auth` and `credentials`: platform auth and secret storage bridge
- `solana`: wallet and Solana bridge integration
- `tokens` and `stripe`: app payment/credit adapters
- `ai`: AI provider and model-management bridge into AI domain
- `game`: app game-engine bridge

## Boundary Rule

Keep orchestration/config in `src/services`.
Keep domain logic in `packages/*`.
Use adapters to translate between app runtime and domain contracts.

## Admin auth routing note

Admin UI API calls use `@ocentra/api-domain` with `authMode: 'required'`, so adapter auth bridges must resolve a token before protected requests.

- web runtime: Firebase web user token path
- desktop runtime: Tauri command bridge token path with web fallback

## Related Docs

- `ARCHITECTURE.md`
- `network/README.md`
- `../services/README.md`
- Cross-platform asset delivery (Worker `download-url`, editor vs main app): `docs/ocentra/asset-handling.md`
