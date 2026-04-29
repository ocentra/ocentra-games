import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { asAssetType } from '@ocentra/asset-domain/types/assetType';
import type { CardRanking } from '@ocentra/game-asset-domain/card/cardRanking/CardRanking';
import type { Deck } from '@ocentra/game-asset-domain/card/deck/Deck';

const STANDARD_52_DECK_GUID = '991b75fe-271a-4e16-99bf-02e4651a60fd';
const STANDARD_52_CARD_RANKING_GUID = 'c9ffcf9a-4917-c61d-ce71-d709e878c0ff';
const STANDARD_52_DECK_PATH = 'Resources/GameMode/CardGames/Decks/Standard_52.asset';
const STANDARD_52_CARD_RANKING_PATH = 'Resources/GameMode/CardGames/CardRanking/StandardCardRanking.asset';
const STANDARD_52_CARD_RANKING_CHECKSUM = 'dd91c70d1df02a74fae33680ee708604284ae85c2743ace2e45a379c65437064';
const STANDARD_52_CARD_RANKING_FILE_SIZE = 9386;

export function createStandard52DeckEntry(): AssetResourceEntry<Deck> {
  const entry = AssetResourceEntry.fromGuid<Deck>(
    STANDARD_52_DECK_GUID,
    asAssetType('Deck'),
    'Standard 52',
  );
  entry.path = STANDARD_52_DECK_PATH;
  entry.category = 'Game';
  entry.variant = 'Standard52';
  entry.mimeType = 'application/json';
  return entry;
}

export function createStandard52CardRankingEntry(): AssetResourceEntry<CardRanking> {
  const entry = AssetResourceEntry.fromGuid<CardRanking>(
    STANDARD_52_CARD_RANKING_GUID,
    asAssetType('CardRanking'),
    'StandardCardRanking',
  );
  entry.path = STANDARD_52_CARD_RANKING_PATH;
  entry.category = 'Game';
  entry.variant = 'StandardCardRanking';
  entry.mimeType = 'application/json';
  entry.fileSize = STANDARD_52_CARD_RANKING_FILE_SIZE;
  return entry;
}

export function createStandard52CardRankingReference(): Record<string, unknown> {
  return {
    path: STANDARD_52_CARD_RANKING_PATH,
    guid: STANDARD_52_CARD_RANKING_GUID,
    assetType: 'CardRanking',
    displayName: 'StandardCardRanking',
    resourceEntryType: 'AssetResourceEntry',
    variant: 'StandardCardRanking',
    category: 'Game',
    mimeType: 'application/json',
    fileSize: STANDARD_52_CARD_RANKING_FILE_SIZE,
    checksum: STANDARD_52_CARD_RANKING_CHECKSUM,
  };
}
