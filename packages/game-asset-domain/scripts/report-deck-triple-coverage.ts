import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import { ALLOWED_TRIPLES } from '@ocentra/game-domain/deck/deckCompatibility';
import { COMMERCIAL_DECK_TRIPLES } from '@ocentra/game-domain/deck/commercialDeckTypes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGES_DIR = path.resolve(__dirname, '../..');
const RESOURCES_DIR = path.resolve(PACKAGES_DIR, 'asset-editor/Resources/GameMode/CardGames');
const PROCESSED_GAMES_DIR = path.resolve(PACKAGES_DIR, 'card-games/src/processed-games');

type TripleUsage = {
  deckType: string;
  suitSet: string;
  rankSet: string;
  count: number;
  examples: string[];
};

type ProcessedGameJson = {
  engine?: { deckType?: string; suitSet?: string; rankSet?: string };
  legal?: { isCommercial?: boolean };
};

type AssetEnvelope = {
  system?: {
    assetType?: string;
    displayName?: string;
    guid?: string;
  };
  data?: Record<string, unknown>;
};

type RankingSummary = {
  file: string;
  assetType: string;
  displayName: string;
  deckFamily: string | null;
  deckType: string | null;
  expectedCardCount: number | null;
  referencedByDecks: string[];
  placeholderStyle: boolean;
};

function walkAssets(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const files: string[] = [];
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
        files.push(fullPath);
      }
    }
  }

  return files.sort();
}

function walkJsonFiles(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const files: string[] = [];
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
      if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }

  return files.sort();
}

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON5.parse(raw) as T;
}

function resourcePath(filePath: string): string {
  return path.relative(path.resolve(PACKAGES_DIR, 'asset-editor'), filePath).replaceAll(path.sep, '/');
}

function normalizeResourcePath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^Resources\//, '');
}

function tripleKey(deckType: string, suitSet: string, rankSet: string): string {
  return `${deckType}\0${suitSet}\0${rankSet}`;
}

function take<T>(values: T[], count: number): T[] {
  return values.slice(0, count);
}

function isPlaceholderStyleRanking(asset: AssetEnvelope): boolean {
  const displayName = String(asset.system?.displayName ?? '');
  const expectedCardCount = Number(asset.data?.expectedCardCount ?? NaN);
  return displayName === 'StandardCardRanking' || expectedCardCount === 52;
}

function main(): void {
  const failOnGap = process.argv.includes('--fail-on-gap');
  const includeCommercial = process.argv.includes('--include-commercial');
  const commercialTripleKeys = new Set(
    COMMERCIAL_DECK_TRIPLES.map(([deckType, suitSet, rankSet]) => tripleKey(deckType, suitSet, rankSet)),
  );
  const processedGameFiles = walkJsonFiles(PROCESSED_GAMES_DIR);
  const triples = new Map<string, TripleUsage>();
  let commercialGames = 0;
  let skippedCommercialGames = 0;

  for (const filePath of processedGameFiles) {
    const relativePath = path.relative(PROCESSED_GAMES_DIR, filePath).replaceAll(path.sep, '/');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ProcessedGameJson;
    if (json.legal?.isCommercial === true) {
      commercialGames += 1;
      if (!includeCommercial) {
        skippedCommercialGames += 1;
        continue;
      }
    }
    const deckType = json.engine?.deckType;
    const suitSet = json.engine?.suitSet;
    const rankSet = json.engine?.rankSet;
    if (!deckType || !suitSet || !rankSet) {
      continue;
    }

    const key = tripleKey(deckType, suitSet, rankSet);
    const existing = triples.get(key);
    if (existing) {
      existing.count += 1;
      if (existing.examples.length < 5) {
        existing.examples.push(relativePath);
      }
      continue;
    }

    triples.set(key, {
      deckType,
      suitSet,
      rankSet,
      count: 1,
      examples: [relativePath],
    });
  }

  const deckFiles = walkAssets(path.join(RESOURCES_DIR, 'Decks'));
  const rankingFiles = walkAssets(path.join(RESOURCES_DIR, 'CardRanking'));
  const rankingsByPath = new Map<string, RankingSummary>();
  const rankingsByGuid = new Map<string, RankingSummary>();

  for (const file of rankingFiles) {
    const asset = readJson<AssetEnvelope>(file);
    const summary: RankingSummary = {
      file: path.basename(file, '.asset'),
      assetType: String(asset.system?.assetType ?? ''),
      displayName: String(asset.system?.displayName ?? ''),
      deckFamily: typeof asset.data?.deckFamily === 'string' ? asset.data.deckFamily : null,
      deckType: typeof asset.data?.deckType === 'string' ? asset.data.deckType : null,
      expectedCardCount: typeof asset.data?.expectedCardCount === 'number' ? asset.data.expectedCardCount : null,
      referencedByDecks: [],
      placeholderStyle: isPlaceholderStyleRanking(asset),
    };

    rankingsByPath.set(resourcePath(file), summary);
    if (typeof asset.system?.guid === 'string') {
      rankingsByGuid.set(asset.system.guid, summary);
    }
  }

  const deckAssetRows = deckFiles.map((file) => {
    const asset = readJson<AssetEnvelope>(file);
    const data = asset.data ?? {};
    const supportedTriples = Array.isArray(data.supportedTriples)
      ? (data.supportedTriples as Array<Record<string, unknown>>)
          .map((triple) => ({
            deckType: String(triple.deckType ?? ''),
            suitSet: String(triple.suitSet ?? ''),
            rankSet: String(triple.rankSet ?? ''),
          }))
          .filter((triple) => triple.deckType && triple.suitSet && triple.rankSet)
      : [];
    const rankingRef =
      (data.cardRankingAsset as { path?: string; guid?: string } | undefined) ??
      (data.dominoRankingAsset as { path?: string; guid?: string } | undefined) ??
      (data.hanafudaRankingAsset as { path?: string; guid?: string } | undefined) ??
      (data.mahjongRankingAsset as { path?: string; guid?: string } | undefined) ??
      (data.playingCardRankingAsset as { path?: string; guid?: string } | undefined);

    let ranking: RankingSummary | undefined;
    if (rankingRef?.guid) {
      ranking = rankingsByGuid.get(rankingRef.guid);
    }
    if (!ranking && rankingRef?.path) {
      ranking = rankingsByPath.get(normalizeResourcePath(String(rankingRef.path)));
    }
    if (ranking) {
      ranking.referencedByDecks.push(path.basename(file, '.asset'));
    }

    return {
      file: path.basename(file, '.asset'),
      displayName: String(asset.system?.displayName ?? path.basename(file, '.asset')),
      assetType: String(asset.system?.assetType ?? ''),
      supportedTriples,
      rankingFile: ranking?.file ?? null,
      rankingAssetType: ranking?.assetType ?? null,
    };
  });

  const assetTripleRows = deckAssetRows.flatMap((row) =>
    row.supportedTriples.map((triple) => ({
      ...triple,
      file: row.file,
      assetType: row.assetType,
      rankingFile: row.rankingFile,
      rankingAssetType: row.rankingAssetType,
    })),
  );

  const coveredTripleKeys = new Set(assetTripleRows.map((row) => tripleKey(row.deckType, row.suitSet, row.rankSet)));
  const missingAllowedTriples = ALLOWED_TRIPLES
    .filter(([deckType, suitSet, rankSet]) => !commercialTripleKeys.has(tripleKey(deckType, suitSet, rankSet)))
    .filter(([deckType, suitSet, rankSet]) => !coveredTripleKeys.has(tripleKey(deckType, suitSet, rankSet)))
    .map(([deckType, suitSet, rankSet]) => ({ deckType, suitSet, rankSet }))
    .sort((left, right) =>
      `${left.deckType}/${left.suitSet}/${left.rankSet}`.localeCompare(
        `${right.deckType}/${right.suitSet}/${right.rankSet}`,
      ),
    );

  const uncoveredUsedTriples = Array.from(triples.values())
    .filter((triple) => !coveredTripleKeys.has(tripleKey(triple.deckType, triple.suitSet, triple.rankSet)))
    .map((triple) => ({
      deckType: triple.deckType,
      suitSet: triple.suitSet,
      rankSet: triple.rankSet,
      count: triple.count,
      examples: triple.examples,
    }))
    .sort((left, right) => right.count - left.count);

  const triplesByDeckType = new Map<string, TripleUsage[]>();
  for (const triple of triples.values()) {
    const values = triplesByDeckType.get(triple.deckType) ?? [];
    values.push(triple);
    triplesByDeckType.set(triple.deckType, values);
  }

  const ambiguousDeckTypes = Array.from(triplesByDeckType.entries())
    .filter(([, values]) => values.length > 1)
    .map(([deckType, values]) => ({
      deckType,
      tripleCount: values.length,
      triples: values
        .sort((left, right) => right.count - left.count)
        .map((value) => ({
          suitSet: value.suitSet,
          rankSet: value.rankSet,
          count: value.count,
          examples: value.examples,
          coveredByAsset: coveredTripleKeys.has(tripleKey(deckType, value.suitSet, value.rankSet)),
        })),
      assetDecks: assetTripleRows
        .filter((row) => row.deckType === deckType)
        .map((row) => ({
          file: row.file,
          assetType: row.assetType,
          suitSet: row.suitSet,
          rankSet: row.rankSet,
          rankingFile: row.rankingFile,
          rankingAssetType: row.rankingAssetType,
        })),
    }))
    .sort((left, right) => right.tripleCount - left.tripleCount);

  const unreferencedRankings = Array.from(rankingsByPath.values())
    .filter((ranking) => ranking.referencedByDecks.length === 0)
    .sort((left, right) => left.file.localeCompare(right.file))
    .map((ranking) => ({
      file: ranking.file,
      assetType: ranking.assetType,
      displayName: ranking.displayName,
      deckFamily: ranking.deckFamily,
      deckType: ranking.deckType,
      expectedCardCount: ranking.expectedCardCount,
      placeholderStyle: ranking.placeholderStyle,
    }));

  const report = {
    processedGames: processedGameFiles.length,
    nonCommercialProcessedGames: processedGameFiles.length - commercialGames,
    includedCommercialGames: includeCommercial ? commercialGames : 0,
    skippedCommercialGames,
    distinctTriplesUsedByGames: triples.size,
    allowedTriples: ALLOWED_TRIPLES.length - COMMERCIAL_DECK_TRIPLES.length,
    deckAssetFiles: deckFiles.length,
    deckAssetTriples: assetTripleRows.length,
    rankingAssetFiles: rankingFiles.length,
    missingAllowedTripleCount: missingAllowedTriples.length,
    sampleMissingAllowedTriples: take(missingAllowedTriples, 80),
    uncoveredUsedTripleCount: uncoveredUsedTriples.length,
    sampleUncoveredUsedTriples: take(uncoveredUsedTriples, 40),
    ambiguousDeckTypes: take(ambiguousDeckTypes, 20),
    ambiguousDeckTypeCount: ambiguousDeckTypes.length,
    unreferencedRankingCount: unreferencedRankings.length,
    unreferencedPlaceholderStyleRankingCount: unreferencedRankings.filter((ranking) => ranking.placeholderStyle).length,
    sampleUnreferencedRankings: take(unreferencedRankings, 80),
  };

  process.stdout.write(JSON.stringify(report, null, 2) + '\n');

  if (failOnGap && (missingAllowedTriples.length > 0 || uncoveredUsedTriples.length > 0)) {
    const outPath = path.resolve(process.cwd(), 'deck-triple-coverage-failures.json');
    fs.writeFileSync(outPath, JSON.stringify({
      missingAllowedTriples,
      uncoveredUsedTriples,
      ambiguousDeckTypes,
    }, null, 2));
    process.stderr.write(`Wrote failures to ${outPath}\n`);
    process.exit(1);
  }
}

main();
