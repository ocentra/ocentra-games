import { useCallback, useEffect, useState } from 'react';
import {
  checkInCompetitionProgram,
  getLeaderboard,
  getLeaderboardNearby,
  getLeaderboardUser,
  getCompetitionProgram,
  getTournamentBracket,
  listCompetitionPrograms,
  LeaderboardDataScope,
  registerCompetitionProgram,
  registerTournament,
  type LeaderboardEntry,
} from '@ocentra/api-domain/competition';
import {
  type CompetitionProgramsFilter,
  CompetitionDefaultGameType,
  CompetitionDefaultTournamentId,
  type CompetitionState,
} from '@/ui/pages/Competition/types';

interface CompetitionData extends CompetitionState {
  leaderboardError: string | null;
  tournamentError: string | null;
  refreshLeaderboard: (nextGameType?: number) => Promise<void>;
  loadTournamentBracket: (tournamentId: string) => Promise<void>;
  registerForTournament: (tournamentId: string) => Promise<void>;
  refreshPrograms: (filter?: CompetitionProgramsFilter) => Promise<void>;
  loadProgram: (programId: string) => Promise<void>;
  registerProgram: (programId: string) => Promise<void>;
  checkInProgram: (programId: string) => Promise<void>;
}

interface CompetitionDataOptions {
  loadDefaultTournament?: boolean;
  loadPrograms?: boolean;
  selectedProgramId?: string;
  programFilter?: CompetitionProgramsFilter;
}

function mapError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}

function isUnsupportedLeaderboardGameTypeError(message: string): boolean {
  return message.toLowerCase().includes('invalid game type');
}

function leaderboardEntriesForGameScope(entries: LeaderboardEntry[], gameType: number, scope: LeaderboardEntry['scope']): LeaderboardEntry[] {
  return entries.map(entry => ({
    ...entry,
    game_type: gameType,
    scope,
  }));
}

export function useCompetitionData(userId: string | null, options: CompetitionDataOptions = {}): CompetitionData {
  const loadDefaultTournament = options.loadDefaultTournament ?? true;
  const loadPrograms = options.loadPrograms ?? true;
  const selectedProgramId = options.selectedProgramId;
  const programType = options.programFilter?.type;
  const programStatus = options.programFilter?.status;
  const programGameId = options.programFilter?.gameId;
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [tournamentError, setTournamentError] = useState<string | null>(null);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [programsError, setProgramsError] = useState<string | null>(null);
  const [registeringProgramId, setRegisteringProgramId] = useState<string | null>(null);
  const [checkingInProgramId, setCheckingInProgramId] = useState<string | null>(null);
  const [gameType, setGameType] = useState<number>(CompetitionDefaultGameType);
  const [seasonId, setSeasonId] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [aiLeaderboardEntries, setAiLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [nearbyAbove, setNearbyAbove] = useState<LeaderboardEntry[]>([]);
  const [nearbyBelow, setNearbyBelow] = useState<LeaderboardEntry[]>([]);
  const [tournamentId, setTournamentId] = useState(CompetitionDefaultTournamentId);
  const [tournamentBracket, setTournamentBracket] = useState<CompetitionState['tournamentBracket']>(null);
  const [programs, setPrograms] = useState<CompetitionState['programs']>([]);
  const [featuredProgramId, setFeaturedProgramId] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<CompetitionState['selectedProgram']>(null);
  const [registrationResult, setRegistrationResult] = useState<CompetitionState['registrationResult']>(null);
  const [checkInResult, setCheckInResult] = useState<CompetitionState['checkInResult']>(null);

  const refreshLeaderboard = useCallback(async (nextGameType?: number) => {
    const selectedGameType = Number.isFinite(nextGameType) ? Number(nextGameType) : gameType;
    setLoading(true);
    setLeaderboardError(null);

    try {
      const leaderboard = await getLeaderboard(selectedGameType);
      setGameType(selectedGameType);
      setSeasonId(leaderboard.season_id ?? '');
      setLastUpdated(leaderboard.last_updated ?? '');
      setLeaderboardEntries(leaderboardEntriesForGameScope(leaderboard.entries ?? [], selectedGameType, LeaderboardDataScope.Game));
      try {
        const aiLeaderboard = await getLeaderboard(selectedGameType, { aiOnly: true });
        setAiLeaderboardEntries(leaderboardEntriesForGameScope(aiLeaderboard.entries ?? [], selectedGameType, LeaderboardDataScope.AiGame));
      } catch {
        setAiLeaderboardEntries([]);
      }

      if (userId) {
        try {
          const [entry, nearby] = await Promise.all([
            getLeaderboardUser(selectedGameType, userId),
            getLeaderboardNearby(selectedGameType, userId),
          ]);
          setUserEntry(leaderboardEntriesForGameScope([entry], selectedGameType, LeaderboardDataScope.Game)[0] ?? null);
          setNearbyAbove(leaderboardEntriesForGameScope(nearby.above ?? [], selectedGameType, LeaderboardDataScope.Game));
          setNearbyBelow(leaderboardEntriesForGameScope(nearby.below ?? [], selectedGameType, LeaderboardDataScope.Game));
        } catch {
          setUserEntry(null);
          setNearbyAbove([]);
          setNearbyBelow([]);
        }
      } else {
        setUserEntry(null);
        setNearbyAbove([]);
        setNearbyBelow([]);
      }
    } catch (leaderboardError) {
      const message = mapError(leaderboardError, 'Failed to load leaderboard');
      if (isUnsupportedLeaderboardGameTypeError(message)) {
        setGameType(selectedGameType);
        setLeaderboardEntries([]);
        setAiLeaderboardEntries([]);
        setUserEntry(null);
        setNearbyAbove([]);
        setNearbyBelow([]);
        setLeaderboardError(null);
        return;
      }
      setLeaderboardError(message);
    } finally {
      setLoading(false);
    }
  }, [gameType, userId]);

  const loadTournamentBracket = useCallback(async (nextTournamentId: string) => {
    if (!nextTournamentId) {
      return;
    }

    setTournamentError(null);

    try {
      const bracket = await getTournamentBracket(nextTournamentId);
      setTournamentId(nextTournamentId);
      setTournamentBracket(bracket);
    } catch (tournamentError) {
      setTournamentError(mapError(tournamentError, 'Failed to load tournament bracket'));
    }
  }, []);

  const registerForTournament = useCallback(async (nextTournamentId: string) => {
    if (!nextTournamentId) {
      return;
    }

    setRegistering(true);
    setTournamentError(null);

    try {
      await registerTournament(nextTournamentId);
      const bracket = await getTournamentBracket(nextTournamentId);
      setTournamentId(nextTournamentId);
      setTournamentBracket(bracket);
    } catch (registrationError) {
      setTournamentError(mapError(registrationError, 'Failed to register for tournament'));
    } finally {
      setRegistering(false);
    }
  }, []);

  const refreshPrograms = useCallback(async (filter: CompetitionProgramsFilter = {}) => {
    setProgramsLoading(true);
    setProgramsError(null);

    try {
      const response = await listCompetitionPrograms({
        type: filter.type ?? programType,
        status: filter.status ?? programStatus,
        gameId: filter.gameId ?? programGameId,
      });
      const nextPrograms = response.programs ?? [];
      const nextFeaturedProgramId = response.featuredProgramId ?? nextPrograms.find(program => program.featured)?.programId ?? nextPrograms[0]?.programId ?? null;
      const nextSelectedProgram = selectedProgramId
        ? nextPrograms.find(program => program.programId === selectedProgramId) ?? nextPrograms.find(program => program.programId === nextFeaturedProgramId) ?? nextPrograms[0] ?? null
        : nextPrograms.find(program => program.programId === nextFeaturedProgramId) ?? nextPrograms[0] ?? null;
      setPrograms(nextPrograms);
      setFeaturedProgramId(nextFeaturedProgramId);
      setSelectedProgram(nextSelectedProgram);
    } catch (programsError) {
      setProgramsError(mapError(programsError, 'Failed to load competitions'));
      setPrograms([]);
      setFeaturedProgramId(null);
      setSelectedProgram(null);
    } finally {
      setProgramsLoading(false);
    }
  }, [programGameId, programStatus, programType, selectedProgramId]);

  const loadProgram = useCallback(async (programId: string) => {
    if (!programId) return;

    setProgramsLoading(true);
    setProgramsError(null);

    try {
      const response = await getCompetitionProgram(programId);
      setSelectedProgram(response.program);
      setPrograms(previousPrograms => {
        const existingIndex = previousPrograms.findIndex(program => program.programId === response.program.programId);
        if (existingIndex < 0) return [response.program, ...previousPrograms];
        return previousPrograms.map(program => program.programId === response.program.programId ? response.program : program);
      });
      setFeaturedProgramId(previousId => previousId ?? response.program.programId);
    } catch (programError) {
      setProgramsError(mapError(programError, 'Failed to load competition'));
    } finally {
      setProgramsLoading(false);
    }
  }, []);

  const registerProgram = useCallback(async (programId: string) => {
    if (!programId) return;

    setRegisteringProgramId(programId);
    setProgramsError(null);
    setRegistrationResult(null);

    try {
      const response = await registerCompetitionProgram(programId);
      setRegistrationResult(response);
      if (response.registered) {
        await refreshPrograms();
      }
    } catch (registrationError) {
      setProgramsError(mapError(registrationError, 'Failed to register for competition'));
    } finally {
      setRegisteringProgramId(null);
    }
  }, [refreshPrograms]);

  const checkInProgram = useCallback(async (programId: string) => {
    if (!programId) return;

    setCheckingInProgramId(programId);
    setProgramsError(null);
    setCheckInResult(null);

    try {
      const response = await checkInCompetitionProgram(programId);
      setCheckInResult(response);
    } catch (checkInError) {
      setProgramsError(mapError(checkInError, 'Failed to check in'));
    } finally {
      setCheckingInProgramId(null);
    }
  }, []);

  useEffect(() => {
    void refreshLeaderboard(CompetitionDefaultGameType);
    if (loadDefaultTournament) {
      void loadTournamentBracket(CompetitionDefaultTournamentId);
    }
  }, [refreshLeaderboard, loadTournamentBracket, loadDefaultTournament]);

  useEffect(() => {
    if (!loadPrograms) return;
    void refreshPrograms();
  }, [loadPrograms, refreshPrograms]);

  useEffect(() => {
    if (!loadPrograms || !selectedProgramId) return;
    void loadProgram(selectedProgramId);
  }, [loadProgram, loadPrograms, selectedProgramId]);

  return {
    loading,
    registering,
    error: leaderboardError ?? tournamentError ?? programsError,
    leaderboardError,
    tournamentError,
    gameType,
    seasonId,
    lastUpdated,
    leaderboardEntries,
    aiLeaderboardEntries,
    userEntry,
    nearbyAbove,
    nearbyBelow,
    tournamentId,
    tournamentBracket,
    programs,
    featuredProgramId,
    selectedProgram,
    programsLoading,
    programsError,
    registeringProgramId,
    checkingInProgramId,
    registrationResult,
    checkInResult,
    refreshLeaderboard,
    loadTournamentBracket,
    registerForTournament,
    refreshPrograms,
    loadProgram,
    registerProgram,
    checkInProgram,
  };
}
