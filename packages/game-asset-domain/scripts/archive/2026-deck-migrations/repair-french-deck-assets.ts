import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import JSON5 from 'json5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGES_DIR = path.resolve(__dirname, '../..');
const ASSET_EDITOR_DIR = path.resolve(PACKAGES_DIR, 'asset-editor');
const CARD_GAMES_DIR = path.resolve(ASSET_EDITOR_DIR, 'Resources/GameMode/CardGames');
const DECKS_DIR = path.resolve(CARD_GAMES_DIR, 'Decks');
const CARD_RANKING_DIR = path.resolve(CARD_GAMES_DIR, 'CardRanking');
const CARDS_DIR = path.resolve(CARD_GAMES_DIR, 'Cards');
const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const CARD_ICON = '\uD83C\uDCCF';

type AssetEnvelope = {
  system: Record<string, unknown>;
  data: Record<string, unknown>;
};

type ResourceEntry = {
  path: string;
  guid: string;
  assetType: string;
  displayName: string;
  resourceEntryType: 'AssetResourceEntry';
  variant?: string | null;
  category?: 'Game';
};

type FrenchEntryDef = {
  id: string;
  copies: number;
  order: number;
};

type FrenchDeckRepair = {
  deckName: string;
  rankingFileName: string;
  rankingDisplayName: string;
  rankingDeckType: string;
  entries: FrenchEntryDef[];
};

type ParsedFrenchCardId =
  | { kind: 'standard'; suit: string; value: number }
  | { kind: 'joker'; id: 'joker_1' | 'joker_2' };

function deterministicGuid(seed: string): string {
  const hex = crypto.createHash('sha1').update(seed).digest('hex').slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function readJson5(filePath: string): AssetEnvelope {
  return JSON5.parse(fs.readFileSync(filePath, 'utf8')) as AssetEnvelope;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function toResourcePath(absolutePath: string): string {
  return path.relative(ASSET_EDITOR_DIR, absolutePath).replaceAll(path.sep, '/');
}

function toTreePath(absolutePath: string): string {
  return toResourcePath(absolutePath);
}

function toParentPath(absolutePath: string): string {
  return path.dirname(toTreePath(absolutePath)).replaceAll(path.sep, '/');
}

function createSystem(
  assetType: string,
  displayName: string,
  absolutePath: string,
  variant: string,
): Record<string, unknown> {
  return {
    guid: deterministicGuid(toTreePath(absolutePath)),
    assetType,
    schemaVersion: 1,
    displayName,
    category: 'Game',
    icon: CARD_ICON,
    variant,
    parentPath: toParentPath(absolutePath),
    treePath: toTreePath(absolutePath),
  };
}

function createResourceEntry(filePath: string, assetType: string, displayName: string): ResourceEntry {
  return {
    path: toResourcePath(filePath),
    guid: deterministicGuid(toTreePath(filePath)),
    assetType,
    displayName,
    resourceEntryType: 'AssetResourceEntry',
    variant: displayName,
    category: 'Game',
  };
}

function clearFolder(folderPath: string): void {
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
  }
  fs.mkdirSync(folderPath, { recursive: true });
}

function parseFrenchCardId(cardId: string): ParsedFrenchCardId {
  if (cardId === 'joker_1' || cardId === 'joker_2') {
    return { kind: 'joker', id: cardId };
  }

  const match = /^(\d+)_of_([a-z]+)$/.exec(cardId);
  if (!match) {
    throw new Error(`Unsupported French card id "${cardId}"`);
  }

  return {
    kind: 'standard',
    value: Number(match[1]),
    suit: match[2],
  };
}

function frenchSuitEntries(suits: string[]): Array<Record<string, unknown>> {
  const symbols: Record<string, { symbol: string; color: 'Black' | 'Red' }> = {
    spades: { symbol: 'S', color: 'Black' },
    hearts: { symbol: 'H', color: 'Red' },
    diamonds: { symbol: 'D', color: 'Red' },
    clubs: { symbol: 'C', color: 'Black' },
  };

  return suits.map((suit, index) => ({
    SuitName: suit,
    SuitSymbol: symbols[suit]?.symbol ?? suit.toUpperCase(),
    SuitColor: symbols[suit]?.color ?? 'Black',
    DisplayOrder: index,
  }));
}

function frenchRankingEntries(values: number[]): Array<Record<string, unknown>> {
  return values.map((value, index) => ({
    CardName:
      value === 14
        ? 'Ace'
        : value === 13
          ? 'King'
          : value === 12
            ? 'Queen'
            : value === 11
              ? 'Jack'
              : String(value),
    Value: value,
    CardSymbol:
      value === 14
        ? 'A'
        : value === 13
          ? 'K'
          : value === 12
            ? 'Q'
            : value === 11
              ? 'J'
              : String(value),
    DisplayOrder: index,
  }));
}

function createFrenchCardAsset(cardId: string, rankingFilePath: string, cardFilePath: string): ResourceEntry {
  const parsed = parseFrenchCardId(cardId);
  const cardIdentity =
    parsed.kind === 'joker'
      ? { family: 'French', joker: true, index: parsed.id === 'joker_1' ? 1 : 2 }
      : { family: 'French', suit: parsed.suit, value: parsed.value };

  writeJson(cardFilePath, {
    system: createSystem('Card', cardId, cardFilePath, cardId),
    data: {
      pieceKind: 'Card',
      cardIdentity,
      imageHash: ZERO_HASH,
      cardId,
      cardRankingAsset: createResourceEntry(rankingFilePath, 'CardRanking', path.basename(rankingFilePath, '.asset')),
    },
  });

  return createResourceEntry(cardFilePath, 'Card', cardId);
}

function getLegacyDeckAlias(deckName: string): string | null {
  if (deckName === 'Standard 32 + Joker(s)') {
    return 'Standard 32 + Jokers';
  }
  if (deckName === 'Standard 52 + Joker(s)') {
    return 'Standard 52 + Jokers';
  }
  return null;
}

function getDeckFilePath(deckName: string): string {
  return path.join(DECKS_DIR, `${deckName}.asset`);
}

function getExistingDeckFilePath(deckName: string): string {
  const canonicalPath = getDeckFilePath(deckName);
  if (fs.existsSync(canonicalPath)) {
    return canonicalPath;
  }

  const legacyAlias = getLegacyDeckAlias(deckName);
  if (!legacyAlias) {
    return canonicalPath;
  }

  const legacyPath = getDeckFilePath(legacyAlias);
  return fs.existsSync(legacyPath) ? legacyPath : canonicalPath;
}

function getCardFolderPath(deckName: string): string {
  return path.join(CARDS_DIR, deckName);
}

function getLegacyCardFolderPath(deckName: string): string | null {
  const legacyAlias = getLegacyDeckAlias(deckName);
  return legacyAlias ? path.join(CARDS_DIR, legacyAlias) : null;
}

function getRankingFilePath(fileName: string): string {
  return path.join(CARD_RANKING_DIR, fileName);
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function getUniqueIdsFromDeck(deckName: string): string[] {
  const deckAsset = readJson5(getExistingDeckFilePath(deckName));
  const cardTemplates = Array.isArray(deckAsset.data.cardTemplates)
    ? (deckAsset.data.cardTemplates as Array<{ variant?: string; displayName?: string }>)
    : [];

  const ids = cardTemplates
    .map((entry) => String(entry.variant ?? entry.displayName ?? ''))
    .filter(Boolean);

  return unique(ids);
}

function createFrenchEntriesFromIds(ids: string[], copies: number): FrenchEntryDef[] {
  return ids.map((id, index) => ({
    id,
    copies,
    order: index,
  }));
}

function buildTreikortEntries(): FrenchEntryDef[] {
  const ids = [
    '12_of_clubs',
    '2_of_spades',
    '13_of_diamonds',
    '2_of_hearts',
    '4_of_clubs',
    '8_of_spades',
    '9_of_hearts',
    '9_of_diamonds',
    '14_of_spades',
    '14_of_hearts',
    '14_of_diamonds',
    '14_of_clubs',
    '11_of_spades',
    '11_of_hearts',
    '11_of_diamonds',
    '11_of_clubs',
    '6_of_spades',
    '6_of_hearts',
    '6_of_diamonds',
    '6_of_clubs',
    '8_of_hearts',
    '8_of_diamonds',
    '8_of_clubs',
    '7_of_spades',
    '7_of_hearts',
    '7_of_diamonds',
    '7_of_clubs',
  ];

  return ids.map((id, index) => ({ id, copies: 1, order: index }));
}

function createFrenchDeckRepair(config: FrenchDeckRepair): void {
  const deckFilePath = getDeckFilePath(config.deckName);
  const existingDeckFilePath = getExistingDeckFilePath(config.deckName);
  const rankingFilePath = getRankingFilePath(config.rankingFileName);
  const cardFolderPath = getCardFolderPath(config.deckName);
  const existingDeck = readJson5(existingDeckFilePath);
  const cardResourcesById = new Map<string, ResourceEntry>();
  const legacyCardFolderPath = getLegacyCardFolderPath(config.deckName);

  if (legacyCardFolderPath && legacyCardFolderPath !== cardFolderPath && fs.existsSync(legacyCardFolderPath)) {
    fs.rmSync(legacyCardFolderPath, { recursive: true, force: true });
  }
  clearFolder(cardFolderPath);

  for (const entry of config.entries) {
    if (!cardResourcesById.has(entry.id)) {
      const cardFilePath = path.join(cardFolderPath, `${entry.id}.asset`);
      const resource = createFrenchCardAsset(entry.id, rankingFilePath, cardFilePath);
      cardResourcesById.set(entry.id, resource);
    }
  }

  const physicalTemplates: ResourceEntry[] = [];
  for (const entry of config.entries) {
    const resource = cardResourcesById.get(entry.id);
    if (!resource) {
      throw new Error(`Missing French card resource for ${entry.id}`);
    }
    for (let index = 0; index < entry.copies; index++) {
      physicalTemplates.push(resource);
    }
  }

  const parsedStandardCards = config.entries
    .map((entry) => parseFrenchCardId(entry.id))
    .filter((entry): entry is Extract<ParsedFrenchCardId, { kind: 'standard' }> => entry.kind === 'standard');

  const suits = unique(parsedStandardCards.map((entry) => entry.suit)).sort((left, right) => {
    const order = ['spades', 'hearts', 'diamonds', 'clubs'];
    return order.indexOf(left) - order.indexOf(right);
  });
  const values = unique(parsedStandardCards.map((entry) => entry.value)).sort((left, right) => right - left);
  const includesJokers = config.entries.some((entry) => entry.id === 'joker_1' || entry.id === 'joker_2');

  writeJson(rankingFilePath, {
    system: createSystem('CardRanking', config.rankingDisplayName, rankingFilePath, config.rankingDisplayName),
    data: {
      deckType: config.rankingDeckType,
      expectedCardCount: physicalTemplates.length,
      includesJokers,
      backCardCount: 1,
      deckFamily: 'French',
      familyPayload: {
        french: {
          suits: frenchSuitEntries(suits),
          rankings: frenchRankingEntries(values),
        },
      },
      cardEntries: config.entries.map((entry) => ({
        id: entry.id,
        copies: entry.copies,
        label: entry.id,
        order: entry.order,
      })),
    },
  });

  writeJson(deckFilePath, {
    system: {
      ...existingDeck.system,
      displayName: config.deckName,
      assetType: 'Deck',
      icon: existingDeck.system.icon ?? CARD_ICON,
    },
    data: {
      ...existingDeck.data,
      name: config.deckName,
      cardTemplates: physicalTemplates,
      cardRankingAsset: createResourceEntry(rankingFilePath, 'CardRanking', config.rankingDisplayName),
      cardOutputPath: toResourcePath(cardFolderPath),
    },
  });

  if (existingDeckFilePath !== deckFilePath && fs.existsSync(existingDeckFilePath)) {
    fs.rmSync(existingDeckFilePath, { force: true });
  }
}

function buildRepairs(): FrenchDeckRepair[] {
  const standard24Ids = getUniqueIdsFromDeck('Standard 24');
  const standard32Ids = getUniqueIdsFromDeck('Standard 32');
  const standard36Ids = getUniqueIdsFromDeck('Standard 36');
  const standard40Ids = getUniqueIdsFromDeck('Standard 40');
  const standard52Ids = getUniqueIdsFromDeck('Standard 52');
  const standard48Ids = getUniqueIdsFromDeck('Standard 48');

  return [
    {
      deckName: 'Standard 16',
      rankingFileName: 'French_Stripped_16.asset',
      rankingDisplayName: 'French_Stripped_16',
      rankingDeckType: 'Stripped_16',
      entries: createFrenchEntriesFromIds(getUniqueIdsFromDeck('Standard 16'), 1),
    },
    {
      deckName: 'Standard 24',
      rankingFileName: 'French_Stripped_24.asset',
      rankingDisplayName: 'French_Stripped_24',
      rankingDeckType: 'Stripped_24',
      entries: createFrenchEntriesFromIds(standard24Ids, 1),
    },
    {
      deckName: 'Double 24',
      rankingFileName: 'French_Double_24.asset',
      rankingDisplayName: 'French_Double_24',
      rankingDeckType: 'Stripped_24',
      entries: createFrenchEntriesFromIds(standard24Ids, 2),
    },
    {
      deckName: 'Standard 26',
      rankingFileName: 'French_Stripped_26.asset',
      rankingDisplayName: 'French_Stripped_26',
      rankingDeckType: 'Stripped_26',
      entries: createFrenchEntriesFromIds(getUniqueIdsFromDeck('Standard 26'), 1),
    },
    {
      deckName: 'Standard 28',
      rankingFileName: 'French_Stripped_28.asset',
      rankingDisplayName: 'French_Stripped_28',
      rankingDeckType: 'Stripped_28',
      entries: createFrenchEntriesFromIds(getUniqueIdsFromDeck('Standard 28'), 1),
    },
    {
      deckName: 'Standard 30',
      rankingFileName: 'French_Stripped_30.asset',
      rankingDisplayName: 'French_Stripped_30',
      rankingDeckType: 'Stripped_30',
      entries: createFrenchEntriesFromIds(getUniqueIdsFromDeck('Standard 30'), 1),
    },
    {
      deckName: 'Standard 32',
      rankingFileName: 'French_Stripped_32.asset',
      rankingDisplayName: 'French_Stripped_32',
      rankingDeckType: 'Stripped_32',
      entries: createFrenchEntriesFromIds(standard32Ids, 1),
    },
    {
      deckName: 'Standard 32 + Joker(s)',
      rankingFileName: 'French_Standard_32_Plus_Jokers.asset',
      rankingDisplayName: 'French_Standard_32_Plus_Jokers',
      rankingDeckType: 'Stripped_32',
      entries: createFrenchEntriesFromIds([...standard32Ids, 'joker_1', 'joker_2'], 1),
    },
    {
      deckName: 'Double 32',
      rankingFileName: 'French_Double_32.asset',
      rankingDisplayName: 'French_Double_32',
      rankingDeckType: 'Stripped_32',
      entries: createFrenchEntriesFromIds(standard32Ids, 2),
    },
    {
      deckName: 'Standard 36',
      rankingFileName: 'French_Stripped_36.asset',
      rankingDisplayName: 'French_Stripped_36',
      rankingDeckType: 'Stripped_36',
      entries: createFrenchEntriesFromIds(standard36Ids, 1),
    },
    {
      deckName: 'Quad 36',
      rankingFileName: 'French_Quad_36.asset',
      rankingDisplayName: 'French_Quad_36',
      rankingDeckType: 'Stripped_36',
      entries: createFrenchEntriesFromIds(standard36Ids, 4),
    },
    {
      deckName: 'Standard 40',
      rankingFileName: 'French_Stripped_40.asset',
      rankingDisplayName: 'French_Stripped_40',
      rankingDeckType: 'Stripped_40',
      entries: createFrenchEntriesFromIds(standard40Ids, 1),
    },
    {
      deckName: 'Quad 40',
      rankingFileName: 'French_Quad_40.asset',
      rankingDisplayName: 'French_Quad_40',
      rankingDeckType: 'Stripped_40',
      entries: createFrenchEntriesFromIds(standard40Ids, 4),
    },
    {
      deckName: 'Oct 40',
      rankingFileName: 'French_Oct_40.asset',
      rankingDisplayName: 'French_Oct_40',
      rankingDeckType: 'Stripped_40',
      entries: createFrenchEntriesFromIds(standard40Ids, 8),
    },
    {
      deckName: 'Standard 44',
      rankingFileName: 'French_Stripped_44.asset',
      rankingDisplayName: 'French_Stripped_44',
      rankingDeckType: 'Stripped_44',
      entries: createFrenchEntriesFromIds(getUniqueIdsFromDeck('Standard 44'), 1),
    },
    {
      deckName: 'Standard 48',
      rankingFileName: 'French_Pinochle_48.asset',
      rankingDisplayName: 'French_Pinochle_48',
      rankingDeckType: 'Pinochle_48',
      entries: createFrenchEntriesFromIds(standard48Ids, 1),
    },
    {
      deckName: 'Standard 52',
      rankingFileName: 'StandardCardRanking.asset',
      rankingDisplayName: 'StandardCardRanking',
      rankingDeckType: 'Standard52',
      entries: createFrenchEntriesFromIds(standard52Ids, 1),
    },
    {
      deckName: 'Standard 52 + Joker(s)',
      rankingFileName: 'French_Standard_52_Plus_Jokers.asset',
      rankingDisplayName: 'French_Standard_52_Plus_Jokers',
      rankingDeckType: 'Standard52',
      entries: createFrenchEntriesFromIds([...standard52Ids, 'joker_1', 'joker_2'], 1),
    },
    {
      deckName: 'Double 52',
      rankingFileName: 'French_Double_52.asset',
      rankingDisplayName: 'French_Double_52',
      rankingDeckType: 'Standard52',
      entries: createFrenchEntriesFromIds(standard52Ids, 2),
    },
    {
      deckName: 'Double 52 + 4 Jokers',
      rankingFileName: 'French_Double_52_Plus_4_Jokers.asset',
      rankingDisplayName: 'French_Double_52_Plus_4_Jokers',
      rankingDeckType: 'Standard52',
      entries: [
        ...createFrenchEntriesFromIds(standard52Ids, 2),
        { id: 'joker_1', copies: 2, order: 1000 },
        { id: 'joker_2', copies: 2, order: 1001 },
      ],
    },
    {
      deckName: 'Triple 52 + 6 Jokers',
      rankingFileName: 'French_Triple_52_Plus_6_Jokers.asset',
      rankingDisplayName: 'French_Triple_52_Plus_6_Jokers',
      rankingDeckType: 'Standard52',
      entries: [
        ...createFrenchEntriesFromIds(standard52Ids, 3),
        { id: 'joker_1', copies: 3, order: 1000 },
        { id: 'joker_2', copies: 3, order: 1001 },
      ],
    },
    {
      deckName: 'Quad 52 + 8 Jokers',
      rankingFileName: 'French_Quad_52_Plus_8_Jokers.asset',
      rankingDisplayName: 'French_Quad_52_Plus_8_Jokers',
      rankingDeckType: 'Standard52',
      entries: [
        ...createFrenchEntriesFromIds(standard52Ids, 4),
        { id: 'joker_1', copies: 4, order: 1000 },
        { id: 'joker_2', copies: 4, order: 1001 },
      ],
    },
    {
      deckName: 'Treikort 27',
      rankingFileName: 'French_Treikort_27.asset',
      rankingDisplayName: 'French_Treikort_27',
      rankingDeckType: 'Treikort_27',
      entries: buildTreikortEntries(),
    },
  ];
}

function main(): void {
  const repairs = buildRepairs();

  for (const repair of repairs) {
    createFrenchDeckRepair(repair);
  }

  process.stdout.write(
    JSON.stringify(
      {
        repairedFrenchDecks: repairs.map((repair) => repair.deckName),
      },
      null,
      2,
    ) + '\n',
  );
}

main();
