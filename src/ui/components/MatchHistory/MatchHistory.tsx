import { useState, useEffect, useCallback } from 'react';
import { useSolanaWallet } from '@services/solana/wallet';
import { useConnection } from '@solana/wallet-adapter-react';
import { GameClient } from '@services/solana/GameClient';
import { MatchEventCollector } from '@lib/match-recording/MatchEventCollector';
import type { MatchRecord } from '@lib/match-recording/types';
import { VerificationBadge } from './VerificationBadge';
import { MatchDetail } from './MatchDetail';
import './MatchHistory.css';

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
          console.error(`Failed to load match ${matchId}:`, error);
        }
      }

      // Per critique Phase 2: Handle new schema (start_time, match_id)
      setMatches(matchRecords.sort((a, b) => {
        const aTime = a.start_time ? new Date(a.start_time).getTime() : (a.createdAt || 0);
        const bTime = b.start_time ? new Date(b.start_time).getTime() : (b.createdAt || 0);
        return bTime - aTime;
      }));
    } catch (error) {
      console.error('Failed to load match history:', error);
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

