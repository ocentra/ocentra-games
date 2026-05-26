import { describe, expect, it } from 'vitest';
import {
  buildAiBenchmarkLeaderboardPath,
  buildCardGameTemplatePath,
  buildCardGamesCatalogPath,
  buildEventDetailPath,
  buildEventsPath,
  buildGameLeaderboardPath,
  buildGameLobbyPath,
  buildGameMatchmakingPath,
  buildGamePlayPath,
  buildGamesCatalogPath,
  buildCompetitionPath,
  buildLeaderboardPath,
  buildMatchDetailPath,
  buildMatchesPath,
  buildPlayerHubPath,
  buildRulesPath,
  buildSettingsPath,
  buildTournamentDetailPath,
  buildTournamentsPath,
  parseAppRoute,
} from './appRoutes';

describe('appRoutes', () => {
  it('builds the standalone card game template path', () => {
    expect(buildCardGameTemplatePath()).toBe('/games/cardgame/template');
  });

  it('builds the playable game path without preview mode', () => {
    expect(buildGamePlayPath('claim')).toBe('/games/claim/play');
  });

  it('builds canonical catalog and competition paths', () => {
    expect(buildGamesCatalogPath()).toBe('/games');
    expect(buildCardGamesCatalogPath()).toBe('/games/card-games');
    expect(buildRulesPath('three-card-brag')).toBe('/rules/three-card-brag');
    expect(buildCompetitionPath()).toBe('/competition');
    expect(buildEventsPath()).toBe('/events');
    expect(buildEventDetailPath('may-2026-cup')).toBe('/events/may-2026-cup');
    expect(buildMatchesPath()).toBe('/matches');
    expect(buildMatchDetailPath('match-123')).toBe('/matches/match-123');
    expect(buildPlayerHubPath()).toBe('/player-hub');
    expect(buildSettingsPath()).toBe('/player-hub');
    expect(buildLeaderboardPath()).toBe('/leaderboard');
    expect(buildAiBenchmarkLeaderboardPath()).toBe('/leaderboard');
    expect(buildTournamentsPath()).toBe('/tournaments');
    expect(buildTournamentDetailPath('may-2026')).toBe('/tournaments/may-2026');
  });

  it('builds game-scoped multiplayer and leaderboard paths', () => {
    const gameId = 'claim:ddc6d965-14a7-4586-8a15-674e0daf8b5c';
    expect(buildGameLeaderboardPath(gameId)).toBe('/leaderboard');
    expect(buildGameLobbyPath(gameId)).toBe('/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c/lobby');
    expect(buildGameMatchmakingPath(gameId)).toBe('/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c/matchmaking');
  });

  it('parses catalog before selected-game routes', () => {
    expect(parseAppRoute('/games')).toEqual({ kind: 'gameCatalog', scope: 'all' });
    expect(parseAppRoute('/games/card-games')).toEqual({ kind: 'gameCatalog', scope: 'card-games' });
    expect(parseAppRoute('/CardGamesExplorer')).toEqual({ kind: 'gameCatalog', scope: 'card-games' });
    expect(parseAppRoute('/games/cardgame/template')).toEqual({ kind: 'template' });
    expect(parseAppRoute('/rules/three-card-brag')).toEqual({ kind: 'rules', gameId: 'three-card-brag' });
  });

  it('parses route-level events, matches, leaderboard, lobby, matchmaking, and tournament pages', () => {
    expect(parseAppRoute('/events')).toEqual({ kind: 'events' });
    expect(parseAppRoute('/events/may-2026-cup')).toEqual({ kind: 'eventDetail', eventId: 'may-2026-cup' });
    expect(parseAppRoute('/matches')).toEqual({ kind: 'matches' });
    expect(parseAppRoute('/matches/match-123')).toEqual({ kind: 'matchDetail', matchId: 'match-123' });
    expect(parseAppRoute('/player-hub')).toEqual({ kind: 'playerHub' });
    expect(parseAppRoute('/settings')).toEqual({ kind: 'playerHub' });
    expect(parseAppRoute('/leaderboard')).toEqual({ kind: 'leaderboard' });
    expect(parseAppRoute('/leaderboard/ai-benchmarks')).toEqual({ kind: 'leaderboard' });
    expect(parseAppRoute('/tournaments')).toEqual({ kind: 'tournaments' });
    expect(parseAppRoute('/tournaments/may-2026')).toEqual({ kind: 'tournamentDetail', tournamentId: 'may-2026' });
    expect(parseAppRoute('/games/claim/leaderboard')).toEqual({ kind: 'leaderboard' });
    expect(parseAppRoute('/games/claim/lobby')).toEqual({ kind: 'lobby', gameId: 'claim' });
    expect(parseAppRoute('/games/claim/matchmaking')).toEqual({ kind: 'matchmaking', gameId: 'claim' });
  });

  it('does not preserve the removed competition leaderboard route', () => {
    expect(parseAppRoute('/competition')).toEqual({ kind: 'competition' });
    expect(parseAppRoute('/competition/leaderboard')).toEqual({ kind: 'notFound', path: '/competition/leaderboard' });
  });

  it('does not collapse unknown subroutes into valid page surfaces', () => {
    expect(parseAppRoute('/leaderboard/random')).toEqual({ kind: 'notFound', path: '/leaderboard/random' });
    expect(parseAppRoute('/leaderboard/ai-benchmarks/extra')).toEqual({ kind: 'notFound', path: '/leaderboard/ai-benchmarks/extra' });
    expect(parseAppRoute('/tournaments/may-2026/round-one')).toEqual({ kind: 'notFound', path: '/tournaments/may-2026/round-one' });
    expect(parseAppRoute('/events/may-2026/details')).toEqual({ kind: 'notFound', path: '/events/may-2026/details' });
    expect(parseAppRoute('/matches/match-123/receipt')).toEqual({ kind: 'notFound', path: '/matches/match-123/receipt' });
    expect(parseAppRoute('/games/card-games/leaderboard')).toEqual({ kind: 'notFound', path: '/games/card-games/leaderboard' });
    expect(parseAppRoute('/games/claim/leaderboard/season')).toEqual({ kind: 'notFound', path: '/games/claim/leaderboard/season' });
    expect(parseAppRoute('/shop/offers')).toEqual({ kind: 'notFound', path: '/shop/offers' });
    expect(parseAppRoute('/lobby/claim')).toEqual({ kind: 'notFound', path: '/lobby/claim' });
    expect(parseAppRoute('/CardGamesExplorer/leaderboard')).toEqual({ kind: 'notFound', path: '/CardGamesExplorer/leaderboard' });
  });
});
