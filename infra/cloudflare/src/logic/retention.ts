export interface ProgressionSnapshot {
  level: number;
  totalXpEarned: number;
  xp: number;
  skillPoints?: number;
  skillsUnlocked?: string[];
  achievementPoints?: number;
}

export interface DailyRewardSnapshot {
  day?: number;
  claimed?: boolean;
  streak?: number;
}

export interface PersonalizedContent {
  userId: string;
  generatedAt: number;
  recommendations: { games: unknown[]; missions: unknown[]; offers: unknown[] };
  difficulty: { adjustment: 'increase' | 'decrease' | 'maintain'; reason: string };
  timing: { bestNotificationTime: number; predictedNextSession: number; sessionLengthPrediction: number };
}

export function getPersonalizedContentFromData(
  userId: string,
  progression: ProgressionSnapshot,
  _daily: DailyRewardSnapshot
): PersonalizedContent {
  const level = progression?.level ?? 1;
  const totalXp = progression?.totalXpEarned ?? 0;
  const now = Date.now();
  const difficulty =
    level >= 10 && totalXp > 5000
      ? { adjustment: 'increase' as const, reason: 'win_rate_too_high' }
      : level <= 2 && totalXp < 100
        ? { adjustment: 'decrease' as const, reason: 'win_rate_too_low' }
        : { adjustment: 'maintain' as const, reason: 'balanced' };
  return {
    userId,
    generatedAt: now,
    recommendations: { games: [], missions: [], offers: [] },
    difficulty,
    timing: {
      bestNotificationTime: 18,
      predictedNextSession: now + 86400000,
      sessionLengthPrediction: 900,
    },
  };
}

export type ChurnRisk = 'low' | 'medium' | 'high' | 'critical';

export interface ChurnPrediction {
  userId: string;
  churnRisk: ChurnRisk;
  churnProbability: number;
  predictedChurnDate?: number;
  contributingFactors: { factor: string; weight: number; currentValue: number; threshold: number }[];
  recommendedActions: { action: string; priority: number; expectedImpact: number; config: unknown }[];
  modelVersion: string;
  calculatedAt: number;
}

export function getChurnPredictionFromData(
  userId: string,
  progression: ProgressionSnapshot,
  daily: DailyRewardSnapshot
): ChurnPrediction {
  const level = progression?.level ?? 1;
  const totalXp = progression?.totalXpEarned ?? 0;
  const claimed = daily?.claimed ?? false;
  const streak = daily?.streak ?? 0;
  const now = Date.now();
  let churnProbability = 0.2;
  const factors: ChurnPrediction['contributingFactors'] = [];
  if (level < 2) {
    churnProbability += 0.2;
    factors.push({ factor: 'low_level', weight: 0.3, currentValue: level, threshold: 2 });
  }
  if (totalXp < 100) {
    churnProbability += 0.15;
    factors.push({ factor: 'low_xp', weight: 0.25, currentValue: totalXp, threshold: 100 });
  }
  if (!claimed && streak === 0) {
    churnProbability += 0.25;
    factors.push({ factor: 'daily_not_claimed', weight: 0.35, currentValue: 0, threshold: 1 });
  }
  churnProbability = Math.min(1, churnProbability);
  let churnRisk: ChurnRisk = 'low';
  if (churnProbability > 0.8) churnRisk = 'critical';
  else if (churnProbability > 0.6) churnRisk = 'high';
  else if (churnProbability > 0.3) churnRisk = 'medium';
  const recommendedActions: ChurnPrediction['recommendedActions'] = [];
  if (churnRisk === 'critical' || churnRisk === 'high') {
    recommendedActions.push({
      action: 'push_notification',
      priority: 1,
      expectedImpact: 0.15,
      config: { message: 'come_back_bonus', bonus: '2x_xp' },
    });
  }
  return {
    userId,
    churnRisk,
    churnProbability,
    predictedChurnDate: churnProbability > 0.5 ? now + 7 * 24 * 60 * 60 * 1000 : undefined,
    contributingFactors: factors.length > 0 ? factors : [{ factor: 'engagement', weight: 0.2, currentValue: level, threshold: 5 }],
    recommendedActions,
    modelVersion: 'churn-v1',
    calculatedAt: now,
  };
}
