import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { TournamentDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { requestJson } from './httpClient';

export interface LeaderboardEntry {
  user_id: string;
  rank: number;
  tier: string;
  score: number;
  wins: number;
  losses: number;
  games_played: number;
}

export interface LeaderboardResponse {
  game_type: number;
  season_id: string;
  entries: LeaderboardEntry[];
  total_entries: number;
  last_updated: string;
  ai_only: boolean;
}

export interface LeaderboardNearbyResponse {
  above: LeaderboardEntry[];
  user: LeaderboardEntry;
  below: LeaderboardEntry[];
}

export interface TournamentBracketResponse {
  tournamentId: string;
  rounds: Array<{
    round: number;
    matches: Array<Record<string, unknown>>;
  }>;
}

export async function getLeaderboard(gameType: number): Promise<LeaderboardResponse> {
  return requestJson<LeaderboardResponse>(ApiEndpoint.Leaderboard.ByGameType(gameType));
}

export async function getLeaderboardUser(gameType: number, userId: string): Promise<LeaderboardEntry> {
  return requestJson<LeaderboardEntry>(ApiEndpoint.Leaderboard.User(gameType, userId));
}

export async function getLeaderboardNearby(gameType: number, userId: string): Promise<LeaderboardNearbyResponse> {
  return requestJson<LeaderboardNearbyResponse>(ApiEndpoint.Leaderboard.Nearby(gameType, userId));
}

export async function getTournamentBracket(tournamentId: string): Promise<TournamentBracketResponse> {
  return requestJson<TournamentBracketResponse>(
    `${ApiEndpoint.Tournament.ById(tournamentId)}/${TournamentDOSegment.Bracket}`
  );
}

export async function registerTournament(tournamentId: string): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(
    `${ApiEndpoint.Tournament.ById(tournamentId)}/${TournamentDOSegment.Register}`,
    { method: HttpMethod.Post, body: {}, authMode: 'required' }
  );
}
