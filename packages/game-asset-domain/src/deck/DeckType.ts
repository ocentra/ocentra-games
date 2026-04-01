export const DeckType = {
  Normal: 'NormalDeck',
  Standard52: 'Standard52',
  Standard52PlusJokers: 'Standard52PlusJokers',
  Extended54: 'Extended54',
  Custom: 'Custom',
} as const;

export type DeckType = typeof DeckType[keyof typeof DeckType];
