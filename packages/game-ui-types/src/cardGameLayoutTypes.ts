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

export interface CardGameShellMetrics {
  headerHeight: number;
  toolbarHeight: number;
  footerHeight: number;
  workTop: number;
  workBottom: number;
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

export type CardGameLayerKey =
  | 'background'
  | 'header'
  | 'table'
  | 'seats'
  | 'cards'
  | 'hud'
  | 'tools'
  | 'footer';

export type CardGameLayerVisibility = Partial<Record<CardGameLayerKey, boolean>>;

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
  showDebugGuides?: boolean;
  linkedWings?: boolean;
  layerVisibility?: CardGameLayerVisibility;
}

export interface CardFanControls {
  cardCount: number;
  minCardCount: number;
  maxCardCount: number;
  radiusScale: number;
  radiusOffset: number;
  cardWidthScale: number;
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

export interface LayoutPreset {
  table: TableShapeSettings;
  seats: SeatLayout[];
}

export type TableZoneType = 'deck' | 'pot' | 'card' | 'list';

export interface TableZone {
  id: string;
  label: string;
  type: TableZoneType;
  position: { x: number; y: number };
  scale?: number;
  rotation?: number;
  engineBinding?: string;
}

export interface CardGameLayoutDocument {
  defaultPlayerCount: number;
  presets: Record<string, LayoutPreset>;
  playerUiDefaults: Partial<PlayerUiDefaults>;
  hud: HudArtworkControls;
  cardFan: CardFanControls;
  cardVisuals: CardVisualControls;
  views: Record<string, LayoutPreset>;
  zones?: TableZone[];
  gameplay: Record<string, unknown>;
  extensions: Record<string, unknown>;
}
