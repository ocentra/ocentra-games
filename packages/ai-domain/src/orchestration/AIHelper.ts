import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { RequestPlayerHandDetailEvent } from '@ocentra/eventing-domain/events/game/RequestPlayerHandDetailEvent';
import { RequestScoreManagerDetailsEvent } from '@ocentra/eventing-domain/events/game/RequestScoreManagerDetailsEvent';
import { RequestRemainingCardsCountEvent } from '@ocentra/eventing-domain/events/game/RequestRemainingCardsCountEvent';
import { RequestFloorCardsDetailEvent } from '@ocentra/eventing-domain/events/game/RequestFloorCardsDetailEvent';
import { RequestAllPlayersDataEvent } from '@ocentra/eventing-domain/events/game/RequestAllPlayersDataEvent';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const LOG_AI = false;

const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_AI) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const AI_PLAYER_ACTIONS = {
  PICK_UP: 'pick_up',
  DECLINE: 'decline',
  DECLARE_INTENT: 'declare_intent',
  CALL_SHOWDOWN: 'call_showdown',
  REBUTTAL: 'rebuttal',
} as const;

interface GameRulesLike {
  LLM?: string | null;
  bonusRules?: string | null;
  moveValidityConditions?: Record<string, unknown> | null;
  exampleHands?: unknown;
}

interface GameInfoLike {
  LLM?: string | null;
}

interface StrategyLike {
  LLM?: string | null;
}

interface AssetRef<T> {
  asset?: T | null;
}

export interface GameModeLike {
  gameRulesAsset?: AssetRef<GameRulesLike>;
  gameInfoAsset?: AssetRef<GameInfoLike>;
  strategyAsset?: AssetRef<StrategyLike>;
}

interface CardLike {
  suit: string;
  value: number;
}

export class AIHelper {
  private static instance: AIHelper | null = null;

  private constructor() {}

  static getInstance(): AIHelper {
    if (!AIHelper.instance) {
      AIHelper.instance = new AIHelper();
    }
    return AIHelper.instance;
  }

  GetSystemMessage(gameMode: GameModeLike): string {
    const gameRules = gameMode.gameRulesAsset?.asset;
    const gameInfo = gameMode.gameInfoAsset?.asset;
    const strategy = gameMode.strategyAsset?.asset;

    if (!gameRules || !gameInfo || !strategy) {
      return '';
    }

    const rulesText = gameRules.LLM || '';
    const bonusRules = gameRules.bonusRules || '';
    const moveValidity = gameRules.moveValidityConditions || {};
    const gameDescription = gameInfo.LLM || '';
    const strategyText = strategy.LLM || '';
    const examples = Array.isArray(gameRules.exampleHands) ? gameRules.exampleHands : [];

    let systemMessage = `You are an AI assistant playing ${gameDescription}\n\n`;
    systemMessage += `GAME RULES:\n${rulesText}\n\n`;

    if (bonusRules) {
      systemMessage += `BONUS RULES:\n${bonusRules}\n\n`;
    }

    if (Object.keys(moveValidity).length > 0) {
      systemMessage += `MOVE VALIDITY:\n${JSON.stringify(moveValidity)}\n\n`;
    }

    if (strategyText) {
      const tips = strategyText.split('\n').filter((t) => t.trim());
      if (tips.length > 0) {
        systemMessage += 'STRATEGY TIPS:\n';
        tips.forEach((tip: string, index: number) => {
          systemMessage += `${index + 1}. ${tip}\n`;
        });
        systemMessage += '\n';
      }
    }

    if (examples.length > 0) {
      systemMessage += 'EXAMPLE HANDS:\n';
      examples.forEach((example: string, index: number) => {
        systemMessage += `${index + 1}. ${example}\n`;
      });
      systemMessage += '\n';
    }

    systemMessage += `Your goal is to make optimal decisions based on the current game state. `;
    systemMessage += `Respond with a JSON object containing your decision: {"action": "${AI_PLAYER_ACTIONS.PICK_UP}"|"${AI_PLAYER_ACTIONS.DECLINE}"|"${AI_PLAYER_ACTIONS.DECLARE_INTENT}"|"${AI_PLAYER_ACTIONS.CALL_SHOWDOWN}"|"${AI_PLAYER_ACTIONS.REBUTTAL}", "data": {...}, "reasoning": "brief explanation"}`;

    return systemMessage;
  }

  async GetUserPrompt(playerId: string): Promise<string> {
    try {
      const handEvent = new RequestPlayerHandDetailEvent(playerId);
      const scoreEvent = new RequestScoreManagerDetailsEvent();
      const cardsCountEvent = new RequestRemainingCardsCountEvent();
      const floorCardsEvent = new RequestFloorCardsDetailEvent();
      const allPlayersEvent = new RequestAllPlayersDataEvent();

      EventBus.instance.publish(handEvent);
      EventBus.instance.publish(scoreEvent);
      EventBus.instance.publish(cardsCountEvent);
      EventBus.instance.publish(floorCardsEvent);
      EventBus.instance.publish(allPlayersEvent);

      const [handResult, scoreResult, remainingResult, floorResult, allPlayersResult] = await Promise.all([
        handEvent.deferred.promise,
        scoreEvent.deferred.promise,
        cardsCountEvent.deferred.promise,
        floorCardsEvent.deferred.promise,
        allPlayersEvent.deferred.promise,
      ]);

      const hand = handResult?.isSuccess ? handResult.value : undefined;
      const scoreData = scoreResult?.isSuccess ? scoreResult.value : undefined;
      const remainingCards = remainingResult?.isSuccess ? remainingResult.value : undefined;
      const floorCards = floorResult?.isSuccess ? floorResult.value : undefined;
      const allPlayers = allPlayersResult?.isSuccess ? allPlayersResult.value : undefined;

      let userPrompt = 'CURRENT GAME STATE:\n\n';

      if (hand && Array.isArray(hand)) {
        userPrompt += 'YOUR HAND:\n';
        hand.forEach((card: CardLike, index: number) => {
          userPrompt += `${index + 1}. ${card.value} of ${card.suit}\n`;
        });
        userPrompt += '\n';
      }

      if (floorCards && Array.isArray(floorCards) && floorCards.length > 0) {
        const floorCard = floorCards[0] as CardLike;
        userPrompt += `FLOOR CARD: ${floorCard.value} of ${floorCard.suit}\n\n`;
      }

      if (remainingCards !== undefined) {
        userPrompt += `REMAINING CARDS IN DECK: ${remainingCards}\n\n`;
      }

      if (scoreData) {
        userPrompt += `SCORE INFORMATION:\n${JSON.stringify(scoreData, null, 2)}\n\n`;
      }

      if (allPlayers && Array.isArray(allPlayers)) {
        userPrompt += 'OTHER PLAYERS:\n';
        allPlayers.forEach(
          (player: {
            id: string;
            name?: string;
            displayName?: string;
            score?: number;
            declaredSuit?: unknown;
            hand?: unknown[];
            metadata?: Record<string, unknown>;
          }) => {
            if (player.id !== playerId) {
              const name = player.name ?? player.displayName ?? 'Unknown';
              const score = player.score ?? (player.metadata?.score as number | undefined) ?? 0;
              const declaredSuit = player.declaredSuit ?? player.metadata?.declaredSuit ?? 'None';
              const handLen = Array.isArray(player.hand)
                ? player.hand.length
                : Array.isArray(player.metadata?.hand)
                  ? player.metadata.hand.length
                  : 0;
              userPrompt += `- ${name}: Score ${score}, `;
              userPrompt += `Declared Suit: ${String(declaredSuit) || 'None'}, `;
              userPrompt += `Cards in hand: ${handLen}\n`;
            }
          }
        );
        userPrompt += '\n';
      }

      userPrompt += 'What is your decision?';

      return userPrompt;
    } catch (error) {
      logError('[AIHelper] [GetUserPrompt] Error gathering game state:', error, LOG_AI);
      return 'CURRENT GAME STATE:\nUnable to retrieve full game state. Please make a decision based on available information.';
    }
  }

  async GetAIInstructions(
    gameMode: GameModeLike,
    playerId: string
  ): Promise<{ systemMessage: string; userPrompt: string }> {
    const systemMessage = this.GetSystemMessage(gameMode);
    const userPrompt = await this.GetUserPrompt(playerId);

    return {
      systemMessage,
      userPrompt,
    };
  }
}
