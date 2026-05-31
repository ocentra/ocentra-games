import {
  COMMERCIAL_DECK_FAMILY_SET,
  COMMERCIAL_DECK_TYPE_SET,
} from '@ocentra/game-domain/deck/commercialDeckTypes';

type AssetRefLike = {
  path?: string;
  displayName?: string;
};

type SupportedTripleLike = {
  deckType?: string;
  suitSet?: string;
  rankSet?: string;
};

type AssetDataLike = {
  supportedTriples?: SupportedTripleLike[];
  deckType?: string;
  deckFamily?: string;
  cardRankingAsset?: AssetRefLike;
  rankingAsset?: AssetRefLike;
  commercialPlaceholderOnly?: boolean;
};

const COMMERCIAL_DECK_RESOURCE_PATHS = new Set([
  'GameMode/CardGames/Decks/Rook 56.asset',
  'GameMode/CardGames/Decks/Whot 54.asset',
]);

const COMMERCIAL_RANKING_RESOURCE_PATHS = new Set([
  'GameMode/CardGames/CardRanking/rook_56.asset',
  'GameMode/CardGames/CardRanking/Rook_colors_Rook_1_14.asset',
  'GameMode/CardGames/CardRanking/whot_54.asset',
]);

const COMMERCIAL_CARD_RESOURCE_PREFIXES = [
  'GameMode/CardGames/Cards/Rook/',
  'GameMode/CardGames/Cards/Whot 54/',
];

function normalizeAssetResourcePath(value: string): string {
  return value
    .replaceAll('\\', '/')
    .replace(/^[A-Za-z]:\//, '')
    .replace(/^asset-editor\/Resources\//, '')
    .replace(/^packages\/asset-editor\/Resources\//, '')
    .replace(/^Resources\//, '');
}

function getAssetRefPath(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return '';
  }
  const pathValue = (value as AssetRefLike).path;
  return typeof pathValue === 'string' ? normalizeAssetResourcePath(pathValue) : '';
}

function matchesCommercialResourcePath(resourcePath: string): boolean {
  if (COMMERCIAL_DECK_RESOURCE_PATHS.has(resourcePath)) {
    return true;
  }
  if (COMMERCIAL_RANKING_RESOURCE_PATHS.has(resourcePath)) {
    return true;
  }
  return COMMERCIAL_CARD_RESOURCE_PREFIXES.some((prefix) => resourcePath.startsWith(prefix));
}

function isCommercialPlaceholderOnly(assetData: unknown): boolean {
  return Boolean(
    assetData &&
    typeof assetData === 'object' &&
    (assetData as AssetDataLike).commercialPlaceholderOnly === true,
  );
}

export function getCommercialAssetViolation(
  relativeOrResourcePath: string,
  assetType?: string,
  assetData?: unknown,
): string | null {
  const resourcePath = normalizeAssetResourcePath(relativeOrResourcePath);
  if (!assetData) {
    return null;
  }

  if (matchesCommercialResourcePath(resourcePath) && !isCommercialPlaceholderOnly(assetData)) {
    return `commercial asset "${resourcePath}" must not exist in Resources`;
  }

  if (typeof assetData !== 'object') {
    return null;
  }

  const data = assetData as AssetDataLike;

  if (assetType === 'Deck') {
    const supportedTriples = Array.isArray(data.supportedTriples) ? data.supportedTriples : [];
    const commercialTriple = supportedTriples.find(
      (triple) =>
        COMMERCIAL_DECK_TYPE_SET.has(String(triple?.deckType ?? '')) ||
        COMMERCIAL_DECK_FAMILY_SET.has(String(triple?.suitSet ?? '')),
    );
    if (commercialTriple && !isCommercialPlaceholderOnly(data)) {
      return `commercial deck triple "${commercialTriple.deckType ?? 'unknown'}/${commercialTriple.suitSet ?? 'unknown'}/${commercialTriple.rankSet ?? 'unknown'}" must not have a deck asset`;
    }
    return null;
  }

  if (assetType === 'DeckRanking' || assetType === 'CardRanking') {
    const deckType = String(data.deckType ?? '');
    const deckFamily = String(data.deckFamily ?? '');
    if ((COMMERCIAL_DECK_TYPE_SET.has(deckType) || COMMERCIAL_DECK_FAMILY_SET.has(deckFamily)) && !isCommercialPlaceholderOnly(data)) {
      return `commercial deck ranking "${deckFamily || deckType || resourcePath}" must not exist in Resources`;
    }
    return null;
  }

  if (assetType === 'Card' || assetType === 'PlayingCard') {
    const rankingPath = getAssetRefPath(data.rankingAsset ?? data.cardRankingAsset);
    if (COMMERCIAL_RANKING_RESOURCE_PATHS.has(rankingPath) && !isCommercialPlaceholderOnly(data)) {
      return `commercial card asset "${resourcePath}" must not point to commercial ranking "${rankingPath}"`;
    }
  }

  return null;
}
