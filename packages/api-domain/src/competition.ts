import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { TournamentDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import type {
  CompetitionCheckInResponse,
  CompetitionProgramDetailResponse,
  CompetitionProgramStatus,
  CompetitionProgramType,
  CompetitionProgramsResponse,
  CompetitionRegisterRequest,
  CompetitionRegistrationResponse,
} from '@ocentra/endpoint-domain/schemas/competition';
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

export interface CompetitionProgramsOptions {
  type?: CompetitionProgramType;
  status?: CompetitionProgramStatus;
  gameId?: string;
}

function appendQuery(
  endpoint: string,
  query: Record<string, string | number | boolean | null | undefined>
): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const raw = params.toString();
  return raw.length === 0 ? endpoint : `${endpoint}?${raw}`;
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

export async function listCompetitionPrograms(
  options: CompetitionProgramsOptions = {}
): Promise<CompetitionProgramsResponse> {
  return requestJson<CompetitionProgramsResponse>(appendQuery(ApiEndpoint.Competition.Programs, {
    [QueryParam.Type]: options.type,
    [QueryParam.Status]: options.status,
    [QueryParam.GameId]: options.gameId,
  }));
}

export async function getCompetitionProgram(programId: string): Promise<CompetitionProgramDetailResponse> {
  return requestJson<CompetitionProgramDetailResponse>(ApiEndpoint.Competition.ProgramById(programId));
}

export async function registerCompetitionProgram(
  programId: string,
  payload: CompetitionRegisterRequest = {}
): Promise<CompetitionRegistrationResponse> {
  return requestJson<CompetitionRegistrationResponse, CompetitionRegisterRequest>(
    ApiEndpoint.Competition.Register(programId),
    { method: HttpMethod.Post, body: payload, authMode: 'required' }
  );
}

export async function checkInCompetitionProgram(programId: string): Promise<CompetitionCheckInResponse> {
  return requestJson<CompetitionCheckInResponse>(
    ApiEndpoint.Competition.CheckIn(programId),
    { method: HttpMethod.Post, body: {}, authMode: 'required' }
  );
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
