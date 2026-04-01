export interface Dispute {
  dispute_id: string;
  match_id: string;
  reason: 'score_error' | 'timeout' | 'cheating' | 'other';
  evidence?: Array<{
    file_name: string;
    storage_key: string;
    size_bytes: number;
    uploaded_at: string;
  }>;
  created_at: string;
  status?: 'pending' | 'assigned' | 'resolved' | 'auto_resolved';
  resolution?: {
    outcome: 'accepted' | 'rejected' | 'auto_corrected';
    corrected_score?: Record<string, number>;
    reason: string;
    resolved_at: string;
  };
}

export interface DisputeMatchRecord {
  match_id: string;
  players: Array<{ player_id: string; [key: string]: unknown }>;
  moves: Array<{ player_id: string; timestamp: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export class DisputeResolver {
  async attemptAutoResolution(
    dispute: Dispute,
    matchRecord: DisputeMatchRecord
  ): Promise<Dispute['resolution'] | null> {
    if (dispute.reason === 'score_error') {
      return this.autoResolveScoreError(dispute, matchRecord);
    }

    if (dispute.reason === 'timeout') {
      return this.autoResolveTimeout(dispute, matchRecord);
    }

    return null;
  }

  private autoResolveScoreError(
    dispute: Dispute,
    matchRecord: DisputeMatchRecord
  ): Dispute['resolution'] | null {
    void dispute;
    void matchRecord;
    return null;
  }

  private autoResolveTimeout(
    dispute: Dispute,
    matchRecord: DisputeMatchRecord
  ): Dispute['resolution'] | null {
    const moves = matchRecord.moves || [];
    const disputingPlayerId = dispute.evidence?.[0]?.file_name || '';

    const playerMoves = moves.filter((m: { player_id?: string }) => m.player_id === disputingPlayerId);
    if (playerMoves.length === 0) {
      return null;
    }

    const lastMove = playerMoves[playerMoves.length - 1];
    const lastMoveTime = new Date(lastMove.timestamp).getTime();
    const disputeTime = new Date(dispute.created_at).getTime();
    const inactiveMinutes = (disputeTime - lastMoveTime) / (1000 * 60);

    if (inactiveMinutes > 5) {
      return {
        outcome: 'auto_corrected',
        reason: `Player inactive for ${inactiveMinutes.toFixed(1)} minutes. Auto-forfeit applied.`,
        resolved_at: new Date().toISOString(),
      };
    }

    return null;
  }

  resolveDispute(
    _dispute: Dispute,
    validatorDecision: 'accepted' | 'rejected',
    reason: string,
    correctedScore?: Record<string, number>
  ): Dispute['resolution'] {
    return {
      outcome: validatorDecision === 'accepted' ? 'accepted' : 'rejected',
      corrected_score: correctedScore,
      reason,
      resolved_at: new Date().toISOString(),
    };
  }
}
