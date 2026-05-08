import {
  PublicRouteKey,
  PublicRoutePath,
  PublicRoutePrivacy,
  PublicRouteSegment,
  buildPublicGameLeaderboardPath,
  buildPublicGameLobbyPath,
  buildPublicGameMatchmakingPath,
  buildPublicGamePath,
  buildPublicGamePlayPath,
  buildPublicTournamentDetailPath,
} from '@ocentra/endpoint-domain/constants/public-routes';

export const DEFAULT_SEO_SITE_ORIGIN = 'https://ocentra.games';

export type SeoRobots = 'index,follow' | 'noindex,follow' | 'noindex,nofollow';

export interface SeoStructuredData {
  [key: string]: unknown;
}

export interface SeoGameEntry {
  gameId: string;
  legacyGameToken?: string;
  name: string;
  description: string;
  genre: string;
}

export interface RouteSeoMetadata {
  routeKey: string;
  title: string;
  description: string;
  canonicalPath: string;
  canonicalUrl: string;
  robots: SeoRobots;
  privacy: PublicRoutePrivacy;
  pageLayoutAssetPath?: string;
  structuredData: SeoStructuredData[];
}

export interface SitemapEntry {
  path: string;
  priority: string;
  changefreq: string;
  lastmod?: string;
}

const pageLayoutAssetPath = {
  home: 'Resources/Pages/HomePageLayout.asset',
  gameCatalog: 'Resources/Pages/GameCatalogPageLayout.asset',
  selectedGame: 'Resources/Pages/SelectedGameLayout.asset',
  shop: 'Resources/Pages/ShopPageLayout.asset',
  competition: 'Resources/Pages/CompetitionPageLayout.asset',
  tournaments: 'Resources/Pages/TournamentsPageLayout.asset',
  tournamentDetail: 'Resources/Pages/TournamentDetailPageLayout.asset',
  leaderboard: 'Resources/Pages/LeaderboardPageLayout.asset',
  gameLeaderboard: 'Resources/Pages/GameLeaderboardPageLayout.asset',
  aiBenchmarkLeaderboard: 'Resources/Pages/AiBenchmarkLeaderboardPageLayout.asset',
  lobby: 'Resources/Pages/LobbyPageLayout.asset',
  matchmaking: 'Resources/Pages/MatchmakingPageLayout.asset',
  settings: 'Resources/Pages/SettingsPageLayout.asset',
  social: 'Resources/Pages/SocialPageLayout.asset',
  playerHub: 'Resources/Pages/PlayerHubPageLayout.asset',
  admin: 'Resources/Pages/AdminPageLayout.asset',
} as const;

export const seoGameCatalog: readonly SeoGameEntry[] = [
  {
    gameId: 'claim',
    legacyGameToken: 'claim:ddc6d965-14a7-4586-8a15-674e0daf8b5c',
    name: 'Claim',
    description: 'Claim is a tactical four-player card game about declarations, stock timing, debt, and aggressive showdown decisions.',
    genre: 'Card game',
  },
  {
    gameId: 'briscola',
    name: 'Briscola',
    description: 'Briscola is an Italian trick-taking card game adapted for the Ocentra game catalog.',
    genre: 'Trick-taking card game',
  },
  {
    gameId: 'three-card-brag',
    name: 'Three Card Brag',
    description: 'Three Card Brag is a compact card game centered on betting pressure and short-hand comparison.',
    genre: 'Betting card game',
  },
] as const satisfies readonly SeoGameEntry[];

const staticPageMetadata = {
  [PublicRoutePath[PublicRouteKey.Home]]: {
    routeKey: PublicRouteKey.Home,
    title: 'Ocentra Games | AI Card Games And Verifiable Play',
    description: 'Play Ocentra card games, browse playable pilots, and compare AI gameplay systems in one SVG-authored game platform.',
    canonicalPath: PublicRoutePath[PublicRouteKey.Home],
    privacy: PublicRoutePrivacy.Indexable,
    pageLayoutAssetPath: pageLayoutAssetPath.home,
  },
  [PublicRoutePath[PublicRouteKey.GamesCatalog]]: {
    routeKey: PublicRouteKey.GamesCatalog,
    title: 'Games Catalog | Ocentra Games',
    description: 'Browse the Ocentra games catalog across card games and future non-card games.',
    canonicalPath: PublicRoutePath[PublicRouteKey.GamesCatalog],
    privacy: PublicRoutePrivacy.Indexable,
    pageLayoutAssetPath: pageLayoutAssetPath.gameCatalog,
  },
  [PublicRoutePath[PublicRouteKey.CardGamesCatalog]]: {
    routeKey: PublicRouteKey.CardGamesCatalog,
    title: 'Card Games Catalog | Ocentra Games',
    description: 'Explore Ocentra card games, playable pilots, rules, mechanics, and SVG-authored game pages.',
    canonicalPath: PublicRoutePath[PublicRouteKey.CardGamesCatalog],
    privacy: PublicRoutePrivacy.Indexable,
    pageLayoutAssetPath: pageLayoutAssetPath.gameCatalog,
  },
  [PublicRoutePath[PublicRouteKey.LegacyCardGamesExplorer]]: {
    routeKey: PublicRouteKey.LegacyCardGamesExplorer,
    title: 'Card Games Catalog | Ocentra Games',
    description: 'Legacy card-games explorer route for the Ocentra card games catalog.',
    canonicalPath: PublicRoutePath[PublicRouteKey.CardGamesCatalog],
    privacy: PublicRoutePrivacy.Alias,
    pageLayoutAssetPath: pageLayoutAssetPath.gameCatalog,
  },
  [PublicRoutePath[PublicRouteKey.Shop]]: {
    routeKey: PublicRouteKey.Shop,
    title: 'Shop | Ocentra Games',
    description: 'Browse Ocentra shop offers, vault items, and account-linked game economy surfaces.',
    canonicalPath: PublicRoutePath[PublicRouteKey.Shop],
    privacy: PublicRoutePrivacy.Indexable,
    pageLayoutAssetPath: pageLayoutAssetPath.shop,
  },
  [PublicRoutePath[PublicRouteKey.Competition]]: {
    routeKey: PublicRouteKey.Competition,
    title: 'Competition | Ocentra Games',
    description: 'Track Ocentra competitions, tournament paths, leaderboard formats, and AI benchmarking surfaces.',
    canonicalPath: PublicRoutePath[PublicRouteKey.Competition],
    privacy: PublicRoutePrivacy.Indexable,
    pageLayoutAssetPath: pageLayoutAssetPath.competition,
  },
  [PublicRoutePath[PublicRouteKey.Tournaments]]: {
    routeKey: PublicRouteKey.Tournaments,
    title: 'Tournaments | Ocentra Games',
    description: 'Follow Ocentra tournament schedules, seasonal competition formats, eligibility, and prize tracks.',
    canonicalPath: PublicRoutePath[PublicRouteKey.Tournaments],
    privacy: PublicRoutePrivacy.Indexable,
    pageLayoutAssetPath: pageLayoutAssetPath.tournaments,
  },
  [PublicRoutePath[PublicRouteKey.Leaderboard]]: {
    routeKey: PublicRouteKey.Leaderboard,
    title: 'Leaderboard | Ocentra Games',
    description: 'View the overall Ocentra leaderboard across supported games and competitive score tracks.',
    canonicalPath: PublicRoutePath[PublicRouteKey.Leaderboard],
    privacy: PublicRoutePrivacy.Indexable,
    pageLayoutAssetPath: pageLayoutAssetPath.leaderboard,
  },
  [PublicRoutePath[PublicRouteKey.AiBenchmarkLeaderboard]]: {
    routeKey: PublicRouteKey.AiBenchmarkLeaderboard,
    title: 'AI Benchmark Leaderboard | Ocentra Games',
    description: 'Compare AI-versus-AI model benchmark performance across Ocentra game simulations.',
    canonicalPath: PublicRoutePath[PublicRouteKey.AiBenchmarkLeaderboard],
    privacy: PublicRoutePrivacy.Indexable,
    pageLayoutAssetPath: pageLayoutAssetPath.aiBenchmarkLeaderboard,
  },
  [PublicRoutePath[PublicRouteKey.Social]]: {
    routeKey: PublicRouteKey.Social,
    title: 'Social | Ocentra Games',
    description: 'Account-only social features for friends, parties, messages, and player notifications.',
    canonicalPath: PublicRoutePath[PublicRouteKey.Social],
    privacy: PublicRoutePrivacy.Private,
    pageLayoutAssetPath: pageLayoutAssetPath.social,
  },
  [PublicRoutePath[PublicRouteKey.PlayerHub]]: {
    routeKey: PublicRouteKey.PlayerHub,
    title: 'Player Hub | Ocentra Games',
    description: 'Account-only player profile, inventory, and progression hub.',
    canonicalPath: PublicRoutePath[PublicRouteKey.PlayerHub],
    privacy: PublicRoutePrivacy.Private,
    pageLayoutAssetPath: pageLayoutAssetPath.playerHub,
  },
  [PublicRoutePath[PublicRouteKey.Settings]]: {
    routeKey: PublicRouteKey.Settings,
    title: 'Settings | Ocentra Games',
    description: 'Private player settings for local runtime, account, model, and asset delivery preferences.',
    canonicalPath: PublicRoutePath[PublicRouteKey.Settings],
    privacy: PublicRoutePrivacy.Private,
    pageLayoutAssetPath: pageLayoutAssetPath.settings,
  },
  [PublicRoutePath[PublicRouteKey.Lobby]]: {
    routeKey: PublicRouteKey.Lobby,
    title: 'Lobby | Ocentra Games',
    description: 'Private lobby route for creating and joining multiplayer game rooms.',
    canonicalPath: PublicRoutePath[PublicRouteKey.Lobby],
    privacy: PublicRoutePrivacy.Private,
    pageLayoutAssetPath: pageLayoutAssetPath.lobby,
  },
  [PublicRoutePath[PublicRouteKey.Matchmaking]]: {
    routeKey: PublicRouteKey.Matchmaking,
    title: 'Matchmaking | Ocentra Games',
    description: 'Private matchmaking route for queueing into supported Ocentra games.',
    canonicalPath: PublicRoutePath[PublicRouteKey.Matchmaking],
    privacy: PublicRoutePrivacy.Private,
    pageLayoutAssetPath: pageLayoutAssetPath.matchmaking,
  },
} as const;

function normalizeSiteOrigin(siteOrigin?: string): string {
  const candidate = siteOrigin?.trim() || DEFAULT_SEO_SITE_ORIGIN;
  try {
    const parsed = new URL(candidate);
    return parsed.origin;
  } catch {
    return DEFAULT_SEO_SITE_ORIGIN;
  }
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function normalizePathname(inputPathname: string): string {
  const pathname = inputPathname || '/';
  const pathOnly = pathname.split('?')[0]?.split('#')[0] || '/';
  if (pathOnly === '/') {
    return '/';
  }
  return `/${pathOnly.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

function getSegments(pathname: string): string[] {
  return normalizePathname(pathname)
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map(decodePathSegment);
}

function absoluteUrl(siteOrigin: string, pathName: string): string {
  return `${normalizeSiteOrigin(siteOrigin)}${pathName === '/' ? '/' : normalizePathname(pathName)}`;
}

function robotsForPrivacy(privacy: PublicRoutePrivacy): SeoRobots {
  if (privacy === PublicRoutePrivacy.Indexable) {
    return 'index,follow';
  }
  if (privacy === PublicRoutePrivacy.Alias) {
    return 'noindex,follow';
  }
  return 'noindex,nofollow';
}

function cleanGameId(gameId: string): string {
  return decodePathSegment(gameId).split(':')[0] || gameId;
}

function titleCaseGameId(gameId: string): string {
  return cleanGameId(gameId)
    .split('-')
    .filter(Boolean)
    .map(part => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function findGame(gameId: string): SeoGameEntry {
  const normalized = cleanGameId(gameId);
  return seoGameCatalog.find(game => game.gameId === normalized || game.legacyGameToken === gameId) ?? {
    gameId: normalized,
    name: titleCaseGameId(normalized),
    description: `${titleCaseGameId(normalized)} game page on Ocentra Games.`,
    genre: 'Game',
  };
}

function structuredWebsite(siteOrigin: string): SeoStructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Ocentra Games',
    url: absoluteUrl(siteOrigin, '/'),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${absoluteUrl(siteOrigin, PublicRoutePath[PublicRouteKey.GamesCatalog])}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

function structuredCollection(siteOrigin: string, pathName: string, name: string): SeoStructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: absoluteUrl(siteOrigin, pathName),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: seoGameCatalog.map((game, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(siteOrigin, buildPublicGamePath(game.gameId)),
        name: game.name,
      })),
    },
  };
}

function structuredGame(siteOrigin: string, game: SeoGameEntry): SeoStructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.name,
    description: game.description,
    genre: game.genre,
    url: absoluteUrl(siteOrigin, buildPublicGamePath(game.gameId)),
    gamePlatform: 'Web browser',
  };
}

function structuredLeaderboard(siteOrigin: string, pathName: string, name: string): SeoStructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: absoluteUrl(siteOrigin, pathName),
  };
}

function structuredTournament(siteOrigin: string, pathName: string, title: string): SeoStructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: title,
    url: absoluteUrl(siteOrigin, pathName),
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
  };
}

function completeMetadata(
  siteOrigin: string,
  metadata: Omit<RouteSeoMetadata, 'canonicalUrl' | 'robots' | 'structuredData'> & {
    structuredData?: SeoStructuredData[];
  },
): RouteSeoMetadata {
  return {
    ...metadata,
    canonicalPath: normalizePathname(metadata.canonicalPath),
    canonicalUrl: absoluteUrl(siteOrigin, metadata.canonicalPath),
    robots: robotsForPrivacy(metadata.privacy),
    structuredData: metadata.structuredData ?? [],
  };
}

function resolveStaticMetadata(pathname: string, siteOrigin: string): RouteSeoMetadata | null {
  const normalizedPathname = normalizePathname(pathname);
  const metadata = staticPageMetadata[normalizedPathname as keyof typeof staticPageMetadata];
  if (!metadata) {
    return null;
  }
  const structuredData =
    metadata.routeKey === PublicRouteKey.Home
      ? [structuredWebsite(siteOrigin)]
      : metadata.routeKey === PublicRouteKey.GamesCatalog || metadata.routeKey === PublicRouteKey.CardGamesCatalog
        ? [structuredCollection(siteOrigin, metadata.canonicalPath, metadata.title)]
        : metadata.routeKey === PublicRouteKey.Leaderboard || metadata.routeKey === PublicRouteKey.AiBenchmarkLeaderboard
          ? [structuredLeaderboard(siteOrigin, metadata.canonicalPath, metadata.title)]
          : metadata.routeKey === PublicRouteKey.Tournaments
            ? [structuredTournament(siteOrigin, metadata.canonicalPath, metadata.title)]
            : [];
  return completeMetadata(siteOrigin, { ...metadata, structuredData });
}

export function resolveSeoMetadata(pathname: string, siteOriginInput?: string): RouteSeoMetadata {
  const siteOrigin = normalizeSiteOrigin(siteOriginInput);
  const normalizedPathname = normalizePathname(pathname);
  const segments = getSegments(normalizedPathname);
  const [first, second, third] = segments;
  const staticMetadata = resolveStaticMetadata(normalizedPathname, siteOrigin);
  if (staticMetadata) {
    return staticMetadata;
  }

  if (first === PublicRouteSegment.Games && second) {
    if (second === PublicRouteSegment.CardGame && third === PublicRouteSegment.Template) {
      return completeMetadata(siteOrigin, {
        routeKey: PublicRouteKey.CardGameTemplate,
        title: 'Card Game Template | Ocentra Games',
        description: 'Development-only card game template route.',
        canonicalPath: PublicRoutePath[PublicRouteKey.CardGameTemplate],
        privacy: PublicRoutePrivacy.DevOnly,
      });
    }
    const game = findGame(second);
    if (third === PublicRouteSegment.Play) {
      return completeMetadata(siteOrigin, {
        routeKey: PublicRouteKey.GamePlay,
        title: `${game.name} Play | Ocentra Games`,
        description: `Private playable ${game.name} session route on Ocentra Games.`,
        canonicalPath: buildPublicGamePlayPath(game.gameId),
        privacy: PublicRoutePrivacy.Private,
      });
    }
    if (third === PublicRouteSegment.Lobby) {
      return completeMetadata(siteOrigin, {
        routeKey: PublicRouteKey.GameLobby,
        title: `${game.name} Lobby | Ocentra Games`,
        description: `Private ${game.name} lobby route on Ocentra Games.`,
        canonicalPath: buildPublicGameLobbyPath(game.gameId),
        privacy: PublicRoutePrivacy.Private,
        pageLayoutAssetPath: pageLayoutAssetPath.lobby,
      });
    }
    if (third === PublicRouteSegment.Matchmaking) {
      return completeMetadata(siteOrigin, {
        routeKey: PublicRouteKey.GameMatchmaking,
        title: `${game.name} Matchmaking | Ocentra Games`,
        description: `Private ${game.name} matchmaking route on Ocentra Games.`,
        canonicalPath: buildPublicGameMatchmakingPath(game.gameId),
        privacy: PublicRoutePrivacy.Private,
        pageLayoutAssetPath: pageLayoutAssetPath.matchmaking,
      });
    }
    if (third === PublicRouteSegment.Leaderboard) {
      return completeMetadata(siteOrigin, {
        routeKey: PublicRouteKey.GameLeaderboard,
        title: `${game.name} Leaderboard | Ocentra Games`,
        description: `View the ${game.name} leaderboard and score tracks on Ocentra Games.`,
        canonicalPath: buildPublicGameLeaderboardPath(game.gameId),
        privacy: PublicRoutePrivacy.Indexable,
        pageLayoutAssetPath: pageLayoutAssetPath.gameLeaderboard,
        structuredData: [structuredLeaderboard(siteOrigin, buildPublicGameLeaderboardPath(game.gameId), `${game.name} Leaderboard`)],
      });
    }
    return completeMetadata(siteOrigin, {
      routeKey: PublicRouteKey.Game,
      title: `${game.name} | Ocentra Games`,
      description: game.description,
      canonicalPath: buildPublicGamePath(game.gameId),
      privacy: PublicRoutePrivacy.Indexable,
      pageLayoutAssetPath: pageLayoutAssetPath.selectedGame,
      structuredData: [structuredGame(siteOrigin, game)],
    });
  }

  if (first === PublicRouteSegment.Tournaments && second) {
    const tournamentId = decodePathSegment(second);
    const title = `${titleCaseGameId(tournamentId)} Tournament`;
    return completeMetadata(siteOrigin, {
      routeKey: PublicRouteKey.TournamentDetail,
      title: `${title} | Ocentra Games`,
      description: `Tournament detail page for ${title} on Ocentra Games.`,
      canonicalPath: buildPublicTournamentDetailPath(tournamentId),
      privacy: PublicRoutePrivacy.Indexable,
      pageLayoutAssetPath: pageLayoutAssetPath.tournamentDetail,
      structuredData: [structuredTournament(siteOrigin, buildPublicTournamentDetailPath(tournamentId), title)],
    });
  }

  if (first === PublicRouteSegment.Admin) {
    return completeMetadata(siteOrigin, {
      routeKey: PublicRouteKey.Admin,
      title: 'Admin | Ocentra Games',
      description: 'Private Ocentra administration route.',
      canonicalPath: normalizedPathname,
      privacy: PublicRoutePrivacy.Private,
      pageLayoutAssetPath: pageLayoutAssetPath.admin,
    });
  }

  if (first) {
    const game = findGame(first);
    return completeMetadata(siteOrigin, {
      routeKey: 'legacy-selected-game',
      title: `${game.name} | Ocentra Games`,
      description: game.description,
      canonicalPath: buildPublicGamePath(game.gameId),
      privacy: PublicRoutePrivacy.Alias,
      pageLayoutAssetPath: pageLayoutAssetPath.selectedGame,
      structuredData: [structuredGame(siteOrigin, game)],
    });
  }

  return completeMetadata(siteOrigin, {
    routeKey: 'unknown',
    title: 'Ocentra Games',
    description: 'Ocentra Games route.',
    canonicalPath: normalizedPathname,
    privacy: PublicRoutePrivacy.Alias,
  });
}

export function getSitemapEntries(): SitemapEntry[] {
  const staticEntries: SitemapEntry[] = [
    { path: PublicRoutePath[PublicRouteKey.Home], priority: '1.0', changefreq: 'weekly' },
    { path: PublicRoutePath[PublicRouteKey.GamesCatalog], priority: '0.9', changefreq: 'daily' },
    { path: PublicRoutePath[PublicRouteKey.CardGamesCatalog], priority: '0.9', changefreq: 'daily' },
    { path: PublicRoutePath[PublicRouteKey.Shop], priority: '0.5', changefreq: 'weekly' },
    { path: PublicRoutePath[PublicRouteKey.Competition], priority: '0.8', changefreq: 'daily' },
    { path: PublicRoutePath[PublicRouteKey.Tournaments], priority: '0.8', changefreq: 'daily' },
    { path: PublicRoutePath[PublicRouteKey.Leaderboard], priority: '0.8', changefreq: 'daily' },
    { path: PublicRoutePath[PublicRouteKey.AiBenchmarkLeaderboard], priority: '0.8', changefreq: 'daily' },
  ];
  const gameEntries = seoGameCatalog.flatMap(game => [
    { path: buildPublicGamePath(game.gameId), priority: '0.8', changefreq: 'weekly' },
    { path: buildPublicGameLeaderboardPath(game.gameId), priority: '0.7', changefreq: 'daily' },
  ]);
  return [...staticEntries, ...gameEntries];
}
