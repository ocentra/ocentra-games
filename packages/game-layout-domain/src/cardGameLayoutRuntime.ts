import type {
  CardGameCardStripControls,
  CardGameCardStripSlotControls,
  CardGameDeckTrayControls,
  CardGameDeckTrayImageFit,
  CardGameDeckTrayAttachment,
  CardFanControls,
  CardGameLayoutDocument,
  CardGameLayerVisibility,
  CardGameRenderToggles,
  CardGameScoreboardControls,
  CardGameScoreboardRowControls,
  CardGameStageLayout,
  CardGameStageBlock,
  CardGameTableAttachments,
  CardGameTablePresentation,
  CardVisualControls,
  HudArtworkControls,
  HudButtonBankControls,
  HudButtonControls,
  LayoutPreset,
  PlainCardFrameSettings,
  PlayerUiDefaults,
  TableZone,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';
import type { SeatLayout, SerializablePlayerUIKey, TableShapeSettings } from '@ocentra/game-ui-types/tableLayoutTypes';

export interface CardGameLayoutMetadata {
  gameId: string;
  schemaVersion: number;
  displayName?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CardGameLayoutAsset {
  metadata: CardGameLayoutMetadata;
  layout: CardGameLayoutDocument;
  gameplay: Record<string, unknown>;
  extensions: Record<string, unknown>;
}

export interface TableLayoutState {
  playerCount: number;
  table: TableShapeSettings;
  seats: SeatLayout[];
  selectedSeatId: number | null;
  isEditorVisible: boolean;
  gameId: string | null;
  asset: CardGameLayoutAsset | null;
}

export interface SerializedSeatLayout {
  id: number;
  label?: string;
  position?: {
    x?: number;
    y?: number;
  };
  rotation?: number;
  scale?: number;
  playerOverrides?: Partial<Record<SerializablePlayerUIKey, number>>;
}

export interface SerializedLayoutPreset {
  table?: Partial<TableShapeSettings>;
  seats?: SerializedSeatLayout[];
}

export interface SerializedTableZone {
  id?: string;
  label?: string;
  type?: string;
  position?: { x?: number; y?: number };
  size?: { width?: number; height?: number };
  scale?: number;
  rotation?: number;
  engineBinding?: string;
  emptyText?: string;
}

export interface SerializedStageBlock {
  kind?: string;
  fitMode?: string;
  anchorX?: string;
  anchorY?: string;
  offsetX?: number;
  offsetY?: number;
  insetTop?: number;
  insetRight?: number;
  insetBottom?: number;
  insetLeft?: number;
  minScale?: number;
  maxScale?: number;
  contentWidth?: number;
  contentHeight?: number;
}

export interface SerializedCardGameStageLayout {
  authoredViewport?: { width?: number; height?: number };
  hud?: SerializedStageBlock;
  arena?: SerializedStageBlock;
  extraBlocks?: SerializedStageBlock[];
}

export interface LegacyHudCompatibilityFields {
  showDebugGuides?: boolean;
  layerVisibility?: CardGameLayerVisibility;
}

export type SerializedCardGameRenderToggles = Partial<CardGameRenderToggles>;

export interface SerializedCardGameTablePresentation {
  overallScale?: number;
}

export interface SerializedCardGameDeckTrayAttachment {
  position?: { x?: number; y?: number };
  size?: { width?: number; height?: number };
  scale?: number;
  rotation?: number;
}

export interface SerializedCardGameTableAttachments {
  deckTray?: SerializedCardGameDeckTrayAttachment;
}

export interface SerializedCardGameScoreboardRowControls {
  id?: string;
  icon?: string;
  label?: string;
  value?: string;
  valueBinding?: string;
  iconX?: number;
  iconY?: number;
  iconSize?: number;
  labelX?: number;
  labelTextSize?: number;
  valueTextSize?: number;
  textY?: number;
  coinDollarFontSize?: number;
  coinDollarTextLength?: number;
  coinDollarY?: number;
  coinDollarStrokeWidth?: number;
}

export interface SerializedCardGameScoreboardControls {
  width?: number;
  height?: number;
  overallScale?: number;
  outerRadius?: number;
  panelInset?: number;
  borderWidth?: number;
  glowBlur?: number;
  rowStrokeWidth?: number;
  tableMargin?: number;
  tableDividerPercent?: number;
  tableDividerOffset?: number;
  headerHeight?: number;
  headerBoxWidth?: number;
  headerBoxHeight?: number;
  headerGap?: number;
  headerPadX?: number;
  headerBandTopInset?: number;
  headerBandBottomInset?: number;
  headerOuterPadY?: number;
  headerTextYOffset?: number;
  headerBoxTextPadding?: number;
  headerValueAutoFit?: boolean;
  headerValueAutoSize?: boolean;
  headerValueSizeScale?: number;
  headerLabelTextSize?: number;
  headerValueTextSize?: number;
  headerBgRadius?: number;
  headerBgOpacity?: number;
  headerBgStrokeWidth?: number;
  headerBgFill?: string;
  headerBgStroke?: string;
  headerValueBoxFill?: string;
  headerValueBoxStroke?: string;
  headerValueBoxRadius?: number;
  round?: number;
  roundLabel?: string;
  roundBinding?: string;
  ofLabel?: string;
  totalRounds?: number;
  totalRoundsBinding?: string;
  rows?: SerializedCardGameScoreboardRowControls[];
  showIcons?: boolean;
  iconSize?: number;
  coinDollarFontSize?: number;
  coinDollarTextLength?: number;
  coinDollarY?: number;
  coinDollarStrokeWidth?: number;
  iconX?: number;
  iconOffsetY?: number;
  labelOffsetX?: number;
  cellPaddingX?: number;
  cellCornerRadius?: number;
  bgTop?: string;
  bgMid?: string;
  bgBottom?: string;
  panelTop?: string;
  panelBottom?: string;
  edgeLight?: string;
  edgeDark?: string;
  textYellow?: string;
  textRed?: string;
  textRedStroke?: string;
  darkStroke?: string;
  overallLetterSpacing?: number;
  overallTextYOffset?: number;
  headerTextSize?: number;
  valueTextSize?: number;
  labelTextSize?: number;
  rowTextYOffset?: number;
  bevelOpacity?: number;
}

export interface SerializedCardGameCardStripSlotControls {
  id?: string;
  label?: string;
  binding?: string;
  previewFaceUp?: boolean;
  previewText?: string;
}

export interface SerializedCardGameCardStripControls {
  cardWidth?: number;
  cardHeight?: number;
  gap?: number;
  overallScale?: number;
  slots?: SerializedCardGameCardStripSlotControls[];
}

export interface SerializedCardGameDeckTrayControls {
  svgWidth?: number;
  svgHeight?: number;
  trayX?: number;
  trayY?: number;
  trayWidth?: number;
  trayHeight?: number;
  trayRadius?: number;
  trayFillTop?: string;
  trayFillBottom?: string;
  trayStroke?: string;
  trayStrokeWidth?: number;
  trayInnerStroke?: string;
  trayInnerStrokeWidth?: number;
  trayGlowColor?: string;
  trayGlowBlur?: number;
  trayRimHighlight?: string;
  trayRimHighlightOpacity?: number;
  trayInnerHighlightOpacity?: number;
  trayVignetteOpacity?: number;
  trayShadowOpacity?: number;
  showTrayShine?: boolean;
  trayShineOpacity?: number;
  trayShineX?: number;
  trayShineWidth?: number;
  trayShineAngle?: number;
  autoCenterDeck?: boolean;
  autoScaleDeckToTray?: boolean;
  deckFitPaddingX?: number;
  deckFitPaddingY?: number;
  deckScale?: number;
  deckCenterOffsetX?: number;
  deckCenterOffsetY?: number;
  deckOffsetX?: number;
  deckOffsetY?: number;
  maxStackCount?: number;
  stackRemoveFromTop?: boolean;
  deckX?: number;
  deckY?: number;
  cardWidth?: number;
  cardHeight?: number;
  cardRadius?: number;
  stackCount?: number;
  stackOffsetX?: number;
  stackOffsetY?: number;
  stackStroke?: string;
  stackStrokeWidth?: number;
  stackFill?: string;
  stackShadowOpacity?: number;
  topCardInset?: number;
  topCardRadius?: number;
  topCardImageUrl?: string;
  imageFit?: string;
  imageScale?: number;
  imageX?: number;
  imageY?: number;
  imageOpacity?: number;
  placeholderTop?: string;
  placeholderBottom?: string;
  patternOpacity?: number;
  patternStroke?: string;
  showPattern?: boolean;
  showPlaceholderText?: boolean;
  placeholderText?: string;
  placeholderText2?: string;
  placeholderTextColor?: string;
  placeholderTextStroke?: string;
  placeholderTextSize?: number;
  showDeck?: boolean;
  showEmptyTrayGhost?: boolean;
  ghostOpacity?: number;
  glowMargin?: number;
}

export interface SerializedCardGameLayoutDocument {
  defaultPlayerCount?: number;
  presets?: Record<string, SerializedLayoutPreset>;
  playerUiDefaults?: Partial<PlayerUiDefaults>;
  hud?: Partial<HudArtworkControls> & LegacyHudCompatibilityFields;
  scoreboard?: SerializedCardGameScoreboardControls;
  cardStrip?: SerializedCardGameCardStripControls;
  deckTray?: SerializedCardGameDeckTrayControls;
  cardFan?: Partial<CardFanControls>;
  cardVisuals?: Partial<CardVisualControls>;
  cardFrame?: Partial<PlainCardFrameSettings>;
  renderToggles?: SerializedCardGameRenderToggles;
  tablePresentation?: SerializedCardGameTablePresentation;
  tableAttachments?: SerializedCardGameTableAttachments;
  views?: Record<string, SerializedLayoutPreset>;
  stageLayout?: SerializedCardGameStageLayout;
  zones?: SerializedTableZone[];
  gameplay?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export interface SerializedCardGameLayoutAsset {
  metadata?: Partial<CardGameLayoutMetadata> & { gameId?: string; schemaVersion?: number };
  layout?: SerializedCardGameLayoutDocument | null;
  gameplay?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export const DEFAULT_PLAYER_COUNT = 4;
export const MIN_PLAYER_COUNT = 2;
export const MAX_PLAYER_COUNT = 10;
export const DEFAULT_SEAT_SCALE = 0.5;

export const DEFAULT_TABLE_SHAPE: TableShapeSettings = {
  width: 960,
  height: 560,
  offsetX: 0,
  offsetY: -78,
  curvature: 0.88,
  feltInset: -8,
};

export const DEFAULT_PLAYER_UI_DEFAULTS: PlayerUiDefaults = {
  baseArcRotation: 0,
  infoBoxAngle: 180,
  infoBoxRotation: 0,
  labelTextOffset: 550,
  avatarImageScale: 1.2,
  avatarBaseColor: 'rgba(240, 240, 240, 1)',
  infoBoxColor: 'rgba(0, 60, 120, 0.9)',
  overallScale: 1,
  width: 400,
  height: 300,
};

export const DEFAULT_HUD_BUTTON_CONTROLS: HudButtonControls = {
  buttonOffsetX: 0,
  buttonOffsetY: 6,
  width: 649,
  height: 218,
  bodyHeight: 218,
  radius: 109,
  sideInset: 0,
  dotInset: 20,
  dotGap: 15,
  textColor: '#fff7ff',
  fontSize: 72,
  bodyCenter: '#2b064a',
  bodyMid: '#17002a',
  bodyEdge: '#0a0013',
  ringColor: '#ea6bff',
  outerGlowColor: '#9d00ff',
  midGlowColor: '#e25eff',
  dotGlowColor: '#ffca28',
  dotCoreColor: '#fff59d',
  sideFillTop: '#3d0f69',
  sideFillMid: '#21043c',
  sideFillBottom: '#10011f',
  sideStroke: '#eb7aff',
  sideGlow: '#b020ff',
  frontFillTop: '#0f2a66',
  frontFillMid: '#0a1b3f',
  frontFillBottom: '#050d1f',
  hoverInsetExpand: 10,
  hoverClampGlowColor: '#ffd34d',
  hoverClampGlowOpacity: 0.9,
  clickInsetExpand: 14,
  clickRingFlashColor: '#39ff88',
  clickRingFlashOpacity: 0.95,
};

export const DEFAULT_HUD_BUTTON_BANK_CONTROLS: HudButtonBankControls = {
  gap: 24,
  paddingX: 12,
  paddingY: 4,
  minScale: 0.35,
  maxScale: 1.1,
  leftOffsetX: 0,
  leftOffsetY: 6,
  rightOffsetX: 0,
  rightOffsetY: 6,
};

export const DEFAULT_HUD_ARTWORK_CONTROLS: HudArtworkControls = {
  hudOffsetX: 0,
  hudOffsetY: 0,
  overallScale: 1,
  width: 1920,
  height: 250,
  buttonScale: 1,
  buttonCount: 6,
  buttonLabels: ['A', 'B', 'C', 'D', 'E', 'F'],
  button: DEFAULT_HUD_BUTTON_CONTROLS,
  buttonBank: DEFAULT_HUD_BUTTON_BANK_CONTROLS,
  buttonVariants: Array.from({ length: 6 }, () => ({
    linked: true,
    overrides: {},
  })),
  leftWing: {
    x: 4,
    y: 174,
    width: 957,
    height: 76,
    topRadius: 20,
  },
  rightWing: {
    x: 959,
    y: 174,
    width: 957,
    height: 76,
    topRadius: 20,
  },
  clamp: {
    width: 11,
    height: 35,
    rightRadius: 18,
    goldTop: '#fff6bc',
    goldMid: '#d5a623',
    goldBottom: '#7c5407',
  },
  wingStyle: {
    edgeColor: '#22ff66',
    edgeWidth: 1,
    glowColor: '#00ff66',
    glowWidth: 8,
    glowOpacity: 0.34,
  },
  dome: {
    cx: 952,
    cy: 251,
    width: 500,
    height: 500,
    topRadius: 300,
    edgeColor: '#f0cb63',
    edgeInnerColor: '#7f5610',
    edgeWidth: 1,
    glowColor: '#f0cb63',
    glowWidth: 12,
    glowOpacity: 0.22,
  },
  panelTop: '#0b1a10',
  panelMid: '#050b07',
  panelBottom: '#0a1c12',
  panelGlassOpacity: 0.08,
  linkedWings: true,
};

export const DEFAULT_SCOREBOARD_CONTROLS: CardGameScoreboardControls = {
  width: 760,
  height: 330,
  overallScale: 0.53,
  outerRadius: 28,
  panelInset: 22,
  borderWidth: 6,
  glowBlur: 8,
  rowStrokeWidth: 5,
  tableMargin: 14,
  tableDividerPercent: 27,
  tableDividerOffset: 0,
  headerHeight: 82,
  headerBoxWidth: 95,
  headerBoxHeight: 59,
  headerGap: 16,
  headerPadX: 32,
  headerBandTopInset: -4,
  headerBandBottomInset: -4,
  headerOuterPadY: 0,
  headerTextYOffset: 2,
  headerBoxTextPadding: 2,
  headerValueAutoFit: false,
  headerValueAutoSize: true,
  headerValueSizeScale: 0.75,
  headerLabelTextSize: 34,
  headerValueTextSize: 32,
  headerBgRadius: 8,
  headerBgOpacity: 0.89,
  headerBgStrokeWidth: 2.5,
  headerBgFill: '#043c61',
  headerBgStroke: '#00d2ed',
  headerValueBoxFill: '#061526',
  headerValueBoxStroke: '#00d2ed',
  headerValueBoxRadius: 4,
  round: 1,
  roundLabel: 'ROUND',
  roundBinding: 'gameState.round',
  ofLabel: 'OF',
  totalRounds: 10,
  totalRoundsBinding: 'gameMode.maxRounds',
  rows: [
    {
      id: 'bet',
      icon: 'coin',
      label: 'BET',
      value: '10',
      valueBinding: 'gameMode.baseBet',
      iconX: 48,
      iconY: -2,
      iconSize: 83,
      labelX: 100,
      labelTextSize: 45,
      valueTextSize: 85,
      textY: 5,
      coinDollarFontSize: 38,
      coinDollarTextLength: 56,
      coinDollarY: 13,
      coinDollarStrokeWidth: 2.6,
    },
    {
      id: 'pot',
      icon: 'pot',
      label: 'POT',
      value: '0',
      valueBinding: 'gameState.mechanicsContext.roundPot',
      iconX: 47,
      iconY: -5,
      iconSize: 95,
      labelX: 100,
      labelTextSize: 45,
      valueTextSize: 86,
      textY: 5,
      coinDollarFontSize: 38,
      coinDollarTextLength: 56,
      coinDollarY: 13,
      coinDollarStrokeWidth: 2.6,
    },
  ],
  showIcons: true,
  iconSize: 62,
  coinDollarFontSize: 38,
  coinDollarTextLength: 56,
  coinDollarY: 13,
  coinDollarStrokeWidth: 2.6,
  iconX: 62,
  iconOffsetY: 0,
  labelOffsetX: 126,
  cellPaddingX: 22,
  cellCornerRadius: 15,
  bgTop: '#14e8ef',
  bgMid: '#0788bd',
  bgBottom: '#004b80',
  panelTop: '#086894',
  panelBottom: '#003d6b',
  edgeLight: '#40f6ff',
  edgeDark: '#005180',
  textYellow: '#ffd91c',
  textRed: '#ff3d2e',
  textRedStroke: '#ffd8c6',
  darkStroke: '#003d5b',
  overallLetterSpacing: 0,
  overallTextYOffset: 0,
  headerTextSize: 34,
  valueTextSize: 60,
  labelTextSize: 58,
  rowTextYOffset: 5,
  bevelOpacity: 0.42,
};

export const DEFAULT_CARD_STRIP_CONTROLS: CardGameCardStripControls = {
  cardWidth: 152,
  cardHeight: 228,
  gap: 16,
  overallScale: 1,
  slots: [],
};

export const DEFAULT_DECK_TRAY_CONTROLS: CardGameDeckTrayControls = {
  svgWidth: 260,
  svgHeight: 390,
  trayX: 26,
  trayY: 16,
  trayWidth: 188,
  trayHeight: 288,
  trayRadius: 10,
  trayFillTop: '#08314a',
  trayFillBottom: '#01080d',
  trayStroke: '#00a8d8',
  trayStrokeWidth: 2.5,
  trayInnerStroke: '#00131d',
  trayInnerStrokeWidth: 3,
  trayGlowColor: '#00f0ff',
  trayGlowBlur: 9,
  trayRimHighlight: '#7ff8ff',
  trayRimHighlightOpacity: 0.4,
  trayInnerHighlightOpacity: 0.14,
  trayVignetteOpacity: 0.22,
  trayShadowOpacity: 0.61,
  showTrayShine: true,
  trayShineOpacity: 0.61,
  trayShineX: -11,
  trayShineWidth: 200,
  trayShineAngle: -23,
  autoCenterDeck: true,
  autoScaleDeckToTray: true,
  deckFitPaddingX: 18,
  deckFitPaddingY: 34,
  deckScale: 1.22,
  deckCenterOffsetX: 16,
  deckCenterOffsetY: -4,
  deckOffsetX: -15,
  deckOffsetY: 1,
  maxStackCount: 10,
  stackRemoveFromTop: true,
  deckX: 22,
  deckY: 106,
  cardWidth: 142,
  cardHeight: 220,
  cardRadius: 12,
  stackCount: 7,
  stackOffsetX: -3,
  stackOffsetY: 0.5,
  stackStroke: '#d7ddd4',
  stackStrokeWidth: 2.5,
  stackFill: '#edf0e8',
  stackShadowOpacity: 0.42,
  topCardInset: 5,
  topCardRadius: 7,
  topCardImageUrl: '',
  imageFit: 'cover',
  imageScale: 1,
  imageX: 0,
  imageY: 0,
  imageOpacity: 1,
  placeholderTop: '#d8e7dc',
  placeholderBottom: '#779b96',
  patternOpacity: 0.35,
  patternStroke: '#315e5b',
  showPattern: true,
  showPlaceholderText: false,
  placeholderText: 'CARD',
  placeholderText2: 'BACK',
  placeholderTextColor: '#f5ecd4',
  placeholderTextStroke: '#9b875c',
  placeholderTextSize: 28,
  showDeck: true,
  showEmptyTrayGhost: false,
  ghostOpacity: 0.14,
  glowMargin: 8,
};

export const DEFAULT_RENDER_TOGGLES: CardGameRenderToggles = {
  background: true,
  header: true,
  footer: true,
  table: true,
  seats: true,
  playerUi: true,
  zones: true,
  hud: true,
  cardFan: true,
  scoreboard: true,
  cardStrip: true,
  deckTray: true,
};

export const DEFAULT_TABLE_PRESENTATION: CardGameTablePresentation = {
  overallScale: 1,
};

export const DEFAULT_DECK_TRAY_ATTACHMENT: CardGameDeckTrayAttachment = {
  position: {
    x: 0.85,
    y: 0.5,
  },
  size: {
    width: 0.18,
    height: 0.24,
  },
  scale: 1,
  rotation: 0,
};

export const DEFAULT_TABLE_ATTACHMENTS: CardGameTableAttachments = {
  deckTray: DEFAULT_DECK_TRAY_ATTACHMENT,
};

export const DEFAULT_CARD_FAN_CONTROLS: CardFanControls = {
  cardCount: 13,
  minCardCount: 3,
  maxCardCount: 13,
  radiusScale: 0.1,
  radiusOffset: 0,
  cardWidthScale: 0.39,
  cardHeightScale: 0.554,
  arcMin: 34,
  arcMax: 149,
  fanTilt: 0,
  centerOffsetX: 0,
  centerOffsetY: -14,
  overallScale: 1.07,
  disableViewportScale: true,
};

export const DEFAULT_CARD_VISUAL_CONTROLS: CardVisualControls = {
  floatScale: 3,
};

export const PLAIN_CARD_FRAME_DEFAULTS: PlainCardFrameSettings = {
  width: 260,
  height: 390,
  cornerRadius: 18,
  goldBorderWidth: 7,
  greenBorderWidth: 11,
  glowBlur: 10,
  glowMargin: 22,
  outerGreen: "#0a6d30",
  goldLight: "#ffe449",
  goldMid: "#fff59b",
  goldDark: "#c99a00",
  fillTop: "#d8e7dc",
  fillBottom: "#7ea8a2",
  showInnerShadow: true,
  showBottomTitle: true,
  bottomTitle: "CARD TITLE",
  bottomTitleHeight: 42,
  bottomTitleSize: 18,
  bottomTitleInsetX: 12,
  bottomTitleBottomInset: 0,
  bottomTitleCornerRadius: 8,
  bottomTitleStrokeWidth: 2,
  bottomTitleYOffset: 0,
  bottomTitleFillLight: "#ffe449",
  bottomTitleFillDark: "#c99a00",
  bottomTitleText: "#fff9d2",
  bottomTitleTextPadding: 10,
  bottomTitleTextYOffset: 0,
};

export const DEFAULT_STAGE_LAYOUT: CardGameStageLayout = {
  authoredViewport: {
    width: 1920,
    height: 1080,
  },
  hud: {
    kind: 'hud',
    fitMode: 'width',
    anchorX: 'center',
    anchorY: 'end',
    offsetX: 0,
    offsetY: 0,
    insetTop: 0,
    insetRight: 0,
    insetBottom: 0,
    insetLeft: 0,
    minScale: 0.35,
    maxScale: 1,
  },
  arena: {
    kind: 'arena',
    contentWidth: 1000,
    contentHeight: 1000,
    fitMode: 'contain',
    anchorX: 'center',
    anchorY: 'center',
    offsetX: 0,
    offsetY: 0,
    insetTop: 24,
    insetRight: 32,
    insetBottom: 24,
    insetLeft: 32,
    minScale: 0.3,
    maxScale: 1,
  },
  extraBlocks: [
    {
      kind: 'cardStrip',
      fitMode: 'contain',
      anchorX: 'start',
      anchorY: 'start',
      offsetX: 0,
      offsetY: 0,
      insetTop: 24,
      insetRight: 0,
      insetBottom: 0,
      insetLeft: 32,
      minScale: 0.25,
      maxScale: 1,
    },
    {
      kind: 'scoreboard',
      fitMode: 'contain',
      anchorX: 'end',
      anchorY: 'start',
      offsetX: 0,
      offsetY: 0,
      insetTop: 24,
      insetRight: 36,
      insetBottom: 0,
      insetLeft: 0,
      minScale: 0.28,
      maxScale: 1,
    },
  ],
};

const clampCoordinate = (value: number) => Math.max(-0.5, Math.min(1.5, value));

const clone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const cloneSeat = (seat: SeatLayout): SeatLayout => ({
  ...seat,
  position: { ...seat.position },
  playerOverrides: seat.playerOverrides ? { ...seat.playerOverrides } : undefined,
});

const clonePreset = (preset: LayoutPreset): LayoutPreset => ({
  table: { ...preset.table },
  seats: preset.seats.map((seat) => cloneSeat(seat)),
});

const cloneZone = (zone: TableZone): TableZone => ({
  ...zone,
  position: { ...zone.position },
  size: zone.size ? { ...zone.size } : undefined,
});

const cloneStageBlock = <T extends CardGameStageBlock>(block: T): T => ({
  ...block,
} as T);

const cloneStageLayout = (stageLayout: CardGameStageLayout): CardGameStageLayout => ({
  authoredViewport: { ...stageLayout.authoredViewport },
  hud: cloneStageBlock(stageLayout.hud),
  arena: cloneStageBlock(stageLayout.arena),
  extraBlocks: stageLayout.extraBlocks?.map((block) => cloneStageBlock(block)) ?? [],
});

const cloneRenderToggles = (renderToggles: CardGameRenderToggles): CardGameRenderToggles => ({
  ...renderToggles,
});

const cloneTablePresentation = (tablePresentation: CardGameTablePresentation): CardGameTablePresentation => ({
  ...tablePresentation,
});

const cloneDeckTrayAttachment = (
  deckTrayAttachment: CardGameDeckTrayAttachment,
): CardGameDeckTrayAttachment => ({
  position: { ...deckTrayAttachment.position },
  size: { ...deckTrayAttachment.size },
  scale: deckTrayAttachment.scale,
  rotation: deckTrayAttachment.rotation,
});

const cloneTableAttachments = (tableAttachments: CardGameTableAttachments): CardGameTableAttachments => ({
  deckTray: cloneDeckTrayAttachment(tableAttachments.deckTray),
});

export const seedLayoutPresetFromSource = (
  sourcePreset: LayoutPreset | null | undefined,
  targetCount: number,
): LayoutPreset => {
  const targetPreset = createLayoutPreset(targetCount);
  if (!sourcePreset) {
    return targetPreset;
  }

  const sourceSeatsById = new Map(sourcePreset.seats.map((seat) => [seat.id, seat]));
  return {
    table: { ...targetPreset.table, ...sourcePreset.table },
    seats: targetPreset.seats.map((seat) => {
      const sourceSeat = sourceSeatsById.get(seat.id);
      if (!sourceSeat) {
        return cloneSeat(seat);
      }

      return {
        ...seat,
        label: sourceSeat.label ?? seat.label,
        position: { ...sourceSeat.position },
        rotation: sourceSeat.rotation,
        scale: sourceSeat.scale,
        playerOverrides: sourceSeat.playerOverrides ? { ...sourceSeat.playerOverrides } : undefined,
      };
    }),
  };
};

const cloneHud = (hud: HudArtworkControls): HudArtworkControls => ({
  hudOffsetX: hud.hudOffsetX,
  hudOffsetY: hud.hudOffsetY,
  overallScale: hud.overallScale,
  width: hud.width,
  height: hud.height,
  buttonScale: hud.buttonScale,
  buttonCount: hud.buttonCount,
  buttonLabels: [...hud.buttonLabels],
  button: { ...hud.button },
  buttonBank: { ...hud.buttonBank },
  buttonVariants: hud.buttonVariants.map((variant) => ({
    linked: variant.linked,
    overrides: { ...variant.overrides },
  })),
  leftWing: { ...hud.leftWing },
  rightWing: { ...hud.rightWing },
  clamp: { ...hud.clamp },
  wingStyle: { ...hud.wingStyle },
  dome: { ...hud.dome },
  panelTop: hud.panelTop,
  panelMid: hud.panelMid,
  panelBottom: hud.panelBottom,
  panelGlassOpacity: hud.panelGlassOpacity,
  linkedWings: hud.linkedWings,
});

const cloneScoreboardRow = (
  row: CardGameScoreboardRowControls,
): CardGameScoreboardRowControls => ({
  ...row,
});

const cloneScoreboard = (
  scoreboard: CardGameScoreboardControls,
): CardGameScoreboardControls => ({
  ...scoreboard,
  rows: scoreboard.rows.map((row) => cloneScoreboardRow(row)),
});

const cloneCardStripSlot = (
  slot: CardGameCardStripSlotControls,
): CardGameCardStripSlotControls => ({
  ...slot,
});

const cloneCardStrip = (
  cardStrip: CardGameCardStripControls,
): CardGameCardStripControls => ({
  ...cardStrip,
  slots: cardStrip.slots.map((slot) => cloneCardStripSlot(slot)),
});

const cloneDeckTray = (
  deckTray: CardGameDeckTrayControls,
): CardGameDeckTrayControls => ({
  ...deckTray,
});

const cloneCardFan = (cardFan: CardFanControls): CardFanControls => ({
  ...cardFan,
});

const cloneCardVisuals = (cardVisuals: CardVisualControls): CardVisualControls => ({
  ...cardVisuals,
});

const toPascalCase = (value: string): string =>
  value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

export const generateSeatRing = (count: number): SeatLayout[] => {
  const seats: SeatLayout[] = [];
  const radiusX = 0.38;
  const radiusY = 0.34;
  const angleStep = (2 * Math.PI) / count;
  const baseAngle = Math.PI / 2;

  for (let index = 0; index < count; index += 1) {
    const angle = baseAngle + angleStep * index;
    const x = 0.5 + Math.cos(angle) * radiusX;
    const y = 0.5 + Math.sin(angle) * radiusY;
    seats.push({
      id: index,
      label: `p${index + 1}`,
      position: {
        x: Number(clampCoordinate(x).toFixed(4)),
        y: Number(clampCoordinate(y).toFixed(4)),
      },
      rotation: 0,
      scale: DEFAULT_SEAT_SCALE,
    });
  }

  return seats;
};

export const createLayoutPreset = (count: number): LayoutPreset => ({
  table: { ...DEFAULT_TABLE_SHAPE },
  seats: generateSeatRing(count),
});

export const createDefaultCardGameLayoutDocument = (): CardGameLayoutDocument => {
  const counts = Array.from({ length: 9 }, (_, index) => index + 2);
  const presets = Object.fromEntries(counts.map((count) => [String(count), createLayoutPreset(count)]));

  return {
    defaultPlayerCount: DEFAULT_PLAYER_COUNT,
    presets,
    playerUiDefaults: { ...DEFAULT_PLAYER_UI_DEFAULTS },
    hud: cloneHud(DEFAULT_HUD_ARTWORK_CONTROLS),
    scoreboard: cloneScoreboard(DEFAULT_SCOREBOARD_CONTROLS),
    cardStrip: cloneCardStrip(DEFAULT_CARD_STRIP_CONTROLS),
    deckTray: cloneDeckTray(DEFAULT_DECK_TRAY_CONTROLS),
    cardFan: cloneCardFan(DEFAULT_CARD_FAN_CONTROLS),
    cardVisuals: cloneCardVisuals(DEFAULT_CARD_VISUAL_CONTROLS),
    cardFrame: { ...PLAIN_CARD_FRAME_DEFAULTS },
    renderToggles: cloneRenderToggles(DEFAULT_RENDER_TOGGLES),
    tablePresentation: cloneTablePresentation(DEFAULT_TABLE_PRESENTATION),
    tableAttachments: cloneTableAttachments(DEFAULT_TABLE_ATTACHMENTS),
    views: {},
    stageLayout: cloneStageLayout(DEFAULT_STAGE_LAYOUT),
    zones: [
      {
        id: 'deck',
        label: 'Deck',
        type: 'deck',
        position: { x: 0.85, y: 0.5 },
        size: { width: 0.16, height: 0.14 },
        scale: 1,
        rotation: 0,
        engineBinding: 'deck',
        emptyText: '0',
      },
      {
        id: 'discard',
        label: 'Discard',
        type: 'list',
        position: { x: 0.35, y: 0.5 },
        size: { width: 0.2, height: 0.16 },
        scale: 1,
        rotation: 0,
        engineBinding: 'discardPile',
        emptyText: 'Empty',
      },
      {
        id: 'floor',
        label: 'Floor Card',
        type: 'card',
        position: { x: 0.5, y: 0.5 },
        size: { width: 0.18, height: 0.14 },
        scale: 1,
        rotation: 0,
        engineBinding: 'floorCard',
        emptyText: 'Waiting',
      },
      {
        id: 'pot',
        label: 'Pot',
        type: 'pot',
        position: { x: 0.5, y: 0.7 },
        size: { width: 0.16, height: 0.14 },
        scale: 1,
        rotation: 0,
        engineBinding: 'mechanicsContext.roundPot',
        emptyText: '0',
      },
      {
        id: 'trick',
        label: 'Table Cards',
        type: 'list',
        position: { x: 0.5, y: 0.26 },
        size: { width: 0.34, height: 0.18 },
        scale: 1,
        rotation: 0,
        engineBinding: 'mechanicsContext.tableCards',
        emptyText: 'None',
      },
    ],
    gameplay: {},
    extensions: {},
  };
};

const normalizeSeat = (input: SerializedSeatLayout | undefined, fallback?: SeatLayout): SeatLayout => {
  const fallbackSeat = fallback ? cloneSeat(fallback) : undefined;
  const id = Number.isFinite(input?.id) ? Number(input?.id) : fallbackSeat?.id ?? 0;
  const position = {
    x: clampCoordinate(
      Number.isFinite(input?.position?.x) ? Number(input?.position?.x) : fallbackSeat?.position?.x ?? 0.5,
    ),
    y: clampCoordinate(
      Number.isFinite(input?.position?.y) ? Number(input?.position?.y) : fallbackSeat?.position?.y ?? 0.5,
    ),
  };

  const seat: SeatLayout = {
    id,
    label: input?.label ?? fallbackSeat?.label ?? `p${id + 1}`,
    position: {
      x: Number(position.x.toFixed(4)),
      y: Number(position.y.toFixed(4)),
    },
    rotation: Number.isFinite(input?.rotation)
      ? Number(input?.rotation)
      : fallbackSeat?.rotation ?? 0,
    ...(Number.isFinite(input?.scale)
      ? { scale: Number(input?.scale) }
      : fallbackSeat?.scale !== undefined
        ? { scale: fallbackSeat.scale }
        : { scale: DEFAULT_SEAT_SCALE }),
  };

  const overrides: Partial<Record<SerializablePlayerUIKey, number>> = {};
  if (input?.playerOverrides && typeof input.playerOverrides === 'object' && !Array.isArray(input.playerOverrides)) {
    (Object.keys(input.playerOverrides) as SerializablePlayerUIKey[]).forEach((key) => {
      const value = input.playerOverrides?.[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        overrides[key] = value;
      }
    });
  }

  if (Object.keys(overrides).length > 0) {
    seat.playerOverrides = overrides;
  }

  return seat;
};

const normalizeZone = (input: SerializedTableZone | undefined): TableZone => {
  const defaultSizeByType: Record<string, { width: number; height: number }> = {
    deck: { width: 0.16, height: 0.14 },
    pot: { width: 0.16, height: 0.14 },
    card: { width: 0.18, height: 0.14 },
    list: { width: 0.2, height: 0.16 },
  };
  const zoneType = (input?.type as 'deck' | 'pot' | 'card' | 'list') ?? 'card';
  const defaultSize = defaultSizeByType[zoneType] ?? defaultSizeByType.card;
  return {
    id: input?.id ?? `zone-${Math.random().toString(36).slice(2, 9)}`,
    label: input?.label ?? 'Zone',
    type: zoneType,
    position: {
      x: Number.isFinite(input?.position?.x) ? Number(input?.position?.x) : 0.5,
      y: Number.isFinite(input?.position?.y) ? Number(input?.position?.y) : 0.5,
    },
    size: {
      width: Number.isFinite(input?.size?.width) ? Number(input?.size?.width) : defaultSize.width,
      height: Number.isFinite(input?.size?.height) ? Number(input?.size?.height) : defaultSize.height,
    },
    scale: Number.isFinite(input?.scale) ? Number(input?.scale) : 1,
    rotation: Number.isFinite(input?.rotation) ? Number(input?.rotation) : 0,
    engineBinding: input?.engineBinding,
    emptyText: typeof input?.emptyText === 'string' ? input.emptyText : undefined,
  };
};

const normalizeStageBlockBase = (
  source: SerializedStageBlock | undefined,
  fallback: CardGameStageBlock,
): CardGameStageBlock => {
  const sourceContentWidth = Number.isFinite(source?.contentWidth) ? Number(source?.contentWidth) : undefined;
  const sourceContentHeight = Number.isFinite(source?.contentHeight) ? Number(source?.contentHeight) : undefined;
  const normalizedBase: CardGameStageBlock = {
    ...fallback,
    kind: typeof source?.kind === 'string' ? source.kind : fallback.kind,
    fitMode:
      source?.fitMode === 'width' || source?.fitMode === 'contain'
        ? source.fitMode
        : fallback.fitMode,
    anchorX:
      source?.anchorX === 'start' || source?.anchorX === 'center' || source?.anchorX === 'end'
        ? source.anchorX
        : fallback.anchorX,
    anchorY:
      source?.anchorY === 'start' || source?.anchorY === 'center' || source?.anchorY === 'end'
        ? source.anchorY
        : fallback.anchorY,
    offsetX: Number.isFinite(source?.offsetX) ? Number(source?.offsetX) : fallback.offsetX,
    offsetY: Number.isFinite(source?.offsetY) ? Number(source?.offsetY) : fallback.offsetY,
    insetTop: Number.isFinite(source?.insetTop) ? Number(source?.insetTop) : fallback.insetTop,
    insetRight: Number.isFinite(source?.insetRight) ? Number(source?.insetRight) : fallback.insetRight,
    insetBottom: Number.isFinite(source?.insetBottom) ? Number(source?.insetBottom) : fallback.insetBottom,
    insetLeft: Number.isFinite(source?.insetLeft) ? Number(source?.insetLeft) : fallback.insetLeft,
    minScale: Number.isFinite(source?.minScale) ? Number(source?.minScale) : fallback.minScale,
    maxScale: Number.isFinite(source?.maxScale) ? Number(source?.maxScale) : fallback.maxScale,
  };

  normalizedBase.minScale = Math.max(0.05, normalizedBase.minScale);
  normalizedBase.maxScale = Math.max(normalizedBase.minScale, normalizedBase.maxScale);

  if ('contentWidth' in fallback || Number.isFinite(source?.contentWidth) || Number.isFinite(source?.contentHeight)) {
    return {
      ...normalizedBase,
      contentWidth:
        sourceContentWidth !== undefined && sourceContentWidth > 0
          ? sourceContentWidth
          : 'contentWidth' in fallback
            ? fallback.contentWidth
            : 1000,
      contentHeight:
        sourceContentHeight !== undefined && sourceContentHeight > 0
          ? sourceContentHeight
          : 'contentHeight' in fallback
            ? fallback.contentHeight
            : 1000,
    };
  }

  return normalizedBase;
};

const normalizeStageLayout = (
  source: SerializedCardGameStageLayout | CardGameStageLayout | undefined,
  fallback: CardGameStageLayout,
): CardGameStageLayout => {
  const authoredViewport = source?.authoredViewport;
  const authoredViewportWidth = Number.isFinite(authoredViewport?.width) ? Number(authoredViewport?.width) : undefined;
  const authoredViewportHeight = Number.isFinite(authoredViewport?.height) ? Number(authoredViewport?.height) : undefined;
  const fallbackExtraBlocks = fallback.extraBlocks ?? [];
  const sourceExtraBlocks = Array.isArray(source?.extraBlocks) ? source.extraBlocks : [];
  const extraBlockMap = new Map<string, CardGameStageBlock>();

  fallbackExtraBlocks.forEach((block) => {
    extraBlockMap.set(block.kind, cloneStageBlock(block));
  });

  sourceExtraBlocks.forEach((block) => {
    const fallbackBlock = fallbackExtraBlocks.find((entry) => entry.kind === block?.kind);
    const defaultBlock: CardGameStageBlock = fallbackBlock ?? {
      kind: typeof block?.kind === 'string' ? block.kind : 'custom',
      fitMode: 'contain',
      anchorX: 'center',
      anchorY: 'center',
      offsetX: 0,
      offsetY: 0,
      insetTop: 0,
      insetRight: 0,
      insetBottom: 0,
      insetLeft: 0,
      minScale: 0.3,
      maxScale: 1,
      contentWidth: 'contentWidth' in block && Number.isFinite(block.contentWidth) ? Number(block.contentWidth) : 1000,
      contentHeight: 'contentHeight' in block && Number.isFinite(block.contentHeight) ? Number(block.contentHeight) : 1000,
    };
    extraBlockMap.set(defaultBlock.kind, normalizeStageBlockBase(block, defaultBlock));
  });

  const extraBlocks = Array.from(extraBlockMap.values());

  return {
    authoredViewport: {
      width: authoredViewportWidth !== undefined && authoredViewportWidth > 0
        ? authoredViewportWidth
        : fallback.authoredViewport.width,
      height: authoredViewportHeight !== undefined && authoredViewportHeight > 0
        ? authoredViewportHeight
        : fallback.authoredViewport.height,
    },
    hud: normalizeStageBlockBase(source?.hud, fallback.hud) as CardGameStageLayout['hud'],
    arena: normalizeStageBlockBase(source?.arena, fallback.arena) as CardGameStageLayout['arena'],
    extraBlocks,
  };
};

export const normalizeLayoutPreset = (
  preset: SerializedLayoutPreset | LayoutPreset | undefined,
  fallback: LayoutPreset,
): LayoutPreset => {
  if (!preset) {
    return clonePreset(fallback);
  }

  const fallbackSeatsById = new Map<number, SeatLayout>();
  fallback.seats.forEach((seat) => {
    fallbackSeatsById.set(seat.id, seat);
  });

  const seats: SeatLayout[] = [];
  const serializedSeats = 'seats' in preset && Array.isArray(preset.seats) ? preset.seats : [];

  serializedSeats.forEach((seatInput) => {
    const fallbackSeat = fallbackSeatsById.get(seatInput.id);
    const normalizedSeat = normalizeSeat(seatInput, fallbackSeat);
    seats.push(normalizedSeat);
    fallbackSeatsById.delete(normalizedSeat.id);
  });

  if (seats.length === 0) {
    seats.push(...fallback.seats.map((seat) => cloneSeat(seat)));
  } else {
    fallbackSeatsById.forEach((seat) => {
      seats.push(cloneSeat(seat));
    });
  }

  seats.sort((a, b) => a.id - b.id);

  const table = 'table' in preset && preset.table
    ? {
        ...fallback.table,
        ...preset.table,
      }
    : { ...fallback.table };

  return {
    table,
    seats,
  };
};

const normalizePlayerUiDefaults = (
  source: Partial<PlayerUiDefaults> | undefined,
  fallback: Partial<PlayerUiDefaults>,
): Partial<PlayerUiDefaults> => ({
  ...fallback,
  ...(source ?? {}),
});

const normalizeRenderToggles = (
  source: SerializedCardGameRenderToggles | undefined,
  fallback: CardGameRenderToggles,
  legacyLayerVisibility?: CardGameLayerVisibility,
): CardGameRenderToggles => {
  const legacyFallback: CardGameRenderToggles = {
    background: legacyLayerVisibility?.background ?? fallback.background,
    header: legacyLayerVisibility?.header ?? fallback.header,
    footer: legacyLayerVisibility?.footer ?? fallback.footer,
    table: legacyLayerVisibility?.table ?? fallback.table,
    seats: legacyLayerVisibility?.seats ?? fallback.seats,
    playerUi: legacyLayerVisibility?.seats ?? fallback.playerUi,
    zones: legacyLayerVisibility?.zones ?? fallback.zones,
    hud: legacyLayerVisibility?.hud ?? fallback.hud,
    cardFan: legacyLayerVisibility?.cards ?? fallback.cardFan,
    scoreboard: legacyLayerVisibility?.scoreboard ?? fallback.scoreboard,
    cardStrip: legacyLayerVisibility?.cardStrip ?? fallback.cardStrip,
    deckTray: legacyLayerVisibility?.zones ?? fallback.deckTray,
  };

  return {
    background: typeof source?.background === 'boolean' ? source.background : legacyFallback.background,
    header: typeof source?.header === 'boolean' ? source.header : legacyFallback.header,
    footer: typeof source?.footer === 'boolean' ? source.footer : legacyFallback.footer,
    table: typeof source?.table === 'boolean' ? source.table : legacyFallback.table,
    seats: typeof source?.seats === 'boolean' ? source.seats : legacyFallback.seats,
    playerUi: typeof source?.playerUi === 'boolean' ? source.playerUi : legacyFallback.playerUi,
    zones: typeof source?.zones === 'boolean' ? source.zones : legacyFallback.zones,
    hud: typeof source?.hud === 'boolean' ? source.hud : legacyFallback.hud,
    cardFan: typeof source?.cardFan === 'boolean' ? source.cardFan : legacyFallback.cardFan,
    scoreboard: typeof source?.scoreboard === 'boolean' ? source.scoreboard : legacyFallback.scoreboard,
    cardStrip: typeof source?.cardStrip === 'boolean' ? source.cardStrip : legacyFallback.cardStrip,
    deckTray: typeof source?.deckTray === 'boolean' ? source.deckTray : legacyFallback.deckTray,
  };
};

const normalizeTablePresentation = (
  source: SerializedCardGameTablePresentation | undefined,
  fallback: CardGameTablePresentation,
): CardGameTablePresentation => ({
  overallScale: Number.isFinite(source?.overallScale)
    ? Number(source?.overallScale)
    : fallback.overallScale,
});

const normalizeDeckTrayAttachment = (
  source: SerializedCardGameDeckTrayAttachment | undefined,
  fallback: CardGameDeckTrayAttachment,
  legacyDeckZone?: SerializedTableZone | null,
): CardGameDeckTrayAttachment => {
  const legacyPosition = legacyDeckZone?.position;
  const legacySize = legacyDeckZone?.size;
  return {
    position: {
      x: Number.isFinite(source?.position?.x)
        ? Number(source?.position?.x)
        : Number.isFinite(legacyPosition?.x)
          ? Number(legacyPosition?.x)
          : fallback.position.x,
      y: Number.isFinite(source?.position?.y)
        ? Number(source?.position?.y)
        : Number.isFinite(legacyPosition?.y)
          ? Number(legacyPosition?.y)
          : fallback.position.y,
    },
    size: {
      width: Number.isFinite(source?.size?.width)
        ? Number(source?.size?.width)
        : Number.isFinite(legacySize?.width)
          ? Number(legacySize?.width)
          : fallback.size.width,
      height: Number.isFinite(source?.size?.height)
        ? Number(source?.size?.height)
        : Number.isFinite(legacySize?.height)
          ? Number(legacySize?.height)
          : fallback.size.height,
    },
    scale: Number.isFinite(source?.scale)
      ? Number(source?.scale)
      : Number.isFinite(legacyDeckZone?.scale)
        ? Number(legacyDeckZone?.scale)
        : fallback.scale,
    rotation: Number.isFinite(source?.rotation)
      ? Number(source?.rotation)
      : Number.isFinite(legacyDeckZone?.rotation)
        ? Number(legacyDeckZone?.rotation)
        : fallback.rotation,
  };
};

const normalizeTableAttachments = (
  source: SerializedCardGameTableAttachments | undefined,
  fallback: CardGameTableAttachments,
  legacyDeckZone?: SerializedTableZone | null,
): CardGameTableAttachments => ({
  deckTray: normalizeDeckTrayAttachment(source?.deckTray, fallback.deckTray, legacyDeckZone),
});

const normalizeHudButtonBank = (
  source: Partial<HudButtonBankControls> | undefined,
  fallback: HudButtonBankControls,
  legacyButton: Partial<HudButtonControls> | undefined,
): HudButtonBankControls => {
  const legacyOffsetX = Number.isFinite(legacyButton?.buttonOffsetX) ? Number(legacyButton?.buttonOffsetX) : null;
  const legacyOffsetY = Number.isFinite(legacyButton?.buttonOffsetY) ? Number(legacyButton?.buttonOffsetY) : null;
  return {
    gap: Number.isFinite(source?.gap) ? Number(source?.gap) : fallback.gap,
    paddingX: Number.isFinite(source?.paddingX) ? Number(source?.paddingX) : fallback.paddingX,
    paddingY: Number.isFinite(source?.paddingY) ? Number(source?.paddingY) : fallback.paddingY,
    minScale: Number.isFinite(source?.minScale) ? Number(source?.minScale) : fallback.minScale,
    maxScale: Number.isFinite(source?.maxScale) ? Number(source?.maxScale) : fallback.maxScale,
    leftOffsetX: Number.isFinite(source?.leftOffsetX)
      ? Number(source?.leftOffsetX)
      : legacyOffsetX ?? fallback.leftOffsetX,
    leftOffsetY: Number.isFinite(source?.leftOffsetY)
      ? Number(source?.leftOffsetY)
      : legacyOffsetY ?? fallback.leftOffsetY,
    rightOffsetX: Number.isFinite(source?.rightOffsetX)
      ? Number(source?.rightOffsetX)
      : legacyOffsetX ?? fallback.rightOffsetX,
    rightOffsetY: Number.isFinite(source?.rightOffsetY)
      ? Number(source?.rightOffsetY)
      : legacyOffsetY ?? fallback.rightOffsetY,
  };
};

const normalizeHud = (
  source: (Partial<HudArtworkControls> & LegacyHudCompatibilityFields) | undefined,
  fallback: HudArtworkControls,
): HudArtworkControls => {
  if (!source) {
    return cloneHud(fallback);
  }

  const sourceButtonVariants = Array.isArray(source.buttonVariants) ? source.buttonVariants : [];
  const buttonVariantCount = Math.max(sourceButtonVariants.length, fallback.buttonVariants.length);

  return {
    hudOffsetX: Number.isFinite(source.hudOffsetX) ? Number(source.hudOffsetX) : fallback.hudOffsetX,
    hudOffsetY: Number.isFinite(source.hudOffsetY) ? Number(source.hudOffsetY) : fallback.hudOffsetY,
    overallScale: Number.isFinite(source.overallScale) ? Number(source.overallScale) : fallback.overallScale,
    width: Number.isFinite(source.width) ? Number(source.width) : fallback.width,
    height: Number.isFinite(source.height) ? Number(source.height) : fallback.height,
    buttonScale: Number.isFinite(source.buttonScale) ? Number(source.buttonScale) : fallback.buttonScale,
    buttonCount: Number.isFinite(source.buttonCount)
      ? Math.max(1, Math.min(6, Math.round(Number(source.buttonCount))))
      : fallback.buttonCount,
    buttonLabels: source.buttonLabels ? [...source.buttonLabels] : [...fallback.buttonLabels],
    button: {
      ...fallback.button,
      ...(source.button ?? {}),
      buttonOffsetX: 0,
      buttonOffsetY: 0,
    },
    buttonBank: normalizeHudButtonBank(
      source.buttonBank,
      fallback.buttonBank,
      source.button,
    ),
    buttonVariants: Array.from({ length: buttonVariantCount }, (_, index) => {
      const variant = sourceButtonVariants[index];
      const fallbackVariant = fallback.buttonVariants[index] ?? fallback.buttonVariants[fallback.buttonVariants.length - 1];
      return {
        linked: variant?.linked ?? fallbackVariant?.linked ?? true,
        overrides: {
          ...(fallbackVariant?.overrides ?? {}),
          ...(variant?.overrides ?? {}),
          buttonOffsetX: 0,
          buttonOffsetY: 0,
        },
      };
    }),
    leftWing: {
      ...fallback.leftWing,
      ...(source.leftWing ?? {}),
    },
    rightWing: {
      ...fallback.rightWing,
      ...(source.rightWing ?? {}),
    },
    clamp: {
      ...fallback.clamp,
      ...(source.clamp ?? {}),
    },
    wingStyle: {
      ...fallback.wingStyle,
      ...(source.wingStyle ?? {}),
    },
    dome: {
      ...fallback.dome,
      ...(source.dome ?? {}),
    },
    panelTop: typeof source.panelTop === 'string' ? source.panelTop : fallback.panelTop,
    panelMid: typeof source.panelMid === 'string' ? source.panelMid : fallback.panelMid,
    panelBottom: typeof source.panelBottom === 'string' ? source.panelBottom : fallback.panelBottom,
    panelGlassOpacity: Number.isFinite(source.panelGlassOpacity)
      ? Number(source.panelGlassOpacity)
      : fallback.panelGlassOpacity,
    linkedWings: typeof source.linkedWings === 'boolean' ? source.linkedWings : fallback.linkedWings,
  };
};

const normalizeScoreboardRow = (
  source: SerializedCardGameScoreboardRowControls | undefined,
  fallback: CardGameScoreboardRowControls,
): CardGameScoreboardRowControls => ({
  ...fallback,
  ...source,
  id: typeof source?.id === 'string' && source.id.length > 0 ? source.id : fallback.id,
  icon:
    source?.icon === 'coin' || source?.icon === 'pot' || source?.icon === 'none'
      ? source.icon
      : fallback.icon,
  label: typeof source?.label === 'string' ? source.label : fallback.label,
  value: typeof source?.value === 'string' ? source.value : fallback.value,
  valueBinding: typeof source?.valueBinding === 'string' ? source.valueBinding : fallback.valueBinding,
});

const normalizeScoreboard = (
  source: SerializedCardGameScoreboardControls | undefined,
  fallback: CardGameScoreboardControls,
): CardGameScoreboardControls => {
  const mergedRows = Array.isArray(source?.rows) && source.rows.length > 0
    ? source.rows.map((row, index) =>
        normalizeScoreboardRow(row, fallback.rows[index] ?? fallback.rows[fallback.rows.length - 1] ?? DEFAULT_SCOREBOARD_CONTROLS.rows[0]),
      )
    : fallback.rows.map((row) => cloneScoreboardRow(row));

  return {
    ...fallback,
    ...source,
    overallScale: Number.isFinite(source?.overallScale) ? Number(source?.overallScale) : fallback.overallScale,
    round: Number.isFinite(source?.round) ? Number(source?.round) : fallback.round,
    roundLabel: typeof source?.roundLabel === 'string' ? source.roundLabel : fallback.roundLabel,
    roundBinding: typeof source?.roundBinding === 'string' ? source.roundBinding : fallback.roundBinding,
    ofLabel: typeof source?.ofLabel === 'string' ? source.ofLabel : fallback.ofLabel,
    totalRounds: Number.isFinite(source?.totalRounds) ? Number(source?.totalRounds) : fallback.totalRounds,
    totalRoundsBinding:
      typeof source?.totalRoundsBinding === 'string' ? source.totalRoundsBinding : fallback.totalRoundsBinding,
    rows: mergedRows,
  };
};

const normalizeCardStripSlot = (
  source: SerializedCardGameCardStripSlotControls | undefined,
  fallback: CardGameCardStripSlotControls,
  index: number,
): CardGameCardStripSlotControls => ({
  ...fallback,
  ...source,
  id: typeof source?.id === 'string' && source.id.length > 0 ? source.id : fallback.id || `slot_${index + 1}`,
  label: typeof source?.label === 'string' && source.label.length > 0 ? source.label : fallback.label || `Slot ${index + 1}`,
  binding: typeof source?.binding === 'string' && source.binding.length > 0 ? source.binding : fallback.binding,
  previewFaceUp: typeof source?.previewFaceUp === 'boolean' ? source.previewFaceUp : fallback.previewFaceUp,
  previewText: typeof source?.previewText === 'string' ? source.previewText : fallback.previewText,
});

const normalizeCardStrip = (
  source: SerializedCardGameCardStripControls | undefined,
  fallback: CardGameCardStripControls,
): CardGameCardStripControls => {
  const fallbackSlots = fallback.slots ?? [];
  const slots = Array.isArray(source?.slots) && source.slots.length > 0
    ? source.slots.map((slot, index) =>
        normalizeCardStripSlot(slot, fallbackSlots[index] ?? {
          id: `slot_${index + 1}`,
          label: `Slot ${index + 1}`,
          previewFaceUp: false,
        }, index),
      )
    : fallbackSlots.map((slot, index) => normalizeCardStripSlot(slot, slot, index));

  return {
    ...fallback,
    ...source,
    cardWidth: Number.isFinite(source?.cardWidth) ? Number(source?.cardWidth) : fallback.cardWidth,
    cardHeight: Number.isFinite(source?.cardHeight) ? Number(source?.cardHeight) : fallback.cardHeight,
    gap: Number.isFinite(source?.gap) ? Number(source?.gap) : fallback.gap,
    overallScale: Number.isFinite(source?.overallScale) ? Number(source?.overallScale) : fallback.overallScale,
    slots,
  };
};

const normalizeDeckTrayImageFit = (
  value: unknown,
  fallback: CardGameDeckTrayImageFit,
): CardGameDeckTrayImageFit => {
  if (value === 'cover' || value === 'contain') {
    return value;
  }
  return fallback;
};

const normalizeDeckTray = (
  source: SerializedCardGameDeckTrayControls | undefined,
  fallback: CardGameDeckTrayControls,
): CardGameDeckTrayControls => ({
  ...fallback,
  ...(source ?? {}),
  svgWidth: Number.isFinite(source?.svgWidth) ? Number(source?.svgWidth) : fallback.svgWidth,
  svgHeight: Number.isFinite(source?.svgHeight) ? Number(source?.svgHeight) : fallback.svgHeight,
  trayX: Number.isFinite(source?.trayX) ? Number(source?.trayX) : fallback.trayX,
  trayY: Number.isFinite(source?.trayY) ? Number(source?.trayY) : fallback.trayY,
  trayWidth: Number.isFinite(source?.trayWidth) ? Number(source?.trayWidth) : fallback.trayWidth,
  trayHeight: Number.isFinite(source?.trayHeight) ? Number(source?.trayHeight) : fallback.trayHeight,
  trayRadius: Number.isFinite(source?.trayRadius) ? Number(source?.trayRadius) : fallback.trayRadius,
  trayStrokeWidth: Number.isFinite(source?.trayStrokeWidth) ? Number(source?.trayStrokeWidth) : fallback.trayStrokeWidth,
  trayInnerStrokeWidth: Number.isFinite(source?.trayInnerStrokeWidth) ? Number(source?.trayInnerStrokeWidth) : fallback.trayInnerStrokeWidth,
  trayGlowBlur: Number.isFinite(source?.trayGlowBlur) ? Number(source?.trayGlowBlur) : fallback.trayGlowBlur,
  trayRimHighlightOpacity: Number.isFinite(source?.trayRimHighlightOpacity) ? Number(source?.trayRimHighlightOpacity) : fallback.trayRimHighlightOpacity,
  trayInnerHighlightOpacity: Number.isFinite(source?.trayInnerHighlightOpacity) ? Number(source?.trayInnerHighlightOpacity) : fallback.trayInnerHighlightOpacity,
  trayVignetteOpacity: Number.isFinite(source?.trayVignetteOpacity) ? Number(source?.trayVignetteOpacity) : fallback.trayVignetteOpacity,
  trayShadowOpacity: Number.isFinite(source?.trayShadowOpacity) ? Number(source?.trayShadowOpacity) : fallback.trayShadowOpacity,
  showTrayShine: typeof source?.showTrayShine === 'boolean' ? source.showTrayShine : fallback.showTrayShine,
  trayShineOpacity: Number.isFinite(source?.trayShineOpacity) ? Number(source?.trayShineOpacity) : fallback.trayShineOpacity,
  trayShineX: Number.isFinite(source?.trayShineX) ? Number(source?.trayShineX) : fallback.trayShineX,
  trayShineWidth: Number.isFinite(source?.trayShineWidth) ? Number(source?.trayShineWidth) : fallback.trayShineWidth,
  trayShineAngle: Number.isFinite(source?.trayShineAngle) ? Number(source?.trayShineAngle) : fallback.trayShineAngle,
  autoCenterDeck: typeof source?.autoCenterDeck === 'boolean' ? source.autoCenterDeck : fallback.autoCenterDeck,
  autoScaleDeckToTray: typeof source?.autoScaleDeckToTray === 'boolean' ? source.autoScaleDeckToTray : fallback.autoScaleDeckToTray,
  deckFitPaddingX: Number.isFinite(source?.deckFitPaddingX) ? Number(source?.deckFitPaddingX) : fallback.deckFitPaddingX,
  deckFitPaddingY: Number.isFinite(source?.deckFitPaddingY) ? Number(source?.deckFitPaddingY) : fallback.deckFitPaddingY,
  deckScale: Number.isFinite(source?.deckScale) ? Number(source?.deckScale) : fallback.deckScale,
  deckCenterOffsetX: Number.isFinite(source?.deckCenterOffsetX) ? Number(source?.deckCenterOffsetX) : fallback.deckCenterOffsetX,
  deckCenterOffsetY: Number.isFinite(source?.deckCenterOffsetY) ? Number(source?.deckCenterOffsetY) : fallback.deckCenterOffsetY,
  deckOffsetX: Number.isFinite(source?.deckOffsetX) ? Number(source?.deckOffsetX) : fallback.deckOffsetX,
  deckOffsetY: Number.isFinite(source?.deckOffsetY) ? Number(source?.deckOffsetY) : fallback.deckOffsetY,
  maxStackCount: Number.isFinite(source?.maxStackCount) ? Number(source?.maxStackCount) : fallback.maxStackCount,
  stackRemoveFromTop: typeof source?.stackRemoveFromTop === 'boolean' ? source.stackRemoveFromTop : fallback.stackRemoveFromTop,
  deckX: Number.isFinite(source?.deckX) ? Number(source?.deckX) : fallback.deckX,
  deckY: Number.isFinite(source?.deckY) ? Number(source?.deckY) : fallback.deckY,
  cardWidth: Number.isFinite(source?.cardWidth) ? Number(source?.cardWidth) : fallback.cardWidth,
  cardHeight: Number.isFinite(source?.cardHeight) ? Number(source?.cardHeight) : fallback.cardHeight,
  cardRadius: Number.isFinite(source?.cardRadius) ? Number(source?.cardRadius) : fallback.cardRadius,
  stackCount: Number.isFinite(source?.stackCount) ? Number(source?.stackCount) : fallback.stackCount,
  stackOffsetX: Number.isFinite(source?.stackOffsetX) ? Number(source?.stackOffsetX) : fallback.stackOffsetX,
  stackOffsetY: Number.isFinite(source?.stackOffsetY) ? Number(source?.stackOffsetY) : fallback.stackOffsetY,
  stackStrokeWidth: Number.isFinite(source?.stackStrokeWidth) ? Number(source?.stackStrokeWidth) : fallback.stackStrokeWidth,
  stackShadowOpacity: Number.isFinite(source?.stackShadowOpacity) ? Number(source?.stackShadowOpacity) : fallback.stackShadowOpacity,
  topCardInset: Number.isFinite(source?.topCardInset) ? Number(source?.topCardInset) : fallback.topCardInset,
  topCardRadius: Number.isFinite(source?.topCardRadius) ? Number(source?.topCardRadius) : fallback.topCardRadius,
  topCardImageUrl: typeof source?.topCardImageUrl === 'string' ? source.topCardImageUrl : fallback.topCardImageUrl,
  imageFit: normalizeDeckTrayImageFit(source?.imageFit, fallback.imageFit),
  imageScale: Number.isFinite(source?.imageScale) ? Number(source?.imageScale) : fallback.imageScale,
  imageX: Number.isFinite(source?.imageX) ? Number(source?.imageX) : fallback.imageX,
  imageY: Number.isFinite(source?.imageY) ? Number(source?.imageY) : fallback.imageY,
  imageOpacity: Number.isFinite(source?.imageOpacity) ? Number(source?.imageOpacity) : fallback.imageOpacity,
  patternOpacity: Number.isFinite(source?.patternOpacity) ? Number(source?.patternOpacity) : fallback.patternOpacity,
  showPattern: typeof source?.showPattern === 'boolean' ? source.showPattern : fallback.showPattern,
  showPlaceholderText: typeof source?.showPlaceholderText === 'boolean' ? source.showPlaceholderText : fallback.showPlaceholderText,
  placeholderText: typeof source?.placeholderText === 'string' ? source.placeholderText : fallback.placeholderText,
  placeholderText2: typeof source?.placeholderText2 === 'string' ? source.placeholderText2 : fallback.placeholderText2,
  placeholderTextSize: Number.isFinite(source?.placeholderTextSize) ? Number(source?.placeholderTextSize) : fallback.placeholderTextSize,
  showDeck: typeof source?.showDeck === 'boolean' ? source.showDeck : fallback.showDeck,
  showEmptyTrayGhost: typeof source?.showEmptyTrayGhost === 'boolean' ? source.showEmptyTrayGhost : fallback.showEmptyTrayGhost,
  ghostOpacity: Number.isFinite(source?.ghostOpacity) ? Number(source?.ghostOpacity) : fallback.ghostOpacity,
  glowMargin: Number.isFinite(source?.glowMargin) ? Number(source?.glowMargin) : fallback.glowMargin,
});

const normalizeCardFan = (
  source: Partial<CardFanControls> | undefined,
  fallback: CardFanControls,
): CardFanControls => ({
  ...fallback,
  ...(source ?? {}),
  cardHeightScale: Number.isFinite(source?.cardHeightScale)
    ? Number(source?.cardHeightScale)
    : fallback.cardHeightScale,
});

const normalizeCardVisuals = (
  source: Partial<CardVisualControls> | undefined,
  fallback: CardVisualControls,
): CardVisualControls => ({
  ...fallback,
  ...(source ?? {}),
});

const normalizeCardFrame = (
  source: Partial<PlainCardFrameSettings> | undefined,
  fallback: PlainCardFrameSettings,
): PlainCardFrameSettings => ({
  ...fallback,
  ...(source ?? {}),
});

const normalizeRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const isSerializedLayoutContainer = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return (
    'defaultPlayerCount' in value ||
    'presets' in value ||
    'hud' in value ||
    'scoreboard' in value ||
    'cardStrip' in value ||
    'deckTray' in value ||
    'cardFan' in value ||
    'cardVisuals' in value ||
    'cardFrame' in value ||
    'renderToggles' in value ||
    'tablePresentation' in value ||
    'tableAttachments' in value ||
    'stageLayout' in value ||
    'zones' in value ||
    'gameplay' in value ||
    'extensions' in value
  );
};

const getLayoutContainer = (source: Record<string, unknown>): Record<string, unknown> => {
  const layout = source.layout;
  if (isSerializedLayoutContainer(layout)) {
    return layout as Record<string, unknown>;
  }
  return source;
};

const isPresetRecord = (value: unknown): value is Record<string, SerializedLayoutPreset> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const normalizeCardGameLayoutDocument = (
  source: SerializedCardGameLayoutDocument | Record<string, unknown> | null | undefined,
): CardGameLayoutDocument => {
  const root = normalizeRecord(source);
  const container = getLayoutContainer(root);
  const fallback = createDefaultCardGameLayoutDocument();
  const sourcePresets = isPresetRecord(container.presets) ? container.presets : {};
  const fallbackPresetKeys = Object.keys(fallback.presets);
  const presetKeys = new Set<string>([...fallbackPresetKeys, ...Object.keys(sourcePresets)]);

  const presets = Object.fromEntries(
    Array.from(presetKeys).map((countKey) => {
      const numericCount = Number.parseInt(countKey, 10);
      const fallbackPreset =
        fallback.presets[countKey] ?? createLayoutPreset(Number.isNaN(numericCount) ? fallback.defaultPlayerCount : numericCount);
      const sourcePreset = sourcePresets[countKey];
      return [countKey, normalizeLayoutPreset(sourcePreset, fallbackPreset)];
    }),
  );

  const views = isPresetRecord(container.views)
    ? Object.fromEntries(
        Object.entries(container.views).map(([viewId, presetInput]) => {
          const fallbackView =
            fallback.views[viewId] ??
            createLayoutPreset(fallback.defaultPlayerCount);
          return [viewId, normalizeLayoutPreset(presetInput, fallbackView)];
        }),
      )
    : clone(fallback.views);

  const gameplay = normalizeRecord(container.gameplay);
  const extensions = normalizeRecord(container.extensions);
  const legacyDeckZone = Array.isArray(container.zones)
    ? (container.zones.find((zone) => zone?.id === 'deck' || zone?.type === 'deck') as SerializedTableZone | undefined) ?? null
    : null;

  return {
    defaultPlayerCount: Number.isFinite(container.defaultPlayerCount)
      ? Math.max(MIN_PLAYER_COUNT, Math.min(MAX_PLAYER_COUNT, Math.round(Number(container.defaultPlayerCount))))
      : fallback.defaultPlayerCount,
    presets,
    playerUiDefaults: normalizePlayerUiDefaults(
      container.playerUiDefaults as Partial<PlayerUiDefaults> | undefined,
      fallback.playerUiDefaults,
    ),
    hud: normalizeHud(container.hud as Partial<HudArtworkControls> | undefined, fallback.hud),
    scoreboard: normalizeScoreboard(
      container.scoreboard as SerializedCardGameScoreboardControls | undefined,
      fallback.scoreboard,
    ),
    cardStrip: normalizeCardStrip(
      container.cardStrip as SerializedCardGameCardStripControls | undefined,
      fallback.cardStrip,
    ),
    deckTray: normalizeDeckTray(
      container.deckTray as SerializedCardGameDeckTrayControls | undefined,
      fallback.deckTray,
    ),
    cardFan: normalizeCardFan(container.cardFan as Partial<CardFanControls> | undefined, fallback.cardFan),
    cardVisuals: normalizeCardVisuals(
      container.cardVisuals as Partial<CardVisualControls> | undefined,
      fallback.cardVisuals,
    ),
    cardFrame: normalizeCardFrame(
      container.cardFrame as Partial<PlainCardFrameSettings> | undefined,
      fallback.cardFrame ?? PLAIN_CARD_FRAME_DEFAULTS,
    ),
    renderToggles: normalizeRenderToggles(
      container.renderToggles as SerializedCardGameRenderToggles | undefined,
      fallback.renderToggles,
      (container.hud as LegacyHudCompatibilityFields | undefined)?.layerVisibility,
    ),
    tablePresentation: normalizeTablePresentation(
      container.tablePresentation as SerializedCardGameTablePresentation | undefined,
      fallback.tablePresentation,
    ),
    tableAttachments: normalizeTableAttachments(
      container.tableAttachments as SerializedCardGameTableAttachments | undefined,
      fallback.tableAttachments,
      legacyDeckZone,
    ),
    views,
    stageLayout: normalizeStageLayout(
      container.stageLayout as SerializedCardGameStageLayout | CardGameStageLayout | undefined,
      fallback.stageLayout ?? DEFAULT_STAGE_LAYOUT,
    ),
    zones: Array.isArray(container.zones)
      ? container.zones.map((z: SerializedTableZone) => normalizeZone(z))
      : clone(fallback.zones),
    gameplay,
    extensions,
  };
};

export const resolveLayoutPreset = (
  document: CardGameLayoutDocument,
  playerCount: number,
): LayoutPreset => {
  const exact = document.presets[String(playerCount)];
  if (exact) {
    return clonePreset(exact);
  }

  const fallback = document.presets[String(document.defaultPlayerCount)];
  if (fallback) {
    return clonePreset(fallback);
  }

  return createLayoutPreset(playerCount);
};

export const adjustSeatsForTableChange = (
  prevTable: TableShapeSettings | undefined,
  nextTable: TableShapeSettings,
  seats: SeatLayout[],
): SeatLayout[] => {
  if (!prevTable) {
    return seats.map((seat) => cloneSeat(seat));
  }

  const prevWidth = prevTable.width ?? nextTable.width;
  const prevHeight = prevTable.height ?? nextTable.height;
  const nextWidth = nextTable.width ?? prevWidth;
  const nextHeight = nextTable.height ?? prevHeight;

  if (!prevWidth || !prevHeight || !nextWidth || !nextHeight) {
    return seats.map((seat) => cloneSeat(seat));
  }

  const ratioX = nextWidth / prevWidth;
  const ratioY = nextHeight / prevHeight;
  const offsetDeltaX = ((nextTable.offsetX ?? 0) - (prevTable.offsetX ?? 0)) / nextWidth;
  const offsetDeltaY = ((nextTable.offsetY ?? 0) - (prevTable.offsetY ?? 0)) / nextHeight;

  return seats.map((seat) => {
    const currentX = seat.position?.x ?? 0.5;
    const currentY = seat.position?.y ?? 0.5;
    const centeredX = currentX - 0.5;
    const centeredY = currentY - 0.5;

    const scaledX = 0.5 + centeredX * ratioX + offsetDeltaX;
    const scaledY = 0.5 + centeredY * ratioY + offsetDeltaY;

    return {
      ...cloneSeat(seat),
      position: {
        x: clampCoordinate(scaledX),
        y: clampCoordinate(scaledY),
      },
    };
  });
};

export const cloneCardGameLayoutDocument = (document: CardGameLayoutDocument): CardGameLayoutDocument => ({
  defaultPlayerCount: document.defaultPlayerCount,
  presets: Object.fromEntries(
    Object.entries(document.presets).map(([key, preset]) => [key, clonePreset(preset)]),
  ),
  playerUiDefaults: { ...document.playerUiDefaults },
  hud: cloneHud(document.hud),
  scoreboard: cloneScoreboard(document.scoreboard),
  cardStrip: cloneCardStrip(document.cardStrip),
  deckTray: cloneDeckTray(document.deckTray),
  cardFan: cloneCardFan(document.cardFan),
  cardVisuals: cloneCardVisuals(document.cardVisuals),
  cardFrame: document.cardFrame ? { ...document.cardFrame } : undefined,
  renderToggles: cloneRenderToggles(document.renderToggles),
  tablePresentation: cloneTablePresentation(document.tablePresentation),
  tableAttachments: cloneTableAttachments(document.tableAttachments),
  views: Object.fromEntries(
    Object.entries(document.views).map(([key, preset]) => [key, clonePreset(preset)]),
  ),
  stageLayout: document.stageLayout ? cloneStageLayout(document.stageLayout) : cloneStageLayout(DEFAULT_STAGE_LAYOUT),
  zones: document.zones?.map((zone) => cloneZone(zone)),
  gameplay: clone(document.gameplay),
  extensions: clone(document.extensions),
});

export const hydrateCardGameLayoutAsset = (
  source: SerializedCardGameLayoutAsset | CardGameLayoutAsset | Record<string, unknown> | null | undefined,
  gameId: string,
): CardGameLayoutAsset => {
  const root = normalizeRecord(source);
  const metadataSource = normalizeRecord(root.metadata);
  const layoutSource = normalizeRecord(root.layout);

  return {
    metadata: {
      gameId: typeof metadataSource.gameId === 'string' ? metadataSource.gameId : gameId,
      schemaVersion: Number.isFinite(metadataSource.schemaVersion)
        ? Number(metadataSource.schemaVersion)
        : 2,
      displayName: typeof metadataSource.displayName === 'string' ? metadataSource.displayName : toPascalCase(gameId) || gameId,
      description: typeof metadataSource.description === 'string' ? metadataSource.description : undefined,
      createdAt: typeof metadataSource.createdAt === 'string' ? metadataSource.createdAt : new Date().toISOString(),
      updatedAt: typeof metadataSource.updatedAt === 'string' ? metadataSource.updatedAt : new Date().toISOString(),
    },
    layout: normalizeCardGameLayoutDocument(layoutSource),
    gameplay: normalizeRecord(root.gameplay),
    extensions: normalizeRecord(root.extensions),
  };
};

export const createDefaultCardGameLayoutAsset = (gameId: string): CardGameLayoutAsset => ({
  metadata: {
    gameId,
    schemaVersion: 2,
    displayName: toPascalCase(gameId) || gameId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  layout: createDefaultCardGameLayoutDocument(),
  gameplay: {},
  extensions: {},
});
