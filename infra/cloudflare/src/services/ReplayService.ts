import type { Env } from '@/constants/env';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { StateSyncService, type MatchCache, type MoveRecord } from '@/services/StateSyncService';

export interface ReplayEvent {
  type: 'STATE' | 'MOVE';
  timestamp: number;
  data?: unknown;
  hash?: string;
  playerId?: string;
}

export interface Replay {
  matchId: string;
  version: string;
  createdAt: number;
  initialState: unknown;
  timeline: ReplayEvent[];
  finalState: unknown;
  verification: {
    solanaMatchPda: string;
    stateHashes: string[];
    merkleRoot: string;
  };
}

function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map((v) => canonicalJson(v)).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => JSON.stringify(k) + ':' + canonicalJson(obj[k]));
  return '{' + pairs.join(',') + '}';
}

async function sha256Hex(data: string): Promise<string> {
  const bytes = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashState(state: unknown): Promise<string> {
  return sha256Hex(canonicalJson(state));
}

function merklePairHash(a: string, b: string): string {
  return a < b ? a + b : b + a;
}

async function hashMerklePair(a: string, b: string): Promise<string> {
  return sha256Hex(merklePairHash(a, b));
}

export async function computeMerkleRoot(hashes: string[]): Promise<string> {
  if (hashes.length === 0) return sha256Hex('empty');
  if (hashes.length === 1) return hashes[0];
  const next: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    const a = hashes[i];
    const b = i + 1 < hashes.length ? hashes[i + 1] : a;
    next.push(await hashMerklePair(a, b));
  }
  return await computeMerkleRoot(next);
}

export class ReplayService {
  constructor(private readonly env: Env) {}

  async getMatch(matchId: string): Promise<MatchCache | null> {
    const sync = new StateSyncService(this.env);
    return sync.getMatchState(matchId);
  }

  async getMoves(matchId: string): Promise<MoveRecord[]> {
    const match = await this.getMatch(matchId);
    return match?.moveHistory ?? [];
  }

  private applyMove(state: unknown, _move: MoveRecord): unknown {
    return (_move.stateAfter !== undefined ? _move.stateAfter : state) as unknown;
  }

  async generateReplay(matchId: string): Promise<Replay> {
    const match = await this.getMatch(matchId);
    if (!match) throw new Error(`Match not found: ${matchId}`);
    const moves = match.moveHistory ?? [];
    const initialState: unknown = match.initialState ?? match.gameState ?? {};
    const timeline: ReplayEvent[] = [];
    let currentState: unknown = initialState;

    for (const move of moves) {
      const stateBefore = move.stateBefore ?? currentState;
      const stateAfter = move.stateAfter ?? this.applyMove(currentState, move);
      const ts = move.timestamp;

      const stateBeforeHash = await hashState(stateBefore);
      timeline.push({ type: 'STATE', timestamp: ts, data: stateBefore, hash: stateBeforeHash });
      timeline.push({ type: 'MOVE', timestamp: ts, data: move.data, playerId: move.playerId });
      const stateAfterHash = await hashState(stateAfter);
      timeline.push({ type: 'STATE', timestamp: ts, data: stateAfter, hash: stateAfterHash });

      currentState = stateAfter;
    }

    const stateHashes = timeline.filter((e) => e.type === 'STATE').map((e) => e.hash ?? '');
    const merkleRoot = await computeMerkleRoot(stateHashes);

    const replay: Replay = {
      matchId,
      version: '1.0',
      createdAt: Date.now(),
      initialState,
      timeline,
      finalState: currentState,
      verification: {
        solanaMatchPda: match.solanaMatchPda ?? '',
        stateHashes,
        merkleRoot,
      },
    };

    await this.storeReplay(matchId, replay);
    return replay;
  }

  private replayR2Key(matchId: string): string {
    return `${BucketPath.Matches}${matchId}/replay.json`;
  }

  async storeReplay(matchId: string, replay: Replay): Promise<void> {
    const bucket = this.env.MATCHES_BUCKET;
    if (!bucket) return;
    const key = this.replayR2Key(matchId);
    await bucket.put(key, JSON.stringify(replay), {
      httpMetadata: { contentType: HttpContentType.ApplicationJson },
    });
  }

  async loadReplay(matchId: string): Promise<Replay | null> {
    const bucket = this.env.MATCHES_BUCKET;
    if (!bucket) return null;
    const key = this.replayR2Key(matchId);
    const obj = await bucket.get(key);
    if (!obj) return null;
    const text = await obj.text();
    try {
      return JSON.parse(text) as Replay;
    } catch {
      return null;
    }
  }

  async verifyReplay(replay: Replay): Promise<boolean> {
    const stateEvents = replay.timeline.filter((e) => e.type === 'STATE');
    for (let i = 0; i < stateEvents.length; i++) {
      const event = stateEvents[i];
      const computed = await hashState(event.data);
      if (event.hash !== undefined && computed !== event.hash) return false;
    }
    const stateHashes = stateEvents.map((e) => e.hash ?? '');
    const computedRoot = await computeMerkleRoot(stateHashes);
    if (computedRoot !== replay.verification.merkleRoot) return false;
    const lastStateEvent = stateEvents[stateEvents.length - 1];
    if (!lastStateEvent) {
      if (replay.timeline.length !== 0) return false;
      const hi = await hashState(replay.initialState);
      const hf = await hashState(replay.finalState);
      return hi === hf;
    }
    const finalComputed = await hashState(lastStateEvent.data);
    const expectedFinal = await hashState(replay.finalState);
    return finalComputed === expectedFinal;
  }
}
