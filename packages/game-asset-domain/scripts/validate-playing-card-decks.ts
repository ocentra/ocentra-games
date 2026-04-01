import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';
import { PlayingCardDeckDataSchema } from '@/schemas/asset/playing-card-deck-data.schema';
import { PlayingCardRankingDataSchema } from '@/schemas/asset/playing-card-ranking-data.schema';
import { PlayingCardDataSchema } from '@/schemas/asset/playing-card-data.schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESOURCES_DIR = path.resolve(__dirname, '../../asset-editor/Resources');

type AssetEnvelope = { system: { guid: string; assetType: string }; data: any };
type RawAssetRecord = { relativePath: string; jsonObj: any };

const EXPECTED_PLAYING_CARD_DECKS = new Set([
  'Unsun Karuta 75',
  'Komatsufuda 48',
  'Uta-garuta 200',
  'Iroha Karuta 96',
  'Ceki 60',
  'To_tom 120',
  'Bai_choi 33',
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
    if (asset.system.assetType !== 'PlayingCardDeck') continue;
    scanned++;

    const deckParsed = PlayingCardDeckDataSchema.safeParse(asset.data);
    if (!deckParsed.success) {
      failures.push({ filePath: relativePath, errors: deckParsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) });
      continue;
    }

    const deck = deckParsed.data;
    const rankingRef = deck.playingCardRankingAsset;
    const ranking =
      (rankingRef.guid ? byGuid.get(rankingRef.guid) : undefined) ??
      byRelativePath.get(normalizeAssetTreePath(String(rankingRef.path)));

    if (!ranking || ranking.asset.system.assetType !== 'PlayingCardRanking') {
      failures.push({ filePath: relativePath, errors: ['playingCardRankingAsset not found or wrong type'] });
      continue;
    }

    const rankingParsed = PlayingCardRankingDataSchema.safeParse(ranking.asset.data);
    if (!rankingParsed.success) {
      failures.push({
        filePath: relativePath,
        errors: [
          `playingCardRankingAsset schema invalid: ${ranking.relativePath}`,
          ...rankingParsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
        ],
      });
      continue;
    }

    const expectedIds = rankingParsed.data.cards.map(c => c.cardId);
    const expectedSet = new Set(expectedIds);

    const gotIds: string[] = [];
    const refErrors: string[] = [];
    for (const t of deck.cardTemplates) {
      const rel = normalizeAssetTreePath(String(t.path));
      const entry = byRelativePath.get(rel);
      if (!entry || entry.asset.system.assetType !== 'PlayingCard') {
        refErrors.push(rel);
        continue;
      }
      const cardParsed = PlayingCardDataSchema.safeParse(entry.asset.data);
      if (!cardParsed.success) {
        refErrors.push(`${rel} (schema invalid)`);
        continue;
      }
      gotIds.push(cardParsed.data.cardId);
    }

    const gotSet = new Set(gotIds);
    const missing = expectedIds.filter(x => !gotSet.has(x));
    const extra = gotIds.filter(x => !expectedSet.has(x));

    const errs: string[] = [];
    if (deck.cardTemplates.length !== expectedIds.length) {
      errs.push(`cardTemplates length mismatch: expected ${expectedIds.length}, got ${deck.cardTemplates.length}`);
    }
    if (missing.length > 0) errs.push(`missing cardId(s): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' ...' : ''}`);
    if (extra.length > 0) errs.push(`extra cardId(s): ${extra.slice(0, 8).join(', ')}${extra.length > 8 ? ' ...' : ''}`);
    if (refErrors.length > 0) errs.push(`bad card references: ${refErrors.slice(0, 5).join(', ')}${refErrors.length > 5 ? ' ...' : ''}`);
    if (errs.length > 0) failures.push({ filePath: relativePath, errors: errs });
  }

  const legacyPlaceholderDecks = rawAssets
    .filter(({ jsonObj }) => {
      const system = jsonObj?.system;
      return system?.assetType === 'Deck' && EXPECTED_PLAYING_CARD_DECKS.has(String(system.displayName ?? ''));
    })
    .map(({ relativePath }) => relativePath);

  if (legacyPlaceholderDecks.length > 0) {
    failures.push({
      filePath: legacyPlaceholderDecks[0],
      errors: [
        `expectation: found ${legacyPlaceholderDecks.length} generic playing-card placeholder Deck assets that still have not been migrated to PlayingCardDeck`,
        'missing specialized asset types: expected PlayingCardDeck + PlayingCardRanking + PlayingCard assets for enumerated non-French families',
        'current state: these families still exist only as generic Deck/Card/CardRanking placeholders',
      ],
    });
  }

  process.stdout.write(JSON.stringify({ playingCardDeckAssets: scanned, placeholderDeckAssets: legacyPlaceholderDecks.length, failed: failures.length }, null, 2) + '\n');
  if (failures.length > 0) {
    const outPath = path.resolve(process.cwd(), 'playing-card-deck-validation-failures.json');
    fs.writeFileSync(outPath, JSON.stringify(failures, null, 2));
    process.stderr.write(`Wrote failures to ${outPath}\n`);
    process.exit(1);
  }
}

main();

