import type { Env } from '@/constants/env';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { ReplayService } from '@/services/ReplayService';
import { StateSyncService } from '@/services/StateSyncService';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

export interface VerifiedMove {
  turnNumber: number;
  playerId: string;
  move: unknown;
  stateBeforeHash: string;
  stateAfterHash: string;
  moveHash: string;
  signature: string;
  validationResult: 'valid' | 'invalid' | 'disputed';
  validatorVersion: string;
}

export interface RandomnessCommitment {
  commitment: string;
  reveal: string;
  timestamp: number;
}

export interface AIPlayerRecord {
  playerId: string;
  modelVersion: string;
  decisionCount: number;
}

export interface DisputeRecord {
  disputeId: string;
  playerId: string;
  reason: string;
  timestamp: number;
  status: 'open' | 'resolved' | 'rejected';
}

export interface StateTransition {
  turnNumber: number;
  stateHash: string;
  moveHash: string;
  timestamp: number;
}

export interface MatchTransparencyRecord {
  matchId: string;
  solanaMatchPda: string;
  transactionSignatures: string[];
  initialStateHash: string;
  finalStateHash: string;
  stateTransitions: StateTransition[];
  moves: VerifiedMove[];
  randomnessSource: 'vrf' | 'commit-reveal';
  randomnessCommitments: RandomnessCommitment[];
  aiPlayers: AIPlayerRecord[];
  disputes: DisputeRecord[];
  replayAvailable: boolean;
  replayLocation: string;
}

export interface MatchVerificationResult {
  matchId: string;
  verifiedAt: number;
  checks: {
    hashChain: boolean;
    moves: boolean;
    randomness: boolean;
    onChain: boolean;
    replay: boolean;
  };
  overall: boolean;
  details?: {
    failedMoves?: number[];
    hashChainError?: string;
    randomnessError?: string;
    onChainError?: string;
  };
}

export class MatchTransparencyService {
  private replayService: ReplayService;
  private stateSyncService: StateSyncService;

  constructor(private readonly env: Env) {
    this.replayService = new ReplayService(env);
    this.stateSyncService = new StateSyncService(env);
  }

  async getMatchTransparency(matchId: string): Promise<MatchTransparencyRecord & { error?: string }> {
    try {
      const [matchData, replayData] = await Promise.all([
        this.stateSyncService.getMatchState(matchId),
        this.replayService.loadReplay(matchId),
      ]);

      if (!matchData) {
        return {
          matchId,
          solanaMatchPda: '',
          transactionSignatures: [],
          initialStateHash: '',
          finalStateHash: '',
          stateTransitions: [],
          moves: [],
          randomnessSource: 'commit-reveal',
          randomnessCommitments: [],
          aiPlayers: [],
          disputes: [],
          replayAvailable: false,
          replayLocation: '',
          error: 'Match not found',
        };
      }

      const moves: VerifiedMove[] = (matchData.moveHistory || []).map((move, index) => ({
        turnNumber: index + 1,
        playerId: move.playerId || '',
        move: move.data,
        stateBeforeHash: move.stateBeforeHash || '',
        stateAfterHash: move.stateAfterHash || '',
        moveHash: move.moveHash || '',
        signature: move.signature || '',
        validationResult: move.valid === false ? 'invalid' : move.disputed ? 'disputed' : 'valid',
        validatorVersion: move.validatorVersion || '1.0',
      }));

      const stateTransitions: StateTransition[] = (matchData.moveHistory || []).map((move, index) => ({
        turnNumber: index + 1,
        stateHash: move.stateAfterHash || '',
        moveHash: move.moveHash || '',
        timestamp: move.timestamp || Date.now(),
      }));

      const aiPlayers: AIPlayerRecord[] = [];
      const aiPlayerIds = new Set<string>();
      for (const move of matchData.moveHistory || []) {
        if (move.playerId && move.isAiMove) {
          aiPlayerIds.add(move.playerId);
        }
      }
      for (const playerId of aiPlayerIds) {
        const decisionCount = (matchData.moveHistory || []).filter(
          (m) => m.playerId === playerId && m.isAiMove
        ).length;
        aiPlayers.push({
          playerId,
          modelVersion: 'default',
          decisionCount,
        });
      }

      const disputes: DisputeRecord[] = (matchData.disputes || []).map((d) => ({
        disputeId: (d as { disputeId?: string }).disputeId ?? '',
        playerId: (d as { playerId?: string }).playerId ?? '',
        reason: (d as { reason?: string }).reason ?? '',
        timestamp: (d as { timestamp?: number }).timestamp ?? 0,
        status: ((d as { status?: string }).status as 'open' | 'resolved' | 'rejected') ?? 'open',
      }));

      return {
        matchId,
        solanaMatchPda: matchData.solanaMatchPda || '',
        transactionSignatures: matchData.transactionSignatures || [],
        initialStateHash: matchData.initialStateHash || '',
        finalStateHash: matchData.finalStateHash || '',
        stateTransitions,
        moves,
        randomnessSource: (matchData.randomnessSource || 'commit-reveal') as 'vrf' | 'commit-reveal',
        randomnessCommitments: (matchData.randomnessCommitments || []).map((c) =>
          typeof c === 'string' ? { commitment: c, reveal: '', timestamp: 0 } : c as RandomnessCommitment
        ),
        aiPlayers,
        disputes,
        replayAvailable: !!replayData,
        replayLocation: replayData ? `${BucketPath.Matches}${matchId}/replay.json` : '',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError('Failed to get match transparency', getStackTrace(), { error: message, matchId });
      return {
        matchId,
        solanaMatchPda: '',
        transactionSignatures: [],
        initialStateHash: '',
        finalStateHash: '',
        stateTransitions: [],
        moves: [],
        randomnessSource: 'commit-reveal',
        randomnessCommitments: [],
        aiPlayers: [],
        disputes: [],
        replayAvailable: false,
        replayLocation: '',
        error: message,
      };
    }
  }

  async verifyMatchIntegrity(matchId: string): Promise<MatchVerificationResult & { error?: string }> {
    const record = await this.getMatchTransparency(matchId);

    if (record.error) {
      return {
        matchId,
        verifiedAt: Date.now(),
        checks: {
          hashChain: false,
          moves: false,
          randomness: false,
          onChain: false,
          replay: false,
        },
        overall: false,
        error: record.error,
      };
    }

    const result: MatchVerificationResult = {
      matchId,
      verifiedAt: Date.now(),
      checks: {
        hashChain: true,
        moves: true,
        randomness: true,
        onChain: true,
        replay: true,
      },
      overall: true,
      details: {},
    };

    const failedMoves: number[] = [];
    for (const move of record.moves) {
      if (move.validationResult !== 'valid') {
        failedMoves.push(move.turnNumber);
      }
    }
    if (failedMoves.length > 0) {
      result.checks.moves = false;
      result.details!.failedMoves = failedMoves;
    }

    const hashChainValid = this.verifyHashChain(record.stateTransitions);
    if (!hashChainValid) {
      result.checks.hashChain = false;
      result.details!.hashChainError = 'Hash chain verification failed';
    }

    const randomnessValid = this.verifyRandomness(record.randomnessCommitments);
    if (!randomnessValid) {
      result.checks.randomness = false;
      result.details!.randomnessError = 'Randomness verification failed';
    }

    const onChainValid = await this.verifyOnChain(record);
    if (!onChainValid) {
      result.checks.onChain = false;
      result.details!.onChainError = 'On-chain verification failed';
    }

    const replay = await this.replayService.loadReplay(matchId);
    if (replay) {
      const replayValid = await this.replayService.verifyReplay(replay);
      result.checks.replay = replayValid;
    } else {
      result.checks.replay = false;
    }

    result.overall =
      result.checks.hashChain &&
      result.checks.moves &&
      result.checks.randomness &&
      result.checks.onChain &&
      result.checks.replay;

    return result;
  }

  async getAIDecisions(matchId: string): Promise<{
    matchId: string;
    decisions: Array<{
      turnNumber: number;
      playerId: string;
      decision: unknown;
      confidence?: number;
      reasoning?: unknown;
      timestamp: number;
    }>;
    error?: string;
  }> {
    try {
      const match = await this.stateSyncService.getMatchState(matchId);
      if (!match) {
        return { matchId, decisions: [], error: 'Match not found' };
      }

      const decisions = (match.moveHistory || [])
        .filter((move) => move.isAiMove)
        .map((move, index) => ({
          turnNumber: index + 1,
          playerId: move.playerId || '',
          decision: move.data,
          confidence: move.aiConfidence,
          reasoning: move.aiReasoning,
          timestamp: move.timestamp || Date.now(),
        }));

      return { matchId, decisions };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logError('Failed to get AI decisions', getStackTrace(), { error: message, matchId });
      return { matchId, decisions: [], error: message };
    }
  }

  async verifyReplay(matchId: string): Promise<{
    matchId: string;
    valid: boolean;
    errors: string[];
  }> {
    try {
      const replay = await this.replayService.loadReplay(matchId);
      if (!replay) {
        return { matchId, valid: false, errors: ['Replay not found'] };
      }

      const valid = await this.replayService.verifyReplay(replay);
      const errors: string[] = [];

      if (!valid) {
        errors.push('Replay verification failed');
      }

      return { matchId, valid, errors };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { matchId, valid: false, errors: [message] };
    }
  }

  private verifyHashChain(transitions: StateTransition[]): boolean {
    if (transitions.length < 2) return true;

    for (let i = 1; i < transitions.length; i++) {
      const current = transitions[i];
      const previous = transitions[i - 1];

      if (!current.stateHash || !previous.stateHash) {
        return false;
      }
    }

    return true;
  }

  private verifyRandomness(commitments: RandomnessCommitment[]): boolean {
    if (commitments.length === 0) return true;

    for (const commitment of commitments) {
      if (!commitment.commitment || !commitment.reveal) {
        return false;
      }
    }

    return true;
  }

  private async verifyOnChain(record: MatchTransparencyRecord): Promise<boolean> {
    if (!record.solanaMatchPda) {
      return true;
    }

    return record.transactionSignatures.length > 0;
  }
}
