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

const MISSING_GENERIC_FAMILIES = [
  {
    displayName: 'Tehonbiki 48',
    deckType: 'Tehonbiki 48',
    suitSet: 'Tehonbiki',
    rankSet: 'Tehonbiki',
    deckFamily: 'Tehonbiki',
    count: 48,
    cardPrefix: 'tehonbiki_48',
    rankingFile: 'tehonbiki_48.asset',
    folderName: 'Tehonbiki 48',
  },
  {
    displayName: 'Khanhoo 30',
    deckType: 'Khanhoo 30',
    suitSet: 'Khanhoo',
    rankSet: 'Khanhoo',
    deckFamily: 'Khanhoo',
    count: 30,
    cardPrefix: 'khanhoo_30',
    rankingFile: 'khanhoo_30.asset',
    folderName: 'Khanhoo 30',
  },
  {
    displayName: 'Madiao 40',
    deckType: 'Madiao 40',
    suitSet: 'Madiao',
    rankSet: 'Madiao',
    deckFamily: 'Madiao',
    count: 40,
    cardPrefix: 'madiao_40',
    rankingFile: 'madiao_40.asset',
    folderName: 'Madiao 40',
  },
];

const PLAYING_CARD_TRIPLE_REPAIRS = [
  {
    deckFile: 'Iroha Karuta 96.asset',
    deckType: 'Iroha Karuta 96',
    suitSet: 'Iroha_karuta',
    rankSet: 'Iroha_karuta',
  },
  {
    deckFile: 'Ceki 60.asset',
    deckType: 'Ceki 60',
    suitSet: 'Ceki',
    rankSet: 'Ceki',
  },
  {
    deckFile: 'Bai_choi 33.asset',
    deckType: 'Bai_choi 33',
    suitSet: 'Bai_choi',
    rankSet: 'Bai_choi',
  },
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

function repairPlayingCardDeckTriple({ deckFile, deckType, suitSet, rankSet }) {
  const filePath = path.join(DECKS_DIR, deckFile);
  if (!fs.existsSync(filePath)) {
    return;
  }

  const asset = readJson(filePath);
  asset.data.supportedTriples = [
    {
      deckType,
      suitSet,
      rankSet,
    },
  ];
  writeJson(filePath, asset);
}

function buildEntries(prefix, count) {
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(3, '0');
    const id = `${prefix}_${number}`;
    return {
      id,
      label: id,
      order: index,
      kind: 'piece',
    };
  });
}

function createGenericFamily(definition) {
  const entries = buildEntries(definition.cardPrefix, definition.count);

  const rankingPath = createAsset(
    path.join(RANKINGS_DIR, definition.rankingFile),
    'CardRanking',
    definition.rankSet,
    definition.rankSet,
    'Resources/GameMode/CardGames/CardRanking',
    {
      deckType: definition.deckType,
      expectedCardCount: definition.count,
      includesJokers: false,
      backCardCount: 1,
      deckFamily: definition.deckFamily,
      cardEntries: entries.map((entry) => ({
        id: entry.id,
        copies: 1,
        label: entry.label,
        suit: null,
        rank: null,
        order: entry.order,
        points: null,
        kind: entry.kind,
      })),
    },
  );

  const rankingRef = createResourceEntry(rankingPath);

  const cardPaths = entries.map((entry) =>
    createAsset(
      path.join(CARDS_DIR, definition.folderName, `${entry.id}.asset`),
      'Card',
      entry.id,
      entry.id,
      `Resources/GameMode/CardGames/Cards/${definition.folderName}`,
      {
        pieceKind: 'Card',
        cardIdentity: {
          family: definition.deckFamily,
          id: entry.id,
        },
        imageHash: ZERO_HASH,
        cardId: entry.id,
        cardRankingAsset: rankingRef,
      },
    ),
  );

  createAsset(
    path.join(DECKS_DIR, `${definition.displayName}.asset`),
    'Deck',
    definition.displayName,
    definition.displayName,
    'Resources/GameMode/CardGames/Decks',
    {
      name: definition.displayName,
      supportedTriples: [
        {
          deckType: definition.deckType,
          suitSet: definition.suitSet,
          rankSet: definition.rankSet,
        },
      ],
      cardTemplates: cardPaths.map((cardPath) => createResourceEntry(cardPath)),
      cardRankingAsset: rankingRef,
      imageSourceFolderPath: 'Resources/GameMode/CardGames/Images',
      cardOutputPath: `Resources/GameMode/CardGames/Cards/${definition.folderName}`,
      backCardSourceFolderPath: 'Resources/GameMode/CardGames/Images/Extras',
      backCardHash: '',
      cardComposition: [],
    },
  );
}

function main() {
  for (const repair of PLAYING_CARD_TRIPLE_REPAIRS) {
    repairPlayingCardDeckTriple(repair);
  }

  for (const family of MISSING_GENERIC_FAMILIES) {
    createGenericFamily(family);
  }

  process.stdout.write('Missing card-family assets repaired.\n');
}

main();
