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
const TILES_DIR = path.resolve(CARD_GAMES_DIR, 'Tiles');
const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const CARD_ICON = '\uD83C\uDCCF';

type AssetEnvelope = {
  system: Record<string, unknown>;
  data: Record<string, unknown>;
};

type SupportedTriple = {
  deckType: string;
  suitSet: string;
  rankSet: string;
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

type SuitColor = 'Black' | 'Red' | 'None';

type SuitDef = {
  name: string;
  symbol: string;
  color: SuitColor;
};

type RankDef = {
  value: number;
  name: string;
  symbol: string;
};

type ExplicitEntryDef = {
  id: string;
  copies?: number;
  label?: string | null;
  order?: number | null;
  suit?: string | null;
  rank?: string | number | null;
  points?: number | null;
  kind?: string | null;
};

type GenericDeckVariantSpec = {
  assetName: string;
  baseDeckName: string;
  rankingFileName: string;
  rankingDisplayName: string;
  deckFamily: string;
  rankingDeckType: string;
  suits?: SuitDef[];
  ranks?: RankDef[];
  explicitEntries?: ExplicitEntryDef[];
  includesJokers?: boolean;
  supportedTriples: SupportedTriple[];
  cardIdKind: 'french' | 'generic' | 'tarot' | 'custom';
};

type DominoVariantSpec = {
  assetName: string;
  rankingFileName: string;
  rankingDisplayName: string;
  supportedTriples: SupportedTriple[];
  maxPip: number;
};

const FRENCH_SUITS: SuitDef[] = [
  { name: 'spades', symbol: 'S', color: 'Black' },
  { name: 'hearts', symbol: 'H', color: 'Red' },
  { name: 'diamonds', symbol: 'D', color: 'Red' },
  { name: 'clubs', symbol: 'C', color: 'Black' },
];

const SPANISH_SUITS: SuitDef[] = [
  { name: 'oros', symbol: 'O', color: 'Red' },
  { name: 'copas', symbol: 'C', color: 'Red' },
  { name: 'espadas', symbol: 'E', color: 'Black' },
  { name: 'bastos', symbol: 'B', color: 'Black' },
];

const ITALIAN_SUITS: SuitDef[] = [
  { name: 'coppe', symbol: 'C', color: 'Red' },
  { name: 'denari', symbol: 'D', color: 'Red' },
  { name: 'spade', symbol: 'S', color: 'Black' },
  { name: 'bastoni', symbol: 'B', color: 'Black' },
];

const PORTUGUESE_SUITS: SuitDef[] = [
  { name: 'copas', symbol: 'C', color: 'Red' },
  { name: 'ouros', symbol: 'O', color: 'Red' },
  { name: 'espadas', symbol: 'E', color: 'Black' },
  { name: 'paus', symbol: 'P', color: 'Black' },
];

const GERMAN_SUITS: SuitDef[] = [
  { name: 'eichel', symbol: 'E', color: 'Black' },
  { name: 'laub', symbol: 'L', color: 'Black' },
  { name: 'herz', symbol: 'H', color: 'Red' },
  { name: 'schellen', symbol: 'S', color: 'Red' },
];

const TAROT_DE_MARSEILLE_SUITS: SuitDef[] = [
  { name: 'swords', symbol: 'S', color: 'Black' },
  { name: 'batons', symbol: 'B', color: 'Black' },
  { name: 'cups', symbol: 'C', color: 'Red' },
  { name: 'coins', symbol: 'O', color: 'Red' },
];

const SWISS_1JJ_SUITS: SuitDef[] = [
  { name: 'swords', symbol: 'S', color: 'Black' },
  { name: 'batons', symbol: 'B', color: 'Black' },
  { name: 'cups', symbol: 'C', color: 'Red' },
  { name: 'coins', symbol: 'O', color: 'Red' },
];

const TAROCCO_PIEMONTESE_SUITS: SuitDef[] = [
  { name: 'swords', symbol: 'S', color: 'Black' },
  { name: 'batons', symbol: 'B', color: 'Black' },
  { name: 'cups', symbol: 'C', color: 'Red' },
  { name: 'coins', symbol: 'O', color: 'Red' },
];

type TarotSuitSpec = {
  suit: SuitDef;
  values: number[];
};

function capitalizeWords(value: string): string {
  return value
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function tarotRankLabel(value: number): string {
  if (value === 15) return 'Cavalier';
  if (value === 14) return 'Ace';
  if (value === 13) return 'King';
  if (value === 12) return 'Queen';
  if (value === 11) return 'Jack';
  return String(value);
}

function tarotRankKey(value: number): string | number {
  if (value === 15) return 'cavalier';
  if (value === 14) return 'ace';
  if (value === 13) return 'king';
  if (value === 12) return 'queen';
  if (value === 11) return 'jack';
  return value;
}

function tarotCardPoints(value: number): number {
  if (value === 13) return 5;
  if (value === 12) return 4;
  if (value === 15) return 3;
  if (value === 11) return 2;
  return 1;
}

function buildTarotMinorEntries(suitSpecs: TarotSuitSpec[], orderBase = 100): ExplicitEntryDef[] {
  const entries: ExplicitEntryDef[] = [];
  let order = orderBase;
  for (const spec of suitSpecs) {
    const suitName = spec.suit.name;
    const suitLabel = capitalizeWords(suitName);
    for (const value of spec.values) {
      entries.push({
        id: `${value}_of_${suitName}`,
        label: `${suitLabel} ${tarotRankLabel(value)}`,
        order,
        suit: suitName,
        rank: tarotRankKey(value),
        points: tarotCardPoints(value),
      });
      order += 1;
    }
  }
  return entries;
}

function buildTarotTrumpEntries(
  trumpNumbers: number[],
  foolLabel: string,
  orderBase = 0,
): ExplicitEntryDef[] {
  const entries: ExplicitEntryDef[] = [];
  let order = orderBase;

  for (const trumpNumber of trumpNumbers) {
    entries.push({
      id: `tarot_trump_${trumpNumber}`,
      label: `Trump ${trumpNumber}`,
      order,
      suit: null,
      rank: null,
      points: trumpNumber === 1 || trumpNumber === 21 ? 5 : 1,
      kind: 'trump',
    });
    order += 1;
  }

  entries.push({
    id: 'tarot_fool',
    label: foolLabel,
    order,
    suit: null,
    rank: null,
    points: 5,
    kind: 'fool',
  });

  return entries;
}

function buildTarotPackEntries(
  suitSpecs: TarotSuitSpec[],
  trumpNumbers: number[],
  foolLabel: string,
): ExplicitEntryDef[] {
  return [...buildTarotTrumpEntries(trumpNumbers, foolLabel), ...buildTarotMinorEntries(suitSpecs)];
}

function frenchModernTarot78Entries(): ExplicitEntryDef[] {
  const ranks = [13, 12, 15, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 14];
  return buildTarotPackEntries(
    FRENCH_SUITS.map((suit) => ({ suit, values: ranks })),
    Array.from({ length: 21 }, (_, index) => index + 1),
    'Excuse',
  );
}

function frenchTarock78Entries(): ExplicitEntryDef[] {
  return frenchModernTarot78Entries();
}

function tarotDeMarseille78Entries(): ExplicitEntryDef[] {
  const longRanks = [13, 12, 15, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 14];
  const roundRanks = [13, 12, 15, 11, 14, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return buildTarotPackEntries(
    [
      { suit: TAROT_DE_MARSEILLE_SUITS[0], values: longRanks },
      { suit: TAROT_DE_MARSEILLE_SUITS[1], values: longRanks },
      { suit: TAROT_DE_MARSEILLE_SUITS[2], values: roundRanks },
      { suit: TAROT_DE_MARSEILLE_SUITS[3], values: roundRanks },
    ],
    Array.from({ length: 21 }, (_, index) => index + 1),
    'Matto',
  );
}

function swiss1jj78Entries(): ExplicitEntryDef[] {
  const longRanks = [13, 12, 15, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 14];
  const roundRanks = [13, 12, 15, 11, 14, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return buildTarotPackEntries(
    [
      { suit: SWISS_1JJ_SUITS[0], values: longRanks },
      { suit: SWISS_1JJ_SUITS[1], values: longRanks },
      { suit: SWISS_1JJ_SUITS[2], values: roundRanks },
      { suit: SWISS_1JJ_SUITS[3], values: roundRanks },
    ],
    Array.from({ length: 21 }, (_, index) => index + 1),
    'Fool',
  );
}

function frenchTarock66Entries(): ExplicitEntryDef[] {
  const blackRanks = [13, 12, 15, 11, 10, 9, 8, 7, 6, 5, 4];
  const redRanks = [13, 12, 15, 11, 14, 7, 6, 5, 4, 3, 2];
  return buildTarotPackEntries(
    [
      { suit: FRENCH_SUITS[0], values: blackRanks },
      { suit: FRENCH_SUITS[3], values: blackRanks },
      { suit: FRENCH_SUITS[1], values: redRanks },
      { suit: FRENCH_SUITS[2], values: redRanks },
    ],
    Array.from({ length: 21 }, (_, index) => index + 1),
    'Excuse',
  );
}

function tarotDeMarseille66Entries(): ExplicitEntryDef[] {
  const longRanks = [13, 12, 15, 11, 10, 9, 8, 7, 6, 5, 4];
  const roundRanks = [13, 12, 15, 11, 14, 7, 6, 5, 4, 3, 2];
  return buildTarotPackEntries(
    [
      { suit: TAROT_DE_MARSEILLE_SUITS[0], values: longRanks },
      { suit: TAROT_DE_MARSEILLE_SUITS[1], values: longRanks },
      { suit: TAROT_DE_MARSEILLE_SUITS[2], values: roundRanks },
      { suit: TAROT_DE_MARSEILLE_SUITS[3], values: roundRanks },
    ],
    Array.from({ length: 21 }, (_, index) => index + 1),
    'Matto',
  );
}

function industrieUndGlueck54Entries(): ExplicitEntryDef[] {
  const blackRanks = [13, 12, 15, 11, 10, 9, 8, 7];
  const redRanks = [13, 12, 15, 11, 14, 2, 3, 4];
  return buildTarotPackEntries(
    [
      { suit: FRENCH_SUITS[0], values: blackRanks },
      { suit: FRENCH_SUITS[3], values: blackRanks },
      { suit: FRENCH_SUITS[1], values: redRanks },
      { suit: FRENCH_SUITS[2], values: redRanks },
    ],
    Array.from({ length: 21 }, (_, index) => index + 1),
    'Skus',
  );
}

function cego54Entries(): ExplicitEntryDef[] {
  return industrieUndGlueck54Entries().map((entry) => ({
    ...entry,
    label: entry.id === 'tarot_fool' ? 'Fool' : entry.label,
  }));
}

function industrieUndGlueck42Entries(): ExplicitEntryDef[] {
  const blackRanks = [13, 12, 15, 11, 10];
  const redRanks = [13, 12, 15, 11, 14];
  return buildTarotPackEntries(
    [
      { suit: FRENCH_SUITS[0], values: blackRanks },
      { suit: FRENCH_SUITS[3], values: blackRanks },
      { suit: FRENCH_SUITS[1], values: redRanks },
      { suit: FRENCH_SUITS[2], values: redRanks },
    ],
    Array.from({ length: 21 }, (_, index) => index + 1),
    'Skus',
  );
}

function industrieUndGlueck40Entries(): ExplicitEntryDef[] {
  const blackRanks = [13, 12, 15, 11, 10];
  const redRanks = [13, 12, 15, 11, 14];
  return buildTarotPackEntries(
    [
      { suit: FRENCH_SUITS[0], values: blackRanks },
      { suit: FRENCH_SUITS[3], values: blackRanks },
      { suit: FRENCH_SUITS[1], values: redRanks },
      { suit: FRENCH_SUITS[2], values: redRanks },
    ],
    [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    'Skus',
  );
}

function swiss1jj62Entries(): ExplicitEntryDef[] {
  const longRanks = [13, 12, 15, 11, 10, 9, 8, 7, 6, 5];
  const roundRanks = [13, 12, 15, 11, 14, 2, 3, 4, 5, 6];
  return buildTarotPackEntries(
    [
      { suit: SWISS_1JJ_SUITS[0], values: longRanks },
      { suit: SWISS_1JJ_SUITS[1], values: longRanks },
      { suit: SWISS_1JJ_SUITS[2], values: roundRanks },
      { suit: SWISS_1JJ_SUITS[3], values: roundRanks },
    ],
    Array.from({ length: 21 }, (_, index) => index + 1),
    'Fool',
  );
}

function taroccoPiemontese62Entries(): ExplicitEntryDef[] {
  const longRanks = [13, 12, 15, 11, 10, 9, 8, 7, 6, 5];
  const roundRanks = [13, 12, 15, 11, 14, 2, 3, 4, 5, 6];
  return buildTarotPackEntries(
    [
      { suit: TAROCCO_PIEMONTESE_SUITS[0], values: longRanks },
      { suit: TAROCCO_PIEMONTESE_SUITS[1], values: longRanks },
      { suit: TAROCCO_PIEMONTESE_SUITS[2], values: roundRanks },
      { suit: TAROCCO_PIEMONTESE_SUITS[3], values: roundRanks },
    ],
    Array.from({ length: 21 }, (_, index) => index + 1),
    'Matto',
  );
}

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

function toResourcePath(absolutePath: string): string {
  return path.relative(ASSET_EDITOR_DIR, absolutePath).replaceAll(path.sep, '/');
}

function toTreePath(absolutePath: string): string {
  return toResourcePath(absolutePath);
}

function toParentPath(absolutePath: string): string {
  return path.dirname(toTreePath(absolutePath)).replaceAll(path.sep, '/');
}

function readJson5<T>(filePath: string): T {
  return JSON5.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function createSystem(assetType: string, displayName: string, absolutePath: string, variant: string): Record<string, unknown> {
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

function familyPrefix(family: string): string {
  return family.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function deckFilePath(assetName: string): string {
  return path.join(DECKS_DIR, `${assetName}.asset`);
}

function rankingFilePath(fileName: string): string {
  return path.join(CARD_RANKING_DIR, fileName);
}

function cardFolderPath(folderName: string): string {
  return path.join(CARDS_DIR, folderName);
}

function tileFolderPath(folderName: string): string {
  return path.join(TILES_DIR, folderName);
}

function clearFolder(folderPath: string): void {
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
  }
  fs.mkdirSync(folderPath, { recursive: true });
}

function suitEntries(suits: SuitDef[]): Array<Record<string, unknown>> {
  return suits.map((suit, index) => ({
    SuitName: suit.name,
    SuitSymbol: suit.symbol,
    SuitColor: suit.color,
    DisplayOrder: index,
  }));
}

function rankEntries(ranks: RankDef[]): Array<Record<string, unknown>> {
  return ranks.map((rank, index) => ({
    CardName: rank.name,
    Value: rank.value,
    CardSymbol: rank.symbol,
    DisplayOrder: index,
  }));
}

function frenchRanks(values: number[]): RankDef[] {
  return values.map((value) => ({
    value,
    name:
      value === 14 ? 'Ace' :
      value === 13 ? 'King' :
      value === 12 ? 'Queen' :
      value === 11 ? 'Jack' :
      String(value),
    symbol:
      value === 14 ? 'A' :
      value === 13 ? 'K' :
      value === 12 ? 'Q' :
      value === 11 ? 'J' :
      String(value),
  }));
}

function germanRanks(values: number[]): RankDef[] {
  return values.map((value) => ({
    value,
    name:
      value === 14 ? 'Ace' :
      value === 13 ? 'King' :
      value === 12 ? 'Ober' :
      value === 11 ? 'Under' :
      String(value),
    symbol:
      value === 14 ? 'A' :
      value === 13 ? 'K' :
      value === 12 ? 'O' :
      value === 11 ? 'U' :
      String(value),
  }));
}

function italianRanks40(): RankDef[] {
  return [
    { value: 14, name: 'Ace', symbol: 'A' },
    { value: 13, name: 'Re', symbol: 'R' },
    { value: 12, name: 'Cavallo', symbol: 'C' },
    { value: 11, name: 'Fante', symbol: 'F' },
    { value: 7, name: '7', symbol: '7' },
    { value: 6, name: '6', symbol: '6' },
    { value: 5, name: '5', symbol: '5' },
    { value: 4, name: '4', symbol: '4' },
    { value: 3, name: '3', symbol: '3' },
    { value: 2, name: '2', symbol: '2' },
  ];
}

function italianRanks36(): RankDef[] {
  return [
    { value: 14, name: 'Ace', symbol: 'A' },
    { value: 13, name: 'King', symbol: 'K' },
    { value: 12, name: 'Queen', symbol: 'Q' },
    { value: 11, name: 'Jack', symbol: 'J' },
    { value: 7, name: '7', symbol: '7' },
    { value: 6, name: '6', symbol: '6' },
    { value: 5, name: '5', symbol: '5' },
    { value: 4, name: '4', symbol: '4' },
    { value: 3, name: '3', symbol: '3' },
  ];
}

function spanishRanks40(): RankDef[] {
  return [
    { value: 14, name: 'As', symbol: 'A' },
    { value: 13, name: 'Rey', symbol: 'R' },
    { value: 12, name: 'Caballo', symbol: 'C' },
    { value: 11, name: 'Sota', symbol: 'S' },
    { value: 7, name: '7', symbol: '7' },
    { value: 6, name: '6', symbol: '6' },
    { value: 5, name: '5', symbol: '5' },
    { value: 4, name: '4', symbol: '4' },
    { value: 3, name: '3', symbol: '3' },
    { value: 2, name: '2', symbol: '2' },
  ];
}

function spanishRanks48(): RankDef[] {
  return [
    { value: 14, name: 'As', symbol: 'A' },
    { value: 13, name: 'Rey', symbol: 'R' },
    { value: 12, name: 'Caballo', symbol: 'C' },
    { value: 11, name: 'Sota', symbol: 'S' },
    { value: 9, name: '9', symbol: '9' },
    { value: 8, name: '8', symbol: '8' },
    { value: 7, name: '7', symbol: '7' },
    { value: 6, name: '6', symbol: '6' },
    { value: 5, name: '5', symbol: '5' },
    { value: 4, name: '4', symbol: '4' },
    { value: 3, name: '3', symbol: '3' },
    { value: 2, name: '2', symbol: '2' },
  ];
}

function portugueseRanks40(): RankDef[] {
  return [
    { value: 14, name: 'Ace', symbol: 'A' },
    { value: 13, name: 'King', symbol: 'K' },
    { value: 12, name: 'Queen', symbol: 'Q' },
    { value: 11, name: 'Jack', symbol: 'J' },
    { value: 7, name: '7', symbol: '7' },
    { value: 6, name: '6', symbol: '6' },
    { value: 5, name: '5', symbol: '5' },
    { value: 4, name: '4', symbol: '4' },
    { value: 3, name: '3', symbol: '3' },
    { value: 2, name: '2', symbol: '2' },
  ];
}

function loadDeckDefaults(baseDeckName: string): Record<string, unknown> {
  const filePath = deckFilePath(baseDeckName);
  if (!fs.existsSync(filePath)) {
    return {
      imageSourceFolderPath: 'Resources/GameMode/CardGames/Images',
      backCardSourceFolderPath: 'Resources/GameMode/CardGames/Images/Extras',
      backCardHash: ZERO_HASH,
    };
  }
  const asset = readJson5<AssetEnvelope>(filePath);
  return {
    imageSourceFolderPath: asset.data.imageSourceFolderPath ?? 'Resources/GameMode/CardGames/Images',
    backCardSourceFolderPath: asset.data.backCardSourceFolderPath ?? 'Resources/GameMode/CardGames/Images/Extras',
    backCardHash: asset.data.backCardHash ?? ZERO_HASH,
  };
}

function createFrenchCard(cardId: string, rankingFile: string, outFile: string): ResourceEntry {
  if (cardId === 'joker_1' || cardId === 'joker_2') {
    writeJson(outFile, {
      system: createSystem('Card', cardId, outFile, cardId),
      data: {
        pieceKind: 'Card',
        cardIdentity: { family: 'French', joker: true, index: cardId === 'joker_1' ? 1 : 2 },
        imageHash: ZERO_HASH,
        cardId,
        cardRankingAsset: createResourceEntry(rankingFile, 'CardRanking', path.basename(rankingFile, '.asset')),
      },
    });
    return createResourceEntry(outFile, 'Card', cardId);
  }

  const match = /^(\d+)_of_([a-z]+)$/.exec(cardId);
  if (!match) {
    throw new Error(`Unsupported French card id ${cardId}`);
  }

  writeJson(outFile, {
    system: createSystem('Card', cardId, outFile, cardId),
    data: {
      pieceKind: 'Card',
      cardIdentity: { family: 'French', suit: match[2], value: Number(match[1]) },
      imageHash: ZERO_HASH,
      cardId,
      cardRankingAsset: createResourceEntry(rankingFile, 'CardRanking', path.basename(rankingFile, '.asset')),
    },
  });
  return createResourceEntry(outFile, 'Card', cardId);
}

function createGenericCard(family: string, cardId: string, rankingFile: string, outFile: string): ResourceEntry {
  writeJson(outFile, {
    system: createSystem('Card', cardId, outFile, cardId),
    data: {
      pieceKind: 'Card',
      cardIdentity: { family, id: cardId },
      imageHash: ZERO_HASH,
      cardId,
      cardRankingAsset: createResourceEntry(rankingFile, 'CardRanking', path.basename(rankingFile, '.asset')),
    },
  });
  return createResourceEntry(outFile, 'Card', cardId);
}

function createTarotCard(cardId: string, rankingFile: string, outFile: string): ResourceEntry {
  let cardIdentity: Record<string, unknown>;

  if (cardId === 'tarot_fool') {
    cardIdentity = { family: 'Tarot', kind: 'fool' };
  } else {
    const trumpMatch = /^tarot_trump_(\d+)$/.exec(cardId);
    if (trumpMatch) {
      cardIdentity = {
        family: 'Tarot',
        kind: 'trump',
        number: Number(trumpMatch[1]),
      };
    } else {
      const minorMatch = /^(\d+)_of_([a-z_]+)$/.exec(cardId);
      if (!minorMatch) {
        throw new Error(`Unsupported tarot card id ${cardId}`);
      }
      cardIdentity = {
        family: 'Tarot',
        kind: 'minor',
        value: Number(minorMatch[1]),
        suit: minorMatch[2],
      };
    }
  }

  writeJson(outFile, {
    system: createSystem('Card', cardId, outFile, cardId),
    data: {
      pieceKind: 'Card',
      cardIdentity,
      imageHash: ZERO_HASH,
      cardId,
      cardRankingAsset: createResourceEntry(rankingFile, 'CardRanking', path.basename(rankingFile, '.asset')),
    },
  });
  return createResourceEntry(outFile, 'Card', cardId);
}

function writeFamilyPayloadRanking(filePath: string, displayName: string, deckFamily: string, rankingDeckType: string, suits: SuitDef[], ranks: RankDef[], includesJokers: boolean): void {
  writeJson(filePath, {
    system: createSystem('CardRanking', displayName, filePath, displayName),
    data: {
      deckType: rankingDeckType,
      expectedCardCount: suits.length * ranks.length + (includesJokers ? 2 : 0),
      includesJokers,
      backCardCount: 1,
      deckFamily,
      familyPayload: {
        french: {
          suits: suitEntries(suits),
          rankings: rankEntries(ranks),
        },
      },
    },
  });
}

function writeDominoRanking(filePath: string, displayName: string, maxPip: number): void {
  writeJson(filePath, {
    system: createSystem('DominoRanking', displayName, filePath, displayName),
    data: {
      maxPip,
      expectedTileCount: ((maxPip + 1) * (maxPip + 2)) / 2,
    },
  });
}

function writeExplicitRanking(filePath: string, displayName: string, deckFamily: string, rankingDeckType: string, entries: ExplicitEntryDef[]): void {
  writeJson(filePath, {
    system: createSystem('CardRanking', displayName, filePath, displayName),
    data: {
      deckType: rankingDeckType,
      expectedCardCount: entries.reduce((total, entry) => total + Math.max(1, entry.copies ?? 1), 0),
      includesJokers: false,
      backCardCount: 1,
      deckFamily,
      cardEntries: entries.map((entry, index) => ({
        id: entry.id,
        copies: entry.copies ?? 1,
        label: entry.label ?? entry.id,
        order: entry.order ?? index,
        suit: entry.suit ?? null,
        rank: entry.rank ?? null,
        points: entry.points ?? null,
        kind: entry.kind ?? null,
      })),
    },
  });
}

function createIdsFromSuitsAndRanks(family: string, suits: SuitDef[], ranks: RankDef[], kind: 'french' | 'generic'): string[] {
  const ids: string[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      ids.push(kind === 'french' ? `${rank.value}_of_${suit.name}` : `${familyPrefix(family)}_${suit.name}_${rank.value}`);
    }
  }
  return ids;
}

function buildCustom500Entries(): ExplicitEntryDef[] {
  const entries: ExplicitEntryDef[] = [];
  for (const suit of FRENCH_SUITS) {
    for (const value of [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) {
      entries.push({ id: `${value}_of_${suit.name}` });
    }
  }
  entries.push({ id: 'joker_1' });
  for (const suit of FRENCH_SUITS) {
    entries.push({ id: `custom_${suit.name}_11_spot` });
    entries.push({ id: `custom_${suit.name}_12_spot` });
  }
  for (const suit of ['hearts', 'diamonds']) {
    entries.push({ id: `custom_${suit}_13_spot` });
  }
  return entries;
}

function writeGenericDeckAsset(assetName: string, baseDeckName: string, cardRefs: ResourceEntry[], rankingFile: string, supportedTriples: SupportedTriple[]): void {
  const defaults = loadDeckDefaults(baseDeckName);
  const outFile = deckFilePath(assetName);
  writeJson(outFile, {
    system: createSystem('Deck', assetName, outFile, assetName),
    data: {
      name: assetName,
      supportedTriples,
      cardTemplates: cardRefs,
      cardRankingAsset: createResourceEntry(rankingFile, 'CardRanking', path.basename(rankingFile, '.asset')),
      imageSourceFolderPath: defaults.imageSourceFolderPath,
      cardOutputPath: `Resources/GameMode/CardGames/Cards/${assetName}`,
      backCardSourceFolderPath: defaults.backCardSourceFolderPath,
      backCardHash: defaults.backCardHash,
    },
  });
}

function createDominoTile(tileId: string, outFile: string): ResourceEntry {
  const [leftPips, rightPips] = tileId.split('-').map((value) => Number(value));
  writeJson(outFile, {
    system: createSystem('DominoTile', tileId, outFile, tileId),
    data: {
      pieceKind: 'DominoTile',
      leftPips,
      rightPips,
      tileId,
      imageHash: ZERO_HASH,
    },
  });
  return createResourceEntry(outFile, 'DominoTile', tileId);
}

function writeDominoDeckAsset(assetName: string, tileRefs: ResourceEntry[], rankingFile: string, supportedTriples: SupportedTriple[]): void {
  const outFile = deckFilePath(assetName);
  writeJson(outFile, {
    system: createSystem('DominoDeck', assetName, outFile, assetName),
    data: {
      name: assetName,
      supportedTriples,
      tileTemplates: tileRefs,
      dominoRankingAsset: createResourceEntry(rankingFile, 'DominoRanking', path.basename(rankingFile, '.asset')),
    },
  });
}

function ensureDeckSupportedTriples(assetName: string, triples: SupportedTriple[]): void {
  const filePath = deckFilePath(assetName);
  if (!fs.existsSync(filePath)) {
    return;
  }
  const asset = readJson5<AssetEnvelope>(filePath);
  asset.data.supportedTriples = triples;
  writeJson(filePath, asset);
}

function buildVariantSpecs(): GenericDeckVariantSpec[] {
  return [
    {
      assetName: 'Standard 48 (French Stripped)',
      baseDeckName: 'Standard 48',
      rankingFileName: 'French_Stripped_48.asset',
      rankingDisplayName: 'French_Stripped_48',
      deckFamily: 'French',
      rankingDeckType: 'Stripped_48',
      suits: FRENCH_SUITS,
      ranks: frenchRanks([13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]),
      supportedTriples: [{ deckType: 'Standard 48', suitSet: 'French', rankSet: 'Stripped_48' }],
      cardIdKind: 'french',
    },
    {
      assetName: 'Standard 48 (Spanish)',
      baseDeckName: 'Standard 48',
      rankingFileName: 'Spanish_Stripped_48.asset',
      rankingDisplayName: 'Spanish_Stripped_48',
      deckFamily: 'Spanish',
      rankingDeckType: 'Stripped_48',
      suits: SPANISH_SUITS,
      ranks: spanishRanks48(),
      supportedTriples: [{ deckType: 'Standard 48', suitSet: 'Spanish', rankSet: 'Stripped_48' }],
      cardIdKind: 'generic',
    },
    {
      assetName: 'Standard 40 (Italian)',
      baseDeckName: 'Standard 40',
      rankingFileName: 'Italian_Stripped_40.asset',
      rankingDisplayName: 'Italian_Stripped_40',
      deckFamily: 'Italian',
      rankingDeckType: 'Stripped_40',
      suits: ITALIAN_SUITS,
      ranks: italianRanks40(),
      supportedTriples: [{ deckType: 'Standard 40', suitSet: 'Italian', rankSet: 'Stripped_40' }],
      cardIdKind: 'generic',
    },
    {
      assetName: 'Standard 40 (Spanish)',
      baseDeckName: 'Standard 40',
      rankingFileName: 'Spanish_Stripped_40.asset',
      rankingDisplayName: 'Spanish_Stripped_40',
      deckFamily: 'Spanish',
      rankingDeckType: 'Stripped_40',
      suits: SPANISH_SUITS,
      ranks: spanishRanks40(),
      supportedTriples: [{ deckType: 'Standard 40', suitSet: 'Spanish', rankSet: 'Stripped_40' }],
      cardIdKind: 'generic',
    },
    {
      assetName: 'Standard 40 (Portuguese)',
      baseDeckName: 'Standard 40',
      rankingFileName: 'Portuguese_Stripped_40.asset',
      rankingDisplayName: 'Portuguese_Stripped_40',
      deckFamily: 'Portuguese',
      rankingDeckType: 'Stripped_40',
      suits: PORTUGUESE_SUITS,
      ranks: portugueseRanks40(),
      supportedTriples: [{ deckType: 'Standard 40', suitSet: 'Portuguese', rankSet: 'Stripped_40' }],
      cardIdKind: 'generic',
    },
    {
      assetName: 'Standard 36 (German)',
      baseDeckName: 'Standard 36',
      rankingFileName: 'German_Stripped_36.asset',
      rankingDisplayName: 'German_Stripped_36',
      deckFamily: 'German',
      rankingDeckType: 'Stripped_36',
      suits: GERMAN_SUITS,
      ranks: germanRanks([14, 13, 12, 11, 10, 9, 8, 7, 6]),
      supportedTriples: [{ deckType: 'Standard 36', suitSet: 'German', rankSet: 'Stripped_36' }],
      cardIdKind: 'generic',
    },
    {
      assetName: 'Standard 36 (Italian)',
      baseDeckName: 'Standard 36',
      rankingFileName: 'Italian_Stripped_36.asset',
      rankingDisplayName: 'Italian_Stripped_36',
      deckFamily: 'Italian',
      rankingDeckType: 'Stripped_36',
      suits: ITALIAN_SUITS,
      ranks: italianRanks36(),
      supportedTriples: [{ deckType: 'Standard 36', suitSet: 'Italian', rankSet: 'Stripped_36' }],
      cardIdKind: 'generic',
    },
    {
      assetName: 'Standard 32 (German)',
      baseDeckName: 'Standard 32',
      rankingFileName: 'German_Stripped_32.asset',
      rankingDisplayName: 'German_Stripped_32',
      deckFamily: 'German',
      rankingDeckType: 'Stripped_32',
      suits: GERMAN_SUITS,
      ranks: germanRanks([14, 13, 12, 11, 10, 9, 8, 7]),
      supportedTriples: [{ deckType: 'Standard 32', suitSet: 'German', rankSet: 'Stripped_32' }],
      cardIdKind: 'generic',
    },
    {
      assetName: 'Standard 32 + Joker(s) (German)',
      baseDeckName: 'Standard 32 + Joker(s)',
      rankingFileName: 'German_Standard_32_Plus_Jokers.asset',
      rankingDisplayName: 'German_Standard_32_Plus_Jokers',
      deckFamily: 'German',
      rankingDeckType: 'Stripped_32',
      suits: GERMAN_SUITS,
      ranks: germanRanks([14, 13, 12, 11, 10, 9, 8, 7]),
      includesJokers: true,
      supportedTriples: [{ deckType: 'Standard 32 + Joker(s)', suitSet: 'German', rankSet: 'Stripped_32' }],
      cardIdKind: 'generic',
    },
    {
      assetName: 'Standard 24 (German)',
      baseDeckName: 'Standard 24',
      rankingFileName: 'German_Stripped_24.asset',
      rankingDisplayName: 'German_Stripped_24',
      deckFamily: 'German',
      rankingDeckType: 'Stripped_24',
      suits: GERMAN_SUITS,
      ranks: germanRanks([14, 13, 12, 11, 10, 9]),
      supportedTriples: [{ deckType: 'Standard 24', suitSet: 'German', rankSet: 'Stripped_24' }],
      cardIdKind: 'generic',
    },
    {
      assetName: 'Double 32 (German)',
      baseDeckName: 'Double 32',
      rankingFileName: 'German_Double_32.asset',
      rankingDisplayName: 'German_Double_32',
      deckFamily: 'German',
      rankingDeckType: 'Stripped_32',
      explicitEntries: createIdsFromSuitsAndRanks('German', GERMAN_SUITS, germanRanks([14, 13, 12, 11, 10, 9, 8, 7]), 'generic').map((id, index) => ({ id, copies: 2, order: index })),
      supportedTriples: [{ deckType: 'Double 32', suitSet: 'German', rankSet: 'Stripped_32' }],
      cardIdKind: 'generic',
    },
    {
      assetName: 'Double 24 (German)',
      baseDeckName: 'Double 24',
      rankingFileName: 'German_Double_24.asset',
      rankingDisplayName: 'German_Double_24',
      deckFamily: 'German',
      rankingDeckType: 'Stripped_24',
      explicitEntries: createIdsFromSuitsAndRanks('German', GERMAN_SUITS, germanRanks([14, 13, 12, 11, 10, 9]), 'generic').map((id, index) => ({ id, copies: 2, order: index })),
      supportedTriples: [{ deckType: 'Double 24', suitSet: 'German', rankSet: 'Stripped_24' }],
      cardIdKind: 'generic',
    },
    {
      assetName: 'Tarot 78',
      baseDeckName: 'Tarot 78',
      rankingFileName: 'French_Tarot_78.asset',
      rankingDisplayName: 'French_Tarot_78',
      deckFamily: 'French',
      rankingDeckType: 'Tarot_78',
      explicitEntries: frenchModernTarot78Entries(),
      supportedTriples: [{ deckType: 'Tarot 78', suitSet: 'French', rankSet: 'Tarot_78' }],
      cardIdKind: 'tarot',
    },
    {
      assetName: 'Tarot 78 (French Tarock)',
      baseDeckName: 'Tarot 78',
      rankingFileName: 'French_tarock_Tarot_78.asset',
      rankingDisplayName: 'French_tarock_Tarot_78',
      deckFamily: 'French_tarock',
      rankingDeckType: 'Tarot_78',
      explicitEntries: frenchTarock78Entries(),
      supportedTriples: [{ deckType: 'Tarot 78', suitSet: 'French_tarock', rankSet: 'Tarot_78' }],
      cardIdKind: 'tarot',
    },
    {
      assetName: 'Tarot 78 (Tarot de Marseille)',
      baseDeckName: 'Tarot 78',
      rankingFileName: 'Tarot_de_Marseille_Tarot_78.asset',
      rankingDisplayName: 'Tarot_de_Marseille_Tarot_78',
      deckFamily: 'Tarot_de_Marseille',
      rankingDeckType: 'Tarot_78',
      explicitEntries: tarotDeMarseille78Entries(),
      supportedTriples: [{ deckType: 'Tarot 78', suitSet: 'Tarot_de_Marseille', rankSet: 'Tarot_78' }],
      cardIdKind: 'tarot',
    },
    {
      assetName: 'Tarot 78 (Swiss 1JJ)',
      baseDeckName: 'Tarot 78',
      rankingFileName: 'Swiss_1JJ_Tarot_78.asset',
      rankingDisplayName: 'Swiss_1JJ_Tarot_78',
      deckFamily: 'Swiss_1JJ',
      rankingDeckType: 'Tarot_78',
      explicitEntries: swiss1jj78Entries(),
      supportedTriples: [{ deckType: 'Tarot 78', suitSet: 'Swiss_1JJ', rankSet: 'Tarot_78' }],
      cardIdKind: 'tarot',
    },
    {
      assetName: 'Tarot 66',
      baseDeckName: 'Tarot 66',
      rankingFileName: 'French_tarock_Tarot_66.asset',
      rankingDisplayName: 'French_tarock_Tarot_66',
      deckFamily: 'French_tarock',
      rankingDeckType: 'Tarot_66',
      explicitEntries: frenchTarock66Entries(),
      supportedTriples: [{ deckType: 'Tarot 66', suitSet: 'French_tarock', rankSet: 'Tarot_66' }],
      cardIdKind: 'tarot',
    },
    {
      assetName: 'Tarot 66 (Tarot de Marseille)',
      baseDeckName: 'Tarot 66',
      rankingFileName: 'Tarot_de_Marseille_Tarot_66.asset',
      rankingDisplayName: 'Tarot_de_Marseille_Tarot_66',
      deckFamily: 'Tarot_de_Marseille',
      rankingDeckType: 'Tarot_66',
      explicitEntries: tarotDeMarseille66Entries(),
      supportedTriples: [{ deckType: 'Tarot 66', suitSet: 'Tarot_de_Marseille', rankSet: 'Tarot_66' }],
      cardIdKind: 'tarot',
    },
    {
      assetName: 'Tarot 54',
      baseDeckName: 'Tarot 54',
      rankingFileName: 'Industrie_und_Glueck_Tarot_54.asset',
      rankingDisplayName: 'Industrie_und_Glueck_Tarot_54',
      deckFamily: 'Industrie_und_Glueck',
      rankingDeckType: 'Tarot_54',
      explicitEntries: industrieUndGlueck54Entries(),
      supportedTriples: [{ deckType: 'Tarot 54', suitSet: 'Industrie_und_Glueck', rankSet: 'Tarot_54' }],
      cardIdKind: 'tarot',
    },
    {
      assetName: 'Tarot 54 (Cego)',
      baseDeckName: 'Tarot 54',
      rankingFileName: 'Cego_Tarot_54.asset',
      rankingDisplayName: 'Cego_Tarot_54',
      deckFamily: 'Cego',
      rankingDeckType: 'Tarot_54',
      explicitEntries: cego54Entries(),
      supportedTriples: [{ deckType: 'Tarot 54', suitSet: 'Cego', rankSet: 'Tarot_54' }],
      cardIdKind: 'tarot',
    },
    {
      assetName: 'Tarot 42',
      baseDeckName: 'Tarot 42',
      rankingFileName: 'Industrie_und_Glueck_Tarot_42.asset',
      rankingDisplayName: 'Industrie_und_Glueck_Tarot_42',
      deckFamily: 'Industrie_und_Glueck',
      rankingDeckType: 'Tarot_42',
      explicitEntries: industrieUndGlueck42Entries(),
      supportedTriples: [{ deckType: 'Tarot 42', suitSet: 'Industrie_und_Glueck', rankSet: 'Tarot_42' }],
      cardIdKind: 'tarot',
    },
    {
      assetName: 'Tarot 40',
      baseDeckName: 'Tarot 54',
      rankingFileName: 'Industrie_und_Glueck_Tarot_40.asset',
      rankingDisplayName: 'Industrie_und_Glueck_Tarot_40',
      deckFamily: 'Industrie_und_Glueck',
      rankingDeckType: 'Tarot_40',
      explicitEntries: industrieUndGlueck40Entries(),
      supportedTriples: [{ deckType: 'Tarot 40', suitSet: 'Industrie_und_Glueck', rankSet: 'Tarot_40' }],
      cardIdKind: 'tarot',
    },
    {
      assetName: 'Tarot 62',
      baseDeckName: 'Tarot 78',
      rankingFileName: 'Swiss_1JJ_Tarot_62.asset',
      rankingDisplayName: 'Swiss_1JJ_Tarot_62',
      deckFamily: 'Swiss_1JJ',
      rankingDeckType: 'Tarot_62',
      explicitEntries: swiss1jj62Entries(),
      supportedTriples: [{ deckType: 'Tarot 62', suitSet: 'Swiss_1JJ', rankSet: 'Tarot_62' }],
      cardIdKind: 'tarot',
    },
    {
      assetName: 'Tarot 62 (Tarocco Piemontese)',
      baseDeckName: 'Tarot 78',
      rankingFileName: 'Tarocco_Piemontese_Tarot_62.asset',
      rankingDisplayName: 'Tarocco_Piemontese_Tarot_62',
      deckFamily: 'Tarocco_Piemontese',
      rankingDeckType: 'Tarot_62',
      explicitEntries: taroccoPiemontese62Entries(),
      supportedTriples: [{ deckType: 'Tarot 62', suitSet: 'Tarocco_Piemontese', rankSet: 'Tarot_62' }],
      cardIdKind: 'tarot',
    },
    {
      assetName: '500 deck 63',
      baseDeckName: '500 deck 63',
      rankingFileName: 'French_500_deck_63.asset',
      rankingDisplayName: 'French_500_deck_63',
      deckFamily: 'Custom',
      rankingDeckType: 'Custom',
      explicitEntries: buildCustom500Entries(),
      supportedTriples: [{ deckType: '500 deck 63', suitSet: 'French', rankSet: 'Custom' }],
      cardIdKind: 'custom',
    },
  ];
}

function buildDominoVariantSpecs(): DominoVariantSpec[] {
  return [
    {
      assetName: 'Double-6 Dominoes (Khorol)',
      rankingFileName: 'Khorol_Domino_double6.asset',
      rankingDisplayName: 'Khorol_Domino_double6',
      supportedTriples: [{ deckType: 'Double-6 Dominoes', suitSet: 'Khorol', rankSet: 'Domino_double6' }],
      maxPip: 6,
    },
    {
      assetName: 'Double-8 Dominoes (Khorol)',
      rankingFileName: 'Khorol_Domino_double8.asset',
      rankingDisplayName: 'Khorol_Domino_double8',
      supportedTriples: [{ deckType: 'Double-8 Dominoes', suitSet: 'Khorol', rankSet: 'Domino_double8' }],
      maxPip: 8,
    },
    {
      assetName: 'Double-9 Dominoes (Khorol)',
      rankingFileName: 'Khorol_Domino_double9.asset',
      rankingDisplayName: 'Khorol_Domino_double9',
      supportedTriples: [{ deckType: 'Double-9 Dominoes', suitSet: 'Khorol', rankSet: 'Domino_double9' }],
      maxPip: 9,
    },
    {
      assetName: 'Double-12 Dominoes (Khorol)',
      rankingFileName: 'Khorol_Domino_double12.asset',
      rankingDisplayName: 'Khorol_Domino_double12',
      supportedTriples: [{ deckType: 'Double-12 Dominoes', suitSet: 'Khorol', rankSet: 'Domino_double12' }],
      maxPip: 12,
    },
    {
      assetName: 'Double-6 Dominoes (E-awase)',
      rankingFileName: 'E_awase_Domino_double6.asset',
      rankingDisplayName: 'E_awase_Domino_double6',
      supportedTriples: [{ deckType: 'Double-6 Dominoes', suitSet: 'E_awase', rankSet: 'Domino_double6' }],
      maxPip: 6,
    },
    {
      assetName: 'Double-8 Dominoes (E-awase)',
      rankingFileName: 'E_awase_Domino_double8.asset',
      rankingDisplayName: 'E_awase_Domino_double8',
      supportedTriples: [{ deckType: 'Double-8 Dominoes', suitSet: 'E_awase', rankSet: 'Domino_double8' }],
      maxPip: 8,
    },
    {
      assetName: 'Double-9 Dominoes (E-awase)',
      rankingFileName: 'E_awase_Domino_double9.asset',
      rankingDisplayName: 'E_awase_Domino_double9',
      supportedTriples: [{ deckType: 'Double-9 Dominoes', suitSet: 'E_awase', rankSet: 'Domino_double9' }],
      maxPip: 9,
    },
    {
      assetName: 'Double-12 Dominoes (E-awase)',
      rankingFileName: 'E_awase_Domino_double12.asset',
      rankingDisplayName: 'E_awase_Domino_double12',
      supportedTriples: [{ deckType: 'Double-12 Dominoes', suitSet: 'E_awase', rankSet: 'Domino_double12' }],
      maxPip: 12,
    },
  ];
}

function materializeGenericDeckVariant(spec: GenericDeckVariantSpec): void {
  const rankingFile = rankingFilePath(spec.rankingFileName);

  if (spec.explicitEntries) {
    writeExplicitRanking(rankingFile, spec.rankingDisplayName, spec.deckFamily, spec.rankingDeckType, spec.explicitEntries);
  } else if (spec.suits && spec.ranks) {
    writeFamilyPayloadRanking(rankingFile, spec.rankingDisplayName, spec.deckFamily, spec.rankingDeckType, spec.suits, spec.ranks, spec.includesJokers ?? false);
  } else {
    throw new Error(`Variant ${spec.assetName} is missing ranking data`);
  }

  const folder = cardFolderPath(spec.assetName);
  clearFolder(folder);
  const ids = spec.explicitEntries
    ? spec.explicitEntries.map((entry) => entry.id)
    : createIdsFromSuitsAndRanks(spec.deckFamily, spec.suits ?? [], spec.ranks ?? [], spec.cardIdKind === 'french' ? 'french' : 'generic')
        .concat(
          spec.includesJokers
            ? (spec.cardIdKind === 'french'
                ? ['joker_1', 'joker_2']
                : [`${familyPrefix(spec.deckFamily)}_joker_1`, `${familyPrefix(spec.deckFamily)}_joker_2`])
            : [],
        );

  const cardRefs: ResourceEntry[] = [];
  for (const id of ids) {
    const outFile = path.join(folder, `${id}.asset`);
    if (spec.cardIdKind === 'french') {
      cardRefs.push(createFrenchCard(id, rankingFile, outFile));
    } else if (spec.cardIdKind === 'tarot') {
      cardRefs.push(createTarotCard(id, rankingFile, outFile));
    } else if (
      spec.cardIdKind === 'custom' &&
      (id === 'joker_1' || id === 'joker_2' || /^\d+_of_[a-z]+$/.test(id))
    ) {
      cardRefs.push(createFrenchCard(id, rankingFile, outFile));
    } else {
      cardRefs.push(createGenericCard(spec.deckFamily, id, rankingFile, outFile));
    }
  }

  const templateRefs = spec.explicitEntries
    ? spec.explicitEntries.flatMap((entry) => {
        const ref = cardRefs.find((card) => card.displayName === entry.id);
        if (!ref) {
          throw new Error(`Missing generated card ${entry.id}`);
        }
        return Array.from({ length: Math.max(1, entry.copies ?? 1) }, () => ref);
      })
    : cardRefs;

  writeGenericDeckAsset(spec.assetName, spec.baseDeckName, templateRefs, rankingFile, spec.supportedTriples);
}

function materializeDominoVariant(spec: DominoVariantSpec): void {
  const rankingFile = rankingFilePath(spec.rankingFileName);
  const tileFolder = tileFolderPath(spec.assetName);
  const legacyCardFolder = cardFolderPath(spec.assetName);

  writeDominoRanking(rankingFile, spec.rankingDisplayName, spec.maxPip);
  clearFolder(tileFolder);
  if (fs.existsSync(legacyCardFolder)) {
    fs.rmSync(legacyCardFolder, { recursive: true, force: true });
  }

  const tileRefs: ResourceEntry[] = [];
  for (let leftPips = 0; leftPips <= spec.maxPip; leftPips++) {
    for (let rightPips = leftPips; rightPips <= spec.maxPip; rightPips++) {
      const tileId = `${leftPips}-${rightPips}`;
      const outFile = path.join(tileFolder, `${tileId}.asset`);
      tileRefs.push(createDominoTile(tileId, outFile));
    }
  }

  writeDominoDeckAsset(spec.assetName, tileRefs, rankingFile, spec.supportedTriples);
}

function fixHanafudaSnowAssets(): void {
  const standardRanking = readJson5<AssetEnvelope>(rankingFilePath('Hanafuda_48.asset'));
  const snowRankingFile = rankingFilePath('Hanafuda_snow_Hanafuda.asset');
  writeJson(snowRankingFile, {
    system: createSystem('HanafudaRanking', 'Hanafuda_snow_Hanafuda', snowRankingFile, 'Hanafuda_snow_Hanafuda'),
    data: standardRanking.data,
  });

  const standardDeck = readJson5<AssetEnvelope>(deckFilePath('Hanafuda 48'));
  const snowDeckFile = deckFilePath('Hanafuda 48 (Snow)');
  writeJson(snowDeckFile, {
    system: createSystem('HanafudaDeck', 'Hanafuda 48 (Snow)', snowDeckFile, 'Hanafuda 48 (Snow)'),
    data: {
      ...standardDeck.data,
      name: 'Hanafuda 48 (Snow)',
      supportedTriples: [{ deckType: 'Hanafuda 48', suitSet: 'Hanafuda_snow', rankSet: 'Hanafuda' }],
      hanafudaRankingAsset: createResourceEntry(snowRankingFile, 'HanafudaRanking', 'Hanafuda_snow_Hanafuda'),
    },
  });
}

function patchExistingDeckTriples(): void {
  const triplesByAsset: Record<string, SupportedTriple[]> = {
    '500 deck 63': [{ deckType: '500 deck 63', suitSet: 'French', rankSet: 'Custom' }],
    'Bai_choi 33': [{ deckType: 'Bai_choi 33', suitSet: 'Custom', rankSet: 'Custom' }],
    'Cego 38': [{ deckType: 'Cego 38', suitSet: 'Cego', rankSet: 'Cego_38' }],
    'Ceki 60': [{ deckType: 'Ceki 60', suitSet: 'Custom', rankSet: 'Custom' }],
    'Chinese domino 32': [{ deckType: 'Chinese domino 32', suitSet: 'Chinese_domino', rankSet: 'Chinese_domino' }],
    'Chinese domino 84': [{ deckType: 'Chinese domino 84', suitSet: 'Chinese_domino', rankSet: 'Chinese_domino' }],
    'Custom': [{ deckType: 'Custom', suitSet: 'Custom', rankSet: 'Custom' }],
    'Double 24': [{ deckType: 'Double 24', suitSet: 'French', rankSet: 'Stripped_24' }],
    'Double 32': [{ deckType: 'Double 32', suitSet: 'French', rankSet: 'Stripped_32' }],
    'Double 52': [{ deckType: 'Double 52', suitSet: 'French', rankSet: 'Standard_52' }],
    'Double 52 + 4 Jokers': [{ deckType: 'Double 52 + 4 Jokers', suitSet: 'French', rankSet: 'Standard_52' }],
    'Double-6 Dominoes': [{ deckType: 'Double-6 Dominoes', suitSet: 'Dominoes', rankSet: 'Domino_double6' }],
    'Double-8 Dominoes': [{ deckType: 'Double-8 Dominoes', suitSet: 'Dominoes', rankSet: 'Domino_double8' }],
    'Double-9 Dominoes': [{ deckType: 'Double-9 Dominoes', suitSet: 'Dominoes', rankSet: 'Domino_double9' }],
    'Double-12 Dominoes': [{ deckType: 'Double-12 Dominoes', suitSet: 'Dominoes', rankSet: 'Domino_double12' }],
    'Double-6 + Double-12 Dominoes': [
      { deckType: 'Double-6 + Double-12 Dominoes', suitSet: 'Dominoes', rankSet: 'Domino_double6' },
      { deckType: 'Double-6 + Double-12 Dominoes', suitSet: 'Dominoes', rankSet: 'Custom' },
    ],
    'Double-9 + Double-12 Dominoes': [
      { deckType: 'Double-9 + Double-12 Dominoes', suitSet: 'Dominoes', rankSet: 'Domino_double9' },
      { deckType: 'Double-9 + Double-12 Dominoes', suitSet: 'Dominoes', rankSet: 'Custom' },
    ],
    'Four Color 112': [{ deckType: 'Four Color 112', suitSet: 'Four_color', rankSet: 'Four_color_pieces' }],
    'Ganjifa': [{ deckType: 'Ganjifa', suitSet: 'Ganjifa', rankSet: 'Ganjifa' }],
    'Gnav 42': [{ deckType: 'Gnav 42', suitSet: 'Gnav', rankSet: 'Gnav_ranks' }],
    'Goita 32': [{ deckType: 'Goita 32', suitSet: 'Goita', rankSet: 'Goita_pieces' }],
    'Hanafuda 48': [{ deckType: 'Hanafuda 48', suitSet: 'Hanafuda', rankSet: 'Hanafuda' }],
    'Hanafuda 52': [{ deckType: 'Hanafuda 52', suitSet: 'Hanafuda', rankSet: 'Hanafuda' }],
    'Hols der Geier 75': [{ deckType: 'Hols der Geier 75', suitSet: 'Hols_der_Geier_colors', rankSet: 'Hols_der_Geier_1_15' }],
    'Iroha Karuta 96': [{ deckType: 'Iroha Karuta 96', suitSet: 'Custom', rankSet: 'Custom' }],
    'Kabufuda 40': [{ deckType: 'Kabufuda 40', suitSet: 'Kabufuda', rankSet: 'Kabufuda' }],
    'Khorol 60': [{ deckType: 'Khorol 60', suitSet: 'Khorol', rankSet: 'Khorol' }],
    'Komatsufuda 48': [{ deckType: 'Komatsufuda 48', suitSet: 'Custom', rankSet: 'Custom' }],
    'Mahjong 144': [{ deckType: 'Mahjong 144', suitSet: 'Mahjong', rankSet: 'Mahjong' }],
    'Money-suited 38': [{ deckType: 'Money-suited 38', suitSet: 'Money-suited', rankSet: 'Money-suited' }],
    'Money-suited 39': [{ deckType: 'Money-suited 39', suitSet: 'Money-suited', rankSet: 'Money-suited' }],
    'Numbered 104': [{ deckType: 'Numbered 104', suitSet: 'Numbered_104', rankSet: 'Numbered_1_104' }],
    'Oct 40': [{ deckType: 'Oct 40', suitSet: 'French', rankSet: 'Stripped_40' }],
    'Okey 106': [{ deckType: 'Okey 106', suitSet: 'Okey', rankSet: 'Okey' }],
    'Quad 36': [{ deckType: 'Quad 36', suitSet: 'French', rankSet: 'Stripped_36' }],
    'Quad 40': [{ deckType: 'Quad 40', suitSet: 'French', rankSet: 'Stripped_40' }],
    'Quad 52 + 8 Jokers': [{ deckType: 'Quad 52 + 8 Jokers', suitSet: 'French', rankSet: 'Standard_52' }],
    'Rook 56': [{ deckType: 'Rook 56', suitSet: 'Rook_colors', rankSet: 'Rook_1_14' }],
    'Standard 16': [{ deckType: 'Standard 16', suitSet: 'French', rankSet: 'Stripped_16' }],
    'Standard 24': [{ deckType: 'Standard 24', suitSet: 'French', rankSet: 'Stripped_24' }],
    'Standard 26': [{ deckType: 'Standard 26', suitSet: 'French', rankSet: 'Stripped_26' }],
    'Standard 28': [{ deckType: 'Standard 28', suitSet: 'French', rankSet: 'Stripped_28' }],
    'Standard 30': [{ deckType: 'Standard 30', suitSet: 'French', rankSet: 'Stripped_30' }],
    'Standard 32': [{ deckType: 'Standard 32', suitSet: 'French', rankSet: 'Stripped_32' }],
    'Standard 32 + Joker(s)': [{ deckType: 'Standard 32 + Joker(s)', suitSet: 'French', rankSet: 'Stripped_32' }],
    'Standard 36': [{ deckType: 'Standard 36', suitSet: 'French', rankSet: 'Stripped_36' }],
    'Standard 40': [{ deckType: 'Standard 40', suitSet: 'French', rankSet: 'Stripped_40' }],
    'Standard 44': [{ deckType: 'Standard 44', suitSet: 'French', rankSet: 'Stripped_44' }],
    'Standard 48': [{ deckType: 'Standard 48', suitSet: 'French', rankSet: 'Pinochle_48' }],
    'Standard 52': [{ deckType: 'Standard 52', suitSet: 'French', rankSet: 'Standard_52' }],
    'Standard 52 + Joker(s)': [{ deckType: 'Standard 52 + Joker(s)', suitSet: 'French', rankSet: 'Standard_52' }],
    'Stripped 35': [{ deckType: 'Stripped 35', suitSet: 'French', rankSet: 'Stripped_35' }],
    'Tarocco Bolognese 62': [{ deckType: 'Tarocco Bolognese 62', suitSet: 'Italian', rankSet: 'Tarocco_Bolognese_62' }],
    'Tarocco Siciliano 64': [{ deckType: 'Tarocco Siciliano 64', suitSet: 'Italian', rankSet: 'Tarocco_Sicilian_64' }],
    'Tarot 42': [{ deckType: 'Tarot 42', suitSet: 'Industrie_und_Glueck', rankSet: 'Tarot_42' }],
    'Tarot 54': [{ deckType: 'Tarot 54', suitSet: 'Industrie_und_Glueck', rankSet: 'Tarot_54' }],
    'Tarot 66': [{ deckType: 'Tarot 66', suitSet: 'French_tarock', rankSet: 'Tarot_66' }],
    'Tarot 78': [{ deckType: 'Tarot 78', suitSet: 'French', rankSet: 'Tarot_78' }],
    'Tiddlywink': [{ deckType: 'Tiddlywink', suitSet: 'Tiddlywink_colors', rankSet: 'Tiddlywink_pieces' }],
    'To_tom 120': [{ deckType: 'To_tom 120', suitSet: 'Custom', rankSet: 'Custom' }],
    'Treikort 27': [{ deckType: 'Treikort 27', suitSet: 'French', rankSet: 'Treikort_27' }],
    'Triple 52 + 6 Jokers': [{ deckType: 'Triple 52 + 6 Jokers', suitSet: 'French', rankSet: 'Standard_52' }],
    'Unsun Karuta 75': [{ deckType: 'Unsun Karuta 75', suitSet: 'Custom', rankSet: 'Custom' }],
    'Uta-garuta 200': [{ deckType: 'Uta-garuta 200', suitSet: 'Uta_garuta', rankSet: 'Uta_garuta' }],
    'Whot 54': [{ deckType: 'Whot 54', suitSet: 'Whot', rankSet: 'Whot' }],
    'Xiangqi 32': [{ deckType: 'Xiangqi 32', suitSet: 'Xiangqi_red_black', rankSet: 'Xiangqi_pieces' }],
  };

  for (const [assetName, triples] of Object.entries(triplesByAsset)) {
    ensureDeckSupportedTriples(assetName, triples);
  }
}

function cleanupObsoletePlaceholderAssets(): void {
  const obsoleteRankingFiles = [
    'Chinese_domino_Chinese_domino.asset',
    'Dominoes_Custom.asset',
    'Dominoes_Domino_double12.asset',
    'Dominoes_Domino_double6.asset',
    'Dominoes_Domino_double8.asset',
    'Dominoes_Domino_double9.asset',
    'French_Custom.asset',
    'French_Tarot_42.asset',
    'French_Tarot_66.asset',
    'Hanafuda_Hanafuda.asset',
    'Kabufuda_Kabufuda.asset',
    'Mahjong_Mahjong.asset',
    'Tarot_minor_Tarot_54.asset',
    'Tarot_minor_Tarot_78.asset',
    'tarot_54.asset',
    'Uta_garuta_Uta_garuta.asset',
  ];

  for (const fileName of obsoleteRankingFiles) {
    const absolutePath = rankingFilePath(fileName);
    if (fs.existsSync(absolutePath)) {
      fs.rmSync(absolutePath, { force: true });
    }
  }

  const obsoleteCardFolders = [
    'Chinese Dominoes',
    'Double-6 Dominoes',
    'Hanafuda',
    'Kabufuda',
    'Mahjong',
    'Tarot 78 (Tarot Minor)',
    'Tarot78',
    'Uta-garuta',
  ];

  for (const folderName of obsoleteCardFolders) {
    const absolutePath = cardFolderPath(folderName);
    if (fs.existsSync(absolutePath)) {
      fs.rmSync(absolutePath, { recursive: true, force: true });
    }
  }

  const obsoleteDeckFiles = [
    'Tarot 78 (Tarot Minor).asset',
  ];

  for (const fileName of obsoleteDeckFiles) {
    const absolutePath = deckFilePath(fileName.replace(/\.asset$/i, ''));
    if (fs.existsSync(absolutePath)) {
      fs.rmSync(absolutePath, { force: true });
    }
  }
}

function main(): void {
  patchExistingDeckTriples();
  for (const spec of buildVariantSpecs()) {
    materializeGenericDeckVariant(spec);
  }
  for (const spec of buildDominoVariantSpecs()) {
    materializeDominoVariant(spec);
  }
  fixHanafudaSnowAssets();
  cleanupObsoletePlaceholderAssets();
}

main();
