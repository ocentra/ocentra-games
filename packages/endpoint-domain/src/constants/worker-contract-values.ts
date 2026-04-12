export const PresenceStatusValues = [
  'online',
  'away',
  'in-game',
  'in-lobby',
  'offline',
] as const;

export const ProfileVisibilityValues = ['public', 'friends', 'private'] as const;

export const SettingsThemeValues = ['light', 'dark', 'auto'] as const;

export const RoomTypeValues = ['lobby', 'game', 'tournament', 'private'] as const;

export const SecurityPenaltyTypeValues = ['warning', 'mute', 'suspension', 'ban'] as const;

export const FeedReportTypeValues = ['pci', 'gdpr', 'soc2'] as const;

export const ComplianceReportTypeValues = ['pci', 'gdpr', 'soc2'] as const;

export const FiatCurrencyValues = ['USD', 'EUR'] as const;

export const MatchIdRequiredFields = ['matchId'] as const;

export const FraudCheckField = {
  Amount: 'amount',
  PaymentMethod: 'paymentMethod',
  Currency: 'currency',
} as const;

export const TournamentResultField = {
  MatchId: 'matchId',
  WinnerId: 'winnerId',
} as const;

export const FraudCheckRequiredFields = [
  FraudCheckField.Amount,
  FraudCheckField.PaymentMethod,
  FraudCheckField.Currency,
] as const;

export const TournamentResultRequiredFields = [
  TournamentResultField.MatchId,
  TournamentResultField.WinnerId,
] as const;
