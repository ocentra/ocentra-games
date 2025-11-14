/**
 * Signature record per spec Section 4, lines 180-189.
 */
export interface SignatureRecord {
  signer: string;  // pubkey or role identifier (e.g., "coordinator")
  sig_type: 'ed25519' | 'secp256k1';
  signature: string;  // base64 encoded signature
  signed_at: string;  // ISO8601 UTC timestamp with milliseconds
}

/**
 * Match record per spec Section 4, lines 124-164.
 * Per critique Phase 2.1: Updated to match exact spec schema.
 */
export interface MatchRecord {
  match_id: string;  // UUID v4 - per spec line 133
  version: string;  // Schema version (e.g., "1.0.0") - per spec line 134
  game?: {  // Per spec line 135
    name: string;
    ruleset: string;
  };
  start_time: string;  // ISO8601 UTC - per spec line 136 (was createdAt: number)
  end_time?: string;  // ISO8601 UTC - per spec line 137 (was endedAt?: number)
  seed?: string;  // Per spec line 138 (string, not number)
  players: PlayerRecord[];  // Per spec lines 139-151
  moves: MoveRecord[];  // Per spec line 152
  artifacts?: Array<{
    type: string;
    url?: string;
    hash?: string;
    metadata?: unknown;
  }>;  // Per spec line 153
  chain_of_thought?: unknown;  // Per spec line 154
  model_versions?: unknown;  // Per spec line 155
  storage?: {  // Per spec lines 156-161
    hot_url?: string;
  };
  signatures: SignatureRecord[];  // Per spec line 162
  
  // Legacy fields for backward compatibility (will be removed)
  matchId?: string;  // Deprecated: use match_id
  gameType?: string;  // Deprecated: use game.name
  gameName?: string;  // Deprecated: use game.name
  createdAt?: number;  // Deprecated: use start_time
  endedAt?: number;  // Deprecated: use end_time
  matchHash?: string;  // Deprecated: not in spec
  hotUrl?: string;  // Deprecated: use storage.hot_url
  solanaTxSignature?: string;  // Deprecated: not in spec
  phase?: number;  // Deprecated: not in spec
}

/**
 * Player record per spec Section 4, lines 142-150.
 */
export interface PlayerRecord {
  player_id: string;  // UUID or pubkey - per spec line 145
  type: 'human' | 'ai' | 'bot';  // Per spec line 146
  public_key?: string;  // Per spec line 147
  metadata?: unknown;  // Per spec line 148
  
  // Legacy fields for backward compatibility
  pubkey?: string;  // Deprecated: use public_key
  playerIndex?: number;  // Deprecated: not in spec
  joinedAt?: number;  // Deprecated: not in spec
}

/**
 * Move record per spec Section 4, lines 167-178.
 */
export interface MoveRecord {
  index: number;  // Per spec line 171 (was moveIndex)
  timestamp: string;  // ISO8601 UTC - per spec line 172 (was timestamp: number)
  player_id: string;  // Per spec line 173 (was playerPubkey)
  action: string;  // Per spec line 174 (was actionTypeName)
  payload: unknown;  // Per spec line 175
  proofs?: unknown;  // Per spec line 176
  
  // Legacy fields for backward compatibility
  moveIndex?: number;  // Deprecated: use index
  playerPubkey?: string;  // Deprecated: use player_id
  playerIndex?: number;  // Deprecated: not in spec
  actionType?: number;  // Deprecated: not in spec
  actionTypeName?: string;  // Deprecated: use action
  solanaTxSignature?: string;  // Deprecated: not in spec
}

export interface MatchEvent {
  type: 'match_created' | 'player_joined' | 'match_started' | 'move_submitted' | 'match_ended';
  timestamp: number;
  data: unknown;
  solanaTxSignature?: string;
}

