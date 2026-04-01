import { useState, useEffect, useCallback } from 'react';
import { useSolanaWallet } from '@/adapters/solana/wallet/useSolanaWallet';
import { useConnection } from '@solana/wallet-adapter-react';
import { GameClient } from '@ocentra/solana-domain/GameClient';
import { MatchEventCollector } from '@ocentra/solana-domain/MatchEventCollector';
import type { MatchRecord } from '@ocentra/verification-domain/types';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { VerificationBadge } from './VerificationBadge';
import { MatchDetail } from './MatchDetail';
import './MatchHistory.css';

const log = MainAppLogger.instance;
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

export function MatchHistory() {
  const { anchorClient } = useSolanaWallet();
  const { connection } = useConnection();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMatchHistory = useCallback(async () => {
    if (!anchorClient || !connection) {
      return;
    }

    setLoading(true);
    try {
      const gameClient = new GameClient(anchorClient);
      const collector = new MatchEventCollector(gameClient);

      const matchIds = await getMatchIdsForWallet();
      const matchRecords: MatchRecord[] = [];

      for (const matchId of matchIds) {
        try {
          const record = await collector.collectMatchRecord(matchId);
          if (record) {
            matchRecords.push(record);
          }
        } catch (error) {
          logError(`Failed to load match ${matchId}:`, { data: error });
        }
      }

      // Per critique Phase 2: Handle new schema (start_time, match_id)
      setMatches(matchRecords.sort((a, b) => {
        const aTime = a.start_time ? new Date(a.start_time).getTime() : (a.createdAt || 0);
        const bTime = b.start_time ? new Date(b.start_time).getTime() : (b.createdAt || 0);
        return bTime - aTime;
      }));
    } catch (error) {
      logError('Failed to load match history:', { data: error });
    } finally {
      setLoading(false);
    }
  }, [anchorClient, connection]);

  useEffect(() => {
    loadMatchHistory();
  }, [loadMatchHistory]);

  const getMatchIdsForWallet = async (): Promise<string[]> => {
    return [];
  };

  if (loading) {
    return <div className="match-history-loading">Loading match history...</div>;
  }

  if (selectedMatch) {
    return <MatchDetail match={selectedMatch} onBack={() => setSelectedMatch(null)} />;
  }

  return (
    <div className="match-history">
      <h2>Match History</h2>
      {matches.length === 0 ? (
        <div className="match-history-empty">No matches found</div>
      ) : (
        <div className="match-history-list">
          {matches.map((match) => {
            // Per critique Phase 2: Handle new schema
            const matchId = match.match_id || match.matchId || '';
            const gameName = match.game?.name || match.gameName || 'Unknown';
            const startTime = match.start_time 
              ? new Date(match.start_time).getTime() 
              : (match.createdAt ? match.createdAt * 1000 : Date.now());
            
            return (
              <div
                key={matchId}
                className="match-history-item"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMatch(match)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedMatch(match);
                  }
                }}
              >
                <div className="match-history-item-header">
                  <span className="match-id">{matchId.slice(0, 8)}...</span>
                  {/* Per critique Phase 11.1: Verification status badges */}
                  <VerificationBadge matchId={matchId} matchHash={match.matchHash} />
                </div>
                <div className="match-history-item-details">
                  <span>Game: {gameName}</span>
                  <span>Players: {match.players.length}</span>
                  <span>Moves: {match.moves?.length || 0}</span>
                  <span>Date: {new Date(startTime).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

