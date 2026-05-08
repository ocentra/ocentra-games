import { describe, expect, it } from 'vitest';
import {
  buildAiBenchmarkLeaderboardPath,
  buildCardGameTemplatePath,
  buildCardGamesCatalogPath,
  buildGameLeaderboardPath,
  buildGameLobbyPath,
  buildGameMatchmakingPath,
  buildGamePlayPath,
  buildGamesCatalogPath,
  buildLeaderboardPath,
  buildRulesPath,
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
    expect(buildLeaderboardPath()).toBe('/leaderboard');
    expect(buildAiBenchmarkLeaderboardPath()).toBe('/leaderboard/ai-benchmarks');
    expect(buildTournamentsPath()).toBe('/tournaments');
    expect(buildTournamentDetailPath('may-2026')).toBe('/tournaments/may-2026');
  });

  it('builds game-scoped multiplayer and leaderboard paths', () => {
    const gameId = 'claim:ddc6d965-14a7-4586-8a15-674e0daf8b5c';
    expect(buildGameLeaderboardPath(gameId)).toBe('/games/claim%3Addc6d965-14a7-4586-8a15-674e0daf8b5c/leaderboard');
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

  it('parses route-level leaderboard, lobby, matchmaking, and tournament pages', () => {
    expect(parseAppRoute('/leaderboard')).toEqual({ kind: 'leaderboard' });
    expect(parseAppRoute('/leaderboard/ai-benchmarks')).toEqual({ kind: 'aiBenchmarkLeaderboard' });
    expect(parseAppRoute('/tournaments')).toEqual({ kind: 'tournaments' });
    expect(parseAppRoute('/tournaments/may-2026')).toEqual({ kind: 'tournamentDetail', tournamentId: 'may-2026' });
    expect(parseAppRoute('/games/claim/leaderboard')).toEqual({ kind: 'gameLeaderboard', gameId: 'claim' });
    expect(parseAppRoute('/games/claim/lobby')).toEqual({ kind: 'lobby', gameId: 'claim' });
    expect(parseAppRoute('/games/claim/matchmaking')).toEqual({ kind: 'matchmaking', gameId: 'claim' });
  });
});
