import type { ApiPath } from '@/types/brands';
import { ApiPathPrefix } from '@/constants/versions';

const tokensBase = `${ApiPathPrefix}/tokens`;

export const TokensEndpoint = {
  Balance: (userId: string): ApiPath => `${tokensBase}/balance/${userId}` as ApiPath,
  DailyLogin: `${tokensBase}/daily-login` as ApiPath,
  AdReward: `${tokensBase}/ad-reward` as ApiPath,
  GamePayment: `${tokensBase}/game-payment` as ApiPath,
  AICreditsConsume: `${tokensBase}/ai-credits/consume` as ApiPath,
} as const;
