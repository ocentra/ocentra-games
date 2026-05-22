import {
  PublicRouteKey,
  PublicRoutePath,
  PublicRouteSegment,
  buildPublicCategoryPath,
  buildPublicEventDetailPath,
  buildPublicGameLeaderboardPath,
  buildPublicGameLobbyPath,
  buildPublicGameMatchmakingPath,
  buildPublicGamePath,
  buildPublicGamePlayPath,
  buildPublicMatchDetailPath,
  buildPublicRulesPath,
  buildPublicTournamentDetailPath,
} from '@ocentra/endpoint-domain/constants/public-routes';

export const AppScreenToken = {
  Home: 'home',
  Welcome: 'welcome',
  Settings: 'settings',
  Shop: 'shop',
  Matchmaking: 'matchmaking',
  Lobby: 'lobby',
  Social: 'social',
  Competition: 'competition',
  Events: 'events',
  Matches: 'matches',
  PlayerHub: 'player-hub',
  Tournaments: 'tournaments',
  Leaderboard: 'leaderboard',
} as const;

export type AppScreenToken = (typeof AppScreenToken)[keyof typeof AppScreenToken];

export type AppRouteState =
  | { kind: 'home' }
  | { kind: 'gameCatalog'; scope: 'all' | 'card-games' }
  | { kind: 'category'; categoryId: string }
  | { kind: 'settings' }
  | { kind: 'shop' }
  | { kind: 'social' }
  | { kind: 'competition' }
  | { kind: 'events' }
  | { kind: 'eventDetail'; eventId: string }
  | { kind: 'tournaments' }
  | { kind: 'tournamentDetail'; tournamentId: string }
  | { kind: 'leaderboard' }
  | { kind: 'gameLeaderboard'; gameId: string }
  | { kind: 'rules'; gameId: string }
  | { kind: 'aiBenchmarkLeaderboard' }
  | { kind: 'matches' }
  | { kind: 'matchDetail'; matchId: string }
  | { kind: 'playerHub' }
  | { kind: 'matchmaking'; gameId?: string }
  | { kind: 'lobby'; gameId?: string }
  | { kind: 'game'; gameId: string }
  | { kind: 'template' }
  | { kind: 'notFound'; path: string }
  | { kind: 'legacy'; token: string };

export const GameRouteSegment = {
  Play: PublicRouteSegment.Play,
  Matchmaking: AppScreenToken.Matchmaking,
  Lobby: AppScreenToken.Lobby,
  Leaderboard: AppScreenToken.Leaderboard,
} as const;

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function normalizePath(pathname: string): string[] {
  if (!pathname || pathname === '/') {
    return [];
  }

  return pathname
    .split('?')[0]
    .split('#')[0]
    .replace(/^\/+/, '')
    .split('/')
    .filter((segment) => segment.length > 0)
    .map(decodeSegment);
}

function notFoundRoute(segments: string[]): AppRouteState {
  return { kind: 'notFound', path: `/${segments.join('/')}` };
}

function getGameContextFromRoute(state: AppRouteState): string | undefined {
  if (
    state.kind === 'game' ||
    state.kind === 'gameLeaderboard' ||
    state.kind === 'matchmaking' ||
    state.kind === 'lobby'
  ) {
    return state.gameId;
  }
  return undefined;
}

export function buildHomePath(): string {
  return PublicRoutePath[PublicRouteKey.Home];
}

export function buildSettingsPath(): string {
  return PublicRoutePath[PublicRouteKey.Settings];
}

export function buildShopPath(): string {
  return PublicRoutePath[PublicRouteKey.Shop];
}

export function buildSocialPath(): string {
  return PublicRoutePath[PublicRouteKey.Social];
}

export function buildCompetitionPath(): string {
  return PublicRoutePath[PublicRouteKey.Competition];
}

export function buildEventsPath(): string {
  return PublicRoutePath[PublicRouteKey.Events];
}

export function buildEventDetailPath(eventId: string): string {
  return buildPublicEventDetailPath(eventId);
}

export function buildPlayerHubPath(): string {
  return PublicRoutePath[PublicRouteKey.PlayerHub];
}

export function buildMatchesPath(): string {
  return PublicRoutePath[PublicRouteKey.Matches];
}

export function buildMatchDetailPath(matchId: string): string {
  return buildPublicMatchDetailPath(matchId);
}

export function buildMatchmakingPath(): string {
  return PublicRoutePath[PublicRouteKey.Matchmaking];
}

export function buildLobbyPath(): string {
  return PublicRoutePath[PublicRouteKey.Lobby];
}

export function buildGamesCatalogPath(): string {
  return PublicRoutePath[PublicRouteKey.GamesCatalog];
}

export function buildCardGamesCatalogPath(): string {
  return PublicRoutePath[PublicRouteKey.CardGamesCatalog];
}

export function buildCategoryPath(categoryId: string): string {
  return buildPublicCategoryPath(categoryId);
}

export function buildRulesPath(gameId: string): string {
  return buildPublicRulesPath(gameId);
}

export function buildTournamentsPath(): string {
  return PublicRoutePath[PublicRouteKey.Tournaments];
}

export function buildTournamentDetailPath(tournamentId: string): string {
  return buildPublicTournamentDetailPath(tournamentId);
}

export function buildLeaderboardPath(): string {
  return PublicRoutePath[PublicRouteKey.Leaderboard];
}

export function buildAiBenchmarkLeaderboardPath(): string {
  return PublicRoutePath[PublicRouteKey.AiBenchmarkLeaderboard];
}

export function buildGamePath(gameId: string): string {
  return buildPublicGamePath(gameId);
}

export function buildGameMatchmakingPath(gameId: string): string {
  return buildPublicGameMatchmakingPath(gameId);
}

export function buildGameLobbyPath(gameId: string): string {
  return buildPublicGameLobbyPath(gameId);
}

export function buildGameLeaderboardPath(gameId: string): string {
  return buildPublicGameLeaderboardPath(gameId);
}

export function buildGamePlayPath(gameId: string): string {
  return buildPublicGamePlayPath(gameId);
}

export function buildCardGameTemplatePath(): string {
  return PublicRoutePath[PublicRouteKey.CardGameTemplate];
}

export function parseAppRoute(pathname: string): AppRouteState {
  const segments = normalizePath(pathname);

  if (segments.length === 0) {
    return { kind: 'home' };
  }

  const [first, second, third, fourth] = segments;

  if (first === PublicRoutePath[PublicRouteKey.LegacyCardGamesExplorer].replace(/^\/+/, '')) {
    return second ? notFoundRoute(segments) : { kind: 'gameCatalog', scope: 'card-games' };
  }

  if (first === PublicRouteSegment.Games) {
    if (!second) {
      return { kind: 'gameCatalog', scope: 'all' };
    }
    if (second === PublicRouteSegment.CardGames) {
      return third ? notFoundRoute(segments) : { kind: 'gameCatalog', scope: 'card-games' };
    }
    if (third === AppScreenToken.Matchmaking) {
      return fourth ? notFoundRoute(segments) : { kind: 'matchmaking', gameId: second };
    }
    if (third === AppScreenToken.Lobby) {
      return fourth ? notFoundRoute(segments) : { kind: 'lobby', gameId: second };
    }
    if (third === AppScreenToken.Leaderboard) {
      return fourth ? notFoundRoute(segments) : { kind: 'gameLeaderboard', gameId: second };
    }
    if (third === PublicRouteSegment.Play) {
      return fourth ? notFoundRoute(segments) : { kind: 'game', gameId: second };
    }
    if (second === PublicRouteSegment.CardGame && third === PublicRouteSegment.Template) {
      return fourth ? notFoundRoute(segments) : { kind: 'template' };
    }
    return third ? notFoundRoute(segments) : { kind: 'game', gameId: second };
  }

  if (first === PublicRouteSegment.CardGames) {
    return second ? notFoundRoute(segments) : { kind: 'gameCatalog', scope: 'card-games' };
  }

  if (first === PublicRouteSegment.Categories && second) {
    return third ? notFoundRoute(segments) : { kind: 'category', categoryId: second };
  }

  if (first === PublicRouteSegment.Rules && second) {
    return third ? notFoundRoute(segments) : { kind: 'rules', gameId: second };
  }

  if (first === AppScreenToken.Settings) {
    return second ? notFoundRoute(segments) : { kind: 'settings' };
  }
  if (first === AppScreenToken.Shop) {
    return second ? notFoundRoute(segments) : { kind: 'shop' };
  }
  if (first === AppScreenToken.Social) {
    return second ? notFoundRoute(segments) : { kind: 'social' };
  }
  if (first === AppScreenToken.Competition) {
    return second
      ? notFoundRoute(segments)
      : { kind: 'competition' };
  }
  if (first === AppScreenToken.Events) {
    if (!second) {
      return { kind: 'events' };
    }
    return third ? notFoundRoute(segments) : { kind: 'eventDetail', eventId: second };
  }
  if (first === AppScreenToken.Tournaments) {
    if (third) {
      return notFoundRoute(segments);
    }
    return second
      ? { kind: 'tournamentDetail', tournamentId: second }
      : { kind: 'tournaments' };
  }
  if (first === AppScreenToken.Leaderboard) {
    if (!second) {
      return { kind: 'leaderboard' };
    }
    return second === PublicRouteSegment.AiBenchmarks && !third
      ? { kind: 'aiBenchmarkLeaderboard' }
      : notFoundRoute(segments);
  }
  if (first === AppScreenToken.Matches) {
    if (!second) {
      return { kind: 'matches' };
    }
    return third ? notFoundRoute(segments) : { kind: 'matchDetail', matchId: second };
  }
  if (first === AppScreenToken.PlayerHub) {
    return second ? notFoundRoute(segments) : { kind: 'playerHub' };
  }
  if (first === AppScreenToken.Matchmaking) {
    return second ? notFoundRoute(segments) : { kind: 'matchmaking' };
  }
  if (first === AppScreenToken.Lobby) {
    return second ? notFoundRoute(segments) : { kind: 'lobby' };
  }

  return { kind: 'legacy', token: first };
}

export function resolvePathFromScreenToken(screen: string, currentPathname: string): string {
  if (!screen || screen === AppScreenToken.Home || screen === AppScreenToken.Welcome) {
    return buildHomePath();
  }

  if (screen.startsWith('/')) {
    return screen;
  }

  if (screen === AppScreenToken.Settings) {
    return buildSettingsPath();
  }
  if (screen === AppScreenToken.Shop) {
    return buildShopPath();
  }
  if (screen === AppScreenToken.Social) {
    return buildSocialPath();
  }
  if (screen === AppScreenToken.Competition) {
    return buildCompetitionPath();
  }
  if (screen === AppScreenToken.Events) {
    return buildEventsPath();
  }
  if (screen === AppScreenToken.Tournaments) {
    return buildTournamentsPath();
  }
  if (screen === AppScreenToken.Leaderboard) {
    return buildLeaderboardPath();
  }
  if (screen === AppScreenToken.Matches) {
    return buildMatchesPath();
  }
  if (screen === AppScreenToken.PlayerHub) {
    return buildPlayerHubPath();
  }

  const currentRoute = parseAppRoute(currentPathname);
  const currentGameId = getGameContextFromRoute(currentRoute);

  if (screen === AppScreenToken.Matchmaking) {
    return currentGameId ? buildGameMatchmakingPath(currentGameId) : buildMatchmakingPath();
  }
  if (screen === AppScreenToken.Lobby) {
    return currentGameId ? buildGameLobbyPath(currentGameId) : buildLobbyPath();
  }

  if (screen.includes(':')) {
    return buildGamePath(screen);
  }

  return `/${screen}`;
}
