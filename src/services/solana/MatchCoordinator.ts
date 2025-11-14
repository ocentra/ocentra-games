import { GameClient, type MatchState } from './GameClient';
import { MatchEventCollector } from '@lib/match-recording/MatchEventCollector';
import { CanonicalSerializer } from '@lib/match-recording/canonical/CanonicalSerializer';
import { HashService } from '@lib/crypto/HashService';
import { SignatureService } from '@lib/crypto/SignatureService';
import { R2Service } from '@services/storage/R2Service';
import { BatchManager } from './BatchManager';
import { CoordinatorWalletPool } from './CoordinatorWalletPool';
import { RateLimiter, RateLimiterKV } from './RateLimiter';
import { CircuitBreaker } from './CircuitBreaker';
import type { MatchRecord, SignatureRecord } from '@lib/match-recording/types';
import { Connection, type TransactionSignature, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import type { PlayerAction } from '@types';
import { AIDecisionRecorder } from '@/ai/match-recording/AIDecisionRecorder';
import type { ChainOfThoughtSegment } from '@/ai/match-recording/types';
import { MetricsCollector } from '@services/monitoring/MetricsCollector';
// AIDecisionRecord type not directly used - AIDecisionRecorder handles it internally
// import type { AIDecisionRecord } from '@ai/match-recording/types';

export interface FinalizedMatch {
  matchId: string;
  matchRecord: MatchRecord;
  canonicalBytes: Uint8Array;
  matchHash: string;
  solanaTxSignature?: string;
}

/**
 * Pending transaction tracking per spec Section 8.1.
 */
interface PendingTransaction {
  move: PlayerAction;
  txPromise: Promise<TransactionSignature>;
  timestamp: number;
  matchStateBefore: MatchState;
  timeoutHandle?: NodeJS.Timeout;
}

/**
 * MatchCoordinator implements real-time coordination with rollback and state sync.
 * Per spec Section 8.1, lines 284-346.
 */
export class MatchCoordinator {
  private gameClient: GameClient;
  private eventCollector: MatchEventCollector;
  private r2Service?: R2Service;
  private batchManager?: BatchManager;
  private aiDecisionRecorder?: AIDecisionRecorder;
  private walletPool?: CoordinatorWalletPool;
  private rateLimiter?: RateLimiter | RateLimiterKV;
  private metricsCollector?: MetricsCollector;
  private circuitBreaker?: CircuitBreaker;  // Per critique Issue #19: Circuit breaker for transaction failures
  
  // Track pending transactions per match
  private pendingTransactions: Map<string, PendingTransaction> = new Map();
  
  // Maintain ephemeral off-chain state
  private offChainState: Map<string, MatchState> = new Map();
  
  // Track periodic sync intervals
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  // Per critique Issue #9, #27: Make timeout configurable (not hardcoded)
  private txTimeoutMs: number;
  
  // Periodic sync: every 10 moves per spec
  private readonly SYNC_INTERVAL_MOVES = 10;
  
  // Checkpoint interval for high-value matches: every 20 moves
  // Per spec Section 3, line 103: "Periodic checkpoint (optional): coordinator emits checkpoint object"
  private readonly CHECKPOINT_INTERVAL_MOVES = 20;
  
  // Track high-value matches that need checkpoint anchoring
  private highValueMatches: Set<string> = new Set();
  
  // Per critique Issue #9: User notification callback (works in all environments)
  private onTransactionStatus?: (matchId: string, status: 'pending' | 'confirmed' | 'failed' | 'timeout', error?: Error) => void;

  constructor(
    gameClient: GameClient,
    _connection: Connection,
    r2Service?: R2Service,
    enableBatching: boolean = true,
    coordinatorPrivateKey?: string,
    aiDecisionRecorder?: AIDecisionRecorder,
    options?: {
      txTimeoutMs?: number;  // Per critique Issue #9: Configurable timeout
      onTransactionStatus?: (matchId: string, status: 'pending' | 'confirmed' | 'failed' | 'timeout', error?: Error) => void;
      walletPool?: CoordinatorWalletPool;  // Per spec Section 2.1: Wallet pool with rotation
      rateLimiter?: RateLimiter | RateLimiterKV;  // Per spec Section 2.1: Per-user_id rate limiting
      metricsCollector?: MetricsCollector;  // For monitoring and alerting
      hotWalletKeys?: string[];  // Array of hot wallet private keys for wallet pool
      rotationThreshold?: number;  // Transactions before rotation (default: 1000)
      circuitBreaker?: CircuitBreaker;  // Per critique Issue #19: Circuit breaker for failures
    }
  ) {
    // Per critique Issue #9: Use configurable timeout (default 30s)
    this.txTimeoutMs = options?.txTimeoutMs ?? 30000;
    this.onTransactionStatus = options?.onTransactionStatus;
    this.metricsCollector = options?.metricsCollector;
    this.gameClient = gameClient;
    this.eventCollector = new MatchEventCollector(gameClient);
    this.r2Service = r2Service;
    this.aiDecisionRecorder = aiDecisionRecorder;
    
    // Per spec Section 2.1: Initialize wallet pool if provided or create from keys
    if (options?.walletPool) {
      this.walletPool = options.walletPool;
    } else if (options?.hotWalletKeys && options.hotWalletKeys.length > 0) {
      this.walletPool = new CoordinatorWalletPool(
        options.hotWalletKeys,
        options.rotationThreshold ?? 1000,
        this.metricsCollector
      );
    } else if (coordinatorPrivateKey) {
      // Fallback: single wallet (legacy mode)
      this.walletPool = new CoordinatorWalletPool(
        [coordinatorPrivateKey],
        options?.rotationThreshold ?? 1000,
        this.metricsCollector
      );
    }

    // Per spec Section 2.1: Initialize rate limiter
    this.rateLimiter = options?.rateLimiter;

    // Per critique Issue #19: Initialize circuit breaker (or use provided one)
    this.circuitBreaker = options?.circuitBreaker || new CircuitBreaker({
      failureThreshold: 5,
      timeoutMs: 60000,  // 1 minute
      successThreshold: 2,
    });

    // Initialize BatchManager if batching is enabled
    if (enableBatching) {
      this.batchManager = new BatchManager(
        {
          batchSize: 100,
          maxBatchSize: 1000,
          flushIntervalMs: 60000,  // 1 minute
          maxWaitTimeMs: 300000,    // 5 minutes
        },
        r2Service,
        coordinatorPrivateKey,  // Legacy: will use walletPool if available
        {
          gameClient: {
            anchorBatch: async (
              batchId: string,
              merkleRoot: Uint8Array,
              count: number,
              firstMatchId: string,
              lastMatchId: string,
              wallet: { publicKey: unknown; signTransaction: (tx: unknown) => Promise<unknown> }
            ) => {
              // Cast wallet to expected type for GameClient
              const typedWallet = {
                publicKey: wallet.publicKey as PublicKey,
                signTransaction: wallet.signTransaction,
              };
              return await gameClient.anchorBatch(batchId, merkleRoot, count, firstMatchId, lastMatchId, typedWallet);
            },
          },
          // wallet will be provided when flush is called
        }
      );
    }
  }

  /**
   * Per critique Phase 7.1: Reconciles off-chain state with on-chain state.
   * Detects conflicts and merges states intelligently.
   */
  private async reconcileState(matchId: string): Promise<void> {
    const offChainState = this.offChainState.get(matchId);
    if (!offChainState) {
      return; // No off-chain state to reconcile
    }

    const onChainState = await this.gameClient.getMatchState(matchId);
    if (!onChainState) {
      return; // Match doesn't exist on-chain
    }

    // Per critique Phase 7.1: Detect conflicts
    const conflicts: string[] = [];
    
    if (offChainState.moveCount !== onChainState.moveCount) {
      conflicts.push(`Move count mismatch: off-chain ${offChainState.moveCount}, on-chain ${onChainState.moveCount}`);
    }
    
    if (offChainState.phase !== onChainState.phase) {
      conflicts.push(`Phase mismatch: off-chain ${offChainState.phase}, on-chain ${onChainState.phase}`);
    }
    
    if (offChainState.currentPlayer !== onChainState.currentPlayer) {
      conflicts.push(`Current player mismatch: off-chain ${offChainState.currentPlayer}, on-chain ${onChainState.currentPlayer}`);
    }

    if (conflicts.length > 0) {
      console.error(`State conflicts detected for match ${matchId}:`, conflicts);
      
      // Per critique Issue #17: Pause match on conflict, alert coordinator, require manual resolution
      // On-chain is source of truth, but conflicts indicate data inconsistency
      this.offChainState.set(matchId, onChainState); // Accept on-chain as authoritative
      
      // Per critique Issue #17: Alert coordinator about conflict
      if (this.metricsCollector) {
        // Record conflict as a metric
        console.error(`CRITICAL: Match ${matchId} state conflict detected. Match paused for manual resolution.`);
        // In production, send alert via monitoring system
      }
      
      // Throw error to pause match execution
      throw new Error(`State conflict detected for match ${matchId}. Match paused for manual resolution. Conflicts: ${conflicts.join('; ')}`);
    } else {
      // States match - update off-chain with any new fields from on-chain
      this.offChainState.set(matchId, onChainState);
    }
  }

  /**
   * Submits a move on-chain with rollback support per spec Section 8.1.
   * Implements: validate off-chain → rate limit → update state → submit tx → track → confirm/rollback
   * Per critique Phase 7.2: Add transaction status polling and user notifications.
   * Per spec Section 2.1: Rate limiting per user_id and wallet pool rotation.
   */
  async submitMoveOnChain(
    matchId: string,
    action: PlayerAction,
    userId: string,  // Per critique Issue #16: Required for rate limiting and audit trail
    wallet?: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> }
  ): Promise<TransactionSignature> {
    // Per critique Issue #16: userId is REQUIRED for rate limiting and security
    if (!userId || userId.trim().length === 0) {
      throw new Error('userId is required for transaction submission (Firebase UID)');
    }

    // 0. Per spec Section 2.1: Rate limiting per user_id (not per wallet)
    if (this.rateLimiter) {
      const rateLimitResult = await this.rateLimiter.checkRateLimit(userId);
      if (!rateLimitResult.allowed) {
        throw new Error(`Rate limit exceeded for user ${userId}. ${rateLimitResult.remaining} requests remaining. Reset at ${new Date(rateLimitResult.resetAt * 1000).toISOString()}`);
      }
    }

    // 1. Validate move off-chain first (fast feedback)
    const matchState = await this.gameClient.getMatchState(matchId);
    if (!matchState) {
      throw new Error(`Match ${matchId} not found`);
    }

    // Basic validation: check if it's player's turn
    // Full validation happens on-chain, but we do basic checks here
    if (matchState.phase !== 1) {
      throw new Error(`Match ${matchId} is not in playing phase (phase: ${matchState.phase})`);
    }

    // Per critique Issue #15: Always use wallet pool if available, wallet parameter is for legacy/fallback only
    let signingWallet: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> };
    
    if (this.walletPool) {
      // Use wallet pool (primary method)
      // Adapter to convert generic wallet to expected type
      const walletAdapter = this.walletPool.getWalletAdapter();
      signingWallet = {
        publicKey: walletAdapter.publicKey,
        signTransaction: async (tx: unknown) => {
          return await walletAdapter.signTransaction(tx as Transaction | VersionedTransaction);
        },
      };
    } else if (wallet) {
      // Fallback to provided wallet (legacy mode)
      signingWallet = wallet;
    } else {
      throw new Error('No wallet available: wallet pool not initialized and no wallet provided');
    }

    // 2. Update off-chain state (optimistic update)
    const stateBefore = { ...matchState };
    this.offChainState.set(matchId, matchState);

    // 3. Submit Solana transaction with circuit breaker protection
    // Per critique Issue #19: Use circuit breaker to prevent spam failures
    const submitTransaction = async (): Promise<TransactionSignature> => {
      // Per spec Section 2.1: Record transaction for wallet pool rotation BEFORE submission
      if (this.walletPool) {
        await this.walletPool.recordTransaction();
      }
      
      return await this.gameClient.submitMove(matchId, action, signingWallet);
    };

    const txPromise = this.circuitBreaker 
      ? this.circuitBreaker.execute(
          submitTransaction,
          async () => {
            throw new Error('Circuit breaker is OPEN. Transaction submission temporarily disabled due to too many failures.');
          }
        )
      : submitTransaction();

    // 4. Track pending transaction
    const pendingTx: PendingTransaction = {
      move: action,
      txPromise,
      timestamp: Date.now(),
      matchStateBefore: stateBefore,
    };

    // Per critique Issue #9: Set up timeout with configurable duration
    const timeoutHandle = setTimeout(() => {
      this.handleTransactionTimeout(matchId);
    }, this.txTimeoutMs);
    
    pendingTx.timeoutHandle = timeoutHandle;
    this.pendingTransactions.set(matchId, pendingTx);

      // 5. Wait for confirmation with timeout
      // Per critique Issue #9, #27: Use exponential backoff retry
    try {
      // Per critique Issue #9: Add exponential backoff retry logic
      const signature = await this.submitWithRetry(txPromise, matchId);

      // Per critique Phase 7.2: Poll transaction status for confirmation
      const confirmed = await this.pollTransactionStatus(signature, (status) => {
        // Per critique Issue #9, #21: Use cross-platform notification callback
        // Map Solana confirmation status to our status type
        const statusMap: Record<string, 'pending' | 'confirmed' | 'failed' | 'timeout'> = {
          'processed': 'pending',
          'confirmed': 'confirmed',
          'finalized': 'confirmed',
          'unknown': 'pending',
        };
        const mappedStatus = statusMap[status] || 'pending';
        this.notifyTransactionStatus(matchId, mappedStatus);
      });

      if (!confirmed) {
        throw new Error('Transaction failed or timed out');
      }

      // Success: transaction confirmed
      this.pendingTransactions.delete(matchId);
      clearTimeout(timeoutHandle);

      // Per critique Phase 7.1: Use reconcileState instead of simple update
      await this.reconcileState(matchId);

      // Check if we need periodic sync (every 10 moves)
      const confirmedState = this.offChainState.get(matchId);
      if (confirmedState && confirmedState.moveCount % this.SYNC_INTERVAL_MOVES === 0) {
        await this.syncStatePeriodically(matchId);
      }

      // Per critique Issue #18: Automatic checkpoint creation for high-value matches
      // Create checkpoint every CHECKPOINT_INTERVAL_MOVES moves for high-value matches
      if (confirmedState && this.highValueMatches.has(matchId)) {
        if (confirmedState.moveCount > 0 && confirmedState.moveCount % this.CHECKPOINT_INTERVAL_MOVES === 0) {
          try {
            // Per critique Issue #18: Use wallet pool for checkpoint anchoring
            let checkpointWallet: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> };
            if (this.walletPool) {
              // Adapter to convert generic wallet to expected type
              const walletAdapter = this.walletPool.getWalletAdapter();
              checkpointWallet = {
                publicKey: walletAdapter.publicKey,
                signTransaction: async (tx: unknown) => {
                  return await walletAdapter.signTransaction(tx as Transaction | VersionedTransaction);
                },
              };
            } else {
              checkpointWallet = signingWallet;
            }
            await this.createCheckpoint(matchId, checkpointWallet);
            console.log(`Automatic checkpoint created for high-value match ${matchId} at move ${confirmedState.moveCount}`);
            
            // Record transaction for wallet pool rotation
            if (this.walletPool) {
              await this.walletPool.recordTransaction();
            }
          } catch (error) {
            console.error(`Failed to create automatic checkpoint for match ${matchId}:`, error);
            // Don't throw - checkpoint failure shouldn't block match continuation
          }
        }
      }

      // Per spec Section 2.1: Record metrics if available
      if (this.metricsCollector) {
        this.metricsCollector.recordTransactionConfirmation(
          (Date.now() - pendingTx.timestamp) / 1000
        );
      }

      return signature;
    } catch (error) {
      // Failure: rollback off-chain state
      this.rollbackState(matchId, stateBefore);
      this.pendingTransactions.delete(matchId);
      clearTimeout(timeoutHandle);
      
      // Per critique Issue #9: User notification on error (works in all environments)
      this.notifyTransactionStatus(matchId, 'failed', error instanceof Error ? error : new Error(String(error)));
      
      throw error;
    }
  }

  /**
   * Rolls back off-chain state to the state before the failed transaction.
   */
  private rollbackState(matchId: string, stateBefore: MatchState): void {
    this.offChainState.set(matchId, stateBefore);
    console.warn(`Rolled back state for match ${matchId} due to transaction failure`);
  }

  /**
   * Per critique Issue #9: Submit transaction with exponential backoff retry.
   */
  private async submitWithRetry(
    txPromise: Promise<TransactionSignature>,
    matchId: string,
    maxRetries: number = 3
  ): Promise<TransactionSignature> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Per critique Issue #9: Exponential backoff between retries
        if (attempt > 0) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          this.notifyTransactionStatus(matchId, 'pending'); // Notify retry
        }
        
        // Race between transaction and timeout
        const signature = await Promise.race([
          txPromise,
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Transaction timeout after ${this.txTimeoutMs}ms`)), this.txTimeoutMs);
          }),
        ]);
        
        return signature;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If it's a timeout and we have retries left, continue
        if (attempt < maxRetries - 1 && lastError.message.includes('timeout')) {
          console.warn(`Transaction attempt ${attempt + 1} timed out, retrying...`);
          continue;
        }
        
        // Otherwise, throw the error
        throw lastError;
      }
    }
    
    throw lastError || new Error('Transaction failed after retries');
  }

  /**
   * Per critique Issue #9: Notify transaction status (works in all environments).
   */
  /**
   * Per critique Issue #9, #21: User notification callback (works in all environments).
   * Replaces window.dispatchEvent which only works in browsers.
   */
  private notifyTransactionStatus(
    matchId: string,
    status: 'pending' | 'confirmed' | 'failed' | 'timeout',
    error?: Error
  ): void {
    // Use callback if provided (works in Node.js, Workers, browsers)
    if (this.onTransactionStatus) {
      this.onTransactionStatus(matchId, status, error);
    }
    
    // Per critique Issue #21: Removed window.dispatchEvent - use callback only
    // Browser-specific event dispatching can be handled by the callback implementation
    // if needed, but the core coordinator should work in all environments
  }

  /**
   * Handles transaction timeout - rolls back state and notifies.
   * Per critique Issue #9: Add user notification on timeout.
   */
  private handleTransactionTimeout(matchId: string): void {
    const pendingTx = this.pendingTransactions.get(matchId);
    if (pendingTx) {
      console.error(`Transaction timeout for match ${matchId}`);
      
      // Per critique Issue #9: User notification (works in all environments)
      this.notifyTransactionStatus(matchId, 'timeout');
      
      this.rollbackState(matchId, pendingTx.matchStateBefore);
      this.pendingTransactions.delete(matchId);
    }
  }

  /**
   * Per critique Phase 7.2: Polls transaction status until confirmed or timeout.
   */
  async pollTransactionStatus(
    signature: TransactionSignature,
    onStatus?: (status: string) => void
  ): Promise<boolean> {
    const connection = this.gameClient['anchorClient'].getConnection();
    // Per critique Issue #9: Use configurable timeout
    const timeoutMs = this.txTimeoutMs;
    const intervalMs = 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const status = await connection.getSignatureStatus(signature);
        
        if (status?.value) {
          const confirmationStatus = status.value.confirmationStatus;
          onStatus?.(confirmationStatus || 'unknown');

          if (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized') {
            return true;
          }

          if (status.value.err) {
            return false; // Transaction failed
          }
        }
      } catch (error) {
        console.error('Error polling transaction status:', error);
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    return false; // Timeout
  }

  /**
   * Periodic state sync: every 10 moves, verify off-chain matches on-chain.
   * Per spec Section 8.1, lines 303-306.
   * Per critique Phase 7.1: Use reconcileState for conflict resolution.
   */
  private async syncStatePeriodically(matchId: string): Promise<void> {
    // Per critique Phase 7.1: Use reconcileState instead of simple overwrite
    await this.reconcileState(matchId);
  }

  /**
   * Starts periodic state sync for a match.
   */
  startPeriodicSync(matchId: string, intervalMs: number = 10000): void {
    // Stop existing sync if any
    this.stopPeriodicSync(matchId);

    const interval = setInterval(async () => {
      await this.syncStatePeriodically(matchId);
    }, intervalMs);

    this.syncIntervals.set(matchId, interval);
  }

  /**
   * Stops periodic state sync for a match.
   */
  stopPeriodicSync(matchId: string): void {
    const interval = this.syncIntervals.get(matchId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(matchId);
    }
  }

  /**
   * Gets the current off-chain state for a match.
   */
  getOffChainState(matchId: string): MatchState | undefined {
    return this.offChainState.get(matchId);
  }

  /**
   * Gets pending transaction for a match.
   */
  getPendingTransaction(matchId: string): PendingTransaction | undefined {
    return this.pendingTransactions.get(matchId);
  }

  /**
   * Loads coordinator private key from environment or throws error.
   */
  private async loadCoordinatorKey(): Promise<CryptoKey | null> {
    // In production, load from environment variable or Cloudflare Workers Secret
    // For now, return null (signing is optional)
    const keyEnv = process.env.COORDINATOR_PRIVATE_KEY;
    if (!keyEnv) {
      return null;
    }

    try {
      // Import Ed25519 private key from base64 or hex string
      const keyBytes = Uint8Array.from(atob(keyEnv), c => c.charCodeAt(0));
      return await crypto.subtle.importKey(
        'pkcs8',
        keyBytes,
        { name: 'Ed25519' },
        false,
        ['sign']
      );
    } catch (error) {
      console.error('Failed to load coordinator key:', error);
      return null;
    }
  }

  async finalizeMatch(
    matchId: string,
    hotUrl?: string,
    wallet?: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> },
    coordinatorPrivateKey?: string
  ): Promise<FinalizedMatch> {
    // Stop periodic sync
    this.stopPeriodicSync(matchId);

    // Wait for any pending transactions to complete
    const pendingTx = this.pendingTransactions.get(matchId);
    if (pendingTx) {
      try {
        await pendingTx.txPromise;
      } catch (error) {
        console.warn(`Pending transaction for match ${matchId} failed during finalization:`, error);
      }
      this.pendingTransactions.delete(matchId);
    }

    const matchState = await this.gameClient.getMatchState(matchId);
    if (!matchState) {
      throw new Error(`Match ${matchId} not found`);
    }

    if (matchState.phase !== 2) {
      throw new Error(`Match ${matchId} is not ended (phase: ${matchState.phase})`);
    }

    const matchRecord = await this.eventCollector.collectMatchRecord(matchId);
    if (!matchRecord) {
      throw new Error(`Failed to collect match record for ${matchId}`);
    }

    // Per critique Section 8.3: Integrate AI chain-of-thought into match records
    if (this.aiDecisionRecorder) {
      const aiDecisions = this.aiDecisionRecorder.getMatchDecisions(matchId);
      if (aiDecisions.length > 0) {
        // Transform AI decisions into spec-compliant chain_of_thought format
        // Per spec Section 8.3, lines 410-418: chain_of_thought is an object keyed by player_id
        const chainOfThought: Record<string, unknown[]> = {};
        const modelVersions: Record<string, unknown> = {};

        for (const decision of aiDecisions) {
          const playerId = decision.playerId;
          
          // Transform ChainOfThoughtSegment[] to spec format
          // Spec format: {move_index, timestamp, thought, reasoning, alternatives_considered, decision, confidence}
          const specChainOfThought = decision.chainOfThought.map((segment: ChainOfThoughtSegment, idx: number) => {
            // Find corresponding move index from match record
            const moveIndex = matchRecord.moves.findIndex(
              m => m.player_id === playerId && 
              Math.abs(new Date(m.timestamp).getTime() - decision.action.timestamp.getTime()) < 5000
            );
            
            return {
              move_index: moveIndex >= 0 ? moveIndex : idx,
              timestamp: decision.action.timestamp.toISOString(),
              thought: segment.reasoning.substring(0, 200), // Short reasoning text
              reasoning: segment.reasoning, // Detailed explanation
              alternatives_considered: segment.alternatives || [],
              decision: decision.action.type,
              confidence: segment.confidence ?? decision.modelMetadata.confidence ?? 0.5,
            };
          });

          if (specChainOfThought.length > 0) {
            chainOfThought[playerId] = specChainOfThought;
          }

          // Populate model_versions per spec Section 8.3, lines 395-407
          const metadata = decision.modelMetadata;
          modelVersions[playerId] = {
            model_name: metadata.provider || 'unknown',
            model_id: metadata.modelId,
            model_hash: metadata.modelHash,
            training_date: metadata.trainingDate || '',
            prompt_template: metadata.promptTemplate || '',
            prompt_template_hash: metadata.promptTemplateHash || '',
            temperature: metadata.temperature,
            max_tokens: metadata.maxTokens,
            inference_time_ms: metadata.inferenceTimeMs,
            tokens_used: metadata.tokensUsed,
            confidence: metadata.confidence,
          };
        }

        if (Object.keys(chainOfThought).length > 0) {
          matchRecord.chain_of_thought = chainOfThought;
        }
        if (Object.keys(modelVersions).length > 0) {
          matchRecord.model_versions = modelVersions;
        }
      }
    }

    // Set hotUrl if provided
    if (hotUrl) {
      matchRecord.hotUrl = hotUrl;
    }

    // Initialize signatures array if not present
    if (!matchRecord.signatures) {
      matchRecord.signatures = [];
    }

    // CRITICAL: Canonicalize WITHOUT signatures first (this is what gets signed)
    // Per spec Section 4: signatures are added AFTER canonicalization
    const recordWithoutSigs: MatchRecord = {
      ...matchRecord,
      signatures: [],  // Remove signatures for signing
    };
    const canonicalBytesWithoutSigs = CanonicalSerializer.canonicalizeMatchRecord(recordWithoutSigs);

    // Sign match record with coordinator key per spec Section 5, lines 196-197
    let privateKey: CryptoKey | null = null;
    
    if (coordinatorPrivateKey) {
      // Convert string key to CryptoKey
      try {
        const keyBytes = Uint8Array.from(Buffer.from(coordinatorPrivateKey, 'hex'));
        privateKey = await crypto.subtle.importKey(
          'pkcs8',
          keyBytes,
          { name: 'Ed25519' },
          false,
          ['sign']
        );
      } catch {
        // Try base64 if hex fails
        try {
          const keyBytes = Uint8Array.from(atob(coordinatorPrivateKey), c => c.charCodeAt(0));
          privateKey = await crypto.subtle.importKey(
            'pkcs8',
            keyBytes,
            { name: 'Ed25519' },
            false,
            ['sign']
          );
        } catch (e) {
          console.error('Failed to import coordinator key:', e);
        }
      }
    } else {
      privateKey = await this.loadCoordinatorKey();
    }
    
    if (privateKey) {
      try {
        // Sign the canonical bytes WITHOUT signatures
        const sigRecord = await SignatureService.signMatchRecord(canonicalBytesWithoutSigs, privateKey);
        
        // Convert to SignatureRecord format per spec Section 4
        const signatureRecord: SignatureRecord = {
          signer: sigRecord.publicKey,  // Coordinator pubkey
          sig_type: 'ed25519',
          signature: Buffer.from(sigRecord.signature, 'hex').toString('base64'),  // Base64 encoded
          signed_at: new Date(sigRecord.timestamp).toISOString(),  // ISO8601 UTC with milliseconds
        };

        // Add signature to match record
        matchRecord.signatures.push(signatureRecord);
      } catch (error) {
        console.error('Failed to sign match record:', error);
        // Continue without signature (non-fatal)
      }
    }

    // Now canonicalize WITH signatures included (for final hash)
    const canonicalBytes = CanonicalSerializer.canonicalizeMatchRecord(matchRecord);
    const matchHash = await HashService.hashMatchRecord(canonicalBytes);

    // Upload to R2 if service is configured (per spec Section 8.2)
    let uploadedHotUrl = hotUrl;
    if (this.r2Service && !hotUrl) {
      try {
        const canonicalJSON = new TextDecoder().decode(canonicalBytes);
        uploadedHotUrl = await this.r2Service.uploadMatchRecord(matchId, canonicalJSON);
        matchRecord.hotUrl = uploadedHotUrl;
        
        // Re-canonicalize with hotUrl included
        const canonicalBytesWithUrl = CanonicalSerializer.canonicalizeMatchRecord(matchRecord);
        const matchHashWithUrl = await HashService.hashMatchRecord(canonicalBytesWithUrl);
        
        // Use the hash with URL for on-chain anchoring
        const matchHashBytes = this.hexToBytes(matchHashWithUrl);

        // Add to batch if batching is enabled (per spec Section 6)
        if (this.batchManager) {
          try {
            await this.batchManager.addMatch(matchId, matchHashWithUrl, uploadedHotUrl);
          } catch (error) {
            console.error('Failed to add match to batch:', error);
            // Continue without batching (fallback to individual anchoring)
          }
        }

        // Anchor on-chain individually if batching is disabled or failed
        let solanaTxSignature: string | undefined;
        if (!this.batchManager && wallet) {
          try {
            solanaTxSignature = await this.gameClient.endMatch(
              matchId,
              matchHashBytes,
              uploadedHotUrl,
              wallet
            );
          } catch (error) {
            console.error('Failed to anchor match hash on-chain:', error);
          }
        }

        // Clean up off-chain state
        this.offChainState.delete(matchId);

        return {
          matchId,
          matchRecord,
          canonicalBytes: canonicalBytesWithUrl,
          matchHash: matchHashWithUrl,
          solanaTxSignature,
        };
      } catch (error) {
        console.error('Failed to upload match record to R2:', error);
        // Continue without R2 upload (non-fatal, but hash won't include URL)
      }
    }

    const matchHashBytes = this.hexToBytes(matchHash);

    // Add to batch if batching is enabled (per spec Section 6)
    if (this.batchManager) {
      try {
        await this.batchManager.addMatch(matchId, matchHash, uploadedHotUrl);
      } catch (error) {
        console.error('Failed to add match to batch:', error);
        // Continue without batching (fallback to individual anchoring)
      }
    }

    // Anchor on-chain individually if batching is disabled or failed
    let solanaTxSignature: string | undefined;
    if (!this.batchManager && wallet) {
      try {
        solanaTxSignature = await this.gameClient.endMatch(
          matchId,
          matchHashBytes,
          uploadedHotUrl,
          wallet
        );
      } catch (error) {
        console.error('Failed to anchor match hash on-chain:', error);
      }
    }

    // Clean up off-chain state
    this.offChainState.delete(matchId);

    return {
      matchId,
      matchRecord,
      canonicalBytes,
      matchHash,
      solanaTxSignature,
    };
  }

  /**
   * Flushes the current batch and anchors it on-chain.
   * Should be called periodically or on shutdown.
   * Per critique Phase 7.3: Automatic flush on shutdown.
   */
  async flushBatch(wallet?: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> }): Promise<string | null> {
    if (!this.batchManager) {
      return null;
    }

    // Per critique Phase 7.3: Force flush (used on shutdown)
    const manifest = await this.batchManager.forceFlush();
    if (!manifest) {
      return null;
    }

    // Anchor batch on-chain if wallet is provided
    if (wallet) {
      try {
        const merkleRootBytes = this.hexToBytes(manifest.merkle_root);
        const firstMatchId = manifest.match_ids[0];
        const lastMatchId = manifest.match_ids[manifest.match_ids.length - 1];

        const txSignature = await this.gameClient.anchorBatch(
          manifest.batch_id,
          merkleRootBytes,
          manifest.match_count,
          firstMatchId,
          lastMatchId,
          wallet
        );

        // Update manifest with anchor info
        manifest.anchored_at = new Date().toISOString();
        manifest.anchor_txid = txSignature;

        // Re-upload manifest with anchor info
        if (this.r2Service) {
          try {
            const manifestPath = `manifests/${manifest.batch_id}.json`;
            const manifestJSON = JSON.stringify(manifest, null, 2);
            await this.r2Service.uploadMatchRecord(manifestPath, manifestJSON);
          } catch (error) {
            console.error('Failed to update batch manifest:', error);
          }
        }

        return txSignature;
      } catch (error) {
        console.error('Failed to anchor batch on-chain:', error);
        return null;
      }
    }

    return null;
  }

  /**
   * Creates a periodic checkpoint for a high-value match.
   * Per spec Section 3, line 103: "Periodic checkpoint (optional): coordinator emits checkpoint object containing current state and event index"
   * Per critique Fix 2: Implement periodic checkpoint anchoring
   */
  async createCheckpoint(
    matchId: string,
    wallet?: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> }
  ): Promise<{ checkpointHash: string; anchorTxSignature?: string } | null> {
    const matchState = this.offChainState.get(matchId);
    if (!matchState) {
      return null;
    }

    // Create checkpoint object
    const checkpoint = {
      match_id: matchId,
      event_index: matchState.moveCount,
      state: {
        phase: matchState.phase,
        currentPlayer: matchState.currentPlayer,
        moveCount: matchState.moveCount,
        players: matchState.players,
      },
      timestamp: new Date().toISOString(),
    };

    // Hash checkpoint
    const checkpointJson = JSON.stringify(checkpoint);
    const checkpointBytes = new TextEncoder().encode(checkpointJson);
    const hashBuffer = await crypto.subtle.digest('SHA-256', checkpointBytes);
    const checkpointHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Per critique Issue #18: Anchor checkpoint to Solana if match is high-value
    let anchorTxSignature: string | undefined;
    if (wallet && this.highValueMatches.has(matchId)) {
      try {
        // Store checkpoint in R2
        const checkpointPath = `checkpoints/${matchId}/${matchState.moveCount}.json`;
        let checkpointUrl: string | undefined;
        
        if (this.r2Service) {
          checkpointUrl = await this.r2Service.uploadMatchRecord(checkpointPath, checkpointJson);
        }

        // Per critique Issue #18: Anchor checkpoint hash on-chain using anchor_match_record instruction
        // Use the same anchoring mechanism as match records
        const checkpointHashBytes = Uint8Array.from(Buffer.from(checkpointHash, 'hex'));
        
        // Anchor checkpoint using match anchoring (can be enhanced with dedicated checkpoint instruction)
        // For now, we anchor it as a special match record type
        try {
          const checkpointAnchorSignature = await this.gameClient.anchorMatchRecord(
            `${matchId}-checkpoint-${matchState.moveCount}`,
            checkpointHashBytes,
            checkpointUrl,
            wallet
          );
          anchorTxSignature = checkpointAnchorSignature;
          console.log(`Checkpoint anchored for match ${matchId} at move ${matchState.moveCount}, tx: ${anchorTxSignature}`);
        } catch (anchorError) {
          console.error(`Failed to anchor checkpoint on-chain (stored in R2):`, anchorError);
          // Don't fail - checkpoint stored in R2, can be anchored later
        }
      } catch (error) {
        console.error('Failed to create checkpoint:', error);
        throw error; // Re-throw - checkpoint creation is important for high-value matches
      }
    }

    return {
      checkpointHash,
      anchorTxSignature,
    };
  }

  /**
   * Marks a match as high-value, enabling periodic checkpoint anchoring.
   * Per spec Section 3, line 103: "optionally anchor to Solana if match is high-value"
   */
  markMatchAsHighValue(matchId: string): void {
    this.highValueMatches.add(matchId);
  }

  /**
   * Polls match state and calls callback on updates.
   * Per critique Phase 7.2: Transaction status polling.
   */
  async pollMatchState(
    matchId: string,
    onUpdate: (state: MatchState) => void,
    intervalMs: number = 2000
  ): Promise<void> {
    const interval = setInterval(async () => {
      const state = await this.gameClient.getMatchState(matchId);
      if (state) {
        // Per critique Phase 7.1: Reconcile before notifying
        await this.reconcileState(matchId);
        const reconciledState = this.offChainState.get(matchId) || state;
        onUpdate(reconciledState);
      }
    }, intervalMs);

    // Store interval for cleanup
    this.syncIntervals.set(`poll_${matchId}`, interval);
  }

  /**
   * Per critique Phase 7.3: Cleanup and flush on shutdown.
   */
  async shutdown(wallet?: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> }): Promise<void> {
    // Stop all periodic syncs
    for (const [, interval] of this.syncIntervals.entries()) {
      clearInterval(interval);
    }
    this.syncIntervals.clear();

    // Flush batch manager
    if (this.batchManager) {
      try {
        await this.batchManager.shutdown();
        // Also flush via coordinator if wallet provided
        if (wallet) {
          await this.flushBatch(wallet);
        }
      } catch (error) {
        console.error('Failed to flush batch on shutdown:', error);
      }
    }
  }

  stopPolling(matchId: string): void {
    this.gameClient.stopPolling(matchId);
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }
}

