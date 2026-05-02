import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';
import {
  decodeDeckData,
  decodeDeckRankingData,
  type DeckData,
  type DeckRankingData,
} from '@/schemas/asset/deck-effect.schema';
import { getCommercialAssetViolation } from '@/schemas/asset/commercial-asset-policy';
import { getExpectedGenericDeckCardCount } from '@/schemas/asset/deck-name-expectations';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESOURCES_DIR = path.resolve(__dirname, '../../asset-editor/Resources');

type AssetEnvelope = { system: { guid: string; assetType: string; treePath?: string }; data: unknown };
type AssetIndexEntry = { relativePath: string; asset: AssetEnvelope };
type AssetRef = { path: string; guid?: string; assetType: string; displayName?: string; variant?: string | null };
type ExpandedPieceRef = { ref: AssetRef; logicalId?: string };

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

function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase();
}

function countValues(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function getPrimaryDeckType(deck: DeckData): string {
  return deck.supportedTriples[0]?.deckType ?? deck.name;
}

function expandExpectedPieceIds(ranking: DeckRankingData): string[] {
  const source = (ranking.order?.length ?? 0) > 0
    ? ranking.order
    : (ranking.cardEntries?.length ?? 0) > 0
      ? ranking.cardEntries
      : [];

  if (source.length > 0) {
    return source.flatMap((entry) => Array.from(
      { length: Math.max(1, entry.copies ?? 1) },
      () => normalizeIdentity(entry.id),
    ));
  }

  return (ranking.tileIds ?? []).map(normalizeIdentity);
}

function expandDeckPieceRefs(deck: DeckData): ExpandedPieceRef[] {
  if ((deck.composition?.length ?? 0) > 0) {
    return deck.composition!.flatMap((entry) => Array.from(
      { length: Math.max(1, entry.copies) },
      () => ({
        ref: entry.pieceTemplate as AssetRef,
        logicalId: entry.logicalId,
      }),
    ));
  }

  if ((deck.cardComposition?.length ?? 0) > 0) {
    return deck.cardComposition!.flatMap((entry) => Array.from(
      { length: Math.max(1, entry.copies) },
      () => ({ ref: entry.cardTemplate as AssetRef }),
    ));
  }

  return (deck.cardTemplates ?? []).map((ref) => ({ ref: ref as AssetRef }));
}

function resolveAssetRef(
  ref: AssetRef,
  byGuid: Map<string, AssetIndexEntry>,
  byRelativePath: Map<string, AssetIndexEntry>,
): AssetIndexEntry | undefined {
  return (ref.guid ? byGuid.get(ref.guid) : undefined)
    ?? byRelativePath.get(normalizeAssetTreePath(String(ref.path)));
}

function getPieceIdentity(piece: unknown, fallback: string | undefined): string | null {
  const record = asRecord(piece);
  const identity = asRecord(record.identity);
  const candidates = [
    record.pieceId,
    record.cardId,
    record.tileId,
    record.logicalId,
    identity.id,
    identity.cardId,
    identity.tileId,
    fallback,
  ];
  const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);
  return typeof value === 'string' ? normalizeIdentity(value) : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function main(): void {
  if (!fs.existsSync(RESOURCES_DIR)) {
    process.stderr.write(`Resources directory not found at: ${RESOURCES_DIR}\n`);
    process.exit(1);
  }

  const assetFiles = findAssetFiles(RESOURCES_DIR);
  const byGuid = new Map<string, AssetIndexEntry>();
  const byRelativePath = new Map<string, AssetIndexEntry>();
  const parseFailures: Array<{ filePath: string; errors: string[] }> = [];

  for (const filePath of assetFiles) {
    const relativePath = normalizeAssetTreePath(
      path.relative(path.resolve(__dirname, '../..'), filePath),
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

    let deck: DeckData;
    try {
      deck = decodeDeckData(asset.data);
    } catch (error) {
      failures.push({ filePath: relativePath, errors: [String(error)] });
      continue;
    }

    const rankingRef = deck.rankingAsset;
    const ranking = rankingRef
      ? resolveAssetRef(rankingRef as AssetRef, byGuid, byRelativePath)
      : undefined;

    if (!ranking) {
      failures.push({
        filePath: relativePath,
        errors: ['rankingAsset not found'],
      });
      continue;
    }

    if (ranking.asset.system.assetType !== 'DeckRanking') {
      failures.push({
        filePath: relativePath,
        errors: [`rankingAsset points to non-DeckRanking assetType=${ranking.asset.system.assetType}`],
      });
      continue;
    }

    let rankingData: DeckRankingData;
    try {
      rankingData = decodeDeckRankingData(ranking.asset.data);
    } catch (error) {
      failures.push({
        filePath: relativePath,
        errors: [`rankingAsset schema invalid: ${ranking.relativePath}`, String(error)],
      });
      continue;
    }

    const expectedIds = expandExpectedPieceIds(rankingData);
    const pieceRefs = expandDeckPieceRefs(deck);
    const actualIds: string[] = [];
    const badRefs: string[] = [];

    for (const pieceRef of pieceRefs) {
      const entry = resolveAssetRef(pieceRef.ref, byGuid, byRelativePath);
      if (!entry) {
        badRefs.push(normalizeAssetTreePath(String(pieceRef.ref.path)));
        continue;
      }

      const identity = pieceRef.logicalId
        ? normalizeIdentity(pieceRef.logicalId)
        : getPieceIdentity(entry.asset.data, pieceRef.ref.displayName ?? pieceRef.ref.variant);

      if (!identity) {
        badRefs.push(`${entry.relativePath} (missing piece identity)`);
        continue;
      }
      actualIds.push(identity);
    }

    const expectedCounts = countValues(expectedIds);
    const actualCounts = countValues(actualIds);
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
      if (expectedIds.length > 0 && count > expected) {
        extra.push(`${id} (${count}/${expected})`);
      }
    }

    const deckName = getPrimaryDeckType(deck);
    const canonicalCount = deck.pieceKind === 'card' ? getExpectedGenericDeckCardCount(deckName) : null;
    const errs: string[] = [];
    if (pieceRefs.length !== rankingData.expectedPieceCount) {
      errs.push(`deck piece count mismatch: expected ${rankingData.expectedPieceCount}, got ${pieceRefs.length}`);
    }
    if (canonicalCount != null && pieceRefs.length !== canonicalCount) {
      errs.push(`canonical deck size mismatch for "${deckName}": expected ${canonicalCount} physical cards, got ${pieceRefs.length}`);
    }
    if (missing.length > 0) {
      errs.push(`missing piece id(s): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' ...' : ''}`);
    }
    if (extra.length > 0) {
      errs.push(`extra piece id(s): ${extra.slice(0, 8).join(', ')}${extra.length > 8 ? ' ...' : ''}`);
    }
    if (badRefs.length > 0) {
      errs.push(`bad piece references: ${badRefs.slice(0, 5).join(', ')}${badRefs.length > 5 ? ' ...' : ''}`);
    }

    if (errs.length > 0) {
      failures.push({ filePath: relativePath, errors: errs });
    }
  }

  process.stdout.write(JSON.stringify({ deckAssets: scannedDecks, failed: failures.length }, null, 2) + '\n');

  if (failures.length > 0) {
    const outPath = path.resolve(process.cwd(), 'deck-validation-failures.json');
    fs.writeFileSync(outPath, JSON.stringify(failures, null, 2));
    process.stderr.write(`Wrote failures to ${outPath}\n`);
    process.exit(1);
  }
}

main();
