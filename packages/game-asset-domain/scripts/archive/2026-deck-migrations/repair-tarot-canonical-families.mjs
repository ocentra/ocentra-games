#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');
const ASSET_EDITOR = path.join(ROOT, 'packages/asset-editor');
const CARD_GAMES = path.join(ASSET_EDITOR, 'Resources/GameMode/CardGames');
const DECKS = path.join(CARD_GAMES, 'Decks');
const CARD_RANKINGS = path.join(CARD_GAMES, 'CardRanking');
const CARDS = path.join(CARD_GAMES, 'Cards');
const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const CARD_ICON = '\uD83C\uDCCF';

function deterministicGuid(seed) {
  const hex = crypto.createHash('sha1').update(seed).digest('hex').slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function toResourcePath(absolutePath) {
  return path.relative(ASSET_EDITOR, absolutePath).replaceAll(path.sep, '/');
}

function toTreePath(absolutePath) {
  return toResourcePath(absolutePath);
}

function toParentPath(absolutePath) {
  return path.dirname(toTreePath(absolutePath)).replaceAll(path.sep, '/');
}

function createSystem(assetType, displayName, absolutePath, variant) {
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

function createResourceEntry(filePath, assetType, displayName) {
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function deckFilePath(assetName) {
  return path.join(DECKS, `${assetName}.asset`);
}

function rankingFilePath(fileName) {
  return path.join(CARD_RANKINGS, fileName);
}

function cardFolderPath(folderName) {
  return path.join(CARDS, folderName);
}

function loadDeckDefaults(assetName) {
  const filePath = deckFilePath(assetName);
  if (!fs.existsSync(filePath)) {
    return {
      imageSourceFolderPath: 'Resources/GameMode/CardGames/Images',
      backCardSourceFolderPath: 'Resources/GameMode/CardGames/Images/Extras',
      backCardHash: '',
    };
  }

  const asset = readJson(filePath);
  return {
    imageSourceFolderPath: asset.data?.imageSourceFolderPath ?? 'Resources/GameMode/CardGames/Images',
    backCardSourceFolderPath: asset.data?.backCardSourceFolderPath ?? 'Resources/GameMode/CardGames/Images/Extras',
    backCardHash: asset.data?.backCardHash ?? '',
  };
}

function tarotIdentity(cardId) {
  if (cardId === 'tarot_fool') {
    return { family: 'Tarot', kind: 'fool' };
  }

  const trumpMatch = /^tarot_trump_(\d+)$/.exec(cardId);
  if (trumpMatch) {
    return { family: 'Tarot', kind: 'trump', number: Number(trumpMatch[1]) };
  }

  const minorMatch = /^(\d+)_of_([a-z_]+)$/.exec(cardId);
  if (!minorMatch) {
    throw new Error(`Unsupported tarot card id ${cardId}`);
  }

  return {
    family: 'Tarot',
    kind: 'minor',
    value: Number(minorMatch[1]),
    suit: minorMatch[2],
  };
}

function ensureTarotCard(folderName, cardId, rankingFileName) {
  const rankingPath = rankingFilePath(rankingFileName);
  const cardPath = path.join(cardFolderPath(folderName), `${cardId}.asset`);
  const existing = fs.existsSync(cardPath) ? readJson(cardPath) : null;
  const imageHash = existing?.data?.imageHash ?? ZERO_HASH;

  writeJson(cardPath, {
    system: createSystem('Card', cardId, cardPath, cardId),
    data: {
      pieceKind: 'Card',
      cardIdentity: tarotIdentity(cardId),
      imageHash,
      cardId,
      cardRankingAsset: createResourceEntry(
        rankingPath,
        'CardRanking',
        path.basename(rankingPath, '.asset'),
      ),
    },
  });

  return createResourceEntry(cardPath, 'Card', cardId);
}

function getRankingCardIds(rankingFileName) {
  const ranking = readJson(rankingFilePath(rankingFileName));
  return (ranking.data?.cardEntries ?? []).map((entry) => entry.id);
}

function writeCanonicalDeckAsset(assetName, rankingFileName, supportedTriples, defaultsAssetName = assetName) {
  const defaults = loadDeckDefaults(defaultsAssetName);
  const rankingPath = rankingFilePath(rankingFileName);
  const ids = getRankingCardIds(rankingFileName);
  const refs = ids.map((id) => ensureTarotCard(assetName, id, rankingFileName));
  const filePath = deckFilePath(assetName);

  writeJson(filePath, {
    system: createSystem('Deck', assetName, filePath, assetName),
    data: {
      name: assetName,
      supportedTriples,
      cardTemplates: refs,
      cardComposition: [],
      cardRankingAsset: createResourceEntry(
        rankingPath,
        'CardRanking',
        path.basename(rankingPath, '.asset'),
      ),
      imageSourceFolderPath: defaults.imageSourceFolderPath,
      cardOutputPath: `Resources/GameMode/CardGames/Cards/${assetName}`,
      backCardSourceFolderPath: defaults.backCardSourceFolderPath,
      backCardHash: defaults.backCardHash,
    },
  });
}

function writeCompositionDeckFromCanonical(assetName, rankingFileName, canonicalFolderName, supportedTriples, defaultsAssetName = assetName) {
  const defaults = loadDeckDefaults(defaultsAssetName);
  const rankingPath = rankingFilePath(rankingFileName);
  const ids = getRankingCardIds(rankingFileName);
  const composition = ids.map((id) => ({
    cardTemplate: createResourceEntry(
      path.join(cardFolderPath(canonicalFolderName), `${id}.asset`),
      'Card',
      id,
    ),
    copies: 1,
  }));
  const filePath = deckFilePath(assetName);

  writeJson(filePath, {
    system: createSystem('Deck', assetName, filePath, assetName),
    data: {
      name: assetName,
      supportedTriples,
      cardTemplates: [],
      cardComposition: composition,
      cardRankingAsset: createResourceEntry(
        rankingPath,
        'CardRanking',
        path.basename(rankingPath, '.asset'),
      ),
      imageSourceFolderPath: defaults.imageSourceFolderPath,
      cardOutputPath: `Resources/GameMode/CardGames/Cards/${assetName}`,
      backCardSourceFolderPath: defaults.backCardSourceFolderPath,
      backCardHash: defaults.backCardHash,
    },
  });
}

function main() {
  writeCanonicalDeckAsset(
    'Tarot 54',
    'Industrie_und_Glueck_Tarot_54.asset',
    [{ deckType: 'Tarot 54', suitSet: 'Industrie_und_Glueck', rankSet: 'Tarot_54' }],
    'Tarot 42',
  );

  writeCompositionDeckFromCanonical(
    'Tarot 42',
    'Industrie_und_Glueck_Tarot_42.asset',
    'Tarot 54',
    [{ deckType: 'Tarot 42', suitSet: 'Industrie_und_Glueck', rankSet: 'Tarot_42' }],
  );

  writeCompositionDeckFromCanonical(
    'Tarot 40',
    'Industrie_und_Glueck_Tarot_40.asset',
    'Tarot 54',
    [{ deckType: 'Tarot 40', suitSet: 'Industrie_und_Glueck', rankSet: 'Tarot_40' }],
  );

  writeCanonicalDeckAsset(
    'Tarot 78 (Tarocco Piemontese)',
    'Tarocco_Piemontese_Tarot_78.asset',
    [{ deckType: 'Tarot 78', suitSet: 'Tarocco_Piemontese', rankSet: 'Tarot_78' }],
    'Tarot 62 (Tarocco Piemontese)',
  );

  writeCompositionDeckFromCanonical(
    'Tarot 62 (Tarocco Piemontese)',
    'Tarocco_Piemontese_Tarot_62.asset',
    'Tarot 78 (Tarocco Piemontese)',
    [{ deckType: 'Tarot 62', suitSet: 'Tarocco_Piemontese', rankSet: 'Tarot_62' }],
  );
}

main();
