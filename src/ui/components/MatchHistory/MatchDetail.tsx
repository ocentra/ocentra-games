import { useState, useEffect, useCallback } from 'react';
import type { MatchRecord } from '@lib/match-recording/types';
import { MatchVerifier } from '@services/verification/MatchVerifier';
import { useSolanaWallet } from '@services/solana/wallet';
import { GameClient } from '@services/solana/GameClient';
import { VerificationBadge } from './VerificationBadge';
import type { VerificationResult } from '@services/verification/MatchVerifier';

interface MatchDetailProps {
  match: MatchRecord;
  onBack: () => void;
}

export function MatchDetail({ match, onBack }: MatchDetailProps) {
  const { anchorClient } = useSolanaWallet();
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  const verifyMatch = useCallback(async () => {
    if (!anchorClient) {
      return;
    }

    setVerifying(true);
    try {
      const gameClient = new GameClient(anchorClient);
      const verifier = new MatchVerifier(gameClient);
      // Per critique Phase 2: Handle new schema (match_id)
      const matchId = match.match_id || match.matchId || '';
      const result = await verifier.verifyMatch(matchId, match);
      setVerificationResult(result);
    } catch (error) {
      console.error('Verification failed:', error);
    } finally {
      setVerifying(false);
    }
  }, [anchorClient, match]);

  useEffect(() => {
    if (anchorClient) {
      verifyMatch();
    }
  }, [anchorClient, verifyMatch]);

  return (
    <div className="match-detail">
      <button onClick={onBack} className="match-detail-back">
        ← Back
      </button>

      <div className="match-detail-header">
        <h2>Match Details</h2>
        <VerificationBadge
          matchId={match.match_id || match.matchId || ''}
          matchHash={match.matchHash}
          verified={verificationResult?.isValid}
        />
      </div>

      <div className="match-detail-info">
        {/* Per critique Phase 2: Handle new schema */}
        <div>
          <strong>Match ID:</strong> {match.match_id || match.matchId || 'N/A'}
        </div>
        <div>
          <strong>Game:</strong> {match.game?.name || match.gameName || 'Unknown'}
        </div>
        <div>
          <strong>Version:</strong> {match.version || '1.0.0'}
        </div>
        <div>
          <strong>Players:</strong> {match.players.length}
        </div>
        <div>
          <strong>Moves:</strong> {match.moves?.length || 0}
        </div>
        <div>
          <strong>Started:</strong> {match.start_time 
            ? new Date(match.start_time).toLocaleString() 
            : (match.createdAt ? new Date(match.createdAt * 1000).toLocaleString() : 'N/A')}
        </div>
        {match.end_time && (
          <div>
            <strong>Ended:</strong> {new Date(match.end_time).toLocaleString()}
          </div>
        )}
        {match.endedAt && !match.end_time && (
          <div>
            <strong>Ended:</strong> {new Date(match.endedAt * 1000).toLocaleString()}
          </div>
        )}
        {match.matchHash && (
          <div>
            <strong>Hash:</strong> <code>{match.matchHash}</code>
          </div>
        )}
        {/* Per critique Phase 11.1: Canonical record display */}
        {match.storage?.hot_url && (
          <div>
            <strong>Storage URL:</strong> <a href={match.storage.hot_url} target="_blank" rel="noopener noreferrer">{match.storage.hot_url}</a>
          </div>
        )}
      </div>

      {verifying && <div>Verifying match...</div>}
      {verificationResult && (
        <div className="match-detail-verification">
          <h3>Verification Result</h3>
          {verificationResult.isValid ? (
            <div className="verification-success">✓ Match verified successfully</div>
          ) : (
            <div className="verification-failed">
              ✗ Verification failed
              <ul>
                {verificationResult.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {verificationResult.warnings.length > 0 && (
            <div className="verification-warnings">
              <strong>Warnings:</strong>
              <ul>
                {verificationResult.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Per critique Phase 11.1: Replay functionality */}
      <div className="match-detail-actions">
        <button onClick={() => {
          // TODO: Implement replay viewer
          console.log('Replay match:', match.match_id || match.matchId);
        }}>
          Replay Match
        </button>
        <button onClick={() => {
          // Per critique Phase 11.1: Display canonical record
          const canonical = JSON.stringify(match, null, 2);
          const blob = new Blob([canonical], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${match.match_id || match.matchId || 'match'}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }}>
          Download Canonical Record
        </button>
      </div>

      <div className="match-detail-moves">
        <h3>Moves</h3>
        <div className="match-detail-moves-list">
          {match.moves?.map((move, idx) => {
            // Per critique Phase 2: Handle new schema
            const moveIndex = move.index ?? move.moveIndex ?? idx;
            const action = move.action || move.actionTypeName || 'unknown';
            const playerId = move.player_id || move.playerPubkey || '';
            const timestamp = typeof move.timestamp === 'string'
              ? new Date(move.timestamp).getTime()
              : (typeof move.timestamp === 'number' 
                  ? (move.timestamp > 1e12 ? move.timestamp : move.timestamp * 1000)
                  : Date.now());
            
            return (
              <div key={moveIndex} className="match-detail-move">
                <div>
                  <strong>Move {moveIndex}:</strong> {action} by {playerId.slice(0, 8)}...
                </div>
                <div className="match-detail-move-time">
                  {new Date(timestamp).toLocaleTimeString()}
                </div>
              </div>
            );
          }) || []}
        </div>
      </div>
    </div>
  );
}


