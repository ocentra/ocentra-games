import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';

export interface PlayerStorage {
  list(options: {
    prefix: string;
    limit: number;
    cursor?: string;
  }): Promise<{
    objects: Array<{ key: string }>;
    truncated: boolean;
    cursor?: string;
  }>;
  get(key: string): Promise<{ text(): Promise<string> } | null>;
}

export interface MatchRecord {
  match_id?: string;
  matchId?: string;
  gameType?: number;
  game_type?: number;
  players?: PlayerRecord[];
  scores?: number[];
  winner?: string;
  phase?: number;
  createdAt?: string;
  endedAt?: string;
  start_time?: string;
  events?: Array<{
    type?: string;
    player_id?: string;
    timestamp?: string;
    data?: unknown;
  }>;
}

export type PlayerRecord = {
  player_id?: string;
  public_key?: string;
  pubkey?: string;
  type?: string;
  player_type?: string;
};

export interface PlayerStats {
  user_id: string;
  total_games: number;
  total_wins: number;
  total_losses: number;
  win_rate: number;
  average_score: number;
  total_score: number;
  current_streak: number;
  best_streak: number;
  games_by_type: Record<number, {
    games: number;
    wins: number;
    losses: number;
    win_rate: number;
    average_score: number;
  }>;
  performance_trend: Array<{
    date: string;
    games: number;
    wins: number;
    average_score: number;
    win_rate: number;
  }>;
  skill_progression: {
    starting_win_rate: number;
    current_win_rate: number;
    improvement: number;
    games_to_improve: number;
  };
  confidence_metrics: {
    recent_performance: number;
    consistency: number;
    improvement_rate: number;
    readiness_score: number;
  };
  best_game_type: number | null;
  worst_game_type: number | null;
  last_played?: string;
  first_played?: string;
}

export interface LearningProgress {
  user_id: string;
  total_learning_games: number;
  skill_level: string;
  areas_for_improvement: string[];
  strengths: string[];
  recommended_practice: {
    game_type: number;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  milestones: Array<{
    milestone: string;
    achieved: boolean;
    progress: number;
    target: number;
  }>;
}

export interface PerformanceReport {
  user_id: string;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  summary: {
    games_played: number;
    wins: number;
    losses: number;
    win_rate: number;
    average_score: number;
    improvement: number;
  };
  trends: {
    win_rate_trend: 'improving' | 'declining' | 'stable';
    score_trend: 'improving' | 'declining' | 'stable';
    consistency_trend: 'improving' | 'declining' | 'stable';
  };
  insights: string[];
  recommendations: string[];
  graph_data: {
    dates: string[];
    win_rates: number[];
    average_scores: number[];
    games_played: number[];
  };
}

function isAIPlayer(player: PlayerRecord | undefined): boolean {
  if (!player) return false;
  return Boolean(player.type === 'ai' || player.player_type === 'ai');
}

function isHumanPlayer(player: PlayerRecord | undefined): boolean {
  return !isAIPlayer(player);
}

export async function computePlayerStatsLogic(
  userId: string,
  gameType: number | undefined,
  storage: PlayerStorage
): Promise<PlayerStats> {
  const stats: PlayerStats = {
    user_id: userId,
    total_games: 0,
    total_wins: 0,
    total_losses: 0,
    win_rate: 0,
    average_score: 0,
    total_score: 0,
    current_streak: 0,
    best_streak: 0,
    games_by_type: {},
    performance_trend: [],
    skill_progression: {
      starting_win_rate: 0,
      current_win_rate: 0,
      improvement: 0,
      games_to_improve: 0,
    },
    confidence_metrics: {
      recent_performance: 0,
      consistency: 0,
      improvement_rate: 0,
      readiness_score: 0,
    },
    best_game_type: null,
    worst_game_type: null,
  };

  const matches: Array<{ match: MatchRecord; playerIndex: number; timestamp: string }> = [];
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const listResult = await storage.list({
      prefix: BucketPath.Matches,
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });

    for (const object of listResult.objects) {
      if (!object.key.endsWith('.json') || object.key.includes('/anonymized/')) {
        continue;
      }

      try {
        const matchObject = await storage.get(object.key);
        if (!matchObject) continue;

        const match: MatchRecord = JSON.parse(await matchObject.text());
        if (match.phase !== 3 && match.phase !== undefined) continue;

        const matchGameType = match.gameType ?? match.game_type ?? 0;
        if (gameType !== undefined && matchGameType !== gameType) continue;

        const players = match.players || [];
        const playerIndex = players.findIndex(
          p => (p?.player_id === userId || p?.public_key === userId || p?.pubkey === userId) &&
               isHumanPlayer(p)
        );

        if (playerIndex === -1) continue;

        const timestamp = match.endedAt || match.createdAt || match.start_time || '';
        matches.push({ match, playerIndex, timestamp });
      } catch (error) {
        throw new Error(`Error processing match ${object.key}: ${String(error)}`);
      }
    }

    hasMore = listResult.truncated;
    if (hasMore && 'cursor' in listResult) {
      cursor = listResult.cursor;
    } else {
      hasMore = false;
    }
  }

  matches.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (matches.length === 0) {
    return stats;
  }

  stats.first_played = matches[0].timestamp;
  stats.last_played = matches[matches.length - 1].timestamp;

  let currentStreak = 0;
  let bestStreak = 0;
  const dailyStats = new Map<string, { games: number; wins: number; totalScore: number }>();

  for (const { match, playerIndex } of matches) {
    const matchGameType = match.gameType ?? match.game_type ?? 0;
    const scores = match.scores || [];
    const playerScore = scores[playerIndex] || 0;
    const isWinner = match.winner === userId || 
                    (scores.length > 0 && playerScore === Math.max(...scores));

    stats.total_games++;
    stats.total_score += playerScore;

    if (!stats.games_by_type[matchGameType]) {
      stats.games_by_type[matchGameType] = {
        games: 0,
        wins: 0,
        losses: 0,
        win_rate: 0,
        average_score: 0,
      };
    }

    const typeStats = stats.games_by_type[matchGameType];
    typeStats.games++;
    typeStats.average_score = ((typeStats.average_score * (typeStats.games - 1)) + playerScore) / typeStats.games;

    if (isWinner) {
      stats.total_wins++;
      typeStats.wins++;
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      stats.total_losses++;
      typeStats.losses++;
      currentStreak = 0;
    }

    typeStats.win_rate = typeStats.games > 0 ? (typeStats.wins / typeStats.games) * 100 : 0;

    const timestamp = match.endedAt || match.createdAt || match.start_time || '';
    const dateObj = timestamp ? new Date(timestamp) : new Date();
    const date = isNaN(dateObj.getTime()) ? new Date().toISOString().split('T')[0] : dateObj.toISOString().split('T')[0];
    const dayStats = dailyStats.get(date) || { games: 0, wins: 0, totalScore: 0 };
    dayStats.games++;
    if (isWinner) dayStats.wins++;
    dayStats.totalScore += playerScore;
    dailyStats.set(date, dayStats);
  }

  stats.current_streak = currentStreak;
  stats.best_streak = bestStreak;
  stats.win_rate = stats.total_games > 0 ? (stats.total_wins / stats.total_games) * 100 : 0;
  stats.average_score = stats.total_games > 0 ? stats.total_score / stats.total_games : 0;

  const sortedTypes = Object.entries(stats.games_by_type)
    .sort((a, b) => b[1].win_rate - a[1].win_rate);
  
  if (sortedTypes.length > 0) {
    stats.best_game_type = parseInt(sortedTypes[0][0], 10);
    stats.worst_game_type = parseInt(sortedTypes[sortedTypes.length - 1][0], 10);
  }

  const sortedDates = Array.from(dailyStats.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  stats.performance_trend = sortedDates.map(([date, dayStats]) => ({
    date,
    games: dayStats.games,
    wins: dayStats.wins,
    average_score: dayStats.games > 0 ? dayStats.totalScore / dayStats.games : 0,
    win_rate: dayStats.games > 0 ? (dayStats.wins / dayStats.games) * 100 : 0,
  }));

  if (stats.performance_trend.length >= 2) {
    const firstPeriod = stats.performance_trend.slice(0, Math.floor(stats.performance_trend.length / 3));
    const lastPeriod = stats.performance_trend.slice(-Math.floor(stats.performance_trend.length / 3));

    const firstWinRate = firstPeriod.reduce((sum, d) => sum + d.win_rate, 0) / firstPeriod.length;
    const lastWinRate = lastPeriod.reduce((sum, d) => sum + d.win_rate, 0) / lastPeriod.length;

    stats.skill_progression.starting_win_rate = firstWinRate;
    stats.skill_progression.current_win_rate = lastWinRate;
    stats.skill_progression.improvement = lastWinRate - firstWinRate;
    stats.skill_progression.games_to_improve = stats.total_games;
  }

  const recentMatches = matches.slice(-10);
  const recentWins = recentMatches.filter(m => {
    const scores = m.match.scores || [];
    const playerScore = scores[m.playerIndex] || 0;
    return m.match.winner === userId || (scores.length > 0 && playerScore === Math.max(...scores));
  }).length;

  stats.confidence_metrics.recent_performance = recentMatches.length > 0 ? (recentWins / recentMatches.length) * 100 : 0;
  
  const winRates = stats.performance_trend.map(t => t.win_rate);
  const avgWinRate = winRates.reduce((sum, r) => sum + r, 0) / winRates.length;
  const variance = winRates.reduce((sum, r) => sum + Math.pow(r - avgWinRate, 2), 0) / winRates.length;
  stats.confidence_metrics.consistency = Math.max(0, 100 - Math.sqrt(variance));
  
  stats.confidence_metrics.improvement_rate = stats.skill_progression.improvement;
  stats.confidence_metrics.readiness_score = (
    stats.confidence_metrics.recent_performance * 0.4 +
    stats.confidence_metrics.consistency * 0.3 +
    Math.max(0, stats.confidence_metrics.improvement_rate) * 0.3
  );

  return stats;
}

export async function computeLearningProgressLogic(
  userId: string,
  storage: PlayerStorage
): Promise<LearningProgress> {
  const stats = await computePlayerStatsLogic(userId, undefined, storage);

  const skillLevel = stats.win_rate < 30 ? 'beginner' :
                     stats.win_rate < 50 ? 'intermediate' :
                     stats.win_rate < 70 ? 'advanced' : 'expert';

  const areasForImprovement: string[] = [];
  const strengths: string[] = [];

  for (const [gameType, typeStats] of Object.entries(stats.games_by_type)) {
    if (typeStats.win_rate < 40 && typeStats.games >= 5) {
      areasForImprovement.push(`Game Type ${gameType} (${typeStats.win_rate.toFixed(1)}% win rate)`);
    }
    if (typeStats.win_rate > 60 && typeStats.games >= 5) {
      strengths.push(`Game Type ${gameType} (${typeStats.win_rate.toFixed(1)}% win rate)`);
    }
  }

  if (stats.confidence_metrics.consistency <= 50) {
    areasForImprovement.push('Consistency (high variance in performance)');
  } else {
    strengths.push('Consistent performance');
  }

  const recommendedPractice = Object.entries(stats.games_by_type)
    .filter(([, typeStats]) => typeStats.games >= 3 && typeStats.win_rate < 50)
    .map(([gameType, typeStats]) => ({
      game_type: parseInt(gameType, 10),
      reason: `Win rate ${typeStats.win_rate.toFixed(1)}% - needs improvement`,
      priority: typeStats.win_rate < 30 ? 'high' as const :
                typeStats.win_rate < 40 ? 'medium' as const : 'low' as const,
    }))
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .slice(0, 3);

  const milestones = [
    {
      milestone: 'Play 10 games',
      achieved: stats.total_games >= 10,
      progress: Math.min(100, (stats.total_games / 10) * 100),
      target: 10,
    },
    {
      milestone: 'Achieve 50% win rate',
      achieved: stats.win_rate >= 50,
      progress: Math.min(100, stats.win_rate),
      target: 50,
    },
    {
      milestone: 'Win 5 games in a row',
      achieved: stats.best_streak >= 5,
      progress: Math.min(100, (stats.best_streak / 5) * 100),
      target: 5,
    },
    {
      milestone: 'Play 100 games',
      achieved: stats.total_games >= 100,
      progress: Math.min(100, (stats.total_games / 100) * 100),
      target: 100,
    },
  ];

  return {
    user_id: userId,
    total_learning_games: stats.total_games,
    skill_level: skillLevel,
    areas_for_improvement: areasForImprovement,
    strengths: strengths,
    recommended_practice: recommendedPractice,
    milestones: milestones,
  };
}

export async function generatePerformanceReportLogic(
  userId: string,
  period: 'daily' | 'weekly' | 'monthly' | 'all_time',
  storage: PlayerStorage
): Promise<PerformanceReport> {
  const stats = await computePlayerStatsLogic(userId, undefined, storage);

  const now = new Date();
  const cutoffDate = period === 'daily' ? new Date(now.getTime() - 24 * 60 * 60 * 1000) :
                     period === 'weekly' ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) :
                     period === 'monthly' ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) :
                     new Date(0);

  const periodTrend = stats.performance_trend.filter(t => new Date(t.date) >= cutoffDate);

  const summary = {
    games_played: periodTrend.reduce((sum, t) => sum + t.games, 0),
    wins: periodTrend.reduce((sum, t) => sum + t.wins, 0),
    losses: periodTrend.reduce((sum, t) => sum + (t.games - t.wins), 0),
    win_rate: 0,
    average_score: 0,
    improvement: stats.skill_progression.improvement,
  };

  summary.win_rate = summary.games_played > 0 ? (summary.wins / summary.games_played) * 100 : 0;
  summary.average_score = periodTrend.length > 0 ?
    periodTrend.reduce((sum, t) => sum + t.average_score, 0) / periodTrend.length : 0;

  const winRates = periodTrend.map(t => t.win_rate);
  const scores = periodTrend.map(t => t.average_score);

  const winRateTrend = winRates.length >= 2 ?
    (winRates[winRates.length - 1] > winRates[0] ? 'improving' as const :
     winRates[winRates.length - 1] < winRates[0] ? 'declining' as const : 'stable' as const) :
    'stable' as const;

  const scoreTrend = scores.length >= 2 ?
    (scores[scores.length - 1] > scores[0] ? 'improving' as const :
     scores[scores.length - 1] < scores[0] ? 'declining' as const : 'stable' as const) :
    'stable' as const;

  const consistencyTrend = stats.confidence_metrics.consistency > 60 ? 'improving' as const :
                           stats.confidence_metrics.consistency < 40 ? 'declining' as const :
                           'stable' as const;

  const insights: string[] = [];
  const recommendations: string[] = [];

  if (stats.skill_progression.improvement > 5) {
    insights.push(`Your win rate has improved by ${stats.skill_progression.improvement.toFixed(1)}%!`);
  }

  if (stats.confidence_metrics.readiness_score > 70) {
    insights.push('You\'re ready for real money games! Your readiness score is high.');
  } else {
    recommendations.push('Continue practicing to build confidence before real money games.');
  }

  if (stats.best_game_type !== null) {
    insights.push(`Your strongest game type is ${stats.best_game_type} with ${stats.games_by_type[stats.best_game_type].win_rate.toFixed(1)}% win rate.`);
  }

  if (stats.worst_game_type !== null && stats.games_by_type[stats.worst_game_type].games >= 5) {
    recommendations.push(`Focus on improving Game Type ${stats.worst_game_type} (${stats.games_by_type[stats.worst_game_type].win_rate.toFixed(1)}% win rate).`);
  }

  if (stats.current_streak >= 3) {
    insights.push(`You're on a ${stats.current_streak}-game winning streak!`);
  }

  return {
    user_id: userId,
    period,
    summary,
    trends: {
      win_rate_trend: winRateTrend,
      score_trend: scoreTrend,
      consistency_trend: consistencyTrend,
    },
    insights,
    recommendations,
    graph_data: {
      dates: periodTrend.map(t => t.date),
      win_rates: periodTrend.map(t => t.win_rate),
      average_scores: periodTrend.map(t => t.average_score),
      games_played: periodTrend.map(t => t.games),
    },
  };
}
