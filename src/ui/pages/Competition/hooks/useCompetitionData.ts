import { useCallback, useEffect, useState } from 'react';
import {
  getLeaderboard,
  getLeaderboardNearby,
  getLeaderboardUser,
  getTournamentBracket,
  registerTournament,
  type LeaderboardEntry,
} from '@ocentra/api-domain/competition';
import {
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
}

interface CompetitionDataOptions {
  loadDefaultTournament?: boolean;
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

export function useCompetitionData(userId: string | null, options: CompetitionDataOptions = {}): CompetitionData {
  const loadDefaultTournament = options.loadDefaultTournament ?? true;
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [tournamentError, setTournamentError] = useState<string | null>(null);
  const [gameType, setGameType] = useState(CompetitionDefaultGameType);
  const [seasonId, setSeasonId] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);
  const [nearbyAbove, setNearbyAbove] = useState<LeaderboardEntry[]>([]);
  const [nearbyBelow, setNearbyBelow] = useState<LeaderboardEntry[]>([]);
  const [tournamentId, setTournamentId] = useState(CompetitionDefaultTournamentId);
  const [tournamentBracket, setTournamentBracket] = useState<CompetitionState['tournamentBracket']>(null);

  const refreshLeaderboard = useCallback(async (nextGameType?: number) => {
    const selectedGameType = Number.isFinite(nextGameType) ? Number(nextGameType) : gameType;
    setLoading(true);
    setLeaderboardError(null);

    try {
      const leaderboard = await getLeaderboard(selectedGameType);
      setGameType(selectedGameType);
      setSeasonId(leaderboard.season_id ?? '');
      setLastUpdated(leaderboard.last_updated ?? '');
      setLeaderboardEntries(leaderboard.entries ?? []);

      if (userId) {
        try {
          const [entry, nearby] = await Promise.all([
            getLeaderboardUser(selectedGameType, userId),
            getLeaderboardNearby(selectedGameType, userId),
          ]);
          setUserEntry(entry);
          setNearbyAbove(nearby.above ?? []);
          setNearbyBelow(nearby.below ?? []);
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

  useEffect(() => {
    void refreshLeaderboard(CompetitionDefaultGameType);
    if (loadDefaultTournament) {
      void loadTournamentBracket(CompetitionDefaultTournamentId);
    }
  }, [refreshLeaderboard, loadTournamentBracket, loadDefaultTournament]);

  return {
    loading,
    registering,
    error: leaderboardError ?? tournamentError,
    leaderboardError,
    tournamentError,
    gameType,
    seasonId,
    lastUpdated,
    leaderboardEntries,
    userEntry,
    nearbyAbove,
    nearbyBelow,
    tournamentId,
    tournamentBracket,
    refreshLeaderboard,
    loadTournamentBracket,
    registerForTournament,
  };
}
