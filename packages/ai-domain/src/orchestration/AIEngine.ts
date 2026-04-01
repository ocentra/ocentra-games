import { pipeline, env } from '@huggingface/transformers';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const LOG_AI = false;

const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_AI) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = true) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

env.allowLocalModels = false;
env.useBrowserCache = true;

type TextGenerationResult = Array<{
  generated_text: string;
}>;

type TextGenerationFn = (
  prompt: string,
  options?: {
    max_new_tokens?: number;
    temperature?: number;
    do_sample?: boolean;
  }
) => Promise<TextGenerationResult>;

export const AI_PLAYER_ACTIONS = {
  PICK_UP: 'pick_up',
  DECLINE: 'decline',
  DECLARE_INTENT: 'declare_intent',
  CALL_SHOWDOWN: 'call_showdown',
  REBUTTAL: 'rebuttal',
} as const;

export type AIPlayerActionType = (typeof AI_PLAYER_ACTIONS)[keyof typeof AI_PLAYER_ACTIONS];

const AI_GAME_PHASE = {
  FLOOR_REVEAL: 'floor_reveal',
  PLAYER_ACTION: 'player_action',
  SHOWDOWN: 'showdown',
} as const;

export const AI_PERSONALITY = {
  AGGRESSIVE: 'aggressive',
  CONSERVATIVE: 'conservative',
  ADAPTIVE: 'adaptive',
  UNPREDICTABLE: 'unpredictable',
} as const;

export type AIPersonality = (typeof AI_PERSONALITY)[keyof typeof AI_PERSONALITY];

export interface AICard {
  suit: string;
  value: number;
  id: string;
}

export interface AIPlayer {
  id: string;
  name: string;
  hand: AICard[];
  declaredSuit: string | null;
  isAI: boolean;
}

export interface AIGameState {
  players: AIPlayer[];
  currentPlayer: number;
  phase: string;
  deck: AICard[];
  floorCard: AICard | null;
}

export interface AIDecision {
  action: AIPlayerActionType;
  data?: Record<string, unknown>;
  confidence: number;
}

export interface AIConfig {
  personality: AIPersonality;
  difficulty: 'easy' | 'medium' | 'hard';
  enableWebGPU?: boolean;
}

export class AIEngine {
  private generator: TextGenerationFn | null = null;
  private config: AIConfig;
  private playerId: string;

  constructor(playerId: string, config: AIConfig) {
    this.playerId = playerId;
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      const pipelineResult = await pipeline('text-generation', 'Xenova/distilgpt2');
      this.generator = pipelineResult as unknown as TextGenerationFn;
      logInfo('AI engine initialized for player:', this.playerId, LOG_AI);
    } catch (error) {
      logError('Failed to initialize AI engine:', error, LOG_AI);
      this.generator = null;
    }
  }

  async makeDecision(gameState: AIGameState): Promise<AIDecision> {
    const player = gameState.players.find((p) => p.id === this.playerId);
    if (!player) {
      throw new Error(`Player ${this.playerId} not found in game state`);
    }

    if (this.generator) {
      return this.makeDecisionWithModel(gameState, player);
    }
    return this.makeRuleBasedDecision(gameState, player);
  }

  private async makeDecisionWithModel(gameState: AIGameState, player: AIPlayer): Promise<AIDecision> {
    try {
      const prompt = this.createGameStatePrompt(gameState, player);

      if (!this.generator) {
        return this.makeRuleBasedDecision(gameState, player);
      }
      const output = await this.generator(prompt, {
        max_new_tokens: 50,
        temperature: this.getTemperature(),
        do_sample: true,
      });

      return this.parseModelResponse(output[0].generated_text, gameState, player);
    } catch (error) {
      logError('AI model decision failed, falling back to rule-based:', error, LOG_AI);
      return this.makeRuleBasedDecision(gameState, player);
    }
  }

  private createGameStatePrompt(gameState: AIGameState, player: AIPlayer): string {
    return `CLAIM card game decision:
Player: ${player.name}
Hand: ${player.hand.map((card) => `${card.value} of ${card.suit}`).join(', ')}
Phase: ${gameState.phase}
Floor Card: ${gameState.floorCard ? `${gameState.floorCard.value} of ${gameState.floorCard.suit}` : 'None'}
Declared Suits: ${gameState.players.filter((p) => p.declaredSuit).map((p) => p.declaredSuit).join(', ')}
Current Player: ${gameState.players[gameState.currentPlayer].name}

What should the player do next? Choose from: pick_up, decline, declare_intent, call_showdown, rebuttal`;
  }

  private parseModelResponse(response: string, gameState: AIGameState, player: AIPlayer): AIDecision {
    const lowerResponse = response.toLowerCase();

    if (lowerResponse.includes('pick') || lowerResponse.includes('take')) {
      return { action: AI_PLAYER_ACTIONS.PICK_UP, confidence: 0.8 };
    }
    if (lowerResponse.includes('decline') || lowerResponse.includes('pass')) {
      return { action: AI_PLAYER_ACTIONS.DECLINE, confidence: 0.8 };
    }
    if (lowerResponse.includes('declare') && gameState.phase === AI_GAME_PHASE.PLAYER_ACTION) {
      const availableSuits = Array.from(new Set(player.hand.map((card) => card.suit))).filter(
        (suit) => !gameState.players.some((p) => p.declaredSuit === suit)
      );

      if (availableSuits.length > 0) {
        const suit = availableSuits[Math.floor(Math.random() * availableSuits.length)];
        return { action: AI_PLAYER_ACTIONS.DECLARE_INTENT, data: { suit }, confidence: 0.7 };
      }
    }
    if (lowerResponse.includes('showdown') && player.declaredSuit) {
      return { action: AI_PLAYER_ACTIONS.CALL_SHOWDOWN, confidence: 0.7 };
    }
    if (
      lowerResponse.includes('rebuttal') &&
      gameState.phase === AI_GAME_PHASE.SHOWDOWN &&
      !player.declaredSuit
    ) {
      const run = this.findThreeCardRun(player.hand);
      if (run) {
        return { action: AI_PLAYER_ACTIONS.REBUTTAL, data: { cards: run }, confidence: 0.6 };
      }
    }

    return this.makeRuleBasedDecision(gameState, player);
  }

  private makeRuleBasedDecision(gameState: AIGameState, player: AIPlayer): AIDecision {
    switch (gameState.phase) {
      case AI_GAME_PHASE.FLOOR_REVEAL:
        return this.makeFloorRevealDecision(gameState, player);
      case AI_GAME_PHASE.PLAYER_ACTION:
        return this.makePlayerActionDecision(gameState, player);
      case AI_GAME_PHASE.SHOWDOWN:
        return this.makeShowdownDecision(gameState, player);
      default:
        return { action: AI_PLAYER_ACTIONS.DECLINE, confidence: 0.5 };
    }
  }

  private makeFloorRevealDecision(gameState: AIGameState, player: AIPlayer): AIDecision {
    if (!gameState.floorCard) {
      return { action: AI_PLAYER_ACTIONS.DECLINE, confidence: 0.5 };
    }

    const hasMatchingSuit = player.hand.some((card) => card.suit === gameState.floorCard!.suit);

    if (hasMatchingSuit) {
      return { action: AI_PLAYER_ACTIONS.PICK_UP, confidence: 0.8 };
    }

    if (this.config.personality === AI_PERSONALITY.CONSERVATIVE) {
      return { action: AI_PLAYER_ACTIONS.DECLINE, confidence: 0.7 };
    }

    return Math.random() > 0.5
      ? { action: AI_PLAYER_ACTIONS.PICK_UP, confidence: 0.5 }
      : { action: AI_PLAYER_ACTIONS.DECLINE, confidence: 0.5 };
  }

  private makePlayerActionDecision(gameState: AIGameState, player: AIPlayer): AIDecision {
    if (player.declaredSuit) {
      const suitCards = player.hand.filter((card) => card.suit === player.declaredSuit);
      const hasGoodSequence = suitCards.length >= 3;

      if (hasGoodSequence && Math.random() > 0.3) {
        return { action: AI_PLAYER_ACTIONS.CALL_SHOWDOWN, confidence: 0.8 };
      }

      return { action: AI_PLAYER_ACTIONS.DECLINE, confidence: 0.6 };
    }

    const availableSuits = Array.from(new Set(player.hand.map((card) => card.suit))).filter(
      (suit) => !gameState.players.some((p) => p.declaredSuit === suit)
    );

    if (availableSuits.length > 0) {
      let chosenSuit: string;
      if (this.config.personality === AI_PERSONALITY.AGGRESSIVE) {
        chosenSuit = availableSuits[Math.floor(Math.random() * availableSuits.length)];
        return { action: AI_PLAYER_ACTIONS.DECLARE_INTENT, data: { suit: chosenSuit }, confidence: 0.7 };
      }
      if (this.config.personality === AI_PERSONALITY.CONSERVATIVE) {
        if (Math.random() > 0.7) {
          chosenSuit = availableSuits[Math.floor(Math.random() * availableSuits.length)];
          return { action: AI_PLAYER_ACTIONS.DECLARE_INTENT, data: { suit: chosenSuit }, confidence: 0.6 };
        }
      } else if (Math.random() > 0.5) {
        chosenSuit = availableSuits[Math.floor(Math.random() * availableSuits.length)];
        return { action: AI_PLAYER_ACTIONS.DECLARE_INTENT, data: { suit: chosenSuit }, confidence: 0.6 };
      }
    }

    return { action: AI_PLAYER_ACTIONS.DECLINE, confidence: 0.5 };
  }

  private makeShowdownDecision(_gameState: AIGameState, player: AIPlayer): AIDecision {
    if (player.declaredSuit) {
      return { action: AI_PLAYER_ACTIONS.DECLINE, confidence: 0.5 };
    }

    const run = this.findThreeCardRun(player.hand);
    if (run) {
      const shouldRebuttal =
        this.config.personality === AI_PERSONALITY.AGGRESSIVE ? Math.random() > 0.3 : Math.random() > 0.6;

      if (shouldRebuttal) {
        return { action: AI_PLAYER_ACTIONS.REBUTTAL, data: { cards: run }, confidence: 0.7 };
      }
    }

    return { action: AI_PLAYER_ACTIONS.DECLINE, confidence: 0.5 };
  }

  private findThreeCardRun(cards: AICard[]): AICard[] | null {
    const cardsBySuit: Record<string, AICard[]> = {};
    cards.forEach((card) => {
      if (!cardsBySuit[card.suit]) {
        cardsBySuit[card.suit] = [];
      }
      cardsBySuit[card.suit].push(card);
    });

    for (const suit in cardsBySuit) {
      const suitCards = cardsBySuit[suit].sort((a, b) => a.value - b.value);

      for (let i = 0; i <= suitCards.length - 3; i++) {
        const card1 = suitCards[i];
        const card2 = suitCards[i + 1];
        const card3 = suitCards[i + 2];

        if (card2.value === card1.value + 1 && card3.value === card2.value + 1) {
          return [card1, card2, card3];
        }

        if (card1.value === 2 && card2.value === 13 && card3.value === 14) {
          return [card1, card2, card3];
        }
      }
    }

    return null;
  }

  private getTemperature(): number {
    switch (this.config.difficulty) {
      case 'easy':
        return 0.9;
      case 'medium':
        return 0.7;
      case 'hard':
        return 0.5;
      default:
        return 0.7;
    }
  }

  isReady(): boolean {
    return this.generator !== null;
  }
}
