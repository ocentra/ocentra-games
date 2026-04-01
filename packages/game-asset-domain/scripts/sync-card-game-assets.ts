import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';
import { CardDataSchema } from '@/schemas/asset/card-data.schema';
import { CardRankingDataSchema } from '@/schemas/asset/card-ranking-data.schema';
import { computeExpectedCardIdentities, normalizeCardIdentity } from '@/schemas/asset/deck-cross-validators';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGES_DIR = path.resolve(__dirname, '../..');
const CARD_GAMES_DIR = path.resolve(PACKAGES_DIR, 'asset-editor/Resources/GameMode/CardGames');
const CARD_ICON = '\uD83C\uDCCF';

type AssetEnvelope = {
  system: {
    assetType: string;
    guid?: string;
    icon?: string;
  };
  data: Record<string, unknown>;
};

type CardReference = {
  path: string;
  displayName: string;
  guid?: string;
  assetType: 'Card';
  category: 'Game';
  fileSize: number;
  gameId: null;
  mimeType: 'application/json';
  resourceEntryType: 'AssetResourceEntry';
  variant: string | null;
};

function readJson5(filePath: string): AssetEnvelope {
  return JSON5.parse(fs.readFileSync(filePath, 'utf8')) as AssetEnvelope;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function getAllAssetFiles(dir: string, fileList: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllAssetFiles(fullPath, fileList);
      continue;
    }
    if (entry.name.endsWith('.asset')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function normalizeResourcePath(value: string): string {
  return value.replaceAll(path.sep, '/').replace(/^asset-editor\//, '');
}

function fixDeckIcon(value: unknown): string {
  const icon = typeof value === 'string' ? value : '';
  if (icon.includes('Ã') || icon.includes('ðŸ')) {
    return CARD_ICON;
  }
  return icon || CARD_ICON;
}

function fixSuitSymbol(suitName: string, currentValue: unknown): string {
  if (typeof currentValue === 'string' && !currentValue.includes('Ã') && !currentValue.includes('â')) {
    return currentValue;
  }
  const normalizedSuitName = suitName.toLowerCase();
  if (normalizedSuitName === 'spades') {
    return '\u2660';
  }
  if (normalizedSuitName === 'hearts') {
    return '\u2665';
  }
  if (normalizedSuitName === 'diamonds') {
    return '\u2666';
  }
  if (normalizedSuitName === 'clubs') {
    return '\u2663';
  }
  return typeof currentValue === 'string' ? currentValue : '';
}

function buildCardReference(filePath: string, asset: AssetEnvelope): CardReference | null {
  const parsed = CardDataSchema.safeParse(asset.data);
  if (!parsed.success) {
    return null;
  }
  return {
    path: normalizeResourcePath(path.relative(PACKAGES_DIR, filePath)),
    displayName: parsed.data.cardId,
    guid: asset.system.guid,
    assetType: 'Card',
    category: 'Game',
    fileSize: fs.statSync(filePath).size,
    gameId: null,
    mimeType: 'application/json',
    resourceEntryType: 'AssetResourceEntry',
    variant: parsed.data.cardId,
  };
}

function buildCardIndexes(cardFiles: string[]): {
  byCardId: Map<string, CardReference>;
  byFolder: Map<string, Map<string, CardReference>>;
} {
  const byCardId = new Map<string, CardReference>();
  const byFolder = new Map<string, Map<string, CardReference>>();

  for (const filePath of cardFiles) {
    const asset = readJson5(filePath);
    if (asset.system.assetType !== 'Card') {
      continue;
    }
    const reference = buildCardReference(filePath, asset);
    if (!reference) {
      continue;
    }
    const normalizedCardId = normalizeCardIdentity(reference.displayName);
    byCardId.set(normalizedCardId, reference);

    const folder = normalizeResourcePath(path.dirname(path.relative(PACKAGES_DIR, filePath)));
    const folderEntries = byFolder.get(folder) ?? new Map<string, CardReference>();
    folderEntries.set(normalizedCardId, reference);
    byFolder.set(folder, folderEntries);
  }

  return { byCardId, byFolder };
}

function resolveExpectedReferences(
  expectedIds: string[],
  candidateFolders: Set<string>,
  byCardId: Map<string, CardReference>,
  byFolder: Map<string, Map<string, CardReference>>,
): CardReference[] | null {
  const resolvedReferences: CardReference[] = [];

  for (const expectedId of expectedIds) {
    let reference: CardReference | undefined;
    for (const folder of candidateFolders) {
      reference = byFolder.get(folder)?.get(expectedId);
      if (reference) {
        break;
      }
    }
    if (!reference) {
      reference = byCardId.get(expectedId);
    }
    if (!reference) {
      return null;
    }
    resolvedReferences.push(reference);
  }

  return resolvedReferences;
}

function main(): void {
  const assetFiles = getAllAssetFiles(CARD_GAMES_DIR);
  const cardFiles = assetFiles.filter((filePath) => path.dirname(filePath).includes(`${path.sep}Cards${path.sep}`));
  const deckFiles = assetFiles.filter((filePath) => path.dirname(filePath).includes(`${path.sep}Decks`));
  const rankingFiles = assetFiles.filter((filePath) => path.dirname(filePath).includes(`${path.sep}CardRanking`));

  const cardIndexes = buildCardIndexes(cardFiles);
  let updatedDecks = 0;
  let updatedRankings = 0;

  for (const filePath of rankingFiles) {
    const asset = readJson5(filePath);
    if (asset.system.assetType !== 'CardRanking') {
      continue;
    }
    const parsed = CardRankingDataSchema.safeParse(asset.data);
    if (!parsed.success) {
      continue;
    }

    const suits = parsed.data.familyPayload?.french?.suits ?? [];
    let changed = false;
    for (const suit of suits) {
      const nextSymbol = fixSuitSymbol(suit.SuitName, suit.SuitSymbol);
      if (nextSymbol !== suit.SuitSymbol) {
        suit.SuitSymbol = nextSymbol;
        changed = true;
      }
    }

    if (changed) {
      writeJson(filePath, asset);
      updatedRankings++;
    }
  }

  for (const filePath of deckFiles) {
    const asset = readJson5(filePath);
    if (asset.system.assetType !== 'Deck') {
      continue;
    }

    let changed = false;
    const nextIcon = fixDeckIcon(asset.system.icon);
    if (nextIcon !== asset.system.icon) {
      asset.system.icon = nextIcon;
      changed = true;
    }

    const rankingReference = asset.data.cardRankingAsset as { path?: string } | undefined;
    if (!rankingReference?.path) {
      if (changed) {
        writeJson(filePath, asset);
        updatedDecks++;
      }
      continue;
    }

    const rankingFilePath = path.resolve(PACKAGES_DIR, 'asset-editor', rankingReference.path);
    if (!fs.existsSync(rankingFilePath)) {
      if (changed) {
        writeJson(filePath, asset);
        updatedDecks++;
      }
      continue;
    }

    const rankingAsset = readJson5(rankingFilePath);
    if (rankingAsset.system.assetType !== 'CardRanking') {
      if (changed) {
        writeJson(filePath, asset);
        updatedDecks++;
      }
      continue;
    }

    const rankingParsed = CardRankingDataSchema.safeParse(rankingAsset.data);
    if (!rankingParsed.success) {
      if (changed) {
        writeJson(filePath, asset);
        updatedDecks++;
      }
      continue;
    }

    const expectedIds = computeExpectedCardIdentities(rankingParsed.data).map(normalizeCardIdentity);
    const currentTemplates = Array.isArray(asset.data.cardTemplates)
      ? (asset.data.cardTemplates as Array<{ path?: string; displayName?: string }>)
      : [];
    const candidateFolders = new Set<string>();
    for (const entry of currentTemplates) {
      if (typeof entry.path === 'string' && entry.path.length > 0) {
        candidateFolders.add(normalizeResourcePath(path.dirname(entry.path)));
      }
    }

    if (candidateFolders.size === 0) {
      if (changed) {
        writeJson(filePath, asset);
        updatedDecks++;
      }
      continue;
    }

    const resolvedReferences = resolveExpectedReferences(
      expectedIds,
      candidateFolders,
      cardIndexes.byCardId,
      cardIndexes.byFolder,
    );

    if (!resolvedReferences) {
      if (changed) {
        writeJson(filePath, asset);
        updatedDecks++;
      }
      continue;
    }

    const nextTemplates = resolvedReferences.map((reference) => ({
      path: reference.path,
      displayName: reference.displayName,
      gameId: reference.gameId,
      category: reference.category,
      mimeType: reference.mimeType,
      fileSize: reference.fileSize,
      resourceEntryType: reference.resourceEntryType,
      guid: reference.guid,
      assetType: reference.assetType,
      variant: reference.variant,
    }));

    const currentTemplateIds = currentTemplates
      .map((entry) => normalizeCardIdentity(String(entry.displayName ?? '')))
      .join('\n');
    const nextTemplateIds = nextTemplates
      .map((entry) => normalizeCardIdentity(entry.displayName))
      .join('\n');

    if (currentTemplateIds !== nextTemplateIds) {
      asset.data.cardTemplates = nextTemplates;
      changed = true;
    }

    if (changed) {
      writeJson(filePath, asset);
      updatedDecks++;
    }
  }

  process.stdout.write(
    JSON.stringify(
      {
        updatedDecks,
        updatedRankings,
      },
      null,
      2,
    ) + '\n',
  );
}

main();
