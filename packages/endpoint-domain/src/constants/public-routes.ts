export const PublicRouteSegment = {
  Admin: 'admin',
  AiBenchmarks: 'ai-benchmarks',
  CardGame: 'cardgame',
  CardGames: 'card-games',
  Categories: 'categories',
  Competition: 'competition',
  Editor: 'Editor',
  Games: 'games',
  Leaderboard: 'leaderboard',
  Lobby: 'lobby',
  Matchmaking: 'matchmaking',
  Play: 'play',
  PlayerHub: 'player-hub',
  Rules: 'rules',
  Settings: 'settings',
  Shop: 'shop',
  Social: 'social',
  Template: 'template',
  Tournaments: 'tournaments',
  Users: 'users',
} as const;

export type PublicRouteSegment = typeof PublicRouteSegment[keyof typeof PublicRouteSegment];

export const PublicRouteKey = {
  Admin: 'admin',
  AdminTools: 'admin-tools',
  AdminUsers: 'admin-users',
  AiBenchmarkLeaderboard: 'ai-benchmark-leaderboard',
  CardGameTemplate: 'card-game-template',
  CardGamesCatalog: 'card-games-catalog',
  Category: 'category',
  Competition: 'competition',
  EditorAlias: 'editor-alias',
  Game: 'game',
  GameLeaderboard: 'game-leaderboard',
  GameLobby: 'game-lobby',
  GameMatchmaking: 'game-matchmaking',
  GamePlay: 'game-play',
  GamesCatalog: 'games-catalog',
  Home: 'home',
  Leaderboard: 'leaderboard',
  LegacyCardGamesExplorer: 'legacy-card-games-explorer',
  Lobby: 'lobby',
  Matchmaking: 'matchmaking',
  PlayerHub: 'player-hub',
  Rules: 'rules',
  Settings: 'settings',
  Shop: 'shop',
  Social: 'social',
  TournamentDetail: 'tournament-detail',
  Tournaments: 'tournaments',
} as const;

export type PublicRouteKey = typeof PublicRouteKey[keyof typeof PublicRouteKey];

export const PublicRoutePath = {
  [PublicRouteKey.Admin]: `/${PublicRouteSegment.Admin}`,
  [PublicRouteKey.AdminTools]: `/${PublicRouteSegment.Admin}/tools`,
  [PublicRouteKey.AdminUsers]: `/${PublicRouteSegment.Admin}/${PublicRouteSegment.Users}`,
  [PublicRouteKey.AiBenchmarkLeaderboard]: `/${PublicRouteSegment.Leaderboard}/${PublicRouteSegment.AiBenchmarks}`,
  [PublicRouteKey.CardGameTemplate]: `/${PublicRouteSegment.Games}/${PublicRouteSegment.CardGame}/${PublicRouteSegment.Template}`,
  [PublicRouteKey.CardGamesCatalog]: `/${PublicRouteSegment.Games}/${PublicRouteSegment.CardGames}`,
  [PublicRouteKey.Category]: `/${PublicRouteSegment.Categories}/:categoryId`,
  [PublicRouteKey.Competition]: `/${PublicRouteSegment.Competition}`,
  [PublicRouteKey.EditorAlias]: `/${PublicRouteSegment.Editor}`,
  [PublicRouteKey.Game]: `/${PublicRouteSegment.Games}/:gameId`,
  [PublicRouteKey.GameLeaderboard]: `/${PublicRouteSegment.Games}/:gameId/${PublicRouteSegment.Leaderboard}`,
  [PublicRouteKey.GameLobby]: `/${PublicRouteSegment.Games}/:gameId/${PublicRouteSegment.Lobby}`,
  [PublicRouteKey.GameMatchmaking]: `/${PublicRouteSegment.Games}/:gameId/${PublicRouteSegment.Matchmaking}`,
  [PublicRouteKey.GamePlay]: `/${PublicRouteSegment.Games}/:gameId/${PublicRouteSegment.Play}`,
  [PublicRouteKey.GamesCatalog]: `/${PublicRouteSegment.Games}`,
  [PublicRouteKey.Home]: '/',
  [PublicRouteKey.Leaderboard]: `/${PublicRouteSegment.Leaderboard}`,
  [PublicRouteKey.LegacyCardGamesExplorer]: '/CardGamesExplorer',
  [PublicRouteKey.Lobby]: `/${PublicRouteSegment.Lobby}`,
  [PublicRouteKey.Matchmaking]: `/${PublicRouteSegment.Matchmaking}`,
  [PublicRouteKey.PlayerHub]: `/${PublicRouteSegment.PlayerHub}`,
  [PublicRouteKey.Rules]: `/${PublicRouteSegment.Rules}/:gameId`,
  [PublicRouteKey.Settings]: `/${PublicRouteSegment.Settings}`,
  [PublicRouteKey.Shop]: `/${PublicRouteSegment.Shop}`,
  [PublicRouteKey.Social]: `/${PublicRouteSegment.Social}`,
  [PublicRouteKey.TournamentDetail]: `/${PublicRouteSegment.Tournaments}/:tournamentId`,
  [PublicRouteKey.Tournaments]: `/${PublicRouteSegment.Tournaments}`,
} as const satisfies Record<PublicRouteKey, string>;

export type PublicRoutePath = typeof PublicRoutePath[keyof typeof PublicRoutePath];

export const PublicRoutePrivacy = {
  Indexable: 'indexable',
  Private: 'private',
  Alias: 'alias',
  DevOnly: 'dev-only',
} as const;

export type PublicRoutePrivacy = typeof PublicRoutePrivacy[keyof typeof PublicRoutePrivacy];

export interface PublicRouteDefinition {
  key: PublicRouteKey;
  path: PublicRoutePath;
  privacy: PublicRoutePrivacy;
}

export const PublicRouteDefinitions = [
  { key: PublicRouteKey.Home, path: PublicRoutePath[PublicRouteKey.Home], privacy: PublicRoutePrivacy.Indexable },
  { key: PublicRouteKey.GamesCatalog, path: PublicRoutePath[PublicRouteKey.GamesCatalog], privacy: PublicRoutePrivacy.Indexable },
  { key: PublicRouteKey.CardGamesCatalog, path: PublicRoutePath[PublicRouteKey.CardGamesCatalog], privacy: PublicRoutePrivacy.Indexable },
  { key: PublicRouteKey.Category, path: PublicRoutePath[PublicRouteKey.Category], privacy: PublicRoutePrivacy.Indexable },
  { key: PublicRouteKey.LegacyCardGamesExplorer, path: PublicRoutePath[PublicRouteKey.LegacyCardGamesExplorer], privacy: PublicRoutePrivacy.Alias },
  { key: PublicRouteKey.Game, path: PublicRoutePath[PublicRouteKey.Game], privacy: PublicRoutePrivacy.Indexable },
  { key: PublicRouteKey.GamePlay, path: PublicRoutePath[PublicRouteKey.GamePlay], privacy: PublicRoutePrivacy.Private },
  { key: PublicRouteKey.Shop, path: PublicRoutePath[PublicRouteKey.Shop], privacy: PublicRoutePrivacy.Indexable },
  { key: PublicRouteKey.Social, path: PublicRoutePath[PublicRouteKey.Social], privacy: PublicRoutePrivacy.Private },
  { key: PublicRouteKey.PlayerHub, path: PublicRoutePath[PublicRouteKey.PlayerHub], privacy: PublicRoutePrivacy.Private },
  { key: PublicRouteKey.Rules, path: PublicRoutePath[PublicRouteKey.Rules], privacy: PublicRoutePrivacy.Indexable },
  { key: PublicRouteKey.Settings, path: PublicRoutePath[PublicRouteKey.Settings], privacy: PublicRoutePrivacy.Private },
  { key: PublicRouteKey.Competition, path: PublicRoutePath[PublicRouteKey.Competition], privacy: PublicRoutePrivacy.Indexable },
  { key: PublicRouteKey.Tournaments, path: PublicRoutePath[PublicRouteKey.Tournaments], privacy: PublicRoutePrivacy.Indexable },
  { key: PublicRouteKey.TournamentDetail, path: PublicRoutePath[PublicRouteKey.TournamentDetail], privacy: PublicRoutePrivacy.Indexable },
  { key: PublicRouteKey.Leaderboard, path: PublicRoutePath[PublicRouteKey.Leaderboard], privacy: PublicRoutePrivacy.Indexable },
  { key: PublicRouteKey.GameLeaderboard, path: PublicRoutePath[PublicRouteKey.GameLeaderboard], privacy: PublicRoutePrivacy.Indexable },
  { key: PublicRouteKey.Lobby, path: PublicRoutePath[PublicRouteKey.Lobby], privacy: PublicRoutePrivacy.Private },
  { key: PublicRouteKey.GameLobby, path: PublicRoutePath[PublicRouteKey.GameLobby], privacy: PublicRoutePrivacy.Private },
  { key: PublicRouteKey.Matchmaking, path: PublicRoutePath[PublicRouteKey.Matchmaking], privacy: PublicRoutePrivacy.Private },
  { key: PublicRouteKey.GameMatchmaking, path: PublicRoutePath[PublicRouteKey.GameMatchmaking], privacy: PublicRoutePrivacy.Private },
  { key: PublicRouteKey.AiBenchmarkLeaderboard, path: PublicRoutePath[PublicRouteKey.AiBenchmarkLeaderboard], privacy: PublicRoutePrivacy.Indexable },
  { key: PublicRouteKey.Admin, path: PublicRoutePath[PublicRouteKey.Admin], privacy: PublicRoutePrivacy.Private },
  { key: PublicRouteKey.AdminUsers, path: PublicRoutePath[PublicRouteKey.AdminUsers], privacy: PublicRoutePrivacy.Private },
  { key: PublicRouteKey.AdminTools, path: PublicRoutePath[PublicRouteKey.AdminTools], privacy: PublicRoutePrivacy.Alias },
  { key: PublicRouteKey.EditorAlias, path: PublicRoutePath[PublicRouteKey.EditorAlias], privacy: PublicRoutePrivacy.Alias },
  { key: PublicRouteKey.CardGameTemplate, path: PublicRoutePath[PublicRouteKey.CardGameTemplate], privacy: PublicRoutePrivacy.DevOnly },
] as const satisfies readonly PublicRouteDefinition[];

export function buildPublicGamePath(gameId: string): string {
  return `/${PublicRouteSegment.Games}/${encodeURIComponent(gameId)}`;
}

export function buildPublicCategoryPath(categoryId: string): string {
  return `/${PublicRouteSegment.Categories}/${encodeURIComponent(categoryId)}`;
}

export function buildPublicRulesPath(gameId: string): string {
  return `/${PublicRouteSegment.Rules}/${encodeURIComponent(gameId)}`;
}

export function buildPublicGamePlayPath(gameId: string): string {
  return `${buildPublicGamePath(gameId)}/${PublicRouteSegment.Play}`;
}

export function buildPublicGameLeaderboardPath(gameId: string): string {
  return `${buildPublicGamePath(gameId)}/${PublicRouteSegment.Leaderboard}`;
}

export function buildPublicGameLobbyPath(gameId: string): string {
  return `${buildPublicGamePath(gameId)}/${PublicRouteSegment.Lobby}`;
}

export function buildPublicGameMatchmakingPath(gameId: string): string {
  return `${buildPublicGamePath(gameId)}/${PublicRouteSegment.Matchmaking}`;
}

export function buildPublicTournamentDetailPath(tournamentId: string): string {
  return `/${PublicRouteSegment.Tournaments}/${encodeURIComponent(tournamentId)}`;
}
