export type SelectedGameTabId =
  | 'about'
  | 'rules'
  | 'deck'
  | 'ranking'
  | 'scoring'
  | 'strategy'
  | 'systems';

export type SelectedGamePresentationChunkKind =
  | 'text'
  | 'list'
  | 'example'
  | 'metric'
  | 'visual';

export interface SelectedGamePresentationVisualRef {
  kind: 'image' | 'deck' | 'ranking' | 'asset';
  label: string;
  assetType?: string;
  guid?: string;
  imageHash?: string;
}

export interface SelectedGamePresentationChunk {
  id: string;
  title: string;
  eyebrow?: string;
  kind: SelectedGamePresentationChunkKind;
  body: string[];
  bullets: string[];
  visualRefs?: SelectedGamePresentationVisualRef[];
}

export interface SelectedGamePresentationTab {
  id: SelectedGameTabId;
  label: string;
  chunks: SelectedGamePresentationChunk[];
  tip?: string;
}

export interface SelectedGamePresentationMetric {
  label: string;
  value: string;
  icon?: string;
}

export interface SelectedGamePresentationHero {
  title: string;
  taglineLines: string[];
  badges: string[];
  media: SelectedGamePresentationVisualRef[];
}

export interface SelectedGamePresentationAction {
  id: 'view-lobbies';
  label: string;
}

export interface SelectedGamePresentation {
  hero: SelectedGamePresentationHero;
  sideA: {
    stats: SelectedGamePresentationMetric[];
    media: SelectedGamePresentationVisualRef[];
  };
  tabs: SelectedGamePresentationTab[];
  quickInfo: Record<SelectedGameTabId, SelectedGamePresentationChunk[]>;
  tip: Record<SelectedGameTabId, string>;
  actions: SelectedGamePresentationAction[];
}

export interface SelectedGameContentPlanTab {
  id: SelectedGameTabId;
  enabled: boolean;
  label: string;
  source: string;
  maxChunks: number;
}

export interface SelectedGameContentPlan {
  tabs: SelectedGameContentPlanTab[];
}

export interface SelectedGameDeckVisualControls {
  cardTrackMin?: number;
  cardWidth?: number;
  cardCellMinHeight?: number;
  matrixGap?: number;
  rowGap?: number;
  axisColumnWidth?: number;
  axisGlyphSize?: number;
  axisImageSize?: number;
  detailImageMaxWidth?: number;
  detailImageMaxHeight?: number;
}

export interface SelectedGameRankingVisualControls {
  showSuitIcons?: boolean;
  suitIconGap?: number;
  suitIconGlyphSize?: number;
  suitIconGlyphFont?: number;
  suitIconLabelFont?: number;
  suitIconRadius?: number;
  suitIconPadY?: number;
  suitIconPadX?: number;
  summaryGap?: number;
  summaryLabelFont?: number;
  summaryValueFont?: number;
  summaryPadY?: number;
  summaryPadX?: number;
  matrixRowHeight?: number;
  matrixRankColumnWidth?: number;
  matrixCellFont?: number;
  matrixHeaderFont?: number;
  matrixCellPadY?: number;
  matrixCellPadX?: number;
  matrixRadius?: number;
  matrixScrollbarSize?: number;
}

export interface SelectedGameVisualControls {
  deck?: SelectedGameDeckVisualControls;
  ranking?: SelectedGameRankingVisualControls;
}

export interface SelectedGameLayoutControls extends Record<string, unknown> {
  visuals?: SelectedGameVisualControls;
}

export const DEFAULT_SELECTED_GAME_DECK_VISUAL_CONTROLS: Required<SelectedGameDeckVisualControls> = {
  cardTrackMin: 44,
  cardWidth: 42,
  cardCellMinHeight: 60,
  matrixGap: 5,
  rowGap: 6,
  axisColumnWidth: 34,
  axisGlyphSize: 17,
  axisImageSize: 18,
  detailImageMaxWidth: 138,
  detailImageMaxHeight: 188,
};

export const DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS: Required<SelectedGameRankingVisualControls> = {
  showSuitIcons: true,
  suitIconGap: 6,
  suitIconGlyphSize: 24,
  suitIconGlyphFont: 16,
  suitIconLabelFont: 10,
  suitIconRadius: 5,
  suitIconPadY: 4,
  suitIconPadX: 7,
  summaryGap: 6,
  summaryLabelFont: 10,
  summaryValueFont: 13,
  summaryPadY: 4,
  summaryPadX: 7,
  matrixRowHeight: 34,
  matrixRankColumnWidth: 62,
  matrixCellFont: 15,
  matrixHeaderFont: 17,
  matrixCellPadY: 4,
  matrixCellPadX: 7,
  matrixRadius: 6,
  matrixScrollbarSize: 7,
};

export const DEFAULT_SELECTED_GAME_TAB_ORDER: SelectedGameTabId[] = [
  'about',
  'rules',
  'deck',
  'ranking',
  'scoring',
  'strategy',
  'systems',
];

export const DEFAULT_SELECTED_GAME_CONTENT_PLAN: SelectedGameContentPlan = {
  tabs: [
    { id: 'about', enabled: true, label: 'About', source: 'gameInfo', maxChunks: 6 },
    { id: 'rules', enabled: true, label: 'Rules', source: 'rules', maxChunks: 6 },
    { id: 'deck', enabled: true, label: 'Deck', source: 'deckModel,deck', maxChunks: 4 },
    { id: 'ranking', enabled: true, label: 'Ranking', source: 'ranking,scoring', maxChunks: 4 },
    { id: 'scoring', enabled: true, label: 'Scoring', source: 'scoring,validationFixtures', maxChunks: 5 },
    { id: 'strategy', enabled: true, label: 'Strategy', source: 'strategy', maxChunks: 5 },
    { id: 'systems', enabled: true, label: 'Systems', source: 'mechanics,actions,gameInfo', maxChunks: 5 },
  ],
};
