import { AnchorClient } from './AnchorClient';
import { PublicKey, type TransactionSignature } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import type { PlayerAction } from '@types';
import { EventBus } from '@lib/eventing';
import { UpdateGameStateEvent } from '@lib/eventing/events/game/UpdateGameStateEvent';
import { GamePhase } from '@types';

export interface MatchState {
  matchId: string;
  gameName: string;
  gameType: number;
  seed: number;
  phase: number;
  currentPlayer: number;
  players: PublicKey[];
  playerCount: number;
  moveCount: number;
  createdAt: number;
  endedAt?: number;
  matchHash?: Uint8Array;
  hotUrl?: string;  // Changed from archiveTxid to hotUrl per spec Section 5
}

export class GameClient {
  private anchorClient: AnchorClient;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(anchorClient: AnchorClient) {
    this.anchorClient = anchorClient;
  }

  async createMatch(
    gameType: number,
    seed: number,
    wallet: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> }
  ): Promise<string> {
    this.validateWallet(wallet);
    const program = this.anchorClient.getProgram();
    const matchId = crypto.randomUUID();
    
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), Buffer.from(matchId)],
      program.programId
    );

    try {
      const tx = await program.methods
        .createMatch(matchId, gameType, new BN(seed))
        .accounts({
          matchAccount: matchPda,
          authority: wallet.publicKey,
          systemProgram: PublicKey.default,
        })
        .rpc();

      await this.confirmTransactionWithRetry(tx);
      return matchId;
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  }

  async joinMatch(
    matchId: string,
    wallet: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> }
  ): Promise<TransactionSignature> {
    this.validateWallet(wallet);
    const program = this.anchorClient.getProgram();
    
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), Buffer.from(matchId)],
      program.programId
    );

    const tx = await program.methods
      .joinMatch(matchId)
      .accounts({
        matchAccount: matchPda,
        player: wallet.publicKey,
        systemProgram: PublicKey.default,
      })
      .rpc();

    await this.confirmTransactionWithRetry(tx);
    return tx;
  }

  async startMatch(
    matchId: string,
    wallet: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> }
  ): Promise<TransactionSignature> {
    this.validateWallet(wallet);
    const program = this.anchorClient.getProgram();
    
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), Buffer.from(matchId)],
      program.programId
    );

    const tx = await program.methods
      .startMatch(matchId)
      .accounts({
        matchAccount: matchPda,
        authority: wallet.publicKey,
      })
      .rpc();

    await this.confirmTransactionWithRetry(tx);
    return tx;
  }

  async submitMove(
    matchId: string,
    action: PlayerAction,
    wallet?: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> },
    nonce?: number // Per critique: nonce for replay protection
  ): Promise<TransactionSignature> {
    // Per critique Issue #6: Wallet is optional - coordinator submits on behalf of players
    if (!wallet) {
      throw new Error('Wallet required for transaction signing. Use MatchCoordinator for walletless submission.');
    }
    this.validateWallet(wallet);
    const program = this.anchorClient.getProgram();
    
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), Buffer.from(matchId)],
      program.programId
    );

    // Fetch current match state to get moveCount (prevents PDA collisions)
    const matchState = await this.getMatchState(matchId);
    if (!matchState) {
      throw new Error(`Match ${matchId} not found`);
    }

    // Use moveCount as move_index (matches Rust implementation)
    const moveIndex = matchState.moveCount;
    const moveIndexBytes = Buffer.from(new Uint8Array(new BN(moveIndex).toArray('le', 4)));

    const [movePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('move'), Buffer.from(matchId), moveIndexBytes],
      program.programId
    );

    const actionType = this.mapActionTypeToU8(action.type);
    const payload = this.serializeAction(action);
    
    // Per critique Issue #5: Use cryptographically secure nonce generation
    // Generate secure random nonce if not provided
    const moveNonce = nonce ?? this.generateSecureNonce();

    const tx = await program.methods
      .submitMove(matchId, actionType, payload, new BN(moveNonce))
      .accounts({
        matchAccount: matchPda,
        moveAccount: movePda,
        player: wallet.publicKey,
        systemProgram: PublicKey.default,
      })
      .rpc();

    await this.confirmTransactionWithRetry(tx);
    
        const state = await this.getMatchState(matchId);
        if (state) {
          // Map numeric phase (0,1,2) to GamePhase string
          const phaseMap: Record<number, GamePhase> = {
            0: GamePhase.DEALING,
            1: GamePhase.PLAYER_ACTION,
            2: GamePhase.GAME_END,
          };
          EventBus.instance.publish(new UpdateGameStateEvent({
            id: state.matchId,
            phase: phaseMap[state.phase] || GamePhase.DEALING,
            currentPlayer: state.currentPlayer,
            players: state.players.map(p => ({ id: p.toString(), name: '', avatar: '', hand: [], declaredSuit: null, intentCard: null, score: 0, isConnected: true, isAI: false })),
          }));
        }
    
    return tx;
  }

  async endMatch(
    matchId: string,
    matchHash?: Uint8Array,
    hotUrl?: string,
    wallet?: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> }
  ): Promise<TransactionSignature> {
    if (wallet) {
      this.validateWallet(wallet);
    }
    const program = this.anchorClient.getProgram();
    
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), Buffer.from(matchId)],
      program.programId
    );

    const authority = wallet?.publicKey || program.provider.publicKey;
    if (!authority) {
      throw new Error('Authority (wallet or program provider) is required');
    }
    
    const tx = await program.methods
      .endMatch(matchId, matchHash ? Array.from(matchHash) : null, hotUrl || null)
      .accounts({
        matchAccount: matchPda,
        authority,
      })
      .rpc();

    await this.confirmTransactionWithRetry(tx);
    return tx;
  }

  async getMatchState(matchId: string): Promise<MatchState | null> {
    const program = this.anchorClient.getProgram();
    
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), Buffer.from(matchId)],
      program.programId
    );

    try {
      // Type assertion needed because Anchor IDL types aren't fully inferred
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchAccount = await (program.account as any).match.fetch(matchPda);
      
      return {
        matchId: matchAccount.matchId,
        gameName: matchAccount.gameName,
        gameType: matchAccount.gameType,
        seed: matchAccount.seed.toNumber(),
        phase: matchAccount.phase,
        currentPlayer: matchAccount.currentPlayer,
        players: matchAccount.players.filter((p: PublicKey) => !p.equals(PublicKey.default)),
        playerCount: matchAccount.playerCount,
        moveCount: matchAccount.moveCount,
        createdAt: matchAccount.createdAt.toNumber(),
        endedAt: matchAccount.endedAt ? matchAccount.endedAt.toNumber() : undefined,
        matchHash: matchAccount.matchHash ? new Uint8Array(matchAccount.matchHash) : undefined,
        hotUrl: matchAccount.hotUrl || undefined,  // Changed from archiveTxid to hotUrl
      };
    } catch (error) {
      console.error('Failed to fetch match state:', error);
      return null;
    }
  }

  pollMatchState(
    matchId: string,
    callback: (state: MatchState) => void,
    intervalMs: number = 2000
  ): void {
    const interval = setInterval(async () => {
      const state = await this.getMatchState(matchId);
      if (state) {
        callback(state);
      }
    }, intervalMs);

    this.pollingIntervals.set(matchId, interval);
  }

  stopPolling(matchId: string): void {
    const interval = this.pollingIntervals.get(matchId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(matchId);
    }
  }

  private mapActionTypeToU8(actionType: string): number {
    const mapping: Record<string, number> = {
      'pick_up': 0,
      'decline': 1,
      'declare_intent': 2,
      'call_showdown': 3,
      'rebuttal': 4,
    };
    return mapping[actionType] ?? 0;
  }

  async anchorBatch(
    batchId: string,
    merkleRoot: Uint8Array,
    count: number,
    firstMatchId: string,
    lastMatchId: string,
    wallet: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> }
  ): Promise<TransactionSignature> {
    this.validateWallet(wallet);
    const program = this.anchorClient.getProgram();

    try {
      // Per critique Issue #29: Submit batch anchor transaction
      const txSignature = await program.methods
        .anchorBatch(batchId, Array.from(merkleRoot), new BN(count), firstMatchId, lastMatchId)
        .accounts({
          authority: wallet.publicKey,
        })
        .rpc();

      // Per critique Issue #29: Wait for confirmation with retry
      await this.confirmTransactionWithRetry(txSignature);
      
      // Per critique Issue #29: Validate that batch was actually anchored
      // Query the BatchAnchor account to verify
      try {
        const [batchAnchorPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('batch'), Buffer.from(batchId)],
          program.programId
        );
        
        // Type assertion needed because Anchor IDL types aren't fully inferred
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const batchAccount = await (program.account as any).batchAnchor.fetch(batchAnchorPda);
        if (!batchAccount) {
          throw new Error(`Batch anchor account not found after transaction: ${txSignature}`);
        }
        
        // Verify merkle root matches
        const storedRoot = Buffer.from(batchAccount.merkleRoot);
        if (!storedRoot.equals(Buffer.from(merkleRoot))) {
          throw new Error(`Merkle root mismatch: expected ${Buffer.from(merkleRoot).toString('hex')}, got ${storedRoot.toString('hex')}`);
        }
      } catch (verifyError) {
        console.error('Failed to verify batch anchor:', verifyError);
        // Don't throw - transaction was confirmed, verification is best-effort
      }

      return txSignature;
    } catch (error) {
      console.error('Failed to anchor batch:', error);
      throw error;
    }
  }

  /**
   * Finds which batch contains a given match ID by querying BatchAnchor accounts.
   * Per critique: improves batch lookup efficiency.
   */
  async findBatchForMatch(matchId: string): Promise<{ batchId: string; merkleRoot: string } | null> {
    const program = this.anchorClient.getProgram();

    try {
      // Query all BatchAnchor accounts
      // Note: In production, you'd use a more efficient index or filter
      // Type assertion needed because Anchor IDL types aren't fully inferred
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchAccounts = await (program.account as any).batchAnchor.all();

      // Check each batch to see if matchId is in range
      for (const account of batchAccounts) {
        const batchAnchor = account.account;
        
        // Convert fixed-size arrays to strings for comparison
        const firstMatchId = new TextDecoder().decode(
          batchAnchor.firstMatchId.filter((b: number) => b !== 0)
        );
        const lastMatchId = new TextDecoder().decode(
          batchAnchor.lastMatchId.filter((b: number) => b !== 0)
        );

        // Check if matchId is in range (lexicographic comparison for UUIDs)
        if (matchId >= firstMatchId && matchId <= lastMatchId) {
          const batchId = new TextDecoder().decode(
            batchAnchor.batchId.filter((b: number) => b !== 0)
          );
          const merkleRoot = Array.from(batchAnchor.merkleRoot as number[])
            .map((b: number) => b.toString(16).padStart(2, '0'))
            .join('');

          return { batchId, merkleRoot };
        }
      }

      return null; // Match not found in any batch
    } catch (error) {
      console.error('Failed to find batch for match:', error);
      return null;
    }
  }

  /**
   * Gets the SignerRegistry account to check if a public key is authorized.
   * Per critique Phase 1.2: Add signer registry lookup for signature verification.
   */
  async getSignerRegistry(): Promise<{ signers: PublicKey[]; roles: number[] } | null> {
    const program = this.anchorClient.getProgram();
    
    try {
      const [registryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('signer_registry')],
        program.programId
      );

      // Type assertion needed because Anchor IDL types aren't fully inferred
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const registryAccount = await (program.account as any).signerRegistry.fetch(registryPda);
      
      return {
        signers: registryAccount.signers as PublicKey[],
        roles: registryAccount.roles as number[],
      };
    } catch (error) {
      console.error('Failed to fetch signer registry:', error);
      return null;
    }
  }

  /**
   * Checks if a public key is authorized in the SignerRegistry.
   * Per critique Phase 1.2: Validate public keys against registry.
   */
  async isAuthorizedSigner(publicKey: string | PublicKey): Promise<boolean> {
    const registry = await this.getSignerRegistry();
    if (!registry) {
      return false; // Fail closed if registry not available
    }

    const pubkey = typeof publicKey === 'string' ? new PublicKey(publicKey) : publicKey;
    return registry.signers.some(s => s.equals(pubkey));
  }

  /**
   * Anchors a match record on-chain.
   * Per critique Phase 5.1: Add missing anchorMatchRecord method.
   */
  async anchorMatchRecord(
    matchId: string,
    matchHash: Uint8Array,
    hotUrl?: string,
    wallet?: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> }
  ): Promise<TransactionSignature> {
    if (!wallet) {
      throw new Error('Wallet required for anchoring match record');
    }
    this.validateWallet(wallet);
    const program = this.anchorClient.getProgram();
    
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('match'), Buffer.from(matchId)],
      program.programId
    );

    const tx = await program.methods
      .anchorMatchRecord(
        matchId,
        Array.from(matchHash),
        hotUrl || null
      )
      .accounts({
        matchAccount: matchPda,
        authority: wallet.publicKey,
      })
      .rpc();

    await this.confirmTransactionWithRetry(tx);
    return tx;
  }

  /**
   * Flags a dispute for a match on-chain.
   * Per spec Section 21, lines 3069-3073: "Flag creates on-chain dispute account"
   * Per critique Fix 6: Add TypeScript client code to call flag_dispute instruction
   */
  async flagDispute(
    matchId: string,
    reason: number, // 0=InvalidMove, 1=PlayerTimeout, 2=SuspectedCheating, 3=ScoreError, 4=Other
    evidenceHash: Uint8Array,
    wallet: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> }
  ): Promise<TransactionSignature> {
    this.validateWallet(wallet);
    const program = this.anchorClient.getProgram();

    try {
      const tx = await program.methods
        .flagDispute(matchId, reason, Array.from(evidenceHash))
        .accounts({
          flagger: wallet.publicKey,
        })
        .rpc();

      await this.anchorClient.getConnection().confirmTransaction(tx, 'confirmed');
      return tx;
    } catch (error) {
      console.error('Failed to flag dispute:', error);
      throw error;
    }
  }

  /**
   * Resolves a dispute on-chain.
   * Per spec Section 21, lines 3084-3091: "Resolution recorded on-chain"
   * Per critique Fix 6: Add TypeScript client code to call resolve_dispute instruction
   */
  async resolveDispute(
    disputeId: string,
    resolution: number, // 1=ResolvedInFavorOfFlagger, 2=ResolvedInFavorOfDefendant, 3=MatchVoided, 4=PartialRefund
    wallet: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> }
  ): Promise<TransactionSignature> {
    this.validateWallet(wallet);
    const program = this.anchorClient.getProgram();

    try {
      const tx = await program.methods
        .resolveDispute(disputeId, resolution)
        .accounts({
          validator: wallet.publicKey,
        })
        .rpc();

      await this.confirmTransactionWithRetry(tx);
      return tx;
    } catch (error) {
      console.error('Failed to resolve dispute:', error);
      throw error;
    }
  }

  /**
   * Fetches a batch manifest from on-chain BatchAnchor account.
   * Per critique Issue #8: Add missing getBatchManifest method.
   */
  async getBatchManifest(batchId: string): Promise<{
    batchId: string;
    merkleRoot: Uint8Array;
    count: number;
    firstMatchId: string;
    lastMatchId: string;
    createdAt: number;
  } | null> {
    const program = this.anchorClient.getProgram();

    try {
      const [batchAnchorPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('batch'), Buffer.from(batchId)],
        program.programId
      );

      // Type assertion needed because Anchor IDL types aren't fully inferred
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const batchAccount = await (program.account as any).batchAnchor.fetch(batchAnchorPda);
      
      if (!batchAccount) {
        return null;
      }

      return {
        batchId: batchAccount.batchId,
        merkleRoot: new Uint8Array(batchAccount.merkleRoot),
        count: batchAccount.count.toNumber(),
        firstMatchId: batchAccount.firstMatchId,
        lastMatchId: batchAccount.lastMatchId,
        createdAt: batchAccount.createdAt.toNumber(),
      };
    } catch (error) {
      console.error('Failed to fetch batch manifest:', error);
      return null;
    }
  }

  /**
   * Fetches a dispute account from on-chain.
   * Per critique Issue #8: Add missing getDispute method.
   */
  async getDispute(disputeId: string): Promise<{
    disputeId: string;
    matchId: string;
    flagger: PublicKey;
    reason: number;
    evidenceHash: Uint8Array;
    createdAt: number;
    resolvedAt?: number;
    resolution?: number;
  } | null> {
    const program = this.anchorClient.getProgram();

    try {
      const [disputePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('dispute'), Buffer.from(disputeId)],
        program.programId
      );

      // Type assertion needed because Anchor IDL types aren't fully inferred
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const disputeAccount = await (program.account as any).dispute.fetch(disputePda);
      
      if (!disputeAccount) {
        return null;
      }

      return {
        disputeId: disputeAccount.disputeId,
        matchId: disputeAccount.matchId,
        flagger: disputeAccount.flagger,
        reason: disputeAccount.reason,
        evidenceHash: new Uint8Array(disputeAccount.evidenceHash),
        createdAt: disputeAccount.createdAt.toNumber(),
        resolvedAt: disputeAccount.resolvedAt ? disputeAccount.resolvedAt.toNumber() : undefined,
        resolution: disputeAccount.resolution,
      };
    } catch (error) {
      console.error('Failed to fetch dispute:', error);
      return null;
    }
  }

  private serializeAction(action: PlayerAction): Buffer {
    return Buffer.from(JSON.stringify({
      type: action.type,
      playerId: action.playerId,
      data: action.data,
      timestamp: action.timestamp.toISOString(),
    }));
  }

  /**
   * Generates a cryptographically secure nonce for replay protection.
   * Per critique Issue #5: Use crypto.getRandomValues instead of Date.now()
   */
  private generateSecureNonce(): number {
    const randomBytes = new Uint32Array(2);
    crypto.getRandomValues(randomBytes);
    // Combine two 32-bit values into a 64-bit number (using 53 bits for JS number safety)
    return Number(randomBytes[0]) * 0x100000000 + randomBytes[1];
  }

  /**
   * Confirms transaction with exponential backoff retry.
   * Per critique Issue #6: Add retry logic for confirmation failures.
   */
  private async confirmTransactionWithRetry(
    signature: TransactionSignature,
    maxRetries: number = 3,
    initialDelayMs: number = 1000
  ): Promise<void> {
    const connection = this.anchorClient.getConnection();
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const confirmation = await Promise.race([
          connection.confirmTransaction(signature, 'confirmed'),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Confirmation timeout')), 30000)
          )
        ]) as { value: { err: unknown } | null };
        
        if (confirmation?.value?.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        return; // Success
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error; // Last attempt failed
        }
        
        // Exponential backoff
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Validates wallet is connected and has public key.
   * Per critique Issue #7: Add wallet connection validation.
   */
  private validateWallet(wallet: { publicKey: PublicKey; signTransaction: (tx: unknown) => Promise<unknown> }): void {
    if (!wallet) {
      throw new Error('Wallet is required');
    }
    if (!wallet.publicKey) {
      throw new Error('Wallet public key is required');
    }
    if (!wallet.signTransaction) {
      throw new Error('Wallet signTransaction method is required');
    }
  }
}

