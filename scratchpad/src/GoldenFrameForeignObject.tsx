/* eslint-disable */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useEffect, useState } from "react";

type Point = { x: number; y: number };
type Segment = { id: string; d: string; kind: string; a: Point; b: Point };

const OUTER_FRAME_DEFAULT = {
  x: 0,
  y: 0,
  w: 1500,
  h: 820,
  sideInset: 0,
  cornerCut: 75,
  topRise: 53,
  topStepWidth: 539,
  topStepInset: 54,
  bottomTabWidth: 503,
  bottomTabDepth: 50,
  bottomTabInset: 58,
  topLeftConnectorThickness: 18,
  topLeftSliceTransitionThickness: 18,
  topRightConnectorThickness: 18,
  topRightSliceTransitionThickness: 18,
  rightTopCornerThickness: 18,
  rightBottomCornerThickness: 18,
  rightSideSliceTransitionThickness: 18,
  bottomRightConnectorThickness: 18,
  bottomRightSliceTransitionThickness: 18,
  bottomLeftConnectorThickness: 18,
  bottomLeftSliceTransitionThickness: 18,
  leftBottomCornerThickness: 18,
  leftSideSliceTransitionThickness: 18,
  leftTopCornerThickness: 18,
  topLeftThickness: 5,
  topCenterThickness: 18,
  topRightThickness: 5,
  leftSideThickness: 5,
  rightSideThickness: 5,
  bottomLeftThickness: 5,
  bottomCenterThickness: 18,
  bottomRightThickness: 5,
  topLeftStartGap: 60,
  topLeftEndGap: 60,
  topRightStartGap: 60,
  topRightEndGap: 60,
  bottomLeftStartGap: 60,
  bottomLeftEndGap: 60,
  bottomRightStartGap: 60,
  bottomRightEndGap: 60,
  leftSideStartGap: 60,
  leftSideEndGap: 60,
  rightSideStartGap: 60,
  rightSideEndGap: 60,
  lineCap: "round" as const,
  bottomTabDirection: "down" as const,
  enableBottomRiseCopy: true,
  bottomRiseCopyYOffset: 0,
  bottomRiseCopyDepth: 50,
  bottomRiseCopyThickness: 7,
  topGroupThickness: 8,
  bottomGroupThickness: 7,
  cornerGroupThickness: 16,
  thinLineGroupThickness: 3,
  segmentThicknesses: {
    topLeftRunMid: 3,
    topRightRunMid: 3,
    bottomRightRunMid: 3,
    bottomLeftRunMid: 3,
    leftSideRunStart: 16,
    leftSideRunEnd: 16,
    leftTopCorner: 16,
    topLeftRunStart: 16,
    topRightRunEnd: 16,
    rightTopCorner: 16,
    rightSideRunStart: 16,
    rightSideRunEnd: 16,
    rightBottomCorner: 16,
    bottomRightRunStart: 16,
    bottomLeftRunEnd: 16,
    leftBottomCorner: 16,
    bottomRightRunEnd: 7,
    bottomRightConnector: 7,
    bottomCenterRun: 7,
    bottomLeftConnector: 7,
    bottomLeftRunStart: 7,
    topLeftRunEnd: 8,
    topLeftConnector: 8,
    topCenterRun: 8,
    topRightConnector: 8,
    topRightRunStart: 8,
  },
  color: "#ffd23b",
};

const GOLD = {
  top: "#fff4a8",
  mid: "#ffd23b",
  bottom: "#b87900",
  edge: "#5a3000",
  glow: "#ffcf45",
};

const INNER_FRAME_DEFAULT = {
  ...OUTER_FRAME_DEFAULT,
  topLeftThickness: 2,
  topRightThickness: 2,
  leftSideThickness: 2,
  rightSideThickness: 2,
  bottomLeftThickness: 2,
  bottomRightThickness: 2,
  topLeftStartGap: 40,
  topLeftEndGap: 60,
  topRightStartGap: 60,
  topRightEndGap: 40,
  bottomLeftStartGap: 60,
  bottomLeftEndGap: 40,
  bottomRightStartGap: 40,
  bottomRightEndGap: 60,
  leftSideStartGap: 40,
  leftSideEndGap: 40,
  rightSideStartGap: 40,
  rightSideEndGap: 40,
  bottomTabDirection: "up" as const,
  enableBottomRiseCopy: false,
  topGroupThickness: 1,
  bottomGroupThickness: 1,
  cornerGroupThickness: 6,
  segmentThicknesses: {
    topLeftRunEnd: 1,
    topLeftConnector: 1,
    topCenterRun: 1,
    topRightConnector: 1,
    topRightRunStart: 1,
    bottomRightRunEnd: 1,
    bottomRightConnector: 1,
    bottomCenterRun: 1,
    bottomLeftConnector: 1,
    bottomLeftRunStart: 1,
    leftSideRunStart: 6,
    leftSideRunEnd: 6,
    leftTopCorner: 6,
    topLeftRunStart: 6,
    topRightRunEnd: 6,
    rightTopCorner: 6,
    rightSideRunStart: 6,
    rightSideRunEnd: 6,
    rightBottomCorner: 6,
    bottomRightRunStart: 6,
    bottomLeftRunEnd: 6,
    leftBottomCorner: 6,
  },
};

const DEFAULT_CFG = {
  viewBox: { w: 1536, h: 864 },
  outerAnchor: { sideInset: 30, topInset: 30, bottomInset: 30 },
  innerAnchor: { sideInset: 60, topInset: 60, bottomInset: 60 },
  outerFrame: { ...OUTER_FRAME_DEFAULT },
  innerFrame: { ...INNER_FRAME_DEFAULT },
  centerCircle: {
    enabled: true,
    cx: 768,
    cy: 312,
    radius: 213,
    profileImageUrl: "",
    imageOpacity: 1,
    imageScale: 1.22,
    imageYOffset: 10,
    fillOpacity: 1,
    fillTopColor: "#261713",
    fillMidColor: "#0f1024",
    fillBottomColor: "#050611",
    edgeOpacity: 1,
    edgeWidth: 6,
    edgeBlur: 2.25,
    glowColor: "#ffcf45",
    glowOpacity: 0.5,
    glowWidth: 7,
    glowBlur: 10,
    bevelColor: "#fff4b0",
    bevelOpacity: 0.9,
    bevelWidth: 3,
    innerShadowColor: "#2c1600",
    innerShadowOpacity: 0.55,
    innerShadowWidth: 5,
    ringShadowColor: "#2f1700",
    ringGoldDark: "#6b3700",
    ringGoldMid: "#d5961e",
    ringGoldBright: "#fff0a8",
    ringInset: 5,
    innerRingWidth: 2,
    highlightArcWidth: 3,
    boxCount: 8,
    boxDistance: 215,
    boxWidth: 27,
    boxHeight: 38,
    boxDiagonalScale: 0.5,
    boxOuterScale: 1.2,
    boxInnerScale: 0.58,
    boxFillTop: "#fff0a8",
    boxFillMid: "#ffd23b",
    boxFillBottom: "#b87900",
    boxStroke: GOLD.edge,
    boxStrokeWidth: 3,
    boxHighlight: GOLD.top,
    boxGlow: "#ffcf45",
    boxGlowOpacity: 0.34,
    boxGlowBlur: 2.5,
    boxInnerEdge: GOLD.top,
  },
  centerCrown: {
    enabled: true,
    cx: 768,
    cy: -52,
    width: 300,
    height: 205,
    fillTop: "#fff7c2",
    fillMid: "#ffd23b",
    fillBottom: "#9b5b00",
    edge: "#5a3000",
    glow: "#ffcf45",
    glowOpacity: 0.45,
    glowBlur: 7,
    jewelRed: "#ffd23b",
    jewelGreen: "#d99a18",
  },
  sideHexBadge: {
    enabled: true,
    cx: 310,
    cy: 432,
    radius: 118,
    label: "1",
    edgeOpacity: 1,
    edgeWidth: 7,
    edgeBlur: 2.25,
    glowColor: "#ffcf45",
    glowOpacity: 0.5,
    glowWidth: 12,
    glowBlur: 10,
    highlightColor: "#fff4b0",
    highlightOpacity: 0.78,
    highlightWidth: 3,
    innerEdgeOpacity: 0.58,
    ringShadowColor: "#2f1700",
    ringGoldDark: "#6b3700",
    ringGoldMid: "#d5961e",
    ringGoldBright: "#fff0a8",
    textColor: "#ffffff",
    textStroke: "#000000",
    textStrokeWidth: 1.4,
    fontSize: 108,
    wingEnabled: true,
    wingLength: 118,
    wingHeight: 78,
    wingInset: 96,
    wingGap: 7,
    wingStrokeWidth: 3,
    wingGlowOpacity: 0.28,
  },
  hexCrown: {
    enabled: true,
    cx: 310,
    cy: 286,
    width: 112,
    height: 72,
    goldLight: "#fff4a8",
    gold: "#ffd23b",
    goldDark: "#8a5200",
    edge: GOLD.edge,
    red: "#ffd23b",
    green: "#d99a18",
    glow: "#ffcf45",
    glowOpacity: 0.38,
    glowBlur: 5,
  },
  winnerName: {
    enabled: true,
    x: 768,
    y: 620,
    width: 430,
    height: 72,
    radius: 22,
    text: "Sujan Mishra",
    fontSize: 42,
    fillTop: "#261713",
    fillMid: "#0f1024",
    fillBottom: "#050611",
    edgeColor: GOLD.edge,
    edgeWidth: 6,
    edgeOpacity: 1,
    edgeBlur: 2.25,
    glowColor: "#ffcf45",
    glowOpacity: 0.5,
    glowBlur: 10,
    ringShadowColor: "#2f1700",
    ringGoldDark: "#6b3700",
    ringGoldMid: "#d5961e",
    ringGoldBright: "#fff0a8",
    highlightColor: "#fff4b0",
    textColor: "#ffffff",
    textStroke: "#090300",
    textStrokeWidth: 2,
    clampWidth: 24,
    clampHeight: 26,
    clampInset: 10,
  },
  rightStats: {
    enabled: true,
    x: 1225,
    y: 400,
    boxWidth: 275,
    name: "BluffMaster",
    value: "4,000",
    nameSize: 48,
    valueSize: 64,
    gap: 64,
    textColor: "#ffffff",
    textShadow: "#050509",
    valueColor: "#ffd23b",
    valueStroke: "#3a2100",
    iconSize: 38,
    iconGap: 22,
    iconTop: "#e9fbff",
    iconMid: "#35b8ff",
    iconBottom: "#0553c7",
    iconStroke: "#c9f7ff",
    iconGlow: "#45caff",
    iconGlowOpacity: 0.55,
    iconGlowBlur: 4,
  },
  viewportGuide: {
    showSegmentNumbers: false,
    gangedSlices: false,
    globalSliceGap: 60,
    enabled: true,
    inset: 1,
    width: 1,
    color: "#39d5ff",
    opacity: 0.55,
    showCenterLines: true,
    centerLineColor: "#ff4fd8",
    centerLineOpacity: 0.38,
  },
};

const FOREIGN_STORAGE_KEY = "ocentra-foreign-frame-config";
const FOREIGN_CHANNEL = "ocentra-foreign-frame-channel";

const VARIANT_PALETTES = {
  gold: {
    light: "#fff4a8",
    mid: "#ffd23b",
    bottom: "#b87900",
    dark: "#5a3000",
    glow: "#ffcf45",
    fillTop: "#261713",
    fillMid: "#0f1024",
    fillBottom: "#050611",
    textStroke: "#090300",
  },
  silver: {
    light: "#f8fbff",
    mid: "#b9d7f2",
    bottom: "#5e7f9d",
    dark: "#203348",
    glow: "#9fe8ff",
    fillTop: "#182838",
    fillMid: "#0d1827",
    fillBottom: "#050914",
    textStroke: "#06101a",
  },
  bronze: {
    light: "#ffd7a1",
    mid: "#d98a42",
    bottom: "#7b331c",
    dark: "#35150d",
    glow: "#ff8e52",
    fillTop: "#2a1714",
    fillMid: "#151019",
    fillBottom: "#08060d",
    textStroke: "#160705",
  },
  blue: {
    light: "#c8fbff",
    mid: "#35d9ff",
    bottom: "#0866aa",
    dark: "#062340",
    glow: "#35d9ff",
    fillTop: "#102841",
    fillMid: "#071829",
    fillBottom: "#030815",
    textStroke: "#020b14",
  },
  red: {
    light: "#ffc1cc",
    mid: "#ff4f70",
    bottom: "#8c1635",
    dark: "#350717",
    glow: "#ff5d7a",
    fillTop: "#2b111b",
    fillMid: "#140d18",
    fillBottom: "#07050d",
    textStroke: "#18040a",
  },
};

function cloneDefaultForeignConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CFG));
}

export function createGoldenFrameVariantConfig({
  rank = "1",
  name = "AceMaster99",
  statName = "Global",
  statValue = "4,928",
  tone = "gold",
} = {}) {
  const cfg = cloneDefaultForeignConfig();
  const palette = VARIANT_PALETTES[tone as keyof typeof VARIANT_PALETTES] ?? VARIANT_PALETTES.gold;

  cfg.viewportGuide.enabled = false;
  cfg.viewportGuide.showCenterLines = false;
  cfg.viewportGuide.opacity = 0;

  for (const frame of [cfg.outerFrame, cfg.innerFrame]) {
    frame.color = palette.mid;
    frame.glowColor = palette.glow;
    frame.edgeColor = palette.dark;
    frame.overlayTopColor = palette.light;
    frame.overlayMidColor = palette.mid;
    frame.overlayBottomColor = palette.bottom;
  }

  Object.assign(cfg.centerCircle, {
    fillTopColor: palette.fillTop,
    fillMidColor: palette.fillMid,
    fillBottomColor: palette.fillBottom,
    glowColor: palette.glow,
    bevelColor: palette.light,
    innerShadowColor: palette.dark,
    ringShadowColor: palette.dark,
    ringGoldDark: palette.dark,
    ringGoldMid: palette.mid,
    ringGoldBright: palette.light,
    boxFillTop: palette.light,
    boxFillMid: palette.mid,
    boxFillBottom: palette.bottom,
    boxStroke: palette.dark,
    boxHighlight: palette.light,
    boxGlow: palette.glow,
    boxInnerEdge: palette.light,
  });

  Object.assign(cfg.centerCrown, {
    fillTop: palette.light,
    fillMid: palette.mid,
    fillBottom: palette.bottom,
    edge: palette.dark,
    glow: palette.glow,
    jewelRed: palette.mid,
    jewelGreen: palette.bottom,
  });

  Object.assign(cfg.sideHexBadge, {
    label: String(rank),
    glowColor: palette.glow,
    highlightColor: palette.light,
    ringShadowColor: palette.dark,
    ringGoldDark: palette.dark,
    ringGoldMid: palette.mid,
    ringGoldBright: palette.light,
    textStroke: palette.textStroke,
  });

  Object.assign(cfg.hexCrown, {
    goldLight: palette.light,
    gold: palette.mid,
    goldDark: palette.bottom,
    edge: palette.dark,
    red: palette.mid,
    green: palette.bottom,
    glow: palette.glow,
  });

  Object.assign(cfg.winnerName, {
    text: name,
    fillTop: palette.fillTop,
    fillMid: palette.fillMid,
    fillBottom: palette.fillBottom,
    edgeColor: palette.dark,
    glowColor: palette.glow,
    ringShadowColor: palette.dark,
    ringGoldDark: palette.dark,
    ringGoldMid: palette.mid,
    ringGoldBright: palette.light,
    highlightColor: palette.light,
    textStroke: palette.textStroke,
  });

  Object.assign(cfg.rightStats, {
    name: statName,
    value: statValue,
    valueColor: palette.mid,
    valueStroke: palette.dark,
    iconTop: palette.light,
    iconMid: palette.mid,
    iconBottom: palette.bottom,
    iconStroke: palette.light,
    iconGlow: palette.glow,
  });

  return cfg;
}

function readForeignConfig() {
  try {
    const stored = localStorage.getItem(FOREIGN_STORAGE_KEY);
    return stored ? JSON.parse(stored) : cloneDefaultForeignConfig();
  } catch {
    return cloneDefaultForeignConfig();
  }
}

function useSharedForeignConfig() {
  const [cfg, setCfg] = useState(readForeignConfig);

  useEffect(() => {
    try {
      localStorage.setItem(FOREIGN_STORAGE_KEY, JSON.stringify(cfg));
    } catch {
      // ignore storage failures in the scratchpad
    }
  }, [cfg]);

  const setSharedCfg = (next) => {
    setCfg((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      try {
        localStorage.setItem(FOREIGN_STORAGE_KEY, JSON.stringify(resolved));
      } catch {
        // ignore storage failures in the scratchpad
      }
      try {
        const channel = new BroadcastChannel(FOREIGN_CHANNEL);
        channel.postMessage(resolved);
        channel.close();
      } catch {
        // ignore channel failures in the scratchpad
      }
      return resolved;
    });
  };

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== FOREIGN_STORAGE_KEY || !event.newValue) return;
      setCfg(JSON.parse(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    let channel = null;
    try {
      channel = new BroadcastChannel(FOREIGN_CHANNEL);
      channel.onmessage = (event) => setCfg(event.data);
    } catch {
      channel = null;
    }
    return () => {
      window.removeEventListener("storage", onStorage);
      channel?.close?.();
    };
  }, []);

  return [cfg, setSharedCfg];
}

function getAnchoredFrame(cfg: typeof DEFAULT_CFG, frameKey: "outerFrame" | "innerFrame", anchorKey: "outerAnchor" | "innerAnchor") {
  const frame = cfg[frameKey];
  const anchor = cfg[anchorKey];
  return {
    ...frame,
    x: anchor.sideInset,
    y: anchor.topInset,
    w: cfg.viewBox.w - anchor.sideInset * 2,
    h: cfg.viewBox.h - anchor.topInset - anchor.bottomInset - frame.bottomTabDepth,
  };
}

function getFramePoints(frame: typeof OUTER_FRAME_DEFAULT) {
  const left = frame.x + frame.sideInset;
  const right = frame.x + frame.w - frame.sideInset;
  const cx = frame.x + frame.w / 2;
  const topA = cx - frame.topStepWidth / 2;
  const topB = cx + frame.topStepWidth / 2;
  const peakY = frame.y;
  const shoulderY = frame.y + frame.topRise;
  const bottomY = frame.y + frame.h;
  const tabDirection = frame.bottomTabDirection === "up" ? -1 : 1;
  const tabY = bottomY + frame.bottomTabDepth * tabDirection;
  const bottomA = cx - frame.bottomTabWidth / 2;
  const bottomB = cx + frame.bottomTabWidth / 2;
  return [
    { x: left + frame.cornerCut, y: shoulderY },
    { x: topA - 12, y: shoulderY },
    { x: topA + frame.topStepInset, y: peakY },
    { x: topB - frame.topStepInset, y: peakY },
    { x: topB + 12, y: shoulderY },
    { x: right - frame.cornerCut, y: shoulderY },
    { x: right, y: shoulderY + frame.cornerCut },
    { x: right, y: bottomY - frame.cornerCut },
    { x: right - frame.cornerCut, y: bottomY },
    { x: bottomB, y: bottomY },
    { x: bottomB - frame.bottomTabInset, y: tabY },
    { x: bottomA + frame.bottomTabInset, y: tabY },
    { x: bottomA, y: bottomY },
    { x: left + frame.cornerCut, y: bottomY },
    { x: left, y: bottomY - frame.cornerCut },
    { x: left, y: shoulderY + frame.cornerCut },
  ];
}

function lerpPoint(a: Point, b: Point, distanceFromA: number): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len <= 0.0001) return { x: a.x, y: a.y };
  const t = Math.max(0, Math.min(1, distanceFromA / len));
  return { x: a.x + dx * t, y: a.y + dy * t };
}

function splitEdge(a: Point, b: Point, thinKind: string, thickKind: string, startGap = 0, endGap = 0, id = "segment"): Segment[] {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len <= 0.0001) return [];
  const safeStart = Math.max(0, Math.min(startGap, len / 2));
  const safeEnd = Math.max(0, Math.min(endGap, len / 2));
  const p1 = lerpPoint(a, b, safeStart);
  const p2 = lerpPoint(a, b, len - safeEnd);
  if (safeStart <= 0 && safeEnd <= 0) return [{ id, d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`, kind: thinKind, a, b }];
  const segments: Segment[] = [];
  if (safeStart > 0) segments.push({ id: `${id}Start`, d: `M ${a.x} ${a.y} L ${p1.x} ${p1.y}`, kind: thickKind, a, b: p1 });
  segments.push({ id: `${id}Mid`, d: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`, kind: thinKind, a: p1, b: p2 });
  if (safeEnd > 0) segments.push({ id: `${id}End`, d: `M ${p2.x} ${p2.y} L ${b.x} ${b.y}`, kind: thickKind, a: p2, b });
  return segments;
}

function edge(a: Point, b: Point, kind: string, id = "segment") {
  return [{ id, d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`, kind, a, b }];
}

function frameSegments(frame: typeof OUTER_FRAME_DEFAULT) {
  const p = getFramePoints(frame);
  return [
    ...splitEdge(p[14], p[15], "leftSideThickness", "leftSideSliceTransitionThickness", frame.leftSideStartGap, frame.leftSideEndGap, "leftSideRun"),
    ...edge(p[15], p[0], "leftTopCornerThickness", "leftTopCorner"),
    ...splitEdge(p[0], p[1], "topLeftThickness", "topLeftSliceTransitionThickness", frame.topLeftStartGap, frame.topLeftEndGap, "topLeftRun"),
    ...edge(p[1], p[2], "topLeftConnectorThickness", "topLeftConnector"),
    ...edge(p[2], p[3], "topCenterThickness", "topCenterRun"),
    ...edge(p[3], p[4], "topRightConnectorThickness", "topRightConnector"),
    ...splitEdge(p[4], p[5], "topRightThickness", "topRightSliceTransitionThickness", frame.topRightStartGap, frame.topRightEndGap, "topRightRun"),
    ...edge(p[5], p[6], "rightTopCornerThickness", "rightTopCorner"),
    ...splitEdge(p[6], p[7], "rightSideThickness", "rightSideSliceTransitionThickness", frame.rightSideStartGap, frame.rightSideEndGap, "rightSideRun"),
    ...edge(p[7], p[8], "rightBottomCornerThickness", "rightBottomCorner"),
    ...splitEdge(p[8], p[9], "bottomRightThickness", "bottomRightSliceTransitionThickness", frame.bottomRightStartGap, frame.bottomRightEndGap, "bottomRightRun"),
    ...edge(p[9], p[10], "bottomRightConnectorThickness", "bottomRightConnector"),
    ...edge(p[10], p[11], "bottomCenterThickness", "bottomCenterRun"),
    ...edge(p[11], p[12], "bottomLeftConnectorThickness", "bottomLeftConnector"),
    ...splitEdge(p[12], p[13], "bottomLeftThickness", "bottomLeftSliceTransitionThickness", frame.bottomLeftStartGap, frame.bottomLeftEndGap, "bottomLeftRun"),
    ...edge(p[13], p[14], "leftBottomCornerThickness", "leftBottomCorner"),
  ];
}

function copyRiseSegments(frame: typeof OUTER_FRAME_DEFAULT) {
  if (!frame.enableBottomRiseCopy) return [];
  const p = getFramePoints(frame);
  const y = frame.bottomRiseCopyYOffset;
  const bottomY = p[9].y + y;
  const tabY = bottomY - frame.bottomRiseCopyDepth;
  return [
    { id: "bottomRiseCopyRight", d: `M ${p[9].x} ${bottomY} L ${p[10].x} ${tabY}`, kind: "bottomRiseCopyThickness", a: { x: p[9].x, y: bottomY }, b: { x: p[10].x, y: tabY } },
    { id: "bottomRiseCopyCenter", d: `M ${p[10].x} ${tabY} L ${p[11].x} ${tabY}`, kind: "bottomRiseCopyThickness", a: { x: p[10].x, y: tabY }, b: { x: p[11].x, y: tabY } },
    { id: "bottomRiseCopyLeft", d: `M ${p[11].x} ${tabY} L ${p[12].x} ${bottomY}`, kind: "bottomRiseCopyThickness", a: { x: p[11].x, y: tabY }, b: { x: p[12].x, y: bottomY } },
  ];
}

function thicknessForSegment(frame: typeof OUTER_FRAME_DEFAULT, segment: Segment) {
  return frame.segmentThicknesses?.[segment.id] ?? frame[segment.kind as keyof typeof frame] ?? 1;
}

function CircleRingBoxes({ circle }) {
  const boxes = Array.from({ length: circle.boxCount }, (_, index) => {
    const angle = -90 + index * (360 / circle.boxCount);
    const rad = (angle * Math.PI) / 180;
    const scale = index % 2 === 1 ? circle.boxDiagonalScale : 1;
    const width = circle.boxWidth * scale;
    const height = circle.boxHeight * scale;
    const outerHalf = (width * circle.boxOuterScale) / 2;
    const innerHalf = (width * circle.boxInnerScale) / 2;
    const x = circle.cx + Math.cos(rad) * circle.boxDistance;
    const y = circle.cy + Math.sin(rad) * circle.boxDistance;
    const d = `M ${-outerHalf} ${-height / 2} L ${outerHalf} ${-height / 2} L ${innerHalf} ${height / 2} L ${-innerHalf} ${height / 2} Z`;
    const innerD = `M ${-outerHalf * 0.72} ${-height * 0.32} L ${outerHalf * 0.72} ${-height * 0.32} L ${innerHalf * 0.62} ${height * 0.28} L ${-innerHalf * 0.62} ${height * 0.28} Z`;
    const shineD = `M ${-outerHalf * 0.52} ${-height * 0.24} L ${outerHalf * 0.52} ${-height * 0.24}`;
    return <g key={`center-box-${index}`} transform={`translate(${x} ${y}) rotate(${angle + 90})`}><path d={d} fill={circle.boxGlow} opacity={circle.boxGlowOpacity} filter="url(#center-circle-box-glow)" /><path d={d} fill="url(#center-box-gold)" stroke={circle.boxStroke} strokeWidth={circle.boxStrokeWidth * scale} strokeLinejoin="round" vectorEffect="non-scaling-stroke" /><path d={d} fill="none" stroke={circle.boxInnerEdge} strokeWidth={Math.max(1, 1.1 * scale)} strokeLinejoin="round" opacity="0.48" vectorEffect="non-scaling-stroke" /><path d={innerD} fill="none" stroke={circle.boxInnerEdge} strokeWidth={Math.max(1, 1.25 * scale)} strokeLinejoin="round" opacity="0.72" vectorEffect="non-scaling-stroke" /><path d={shineD} fill="none" stroke={circle.boxHighlight} strokeWidth={Math.max(1, 1.6 * scale)} strokeLinecap="round" opacity="0.8" vectorEffect="non-scaling-stroke" /></g>;
  });
  return <g pointerEvents="none">{boxes}</g>;
}

function hexPath(cx, cy, radius) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (-90 + index * 60) * Math.PI / 180;
    return `${index === 0 ? "M" : "L"} ${cx + Math.cos(angle) * radius} ${cy + Math.sin(angle) * radius}`;
  }).join(" ") + " Z";
}

function GemIcon({ x, y, size, stats }) {
  const w = size;
  const h = size * 1.05;
  const topY = y - h / 2;
  const d = [[x - w * 0.32, topY + h * 0.12], [x + w * 0.32, topY + h * 0.12], [x + w * 0.52, topY + h * 0.42], [x, topY + h], [x - w * 0.52, topY + h * 0.42]].map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ") + " Z";
  const facet = `M ${x - w * 0.32} ${topY + h * 0.12} L ${x - w * 0.14} ${topY + h * 0.42} L ${x} ${topY + h} L ${x + w * 0.14} ${topY + h * 0.42} L ${x + w * 0.32} ${topY + h * 0.12} M ${x - w * 0.52} ${topY + h * 0.42} H ${x + w * 0.52} M ${x} ${topY + h * 0.12} L ${x - w * 0.14} ${topY + h * 0.42} M ${x} ${topY + h * 0.12} L ${x + w * 0.14} ${topY + h * 0.42}`;
  return <g pointerEvents="none"><defs><linearGradient id="right-stat-gem" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={stats.iconTop} /><stop offset="45%" stopColor={stats.iconMid} /><stop offset="100%" stopColor={stats.iconBottom} /></linearGradient><filter id="right-stat-gem-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation={stats.iconGlowBlur} /></filter></defs><path d={d} fill={stats.iconGlow} opacity={stats.iconGlowOpacity} filter="url(#right-stat-gem-glow)" /><path d={d} fill="url(#right-stat-gem)" stroke={stats.iconStroke} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /><path d={facet} fill="none" stroke="#ffffff" strokeWidth="1.1" opacity="0.55" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /><circle cx={x + w * 0.18} cy={topY + h * 0.24} r={w * 0.06} fill="#ffffff" opacity="0.85" /></g>;
}

function RightStats({ stats }) {
  if (!stats.enabled) return null;
  const valueY = stats.y + stats.gap;
  const iconX = stats.x + stats.boxWidth / 2 + stats.iconGap + stats.iconSize / 2;
  const iconY = stats.y + stats.gap * 0.25;
  return <g pointerEvents="none"><defs><filter id="right-stat-text-shadow" x="-25%" y="-45%" width="150%" height="190%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor={stats.textShadow} floodOpacity="0.95" /></filter></defs><text x={stats.x} y={stats.y} textAnchor="middle" fontSize={stats.nameSize} fontWeight="800" fill={stats.textColor} stroke={stats.textShadow} strokeWidth="2.2" paintOrder="stroke fill" filter="url(#right-stat-text-shadow)" textLength={stats.boxWidth} lengthAdjust="spacingAndGlyphs">{stats.name}</text><text x={stats.x} y={valueY} textAnchor="middle" fontSize={stats.valueSize} fontWeight="900" fill={stats.valueColor} stroke={stats.valueStroke} strokeWidth="2" paintOrder="stroke fill" filter="url(#right-stat-text-shadow)" textLength={stats.boxWidth} lengthAdjust="spacingAndGlyphs">{stats.value}</text><GemIcon x={iconX} y={iconY} size={stats.iconSize} stats={stats} /></g>;
}

function SimpleHexCrown({ crown }) {
  if (!crown.enabled) return null;
  const x = crown.cx;
  const y = crown.cy;
  const w = crown.width;
  const h = crown.height;
  const baseY = y + h * 0.32;
  const left = x - w / 2;
  const right = x + w / 2;
  const goldLight = crown.goldLight ?? crown.fillTop ?? GOLD.top;
  const gold = crown.gold ?? crown.fillMid ?? GOLD.mid;
  const goldDark = crown.goldDark ?? crown.fillBottom ?? GOLD.bottom;
  const edge = crown.edge ?? GOLD.edge;
  const glow = crown.glow ?? GOLD.glow;
  const red = crown.red ?? crown.jewelRed ?? "#ffd23b";
  const green = crown.green ?? crown.jewelGreen ?? "#d99a18";
  const domePath = `M ${left + w * 0.16} ${baseY} Q ${x} ${y - h * 0.22} ${right - w * 0.16} ${baseY} Z`;
  const crownPath = `M ${left + w * 0.1} ${baseY} L ${left + w * 0.18} ${y + h * 0.02} Q ${left + w * 0.31} ${baseY - h * 0.02} ${left + w * 0.42} ${baseY - h * 0.06} L ${x} ${y - h * 0.38} L ${right - w * 0.42} ${baseY - h * 0.06} Q ${right - w * 0.31} ${baseY - h * 0.02} ${right - w * 0.18} ${y + h * 0.02} L ${right - w * 0.1} ${baseY} Z`;
  const basePath = `M ${left + w * 0.1} ${baseY} H ${right - w * 0.1} V ${baseY + h * 0.24} Q ${x} ${baseY + h * 0.34} ${left + w * 0.1} ${baseY + h * 0.24} Z`;
  return <g pointerEvents="none"><defs><linearGradient id="hex-crown-simple-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={goldLight} /><stop offset="52%" stopColor={gold} /><stop offset="100%" stopColor={goldDark} /></linearGradient><filter id="hex-crown-simple-glow" x="-50%" y="-60%" width="200%" height="220%"><feGaussianBlur stdDeviation={crown.glowBlur ?? 5} /></filter></defs><g opacity={crown.glowOpacity ?? 0.34} filter="url(#hex-crown-simple-glow)"><path d={domePath} fill={glow} /><path d={crownPath} fill={glow} /><path d={basePath} fill={glow} /></g><path d={domePath} fill="url(#hex-crown-simple-gold)" stroke={edge} strokeWidth="3" strokeLinejoin="round" opacity="0.95" vectorEffect="non-scaling-stroke" /><path d={crownPath} fill="url(#hex-crown-simple-gold)" stroke={edge} strokeWidth="3.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /><path d={basePath} fill="url(#hex-crown-simple-gold)" stroke={edge} strokeWidth="3.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /><path d={`M ${left + w * 0.18} ${baseY + h * 0.08} H ${right - w * 0.18}`} fill="none" stroke={goldLight} strokeWidth="1.6" strokeLinecap="round" opacity="0.55" vectorEffect="non-scaling-stroke" /><circle cx={left + w * 0.18} cy={y + h * 0.02} r={w * 0.05} fill={red} stroke={edge} strokeWidth="2" vectorEffect="non-scaling-stroke" /><circle cx={x} cy={y - h * 0.38} r={w * 0.06} fill={red} stroke={edge} strokeWidth="2" vectorEffect="non-scaling-stroke" /><circle cx={right - w * 0.18} cy={y + h * 0.02} r={w * 0.05} fill={red} stroke={edge} strokeWidth="2" vectorEffect="non-scaling-stroke" /><ellipse cx={x} cy={baseY + h * 0.11} rx={w * 0.08} ry={h * 0.12} fill={green} stroke={edge} strokeWidth="2" vectorEffect="non-scaling-stroke" /></g>;
}

function NameBoxClamp({ x, y, rotation, box }) {
  const w = box.clampWidth;
  const h = box.clampHeight;
  const outerHalf = w * 0.6;
  const innerHalf = w * 0.29;
  const d = `M ${-outerHalf} ${-h / 2} L ${outerHalf} ${-h / 2} L ${innerHalf} ${h / 2} L ${-innerHalf} ${h / 2} Z`;
  return <g transform={`translate(${x} ${y}) rotate(${rotation})`}>
    <path d={d} fill={box.glowColor} opacity="0.3" filter="url(#winner-name-glow)" />
    <path d={d} fill="url(#winner-name-ring)" stroke={box.ringShadowColor} strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    <path d={d} fill="none" stroke={box.highlightColor} strokeWidth="1.2" opacity="0.55" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
  </g>;
}

function WinnerNameBox({ box }) {
  if (!box.enabled) return null;
  const x = box.x - box.width / 2;
  const y = box.y - box.height / 2;
  const inset = box.edgeWidth * 1.45;
  const clamps = [
    [x + box.clampInset, y + box.clampInset, -45],
    [x + box.width - box.clampInset, y + box.clampInset, 45],
    [x + box.clampInset, y + box.height - box.clampInset, -135],
    [x + box.width - box.clampInset, y + box.height - box.clampInset, 135],
  ];
  return <g pointerEvents="none"><defs><linearGradient id="winner-name-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={box.fillTop} /><stop offset="58%" stopColor={box.fillMid} /><stop offset="100%" stopColor={box.fillBottom} /></linearGradient><linearGradient id="winner-name-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={box.ringGoldBright} /><stop offset="18%" stopColor={box.ringGoldMid} /><stop offset="36%" stopColor={box.ringGoldDark} /><stop offset="58%" stopColor={box.ringGoldBright} /><stop offset="82%" stopColor={box.ringGoldMid} /><stop offset="100%" stopColor={box.ringGoldDark} /></linearGradient><filter id="winner-name-glow" x="-25%" y="-60%" width="150%" height="220%"><feGaussianBlur stdDeviation={box.glowBlur} /></filter><filter id="winner-name-edge" x="-25%" y="-60%" width="150%" height="220%"><feGaussianBlur stdDeviation={box.edgeBlur} /></filter><filter id="winner-text-shadow" x="-20%" y="-60%" width="140%" height="220%"><feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.95" /></filter></defs><rect x={x} y={y} width={box.width} height={box.height} rx={box.radius} fill="none" stroke={box.glowColor} strokeWidth={box.edgeWidth + 8} opacity={box.glowOpacity} filter="url(#winner-name-glow)" /><rect x={x} y={y} width={box.width} height={box.height} rx={box.radius} fill="none" stroke={box.ringShadowColor} strokeWidth={box.edgeWidth + 6} opacity="0.58" filter="url(#winner-name-edge)" /><rect x={x} y={y} width={box.width} height={box.height} rx={box.radius} fill="url(#winner-name-fill)" stroke="url(#winner-name-ring)" strokeWidth={box.edgeWidth} opacity={box.edgeOpacity} vectorEffect="non-scaling-stroke" /><rect x={x + inset} y={y + inset} width={box.width - inset * 2} height={box.height - inset * 2} rx={Math.max(4, box.radius - inset)} fill="none" stroke={box.highlightColor} strokeWidth="1.4" opacity="0.58" vectorEffect="non-scaling-stroke" /><path d={`M ${x + box.radius} ${y + box.edgeWidth * 1.4} H ${x + box.width - box.radius}`} fill="none" stroke={box.highlightColor} strokeWidth="2" strokeLinecap="round" opacity="0.65" vectorEffect="non-scaling-stroke" /><text x={box.x} y={box.y + box.fontSize * 0.34} textAnchor="middle" fontSize={box.fontSize} fontWeight="900" fill={box.textColor} stroke={box.textStroke} strokeWidth={box.textStrokeWidth} paintOrder="stroke fill" filter="url(#winner-text-shadow)">{box.text}</text>{clamps.map(([cx, cy, rot], i) => <NameBoxClamp key={`winner-clamp-${i}`} x={cx} y={cy} rotation={rot} box={box} />)}</g>;
}

function HexBadge({ badge }) {
  if (!badge.enabled) return null;
  const outerPath = hexPath(badge.cx, badge.cy, badge.radius);
  const innerPath = hexPath(badge.cx, badge.cy, badge.radius - badge.edgeWidth * 1.65);
  const makeWingFeathers = (side) => {
    const dir = side === "left" ? -1 : 1;
    const baseX = badge.cx + dir * badge.wingInset;
    const rows = [
      { rootTop: -0.46, rootBottom: -0.26, tipX: 1, tipY: -0.58, bellyY: -0.34 },
      { rootTop: -0.22, rootBottom: 0, tipX: 0.9, tipY: -0.34, bellyY: -0.12 },
      { rootTop: 0.02, rootBottom: 0.24, tipX: 0.78, tipY: -0.1, bellyY: 0.12 },
      { rootTop: 0.25, rootBottom: 0.45, tipX: 0.62, tipY: 0.1, bellyY: 0.3 },
    ];
    return rows.map((row, index) => {
      const rootTop = { x: baseX, y: badge.cy + badge.wingHeight * row.rootTop };
      const rootBottom = { x: baseX + dir * badge.wingLength * 0.12, y: badge.cy + badge.wingHeight * row.rootBottom };
      const tip = { x: baseX + dir * badge.wingLength * row.tipX, y: badge.cy + badge.wingHeight * row.tipY };
      const notch = { x: tip.x - dir * badge.wingGap, y: tip.y + badge.wingHeight * 0.16 };
      const d = `M ${rootTop.x} ${rootTop.y} C ${baseX + dir * badge.wingLength * 0.34} ${rootTop.y - badge.wingHeight * 0.18}, ${tip.x - dir * badge.wingLength * 0.28} ${tip.y - badge.wingHeight * 0.08}, ${tip.x} ${tip.y} L ${notch.x} ${notch.y} C ${tip.x - dir * badge.wingLength * 0.28} ${badge.cy + badge.wingHeight * row.bellyY}, ${baseX + dir * badge.wingLength * 0.3} ${rootBottom.y + badge.wingHeight * 0.08}, ${rootBottom.x} ${rootBottom.y} Z`;
      const shine = `M ${baseX + dir * badge.wingLength * 0.14} ${rootTop.y + badge.wingHeight * 0.04} C ${baseX + dir * badge.wingLength * 0.42} ${rootTop.y - badge.wingHeight * 0.12}, ${tip.x - dir * badge.wingLength * 0.34} ${tip.y + badge.wingHeight * 0.04}, ${tip.x - dir * badge.wingLength * 0.13} ${tip.y + badge.wingHeight * 0.08}`;
      return { id: `${side}-feather-${index}`, d, shine };
    });
  };
  const feathers = [...makeWingFeathers("left"), ...makeWingFeathers("right")];
  return <><defs><linearGradient id="side-hex-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={badge.ringGoldBright} /><stop offset="18%" stopColor={badge.ringGoldMid} /><stop offset="36%" stopColor={badge.ringGoldDark} /><stop offset="58%" stopColor={badge.ringGoldBright} /><stop offset="82%" stopColor={badge.ringGoldMid} /><stop offset="100%" stopColor={badge.ringGoldDark} /></linearGradient><filter id="side-hex-glow" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation={badge.glowBlur} /></filter><filter id="side-hex-edge" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation={badge.edgeBlur} /></filter></defs>{badge.wingEnabled && <g pointerEvents="none">{feathers.map((f) => <path key={`glow-${f.id}`} d={f.d} fill="none" stroke={badge.glowColor} strokeWidth={badge.wingStrokeWidth + 5} strokeLinejoin="round" opacity={badge.wingGlowOpacity} filter="url(#side-hex-glow)" />)}{feathers.map((f) => <path key={f.id} d={f.d} fill="url(#side-hex-ring)" stroke={badge.ringShadowColor} strokeWidth={badge.wingStrokeWidth} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />)}{feathers.map((f) => <path key={`shine-${f.id}`} d={f.shine} fill="none" stroke={badge.highlightColor} strokeWidth={badge.highlightWidth * 0.75} strokeLinecap="round" opacity="0.64" vectorEffect="non-scaling-stroke" />)}</g>}<path d={outerPath} fill="none" stroke={badge.glowColor} strokeWidth={badge.glowWidth} opacity={badge.glowOpacity} filter="url(#side-hex-glow)" pointerEvents="none" /><path d={outerPath} fill="none" stroke={badge.ringShadowColor} strokeWidth={badge.edgeWidth + 5} opacity="0.58" filter="url(#side-hex-edge)" pointerEvents="none" /><path d={outerPath} fill="none" stroke="url(#side-hex-ring)" strokeWidth={badge.edgeWidth} strokeLinejoin="round" opacity={badge.edgeOpacity} vectorEffect="non-scaling-stroke" /><path d={innerPath} fill="none" stroke={badge.highlightColor} strokeWidth={badge.highlightWidth} strokeLinejoin="round" opacity={badge.innerEdgeOpacity} vectorEffect="non-scaling-stroke" /><text x={badge.cx} y={badge.cy + badge.fontSize * 0.34} textAnchor="middle" fontSize={badge.fontSize} fontWeight="900" fill={badge.textColor} stroke={badge.textStroke} strokeWidth={badge.textStrokeWidth} paintOrder="stroke fill">{badge.label}</text></>;
}

function CenterCircle({ circle }) {
  if (!circle.enabled) return null;
  const imageRadius = circle.radius - circle.ringInset - circle.innerRingWidth;
  const imageSize = imageRadius * 2 * circle.imageScale;
  const imageX = circle.cx - imageSize / 2;
  const imageY = circle.cy - imageSize / 2 + circle.imageYOffset;
  const profileImageUrl = circle.profileImageUrl || undefined;
  return <><defs><clipPath id="center-circle-image-clip"><circle cx={circle.cx} cy={circle.cy} r={imageRadius} /></clipPath><radialGradient id="center-circle-fill" cx="50%" cy="42%" r="66%"><stop offset="0%" stopColor={circle.fillTopColor} /><stop offset="58%" stopColor={circle.fillMidColor} /><stop offset="100%" stopColor={circle.fillBottomColor} /></radialGradient><linearGradient id="center-circle-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={circle.ringGoldBright} /><stop offset="18%" stopColor={circle.ringGoldMid} /><stop offset="36%" stopColor={circle.ringGoldDark} /><stop offset="58%" stopColor={circle.ringGoldBright} /><stop offset="82%" stopColor={circle.ringGoldMid} /><stop offset="100%" stopColor={circle.ringGoldDark} /></linearGradient><linearGradient id="center-circle-highlight" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" /><stop offset="60%" stopColor={circle.bevelColor} stopOpacity="0.35" /><stop offset="100%" stopColor="#ffffff" stopOpacity="0" /></linearGradient><filter id="center-circle-glow" x="-45%" y="-45%" width="190%" height="190%"><feGaussianBlur stdDeviation={circle.glowBlur} /></filter><filter id="center-circle-edge" x="-45%" y="-45%" width="190%" height="190%"><feGaussianBlur stdDeviation={circle.edgeBlur} /></filter><filter id="center-circle-box-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation={circle.boxGlowBlur} /></filter><linearGradient id="center-box-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={circle.boxFillTop} /><stop offset="28%" stopColor={circle.boxFillMid} /><stop offset="48%" stopColor={circle.boxFillMid} /><stop offset="68%" stopColor={circle.boxFillTop} /><stop offset="100%" stopColor={circle.boxFillBottom} /></linearGradient></defs>{circle.glowOpacity > 0 && <circle cx={circle.cx} cy={circle.cy} r={circle.radius} fill="none" stroke={circle.glowColor} strokeWidth={circle.glowWidth} opacity={circle.glowOpacity} filter="url(#center-circle-glow)" pointerEvents="none" />}<circle cx={circle.cx} cy={circle.cy} r={circle.radius} fill="none" stroke={circle.ringShadowColor} strokeWidth={circle.edgeWidth + 3} opacity="0.58" filter="url(#center-circle-edge)" pointerEvents="none" /><circle cx={circle.cx} cy={circle.cy} r={circle.radius} fill="none" stroke="url(#center-circle-ring)" strokeWidth={circle.edgeWidth} opacity={circle.edgeOpacity} vectorEffect="non-scaling-stroke" /><circle cx={circle.cx} cy={circle.cy} r={circle.radius - circle.edgeWidth * 0.5} fill="none" stroke={circle.ringGoldBright} strokeWidth="1" opacity="0.62" vectorEffect="non-scaling-stroke" /><circle cx={circle.cx} cy={circle.cy} r={circle.radius + circle.edgeWidth * 0.5} fill="none" stroke={circle.ringGoldDark} strokeWidth="1" opacity="0.7" vectorEffect="non-scaling-stroke" /><circle cx={circle.cx} cy={circle.cy} r={imageRadius} fill="url(#center-circle-fill)" opacity={circle.fillOpacity} />{profileImageUrl && <image href={profileImageUrl} xlinkHref={profileImageUrl} crossOrigin="anonymous" x={imageX} y={imageY} width={imageSize} height={imageSize} preserveAspectRatio="xMidYMid slice" opacity={circle.imageOpacity} clipPath="url(#center-circle-image-clip)" />}<circle cx={circle.cx} cy={circle.cy} r={imageRadius} fill="none" stroke={circle.innerShadowColor} strokeWidth={circle.innerShadowWidth} opacity={circle.innerShadowOpacity} vectorEffect="non-scaling-stroke" /><circle cx={circle.cx} cy={circle.cy} r={imageRadius + circle.innerRingWidth} fill="none" stroke="url(#center-circle-ring)" strokeWidth={circle.innerRingWidth} opacity="0.92" vectorEffect="non-scaling-stroke" /><path d={`M ${circle.cx - circle.radius * 0.62} ${circle.cy - circle.radius * 0.36} C ${circle.cx - circle.radius * 0.28} ${circle.cy - circle.radius * 0.72}, ${circle.cx + circle.radius * 0.32} ${circle.cy - circle.radius * 0.68}, ${circle.cx + circle.radius * 0.62} ${circle.cy - circle.radius * 0.28}`} fill="none" stroke="url(#center-circle-highlight)" strokeWidth={circle.highlightArcWidth} strokeLinecap="round" opacity={circle.bevelOpacity} vectorEffect="non-scaling-stroke" /><circle cx={circle.cx - circle.bevelWidth * 0.75} cy={circle.cy - circle.bevelWidth * 0.75} r={circle.radius - circle.bevelWidth} fill="none" stroke={circle.bevelColor} strokeWidth={circle.bevelWidth} opacity={circle.bevelOpacity * 0.36} vectorEffect="non-scaling-stroke" /><CircleRingBoxes circle={circle} /></>;
}

async function copyTextSafely(text: string) {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore clipboard failures here
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function DrawFrame({ frame, segments, showNumbers }: { frame: typeof OUTER_FRAME_DEFAULT; segments: Segment[]; showNumbers: boolean }) {
  return <>
    {segments.map((segment) => <path key={segment.id} d={segment.d} fill="none" stroke={frame.color} strokeWidth={thicknessForSegment(frame, segment)} strokeLinejoin="round" strokeLinecap={frame.lineCap} vectorEffect="non-scaling-stroke" />)}
    {showNumbers && segments.map((segment, index) => {
      const x = (segment.a.x + segment.b.x) / 2;
      const y = (segment.a.y + segment.b.y) / 2;
      return <g key={`num-${segment.id}`} pointerEvents="none"><circle cx={x} cy={y} r="13" fill="black" stroke="white" strokeWidth="1.5" opacity="0.9" /><text x={x} y={y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="white">{index + 1}</text></g>;
    })}
  </>;
}

function SvgDefs({ outerFrame, innerFrame }: { outerFrame: typeof OUTER_FRAME_DEFAULT; innerFrame: typeof OUTER_FRAME_DEFAULT }) {
  return <defs>
    <filter id="outer-frame-glow" x="-12%" y="-12%" width="124%" height="124%"><feGaussianBlur stdDeviation={outerFrame.glowBlur ?? 0} /></filter>
    <filter id="outer-frame-glow-edge" x="-12%" y="-12%" width="124%" height="124%"><feGaussianBlur stdDeviation={outerFrame.edgeBlur ?? 0} /></filter>
    <filter id="inner-frame-glow" x="-12%" y="-12%" width="124%" height="124%"><feGaussianBlur stdDeviation={innerFrame.glowBlur ?? 0} /></filter>
    <filter id="inner-frame-glow-edge" x="-12%" y="-12%" width="124%" height="124%"><feGaussianBlur stdDeviation={innerFrame.edgeBlur ?? 0} /></filter>
  </defs>;
}

function Guides({ viewBox, guides }: { viewBox: typeof DEFAULT_CFG.viewBox; guides: typeof DEFAULT_CFG.viewportGuide }) {
  if (!guides.enabled) return null;
  return <rect x={guides.inset} y={guides.inset} width={viewBox.w - guides.inset * 2} height={viewBox.h - guides.inset * 2} fill="none" stroke={guides.color} strokeWidth={guides.width} opacity={guides.opacity} />;
}

function FrameFill({ frame, gradientId }: { frame: typeof OUTER_FRAME_DEFAULT; gradientId: string }) {
  if (!frame.fillOpacity || frame.fillOpacity <= 0) return null;
  return <>
    <defs>
      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={frame.fillTopColor} />
        <stop offset="45%" stopColor={frame.fillMidColor} />
        <stop offset="100%" stopColor={frame.fillBottomColor} />
      </linearGradient>
    </defs>
    <path d={framePath(frame)} fill={`url(#${gradientId})`} opacity={frame.fillOpacity} pointerEvents="none" />
  </>;
}

function FrameLayer({ frame, segments, filterId }: { frame: typeof OUTER_FRAME_DEFAULT; segments: Segment[]; filterId: string }) {
  const overlayId = `${filterId}-gradient`;
  const pathFor = (segment: Segment, props: Record<string, unknown>, prefix: string) => <path key={`${prefix}-${segment.id}`} d={segment.d} fill="none" strokeLinejoin="round" strokeLinecap={frame.lineCap} strokeWidth={thicknessForSegment(frame, segment)} {...props} />;
  return <>
    <defs>
      <linearGradient id={overlayId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={frame.overlayTopColor} />
        <stop offset="45%" stopColor={frame.overlayMidColor} />
        <stop offset="100%" stopColor={frame.overlayBottomColor} />
      </linearGradient>
    </defs>
    {(frame.glowOpacity ?? 0) > 0 && (frame.glowWidth ?? 0) > 0 && <g opacity={frame.glowOpacity} filter={`url(#${filterId})`} pointerEvents="none">
      {segments.map((segment) => pathFor(segment, { stroke: frame.glowColor, strokeWidth: thicknessForSegment(frame, segment) + (frame.glowWidth ?? 0) }, "glow"))}
    </g>}
    {(frame.edgeOpacity ?? 0) > 0 && (frame.edgeWidth ?? 0) > 0 && <g opacity={frame.edgeOpacity} filter={`url(#${filterId}-edge)`} pointerEvents="none">
      {segments.map((segment) => pathFor(segment, { stroke: frame.edgeColor, strokeWidth: thicknessForSegment(frame, segment) + (frame.edgeWidth ?? 0) }, "edge"))}
    </g>}
    <g opacity={frame.opacity ?? 1}>
      {segments.map((segment) => pathFor(segment, { stroke: frame.color }, "frame"))}
      {(frame.overlayGradientOpacity ?? 0) > 0 && segments.map((segment) => pathFor(segment, { stroke: `url(#${overlayId})`, opacity: frame.overlayGradientOpacity, style: { mixBlendMode: frame.overlayBlend } }, "overlay"))}
    </g>
  </>;
}

function Controls({ cfg, setCfg }: { cfg: typeof DEFAULT_CFG; setCfg: React.Dispatch<React.SetStateAction<typeof DEFAULT_CFG>> }) {
  const [mainTab, setMainTab] = useState("outer");
  const [tab, setTab] = useState("anchor");

  const frameKey = mainTab === "inner" ? "innerFrame" : "outerFrame";
  const anchorKey = mainTab === "inner" ? "innerAnchor" : "outerAnchor";
  const activeAnchor = cfg[anchorKey];
  const defaultFrame = DEFAULT_CFG[frameKey];
  const defaultAnchor = DEFAULT_CFG[anchorKey];
  const liveFrame = getAnchoredFrame(cfg, frameKey, anchorKey);
  const liveSegments = [...frameSegments(liveFrame), ...copyRiseSegments(liveFrame)];

  const updateAnchor = (key: string, value: unknown) => setCfg((old) => ({ ...old, [anchorKey]: { ...old[anchorKey], [key]: Number(value) } }));
  const updateViewportGuide = (key: string, value: unknown) => setCfg((old) => ({ ...old, viewportGuide: { ...old.viewportGuide, [key]: key === "enabled" || key === "showCenterLines" || key === "showSegmentNumbers" || key === "gangedSlices" ? Boolean(value) : key === "color" || key === "centerLineColor" ? value : Number(value) } }));
  const updateArt = (group: string, key: string, value: unknown) => setCfg((old) => ({ ...old, [group]: { ...old[group], [key]: typeof value === "string" && key !== "text" && key !== "name" && key !== "value" && key !== "profileImageUrl" ? Number(value) : value } }));

  const updateSegmentThickness = (segment: Segment, value: unknown) => setCfg((old) => ({ ...old, [frameKey]: { ...old[frameKey], segmentThicknesses: { ...(old[frameKey].segmentThicknesses ?? {}), [segment.id]: Number(value) } } }));

  const copyValues = async () => {
    await copyTextSafely(JSON.stringify(cfg, null, 2));
  };

  const ResetButton = ({ onClick }: { onClick: () => void }) => <button type="button" className="reset-button" onClick={onClick}>↺</button>;
  const sliderRow = (label: string, value: number, onChange: (value: unknown) => void, onReset: () => void, max = 500, min = 0, step = 1) => <label className="grid grid-cols-[170px_1fr_64px_28px] items-center gap-2 text-xs text-amber-100"><span>{label}</span><input className="w-full" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(e.target.value)} /><input className="w-16 rounded bg-black/60 px-1 py-0.5 text-right text-amber-100 outline outline-1 outline-amber-400/20" type="number" value={value} onChange={(e) => onChange(e.target.value)} /><ResetButton onClick={onReset} /></label>;
  const anchorSlider = (key: string, max = 300, min = 0, step = 1) => sliderRow(key, activeAnchor[key as keyof typeof activeAnchor] as number, (v) => updateAnchor(key, v), () => updateAnchor(key, defaultAnchor[key as keyof typeof defaultAnchor]), max, min, step);
  const viewportSlider = (key: keyof typeof DEFAULT_CFG.viewportGuide, max = 20, min = 0, step = 1) => sliderRow(key, cfg.viewportGuide[key] as number, (v) => updateViewportGuide(key, v), () => updateViewportGuide(key, DEFAULT_CFG.viewportGuide[key]), max, min, step);

  return <div className="mt-1 rounded-2xl border border-amber-400/20 bg-black/50 p-3 backdrop-blur">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="text-sm font-semibold text-amber-200">Golden Frame Prototype</div>
      <button className="rounded-lg bg-amber-400 px-3 py-1 text-xs font-semibold text-black" onClick={copyValues} type="button">Copy</button>
    </div>
    <div className="mb-3 flex flex-wrap gap-2">
      {["outer", "inner", "art", "viewportOnly"].map((id) => <button key={id} className={`rounded-lg px-3 py-1 text-xs ${mainTab === id ? "bg-amber-400 text-black" : "bg-white/5 text-amber-100"}`} onClick={() => setMainTab(id)} type="button">{id}</button>)}
    </div>
    {mainTab !== "viewportOnly" && <div className="mb-3 flex flex-wrap gap-2">
      {["segments", "anchor", "top", "bottom", "corners", "line", "slices"].map((id) => <button key={id} className={`rounded-lg px-3 py-1 text-xs ${tab === id ? "bg-amber-400 text-black" : "bg-white/5 text-amber-100"}`} onClick={() => setTab(id)} type="button">{id}</button>)}
    </div>}
    <div className="grid gap-2 md:grid-cols-2">
      {mainTab !== "viewportOnly" && tab === "segments" && liveSegments.map((segment, index) => sliderRow(`${index + 1}. ${segment.id}`, thicknessForSegment(liveFrame, segment), (v) => updateSegmentThickness(segment, v), () => setCfg((old) => ({ ...old, [frameKey]: { ...old[frameKey], segmentThicknesses: { ...defaultFrame.segmentThicknesses } } })), 120))}
      {mainTab !== "viewportOnly" && tab === "anchor" && <>{anchorSlider("sideInset", 400)}{anchorSlider("topInset", 300)}{anchorSlider("bottomInset", 300)}<div className="col-span-full rounded-xl border border-amber-400/20 bg-black/40 p-2 text-xs text-amber-100">Live: x {liveFrame.x}, y {liveFrame.y}, w {liveFrame.w}, h {liveFrame.h}</div></>}
      {mainTab === "art" && <>
        <div className="col-span-full text-xs font-semibold text-amber-200">Center Circle</div>
        {sliderRow("centerCircle.cx", cfg.centerCircle.cx, (v) => updateArt("centerCircle", "cx", v), () => updateArt("centerCircle", "cx", DEFAULT_CFG.centerCircle.cx), 1400, 0)}
        {sliderRow("centerCircle.cy", cfg.centerCircle.cy, (v) => updateArt("centerCircle", "cy", v), () => updateArt("centerCircle", "cy", DEFAULT_CFG.centerCircle.cy), 1000, -500)}
        {sliderRow("centerCircle.radius", cfg.centerCircle.radius, (v) => updateArt("centerCircle", "radius", v), () => updateArt("centerCircle", "radius", DEFAULT_CFG.centerCircle.radius), 400, 40)}
        <label className="col-span-full grid grid-cols-[170px_1fr] items-center gap-2 text-xs text-amber-100"><span>centerCircle.profileImageUrl</span><input className="rounded bg-black/60 px-2 py-1 text-amber-100 outline outline-1 outline-amber-400/20" value={cfg.centerCircle.profileImageUrl} onChange={(e) => updateArt("centerCircle", "profileImageUrl", e.target.value)} /></label>
        {sliderRow("centerCircle.imageScale", cfg.centerCircle.imageScale, (v) => updateArt("centerCircle", "imageScale", v), () => updateArt("centerCircle", "imageScale", DEFAULT_CFG.centerCircle.imageScale), 3, 0.2, 0.01)}
        {sliderRow("centerCircle.imageYOffset", cfg.centerCircle.imageYOffset, (v) => updateArt("centerCircle", "imageYOffset", v), () => updateArt("centerCircle", "imageYOffset", DEFAULT_CFG.centerCircle.imageYOffset), 100, -100)}
        <div className="col-span-full text-xs font-semibold text-amber-200">Crown / Badge / Name / Stats</div>
        {sliderRow("centerCrown.cy", cfg.centerCrown.cy, (v) => updateArt("centerCrown", "cy", v), () => updateArt("centerCrown", "cy", DEFAULT_CFG.centerCrown.cy), 200, -220)}
        {sliderRow("sideHexBadge.cx", cfg.sideHexBadge.cx, (v) => updateArt("sideHexBadge", "cx", v), () => updateArt("sideHexBadge", "cx", DEFAULT_CFG.sideHexBadge.cx), 800, 0)}
        {sliderRow("sideHexBadge.cy", cfg.sideHexBadge.cy, (v) => updateArt("sideHexBadge", "cy", v), () => updateArt("sideHexBadge", "cy", DEFAULT_CFG.sideHexBadge.cy), 1000, -500)}
        {sliderRow("sideHexBadge.radius", cfg.sideHexBadge.radius, (v) => updateArt("sideHexBadge", "radius", v), () => updateArt("sideHexBadge", "radius", DEFAULT_CFG.sideHexBadge.radius), 220, 30)}
        <label className="col-span-full grid grid-cols-[170px_1fr] items-center gap-2 text-xs text-amber-100"><span>sideHexBadge.label</span><input className="rounded bg-black/60 px-2 py-1 text-amber-100 outline outline-1 outline-amber-400/20" value={cfg.sideHexBadge.label} onChange={(e) => updateArt("sideHexBadge", "label", e.target.value)} /></label>
        {sliderRow("winnerName.x", cfg.winnerName.x, (v) => updateArt("winnerName", "x", v), () => updateArt("winnerName", "x", DEFAULT_CFG.winnerName.x), 1400, 0)}
        {sliderRow("winnerName.y", cfg.winnerName.y, (v) => updateArt("winnerName", "y", v), () => updateArt("winnerName", "y", DEFAULT_CFG.winnerName.y), 1000, -500)}
        <label className="col-span-full grid grid-cols-[170px_1fr] items-center gap-2 text-xs text-amber-100"><span>winnerName.text</span><input className="rounded bg-black/60 px-2 py-1 text-amber-100 outline outline-1 outline-amber-400/20" value={cfg.winnerName.text} onChange={(e) => updateArt("winnerName", "text", e.target.value)} /></label>
        {sliderRow("rightStats.x", cfg.rightStats.x, (v) => updateArt("rightStats", "x", v), () => updateArt("rightStats", "x", DEFAULT_CFG.rightStats.x), 1400, 0)}
        {sliderRow("rightStats.y", cfg.rightStats.y, (v) => updateArt("rightStats", "y", v), () => updateArt("rightStats", "y", DEFAULT_CFG.rightStats.y), 1000, -500)}
        <label className="col-span-full grid grid-cols-[170px_1fr] items-center gap-2 text-xs text-amber-100"><span>rightStats.name</span><input className="rounded bg-black/60 px-2 py-1 text-amber-100 outline outline-1 outline-amber-400/20" value={cfg.rightStats.name} onChange={(e) => updateArt("rightStats", "name", e.target.value)} /></label>
        <label className="col-span-full grid grid-cols-[170px_1fr] items-center gap-2 text-xs text-amber-100"><span>rightStats.value</span><input className="rounded bg-black/60 px-2 py-1 text-amber-100 outline outline-1 outline-amber-400/20" value={cfg.rightStats.value} onChange={(e) => updateArt("rightStats", "value", e.target.value)} /></label>
      </>}
      {mainTab === "viewportOnly" && <>{viewportSlider("inset", 40)}{viewportSlider("width", 10)}{viewportSlider("opacity", 1, 0, 0.01)}</>}
    </div>
  </div>;
}

export function GoldenFrameForeignObjectArtSvg({
  cfg: providedCfg,
  className = "leaderboard-svg",
  backgroundFill = "#020713",
}: {
  cfg?: typeof DEFAULT_CFG;
  className?: string;
  backgroundFill?: string;
}) {
  const [sharedCfg] = useSharedForeignConfig();
  const cfg = providedCfg ?? sharedCfg;
  const outerLiveFrame = getAnchoredFrame(cfg, "outerFrame", "outerAnchor");
  const innerLiveFrame = getAnchoredFrame(cfg, "innerFrame", "innerAnchor");
  const outerSegments = [...frameSegments(outerLiveFrame), ...copyRiseSegments(outerLiveFrame)];
  const innerSegments = [...frameSegments(innerLiveFrame), ...copyRiseSegments(innerLiveFrame)];

  return <svg className={className} viewBox={`0 ${cfg.viewBox.y ?? 0} ${cfg.viewBox.w} ${cfg.viewBox.h}`} role="img">
      {backgroundFill !== "none" && <rect x="0" y={cfg.viewBox.y ?? 0} width={cfg.viewBox.w} height={cfg.viewBox.h} fill={backgroundFill} />}
      <SvgDefs outerFrame={outerLiveFrame} innerFrame={innerLiveFrame} />
      <Guides viewBox={cfg.viewBox} guides={cfg.viewportGuide} />
      <FrameFill frame={outerLiveFrame} gradientId="outer-frame-fill-gradient" />
      <FrameLayer frame={outerLiveFrame} segments={outerSegments} filterId="outer-frame-glow" showNumbers={cfg.viewportGuide.showSegmentNumbers} />
      <FrameLayer frame={innerLiveFrame} segments={innerSegments} filterId="inner-frame-glow" showNumbers={false} />
      <CenterCircle circle={cfg.centerCircle} />
      <WinnerNameBox box={cfg.winnerName} />
      <SimpleHexCrown crown={cfg.centerCrown} />
      <SimpleHexCrown crown={cfg.hexCrown} />
      <HexBadge badge={cfg.sideHexBadge} />
      <RightStats stats={cfg.rightStats} />
      <text x="768" y="790" textAnchor="middle" fontSize="34" fontWeight="800" fill="#ffffff" stroke="#090300" strokeWidth="1.8" paintOrder="stroke fill" pointerEvents="none">Match : 1000    Win : 89%</text>
    </svg>
}

function FinalArtStage({ cfg, fullBleed = false }) {
  return <div className="preview-stage" style={fullBleed ? { height: "100vh", margin: 0 } : { height: "58vh" }}>
    <GoldenFrameForeignObjectArtSvg cfg={cfg} />
  </div>;
}

export function GoldenFrameForeignObject() {
  const [cfg, setCfg] = useSharedForeignConfig();
  return <div className="leaderboard-page svg-route">
    <FinalArtStage cfg={cfg} />
    <div className="min-h-0 flex-1 overflow-y-auto pr-2">
      <Controls cfg={cfg} setCfg={setCfg} />
    </div>
  </div>;
}

export function GoldenFrameForeignObjectSvgRoute() {
  const [cfg] = useSharedForeignConfig();
  return <div className="leaderboard-page svg-route"><FinalArtStage cfg={cfg} fullBleed /></div>;
}

export function GoldenFrameForeignObjectControlsRoute() {
  const [cfg, setCfg] = useSharedForeignConfig();
  return <div className="leaderboard-page controls-route">
    <div className="min-h-0 flex-1 overflow-y-auto pr-2">
      <Controls cfg={cfg} setCfg={setCfg} />
    </div>
  </div>;
}
