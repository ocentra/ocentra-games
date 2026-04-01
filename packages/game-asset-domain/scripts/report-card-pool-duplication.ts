import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const CARDS_DIR = path.join(ROOT_DIR, 'asset-editor/Resources/GameMode/CardGames/Cards');
const OUTPUT_PATH = path.resolve(process.cwd(), 'card-pool-duplication-report.json');

type CardAssetJson = {
  system?: {
    guid?: string;
    displayName?: string;
  };
  data?: {
    cardId?: string;
    cardIdentity?: Record<string, unknown>;
    imageHash?: string;
  };
};

type IdentityBucket = {
  identityKey: string;
  family: string;
  cardId: string;
  count: number;
  samplePaths: string[];
};

type FamilySummary = {
  family: string;
  totalCardAssets: number;
  uniqueIdentityRecords: number;
  duplicatedIdentityRecords: number;
  extraPhysicalCopiesBeyondUniqueIdentity: number;
};

function walkAssetFiles(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const out: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.asset')) {
        out.push(fullPath);
      }
    }
  }

  return out.sort();
}

function readCardAsset(filePath: string): CardAssetJson {
  return JSON5.parse(fs.readFileSync(filePath, 'utf8')) as CardAssetJson;
}

function toRelativePath(filePath: string): string {
  return path.relative(ROOT_DIR, filePath).replaceAll('\\', '/');
}

function getFamily(card: CardAssetJson): string {
  const family = card.data?.cardIdentity?.family;
  return typeof family === 'string' && family.length > 0 ? family : 'Unknown';
}

function getIdentityKey(card: CardAssetJson): string {
  return JSON.stringify({
    cardId: card.data?.cardId ?? '',
    cardIdentity: card.data?.cardIdentity ?? {},
  });
}

function main(): void {
  const files = walkAssetFiles(CARDS_DIR);
  const identityBuckets = new Map<string, IdentityBucket>();
  const familyStats = new Map<string, FamilySummary>();

  for (const file of files) {
    const card = readCardAsset(file);
    const identityKey = getIdentityKey(card);
    const family = getFamily(card);
    const cardId = String(card.data?.cardId ?? '');
    const relativePath = toRelativePath(file);

    const bucket = identityBuckets.get(identityKey) ?? {
      identityKey,
      family,
      cardId,
      count: 0,
      samplePaths: [],
    };
    bucket.count += 1;
    if (bucket.samplePaths.length < 5) {
      bucket.samplePaths.push(relativePath);
    }
    identityBuckets.set(identityKey, bucket);

    const summary = familyStats.get(family) ?? {
      family,
      totalCardAssets: 0,
      uniqueIdentityRecords: 0,
      duplicatedIdentityRecords: 0,
      extraPhysicalCopiesBeyondUniqueIdentity: 0,
    };
    summary.totalCardAssets += 1;
    familyStats.set(family, summary);
  }

  for (const bucket of identityBuckets.values()) {
    const summary = familyStats.get(bucket.family);
    if (!summary) {
      continue;
    }
    summary.uniqueIdentityRecords += 1;
    if (bucket.count > 1) {
      summary.duplicatedIdentityRecords += 1;
      summary.extraPhysicalCopiesBeyondUniqueIdentity += bucket.count - 1;
    }
  }

  const duplicatedBuckets = Array.from(identityBuckets.values())
    .filter((bucket) => bucket.count > 1)
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.cardId.localeCompare(right.cardId);
    });

  const report = {
    totalCardAssets: files.length,
    uniqueIdentityRecords: identityBuckets.size,
    duplicatedIdentityRecords: duplicatedBuckets.length,
    extraPhysicalCopiesBeyondUniqueIdentity: duplicatedBuckets.reduce(
      (sum, bucket) => sum + (bucket.count - 1),
      0,
    ),
    familySummaries: Array.from(familyStats.values()).sort((left, right) =>
      left.family.localeCompare(right.family),
    ),
    topDuplicatedIdentities: duplicatedBuckets.slice(0, 25).map((bucket) => ({
      family: bucket.family,
      cardId: bucket.cardId,
      count: bucket.count,
      samplePaths: bucket.samplePaths,
    })),
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
