import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSON5 from 'json5';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESOURCES_DIR = path.resolve(__dirname, '../../asset-editor/Resources/GameMode/CardGames');
const DECKS_DIR = path.join(RESOURCES_DIR, 'Decks');
const CARD_RANKING_DIR = path.join(RESOURCES_DIR, 'CardRanking');
const CARDS_DIR = path.join(RESOURCES_DIR, 'Cards');

function readAsset(filePath) {
  return JSON5.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeAsset(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function buildAssetRef(filePath, assetType) {
  const json = readAsset(filePath);
  return {
    path: `Resources/GameMode/CardGames/${path.relative(RESOURCES_DIR, filePath).replaceAll('\\', '/')}`,
    guid: String(json.system?.guid ?? ''),
    assetType,
    displayName: String(json.system?.displayName ?? ''),
    resourceEntryType: 'AssetResourceEntry',
    variant: String(json.system?.variant ?? ''),
    category: 'Game',
  };
}

function normalizeKhorol() {
  const khorolDeckPath = path.join(DECKS_DIR, 'Khorol 60.asset');
  const khorolDeck = readAsset(khorolDeckPath);
  const khorolRankingPath = path.join(CARD_RANKING_DIR, 'khorol_60.asset');
  const khorolRanking = readAsset(khorolRankingPath);
  const khorolRankingRef = buildAssetRef(khorolRankingPath, 'CardRanking');
  const canonicalFolder = path.join(CARDS_DIR, 'Khorol');
  const duplicateFolder = path.join(CARDS_DIR, 'Khorol 60');

  for (const entry of fs.readdirSync(canonicalFolder, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.asset')) {
      continue;
    }
    const cardPath = path.join(canonicalFolder, entry.name);
    const cardJson = readAsset(cardPath);
    cardJson.data.cardRankingAsset = khorolRankingRef;
    writeAsset(cardPath, cardJson);
  }

  const variantCounts = new Map();
  for (const entry of khorolRanking.data?.cardEntries ?? []) {
    const variant = String(entry?.id ?? '').trim();
    if (!variant) {
      throw new Error('khorol_60 cardEntries contains an entry without id');
    }
    variantCounts.set(variant, Math.max(1, Number(entry?.copies ?? 1)));
  }

  khorolDeck.data.cardTemplates = [];
  khorolDeck.data.cardComposition = Array.from(variantCounts.entries()).map(([variant, copies]) => ({
    cardTemplate: buildAssetRef(path.join(canonicalFolder, `${variant}.asset`), 'Card'),
    copies,
  }));
  khorolDeck.data.cardOutputPath = 'Resources/GameMode/CardGames/Cards/Khorol';
  writeAsset(khorolDeckPath, khorolDeck);

  if (fs.existsSync(duplicateFolder)) {
    fs.rmSync(duplicateFolder, { recursive: true, force: true });
  }

  const legacyRankingPath = path.join(CARD_RANKING_DIR, 'Khorol_Khorol.asset');
  if (fs.existsSync(legacyRankingPath)) {
    fs.rmSync(legacyRankingPath, { force: true });
  }
}

function normalizeHanafudaDeck(deckFileName) {
  const deckPath = path.join(DECKS_DIR, deckFileName);
  const deckJson = readAsset(deckPath);
  const canonicalFolder = path.join(CARDS_DIR, 'Hanafuda 52');

  deckJson.data.cardTemplates = (deckJson.data.cardTemplates ?? []).map((ref) => {
    const variant = String(ref?.variant ?? ref?.displayName ?? '').trim();
    if (!variant) {
      throw new Error('Hanafuda 48 cardTemplates contains a card without variant/displayName');
    }
    return buildAssetRef(path.join(canonicalFolder, `${variant}.asset`), 'HanafudaCard');
  });

  writeAsset(deckPath, deckJson);
}

function normalizeHanafuda48() {
  normalizeHanafudaDeck('Hanafuda 48.asset');
  normalizeHanafudaDeck('Hanafuda 48 (Snow).asset');

  const duplicateFolder = path.join(CARDS_DIR, 'Hanafuda 48');
  if (fs.existsSync(duplicateFolder)) {
    fs.rmSync(duplicateFolder, { recursive: true, force: true });
  }
}

function removeDeadItalianFolder() {
  const italianFolder = path.join(CARDS_DIR, 'Italian');
  if (fs.existsSync(italianFolder)) {
    fs.rmSync(italianFolder, { recursive: true, force: true });
  }
}

normalizeKhorol();
normalizeHanafuda48();
removeDeadItalianFolder();

process.stdout.write(
  JSON.stringify(
    {
      normalizedDecks: ['Khorol 60.asset', 'Hanafuda 48.asset', 'Hanafuda 48 (Snow).asset'],
      removedFolders: ['Cards/Khorol 60', 'Cards/Hanafuda 48', 'Cards/Italian'],
      removedRankingAssets: ['CardRanking/Khorol_Khorol.asset'],
    },
    null,
    2,
  ) + '\n',
);
