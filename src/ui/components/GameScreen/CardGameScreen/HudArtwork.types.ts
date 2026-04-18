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

export interface HudArtworkControls {
  hudOffsetX: number;
  hudOffsetY: number;
  overallScale: number;
  width: number;
  height: number;
  buttonScale: number;
  buttonCount: number;
  buttonLabels: string[];
  leftWing: WingConfig;
  rightWing: WingConfig;
  clamp: ClampConfig;
  wingStyle: EdgeGlowConfig;
  dome: DomeConfig;
  panelTop: string;
  panelMid: string;
  panelBottom: string;
  panelGlassOpacity: number;
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
};
