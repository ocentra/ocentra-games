import type { SeatLayout, TableShapeSettings } from './tableLayoutTypes';

export type CardGameSurfaceMode =
  | 'play'
  | 'templateSaved'
  | 'templateDraft'
  | 'editorEmbedded'
  | 'editorCanvas'
  | 'editorIsolation';

export type CardGameViewerPerspectiveMode = 'canonical' | 'rotateToLocal';

export interface CardGameViewerPerspective {
  mode: CardGameViewerPerspectiveMode;
  localSeatId?: number | null;
  viewingSeatId?: number | null;
}

export interface CardGameViewportSize {
  width: number;
  height: number;
}

export interface CardGameShellMetrics {
  headerHeight: number;
  toolbarHeight: number;
  footerHeight: number;
  workTop: number;
  workBottom: number;
}

export type CardGameStageFitMode = 'width' | 'contain';
export type CardGameStageAnchorX = 'start' | 'center' | 'end';
export type CardGameStageAnchorY = 'start' | 'center' | 'end';

export interface CardGameStageBlockBase {
  fitMode: CardGameStageFitMode;
  anchorX: CardGameStageAnchorX;
  anchorY: CardGameStageAnchorY;
  offsetX: number;
  offsetY: number;
  insetTop: number;
  insetRight: number;
  insetBottom: number;
  insetLeft: number;
  minScale: number;
  maxScale: number;
}

export interface CardGameHudStageBlock extends CardGameStageBlockBase {
  kind: 'hud';
}

export interface CardGameArenaStageBlock extends CardGameStageBlockBase {
  kind: 'arena';
  contentWidth: number;
  contentHeight: number;
}

export interface CardGameScoreboardStageBlock extends CardGameStageBlockBase {
  kind: 'scoreboard';
}

export interface CardGameCardStripStageBlock extends CardGameStageBlockBase {
  kind: 'cardStrip';
}

export interface CardGameCustomStageBlock extends CardGameStageBlockBase {
  kind: string;
  contentWidth?: number;
  contentHeight?: number;
}

export type CardGameStageBlock =
  | CardGameHudStageBlock
  | CardGameArenaStageBlock
  | CardGameScoreboardStageBlock
  | CardGameCardStripStageBlock
  | CardGameCustomStageBlock;

export interface CardGameStageLayout {
  authoredViewport: CardGameViewportSize;
  hud: CardGameHudStageBlock;
  arena: CardGameArenaStageBlock;
  extraBlocks?: CardGameStageBlock[];
}

export interface PlayerUiDefaults {
  baseArcRotation: number;
  infoBoxAngle: number;
  infoBoxRotation: number;
  labelTextOffset: number;
  avatarImageScale: number;
  avatarBaseColor: string;
  infoBoxColor: string;
  overallScale: number;
  width: number;
  height: number;
  timerThickness?: number;
  timerColor?: string;
}

export interface WingConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  topRadius: number;
}

export interface ClampConfig {
  width: number;
  height: number;
  rightRadius: number;
  goldTop: string;
  goldMid: string;
  goldBottom: string;
}

export interface EdgeGlowConfig {
  edgeColor: string;
  edgeWidth: number;
  glowColor: string;
  glowWidth: number;
  glowOpacity: number;
}

export interface DomeConfig {
  cx: number;
  cy: number;
  width: number;
  height: number;
  topRadius: number;
  edgeColor: string;
  edgeInnerColor: string;
  edgeWidth: number;
  glowColor: string;
  glowWidth: number;
  glowOpacity: number;
}

export interface HudButtonControls {
  buttonOffsetX: number;
  buttonOffsetY: number;
  width: number;
  height: number;
  bodyHeight?: number;
  radius: number;
  leftX?: number;
  rightX?: number;
  sideInset: number;
  dotInset: number;
  dotGap: number;
  textColor: string;
  fontSize: number;
  bodyCenter: string;
  bodyMid: string;
  bodyEdge: string;
  ringColor: string;
  outerGlowColor: string;
  midGlowColor: string;
  dotGlowColor: string;
  dotCoreColor: string;
  sideFillTop: string;
  sideFillMid: string;
  sideFillBottom: string;
  sideStroke: string;
  sideGlow: string;
  frontFillTop: string;
  frontFillMid: string;
  frontFillBottom: string;
  hoverInsetExpand: number;
  hoverClampGlowColor: string;
  hoverClampGlowOpacity: number;
  clickInsetExpand: number;
  clickRingFlashColor: string;
  clickRingFlashOpacity: number;
}

export interface HudButtonVariantControls {
  linked: boolean;
  overrides: Partial<HudButtonControls>;
}

export interface HudButtonBankControls {
  gap: number;
  paddingX: number;
  paddingY: number;
  minScale: number;
  maxScale: number;
  leftOffsetX: number;
  leftOffsetY: number;
  rightOffsetX: number;
  rightOffsetY: number;
}

export type CardGameScoreboardIcon = 'coin' | 'pot' | 'none';

export interface CardGameScoreboardRowControls {
  id: string;
  icon: CardGameScoreboardIcon;
  label: string;
  value: string;
  valueBinding?: string;
  iconX: number;
  iconY: number;
  iconSize: number;
  labelX: number;
  labelTextSize: number;
  valueTextSize: number;
  textY: number;
  coinDollarFontSize: number;
  coinDollarTextLength: number;
  coinDollarY: number;
  coinDollarStrokeWidth: number;
}

export interface CardGameScoreboardControls {
  width: number;
  height: number;
  overallScale: number;
  outerRadius: number;
  panelInset: number;
  borderWidth: number;
  glowBlur: number;
  rowStrokeWidth: number;
  tableMargin: number;
  tableDividerPercent: number;
  tableDividerOffset: number;
  headerHeight: number;
  headerBoxWidth: number;
  headerBoxHeight: number;
  headerGap: number;
  headerPadX: number;
  headerBandTopInset: number;
  headerBandBottomInset: number;
  headerOuterPadY: number;
  headerTextYOffset: number;
  headerBoxTextPadding: number;
  headerValueAutoFit: boolean;
  headerValueAutoSize: boolean;
  headerValueSizeScale: number;
  headerLabelTextSize: number;
  headerValueTextSize: number;
  headerBgRadius: number;
  headerBgOpacity: number;
  headerBgStrokeWidth: number;
  headerBgFill: string;
  headerBgStroke: string;
  headerValueBoxFill: string;
  headerValueBoxStroke: string;
  headerValueBoxRadius: number;
  round: number;
  roundLabel: string;
  roundBinding?: string;
  ofLabel: string;
  totalRounds: number;
  totalRoundsBinding?: string;
  rows: CardGameScoreboardRowControls[];
  showIcons: boolean;
  iconSize: number;
  coinDollarFontSize: number;
  coinDollarTextLength: number;
  coinDollarY: number;
  coinDollarStrokeWidth: number;
  iconX: number;
  iconOffsetY: number;
  labelOffsetX: number;
  cellPaddingX: number;
  cellCornerRadius: number;
  bgTop: string;
  bgMid: string;
  bgBottom: string;
  panelTop: string;
  panelBottom: string;
  edgeLight: string;
  edgeDark: string;
  textYellow: string;
  textRed: string;
  textRedStroke: string;
  darkStroke: string;
  overallLetterSpacing: number;
  overallTextYOffset: number;
  headerTextSize: number;
  valueTextSize: number;
  labelTextSize: number;
  rowTextYOffset: number;
  bevelOpacity: number;
}

export interface CardGameCardStripSlotControls {
  id: string;
  label: string;
  binding?: string;
  previewFaceUp?: boolean;
  previewText?: string;
}

export interface CardGameCardStripControls {
  cardWidth: number;
  cardHeight: number;
  gap: number;
  overallScale: number;
  slots: CardGameCardStripSlotControls[];
}

export type CardGameDeckTrayImageFit = 'cover' | 'contain';

export interface CardGameDeckTrayControls {
  svgWidth: number;
  svgHeight: number;
  trayX: number;
  trayY: number;
  trayWidth: number;
  trayHeight: number;
  trayRadius: number;
  trayFillTop: string;
  trayFillBottom: string;
  trayStroke: string;
  trayStrokeWidth: number;
  trayInnerStroke: string;
  trayInnerStrokeWidth: number;
  trayGlowColor: string;
  trayGlowBlur: number;
  trayRimHighlight: string;
  trayRimHighlightOpacity: number;
  trayInnerHighlightOpacity: number;
  trayVignetteOpacity: number;
  trayShadowOpacity: number;
  showTrayShine: boolean;
  trayShineOpacity: number;
  trayShineX: number;
  trayShineWidth: number;
  trayShineAngle: number;
  autoCenterDeck: boolean;
  autoScaleDeckToTray: boolean;
  deckFitPaddingX: number;
  deckFitPaddingY: number;
  deckScale: number;
  deckCenterOffsetX: number;
  deckCenterOffsetY: number;
  deckOffsetX: number;
  deckOffsetY: number;
  maxStackCount: number;
  stackRemoveFromTop: boolean;
  deckX: number;
  deckY: number;
  cardWidth: number;
  cardHeight: number;
  cardRadius: number;
  stackCount: number;
  stackOffsetX: number;
  stackOffsetY: number;
  stackStroke: string;
  stackStrokeWidth: number;
  stackFill: string;
  stackShadowOpacity: number;
  topCardInset: number;
  topCardRadius: number;
  topCardImageUrl: string;
  imageFit: CardGameDeckTrayImageFit;
  imageScale: number;
  imageX: number;
  imageY: number;
  imageOpacity: number;
  placeholderTop: string;
  placeholderBottom: string;
  patternOpacity: number;
  patternStroke: string;
  showPattern: boolean;
  showPlaceholderText: boolean;
  placeholderText: string;
  placeholderText2: string;
  placeholderTextColor: string;
  placeholderTextStroke: string;
  placeholderTextSize: number;
  showDeck: boolean;
  showEmptyTrayGhost: boolean;
  ghostOpacity: number;
  glowMargin: number;
}

export type CardGameRenderToggleKey =
  | 'background'
  | 'header'
  | 'footer'
  | 'table'
  | 'seats'
  | 'playerUi'
  | 'zones'
  | 'hud'
  | 'cardFan'
  | 'scoreboard'
  | 'cardStrip'
  | 'deckTray';

export type CardGameRenderToggles = Record<CardGameRenderToggleKey, boolean>;

export type CardGameLayerKey =
  | 'background'
  | 'header'
  | 'footer'
  | 'table'
  | 'seats'
  | 'playerUi'
  | 'cards'
  | 'cardFan'
  | 'cardStrip'
  | 'zones'
  | 'hud'
  | 'deckTray'
  | 'deckTrayDeck'
  | 'scoreboard'
  | 'tools'
  ;

export type CardGameLayerVisibility = Partial<Record<CardGameLayerKey, boolean>>;

export function createCardGameEditorIsolationVisibility(): CardGameLayerVisibility {
  return {
    background: true,
    header: true,
    footer: true,
    table: true,
    seats: true,
    playerUi: true,
    cards: true,
    cardFan: true,
    cardStrip: true,
    zones: true,
    hud: true,
    deckTray: true,
    deckTrayDeck: true,
    scoreboard: true,
    tools: true,
  };
}

export interface CardGameEditorOverlayVisibility {
  header: boolean;
  footer: boolean;
  table: boolean;
  seats: boolean;
  playerUi: boolean;
  zones: boolean;
  deckTray: boolean;
  deckTrayDeck: boolean;
  hud: boolean;
  hudDome: boolean;
  hudWings: boolean;
  hudBanks: boolean;
  hudButtons: boolean;
  cardFan: boolean;
  scoreboard: boolean;
  scoreboardHeader: boolean;
  scoreboardRows: boolean;
  cardStrip: boolean;
  cardStripSlots: boolean;
  cardVisuals: boolean;
}

export function createCardGameEditorOverlayVisibility(): CardGameEditorOverlayVisibility {
  return {
    header: false,
    footer: false,
    table: false,
    seats: false,
    playerUi: false,
    zones: false,
    deckTray: false,
    deckTrayDeck: false,
    hud: false,
    hudDome: false,
    hudWings: false,
    hudBanks: false,
    hudButtons: false,
    cardFan: false,
    scoreboard: false,
    scoreboardHeader: false,
    scoreboardRows: false,
    cardStrip: false,
    cardStripSlots: false,
    cardVisuals: false,
  };
}

export interface CardGameTablePresentation {
  overallScale: number;
}

export interface CardGameTableAttachmentPosition {
  x: number;
  y: number;
}

export interface CardGameTableAttachmentSize {
  width: number;
  height: number;
}

export interface CardGameDeckTrayAttachment {
  position: CardGameTableAttachmentPosition;
  size: CardGameTableAttachmentSize;
  scale: number;
  rotation: number;
}

export interface CardGameTableAttachments {
  deckTray: CardGameDeckTrayAttachment;
}

export interface HudArtworkControls {
  hudOffsetX: number;
  hudOffsetY: number;
  overallScale: number;
  width: number;
  height: number;
  buttonScale: number;
  buttonCount: number;
  buttonLabels: string[];
  button: HudButtonControls;
  buttonBank: HudButtonBankControls;
  buttonVariants: HudButtonVariantControls[];
  leftWing: WingConfig;
  rightWing: WingConfig;
  clamp: ClampConfig;
  wingStyle: EdgeGlowConfig;
  dome: DomeConfig;
  panelTop: string;
  panelMid: string;
  panelBottom: string;
  panelGlassOpacity: number;
  linkedWings?: boolean;
}

export interface CardFanControls {
  cardCount: number;
  minCardCount: number;
  maxCardCount: number;
  radiusScale: number;
  radiusOffset: number;
  cardWidthScale: number;
  cardHeightScale: number;
  arcMin: number;
  arcMax: number;
  fanTilt: number;
  centerOffsetX: number;
  centerOffsetY: number;
  disableViewportScale: boolean;
  overallScale: number;
}

export interface CardVisualControls {
  floatScale: number;
}

export interface PlainCardFrameSettings {
  width: number;
  height: number;
  cornerRadius: number;
  goldBorderWidth: number;
  greenBorderWidth: number;
  glowBlur: number;
  glowMargin: number;
  outerGreen: string;
  goldLight: string;
  goldMid: string;
  goldDark: string;
  fillTop: string;
  fillBottom: string;
  showInnerShadow: boolean;
  showBottomTitle: boolean;
  bottomTitle: string;
  bottomTitleHeight: number;
  bottomTitleSize: number;
  bottomTitleInsetX: number;
  bottomTitleBottomInset: number;
  bottomTitleCornerRadius: number;
  bottomTitleStrokeWidth: number;
  bottomTitleYOffset: number;
  bottomTitleFillLight: string;
  bottomTitleFillDark: string;
  bottomTitleText: string;
  bottomTitleTextPadding: number;
  bottomTitleTextYOffset: number;
}

export interface LayoutPreset {
  table: TableShapeSettings;
  seats: SeatLayout[];
}

export type TableZoneType = 'deck' | 'pot' | 'card' | 'list';

export interface TableZoneSize {
  width: number;
  height: number;
}

export interface TableZone {
  id: string;
  label: string;
  type: TableZoneType;
  position: { x: number; y: number };
  size?: TableZoneSize;
  scale?: number;
  rotation?: number;
  engineBinding?: string;
  emptyText?: string;
}

export interface CardGameLayoutDocument {
  defaultPlayerCount: number;
  presets: Record<string, LayoutPreset>;
  playerUiDefaults: Partial<PlayerUiDefaults>;
  hud: HudArtworkControls;
  scoreboard: CardGameScoreboardControls;
  cardStrip: CardGameCardStripControls;
  deckTray: CardGameDeckTrayControls;
  cardFan: CardFanControls;
  cardVisuals: CardVisualControls;
  cardFrame?: PlainCardFrameSettings;
  renderToggles: CardGameRenderToggles;
  tablePresentation: CardGameTablePresentation;
  tableAttachments: CardGameTableAttachments;
  views: Record<string, LayoutPreset>;
  stageLayout?: CardGameStageLayout;
  zones?: TableZone[];
  gameplay: Record<string, unknown>;
  extensions: Record<string, unknown>;
}

export interface CardGameScoreboardRowPresentation {
  hidden?: boolean;
  icon?: CardGameScoreboardIcon;
  label?: string;
  value?: string;
}

export interface CardGameScoreboardPresentation {
  hidden?: boolean;
  round?: number | string;
  totalRounds?: number | string;
  rowsById?: Partial<Record<string, CardGameScoreboardRowPresentation>>;
}

export interface CardGameCardStripCardToken {
  id: string;
  suit?: string | null;
  value?: number | string | null;
}

export interface CardGameCardStripSlotPresentation {
  hidden?: boolean;
  label?: string;
  faceUp?: boolean;
  card?: CardGameCardStripCardToken | null;
  text?: string;
}

export interface CardGameCardStripPresentation {
  hidden?: boolean;
  slotsById?: Partial<Record<string, CardGameCardStripSlotPresentation>>;
}

export interface CardGameDeckTrayPresentation {
  hidden?: boolean;
  stackCount?: number;
  maxStackCount?: number;
  topCardImageUrl?: string;
  imageFit?: CardGameDeckTrayImageFit;
  imageScale?: number;
  imageX?: number;
  imageY?: number;
  imageOpacity?: number;
  showDeck?: boolean;
}
