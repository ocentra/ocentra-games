#!/usr/bin/env npx tsx
/**
 * Map Vite dep chunk hashes to package names.
 * Run AFTER `npm run dev` has started (or run vite directly) so node_modules/.vite/deps exists.
 *
 * Usage: npx tsx scripts/dev/chunk-map.ts
 *        npx tsx scripts/dev/chunk-map.ts chunk-VXXT4KJI
 *
 * With no args: prints full chunk→package mapping.
 * With chunk name: prints what's in that chunk.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const DEPS_META = resolve(process.cwd(), 'node_modules/.vite/deps/_metadata.json');

interface DepMeta {
  optimized?: Record<
    string,
    { file: string; src?: string; needsInterop?: boolean }
  >;
}

function main(): void {
  if (!existsSync(DEPS_META)) {
    console.error(
      'Not found: node_modules/.vite/deps/_metadata.json\n' +
        'Vite 7 may use a different cache layout.\n' +
        'Use vite-plugin-inspect instead: start dev, then visit http://localhost:3000/__inspect/\n' +
        'See docs/ocentra/performance-chunk-identification.md'
    );
    process.exit(1);
  }

  const raw = readFileSync(DEPS_META, 'utf-8');
  const meta = JSON.parse(raw) as DepMeta;
  const optimized = meta.optimized ?? {};

  const chunkArg = process.argv[2];
  if (chunkArg) {
    const target = chunkArg.replace('.js', '');
    const matches = Object.entries(optimized).filter(
      ([, v]) => v.file && v.file.replace('.js', '') === target
    );
    if (matches.length === 0) {
      console.error(`Chunk "${chunkArg}" not found in _metadata.json`);
      process.exit(1);
    }
    console.log(`Chunk ${chunkArg} contains:\n`);
    for (const [pkg, info] of matches) {
      console.log(`  ${pkg}`);
      if (info.src) console.log(`    src: ${info.src}`);
    }
    return;
  }

  const byChunk = new Map<string, string[]>();
  for (const [pkg, info] of Object.entries(optimized)) {
    const file = info.file ?? 'unknown';
    const list = byChunk.get(file) ?? [];
    list.push(pkg);
    byChunk.set(file, list);
  }

  const sorted = [...byChunk.entries()].sort(
    (a, b) => b[1].length - a[1].length
  );
  console.log('Chunk -> packages (from Vite deps metadata)\n');
  for (const [chunk, pkgs] of sorted) {
    console.log(`${chunk}`);
    for (const p of pkgs.slice(0, 15)) console.log(`  - ${p}`);
    if (pkgs.length > 15) console.log(`  ... and ${pkgs.length - 15} more`);
    console.log('');
  }
}

main();
