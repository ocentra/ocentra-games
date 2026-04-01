import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import JSON5 from 'json5';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';
import { CardDataSchema } from '@/schemas/asset/card-data.schema';
import { CardRankingDataSchema } from '@/schemas/asset/card-ranking-data.schema';
import { getCommercialAssetViolation } from '@/schemas/asset/commercial-asset-policy';
import {
  computeExpectedCardIdentities,
  describeCardExpectation,
  getCardRankingParts,
  normalizeCardIdentity,
} from '@/schemas/asset/deck-cross-validators';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESOURCES_DIR = path.resolve(__dirname, '../../asset-editor/Resources');

type AssetEnvelope = { system: { guid: string; assetType: string }; data: any };

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

function sha256Hex(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
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
      parseFailures.push({
        filePath: relativePath,
        errors: (env.error.issues ?? []).map((i: any) => `${(i.path ?? []).join('.')}: ${i.message}`),
      });
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
  let scannedCards = 0;

  for (const { relativePath, asset } of byGuid.values()) {
    if (asset.system.assetType !== 'Card') continue;
    scannedCards++;

    const cardParsed = CardDataSchema.safeParse(asset.data);
    if (!cardParsed.success) {
      failures.push({
        filePath: relativePath,
        errors: cardParsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      });
      continue;
    }

    const card = cardParsed.data;
    const rankingRef = card.cardRankingAsset as { guid?: string | null; path?: string; assetType: string };
    const ranking =
      (rankingRef.guid ? byGuid.get(rankingRef.guid) : undefined) ??
      (rankingRef.path ? byRelativePath.get(normalizeAssetTreePath(String(rankingRef.path))) : undefined);

    if (!ranking) {
      failures.push({
        filePath: relativePath,
        errors: [`cardRankingAsset not found: guid=${rankingRef.guid ?? 'n/a'} path=${rankingRef.path ?? 'n/a'}`],
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

    const rankingParts = getCardRankingParts(rankingParsed.data);
    const expectedSet = new Set(
      computeExpectedCardIdentities(rankingParsed.data).map(normalizeCardIdentity),
    );
    const expectationLine = describeCardExpectation(rankingParsed.data);
    const errs: string[] = [];

    if (!expectedSet.has(normalizeCardIdentity(card.cardId))) {
      errs.push(`cardId "${card.cardId}" is not part of the ranking expectation set`);
    }

    if (card.imagePath) {
      const absImagePath = path.resolve(__dirname, '../../asset-editor', card.imagePath.replace(/^Resources\//, 'Resources/'));
      if (!fs.existsSync(absImagePath)) {
        errs.push(`imagePath does not exist: ${card.imagePath}`);
      } else {
        const actualHash = sha256Hex(absImagePath);
        if (actualHash !== card.imageHash) {
          errs.push(`imageHash mismatch for imagePath "${card.imagePath}"`);
        }
      }
    }

    const isTarotMinor =
      'kind' in card.cardIdentity &&
      card.cardIdentity.family === 'Tarot' &&
      card.cardIdentity.kind === 'minor';

    if (!isTarotMinor && 'suit' in card.cardIdentity && 'value' in card.cardIdentity) {
      if (rankingParts.explicitEntries.length === 0) {
        const suitOk = rankingParts.suits.some((suit) => suit.SuitName === card.cardIdentity.suit);
        const rankOk = rankingParts.rankings.some((rank) => rank.Value === card.cardIdentity.value);
        if (!suitOk) {
          errs.push(`cardIdentity.suit "${card.cardIdentity.suit}" is not present in the ranking suits`);
        }
        if (!rankOk) {
          errs.push(`cardIdentity.value "${card.cardIdentity.value}" is not present in the ranking ranks`);
        }
      }
    }

    if (errs.length > 0) {
      failures.push({ filePath: relativePath, errors: [`expectation: ${expectationLine}`, ...errs] });
    }
  }

  process.stdout.write(
    JSON.stringify(
      {
        cardAssets: scannedCards,
        failed: failures.length,
      },
      null,
      2
    ) + '\n'
  );

  if (failures.length > 0) {
    const outPath = path.resolve(process.cwd(), 'card-validation-failures.json');
    fs.writeFileSync(outPath, JSON.stringify(failures, null, 2));
    process.stderr.write(`Wrote failures to ${outPath}\n`);
    process.exit(1);
  }
}

main();
