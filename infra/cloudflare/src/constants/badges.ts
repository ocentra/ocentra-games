export const BadgeType = {
  Performance: 'performance',
  MatchPerformance: 'match_performance',
  SeriesTournament: 'series_tournament',
  Leaderboard: 'leaderboard',
  Engagement: 'engagement',
  SpecialEvent: 'special_event',
  Milestone: 'milestone',
} as const;

export type BadgeType = typeof BadgeType[keyof typeof BadgeType];

export const BadgeRarity = {
  Common: 'common',
  Rare: 'rare',
  Epic: 'epic',
  Legendary: 'legendary',
} as const;

export type BadgeRarity = typeof BadgeRarity[keyof typeof BadgeRarity];

export const BadgeTier = {
  Bronze: 'bronze',
  Silver: 'silver',
  Gold: 'gold',
  Platinum: 'platinum',
} as const;

export type BadgeTier = typeof BadgeTier[keyof typeof BadgeTier];

export const BadgeRewardType = {
  GPGlobal: 'gp_global',
  GPPerGame: 'gp_per_game',
  AC: 'ac',
  Multiplier: 'multiplier',
  Privilege: 'privilege',
} as const;

export type BadgeRewardType = typeof BadgeRewardType[keyof typeof BadgeRewardType];

export const BadgeId = {
  ProBronze: 'pro_bronze',
  ProSilver: 'pro_silver',
  ProGold: 'pro_gold',
  ProPlatinum: 'pro_platinum',
  SuperplayerI: 'superplayer_i',
  SuperplayerII: 'superplayer_ii',
  SuperplayerIII: 'superplayer_iii',
  SuperplayerElite: 'superplayer_elite',
  KingOfGame: 'king_of_game',
  Top10: 'top_10',
  Top100: 'top_100',
  ManOfMatch: 'man_of_match',
  PerfectGame: 'perfect_game',
  ComebackKing: 'comeback_king',
  StreakMaster5: 'streak_master_5',
  StreakMaster10: 'streak_master_10',
  StreakMaster20: 'streak_master_20',
  ManOfSeries: 'man_of_series',
  TournamentHero: 'tournament_hero',
  ChampionshipWinner: 'championship_winner',
  MonthlyLeader: 'monthly_leader',
  WeeklyLeader: 'weekly_leader',
  YearlyLeader: 'yearly_leader',
  ConsistentPerformer3: 'consistent_performer_3',
  ConsistentPerformer6: 'consistent_performer_6',
  ConsistentPerformer12: 'consistent_performer_12',
  DailyWarrior7: 'daily_warrior_7',
  DailyWarrior30: 'daily_warrior_30',
  DailyWarrior100: 'daily_warrior_100',
  WeekendWarrior10: 'weekend_warrior_10',
  WeekendWarrior20: 'weekend_warrior_20',
  SocialButterfly10: 'social_butterfly_10',
  SocialButterfly25: 'social_butterfly_25',
  SocialButterfly5Referrals: 'social_butterfly_5_referrals',
  EventChampion: 'event_champion',
  MatchMilestone100: 'match_milestone_100',
  MatchMilestone500: 'match_milestone_500',
  MatchMilestone1000: 'match_milestone_1000',
  MatchMilestone5000: 'match_milestone_5000',
  GPMilestone1000: 'gp_milestone_1000',
  GPMilestone10000: 'gp_milestone_10000',
  GPMilestone100000: 'gp_milestone_100000',
  WinMilestone100: 'win_milestone_100',
  WinMilestone500: 'win_milestone_500',
  WinMilestone1000: 'win_milestone_1000',
} as const;

export type BadgeId = typeof BadgeId[keyof typeof BadgeId];

export const BadgeAction = {
  List: 'list',
  Definitions: 'definitions',
  Progress: 'progress',
  Active: 'active',
  Claim: 'claim',
  TrackLogin: 'track-login',
  ClaimDailyRewards: 'claim-daily-rewards',
} as const;

export type BadgeAction = typeof BadgeAction[keyof typeof BadgeAction];

export const MaxActiveBadges = 5;

export const BadgeApiBodyKey = {
  BadgeId: 'badge_id',
  BadgeIds: 'badge_ids',
} as const;

export type BadgeApiBodyKey = typeof BadgeApiBodyKey[keyof typeof BadgeApiBodyKey];

export const BadgeQueryParam = {
  BadgeType: 'badge_type',
  Rarity: 'rarity',
} as const;

export type BadgeQueryParam = typeof BadgeQueryParam[keyof typeof BadgeQueryParam];
