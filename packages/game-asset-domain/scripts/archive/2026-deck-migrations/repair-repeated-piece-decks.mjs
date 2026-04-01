import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSON5 from 'json5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESOURCES_DIR = path.resolve(__dirname, '../../asset-editor/Resources/GameMode/CardGames');
const DECKS_DIR = path.join(RESOURCES_DIR, 'Decks');
const CARDS_DIR = path.join(RESOURCES_DIR, 'Cards');

const SIMPLE_NORMALIZATION_TARGETS = [
  {
    deckFile: 'Okey 106.asset',
    duplicateFolder: 'Okey 106',
    canonicalFolder: 'Okey',
  },
  {
    deckFile: 'Four Color 112.asset',
    duplicateFolder: 'Four Color 112',
    canonicalFolder: 'Four Color',
  },
  {
    deckFile: 'Gnav 42.asset',
    duplicateFolder: 'Gnav 42',
    canonicalFolder: 'Gnav',
  },
  {
    deckFile: 'Goita 32.asset',
    duplicateFolder: 'Goita 32',
    canonicalFolder: 'Goita',
  },
  {
    deckFile: 'Xiangqi 32.asset',
    duplicateFolder: 'Xiangqi 32',
    canonicalFolder: 'Xiangqi',
  },
  {
    deckFile: 'Rook 56.asset',
    duplicateFolder: 'Rook 56',
    canonicalFolder: 'Rook',
  },
  {
    deckFile: 'Hols der Geier 75.asset',
    duplicateFolder: 'Hols der Geier 75',
    canonicalFolder: 'Hols der Geier',
  },
  {
    deckFile: 'Quad 36.asset',
    duplicateFolder: 'Quad 36',
    canonicalFolder: 'Standard 52 + Joker(s)',
  },
  {
    deckFile: 'Quad 40.asset',
    duplicateFolder: 'Quad 40',
    canonicalFolder: 'Standard 52 + Joker(s)',
  },
  {
    deckFile: 'Oct 40.asset',
    duplicateFolder: 'Oct 40',
    canonicalFolder: 'Standard 52 + Joker(s)',
  },
  {
    deckFile: 'Double 24.asset',
    duplicateFolder: 'Double 24',
    canonicalFolder: 'Standard 52 + Joker(s)',
  },
  {
    deckFile: 'Double 32.asset',
    duplicateFolder: 'Double 32',
    canonicalFolder: 'Standard 52 + Joker(s)',
  },
  {
    deckFile: 'Double 52 + 4 Jokers.asset',
    duplicateFolder: 'Double 52 + 4 Jokers',
    canonicalFolder: 'Standard 52 + Joker(s)',
  },
  {
    deckFile: 'Triple 52 + 6 Jokers.asset',
    duplicateFolder: 'Triple 52 + 6 Jokers',
    canonicalFolder: 'Standard 52 + Joker(s)',
  },
  {
    deckFile: 'Quad 52 + 8 Jokers.asset',
    duplicateFolder: 'Quad 52 + 8 Jokers',
    canonicalFolder: 'Standard 52 + Joker(s)',
  },
  {
    deckFile: 'Treikort 27.asset',
    duplicateFolder: 'Treikort 27',
    canonicalFolder: 'Standard 52 + Joker(s)',
  },
  {
    deckFile: 'Double 24 (German).asset',
    duplicateFolder: 'Double 24 (German)',
    canonicalFolder: 'Standard 52 + Joker(s) (German)',
  },
  {
    deckFile: 'Double 32 (German).asset',
    duplicateFolder: 'Double 32 (German)',
    canonicalFolder: 'Standard 52 + Joker(s) (German)',
  },
  {
    deckFile: 'Money-suited 39.asset',
    duplicateFolder: 'Money-suited 39',
    canonicalFolder: 'Money-suited',
  },
];

const HYBRID_NORMALIZATION_TARGETS = [
  {
    deckFile: '500 deck 63.asset',
    localFolder: '500 deck 63',
    sharedFolder: 'Standard 52 + Joker(s)',
  },
];

function readAsset(filePath) {
  return JSON5.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeAsset(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function buildVariantCountsFromRanking(deckJson) {
  const rankingPath = String(deckJson?.data?.cardRankingAsset?.path ?? '').trim();
  if (!rankingPath) {
    return { counts: new Map(), order: [] };
  }

  const normalizedRankingPath = rankingPath.replace(/^Resources\/GameMode\/CardGames\//, '');
  const rankingFile = path.join(RESOURCES_DIR, normalizedRankingPath);
  if (!fs.existsSync(rankingFile)) {
    return { counts: new Map(), order: [] };
  }

  const rankingJson = readAsset(rankingFile);
  const cardEntries = Array.isArray(rankingJson?.data?.cardEntries) ? rankingJson.data.cardEntries : [];
  const counts = new Map();
  const order = [];

  for (const entry of cardEntries) {
    const variant = String(entry?.id ?? '').trim();
    if (!variant) {
      continue;
    }
    order.push(variant);
    counts.set(variant, Math.max(1, Number(entry?.copies ?? 1)));
  }

  return { counts, order };
}

function buildCanonicalCardRef(canonicalFolder, variant) {
  const cardFile = path.join(CARDS_DIR, canonicalFolder, `${variant}.asset`);
  if (!fs.existsSync(cardFile)) {
    throw new Error(`Missing canonical card asset: ${cardFile}`);
  }

  const cardJson = readAsset(cardFile);
  return {
    path: `Resources/GameMode/CardGames/Cards/${canonicalFolder}/${variant}.asset`,
    displayName: String(cardJson.system?.displayName ?? variant),
    gameId: null,
    category: 'Game',
    mimeType: 'application/json',
    fileSize: Buffer.byteLength(fs.readFileSync(cardFile, 'utf8')),
    resourceEntryType: 'AssetResourceEntry',
    guid: String(cardJson.system?.guid ?? ''),
    assetType: 'Card',
    variant: String(cardJson.system?.variant ?? variant),
  };
}

function collectVariantCounts(deckJson) {
  const counts = new Map();
  const order = [];

  const cardTemplates = Array.isArray(deckJson?.data?.cardTemplates) ? deckJson.data.cardTemplates : [];
  const cardComposition = Array.isArray(deckJson?.data?.cardComposition) ? deckJson.data.cardComposition : [];

  for (const ref of cardTemplates) {
    const variant = String(ref?.variant ?? ref?.displayName ?? '').trim();
    if (!variant) {
      throw new Error('Encountered card template without variant/displayName');
    }
    if (!counts.has(variant)) {
      order.push(variant);
    }
    counts.set(variant, (counts.get(variant) ?? 0) + 1);
  }

  if (counts.size > 0) {
    return { counts, order };
  }

  for (const entry of cardComposition) {
    const variant = String(entry?.cardTemplate?.variant ?? entry?.cardTemplate?.displayName ?? '').trim();
    if (!variant) {
      throw new Error('Encountered card composition entry without variant/displayName');
    }
    if (!counts.has(variant)) {
      order.push(variant);
    }
    counts.set(variant, Math.max(1, Number(entry?.copies ?? 1)));
  }

  if (counts.size > 0) {
    return { counts, order };
  }

  return buildVariantCountsFromRanking(deckJson);
}

function ensureVariantCounts(deckJson) {
  const { counts, order } = collectVariantCounts(deckJson);
  if (counts.size === 0 || order.length === 0) {
    throw new Error(`Unable to derive variant counts for ${deckJson?.system?.displayName ?? 'unknown deck'}`);
  }
  return { counts, order };
}

function normalizeDeck(target) {
  const deckPath = path.join(DECKS_DIR, target.deckFile);
  const deckJson = readAsset(deckPath);
  const { counts, order } = ensureVariantCounts(deckJson);

  deckJson.data.cardTemplates = [];
  deckJson.data.cardComposition = order.map((variant) => ({
    cardTemplate: buildCanonicalCardRef(target.canonicalFolder, variant),
    copies: counts.get(variant),
  }));
  deckJson.data.cardOutputPath = `Resources/GameMode/CardGames/Cards/${target.canonicalFolder}`;

  writeAsset(deckPath, deckJson);

  const duplicateFolderPath = path.join(CARDS_DIR, target.duplicateFolder);
  if (fs.existsSync(duplicateFolderPath)) {
    fs.rmSync(duplicateFolderPath, { recursive: true, force: true });
  }
}

function listAssetVariants(folderName) {
  const folderPath = path.join(CARDS_DIR, folderName);
  if (!fs.existsSync(folderPath)) {
    return new Set();
  }

  return new Set(
    fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.asset'))
      .map((entry) => entry.name.replace(/\.asset$/i, '')),
  );
}

function normalizeHybridDeck(target) {
  const deckPath = path.join(DECKS_DIR, target.deckFile);
  const deckJson = readAsset(deckPath);
  const { counts, order } = ensureVariantCounts(deckJson);
  const sharedVariants = listAssetVariants(target.sharedFolder);

  deckJson.data.cardTemplates = [];
  deckJson.data.cardComposition = order.map((variant) => {
    const folderName = sharedVariants.has(variant) ? target.sharedFolder : target.localFolder;
    return {
      cardTemplate: buildCanonicalCardRef(folderName, variant),
      copies: counts.get(variant),
    };
  });
  deckJson.data.cardOutputPath = `Resources/GameMode/CardGames/Cards/${target.localFolder}`;

  writeAsset(deckPath, deckJson);

  const localFolderPath = path.join(CARDS_DIR, target.localFolder);
  if (!fs.existsSync(localFolderPath)) {
    return;
  }

  for (const variant of order) {
    if (!sharedVariants.has(variant)) {
      continue;
    }
    const duplicateFile = path.join(localFolderPath, `${variant}.asset`);
    if (fs.existsSync(duplicateFile)) {
      fs.rmSync(duplicateFile, { force: true });
    }
  }
}

for (const target of SIMPLE_NORMALIZATION_TARGETS) {
  normalizeDeck(target);
}

for (const target of HYBRID_NORMALIZATION_TARGETS) {
  normalizeHybridDeck(target);
}

process.stdout.write(
  JSON.stringify(
    {
      normalizedDecks: [
        ...SIMPLE_NORMALIZATION_TARGETS.map((target) => target.deckFile),
        ...HYBRID_NORMALIZATION_TARGETS.map((target) => target.deckFile),
      ],
      removedDuplicateCardFolders: SIMPLE_NORMALIZATION_TARGETS.map((target) => target.duplicateFolder),
      hybridSharedReuseDecks: HYBRID_NORMALIZATION_TARGETS.map((target) => target.deckFile),
    },
    null,
    2,
  ) + '\n',
);
