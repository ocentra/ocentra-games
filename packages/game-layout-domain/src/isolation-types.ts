export const IsolationComponentType = {
  PlayerUI: 'PlayerUI',
  HudButton: 'HudButton',
  TableZone: 'TableZone',
  DeckStack: 'DeckStack',
  HudArtwork: 'HudArtwork',
} as const;

export type IsolationComponentType = typeof IsolationComponentType[keyof typeof IsolationComponentType];
