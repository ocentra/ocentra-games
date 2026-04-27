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
  refreshLeaderboard: (nextGameType?: number) => Promise<void>;
  loadTournamentBracket: (tournamentId: string) => Promise<void>;
  registerForTournament: (tournamentId: string) => Promise<void>;
}

function mapError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}

export function useCompetitionData(userId: string | null): CompetitionData {
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);

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
      setError(mapError(leaderboardError, 'Failed to load leaderboard'));
    } finally {
      setLoading(false);
    }
  }, [gameType, userId]);

  const loadTournamentBracket = useCallback(async (nextTournamentId: string) => {
    if (!nextTournamentId) {
      return;
    }

    setError(null);

    try {
      const bracket = await getTournamentBracket(nextTournamentId);
      setTournamentId(nextTournamentId);
      setTournamentBracket(bracket);
    } catch (tournamentError) {
      setError(mapError(tournamentError, 'Failed to load tournament bracket'));
    }
  }, []);

  const registerForTournament = useCallback(async (nextTournamentId: string) => {
    if (!nextTournamentId) {
      return;
    }

    setRegistering(true);
    setError(null);

    try {
      await registerTournament(nextTournamentId);
      const bracket = await getTournamentBracket(nextTournamentId);
      setTournamentId(nextTournamentId);
      setTournamentBracket(bracket);
    } catch (registrationError) {
      setError(mapError(registrationError, 'Failed to register for tournament'));
    } finally {
      setRegistering(false);
    }
  }, []);

  useEffect(() => {
    void refreshLeaderboard(CompetitionDefaultGameType);
    void loadTournamentBracket(CompetitionDefaultTournamentId);
  }, [refreshLeaderboard, loadTournamentBracket]);

  return {
    loading,
    registering,
    error,
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
