export type WingConfig = {
  x: number;
  y: number;
  width: number;
  height: number;
  topRadius: number;
};

export type ClampConfig = {
  width: number;
  height: number;
  rightRadius: number;
  goldTop: string;
  goldMid: string;
  goldBottom: string;
};

export type EdgeGlowConfig = {
  edgeColor: string;
  edgeWidth: number;
  glowColor: string;
  glowWidth: number;
  glowOpacity: number;
};

export type DomeConfig = {
  cx: number;
  cy: number;
  radius: number;
  edgeColor: string;
  edgeInnerColor: string;
  edgeWidth: number;
  glowColor: string;
  glowWidth: number;
  glowOpacity: number;
};

export type HudActionKey = "A" | "B" | "C" | "D" | "E" | "F";

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

export interface HudButtonControls {
  buttonOffsetX: number;
  buttonOffsetY: number;
  width: number;
  height: number;
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
  layerVisibility?: CardGameLayerVisibility;
}

export const DEFAULT_HUD_ARTWORK_CONTROLS: HudArtworkControls = {
  hudOffsetX: 0,
  hudOffsetY: -36,
  overallScale: 1,
  width: 880,
  height: 360,
  buttonScale: 1,
  buttonCount: 6,
  buttonLabels: ["A", "B", "C", "D", "E", "F"],
  button: {
    buttonOffsetX: 0,
    buttonOffsetY: 12,
    width: 649,
    height: 260,
    radius: 58,
    sideInset: 0,
    dotInset: 20,
    dotGap: 15,
    textColor: "#fff7ff",
    fontSize: 34,
    bodyCenter: "#2b064a",
    bodyMid: "#17002a",
    bodyEdge: "#0a0013",
    ringColor: "#ea6bff",
    outerGlowColor: "#9d00ff",
    midGlowColor: "#e25eff",
    dotGlowColor: "#ffca28",
    dotCoreColor: "#fff59d",
    sideFillTop: "#3d0f69",
    sideFillMid: "#21043c",
    sideFillBottom: "#10011f",
    sideStroke: "#eb7aff",
    sideGlow: "#b020ff",
    frontFillTop: "#0f2a66",
    frontFillMid: "#0a1b3f",
    frontFillBottom: "#050d1f",
    hoverInsetExpand: 10,
    hoverClampGlowColor: "#ffd34d",
    hoverClampGlowOpacity: 0.9,
    clickInsetExpand: 14,
    clickRingFlashColor: "#39ff88",
    clickRingFlashOpacity: 0.95,
  },
  buttonVariants: Array.from({ length: 6 }, () => ({
    linked: true,
    overrides: {},
  })),
  leftWing: {
    x: 4,
    y: 306,
    width: 437,
    height: 50,
    topRadius: 20,
  },
  rightWing: {
    x: 439,
    y: 306,
    width: 437,
    height: 50,
    topRadius: 20,
  },
  clamp: {
    width: 11,
    height: 35,
    rightRadius: 18,
    goldTop: "#fff6bc",
    goldMid: "#d5a623",
    goldBottom: "#7c5407",
  },
  wingStyle: {
    edgeColor: "#22ff66",
    edgeWidth: 1,
    glowColor: "#00ff66",
    glowWidth: 8,
    glowOpacity: 0.34,
  },
  dome: {
    cx: 432,
    cy: 356,
    radius: 110,
    edgeColor: "#f0cb63",
    edgeInnerColor: "#7f5610",
    edgeWidth: 1,
    glowColor: "#f0cb63",
    glowWidth: 12,
    glowOpacity: 0.22,
  },
  panelTop: "#0b1a10",
  panelMid: "#050b07",
  panelBottom: "#0a1c12",
  panelGlassOpacity: 0.08,
  layerVisibility: {
    background: true,
    header: true,
    table: true,
    seats: true,
    cards: true,
    hud: true,
    tools: true,
    footer: true,
  },
};
