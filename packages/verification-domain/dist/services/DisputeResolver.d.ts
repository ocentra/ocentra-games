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
    players: Array<{
        player_id: string;
        [key: string]: unknown;
    }>;
    moves: Array<{
        player_id: string;
        timestamp: string;
        [key: string]: unknown;
    }>;
    [key: string]: unknown;
}
export declare class DisputeResolver {
    attemptAutoResolution(dispute: Dispute, matchRecord: DisputeMatchRecord): Promise<Dispute['resolution'] | null>;
    private autoResolveScoreError;
    private autoResolveTimeout;
    resolveDispute(_dispute: Dispute, validatorDecision: 'accepted' | 'rejected', reason: string, correctedScore?: Record<string, number>): Dispute['resolution'];
}
