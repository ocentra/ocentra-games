import { AIPlayerService as DomainAIPlayerService } from '@ocentra/ai-domain/orchestration/AIPlayerService';
import type { AIPlayerAction, WalletPoolAdapter } from '@ocentra/ai-domain/orchestration/AIPlayerService';
import { GameClient } from '@ocentra/solana-domain/GameClient';
import { CoordinatorWalletPool } from '@ocentra/solana-domain/CoordinatorWalletPool';
import {
  PlayerActionType as SolanaPlayerActionType,
  type PlayerAction as SolanaPlayerAction,
} from '@ocentra/solana-domain/types';
import type { PlayerAction } from '@ocentra/game-domain/types/game';

export class AIPlayerService extends DomainAIPlayerService {
  constructor(
    gameClient: GameClient,
    aiServiceUrl?: string,
    aiApiKey?: string,
    walletPool?: CoordinatorWalletPool
  ) {
    super({
      submitMove: async (matchId, action, wallet) => {
        const typedAction: SolanaPlayerAction = {
          type: toSolanaPlayerActionType(action.type),
          playerId: action.playerId,
          data: action.data,
          timestamp: action.timestamp,
        };
        const typedWallet = {
          publicKey: wallet.publicKey as never,
          signTransaction: wallet.signTransaction,
        };
        return gameClient.submitMove(matchId, typedAction, typedWallet);
      },
      aiServiceUrl,
      aiApiKey,
      walletPool: walletPool as unknown as WalletPoolAdapter | undefined,
      fetchAdapter: async (url: string, init?: RequestInit): Promise<Response> => {
        if (typeof globalThis.fetch !== 'function') {
          throw new Error('Main-app host fetch is unavailable for AIPlayerService.');
        }
        return globalThis.fetch(url, init);
      },
    });
  }

  override async processEvent(
    matchId: string,
    playerId: string,
    eventType: 'match_start' | 'move_submitted' | 'state_update' | 'match_end',
    eventData: unknown,
    currentState: unknown
  ): Promise<PlayerAction | null> {
    const result = await super.processEvent(matchId, playerId, eventType, eventData, currentState);
    if (!result) {
      return null;
    }
    const action = result as AIPlayerAction;
    return {
      type: action.type as PlayerAction['type'],
      playerId: action.playerId,
      data: action.data,
      timestamp: action.timestamp,
    };
  }
}

function toSolanaPlayerActionType(type: string): SolanaPlayerAction['type'] {
  switch (type) {
    case SolanaPlayerActionType.PICK_UP:
    case SolanaPlayerActionType.DECLINE:
    case SolanaPlayerActionType.DECLARE_INTENT:
    case SolanaPlayerActionType.CALL_SHOWDOWN:
    case SolanaPlayerActionType.REBUTTAL:
    case SolanaPlayerActionType.REVEAL_FLOOR_CARD:
      return type;
    default:
      throw new Error(`Unsupported on-chain AI action type: ${type}`);
  }
}
