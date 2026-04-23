export const AppScreenToken = {
  Home: 'home',
  Welcome: 'welcome',
  Settings: 'settings',
  Shop: 'shop',
  Matchmaking: 'matchmaking',
  Lobby: 'lobby',
  Social: 'social',
  Competition: 'competition',
  PlayerHub: 'player-hub',
} as const;

export type AppScreenToken = (typeof AppScreenToken)[keyof typeof AppScreenToken];

export type AppRouteState =
  | { kind: 'home' }
  | { kind: 'settings' }
  | { kind: 'shop' }
  | { kind: 'social' }
  | { kind: 'competition' }
  | { kind: 'playerHub' }
  | { kind: 'matchmaking'; gameId?: string }
  | { kind: 'lobby'; gameId?: string }
  | { kind: 'game'; gameId: string }
  | { kind: 'template' }
  | { kind: 'legacy'; token: string };

const AppRoutePrefix = {
  Games: 'games',
} as const;

export const GameRouteSegment = {
  Play: 'play',
  Matchmaking: AppScreenToken.Matchmaking,
  Lobby: AppScreenToken.Lobby,
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

function getGameContextFromRoute(state: AppRouteState): string | undefined {
  if (state.kind === 'game' || state.kind === 'matchmaking' || state.kind === 'lobby') {
    return state.gameId;
  }
  return undefined;
}

export function buildHomePath(): string {
  return '/';
}

export function buildSettingsPath(): string {
  return '/settings';
}

export function buildShopPath(): string {
  return '/shop';
}

export function buildSocialPath(): string {
  return '/social';
}

export function buildCompetitionPath(): string {
  return '/competition';
}

export function buildPlayerHubPath(): string {
  return '/player-hub';
}

export function buildMatchmakingPath(): string {
  return '/matchmaking';
}

export function buildLobbyPath(): string {
  return '/lobby';
}

export function buildGamePath(gameId: string): string {
  return `/${AppRoutePrefix.Games}/${encodeURIComponent(gameId)}`;
}

export function buildGameMatchmakingPath(gameId: string): string {
  return `${buildGamePath(gameId)}/${AppScreenToken.Matchmaking}`;
}

export function buildGameLobbyPath(gameId: string): string {
  return `${buildGamePath(gameId)}/${AppScreenToken.Lobby}`;
}

export function buildGamePlayPath(gameId: string): string {
  return `${buildGamePath(gameId)}/${GameRouteSegment.Play}`;
}

export function buildCardGameTemplatePath(): string {
  return '/games/cardgame/template';
}

export function parseAppRoute(pathname: string): AppRouteState {
  const segments = normalizePath(pathname);

  if (segments.length === 0) {
    return { kind: 'home' };
  }

  const [first, second, third] = segments;

  if (first === AppRoutePrefix.Games) {
    if (!second) {
      return { kind: 'home' };
    }
    if (third === AppScreenToken.Matchmaking) {
      return { kind: 'matchmaking', gameId: second };
    }
    if (third === AppScreenToken.Lobby) {
      return { kind: 'lobby', gameId: second };
    }
    if (second === 'cardgame' && third === 'template') {
      return { kind: 'template' };
    }
    return { kind: 'game', gameId: second };
  }

  if (first === AppScreenToken.Settings) {
    return { kind: 'settings' };
  }
  if (first === AppScreenToken.Shop) {
    return { kind: 'shop' };
  }
  if (first === AppScreenToken.Social) {
    return { kind: 'social' };
  }
  if (first === AppScreenToken.Competition) {
    return { kind: 'competition' };
  }
  if (first === AppScreenToken.PlayerHub) {
    return { kind: 'playerHub' };
  }
  if (first === AppScreenToken.Matchmaking) {
    return { kind: 'matchmaking' };
  }
  if (first === AppScreenToken.Lobby) {
    return { kind: 'lobby' };
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
