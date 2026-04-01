export interface SignatureRecord {
    signer: string;
    sig_type: 'ed25519' | 'secp256k1';
    signature: string;
    signed_at: string;
}
export interface MatchRecord {
    match_id: string;
    version: string;
    game?: {
        name: string;
        ruleset: string;
    };
    start_time: string;
    end_time?: string;
    seed?: string;
    players: PlayerRecord[];
    moves: MoveRecord[];
    artifacts?: Array<{
        type: string;
        url?: string;
        hash?: string;
        metadata?: unknown;
    }>;
    chain_of_thought?: unknown;
    model_versions?: unknown;
    storage?: {
        hot_url?: string;
    };
    signatures: SignatureRecord[];
    matchId?: string;
    gameType?: string;
    gameName?: string;
    createdAt?: number;
    endedAt?: number;
    matchHash?: string;
    hotUrl?: string;
    solanaTxSignature?: string;
    phase?: number;
}
export interface PlayerRecord {
    player_id: string;
    type: 'human' | 'ai' | 'bot';
    public_key?: string;
    metadata?: unknown;
    pubkey?: string;
    playerIndex?: number;
    joinedAt?: number;
}
export interface MoveRecord {
    index: number;
    timestamp: string;
    player_id: string;
    action: string;
    payload: unknown;
    proofs?: unknown;
    moveIndex?: number;
    playerPubkey?: string;
    playerIndex?: number;
    actionType?: number;
    actionTypeName?: string;
    solanaTxSignature?: string;
}
export interface MatchEvent {
    type: 'match_created' | 'player_joined' | 'match_started' | 'move_submitted' | 'match_ended';
    timestamp: number;
    data: unknown;
    solanaTxSignature?: string;
}
