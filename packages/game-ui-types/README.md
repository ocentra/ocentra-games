# @ocentra/game-ui-types

Shared **TypeScript-only** contracts for card table UI layout: seat positions,
per-player UI overrides, and table shape styling. No runtime code and no package
dependencies.

## Scope

- **In:** Serializable keys for player UI overrides, `SeatPosition`, `SeatLayout`,
  `TableShapeSettings`.
- **Out:** Rendering, assets, editor logic, and game rules live in other packages.

## Install (workspace)

This package is consumed via the monorepo workspace (`file:../game-ui-types` in
dependents). Published npm usage is not the primary path.

## Public API

Single export path (see `package.json` `exports`):

- **`@ocentra/game-ui-types/tableLayoutTypes`** — `SerializablePlayerUIKey`,
  `SeatPosition`, `SeatLayout`, `TableShapeSettings`

Types are interfaces and string-literal unions only; they compile away at build
time for consumers that only use `import type`.

## Consumers

- **`@ocentra/game-asset-domain`** — `CardGameLayout` embeds `TableShapeSettings`
  and `SeatLayout` for layout assets.
- **`asset-editor`** — preview and layout services type against the same shapes.

## Scripts

- **`npm run build`** — `tsc` + `fix-esm-imports` for emitted `.js`
- **`npm run type-check`** — `tsc --noEmit`
- **`npm run lint`** — ESLint + type-check

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — dependency boundaries and diagram.
