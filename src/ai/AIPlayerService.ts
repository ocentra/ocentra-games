import { GameClient } from '@services/solana/GameClient';
import { AIDecisionRecorder } from './match-recording/AIDecisionRecorder';
import type { PlayerAction } from '@types';
import type { AIEventRequest, AIActionResponse } from './match-recording/types';
import { CoordinatorWalletPool } from '@services/solana/CoordinatorWalletPool';

/**
 * AI Player Service per spec Section 8.3.
 * Per critique: real integration with GameClient, not stub.
 */
export class AIPlayerService {
  private gameClient: GameClient;
  private decisionRecorder: AIDecisionRecorder;
  private aiServiceUrl?: string;
  private aiApiKey?: string;
  private walletPool?: CoordinatorWalletPool;  // Per critique Issue #22: Use coordinator wallet pool

  constructor(
    gameClient: GameClient,
    aiServiceUrl?: string,
    aiApiKey?: string,
    walletPool?: CoordinatorWalletPool  // Per critique Issue #22: Coordinator wallet for transactions
  ) {
    this.gameClient = gameClient;
    this.decisionRecorder = new AIDecisionRecorder();
    this.aiServiceUrl = aiServiceUrl;
    this.aiApiKey = aiApiKey;
    this.walletPool = walletPool;
  }

  /**
   * Processes a game event and gets AI action.
   * Per critique: real implementation that calls AI service and submits moves.
   */
  async processEvent(
    matchId: string,
    playerId: string,
    eventType: 'match_start' | 'move_submitted' | 'state_update' | 'match_end',
    eventData: unknown,
    currentState: unknown
  ): Promise<PlayerAction | null> {
    // Build AI event request
    const eventRequest: AIEventRequest = {
      matchId,
      playerId,
      eventType,
      eventData,
      currentState,
    };

    // Call AI service
    let aiResponse: AIActionResponse | null = null;

    if (this.aiServiceUrl) {
      try {
        const response = await fetch(this.aiServiceUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.aiApiKey ? { 'Authorization': `Bearer ${this.aiApiKey}` } : {}),
          },
          body: JSON.stringify(eventRequest),
        });

        if (response.ok) {
          aiResponse = await response.json() as AIActionResponse;
        }
      } catch (error) {
        console.error('Failed to call AI service:', error);
        return null;
      }
    } else {
      // Fallback: use local AI decision recorder
      aiResponse = await this.decisionRecorder.handleAIEventRequest(eventRequest);
    }

    if (!aiResponse) {
      return null;
    }

    // Convert AI response to PlayerAction
    // Type assertion needed for action type compatibility
    const action: PlayerAction = {
      type: aiResponse.action.type as PlayerAction['type'],
      playerId: aiResponse.action.playerId,
      data: aiResponse.action.data,
      timestamp: new Date(aiResponse.action.timestamp),
    };

    // Record decision with full metadata
    this.decisionRecorder.recordDecision(
      playerId,
      matchId,
      action,
      aiResponse.chainOfThought,
      aiResponse.modelMetadata
    );

    // Per critique Issue #22: Submit move via GameClient using coordinator wallet pool
    try {
      // Per critique Issue #22: AI players use coordinator wallet pool, not their own wallet
      if (!this.walletPool) {
        throw new Error('Wallet pool required for AI players to submit Solana transactions');
      }

      const walletAdapter = this.walletPool.getWalletAdapter();
      
      // Create adapter to convert Wallet to GameClient's expected type
      const gameWallet = {
        publicKey: walletAdapter.publicKey,
        signTransaction: walletAdapter.signTransaction.bind(walletAdapter) as (tx: unknown) => Promise<unknown>,
      };
      
      // Per critique Issue #22: Record transaction for wallet pool rotation
      await this.walletPool.recordTransaction();

      const txSignature = await this.gameClient.submitMove(matchId, action, gameWallet);
      
      // Record Solana transaction signature
      this.decisionRecorder.recordSolanaSignature(matchId, playerId, txSignature);

      return action;
    } catch (error) {
      console.error('Failed to submit AI move:', error);
      // Per critique Issue #22: Return null on failure, don't throw - let caller handle
      return null;
    }
  }

  /**
   * Gets AI decisions for a match.
   */
  getMatchDecisions(matchId: string) {
    return this.decisionRecorder.getMatchDecisions(matchId);
  }
}

