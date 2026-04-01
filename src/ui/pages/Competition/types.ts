import type {
  LeaderboardEntry,
  TournamentBracketResponse,
} from '@ocentra/api-domain/competition';

export interface CompetitionState {
  loading: boolean;
  registering: boolean;
  error: string | null;
  gameType: number;
  seasonId: string;
  lastUpdated: string;
  leaderboardEntries: LeaderboardEntry[];
  userEntry: LeaderboardEntry | null;
  nearbyAbove: LeaderboardEntry[];
  nearbyBelow: LeaderboardEntry[];
  tournamentId: string;
  tournamentBracket: TournamentBracketResponse | null;
}

export const CompetitionDefaultGameType = 1;
export const CompetitionDefaultTournamentId = 'daily-open';
