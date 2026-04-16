import type { GameHome } from '@ocentra/game-asset-domain/schemas/game-home-schema';
import type {
  ContentBlock,
  GameInfo,
  HistoryContent,
  PageSection,
  SetupContent,
  VariationsContent,
} from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';
import type { Game, GameDetail, GameMetadata, GameSummary } from '../types';
import { SECTIONS } from '../types';

interface GameEntryLike {
  path: string;
  gameId?: string | null;
  displayName?: string | null;
}

type DetailBucketKey = 'overview' | 'history' | 'setup' | 'rules' | 'strategy' | 'variations';

interface DetailBuckets {
  overview: string[];
  history: string[];
  setup: string[];
  rules: string[];
  strategy: string[];
  variations: string[];
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqueParts(parts: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const text = cleanText(part);
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    out.push(text);
  }
  return out;
}

function joinParagraphs(parts: Array<string | null | undefined>): string {
  return uniqueParts(parts).join('\n\n');
}

function joinLines(parts: Array<string | null | undefined>): string {
  return uniqueParts(parts).join('\n');
}

function formatPlayersRange(minPlayers?: number | null, maxPlayers?: number | null): string {
  if (typeof minPlayers !== 'number' || Number.isNaN(minPlayers) || minPlayers <= 0) {
    return '';
  }
  if (typeof maxPlayers !== 'number' || Number.isNaN(maxPlayers) || maxPlayers <= 0) {
    return String(minPlayers);
  }
  return minPlayers === maxPlayers ? String(minPlayers) : `${minPlayers}-${maxPlayers}`;
}

function getBucketKey(sectionType: string | undefined): DetailBucketKey {
  switch ((sectionType ?? '').toLowerCase()) {
    case 'history':
      return 'history';
    case 'setup':
      return 'setup';
    case 'rules':
    case 'scoring':
      return 'rules';
    case 'strategy':
      return 'strategy';
    case 'variations':
      return 'variations';
    case 'about':
    case 'overview':
    default:
      return 'overview';
  }
}

function extractContentText(gameInfo: GameInfo, content: ContentBlock[] | undefined): string {
  if (!Array.isArray(content) || content.length === 0) {
    return '';
  }
  return cleanText(gameInfo.extractTextContent(content));
}

function extractSectionText(gameInfo: GameInfo, section: PageSection): string {
  const parts: string[] = [];
  if (section.title) {
    parts.push(section.title);
  }
  if (section.subtitle) {
    parts.push(section.subtitle);
  }

  if (typeof section.content === 'string') {
    const text = cleanText(section.content);
    if (text) {
      parts.push(text);
    }
  }

  if (Array.isArray(section.pages)) {
    for (const page of section.pages) {
      if (page.title) {
        parts.push(page.title);
      }
      if (page.subtitle) {
        parts.push(page.subtitle);
      }
      const text = extractContentText(gameInfo, page.content);
      if (text) {
        parts.push(text);
      }
    }
  }

  return joinParagraphs(parts);
}

function collectDetailBuckets(gameInfo: GameInfo | null): DetailBuckets {
  const buckets: DetailBuckets = {
    overview: [],
    history: [],
    setup: [],
    rules: [],
    strategy: [],
    variations: [],
  };

  if (!gameInfo) {
    return buckets;
  }

  for (const section of gameInfo.sections ?? []) {
    const text = extractSectionText(gameInfo, section);
    if (!text) {
      continue;
    }
    buckets[getBucketKey(section.type)]!.push(text);
  }

  return buckets;
}

function formatVariations(content: VariationsContent | null | undefined, fallbackText: string): string {
  if (content?.list?.length) {
    return content.list
      .map((item) => joinParagraphs([item.name, item.description]))
      .filter((text) => text.length > 0)
      .join('\n\n');
  }

  const noVariations = cleanText(content?.noVariationsReason);
  return noVariations || fallbackText || 'No documented variations yet.';
}

function buildOverviewDescription(
  gameInfo: GameInfo | null,
  overviewText: string,
  fallbackDescription = ''
): string {
  if (!gameInfo) {
    return joinParagraphs([fallbackDescription, overviewText]);
  }

  return joinParagraphs([
    fallbackDescription,
    gameInfo.description,
    gameInfo.shortDescription,
    gameInfo.tagline,
    gameInfo.tagline2,
    overviewText,
  ]);
}

function buildPlayersLabel(gameInfo: GameInfo | null, home: GameHome): string {
  const playersDisplay = cleanText(gameInfo?.playersDisplay);
  if (playersDisplay) {
    return playersDisplay;
  }

  const homePlayers = cleanText(home.playersDisplay);
  if (homePlayers) {
    return homePlayers;
  }

  const range = formatPlayersRange(gameInfo?.minPlayers ?? home.minPlayers, gameInfo?.maxPlayers ?? home.maxPlayers);
  return range;
}

function buildSummaryDescription(
  gameInfo: GameInfo | null,
  overviewText: string,
  fallbackDescription = ''
): string {
  return buildOverviewDescription(gameInfo, overviewText, fallbackDescription);
}

export function buildGameSummary(
  entry: GameEntryLike,
  home: GameHome,
  gameInfo: GameInfo | null
): GameSummary {
  const buckets = collectDetailBuckets(gameInfo);
  const players = buildPlayersLabel(gameInfo, home);
  const description = buildSummaryDescription(gameInfo, buckets.overview.join('\n\n'), home.description ?? '');
  const category = cleanText(home.gameCategory) || cleanText(gameInfo?.gameCategory) || undefined;
  const subcategory = cleanText(home.subcategory) || cleanText(gameInfo?.subcategory) || null;
  const quality = cleanText(home.quality) || cleanText(gameInfo?.quality) || 'placeholder';
  const completeness = home.completeness ?? gameInfo?.completeness ?? {};
  const alsoKnownAs = uniqueParts(gameInfo?.alsoKnownAs ?? []);

  return {
    slug: cleanText(home.gameId) || cleanText(entry.gameId) || cleanText(entry.displayName) || entry.path,
    file: entry.path,
    name: cleanText(home.name) || cleanText(gameInfo?.hero?.title) || cleanText(entry.displayName) || entry.path,
    quality,
    completeness,
    description,
    origin: cleanText(gameInfo?.origin),
    players,
    deck: cleanText(home.deck) || cleanText(gameInfo?.deck),
    difficulty: cleanText(home.difficulty) || cleanText(gameInfo?.difficulty),
    duration: cleanText(home.duration) || cleanText(gameInfo?.duration),
    alsoKnownAs: alsoKnownAs,
    category,
    subcategory,
    player_mode: cleanText(gameInfo?.playerMode) || null,
    file_exists: true,
    link_valid: 'asset',
    guid: home.guid,
    source: 'asset' as const,
  };
}

export function buildGameDetail(home: GameHome | null, gameInfo: GameInfo | null): GameDetail {
  const buckets = collectDetailBuckets(gameInfo);
  const overviewDescription = buildOverviewDescription(gameInfo, buckets.overview.join('\n\n'), home?.description ?? '');
  const players = buildPlayersLabel(gameInfo, home ?? ({} as GameHome));
  const deck = cleanText(gameInfo?.deck) || cleanText(home?.deck);
  const difficulty = cleanText(gameInfo?.difficulty) || cleanText(home?.difficulty);
  const duration = cleanText(gameInfo?.duration) || cleanText(home?.duration);
  const historyContent: HistoryContent | string | undefined =
    gameInfo?.historyContent
      ? {
          ...gameInfo.historyContent,
          origins: cleanText(gameInfo.historyContent.origins) || cleanText(gameInfo.origin) || gameInfo.historyContent.origins,
        }
      : cleanText(gameInfo?.origin)
        ? { origins: cleanText(gameInfo?.origin) }
        : joinLines(buckets.history) || 'No history notes recorded yet.';
  const setupContent: SetupContent | string | undefined =
    gameInfo?.setupContent
      ? {
          ...gameInfo.setupContent,
          players: cleanText(gameInfo.setupContent.players) || players,
          deck: cleanText(gameInfo.setupContent.deck) || deck,
        }
      : {
          players,
          deck,
        };
  const rulesText = joinLines(buckets.rules) || 'No rules content yet.';
  const strategyText = joinLines(buckets.strategy) || 'No strategy content yet.';
  const variationsText = formatVariations(gameInfo?.variationsContent ?? null, joinLines(buckets.variations));
  const alsoKnownAs = uniqueParts(gameInfo?.alsoKnownAs ?? []);

  return {
    filename: cleanText(gameInfo?.routePath) || cleanText(gameInfo?.hero?.title) || cleanText(home?.gameId),
    name: cleanText(gameInfo?.hero?.title) || cleanText(home?.name) || '',
    guid: home?.guid ?? (gameInfo as unknown as { guid?: { toString(): string } })?.guid?.toString() ?? '',
    completeness: gameInfo?.completeness ?? home?.completeness ?? {},
    quality: cleanText(gameInfo?.quality) || cleanText(home?.quality) || 'placeholder',
    source: 'asset',
    overview: {
      description: overviewDescription,
      type: cleanText(gameInfo?.gameCategory) || cleanText(home?.gameCategory) || undefined,
      origin: cleanText(gameInfo?.origin),
      players,
      deck,
      difficulty,
      duration,
    },
    history: historyContent,
    setup: setupContent,
    rules: rulesText,
    strategy: strategyText,
    variations: variationsText,
    ai: gameInfo?.aiContent ?? undefined,
    sources: gameInfo?.sourcesContent ?? undefined,
    cursorFind: alsoKnownAs.length > 0 ? { alsoKnownAs } : undefined,
  };
}

export function buildGameMetadata(games: Game[]): GameMetadata {
  const categoryCounts: Record<string, number> = {};
  const sectionStats: Record<string, { complete: number; percentage: number }> = {};

  for (const section of SECTIONS) {
    sectionStats[section] = { complete: 0, percentage: 0 };
  }

  let complete = 0;
  let partial = 0;
  let placeholder = 0;

  for (const game of games) {
    const category = game.category || 'Other';
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;

    if (game.quality === 'complete') {
      complete += 1;
    } else if (game.quality === 'partial') {
      partial += 1;
    } else {
      placeholder += 1;
    }

    for (const section of SECTIONS) {
      if (game.completeness[section]) {
        sectionStats[section]!.complete += 1;
      }
    }
  }

  const total = games.length;
  for (const section of SECTIONS) {
    sectionStats[section]!.percentage = total > 0 ? Math.round((sectionStats[section]!.complete / total) * 100) : 0;
  }

  return {
    generatedAt: new Date().toISOString(),
    totalGames: total,
    stats: { complete, partial, placeholder },
    sectionStats,
    categoryCounts,
  };
}
