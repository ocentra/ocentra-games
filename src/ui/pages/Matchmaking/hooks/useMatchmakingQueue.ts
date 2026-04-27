import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  enqueueMatchmaking,
  getMatchmakingStatus,
  leaveMatchmaking,
  type MatchmakingQueueResponse,
  type MatchmakingStatusResponse,
} from '@ocentra/api-domain/multiplayer';
import {
  MatchmakingPollIntervalMs,
  MultiplayerStorageKey,
  readMultiplayerConfig,
  type MultiplayerStoredConfig,
} from '@/ui/pages/Matchmaking/types';
import { GameName, GameTypeId } from '@ocentra/endpoint-domain/constants/game';
import { GameSlug } from '@/constants/game';

export interface MatchmakingQueueState {
  config: MultiplayerStoredConfig;
  ticket: MatchmakingQueueResponse | null;
  status: MatchmakingStatusResponse | null;
  loading: boolean;
  leaving: boolean;
  error: string | null;
  queue: (userId: string) => Promise<void>;
  leave: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  hasMatch: boolean;
  queueStatusLabel: string;
}

function getStatusLabel(
  ticket: MatchmakingQueueResponse | null,
  status: MatchmakingStatusResponse | null
): string {
  if (!ticket) {
    return 'idle';
  }
  if (status?.matchId) {
    return 'matched';
  }
  if (status?.status && status.status.length > 0) {
    return status.status;
  }
  return 'queued';
}

function resolveConfig(gameIdOverride?: string): MultiplayerStoredConfig {
  const stored = readMultiplayerConfig();
  if (!gameIdOverride || stored.gameId === gameIdOverride) {
    return stored;
  }

  const [namePart] = gameIdOverride.split(':');
  const gameName = namePart && namePart.length > 0 ? namePart : gameIdOverride;
  return {
    ...stored,
    gameId: gameIdOverride,
    gameName,
  };
}

function resolveMatchmakingGameType(gameId: string): number {
  const normalized = gameId.trim().toLowerCase();

  if (normalized === GameSlug.Claim || normalized === GameName.Claim.toLowerCase()) {
    return GameTypeId.Claim;
  }

  if (normalized === GameName.Poker.toLowerCase()) {
    return GameTypeId.Poker;
  }

  if (normalized === GameName.WordSearch.toLowerCase() || normalized === 'word-search') {
    return GameTypeId.WordSearch;
  }

  return GameTypeId.Claim;
}

export function useMatchmakingQueue(gameIdOverride?: string): MatchmakingQueueState {
  const [config] = useState<MultiplayerStoredConfig>(() => resolveConfig(gameIdOverride));
  const [ticket, setTicket] = useState<MatchmakingQueueResponse | null>(null);
  const [status, setStatus] = useState<MatchmakingStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!ticket?.ticketId) {
      return;
    }

    try {
      const response = await getMatchmakingStatus(ticket.ticketId);
      setStatus(response);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to load queue status');
    }
  }, [ticket?.ticketId]);

  const queue = useCallback(async (userId: string) => {
    if (!userId) {
      setError('Sign in required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await enqueueMatchmaking({
        userId,
        gameType: resolveMatchmakingGameType(config.gameId),
      });
      setTicket(response);
      setStatus(response);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to join queue');
      setTicket(null);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [config.ai, config.aiModel, config.gameId, config.humans]);

  const leave = useCallback(async () => {
    if (!ticket?.ticketId) {
      return;
    }

    setLeaving(true);
    setError(null);

    try {
      await leaveMatchmaking(ticket.ticketId);
      setTicket(null);
      setStatus(null);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to leave queue');
    } finally {
      setLeaving(false);
    }
  }, [ticket?.ticketId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(MultiplayerStorageKey.Config, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (!ticket?.ticketId) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshStatus();
    }, MatchmakingPollIntervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [refreshStatus, ticket?.ticketId]);

  const hasMatch = Boolean(status?.matchId);
  const queueStatusLabel = useMemo(() => getStatusLabel(ticket, status), [status, ticket]);

  return {
    config,
    ticket,
    status,
    loading,
    leaving,
    error,
    queue,
    leave,
    refreshStatus,
    hasMatch,
    queueStatusLabel,
  };
}
