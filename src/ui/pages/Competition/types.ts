import type {
  LeaderboardEntry,
  TournamentBracketResponse,
} from '@ocentra/api-domain/competition';
import type {
  CompetitionCheckInResponse,
  CompetitionProgram,
  CompetitionProgramStatus,
  CompetitionProgramType,
  CompetitionRegistrationResponse,
} from '@ocentra/endpoint-domain/schemas/competition';

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
  programs: CompetitionProgram[];
  featuredProgramId: string | null;
  selectedProgram: CompetitionProgram | null;
  programsLoading: boolean;
  programsError: string | null;
  registeringProgramId: string | null;
  checkingInProgramId: string | null;
  registrationResult: CompetitionRegistrationResponse | null;
  checkInResult: CompetitionCheckInResponse | null;
}

export const CompetitionDefaultGameType = 1;
export const CompetitionDefaultTournamentId = 'daily-open';

export interface CompetitionProgramsFilter {
  type?: CompetitionProgramType;
  status?: CompetitionProgramStatus;
  gameId?: string;
}
