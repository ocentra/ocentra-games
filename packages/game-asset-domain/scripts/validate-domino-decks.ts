import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';
import { DominoDeckDataSchema } from '@/schemas/asset/domino-deck-data.schema';
import { DominoRankingDataSchema } from '@/schemas/asset/domino-ranking-data.schema';
import { DominoTileDataSchema } from '@/schemas/asset/domino-tile-data.schema';
import { computeDominoTileId } from '@/domino/domino-id';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESOURCES_DIR = path.resolve(__dirname, '../../asset-editor/Resources');

type AssetEnvelope = { system: { guid: string; assetType: string }; data: any };
type RawAssetRecord = { relativePath: string; jsonObj: any };

const EXPECTED_DOMINO_DECKS = new Set([
  'Double-6 Dominoes',
  'Double-6 Dominoes x2',
  'Double-6 Dominoes x4',
  'Double-8 Dominoes',
  'Double-9 Dominoes',
  'Double-12 Dominoes',
  'Double-15 Dominoes',
  'Double-6 + Double-12 Dominoes',
  'Double-9 + Double-12 Dominoes',
  'Chinese domino 32',
  'Chinese domino 84',
  'Daaluu 64',
  'Double-6 Dominoes (Khorol)',
  'Double-8 Dominoes (Khorol)',
  'Double-9 Dominoes (Khorol)',
  'Double-12 Dominoes (Khorol)',
  'Double-6 Dominoes (E-awase)',
  'Double-8 Dominoes (E-awase)',
  'Double-9 Dominoes (E-awase)',
  'Double-12 Dominoes (E-awase)',
]);

function findAssetFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findAssetFiles(filePath, fileList);
    } else if (file.endsWith('.asset')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function readAssetFile(absPath: string): unknown {
  const raw = fs.readFileSync(absPath, 'utf-8');
  return JSON5.parse(raw);
}

function normalizeAssetTreePath(p: string): string {
  const normalized = p.replaceAll(path.sep, '/');
  if (normalized.startsWith('asset-editor/Resources/')) return normalized;
  if (normalized.startsWith('Resources/')) return `asset-editor/${normalized}`;
  return normalized;
}

function expandTileRefs(
  tileTemplates: Array<{ path: string; guid?: string; assetType: string; displayName?: string; variant?: string | null }>,
  tileComposition?: Array<{
    tileTemplate?: { path: string; guid?: string; assetType: string; displayName?: string; variant?: string | null };
    copies?: number;
    logicalTileId?: string;
  }>,
): Array<{
  path: string;
  guid?: string;
  assetType: string;
  displayName?: string;
  variant?: string | null;
  logicalTileId?: string;
}> {
  if (Array.isArray(tileComposition) && tileComposition.length > 0) {
    return tileComposition.flatMap((entry) => {
      if (!entry.tileTemplate) {
        return [];
      }
      const copies = Math.max(1, entry.copies ?? 1);
      return Array.from({ length: copies }, () => ({
        ...entry.tileTemplate,
        logicalTileId: entry.logicalTileId,
      }));
    });
  }
  return tileTemplates;
}

function main(): void {
  if (!fs.existsSync(RESOURCES_DIR)) {
    process.stderr.write(`Resources directory not found at: ${RESOURCES_DIR}\n`);
    process.exit(1);
  }

  const assetFiles = findAssetFiles(RESOURCES_DIR);
  const byGuid = new Map<string, { relativePath: string; asset: AssetEnvelope }>();
  const byRelativePath = new Map<string, { relativePath: string; asset: AssetEnvelope }>();
  const parseFailures: Array<{ filePath: string; errors: string[] }> = [];
  const rawAssets: RawAssetRecord[] = [];

  for (const filePath of assetFiles) {
    const relativePath = normalizeAssetTreePath(
      path.relative(path.resolve(__dirname, '../..'), filePath)
    );

    let jsonObj: unknown;
    try {
      jsonObj = readAssetFile(filePath);
    } catch (e) {
      parseFailures.push({ filePath: relativePath, errors: [`JSON_PARSE_ERROR: ${String(e)}`] });
      continue;
    }

    rawAssets.push({ relativePath, jsonObj });

    const env = validateAssetFile(jsonObj);
    if (!env.success) continue;

    const asset = env.data as AssetEnvelope;
    byGuid.set(asset.system.guid, { relativePath, asset });
    byRelativePath.set(relativePath, { relativePath, asset });
  }

  const failures: Array<{ filePath: string; errors: string[] }> = [...parseFailures];
  let scanned = 0;

  for (const { relativePath, asset } of byGuid.values()) {
    if (asset.system.assetType !== 'DominoDeck') continue;
    scanned++;

    const deckParsed = DominoDeckDataSchema.safeParse(asset.data);
    if (!deckParsed.success) {
      failures.push({
        filePath: relativePath,
        errors: deckParsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      });
      continue;
    }

    const deck = deckParsed.data;
    const rankingRef = deck.dominoRankingAsset;
    const ranking =
      (rankingRef.guid ? byGuid.get(rankingRef.guid) : undefined) ??
      byRelativePath.get(normalizeAssetTreePath(String(rankingRef.path)));

    if (!ranking) {
      failures.push({
        filePath: relativePath,
        errors: [`dominoRankingAsset not found: guid=${rankingRef.guid ?? 'n/a'} path=${rankingRef.path}`],
      });
      continue;
    }

    if (ranking.asset.system.assetType !== 'DominoRanking') {
      failures.push({
        filePath: relativePath,
        errors: [`dominoRankingAsset points to non-DominoRanking assetType=${ranking.asset.system.assetType}`],
      });
      continue;
    }

    const rankingParsed = DominoRankingDataSchema.safeParse(ranking.asset.data);
    if (!rankingParsed.success) {
      failures.push({
        filePath: relativePath,
        errors: [
          `dominoRankingAsset schema invalid: ${ranking.relativePath}`,
          ...rankingParsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
        ],
      });
      continue;
    }

    const expectedIds: string[] = [];
    if (Array.isArray(rankingParsed.data.tileIds) && rankingParsed.data.tileIds.length > 0) {
      expectedIds.push(...rankingParsed.data.tileIds);
    } else {
      const maxPip = rankingParsed.data.maxPip;
      if (typeof maxPip !== 'number') {
        failures.push({
          filePath: relativePath,
          errors: ['dominoRankingAsset must define either maxPip or tileIds'],
        });
        continue;
      }
      for (let a = 0; a <= maxPip; a++) {
        for (let b = a; b <= maxPip; b++) {
          expectedIds.push(computeDominoTileId(a, b));
        }
      }
    }

    const tileIds: string[] = [];
    const badRefs: string[] = [];
    const tileRefs = expandTileRefs(deck.tileTemplates, deck.tileComposition);
    for (const t of tileRefs) {
      const rel = normalizeAssetTreePath(String(t.path));
      const entry = byRelativePath.get(rel);
      if (!entry) {
        badRefs.push(rel);
        continue;
      }
      if (entry.asset.system.assetType !== 'DominoTile') {
        badRefs.push(`${rel} (assetType=${entry.asset.system.assetType})`);
        continue;
      }
      const tileParsed = DominoTileDataSchema.safeParse(entry.asset.data);
      if (!tileParsed.success) {
        badRefs.push(`${rel} (schema invalid)`);
        continue;
      }
      tileIds.push(t.logicalTileId ?? tileParsed.data.tileId);
    }

    const gotSet = new Set(tileIds);
    const expectedSet = new Set(expectedIds);
    const missing = expectedIds.filter(x => !gotSet.has(x));
    const extra = tileIds.filter(x => !expectedSet.has(x));

    const errs: string[] = [];
    if (tileRefs.length !== expectedIds.length) {
      errs.push(`expanded tile count mismatch: expected ${expectedIds.length}, got ${tileRefs.length}`);
    }
    if (missing.length > 0) errs.push(`missing tileId(s): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' ...' : ''}`);
    if (extra.length > 0) errs.push(`extra tileId(s): ${extra.slice(0, 8).join(', ')}${extra.length > 8 ? ' ...' : ''}`);
    if (badRefs.length > 0) errs.push(`bad tile references: ${badRefs.slice(0, 5).join(', ')}${badRefs.length > 5 ? ' ...' : ''}`);

    if (errs.length > 0) failures.push({ filePath: relativePath, errors: errs });
  }

  const legacyPlaceholderDecks = rawAssets
    .filter(({ jsonObj }) => {
      const system = jsonObj?.system;
      return system?.assetType === 'Deck' && EXPECTED_DOMINO_DECKS.has(String(system.displayName ?? ''));
    })
    .map(({ relativePath }) => relativePath);

  if (legacyPlaceholderDecks.length > 0) {
    failures.push({
      filePath: legacyPlaceholderDecks[0],
      errors: [
        `expectation: found ${legacyPlaceholderDecks.length} domino-family placeholder Deck assets that still have not been migrated to DominoDeck`,
        'missing specialized asset types: expected DominoDeck + DominoRanking + DominoTile assets for domino-family decks',
        'current state: these families still exist only as generic Deck/Card/CardRanking placeholders',
      ],
    });
  }

  process.stdout.write(JSON.stringify({ dominoDeckAssets: scanned, placeholderDeckAssets: legacyPlaceholderDecks.length, failed: failures.length }, null, 2) + '\n');
  if (failures.length > 0) {
    const outPath = path.resolve(process.cwd(), 'domino-deck-validation-failures.json');
    fs.writeFileSync(outPath, JSON.stringify(failures, null, 2));
    process.stderr.write(`Wrote failures to ${outPath}\n`);
    process.exit(1);
  }
}

main();

