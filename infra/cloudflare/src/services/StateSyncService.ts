import type { Env } from '@/constants/env';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { MatchShardDO, StateSyncCoordinatorDO } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { DOBaseUrl } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { SolanaRPC } from '@/services/solana-rpc';

export interface MoveRecord {
  moveId: string;
  playerId: string;
  timestamp: number;
  data: unknown;
  stateBefore?: unknown;
  stateAfter?: unknown;
  stateBeforeHash?: string;
  stateAfterHash?: string;
  moveHash?: string;
  signature?: string;
  valid?: boolean;
  disputed?: boolean;
  validatorVersion?: string;
  isAiMove?: boolean;
  aiConfidence?: number;
  aiReasoning?: string;
}

export interface MatchCache {
  matchId: string;
  solanaMatchPda: string;
  lastSyncedSlot: number;
  lastSyncedAt: number;
  syncStatus: 'synced' | 'pending' | 'stale' | 'conflict';
  gameType: number;
  status: string;
  turnCount: number;
  stateHash: string;
  merkleRoot?: string;
  gameState?: unknown;
  initialState?: unknown;
  initialStateHash?: string;
  finalStateHash?: string;
  moveHistory?: MoveRecord[];
  createdAt: number;
  updatedAt: number;
  disputes?: Array<{ disputeId: string; [k: string]: unknown }>;
  transactionSignatures?: string[];
  randomnessSource?: string;
  randomnessCommitments?: string[];
}

export interface ReconciliationReport {
  matchId: string;
  timestamp: number;
  discrepancies: Array<{ field: string; solanaValue: unknown; cloudflareValue: unknown }>;
  resolution: 'none' | 'solana_wins' | 'no_conflict';
}

export class StateSyncService {
  private readonly solanaRpc: SolanaRPC | null;

  constructor(private readonly env: Env) {
    this.solanaRpc = SolanaRPC.fromEnv(env);
  }

  private getMatchStub(matchId: string): DurableObjectStub | null {
    if (!this.env.MATCH_SHARD_DO) return null;
    const id = this.env.MATCH_SHARD_DO.idFromName(matchId);
    return this.env.MATCH_SHARD_DO.get(id);
  }

  private getCoordinatorStub(): DurableObjectStub | null {
    if (!this.env.STATE_SYNC_COORDINATOR) return null;
    const id = this.env.STATE_SYNC_COORDINATOR.idFromName('coordinator');
    return this.env.STATE_SYNC_COORDINATOR.get(id);
  }

  async syncFromSolana(matchId: string, solanaMatchPda: string, state: unknown, slot: number): Promise<MatchCache | null> {
    const stub = this.getMatchStub(matchId);
    if (!stub) return null;
    const url = `${DOBaseUrl}${MatchShardDO.Sync(matchId)}`;
    const response = await stub.fetch(url, {
      method: HttpMethod.Post,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({ solanaMatchPda, state, slot }),
    });
    if (!response.ok) {
      await response.text().catch(() => undefined);
      return null;
    }
    const text = await response.text();
    try {
      return JSON.parse(text) as MatchCache;
    } catch {
      return null;
    }
  }

  async getMatchState(matchId: string): Promise<MatchCache | null> {
    const stub = this.getMatchStub(matchId);
    if (!stub) return null;
    const url = `${DOBaseUrl}${MatchShardDO.State(matchId)}`;
    const response = await stub.fetch(url, { method: HttpMethod.Get });
    if (!response.ok) {
      await response.text().catch(() => undefined);
      return null;
    }
    const text = await response.text();
    try {
      return text ? (JSON.parse(text) as MatchCache) : null;
    } catch {
      return null;
    }
  }

  async registerMatch(matchId: string): Promise<boolean> {
    const stub = this.getCoordinatorStub();
    if (!stub) return false;
    const url = `${DOBaseUrl}${StateSyncCoordinatorDO.Register}?matchId=${encodeURIComponent(matchId)}`;
    const response = await stub.fetch(url, { method: HttpMethod.Post });
    await response.text().catch(() => undefined);
    return response.ok;
  }

  async unregisterMatch(matchId: string): Promise<boolean> {
    const stub = this.getCoordinatorStub();
    if (!stub) return false;
    const url = `${DOBaseUrl}${StateSyncCoordinatorDO.Unregister}?matchId=${encodeURIComponent(matchId)}`;
    const response = await stub.fetch(url, { method: HttpMethod.Post });
    await response.text().catch(() => undefined);
    return response.ok;
  }

  async getSyncHealth(): Promise<{ health: string; mode?: string }> {
    if (!this.solanaRpc) {
      return { health: 'unconfigured' };
    }
    const health = await this.solanaRpc.getHealth();
    const coordinator = this.getCoordinatorStub();
    if (!coordinator) {
      return { health: health === 'ok' ? 'ok' : health === 'down' ? 'down' : 'degraded' };
    }
    const url = `${DOBaseUrl}${StateSyncCoordinatorDO.HealthCheck}`;
    const response = await coordinator.fetch(url, { method: HttpMethod.Get });
    if (!response.ok) {
      await response.text().catch(() => undefined);
      return { health: health === 'ok' ? 'ok' : health === 'down' ? 'down' : 'degraded' };
    }
    const data = (await response.json()) as { health?: string; mode?: string };
    return { health: data.health ?? health, mode: data.mode };
  }

  normalizeSolanaState(data: unknown): { stateHash: string; turnCount: number; gameType: number; status: string } {
    const obj = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    const stateHashRaw = obj.stateHash ?? obj.state_hash;
    let stateHash = '';
    if (typeof stateHashRaw === 'string') stateHash = stateHashRaw;
    else if (Array.isArray(stateHashRaw)) {
      stateHash = Array.from(stateHashRaw)
        .map((b) => (typeof b === 'number' ? b : 0).toString(16).padStart(2, '0'))
        .join('');
    }
    const turnCount = Number(obj.turnCount ?? obj.turn_count ?? 0);
    const gameType = Number(obj.gameType ?? obj.game_type ?? 0);
    const status = String(obj.status ?? 'active');
    return { stateHash, turnCount, gameType, status };
  }

  async fetchStateFromSolana(solanaMatchPda: string): Promise<{ state: { stateHash: string; turnCount: number; gameType: number; status: string }; slot: number } | null> {
    if (!this.solanaRpc) return null;
    const account = await this.solanaRpc.getAccountInfo(solanaMatchPda);
    if (!account?.data) return null;
    const state = this.normalizeSolanaState(account.data);
    return { state, slot: account.slot ?? 0 };
  }

  async reconcile(matchId: string): Promise<ReconciliationReport | null> {
    const stub = this.getMatchStub(matchId);
    if (!stub) return null;
    const state = await this.getMatchState(matchId);
    const report: ReconciliationReport = {
      matchId,
      timestamp: Date.now(),
      discrepancies: [],
      resolution: 'no_conflict',
    };
    if (!state) return report;
    if (this.solanaRpc && state.solanaMatchPda) {
      const account = await this.solanaRpc.getAccountInfo(state.solanaMatchPda);
      if (account && account.data && typeof account.data === 'object') {
        const obj = account.data as Record<string, unknown>;
        const onChainHash = this.normalizeSolanaState(account.data).stateHash || String(obj.stateHash ?? obj.state_hash ?? '');
        if (state.stateHash !== onChainHash) {
          report.discrepancies.push({ field: 'stateHash', solanaValue: onChainHash, cloudflareValue: state.stateHash });
          report.resolution = 'solana_wins';
        }
        if (report.resolution === 'solana_wins') {
          const normalized = this.normalizeSolanaState(account.data);
          const slot = account.slot ?? 0;
          await this.syncFromSolana(matchId, state.solanaMatchPda, normalized, slot);
        }
      }
    }
    return report;
  }
}
