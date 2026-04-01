import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import { validateAssetFile } from '@/schemas/asset/asset-file-schema';
import { CardRankingDataSchema } from '@/schemas/asset/card-ranking-data.schema';
import { getCommercialAssetViolation } from '@/schemas/asset/commercial-asset-policy';
import {
  computeExpectedCardIdentities,
  describeCardExpectation,
  normalizeCardIdentity,
} from '@/schemas/asset/deck-cross-validators';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESOURCES_DIR = path.resolve(__dirname, '../../asset-editor/Resources');

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

function countValues(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function main(): void {
  if (!fs.existsSync(RESOURCES_DIR)) {
    process.stderr.write(`Resources directory not found at: ${RESOURCES_DIR}\n`);
    process.exit(1);
  }

  const assetFiles = findAssetFiles(RESOURCES_DIR);
  const failures: Array<{ filePath: string; errors: string[] }> = [];
  let scanned = 0;
  let rankings = 0;

  for (const filePath of assetFiles) {
    const relativePath = path.relative(RESOURCES_DIR, filePath);
    const raw = fs.readFileSync(filePath, 'utf-8');
    let jsonObj: unknown;
    try {
      jsonObj = JSON5.parse(raw);
    } catch (e) {
      failures.push({ filePath: relativePath, errors: [`JSON_PARSE_ERROR: ${String(e)}`] });
      continue;
    }

    const preValidationViolation = getCommercialAssetViolation(relativePath);
    if (preValidationViolation) {
      failures.push({ filePath: relativePath, errors: [preValidationViolation] });
      continue;
    }

    scanned++;
    const env = validateAssetFile(jsonObj);
    if (!env.success) {
      continue;
    }

    const system = (env.data as { system: { assetType: string } }).system;
    const assetData = (env.data as { data: unknown }).data;
    const violation = getCommercialAssetViolation(relativePath, system.assetType, assetData);
    if (violation) {
      failures.push({ filePath: relativePath, errors: [violation] });
      continue;
    }
    if (system.assetType !== 'CardRanking') {
      continue;
    }

    rankings++;
    const data = assetData;
    const parsed = CardRankingDataSchema.safeParse(data);
    if (!parsed.success) {
      failures.push({
        filePath: relativePath,
        errors: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      });
      continue;
    }

    const expected = computeExpectedCardIdentities(parsed.data);
    const expectationLine = describeCardExpectation(parsed.data);
    const rankingErrors: string[] = [];
    if (expected.length !== parsed.data.expectedCardCount) {
      rankingErrors.push(
        `expectedCardCount mismatch: asset says ${parsed.data.expectedCardCount}, expectation engine says ${expected.length}`,
      );
    }
    const cardIdentities = (data as { cardIdentities?: unknown }).cardIdentities;
    if (Array.isArray(cardIdentities)) {
      const got = cardIdentities.map(x => normalizeCardIdentity(String(x)));
      const expectedNorm = expected.map(normalizeCardIdentity);
      const gotCounts = countValues(got);
      const expectedCounts = countValues(expectedNorm);
      const missing: string[] = [];
      const extra: string[] = [];

      for (const [id, count] of expectedCounts.entries()) {
        const actual = gotCounts.get(id) ?? 0;
        if (actual < count) {
          missing.push(`${id} (${actual}/${count})`);
        }
      }
      for (const [id, count] of gotCounts.entries()) {
        const expectedCount = expectedCounts.get(id) ?? 0;
        if (count > expectedCount) {
          extra.push(`${id} (${count}/${expectedCount})`);
        }
      }

      if (got.length !== expected.length || missing.length > 0 || extra.length > 0) {
        rankingErrors.push(`cardIdentities mismatch: expected ${expected.length}, got ${got.length}`);
        if (missing.length > 0) {
          rankingErrors.push(`missing: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ' ...' : ''}`);
        }
        if (extra.length > 0) {
          rankingErrors.push(`extra: ${extra.slice(0, 5).join(', ')}${extra.length > 5 ? ' ...' : ''}`);
        }
      }
    }

    if (rankingErrors.length > 0) {
      failures.push({
        filePath: relativePath,
        errors: [`expectation: ${expectationLine}`, ...rankingErrors],
      });
    }
  }

  process.stdout.write(
    JSON.stringify(
      {
        scannedAssets: scanned,
        cardRankingAssets: rankings,
        failed: failures.length,
      },
      null,
      2
    ) + '\n'
  );

  if (failures.length > 0) {
    const outPath = path.resolve(process.cwd(), 'card-ranking-validation-failures.json');
    fs.writeFileSync(outPath, JSON.stringify(failures, null, 2));
    process.stderr.write(`Wrote failures to ${outPath}\n`);
    process.exit(1);
  }
}

main();

