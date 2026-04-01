export interface GameRulesData {
  rulesLLM: string;
  cardRankings?: string;
  strategyTips?: string;
}

export interface BonusRule {
  name: string;
  points: number;
  description?: string;
}

export interface BluffSetting {
  key: string;
  value: string;
}

export interface MoveValidityCondition {
  key: string;
  value: string;
}

export interface ExampleHand {
  key: string;
  value: string;
}

export interface GameStateData {
  playerHand: string;
  scores: string;
  remainingCards: string;
  floorCards: string;
  allPlayersData: string;
}

export interface PromptConfig {
  gameDescription: string;
  strategyTips?: string;
  bonusRules?: BonusRule[];
  bluffSettings?: BluffSetting[];
  moveValidityConditions?: MoveValidityCondition[];
  exampleHands?: ExampleHand[];
}
