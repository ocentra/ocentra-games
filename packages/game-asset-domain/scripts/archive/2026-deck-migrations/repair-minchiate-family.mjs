import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');
const CARD_GAMES_ROOT = path.join(REPO_ROOT, 'packages', 'asset-editor', 'Resources', 'GameMode', 'CardGames');
const DECKS_DIR = path.join(CARD_GAMES_ROOT, 'Decks');
const RANKINGS_DIR = path.join(CARD_GAMES_ROOT, 'CardRanking');
const CARDS_DIR = path.join(CARD_GAMES_ROOT, 'Cards');

const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const SUITS = ['cups', 'coins', 'swords', 'batons'];
const SUIT_LABELS = {
  cups: 'Cups',
  coins: 'Coins',
  swords: 'Swords',
  batons: 'Batons',
};
const MINOR_RANKS = [
  { key: '1', label: 'Ace', points: 1 },
  { key: '2', label: 'Two', points: 1 },
  { key: '3', label: 'Three', points: 1 },
  { key: '4', label: 'Four', points: 1 },
  { key: '5', label: 'Five', points: 1 },
  { key: '6', label: 'Six', points: 1 },
  { key: '7', label: 'Seven', points: 1 },
  { key: '8', label: 'Eight', points: 1 },
  { key: '9', label: 'Nine', points: 1 },
  { key: '10', label: 'Ten', points: 1 },
  { key: 'jack', label: 'Jack', points: 2 },
  { key: 'knight', label: 'Knight', points: 3 },
  { key: 'queen', label: 'Queen', points: 4 },
  { key: 'king', label: 'King', points: 5 },
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function newGuid() {
  return crypto.randomUUID();
}

function treePathFor(filePath) {
  return path.relative(path.join(REPO_ROOT, 'packages', 'asset-editor'), filePath).replaceAll(path.sep, '/');
}

function createResourceEntry(filePath) {
  const asset = readJson(filePath);
  return {
    path: treePathFor(filePath),
    guid: asset.system.guid,
    assetType: asset.system.assetType,
    displayName: asset.system.displayName,
    resourceEntryType: 'AssetResourceEntry',
    variant: asset.system.variant ?? null,
    category: asset.system.category ?? 'Game',
  };
}

function createAsset(filePath, assetType, displayName, variant, parentPath, data) {
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  writeJson(filePath, {
    system: {
      guid: newGuid(),
      assetType,
      schemaVersion: 1,
      displayName,
      category: 'Game',
      icon: '🃏',
      variant,
      parentPath,
      treePath: treePathFor(filePath),
    },
    data,
  });

  return filePath;
}

function buildMinchiateEntries() {
  const entries = [];

  for (let trump = 1; trump <= 40; trump++) {
    entries.push({
      id: `minchiate_trump_${trump}`,
      label: `Trump ${trump}`,
      order: entries.length,
      points: trump >= 35 ? 5 : 1,
      kind: 'trump',
    });
  }

  entries.push({
    id: 'minchiate_fool',
    label: 'Fool',
    order: entries.length,
    points: 5,
    kind: 'fool',
  });

  for (const suit of SUITS) {
    for (const rank of MINOR_RANKS) {
      entries.push({
        id: `minchiate_${suit}_${rank.key}`,
        label: `${rank.label} of ${SUIT_LABELS[suit]}`,
        suit,
        rank: rank.key,
        order: entries.length,
        points: rank.points,
        kind: 'minor',
      });
    }
  }

  return entries;
}

function main() {
  const rankingEntries = buildMinchiateEntries();
  const rankingPath = createAsset(
    path.join(RANKINGS_DIR, 'Minchiate_97.asset'),
    'CardRanking',
    'Minchiate_97',
    'Minchiate_97',
    'Resources/GameMode/CardGames/CardRanking',
    {
      deckType: 'Minchiate 97',
      expectedCardCount: 97,
      includesJokers: false,
      backCardCount: 1,
      deckFamily: 'Minchiate',
      cardEntries: rankingEntries.map((entry) => ({
        id: entry.id,
        copies: 1,
        label: entry.label,
        suit: entry.suit ?? null,
        rank: entry.rank ?? null,
        order: entry.order,
        points: entry.points,
        kind: entry.kind,
      })),
    },
  );

  const rankingRef = createResourceEntry(rankingPath);
  const cardFolderName = 'Minchiate 97';
  const cardPaths = rankingEntries.map((entry) =>
    createAsset(
      path.join(CARDS_DIR, cardFolderName, `${entry.id}.asset`),
      'Card',
      entry.id,
      entry.id,
      `Resources/GameMode/CardGames/Cards/${cardFolderName}`,
      {
        pieceKind: 'Card',
        cardIdentity: {
          family: 'Minchiate',
          id: entry.id,
        },
        imageHash: ZERO_HASH,
        cardId: entry.id,
        cardRankingAsset: rankingRef,
      },
    ),
  );

  createAsset(
    path.join(DECKS_DIR, 'Minchiate 97.asset'),
    'Deck',
    'Minchiate 97',
    'Minchiate 97',
    'Resources/GameMode/CardGames/Decks',
    {
      name: 'Minchiate 97',
      supportedTriples: [
        {
          deckType: 'Minchiate 97',
          suitSet: 'Minchiate',
          rankSet: 'Minchiate_97',
        },
      ],
      cardTemplates: cardPaths.map((cardPath) => createResourceEntry(cardPath)),
      cardRankingAsset: rankingRef,
      imageSourceFolderPath: 'Resources/GameMode/CardGames/Images',
      cardOutputPath: `Resources/GameMode/CardGames/Cards/${cardFolderName}`,
      backCardSourceFolderPath: 'Resources/GameMode/CardGames/Images/Extras',
      backCardHash: '',
      cardComposition: [],
    },
  );

  process.stdout.write('Minchiate 97 family repaired.\n');
}

main();
