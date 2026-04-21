import type { CardGameLayoutDocument } from '@ocentra/game-ui-types/cardGameLayoutTypes';

export const CARD_GAME_LAYOUT_DRAFT_CHANNEL = 'ocentra-card-game-layout-draft';

export interface CardGameLayoutDraftMessage {
  assetPath?: string;
  document?: CardGameLayoutDocument;
  playerCount?: number;
}
