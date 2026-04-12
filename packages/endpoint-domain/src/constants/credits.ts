export const TransactionType = {
  Purchase: 'purchase',
  Consumption: 'consumption',
  Earned: 'earned',
  Refund: 'refund',
} as const;

export type TransactionType = typeof TransactionType[keyof typeof TransactionType];

export const Currency = {
  GP: 'GP',
  AC: 'AC',
  USD: 'USD',
} as const;

export type Currency = typeof Currency[keyof typeof Currency];

export const ConsumeGpCurrencyValues = ['GP', 'AC'] as const;

export type ConsumeGpCurrencyValue =
  (typeof ConsumeGpCurrencyValues)[number];

export const CreditOperation = {
  Purchase: 'purchase',
  Consume: 'consume',
  Earn: 'earn',
} as const;

export type CreditOperation = typeof CreditOperation[keyof typeof CreditOperation];

export const CreditAction = {
  Balance: 'balance',
  Purchase: 'purchase',
  Consume: 'consume',
  ConsumeGP: 'consume-gp',
  Earn: 'earn',
  Redeem: 'redeem',
  Transactions: 'transactions',
} as const;

export type CreditAction = typeof CreditAction[keyof typeof CreditAction];

export const CreditLedgerType = {
  Earn: 'earn',
  Consume: 'consume',
  Purchase: 'purchase',
} as const;

export type CreditLedgerType = typeof CreditLedgerType[keyof typeof CreditLedgerType];

export const CreditLedgerSource = {
  Match: 'match',
  Badge: 'badge',
  Purchase: 'purchase',
  Daily: 'daily',
  Promo: 'promo',
  Tournament: 'tournament',
  Marketplace: 'marketplace',
  Other: 'other',
} as const;

export type CreditLedgerSource = typeof CreditLedgerSource[keyof typeof CreditLedgerSource];

export const CreditDescriptionTemplate = {
  PurchasedAC: 'Purchased {amount} AC credits',
  ConsumedAC: 'Consumed {amount} AC credits',
  ConsumedGP: 'Consumed {amount} GP credits',
  Rollback: 'Rollback: {description}',
} as const;

export type CreditDescriptionTemplate = typeof CreditDescriptionTemplate[keyof typeof CreditDescriptionTemplate];

export const PLAN_TIER_IDS = ['free', 'pro', 'champion', 'founder'] as const;

export type PlanTierId = (typeof PLAN_TIER_IDS)[number];
