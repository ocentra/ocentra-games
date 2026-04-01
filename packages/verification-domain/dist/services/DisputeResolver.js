export class DisputeResolver {
    async attemptAutoResolution(dispute, matchRecord) {
        if (dispute.reason === 'score_error') {
            return this.autoResolveScoreError(dispute, matchRecord);
        }
        if (dispute.reason === 'timeout') {
            return this.autoResolveTimeout(dispute, matchRecord);
        }
        return null;
    }
    autoResolveScoreError(dispute, matchRecord) {
        void dispute;
        void matchRecord;
        return null;
    }
    autoResolveTimeout(dispute, matchRecord) {
        const moves = matchRecord.moves || [];
        const disputingPlayerId = dispute.evidence?.[0]?.file_name || '';
        const playerMoves = moves.filter((m) => m.player_id === disputingPlayerId);
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
    resolveDispute(_dispute, validatorDecision, reason, correctedScore) {
        return {
            outcome: validatorDecision === 'accepted' ? 'accepted' : 'rejected',
            corrected_score: correctedScore,
            reason,
            resolved_at: new Date().toISOString(),
        };
    }
}
