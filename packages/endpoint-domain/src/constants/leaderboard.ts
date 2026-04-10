export const LeaderboardTier = {
  Bronze: 'Bronze',
  Silver: 'Silver',
  Gold: 'Gold',
  Platinum: 'Platinum',
  Diamond: 'Diamond',
  Master: 'Master',
} as const;

export type LeaderboardTier = typeof LeaderboardTier[keyof typeof LeaderboardTier];

export const DefaultLeaderboardTier = LeaderboardTier.Gold;
