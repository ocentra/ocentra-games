import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { AIDecisionRecorder } from '@/orchestration/match-recording/AIDecisionRecorder';
import type { AIActionResponse, AIEventRequest } from '@/orchestration/match-recording/types';

const log = MainAppLogger.instance;
const LOG_AI = false;

const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_AI) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

MainAppLogger.instance.register(import.meta.url);

export interface AIPlayerAction {
  type: string;
  playerId: string;
  data?: unknown;
  timestamp: Date;
}

export interface WalletPoolAdapter {
  getWalletAdapter(): {
    publicKey: unknown;
    signTransaction: (tx: unknown) => Promise<unknown>;
  };
  recordTransaction(): Promise<void>;
}

export interface AIPlayerServiceOptions {
  submitMove: (
    matchId: string,
    action: AIPlayerAction,
    wallet: { publicKey: unknown; signTransaction: (tx: unknown) => Promise<unknown> }
  ) => Promise<string>;
  aiServiceUrl?: string;
  aiApiKey?: string;
  walletPool?: WalletPoolAdapter;
  fetchAdapter?: (url: string, init?: RequestInit) => Promise<Response>;
  decisionRecorder?: AIDecisionRecorder;
}

export class AIPlayerService {
  private submitMove: AIPlayerServiceOptions['submitMove'];
  private decisionRecorder: AIDecisionRecorder;
  private aiServiceUrl?: string;
  private aiApiKey?: string;
  private walletPool?: WalletPoolAdapter;
  private fetchAdapter: ((url: string, init?: RequestInit) => Promise<Response>) | null;

  constructor(options: AIPlayerServiceOptions) {
    this.submitMove = options.submitMove;
    this.decisionRecorder = options.decisionRecorder ?? new AIDecisionRecorder();
    this.aiServiceUrl = options.aiServiceUrl;
    this.aiApiKey = options.aiApiKey;
    this.walletPool = options.walletPool;
    this.fetchAdapter = options.fetchAdapter ?? null;
    if (this.aiServiceUrl && !this.fetchAdapter) {
      throw new Error(
        'AIPlayerService requires an explicit fetchAdapter when aiServiceUrl is configured.'
      );
    }
  }

  async processEvent(
    matchId: string,
    playerId: string,
    eventType: 'match_start' | 'move_submitted' | 'state_update' | 'match_end',
    eventData: unknown,
    currentState: unknown
  ): Promise<AIPlayerAction | null> {
    const eventRequest: AIEventRequest = {
      matchId,
      playerId,
      eventType,
      eventData,
      currentState,
    };

    let aiResponse: AIActionResponse | null = null;

    if (this.aiServiceUrl) {
      try {
        if (!this.fetchAdapter) {
          throw new Error(
            'AIPlayerService requires an explicit fetchAdapter when aiServiceUrl is configured.'
          );
        }
        const response = await this.fetchAdapter(this.aiServiceUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.aiApiKey ? { Authorization: `Bearer ${this.aiApiKey}` } : {}),
          },
          body: JSON.stringify(eventRequest),
        });

        if (response.ok) {
          aiResponse = (await response.json()) as AIActionResponse;
        }
      } catch (error) {
        logError('Failed to call AI service:', error, LOG_AI);
        return null;
      }
    } else {
      aiResponse = await this.decisionRecorder.handleAIEventRequest(eventRequest);
    }

    if (!aiResponse) {
      return null;
    }

    const action: AIPlayerAction = {
      type: aiResponse.action.type,
      playerId: aiResponse.action.playerId,
      data: aiResponse.action.data,
      timestamp: new Date(aiResponse.action.timestamp),
    };

    this.decisionRecorder.recordDecision(
      playerId,
      matchId,
      action,
      aiResponse.chainOfThought,
      aiResponse.modelMetadata
    );

    try {
      if (!this.walletPool) {
        throw new Error('Wallet pool required for AI players to submit Solana transactions');
      }

      const walletAdapter = this.walletPool.getWalletAdapter();

      const gameWallet = {
        publicKey: walletAdapter.publicKey,
        signTransaction: walletAdapter.signTransaction.bind(walletAdapter) as (
          tx: unknown
        ) => Promise<unknown>,
      };

      await this.walletPool.recordTransaction();

      const txSignature = await this.submitMove(matchId, action, gameWallet);

      this.decisionRecorder.recordSolanaSignature(matchId, playerId, txSignature);

      return action;
    } catch (error) {
      logError('Failed to submit AI move:', error, LOG_AI);
      return null;
    }
  }

  getMatchDecisions(matchId: string) {
    return this.decisionRecorder.getMatchDecisions(matchId);
  }
}
