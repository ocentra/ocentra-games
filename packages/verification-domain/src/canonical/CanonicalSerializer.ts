import type { MatchRecord } from '../types';
import { CanonicalJSON } from './CanonicalJSON';

export class CanonicalSerializer {
  static canonicalizeMatchRecord(match: MatchRecord): Uint8Array {
    const canonical = this.normalizeMatchRecord(match);
    const jsonString = CanonicalJSON.stringify(canonical);
    return new TextEncoder().encode(jsonString);
  }

  private static validateVersion(version: string): void {
    const versionPattern = /^\d+\.\d+\.\d+$/;
    if (!versionPattern.test(version)) {
      throw new Error(`Invalid version format: ${version}. Must be semantic version (e.g., "1.0.0")`);
    }
  }

  private static normalizeMatchRecord(match: MatchRecord): unknown {
    const version = match.version || '1.0.0';
    this.validateVersion(version);

    const normalized: Record<string, unknown> = {
      match_id: match.match_id || match.matchId || '',
      version,
    };

    if (match.game) {
      normalized.game = match.game;
    } else if (match.gameName || match.gameType) {
      normalized.game = {
        name: match.gameName || match.gameType || 'CLAIM',
        ruleset: match.gameType || 'default',
      };
    }

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

    if (match.seed !== undefined) {
      normalized.seed = typeof match.seed === 'string' ? match.seed : String(match.seed);
    }

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

    if (match.artifacts && match.artifacts.length > 0) {
      normalized.artifacts = match.artifacts;
    }
    if (match.chain_of_thought) {
      normalized.chain_of_thought = match.chain_of_thought;
    }
    if (match.model_versions) {
      normalized.model_versions = match.model_versions;
    }

    if (match.storage?.hot_url || match.hotUrl) {
      normalized.storage = {
        hot_url: match.storage?.hot_url || match.hotUrl || null,
      };
    }

    normalized.signatures = (match.signatures || []).map((sig) => ({
      signer: sig.signer,
      sig_type: sig.sig_type,
      signature: sig.signature,
      signed_at: sig.signed_at,
    }));

    return normalized;
  }

  private static toISO8601(timestamp: number): string {
    let ms: number;
    if (timestamp < 1e12) {
      ms = timestamp * 1000;
    } else {
      ms = timestamp;
    }

    const date = new Date(ms);
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
