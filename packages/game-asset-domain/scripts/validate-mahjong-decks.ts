import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';
import { MahjongDeckDataSchema } from '@/schemas/asset/mahjong-deck-data.schema';
import { MahjongRankingDataSchema } from '@/schemas/asset/mahjong-ranking-data.schema';
import { MahjongTileDataSchema } from '@/schemas/asset/mahjong-tile-data.schema';
import { MahjongTileKind } from '@/mahjong/MahjongTileKind';
import { MahjongSuit } from '@/mahjong/MahjongSuit';
import { MahjongWind, MahjongDragon } from '@/mahjong/MahjongHonor';
import {
  computeMahjongSuitTileId,
  computeMahjongWindTileId,
  computeMahjongDragonTileId,
  computeMahjongBonusTileId,
  computeMahjongSpecialTileId,
  computeMahjongJokerTileId,
} from '@/mahjong/mahjong-id';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESOURCES_DIR = path.resolve(__dirname, '../../asset-editor/Resources');

type AssetEnvelope = { system: { guid: string; assetType: string }; data: any };
type RawAssetRecord = { relativePath: string; jsonObj: any };

const EXPECTED_MAHJONG_DECKS = new Set([
  'Mahjong 136',
  'Mahjong 144',
  'Mahjong 148',
  'Mahjong 152',
  'Mahjong 160',
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

function expectedMahjongCounts(
  includeBonusTiles: boolean,
  extraTiles: Array<{ tileId: string; count: number }>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const suit of [MahjongSuit.Characters, MahjongSuit.Bamboos, MahjongSuit.Dots]) {
    for (let r = 1; r <= 9; r++) {
      counts.set(computeMahjongSuitTileId(suit, r), 4);
    }
  }
  for (const w of [MahjongWind.East, MahjongWind.South, MahjongWind.West, MahjongWind.North]) {
    counts.set(computeMahjongWindTileId(w), 4);
  }
  for (const d of [MahjongDragon.Red, MahjongDragon.Green, MahjongDragon.White]) {
    counts.set(computeMahjongDragonTileId(d), 4);
  }
  if (includeBonusTiles) {
    for (let i = 1; i <= 4; i++) {
      counts.set(computeMahjongBonusTileId('Flower', i), 1);
      counts.set(computeMahjongBonusTileId('Season', i), 1);
    }
  }
  for (const extra of extraTiles) {
    counts.set(extra.tileId, extra.count);
  }
  return counts;
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
    if (asset.system.assetType !== 'MahjongDeck') continue;
    scanned++;

    const deckParsed = MahjongDeckDataSchema.safeParse(asset.data);
    if (!deckParsed.success) {
      failures.push({ filePath: relativePath, errors: deckParsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) });
      continue;
    }

    const deck = deckParsed.data;
    const rankingRef = deck.mahjongRankingAsset;
    const ranking =
      (rankingRef.guid ? byGuid.get(rankingRef.guid) : undefined) ??
      byRelativePath.get(normalizeAssetTreePath(String(rankingRef.path)));

    if (!ranking || ranking.asset.system.assetType !== 'MahjongRanking') {
      failures.push({ filePath: relativePath, errors: ['mahjongRankingAsset not found or wrong type'] });
      continue;
    }

    const rankingParsed = MahjongRankingDataSchema.safeParse(ranking.asset.data);
    if (!rankingParsed.success) {
      failures.push({
        filePath: relativePath,
        errors: [
          `mahjongRankingAsset schema invalid: ${ranking.relativePath}`,
          ...rankingParsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
        ],
      });
      continue;
    }

    const expected = expectedMahjongCounts(
      rankingParsed.data.includeBonusTiles,
      rankingParsed.data.extraTiles,
    );
    const got = new Map<string, number>();
    const refErrors: string[] = [];

    for (const e of deck.tiles) {
      const rel = normalizeAssetTreePath(String(e.tile.path));
      const entry = byRelativePath.get(rel);
      if (!entry || entry.asset.system.assetType !== 'MahjongTile') {
        refErrors.push(rel);
        continue;
      }
      const tileParsed = MahjongTileDataSchema.safeParse(entry.asset.data);
      if (!tileParsed.success) {
        refErrors.push(`${rel} (schema invalid)`);
        continue;
      }

      const d = tileParsed.data;
      let canonicalId: string | null = null;
      if (d.tileKind === MahjongTileKind.Suit) canonicalId = computeMahjongSuitTileId(d.suit!, d.rank!);
      if (d.tileKind === MahjongTileKind.Wind) canonicalId = computeMahjongWindTileId(d.wind!);
      if (d.tileKind === MahjongTileKind.Dragon) canonicalId = computeMahjongDragonTileId(d.dragon!);
      if (d.tileKind === MahjongTileKind.Flower) canonicalId = computeMahjongBonusTileId('Flower', d.bonusIndex!);
      if (d.tileKind === MahjongTileKind.Season) canonicalId = computeMahjongBonusTileId('Season', d.bonusIndex!);
      if (d.tileKind === MahjongTileKind.Animal) canonicalId = computeMahjongSpecialTileId('Animal', d.bonusIndex!);
      if (d.tileKind === MahjongTileKind.Face) canonicalId = computeMahjongSpecialTileId('Face', d.bonusIndex!);
      if (d.tileKind === MahjongTileKind.Emperor) canonicalId = computeMahjongSpecialTileId('Emperor', d.bonusIndex!);
      if (d.tileKind === MahjongTileKind.Empress) canonicalId = computeMahjongSpecialTileId('Empress', d.bonusIndex!);
      if (d.tileKind === MahjongTileKind.Joker) canonicalId = computeMahjongJokerTileId();
      if (!canonicalId) {
        refErrors.push(`${rel} (unknown tileKind)`);
        continue;
      }

      if (d.tileId !== canonicalId) {
        refErrors.push(`${rel} (tileId mismatch ${d.tileId} != ${canonicalId})`);
        continue;
      }

      got.set(d.tileId, (got.get(d.tileId) ?? 0) + e.count);
    }

    const missing: string[] = [];
    const extra: string[] = [];
    for (const [id, count] of expected.entries()) {
      if ((got.get(id) ?? 0) !== count) missing.push(`${id} (${got.get(id) ?? 0}/${count})`);
    }
    for (const [id, count] of got.entries()) {
      if (!expected.has(id)) extra.push(`${id} (${count})`);
    }

    const errs: string[] = [];
    const expectedTotal = [...expected.values()].reduce((a, b) => a + b, 0);
    const gotTotal = [...got.values()].reduce((a, b) => a + b, 0);
    if (gotTotal !== expectedTotal) errs.push(`total tile count mismatch: expected ${expectedTotal}, got ${gotTotal}`);
    if (missing.length > 0) errs.push(`missing/incorrect counts: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' ...' : ''}`);
    if (extra.length > 0) errs.push(`extra tileIds: ${extra.slice(0, 8).join(', ')}${extra.length > 8 ? ' ...' : ''}`);
    if (refErrors.length > 0) errs.push(`bad tile references: ${refErrors.slice(0, 5).join(', ')}${refErrors.length > 5 ? ' ...' : ''}`);
    if (errs.length > 0) failures.push({ filePath: relativePath, errors: errs });
  }

  const legacyPlaceholderDecks = rawAssets
    .filter(({ jsonObj }) => {
      const system = jsonObj?.system;
      return system?.assetType === 'Deck' && EXPECTED_MAHJONG_DECKS.has(String(system.displayName ?? ''));
    })
    .map(({ relativePath }) => relativePath);

  if (legacyPlaceholderDecks.length > 0) {
    failures.push({
      filePath: legacyPlaceholderDecks[0],
      errors: [
        'expectation: found Mahjong-family placeholder Deck assets that still have not been migrated to MahjongDeck',
        'missing specialized asset types: expected MahjongDeck + MahjongRanking + MahjongTile assets for mahjong-family decks',
        'current state: mahjong is still represented only as generic Deck/Card/CardRanking placeholders',
      ],
    });
  }

  process.stdout.write(JSON.stringify({ mahjongDeckAssets: scanned, placeholderDeckAssets: legacyPlaceholderDecks.length, failed: failures.length }, null, 2) + '\n');
  if (failures.length > 0) {
    const outPath = path.resolve(process.cwd(), 'mahjong-deck-validation-failures.json');
    fs.writeFileSync(outPath, JSON.stringify(failures, null, 2));
    process.stderr.write(`Wrote failures to ${outPath}\n`);
    process.exit(1);
  }
}

main();

