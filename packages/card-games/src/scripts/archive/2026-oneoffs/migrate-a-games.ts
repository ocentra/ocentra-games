#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const processedDir = path.join(__dirname, '..', 'processed-games');
const files = fs
  .readdirSync(processedDir)
  .filter((f) => f.startsWith('a') && f.endsWith('.json'))
  .sort();

let updated = 0;
for (const f of files) {
  const p = path.join(processedDir, f);
  const data = JSON.parse(fs.readFileSync(p, 'utf-8')) as Record<string, unknown>;
  let modified = false;

  const overview = data.overview as Record<string, unknown> | undefined;
  if (!overview) continue;

  const players = overview.players as { minPlayers?: number; maxPlayers?: number } | undefined;
  const min = players?.minPlayers ?? 1;
  const max = players?.maxPlayers ?? 1;
  const playerMode = min === 1 && max === 1 ? 'singleplayer' : 'multiplayer';

  if (!overview.playerMode) {
    overview.playerMode = playerMode;
    modified = true;
  }

  if (overview.subCategory === '') {
    overview.subCategory = null;
    modified = true;
  }

  const engine = data.engine as { playerConfig?: { playerMode?: string }; deckCount?: number } | undefined;
  if (engine?.playerConfig && !engine.playerConfig.playerMode) {
    engine.playerConfig.playerMode = playerMode;
    modified = true;
  }

  if (engine?.deckCount === 0) {
    engine.deckCount = 1;
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    console.log('Updated:', f);
    updated++;
  }
}
console.log('Done. Updated', updated, 'files.');
