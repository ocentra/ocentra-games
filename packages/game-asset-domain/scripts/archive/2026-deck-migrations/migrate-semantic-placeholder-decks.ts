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

type GenericCardEntryDef = {
  id: string;
  label: string;
  copies?: number;
  order?: number;
  suit?: string;
  rank?: string | number;
  points?: number;
  kind?: string;
};

type DeckMigration = {
  deckName: string;
  deckFamily: string;
  rankingDeckType: string;
  entries: GenericCardEntryDef[];
};

type CardIdentityJson =
  | { family: 'French'; suit: string; value: number }
  | { family: 'French'; joker: true; index: 1 | 2 }
  | { family: 'Tarot'; kind: 'trump'; number: number }
  | { family: 'Tarot'; kind: 'minor'; suit: string; value: number }
  | { family: 'Tarot'; kind: 'fool' }
  | { family: string; id: string };

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

function createSystem(assetType: string, displayName: string, absolutePath: string, icon?: string): Record<string, unknown> {
  return {
    guid: deterministicGuid(toTreePath(absolutePath)),
    assetType,
    schemaVersion: 1,
    displayName,
    category: 'Game',
    icon: icon ?? CARD_ICON,
    variant: displayName,
    parentPath: toParentPath(absolutePath),
    treePath: toTreePath(absolutePath),
  };
}

function sanitizePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function clearFolder(folderPath: string): void {
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
  }
  fs.mkdirSync(folderPath, { recursive: true });
}

function inferCardIdentity(deckFamily: string, cardId: string): CardIdentityJson {
  if (cardId === 'joker_1' || cardId === 'joker_2') {
    return {
      family: 'French',
      joker: true,
      index: cardId === 'joker_1' ? 1 : 2,
    };
  }
  if (cardId === 'tarot_fool') {
    return { family: 'Tarot', kind: 'fool' };
  }
  if (cardId.startsWith('tarot_trump_')) {
    return { family: 'Tarot', kind: 'trump', number: Number(cardId.replace('tarot_trump_', '')) };
  }
  const frenchMatch = /^(\d+)_of_([a-z]+)$/.exec(cardId);
  if (deckFamily === 'Tarot_minor' && frenchMatch) {
    return {
      family: 'Tarot',
      kind: 'minor',
      value: Number(frenchMatch[1]),
      suit: frenchMatch[2],
    };
  }
  if (deckFamily === 'French' && frenchMatch) {
    return {
      family: 'French',
      value: Number(frenchMatch[1]),
      suit: frenchMatch[2],
    };
  }
  return { family: deckFamily, id: cardId };
}

function createGenericCardAsset(
  deckFamily: string,
  cardId: string,
  rankingFilePath: string,
  cardFilePath: string,
): ResourceEntry {
  writeJson(cardFilePath, {
    system: createSystem('Card', cardId, cardFilePath, CARD_ICON),
    data: {
      pieceKind: 'Card',
      cardIdentity: inferCardIdentity(deckFamily, cardId),
      imageHash: ZERO_HASH,
      cardId,
      cardRankingAsset: createResourceEntry(rankingFilePath, 'CardRanking', path.basename(rankingFilePath, '.asset')),
    },
  });

  return createResourceEntry(cardFilePath, 'Card', cardId);
}

function createRankingEntries(entries: GenericCardEntryDef[]): Array<Record<string, unknown>> {
  return entries.map((entry) => ({
    id: entry.id,
    copies: Math.max(1, entry.copies ?? 1),
    label: entry.label,
    order: entry.order ?? 0,
    suit: entry.suit ?? null,
    rank: entry.rank ?? null,
    points: entry.points ?? null,
    kind: entry.kind ?? null,
  }));
}

function expandDeckTemplates(
  cardResourcesById: Map<string, ResourceEntry>,
  entries: GenericCardEntryDef[],
): ResourceEntry[] {
  const templates: ResourceEntry[] = [];
  for (const entry of entries) {
    const resource = cardResourcesById.get(entry.id);
    if (!resource) {
      throw new Error(`Missing card resource for ${entry.id}`);
    }
    const copies = Math.max(1, entry.copies ?? 1);
    for (let index = 0; index < copies; index++) {
      templates.push(resource);
    }
  }
  return templates;
}

function getDeckAssetPath(deckName: string): string {
  return path.resolve(CARD_GAMES_DIR, 'Decks', `${deckName}.asset`);
}

function getRankingFilePath(deckAsset: AssetEnvelope, deckName: string): string {
  const rankingRef =
    (deckAsset.data.cardRankingAsset as { path?: string } | undefined) ??
    (deckAsset.data.playingCardRankingAsset as { path?: string } | undefined);
  if (rankingRef?.path) {
    return path.resolve(ASSET_EDITOR_DIR, String(rankingRef.path));
  }
  return path.resolve(CARD_GAMES_DIR, 'CardRanking', `${sanitizePart(deckName)}.asset`);
}

function getDedicatedCardFolderPath(deckName: string): string {
  return path.resolve(CARD_GAMES_DIR, 'Cards', deckName);
}

function getDedicatedRankingFilePath(deckName: string): string {
  return path.resolve(CARD_GAMES_DIR, 'CardRanking', `${sanitizePart(deckName)}.asset`);
}

function repairStandard52CardPool(): void {
  const standardRankingFilePath = path.resolve(CARD_GAMES_DIR, 'CardRanking', 'StandardCardRanking.asset');
  const jokerRankingFilePath = path.resolve(CARD_GAMES_DIR, 'CardRanking', 'French_Standard_52_Plus_Jokers.asset');
  const folderPath = path.resolve(CARD_GAMES_DIR, 'Cards', 'Standard52');
  clearFolder(folderPath);

  for (const suit of ['spades', 'hearts', 'diamonds', 'clubs']) {
    for (let value = 14; value >= 2; value--) {
      const cardId = `${value}_of_${suit}`;
      const cardFilePath = path.resolve(folderPath, `${cardId}.asset`);
      createGenericCardAsset('French', cardId, standardRankingFilePath, cardFilePath);
    }
  }

  for (const jokerId of ['joker_1', 'joker_2']) {
    const cardFilePath = path.resolve(folderPath, `${jokerId}.asset`);
    createGenericCardAsset('French', jokerId, jokerRankingFilePath, cardFilePath);
  }
}

function repairStripped35Deck(): void {
  const deckName = 'Stripped 35';
  const deckFilePath = getDeckAssetPath(deckName);
  const deckAsset = readJson5(deckFilePath);
  const rankingFilePath = path.resolve(CARD_GAMES_DIR, 'CardRanking', 'French_Stripped_35.asset');
  const folderPath = getDedicatedCardFolderPath(deckName);
  clearFolder(folderPath);

  const suits = ['spades', 'hearts', 'diamonds', 'clubs', 'trumps'];
  const values = [14, 13, 12, 11, 10, 9, 8];
  const cardResources: ResourceEntry[] = [];

  for (const suit of suits) {
    for (const value of values) {
      const cardId = `${value}_of_${suit}`;
      const cardFilePath = path.resolve(folderPath, `${cardId}.asset`);
      const resource = createGenericCardAsset('French', cardId, rankingFilePath, cardFilePath);
      cardResources.push(resource);
    }
  }

  writeJson(deckFilePath, {
    system: {
      ...deckAsset.system,
      displayName: deckName,
      assetType: 'Deck',
      icon: deckAsset.system.icon ?? CARD_ICON,
    },
    data: {
      ...deckAsset.data,
      name: deckName,
      cardTemplates: cardResources,
      cardRankingAsset: createResourceEntry(rankingFilePath, 'CardRanking', 'French_Stripped_35'),
    },
  });
}

function migrateGenericDeck(config: DeckMigration): void {
  const deckFilePath = getDeckAssetPath(config.deckName);
  const deckAsset = readJson5(deckFilePath);
  const rankingFilePath = getDedicatedRankingFilePath(config.deckName);
  const rankingDisplayName = path.basename(rankingFilePath, '.asset');
  const cardFolderPath = getDedicatedCardFolderPath(config.deckName);
  const cardResourcesById = new Map<string, ResourceEntry>();

  clearFolder(cardFolderPath);

  for (const entry of config.entries) {
    const cardFilePath = path.resolve(cardFolderPath, `${entry.id}.asset`);
    const resource = createGenericCardAsset(config.deckFamily, entry.id, rankingFilePath, cardFilePath);
    cardResourcesById.set(entry.id, resource);
  }

  writeJson(rankingFilePath, {
    system: createSystem('CardRanking', rankingDisplayName, rankingFilePath, CARD_ICON),
    data: {
      deckType: config.rankingDeckType,
      expectedCardCount: config.entries.reduce((sum, entry) => sum + Math.max(1, entry.copies ?? 1), 0),
      includesJokers: false,
      backCardCount: 1,
      deckFamily: config.deckFamily,
      cardEntries: createRankingEntries(config.entries),
    },
  });

  writeJson(deckFilePath, {
    system: {
      ...deckAsset.system,
      displayName: config.deckName,
      assetType: 'Deck',
      icon: deckAsset.system.icon ?? CARD_ICON,
    },
    data: {
      ...deckAsset.data,
      name: config.deckName,
      cardTemplates: expandDeckTemplates(cardResourcesById, config.entries),
      cardRankingAsset: createResourceEntry(rankingFilePath, 'CardRanking', rankingDisplayName),
    },
  });
}

type ExistingDeckCopyMigration = {
  deckName: string;
  copies: number;
};

function migrateRepeatedFrenchDeck(config: ExistingDeckCopyMigration): void {
  const deckFilePath = getDeckAssetPath(config.deckName);
  const deckAsset = readJson5(deckFilePath);
  const rankingFilePath = getRankingFilePath(deckAsset, config.deckName);
  const rankingAsset = readJson5(rankingFilePath);
  const cardTemplates = Array.isArray(deckAsset.data.cardTemplates)
    ? (deckAsset.data.cardTemplates as Array<{ displayName?: string; variant?: string }>)
    : [];
  const uniqueEntries = cardTemplates.map((entry) => String(entry.variant ?? entry.displayName ?? ''));
  const canonicalIds = Array.from(new Set(uniqueEntries.filter(Boolean)));
  const rankingDisplayName = path.basename(rankingFilePath, '.asset');
  const explicitEntries = canonicalIds.map((id, index) => ({
    id,
    copies: config.copies,
    label: id,
    order: index,
  }));
  const duplicatedTemplates = cardTemplates.flatMap((entry) =>
    Array.from({ length: config.copies }, () => entry),
  );

  writeJson(rankingFilePath, {
    system: {
      ...rankingAsset.system,
      displayName: rankingAsset.system.displayName ?? rankingDisplayName,
      icon: rankingAsset.system.icon ?? CARD_ICON,
    },
    data: {
      ...rankingAsset.data,
      expectedCardCount: canonicalIds.length * config.copies,
      cardEntries: explicitEntries,
    },
  });

  writeJson(deckFilePath, {
    system: {
      ...deckAsset.system,
      displayName: config.deckName,
      icon: deckAsset.system.icon ?? CARD_ICON,
    },
    data: {
      ...deckAsset.data,
      name: config.deckName,
      cardTemplates: duplicatedTemplates,
      cardRankingAsset: createResourceEntry(rankingFilePath, 'CardRanking', rankingDisplayName),
    },
  });
}

function frenchSuitEntries(): Array<{ suit: string; label: string }> {
  return [
    { suit: 'spades', label: 'Spades' },
    { suit: 'hearts', label: 'Hearts' },
    { suit: 'diamonds', label: 'Diamonds' },
    { suit: 'clubs', label: 'Clubs' },
  ];
}

function createCego38Entries(): GenericCardEntryDef[] {
  const entries: GenericCardEntryDef[] = [];
  for (let trump = 1; trump <= 21; trump++) {
    entries.push({
      id: `cego_trump_${trump}`,
      label: `Trump ${trump}`,
      order: trump,
      kind: 'trump',
      points: trump === 1 || trump === 21 ? 5 : 1,
    });
  }
  entries.push({
    id: 'cego_gsties',
    label: 'Gsties',
    order: 22,
    kind: 'trump',
    points: 5,
  });

  const courts = [
    { id: 'king', label: 'King', points: 5 },
    { id: 'queen', label: 'Queen', points: 4 },
    { id: 'cavalier', label: 'Cavalier', points: 3 },
    { id: 'jack', label: 'Jack', points: 2 },
  ];
  for (const suit of frenchSuitEntries()) {
    for (const [index, court] of courts.entries()) {
      entries.push({
        id: `cego_${suit.suit}_${court.id}`,
        label: `${suit.label} ${court.label}`,
        suit: suit.suit,
        rank: court.id,
        order: 100 + index,
        points: court.points,
        kind: 'suit',
      });
    }
  }
  return entries;
}

function createGnavEntries(): GenericCardEntryDef[] {
  const ranks = [
    ['gjok', 'Gjok', 21],
    ['dragon', 'Dragon', 20],
    ['katt', 'Katt', 19],
    ['hest', 'Hest', 18],
    ['hus', 'Hus', 17],
    ['xii', 'XII', 16],
    ['xi', 'XI', 15],
    ['x', 'X', 14],
    ['ix', 'IX', 13],
    ['viii', 'VIII', 12],
    ['vii', 'VII', 11],
    ['vi', 'VI', 10],
    ['v', 'V', 9],
    ['iv', 'IV', 8],
    ['iii', 'III', 7],
    ['ii', 'II', 6],
    ['i', 'I', 5],
    ['zero', '0', 4],
    ['potte', 'Potte', 3],
    ['ugle', 'Ugle', 2],
    ['narr', 'Narr', 1],
  ] as const;
  return ranks.map(([id, label, points], index) => ({
    id: `gnav_${id}`,
    label,
    copies: 2,
    order: 100 - index,
    points,
  }));
}

function createGoitaEntries(): GenericCardEntryDef[] {
  const pieces = [
    ['king', 'King', 2, 50],
    ['rook', 'Rook', 2, 40],
    ['bishop', 'Bishop', 2, 40],
    ['gold', 'Gold', 4, 30],
    ['silver', 'Silver', 4, 30],
    ['knight', 'Knight', 4, 20],
    ['lance', 'Lance', 4, 20],
    ['pawn', 'Pawn', 10, 10],
  ] as const;
  return pieces.map(([id, label, copies, points], index) => ({
    id: `goita_${id}`,
    label,
    copies,
    order: 100 - index,
    points,
  }));
}

function createFourColorEntries(): GenericCardEntryDef[] {
  const colors = ['green', 'white', 'yellow', 'red'];
  const ranks = [
    ['general', 'General', 4],
    ['advisor', 'Advisor', 2],
    ['elephant', 'Elephant', 2],
    ['chariot', 'Chariot', 2],
    ['horse', 'Horse', 2],
    ['cannon', 'Cannon', 2],
    ['soldier', 'Soldier', 1],
  ] as const;
  const entries: GenericCardEntryDef[] = [];
  for (const color of colors) {
    for (const [index, [id, label, points]] of ranks.entries()) {
      entries.push({
        id: `four_color_${color}_${id}`,
        label: `${capitalize(color)} ${label}`,
        suit: color,
        rank: label,
        copies: 4,
        order: 100 - index,
        points,
      });
    }
  }
  return entries;
}

function createXiangqiEntries(): GenericCardEntryDef[] {
  const colors = ['red', 'black'];
  const pieces = [
    ['general', 'General', 1, 7],
    ['advisor', 'Advisor', 2, 6],
    ['elephant', 'Elephant', 2, 5],
    ['chariot', 'Chariot', 2, 4],
    ['horse', 'Horse', 2, 3],
    ['cannon', 'Cannon', 2, 2],
    ['soldier', 'Soldier', 5, 1],
  ] as const;
  const entries: GenericCardEntryDef[] = [];
  for (const color of colors) {
    for (const [index, [id, label, copies, points]] of pieces.entries()) {
      entries.push({
        id: `xiangqi_red_black_${color}_${id}`,
        label: `${capitalize(color)} ${label}`,
        suit: color,
        rank: label,
        copies,
        order: 100 - index,
        points,
      });
    }
  }
  return entries;
}

function createHolsDerGeierEntries(): GenericCardEntryDef[] {
  const setNames = ['set1', 'set2', 'set3', 'set4', 'set5'];
  const entries: GenericCardEntryDef[] = [];
  for (const setName of setNames) {
    for (let rank = 1; rank <= 15; rank++) {
      entries.push({
        id: `hols_der_geier_colors_${setName}_${rank}`,
        label: `${setName.toUpperCase()} ${rank}`,
        suit: setName,
        rank,
        order: rank,
        points: rank,
      });
    }
  }
  return entries;
}

function createNumbered104Entries(): GenericCardEntryDef[] {
  return Array.from({ length: 104 }, (_, index) => {
    const rank = index + 1;
    const padded = String(rank).padStart(3, '0');
    return {
      id: `numbered_104_${padded}`,
      label: String(rank),
      rank,
      order: rank,
      points: rank,
    };
  });
}

function createOkeyEntries(): GenericCardEntryDef[] {
  const colors = ['black', 'red', 'blue', 'orange'];
  const entries: GenericCardEntryDef[] = [];
  for (const color of colors) {
    for (let rank = 1; rank <= 13; rank++) {
      entries.push({
        id: `okey_${color}_${rank}`,
        label: `${capitalize(color)} ${rank}`,
        suit: color,
        rank,
        copies: 2,
        order: rank,
        points: rank,
      });
    }
  }
  entries.push({ id: 'okey_joker_1', label: 'False Joker 1', kind: 'joker', order: 1000 });
  entries.push({ id: 'okey_joker_2', label: 'False Joker 2', kind: 'joker', order: 1001 });
  return entries;
}

function createRookEntries(): GenericCardEntryDef[] {
  const colors = ['black', 'red', 'green', 'yellow'];
  const entries: GenericCardEntryDef[] = [];
  for (const color of colors) {
    for (let rank = 1; rank <= 14; rank++) {
      const points = rank === 1 ? 15 : rank === 14 || rank === 10 ? 10 : rank === 5 ? 5 : 0;
      entries.push({
        id: `rook_colors_${color}_${rank}`,
        label: `${capitalize(color)} ${rank}`,
        suit: color,
        rank,
        order: rank === 1 ? 100 : 100 - rank,
        points,
      });
    }
  }
  return entries;
}

function createTarot54Entries(): GenericCardEntryDef[] {
  const entries: GenericCardEntryDef[] = [];
  for (let trump = 1; trump <= 21; trump++) {
    entries.push({
      id: `tarot_trump_${trump}`,
      label: `Trump ${trump}`,
      order: trump,
      kind: 'trump',
      points: trump === 1 || trump === 21 ? 5 : 1,
    });
  }
  entries.push({
    id: 'tarot_fool',
    label: 'Fool',
    order: 22,
    kind: 'fool',
    points: 5,
  });

  const blackRanks = [
    [10, '10'],
    [9, '9'],
    [8, '8'],
    [7, '7'],
  ] as const;
  const redRanks = [
    [1, '1'],
    [2, '2'],
    [3, '3'],
    [4, '4'],
  ] as const;
  const courts = [
    [14, 'King', 5],
    [13, 'Queen', 4],
    [12, 'Cavalier', 3],
    [11, 'Jack', 2],
  ] as const;

  for (const suit of ['clubs', 'spades']) {
    for (const [value, label, points] of courts) {
      entries.push({
        id: `${value}_of_${suit}`,
        label: `${capitalize(suit)} ${label}`,
        suit,
        rank: value,
        order: 200 - value,
        points,
      });
    }
    for (const [value, label] of blackRanks) {
      entries.push({
        id: `${value}_of_${suit}`,
        label: `${capitalize(suit)} ${label}`,
        suit,
        rank: value,
        order: 200 - value,
        points: 1,
      });
    }
  }

  for (const suit of ['hearts', 'diamonds']) {
    for (const [value, label, points] of courts) {
      entries.push({
        id: `${value}_of_${suit}`,
        label: `${capitalize(suit)} ${label}`,
        suit,
        rank: value,
        order: 200 - value,
        points,
      });
    }
    for (const [value, label] of redRanks) {
      entries.push({
        id: `${value}_of_${suit}`,
        label: `${capitalize(suit)} ${label}`,
        suit,
        rank: value,
        order: 200 - value,
        points: 1,
      });
    }
  }
  return entries;
}

function createTaroccoBologneseEntries(): GenericCardEntryDef[] {
  const entries: GenericCardEntryDef[] = [];
  for (let trump = 0; trump <= 20; trump++) {
    entries.push({
      id: `italian_trump_${trump}`,
      label: `Trump ${trump}`,
      kind: 'trump',
      order: trump,
      points: trump === 0 || trump === 1 || trump === 20 ? 5 : 1,
    });
  }
  entries.push({
    id: 'italian_matto',
    label: 'Matto',
    kind: 'fool',
    order: 21,
    points: 5,
  });

  const suits = [
    ['coppe', 'Cups'],
    ['denari', 'Coins'],
    ['spade', 'Swords'],
    ['bastoni', 'Batons'],
  ] as const;
  const cards = [
    ['king', 'King', 5],
    ['queen', 'Queen', 4],
    ['cavalier', 'Cavalier', 3],
    ['jack', 'Jack', 2],
    ['10', '10', 1],
    ['9', '9', 1],
    ['8', '8', 1],
    ['7', '7', 1],
    ['6', '6', 1],
    ['1', 'Ace', 1],
  ] as const;

  for (const [suit, label] of suits) {
    for (const [rank, rankLabel, points] of cards) {
      entries.push({
        id: `italian_${suit}_${rank}`,
        label: `${label} ${rankLabel}`,
        suit,
        rank,
        order: 300,
        points,
      });
    }
  }
  return entries;
}

function createTaroccoSicilianoEntries(): GenericCardEntryDef[] {
  const entries: GenericCardEntryDef[] = [];
  for (let trump = 1; trump <= 20; trump++) {
    entries.push({
      id: `italian_trump_${trump}`,
      label: `Trump ${trump}`,
      kind: 'trump',
      order: trump,
      points: trump === 1 || (trump >= 16 && trump <= 20) ? 5 : 1,
    });
  }
  entries.push({ id: 'italian_miseria', label: 'Miseria', kind: 'trump', order: 0, points: 1 });
  entries.push({ id: 'italian_fuggitivo', label: 'Fuggitivo', kind: 'fool', order: 21, points: 10 });

  const baseSuits = [
    ['coppe', 'Cups'],
    ['bastoni', 'Batons'],
    ['spade', 'Swords'],
  ] as const;
  const baseCards = [
    ['king', 'King', 5],
    ['queen', 'Queen', 4],
    ['horse', 'Horse', 3],
    ['maid', 'Maid', 2],
    ['10', '10', 1],
    ['9', '9', 1],
    ['8', '8', 1],
    ['7', '7', 1],
    ['6', '6', 1],
    ['5', '5', 1],
  ] as const;
  for (const [suit, label] of baseSuits) {
    for (const [rank, rankLabel, points] of baseCards) {
      entries.push({
        id: `italian_${suit}_${rank}`,
        label: `${label} ${rankLabel}`,
        suit,
        rank,
        points,
      });
    }
  }

  const coinCards = [
    ...baseCards,
    ['4', '4', 1],
    ['ace', 'Ace', 1],
  ] as const;
  for (const [rank, rankLabel, points] of coinCards) {
    entries.push({
      id: `italian_denari_${rank}`,
      label: `Coins ${rankLabel}`,
      suit: 'denari',
      rank,
      points,
    });
  }
  return entries;
}

function createKhorolEntries(): GenericCardEntryDef[] {
  const tiles = [
    ['khorol', 'Khorol', 4],
    ['norov', 'Norov', 4],
    ['khas', 'Khas', 4],
    ['khangarid', 'Khangarid', 4],
    ['sengi', 'Sengi', 4],
    ['rat', 'Rat', 4],
    ['ox', 'Ox', 4],
    ['tiger', 'Tiger', 4],
    ['rabbit', 'Rabbit', 4],
    ['dragon', 'Dragon', 2],
    ['snake', 'Snake', 4],
    ['horse', 'Horse', 4],
    ['goat', 'Goat', 4],
    ['monkey', 'Monkey', 4],
    ['rooster', 'Rooster', 2],
    ['dog', 'Dog', 2],
    ['pig', 'Pig', 2],
  ] as const;
  return tiles.map(([id, label, copies], index) => ({
    id: `khorol_${id}`,
    label,
    copies,
    order: 100 - index,
    rank: label,
  }));
}

function createMoneySuited39Entries(): GenericCardEntryDef[] {
  const suits = [
    ['cash', 'Cash'],
    ['strings', 'Strings'],
    ['myriads', 'Myriads'],
    ['tens_of_myriads', 'Tens of Myriads'],
  ] as const;
  const entries: GenericCardEntryDef[] = [];
  for (const [suit, label] of suits) {
    for (let rank = 1; rank <= 9; rank++) {
      entries.push({
        id: `money_suited_${suit}_${rank}`,
        label: `${label} ${rank}`,
        suit,
        rank,
        order: rank,
      });
    }
  }
  entries.push({ id: 'money_suited_old_thousand', label: 'Old Thousand', kind: 'honor', order: 100 });
  entries.push({ id: 'money_suited_white_flower', label: 'White Flower', kind: 'honor', order: 101 });
  entries.push({ id: 'money_suited_red_flower', label: 'Red Flower', kind: 'honor', order: 102 });
  return entries;
}

function createMoneySuited38Entries(): GenericCardEntryDef[] {
  const suits = [
    ['sip', 'Sip'],
    ['gon', 'Gon'],
    ['sok', 'Sok'],
    ['chen', 'Chen'],
  ] as const;
  const entries: GenericCardEntryDef[] = [];
  for (const [suit, label] of suits) {
    for (let rank = 1; rank <= 9; rank++) {
      const specialLabel =
        suit === 'sip' && rank === 1
          ? 'Bak Chi'
          : suit === 'chen' && rank === 1
            ? 'Mau Gung'
            : `${label} ${rank}`;
      entries.push({
        id: `money_suited_${suit}_${rank}`,
        label: specialLabel,
        suit,
        rank,
        order: rank,
      });
    }
  }
  entries.push({ id: 'money_suited_li_fa', label: 'Li Fa', kind: 'honor', order: 100 });
  entries.push({ id: 'money_suited_li_chen', label: 'Li Chen', kind: 'honor', order: 101 });
  return entries;
}

function createGanjifaEntries(): GenericCardEntryDef[] {
  const suits = [
    ['gholam', 'Slaves'],
    ['taj', 'Crowns'],
    ['shamshir', 'Swords'],
    ['zar_e_sorkh', 'Red Gold Coins'],
    ['chang', 'Harps'],
    ['barat', 'Bills of Exchange'],
    ['zar_e_safid', 'White Gold Coins'],
    ['qomash', 'Cloth'],
  ] as const;
  const entries: GenericCardEntryDef[] = [];
  for (const [suit, label] of suits) {
    for (let rank = 1; rank <= 10; rank++) {
      entries.push({
        id: `ganjifa_${suit}_${rank}`,
        label: `${label} ${rank}`,
        suit,
        rank,
        order: rank,
      });
    }
    entries.push({
      id: `ganjifa_${suit}_vizier`,
      label: `${label} Vizier`,
      suit,
      rank: 'vizier',
      order: 11,
      kind: 'court',
    });
    entries.push({
      id: `ganjifa_${suit}_king`,
      label: `${label} King`,
      suit,
      rank: 'king',
      order: 12,
      kind: 'court',
    });
  }
  return entries;
}

function createWhotEntries(): GenericCardEntryDef[] {
  const suits: Array<[string, number[]]> = [
    ['circles', [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]],
    ['triangles', [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14]],
    ['crosses', [1, 2, 3, 5, 7, 10, 11, 13, 14]],
    ['squares', [1, 2, 3, 5, 7, 10, 11, 13, 14]],
    ['stars', [1, 2, 3, 4, 5, 7, 8]],
  ];
  const entries: GenericCardEntryDef[] = [];
  for (const [suit, numbers] of suits) {
    for (const number of numbers) {
      entries.push({
        id: `whot_${suit}_${number}`,
        label: `${capitalize(suit)} ${number}`,
        suit,
        rank: number,
        order: number,
        points: suit === 'stars' ? number * 2 : number,
      });
    }
  }
  for (let index = 1; index <= 5; index++) {
    entries.push({
      id: `whot_whot_20_${index}`,
      label: `Whot 20 #${index}`,
      kind: 'wild',
      order: 200 + index,
      points: 20,
    });
  }
  return entries;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function createMinimalCustomEntries(): GenericCardEntryDef[] {
  return [
    {
      id: 'custom_card_001',
      label: 'Custom Card 001',
      order: 1,
    },
  ];
}

function createTiddlywinkCompatibilityEntries(): GenericCardEntryDef[] {
  const entries: GenericCardEntryDef[] = [];
  for (const color of ['white', 'black']) {
    for (let index = 1; index <= 16; index++) {
      entries.push({
        id: `tiddlywink_colors_${color}_${String(index).padStart(2, '0')}`,
        label: `${capitalize(color)} Stone ${index}`,
        suit: color,
        rank: index,
        order: index,
      });
    }
  }
  return entries;
}

function main(): void {
  repairStandard52CardPool();
  repairStripped35Deck();

  const repeatedDecks: ExistingDeckCopyMigration[] = [
    { deckName: 'Double 24', copies: 2 },
    { deckName: 'Double 32', copies: 2 },
    { deckName: 'Double 52', copies: 2 },
    { deckName: 'Double 52 + 4 Jokers', copies: 2 },
    { deckName: 'Quad 36', copies: 4 },
    { deckName: 'Quad 40', copies: 4 },
    { deckName: 'Oct 40', copies: 8 },
    { deckName: 'Quad 52 + 8 Jokers', copies: 4 },
    { deckName: 'Triple 52 + 6 Jokers', copies: 3 },
  ];

  for (const deck of repeatedDecks) {
    migrateRepeatedFrenchDeck(deck);
  }

  const migrations: DeckMigration[] = [
    { deckName: 'Cego 38', deckFamily: 'Cego', rankingDeckType: 'Cego_38', entries: createCego38Entries() },
    { deckName: 'Custom', deckFamily: 'Custom', rankingDeckType: 'Custom', entries: createMinimalCustomEntries() },
    { deckName: 'Four Color 112', deckFamily: 'Four_color', rankingDeckType: 'Four_color_pieces', entries: createFourColorEntries() },
    { deckName: 'Ganjifa', deckFamily: 'Ganjifa', rankingDeckType: 'Ganjifa', entries: createGanjifaEntries() },
    { deckName: 'Gnav 42', deckFamily: 'Gnav', rankingDeckType: 'Gnav_ranks', entries: createGnavEntries() },
    { deckName: 'Goita 32', deckFamily: 'Goita', rankingDeckType: 'Goita_pieces', entries: createGoitaEntries() },
    { deckName: 'Hols der Geier 75', deckFamily: 'Hols_der_Geier_colors', rankingDeckType: 'Hols_der_Geier_1_15', entries: createHolsDerGeierEntries() },
    { deckName: 'Khorol 60', deckFamily: 'Khorol', rankingDeckType: 'Khorol', entries: createKhorolEntries() },
    { deckName: 'Money-suited 38', deckFamily: 'Money-suited', rankingDeckType: 'Money-suited', entries: createMoneySuited38Entries() },
    { deckName: 'Money-suited 39', deckFamily: 'Money-suited', rankingDeckType: 'Money-suited', entries: createMoneySuited39Entries() },
    { deckName: 'Numbered 104', deckFamily: 'Numbered_104', rankingDeckType: 'Numbered_1_104', entries: createNumbered104Entries() },
    { deckName: 'Okey 106', deckFamily: 'Okey', rankingDeckType: 'Okey', entries: createOkeyEntries() },
    { deckName: 'Rook 56', deckFamily: 'Rook_colors', rankingDeckType: 'Rook_1_14', entries: createRookEntries() },
    { deckName: 'Tarocco Bolognese 62', deckFamily: 'Italian', rankingDeckType: 'Tarocco_Bolognese_62', entries: createTaroccoBologneseEntries() },
    { deckName: 'Tarocco Siciliano 64', deckFamily: 'Italian', rankingDeckType: 'Tarocco_Sicilian_64', entries: createTaroccoSicilianoEntries() },
    { deckName: 'Tarot 54', deckFamily: 'Tarot_minor', rankingDeckType: 'Tarot_54', entries: createTarot54Entries() },
    { deckName: 'Tiddlywink', deckFamily: 'Tiddlywink_colors', rankingDeckType: 'Tiddlywink_pieces', entries: createTiddlywinkCompatibilityEntries() },
    { deckName: 'Whot 54', deckFamily: 'Whot', rankingDeckType: 'Whot', entries: createWhotEntries() },
    { deckName: 'Xiangqi 32', deckFamily: 'Xiangqi_red_black', rankingDeckType: 'Xiangqi_pieces', entries: createXiangqiEntries() },
  ];

  for (const migration of migrations) {
    migrateGenericDeck(migration);
  }

  process.stdout.write(
    JSON.stringify(
      {
        migratedRepeatedDecks: repeatedDecks.map((deck) => deck.deckName),
        migratedExplicitDecks: migrations.map((deck) => deck.deckName),
      },
      null,
      2,
    ) + '\n',
  );
}

main();
