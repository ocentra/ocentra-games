import type { MatchRecord } from '../types';
import { CanonicalJSON } from './CanonicalJSON';

export class CanonicalSerializer {
  static canonicalizeMatchRecord(match: MatchRecord): Uint8Array {
    const canonical = this.normalizeMatchRecord(match);
    const jsonString = CanonicalJSON.stringify(canonical);
    return new TextEncoder().encode(jsonString);
  }

  /**
   * Validates version field per spec Section 25.
   * Version must be semantic version string (e.g., "1.0.0").
   */
  private static validateVersion(version: string): void {
    // Semantic version pattern: MAJOR.MINOR.PATCH
    const versionPattern = /^\d+\.\d+\.\d+$/;
    if (!versionPattern.test(version)) {
      throw new Error(`Invalid version format: ${version}. Must be semantic version (e.g., "1.0.0")`);
    }
  }

  private static normalizeMatchRecord(match: MatchRecord): unknown {
    // Validate version field (critical for canonical rule changes per spec Section 25)
    const version = match.version || '1.0.0';
    this.validateVersion(version);

    // Per critique Phase 2.2: Use new schema fields per spec Section 4
    const normalized: Record<string, unknown> = {
      match_id: match.match_id || match.matchId || '',
      version,
    };

    // Add game object if available
    if (match.game) {
      normalized.game = match.game;
    } else if (match.gameName || match.gameType) {
      // Migrate from legacy fields
      normalized.game = {
        name: match.gameName || match.gameType || 'CLAIM',
        ruleset: match.gameType || 'default',
      };
    }

    // Timestamps: use new ISO8601 fields or convert from legacy
    if (match.start_time) {
      normalized.start_time = match.start_time;
    } else if (match.createdAt !== undefined) {
      normalized.start_time = this.toISO8601(match.createdAt);
    } else {
      normalized.start_time = this.toISO8601(Date.now());
    }

    if (match.end_time) {
      normalized.end_time = match.end_time;
    } else if (match.endedAt !== undefined) {
      normalized.end_time = this.toISO8601(match.endedAt);
    }

    // Seed: convert to string if number
    if (match.seed !== undefined) {
      normalized.seed = typeof match.seed === 'string' ? match.seed : String(match.seed);
    }

    // Players: migrate to new schema
    normalized.players = match.players.map((p) => {
      const player: Record<string, unknown> = {
        player_id: p.player_id || p.pubkey || p.public_key || '',
        type: p.type || 'human',
      };
      if (p.public_key || p.pubkey) {
        player.public_key = p.public_key || p.pubkey;
      }
      if (p.metadata) {
        player.metadata = p.metadata;
      }
      return player;
    });

    // Moves: migrate to new schema
    normalized.moves = match.moves.map((m) => {
      const move: Record<string, unknown> = {
        index: m.index !== undefined ? m.index : (m.moveIndex ?? 0),
        timestamp: typeof m.timestamp === 'string' ? m.timestamp : this.toISO8601(m.timestamp as number),
        player_id: m.player_id || m.playerPubkey || '',
        action: m.action || m.actionTypeName || `action_${m.actionType ?? 0}`,
        payload: m.payload,
      };
      if (m.proofs) {
        move.proofs = m.proofs;
      }
      return move;
    });

    // Optional fields per spec
    if (match.artifacts && match.artifacts.length > 0) {
      normalized.artifacts = match.artifacts;
    }
    if (match.chain_of_thought) {
      normalized.chain_of_thought = match.chain_of_thought;
    }
    if (match.model_versions) {
      normalized.model_versions = match.model_versions;
    }

    // Storage object
    if (match.storage?.hot_url || match.hotUrl) {
      normalized.storage = {
        hot_url: match.storage?.hot_url || match.hotUrl || null,
      };
    }

    // Signatures
    normalized.signatures = (match.signatures || []).map((sig) => ({
      signer: sig.signer,
      sig_type: sig.sig_type,
      signature: sig.signature,
      signed_at: sig.signed_at,  // Already ISO8601 format
    }));

    return normalized;
  }

  /**
   * Converts timestamp to ISO8601 UTC with milliseconds precision.
   * Per spec Section 4: timestamps must be in format "2025-11-12T15:23:30.123Z"
   * 
   * @param timestamp - Unix timestamp in seconds (if < 1e12) or milliseconds (if >= 1e12)
   */
  private static toISO8601(timestamp: number): string {
    // Determine if timestamp is in seconds or milliseconds
    // Timestamps before year 2001 (978307200000 ms) are likely seconds
    // Timestamps after are likely milliseconds
    let ms: number;
    if (timestamp < 1e12) {
      // Likely seconds, convert to milliseconds
      ms = timestamp * 1000;
    } else {
      // Likely already milliseconds
      ms = timestamp;
    }

    const date = new Date(ms);
    
    // Format with milliseconds precision: YYYY-MM-DDTHH:mm:ss.sssZ
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
  }
}

