# @ocentra/core-ui

Shared UI components used by the main app and asset-editor. Extracted to enable reuse and faster dev startup for the asset-editor package.

## Components

- **GameFooter** – Fixed bottom footer with ocentra.ca link (no external deps)

## Usage

```ts
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
```

## Build

```bash
npm run build
```

Output: `dist/` with JS, .d.ts, and CSS.

## Adding Components

1. Create component under `src/` (e.g. `src/Header/EditorPageHeader.tsx`)
2. Add a `package.json` export for the direct file path
