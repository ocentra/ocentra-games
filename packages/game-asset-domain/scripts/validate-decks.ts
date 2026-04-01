import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';
import { DeckDataSchema } from '@/schemas/asset/deck-data.schema';
import { CardRankingDataSchema } from '@/schemas/asset/card-ranking-data.schema';
import { CardDataSchema } from '@/schemas/asset/card-data.schema';
import { getCommercialAssetViolation } from '@/schemas/asset/commercial-asset-policy';
import { getExpectedGenericDeckCardCount } from '@/schemas/asset/deck-name-expectations';
import { primaryDeckType } from '@/schemas/asset/supported-deck-triples.schema';
import {
  computeExpectedCardIdentities,
  describeCardExpectation,
  normalizeCardIdentity,
} from '@/schemas/asset/deck-cross-validators';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESOURCES_DIR = path.resolve(__dirname, '../../asset-editor/Resources');

type AssetEnvelope = { system: { guid: string; assetType: string; treePath?: string }; data: any };

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

function countValues(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function expandDeckCardRefs(deck: { cardTemplates: Array<{ path: string; guid?: string; assetType: string; displayName?: string; variant?: string | null }>; cardComposition?: Array<{ cardTemplate: { path: string; guid?: string; assetType: string; displayName?: string; variant?: string | null }; copies: number }>; }): Array<{ path: string; guid?: string; assetType: string; displayName?: string; variant?: string | null }> {
  if (Array.isArray(deck.cardComposition) && deck.cardComposition.length > 0) {
    return deck.cardComposition.flatMap((entry) =>
      Array.from({ length: Math.max(1, entry.copies) }, () => entry.cardTemplate),
    );
  }
  return deck.cardTemplates;
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

    const preValidationViolation = getCommercialAssetViolation(relativePath);
    if (preValidationViolation) {
      parseFailures.push({ filePath: relativePath, errors: [preValidationViolation] });
      continue;
    }

    const env = validateAssetFile(jsonObj);
    if (!env.success) {
      continue;
    }

    const asset = env.data as AssetEnvelope;
    const violation = getCommercialAssetViolation(relativePath, asset.system.assetType, asset.data);
    if (violation) {
      parseFailures.push({ filePath: relativePath, errors: [violation] });
      continue;
    }
    byGuid.set(asset.system.guid, { relativePath, asset });
    byRelativePath.set(relativePath, { relativePath, asset });
  }

  const failures: Array<{ filePath: string; errors: string[] }> = [...parseFailures];
  let scannedDecks = 0;

  for (const { relativePath, asset } of byGuid.values()) {
    if (asset.system.assetType !== 'Deck') continue;
    scannedDecks++;

    const deckParsed = DeckDataSchema.safeParse(asset.data);
    if (!deckParsed.success) {
      failures.push({
        filePath: relativePath,
        errors: deckParsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      });
      continue;
    }

    const deck = deckParsed.data;
    const deckName = primaryDeckType(deck.supportedTriples);
    const deckVariantName = String(asset.system.treePath ? path.basename(relativePath, '.asset') : deck.name);
    const rankingRef = deck.cardRankingAsset;
    const ranking =
      (rankingRef.guid ? byGuid.get(rankingRef.guid) : undefined) ??
      byRelativePath.get(normalizeAssetTreePath(String(rankingRef.path)));

    if (!ranking) {
      failures.push({
        filePath: relativePath,
        errors: [`cardRankingAsset not found: guid=${rankingRef.guid ?? 'n/a'} path=${rankingRef.path}`],
      });
      continue;
    }

    if (ranking.asset.system.assetType !== 'CardRanking') {
      failures.push({
        filePath: relativePath,
        errors: [`cardRankingAsset points to non-CardRanking assetType=${ranking.asset.system.assetType}`],
      });
      continue;
    }

    const rankingParsed = CardRankingDataSchema.safeParse(ranking.asset.data);
    if (!rankingParsed.success) {
      failures.push({
        filePath: relativePath,
        errors: [
          `cardRankingAsset schema invalid: ${ranking.relativePath}`,
          ...rankingParsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
        ],
      });
      continue;
    }

    const expectedIdentities = computeExpectedCardIdentities(rankingParsed.data).map(normalizeCardIdentity);
    const expectationLine = describeCardExpectation(rankingParsed.data);
    const canonicalCount = getExpectedGenericDeckCardCount(deckName);

    const templateRefs = expandDeckCardRefs(deck);
    const actualCardIds: string[] = [];
    const badCardRefs: string[] = [];
    for (const t of templateRefs) {
      const rel = normalizeAssetTreePath(String(t.path));
      const entry = byRelativePath.get(rel);
      if (!entry) {
        badCardRefs.push(rel);
        continue;
      }
      if (entry.asset.system.assetType !== 'Card') {
        badCardRefs.push(`${rel} (assetType=${entry.asset.system.assetType})`);
        continue;
      }
      const cardParsed = CardDataSchema.safeParse(entry.asset.data);
      if (!cardParsed.success) {
        badCardRefs.push(`${rel} (schema invalid)`);
        continue;
      }
      actualCardIds.push(normalizeCardIdentity(cardParsed.data.cardId));
    }

    const expectedCounts = countValues(expectedIdentities);
    const actualCounts = countValues(actualCardIds);
    const missing: string[] = [];
    const extra: string[] = [];

    for (const [id, count] of expectedCounts.entries()) {
      const actual = actualCounts.get(id) ?? 0;
      if (actual < count) {
        missing.push(`${id} (${actual}/${count})`);
      }
    }
    for (const [id, count] of actualCounts.entries()) {
      const expected = expectedCounts.get(id) ?? 0;
      if (count > expected) {
        extra.push(`${id} (${count}/${expected})`);
      }
    }

    const errs: string[] = [];
    if (templateRefs.length !== expectedIdentities.length) {
      errs.push(`deck card count mismatch: expected ${expectedIdentities.length}, got ${templateRefs.length}`);
    }
    if (canonicalCount != null && templateRefs.length !== canonicalCount) {
      errs.push(`canonical deck size mismatch for "${deckName}" via asset "${deckVariantName}": expected ${canonicalCount} physical cards, got ${templateRefs.length}`);
    }
    if (canonicalCount != null && rankingParsed.data.expectedCardCount !== canonicalCount) {
      errs.push(`canonical ranking size mismatch for "${deckName}" via asset "${deckVariantName}": expected ${canonicalCount} physical cards, ranking declares ${rankingParsed.data.expectedCardCount}`);
    }
    if (missing.length > 0) {
      errs.push(`missing cardTemplates displayName(s): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' ...' : ''}`);
    }
    if (extra.length > 0) {
      errs.push(`extra cardTemplates displayName(s): ${extra.slice(0, 8).join(', ')}${extra.length > 8 ? ' ...' : ''}`);
    }
    if (badCardRefs.length > 0) {
      errs.push(`missing referenced Card assets: ${badCardRefs.slice(0, 5).join(', ')}${badCardRefs.length > 5 ? ' ...' : ''}`);
    }

    if (errs.length > 0) {
      failures.push({ filePath: relativePath, errors: [`expectation: ${expectationLine}`, ...errs] });
    }
  }

  process.stdout.write(
    JSON.stringify(
      {
        deckAssets: scannedDecks,
        failed: failures.length,
      },
      null,
      2
    ) + '\n'
  );

  if (failures.length > 0) {
    const outPath = path.resolve(process.cwd(), 'deck-validation-failures.json');
    fs.writeFileSync(outPath, JSON.stringify(failures, null, 2));
    process.stderr.write(`Wrote failures to ${outPath}\n`);
    process.exit(1);
  }
}

main();

