import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, Dispatch, SetStateAction, SVGProps } from "react";
import { OcentraLeaderboardControls } from "./OcentraLeaderboardControls";
import {
  GoldenFrameForeignObjectControlsRoute,
  GoldenFrameForeignObjectSvgRoute,
} from "./GoldenFrameForeignObject";

interface Point {
  x: number;
  y: number;
}

interface Segment {
  id: string;
  kind: string;
  a: Point;
  b: Point;
  d: string;
}

export interface LeaderboardFrameItem {
  id: string;
  name: string;
  x: number;
  y: number;
  scale: number;
  width: number;
  innerWidth: number;
  height: number;
  innerHeight: number;
  innerGap: number;
  topBulgeWidth: number;
  topBulgeHeight: number;
  bottomBulgeWidth: number;
  bottomBulgeHeight: number;
  thickSegmentWidth: number;
  thinSegmentWidth: number;
  cornerCut: number;
  showInnerFrame: boolean;
}

export interface LeaderboardCarouselConfig {
  enabled: boolean;
  count: number;
  startX: number;
  y: number;
  gap: number;
  width: number;
  height: number;
  cornerCut: number;
  topBulgeWidth: number;
  bottomBulgeWidth: number;
  bulgeHeight: number;
  thickSegmentWidth: number;
  thinSegmentWidth: number;
  labelPrefix: string;
  arrowGap: number;
}

interface LeaderboardViewBox {
  w: number;
  h: number;
  y: number;
  designW: number;
  designH: number;
}

interface AnchorConfig {
  sideInset: number;
  topInset: number;
  bottomInset: number;
}

interface GuideConfig {
  enabled: boolean;
  inset: number;
  width: number;
  color: string;
  opacity: number;
}

type BottomTabDirection = "down" | "up";

interface FrameStyleConfig {
  sideInset: number;
  cornerCut: number;
  topRise: number;
  topStepWidth: number;
  topStepInset: number;
  bottomTabWidth: number;
  bottomTabDepth: number;
  bottomTabInset: number;
  bottomTabDirection: BottomTabDirection;
  enableBottomRiseCopy: boolean;
  lineCap: "round" | "butt" | "square";
  topLeftThickness: number;
  topCenterThickness: number;
  topRightThickness: number;
  bottomLeftThickness: number;
  bottomCenterThickness: number;
  bottomRightThickness: number;
  leftSideThickness: number;
  rightSideThickness: number;
  topLeftConnectorThickness: number;
  topRightConnectorThickness: number;
  bottomLeftConnectorThickness: number;
  bottomRightConnectorThickness: number;
  leftTopCornerThickness: number;
  rightTopCornerThickness: number;
  rightBottomCornerThickness: number;
  leftBottomCornerThickness: number;
  topLeftSliceTransitionThickness: number;
  topRightSliceTransitionThickness: number;
  bottomLeftSliceTransitionThickness: number;
  bottomRightSliceTransitionThickness: number;
  leftSideSliceTransitionThickness: number;
  rightSideSliceTransitionThickness: number;
  topLeftStartGap: number;
  topLeftEndGap: number;
  topRightStartGap: number;
  topRightEndGap: number;
  bottomLeftStartGap: number;
  bottomLeftEndGap: number;
  bottomRightStartGap: number;
  bottomRightEndGap: number;
  leftSideStartGap: number;
  leftSideEndGap: number;
  rightSideStartGap: number;
  rightSideEndGap: number;
  segmentThicknesses: Record<string, number>;
  color: string;
  edgeColor: string;
  edgeOpacity: number;
  edgeWidth: number;
  edgeBlur: number;
  glowColor: string;
  glowOpacity: number;
  glowWidth: number;
  glowBlur: number;
  opacity: number;
  strokeScale: number;
  overlayGradientOpacity: number;
  overlayBlend: CSSProperties["mixBlendMode"];
  overlayTopColor: string;
  overlayMidColor: string;
  overlayBottomColor: string;
  fillEnabled: boolean;
  fillOpacity: number;
  fillTopColor: string;
  fillMidColor: string;
  fillBottomColor: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  useOuterWidthControls?: boolean;
  thickSegmentWidth?: number;
  thinSegmentWidth?: number;
}

export interface LeaderboardConfig {
  viewBox: LeaderboardViewBox;
  outerAnchor: AnchorConfig;
  innerAnchor: AnchorConfig;
  outerFrame: FrameStyleConfig;
  innerFrame: FrameStyleConfig;
  frames: LeaderboardFrameItem[];
  carousel: LeaderboardCarouselConfig;
  guides: GuideConfig;
}

interface RouteLink {
  label: string;
  path: string;
  description: string;
}

const LEADERBOARD_CONFIG_STORAGE_KEY = "ocentra-leaderboard-config";
const LEADERBOARD_CONFIG_CHANNEL = "ocentra-leaderboard-config-channel";

const ROUTE_LINKS: RouteLink[] = [
  {
    label: "Global Leaderboard",
    path: "/leaderboard",
    description: "Command-center mock based on the global leaderboard reference.",
  },
  {
    label: "Game Leaderboard",
    path: "/game-leaderboard",
    description: "Per-game arena board for Three Card Brag ranked season.",
  },
  {
    label: "Leaderboard SVG",
    path: "/svg",
    description: "Main frame and carousel preview.",
  },
  {
    label: "Leaderboard Controls",
    path: "/controls",
    description: "Edit the frame and carousel layout.",
  },
  {
    label: "Foreign SVG",
    path: "/foreign",
    description: "Golden frame and foreign-object prototype.",
  },
  {
    label: "Foreign Controls",
    path: "/foreign-controls",
    description: "Edit the alternate prototype surface.",
  },
];

const BLUE = {
  line: "#20d9ff",
  edge: "#075d9b",
  glow: "#19cfff",
  top: "#e8fbff",
  mid: "#23d8ff",
  bottom: "#1466ff",
  fillTop: "#063254",
  fillMid: "#041428",
  fillBottom: "#01050e",
};

const THIN_SEGMENTS = new Set([
  "topLeftRunMid",
  "topRightRunMid",
  "rightSideRunMid",
  "bottomRightRunMid",
  "bottomLeftRunMid",
  "leftSideRunMid",
]);

const SEGMENT_WIDTHS: Record<string, number> = {};

const FRAME_BASE: FrameStyleConfig = {
  sideInset: 0,
  cornerCut: 75,
  topRise: 22,
  topStepWidth: 1500,
  topStepInset: 18,
  bottomTabWidth: 1500,
  bottomTabDepth: 22,
  bottomTabInset: 18,
  bottomTabDirection: "down",
  enableBottomRiseCopy: false,
  lineCap: "round",
  topLeftThickness: 5,
  topCenterThickness: 18,
  topRightThickness: 5,
  bottomLeftThickness: 5,
  bottomCenterThickness: 18,
  bottomRightThickness: 5,
  leftSideThickness: 5,
  rightSideThickness: 5,
  topLeftConnectorThickness: 18,
  topRightConnectorThickness: 18,
  bottomLeftConnectorThickness: 18,
  bottomRightConnectorThickness: 18,
  leftTopCornerThickness: 18,
  rightTopCornerThickness: 18,
  rightBottomCornerThickness: 18,
  leftBottomCornerThickness: 18,
  topLeftSliceTransitionThickness: 18,
  topRightSliceTransitionThickness: 18,
  bottomLeftSliceTransitionThickness: 18,
  bottomRightSliceTransitionThickness: 18,
  leftSideSliceTransitionThickness: 18,
  rightSideSliceTransitionThickness: 18,
  topLeftStartGap: 18,
  topLeftEndGap: 18,
  topRightStartGap: 18,
  topRightEndGap: 18,
  bottomLeftStartGap: 18,
  bottomLeftEndGap: 18,
  bottomRightStartGap: 18,
  bottomRightEndGap: 18,
  leftSideStartGap: 18,
  leftSideEndGap: 18,
  rightSideStartGap: 18,
  rightSideEndGap: 18,
  segmentThicknesses: SEGMENT_WIDTHS,
  color: BLUE.line,
  edgeColor: BLUE.edge,
  edgeOpacity: 0.65,
  edgeWidth: 2.5,
  edgeBlur: 2.5,
  glowColor: BLUE.glow,
  glowOpacity: 0.45,
  glowWidth: 3.5,
  glowBlur: 6,
  opacity: 1,
  strokeScale: 0.42,
  overlayGradientOpacity: 0.45,
  overlayBlend: "screen",
  overlayTopColor: BLUE.top,
  overlayMidColor: BLUE.mid,
  overlayBottomColor: BLUE.bottom,
  fillEnabled: true,
  fillOpacity: 0.25,
  fillTopColor: BLUE.fillTop,
  fillMidColor: BLUE.fillMid,
  fillBottomColor: BLUE.fillBottom,
};

const OUTER_FRAME: FrameStyleConfig = { ...FRAME_BASE };

const INNER_FRAME: FrameStyleConfig = {
  ...FRAME_BASE,
  topLeftThickness: 2,
  topRightThickness: 2,
  leftSideThickness: 2,
  rightSideThickness: 2,
  bottomLeftThickness: 2,
  bottomRightThickness: 2,
  topLeftStartGap: 12,
  topRightEndGap: 12,
  bottomLeftEndGap: 12,
  bottomRightStartGap: 12,
  leftSideStartGap: 12,
  leftSideEndGap: 12,
  rightSideStartGap: 12,
  rightSideEndGap: 12,
  bottomTabDirection: "down",
  enableBottomRiseCopy: false,
  opacity: 0.5,
  glowOpacity: 0.22,
  glowWidth: 2.5,
  edgeWidth: 2,
  glowBlur: 5,
  edgeBlur: 2,
  overlayGradientOpacity: 0.25,
  segmentThicknesses: {
    ...SEGMENT_WIDTHS,
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

export const DEFAULT_LEADERBOARD_CONFIG: LeaderboardConfig = {
  viewBox: { w: 1920, h: 1080, y: 0, designW: 1920, designH: 1080 },
  outerAnchor: { sideInset: 30, topInset: 30, bottomInset: 30 },
  innerAnchor: { sideInset: 42, topInset: 42, bottomInset: 42 },
  outerFrame: OUTER_FRAME,
  innerFrame: INNER_FRAME,
  frames: [
    {
      id: "main-center",
      name: "Main Center",
      x: -49,
      y: 20,
      scale: 1,
      width: 965,
      innerWidth: 953,
      height: 700,
      innerHeight: 688,
      innerGap: 6,
      topBulgeWidth: 605,
      topBulgeHeight: 22,
      bottomBulgeWidth: 605,
      bottomBulgeHeight: 22,
      thickSegmentWidth: 8,
      thinSegmentWidth: 3,
      cornerCut: 75,
      showInnerFrame: true,
    },
    {
      id: "main-center-copy",
      name: "left sidebar",
      x: -743,
      y: -60,
      scale: 1,
      width: 400,
      innerWidth: 390,
      height: 910,
      innerHeight: 900,
      innerGap: 5,
      topBulgeWidth: 40,
      topBulgeHeight: 0,
      bottomBulgeWidth: 40,
      bottomBulgeHeight: 0,
      thickSegmentWidth: 6,
      thinSegmentWidth: 3,
      cornerCut: 35,
      showInnerFrame: false,
    },
    {
      id: "main-center-copy-1779108113719",
      name: "right sidebar ",
      x: 698,
      y: 32,
      scale: 1,
      width: 500,
      innerWidth: 490,
      height: 714,
      innerHeight: 704,
      innerGap: 5,
      topBulgeWidth: 179,
      topBulgeHeight: 0,
      bottomBulgeWidth: 140,
      bottomBulgeHeight: 0,
      thickSegmentWidth: 8,
      thinSegmentWidth: 3,
      cornerCut: 35,
      showInnerFrame: false,
    },
    {
      id: "main-center-copy-copy-1779109574872",
      name: "toppanel",
      x: 206,
      y: -429,
      scale: 1,
      width: 1475,
      innerWidth: 1465,
      height: 170,
      innerHeight: 160,
      innerGap: 5,
      topBulgeWidth: 1115,
      topBulgeHeight: 0,
      bottomBulgeWidth: 1115,
      bottomBulgeHeight: 0,
      thickSegmentWidth: 6,
      thinSegmentWidth: 3,
      cornerCut: 35,
      showInnerFrame: false,
    },
  ],
  carousel: {
    enabled: true,
    count: 6,
    startX: -775,
    y: 470,
    gap: 310,
    width: 300,
    height: 125,
    cornerCut: 35,
    topBulgeWidth: 0,
    bottomBulgeWidth: 0,
    bulgeHeight: 0,
    thickSegmentWidth: 6,
    thinSegmentWidth: 3,
    labelPrefix: "C",
    arrowGap: 44,
  },
  guides: {
    enabled: true,
    inset: 1,
    width: 1,
    color: "#39d5ff",
    opacity: 0.55,
  },
};

function cloneDefaultConfig(): LeaderboardConfig {
  return JSON.parse(JSON.stringify(DEFAULT_LEADERBOARD_CONFIG)) as LeaderboardConfig;
}

function readInitialConfig(): LeaderboardConfig {
  try {
    const stored = window.localStorage.getItem(LEADERBOARD_CONFIG_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as LeaderboardConfig) : cloneDefaultConfig();
  } catch {
    return cloneDefaultConfig();
  }
}

function saveConfig(config: LeaderboardConfig) {
  window.localStorage.setItem(LEADERBOARD_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

function publishConfig(config: LeaderboardConfig) {
  try {
    const channel = new BroadcastChannel(LEADERBOARD_CONFIG_CHANNEL);
    channel.postMessage(config);
    channel.close();
  } catch {
    // localStorage still keeps the config for route reloads and browsers without BroadcastChannel.
  }
}

function useSharedLeaderboardConfig(): [LeaderboardConfig, Dispatch<SetStateAction<LeaderboardConfig>>] {
  const [cfg, setCfg] = useState<LeaderboardConfig>(readInitialConfig);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== LEADERBOARD_CONFIG_STORAGE_KEY || !event.newValue) return;
      setCfg(JSON.parse(event.newValue) as LeaderboardConfig);
    };

    window.addEventListener("storage", handleStorage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(LEADERBOARD_CONFIG_CHANNEL);
      channel.onmessage = (event) => setCfg(event.data as LeaderboardConfig);
    } catch {
      channel = null;
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      channel?.close();
    };
  }, []);

  const setSharedCfg: Dispatch<SetStateAction<LeaderboardConfig>> = useCallback((nextValue) => {
    setCfg((previous) => {
      const next = typeof nextValue === "function"
        ? (nextValue as (value: LeaderboardConfig) => LeaderboardConfig)(previous)
        : nextValue;

      saveConfig(next);
      publishConfig(next);
      return next;
    });
  }, []);

  return [cfg, setSharedCfg];
}

const line = (a: Point, b: Point, kind: string, id: string): Segment => ({ id, kind, a, b, d: `M ${a.x} ${a.y} L ${b.x} ${b.y}` });
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function anchoredFrame(cfg: LeaderboardConfig, frameKey: "outerFrame" | "innerFrame", anchorKey: "outerAnchor" | "innerAnchor"): FrameStyleConfig {
  const frame = cfg[frameKey];
  const anchor = cfg[anchorKey];
  return {
    ...frame,
    x: anchor.sideInset + ((cfg.viewBox.w - (cfg.viewBox.designW ?? cfg.viewBox.w)) / 2),
    y: anchor.topInset + ((cfg.viewBox.h - (cfg.viewBox.designH ?? cfg.viewBox.h)) / 2),
    w: (cfg.viewBox.designW ?? cfg.viewBox.w) - anchor.sideInset * 2,
    h: (cfg.viewBox.designH ?? cfg.viewBox.h) - anchor.topInset - anchor.bottomInset - frame.bottomTabDepth,
  };
}

function framePoints(frame: FrameStyleConfig): Point[] {
  const left = (frame.x ?? 0) + frame.sideInset;
  const right = (frame.x ?? 0) + (frame.w ?? 0) - frame.sideInset;
  const centerX = (frame.x ?? 0) + (frame.w ?? 0) / 2;
  const shoulderY = (frame.y ?? 0) + frame.topRise;
  const bottomY = (frame.y ?? 0) + (frame.h ?? 0);
  const tabY = bottomY + frame.bottomTabDepth * (frame.bottomTabDirection === "up" ? -1 : 1);
  const topA = centerX - frame.topStepWidth / 2;
  const topB = centerX + frame.topStepWidth / 2;
  const bottomA = centerX - frame.bottomTabWidth / 2;
  const bottomB = centerX + frame.bottomTabWidth / 2;

  return [
    { x: left + frame.cornerCut, y: shoulderY },
    { x: topA - 12, y: shoulderY },
    { x: topA + frame.topStepInset, y: frame.y ?? 0 },
    { x: topB - frame.topStepInset, y: frame.y ?? 0 },
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

function pointAt(a: Point, b: Point, distanceFromA: number): Point {
  const length = distance(a, b);
  if (length <= 0.0001) return { ...a };
  const t = clamp(distanceFromA / length, 0, 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function splitLine(a: Point, b: Point, thinKind: string, thickKind: string, startGap: number, endGap: number, id: string): Segment[] {
  const length = distance(a, b);
  if (length <= 0.0001) return [];
  const start = clamp(startGap, 0, length / 2);
  const end = clamp(endGap, 0, length / 2);
  const p1 = pointAt(a, b, start);
  const p2 = pointAt(a, b, length - end);
  if (start <= 0 && end <= 0) return [line(a, b, thinKind, id)];
  return [
    start > 0 ? line(a, p1, thickKind, `${id}Start`) : null,
    line(p1, p2, thinKind, `${id}Mid`),
    end > 0 ? line(p2, b, thickKind, `${id}End`) : null,
  ].filter((segment): segment is Segment => segment !== null);
}

function frameSegments(frame: FrameStyleConfig): Segment[] {
  const p = framePoints(frame);
  return [
    ...splitLine(p[14], p[15], "leftSideThickness", "leftSideSliceTransitionThickness", frame.leftSideStartGap, frame.leftSideEndGap, "leftSideRun"),
    line(p[15], p[0], "leftTopCornerThickness", "leftTopCorner"),
    ...splitLine(p[0], p[1], "topLeftThickness", "topLeftSliceTransitionThickness", frame.topLeftStartGap, frame.topLeftEndGap, "topLeftRun"),
    line(p[1], p[2], "topLeftConnectorThickness", "topLeftConnector"),
    line(p[2], p[3], "topCenterThickness", "topCenterRun"),
    line(p[3], p[4], "topRightConnectorThickness", "topRightConnector"),
    ...splitLine(p[4], p[5], "topRightThickness", "topRightSliceTransitionThickness", frame.topRightStartGap, frame.topRightEndGap, "topRightRun"),
    line(p[5], p[6], "rightTopCornerThickness", "rightTopCorner"),
    ...splitLine(p[6], p[7], "rightSideThickness", "rightSideSliceTransitionThickness", frame.rightSideStartGap, frame.rightSideEndGap, "rightSideRun"),
    line(p[7], p[8], "rightBottomCornerThickness", "rightBottomCorner"),
    ...splitLine(p[8], p[9], "bottomRightThickness", "bottomRightSliceTransitionThickness", frame.bottomRightStartGap, frame.bottomRightEndGap, "bottomRightRun"),
    line(p[9], p[10], "bottomRightConnectorThickness", "bottomRightConnector"),
    line(p[10], p[11], "bottomCenterThickness", "bottomCenterRun"),
    line(p[11], p[12], "bottomLeftConnectorThickness", "bottomLeftConnector"),
    ...splitLine(p[12], p[13], "bottomLeftThickness", "bottomLeftSliceTransitionThickness", frame.bottomLeftStartGap, frame.bottomLeftEndGap, "bottomLeftRun"),
    line(p[13], p[14], "leftBottomCornerThickness", "leftBottomCorner"),
  ];
}

function framePath(frame: FrameStyleConfig): string {
  const points = framePoints(frame);
  return `M ${points[0].x} ${points[0].y} ${points.slice(1).map((point) => `L ${point.x} ${point.y}`).join(" ")} Z`;
}

function strokeWidth(frame: FrameStyleConfig, segment: Segment): number {
  if (frame.useOuterWidthControls) {
    const raw = THIN_SEGMENTS.has(segment.id) ? (frame.thinSegmentWidth ?? 1) : (frame.thickSegmentWidth ?? 1);
    return raw * (frame.strokeScale ?? 1);
  }
  const keyedWidth = frame.segmentThicknesses?.[segment.id];
  const styleWidth = frame[segment.kind as keyof FrameStyleConfig];
  return (keyedWidth ?? (typeof styleWidth === "number" ? styleWidth : 1)) * (frame.strokeScale ?? 1);
}

function SvgDefs({ outerFrame, innerFrame }: { outerFrame: FrameStyleConfig; innerFrame: FrameStyleConfig }) {
  return <defs>
    <filter id="outer-frame-glow" x="-12%" y="-12%" width="124%" height="124%"><feGaussianBlur stdDeviation={outerFrame.glowBlur} /></filter>
    <filter id="outer-frame-glow-edge" x="-12%" y="-12%" width="124%" height="124%"><feGaussianBlur stdDeviation={outerFrame.edgeBlur} /></filter>
    <filter id="inner-frame-glow" x="-12%" y="-12%" width="124%" height="124%"><feGaussianBlur stdDeviation={innerFrame.glowBlur} /></filter>
    <filter id="inner-frame-glow-edge" x="-12%" y="-12%" width="124%" height="124%"><feGaussianBlur stdDeviation={innerFrame.edgeBlur} /></filter>
  </defs>;
}

function Guides({ viewBox, guides }: { viewBox: LeaderboardViewBox; guides: GuideConfig }) {
  if (!guides.enabled) return null;
  const viewY = viewBox.y ?? 0;
  return <rect x={guides.inset} y={viewY + guides.inset} width={viewBox.w - guides.inset * 2} height={viewBox.h - guides.inset * 2} fill="none" stroke={guides.color} strokeWidth={guides.width} opacity={guides.opacity} />;
}

function FrameFill({ frame, gradientId }: { frame: FrameStyleConfig; gradientId: string }) {
  if (!frame.fillEnabled || frame.fillOpacity <= 0) return null;
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

function FrameLayer({ frame, segments, filterId }: { frame: FrameStyleConfig; segments: Segment[]; filterId: string }) {
  const overlayId = `${filterId}-gradient`;
  const pathFor = (segment: Segment, props: SVGProps<SVGPathElement>, prefix: string) => <path key={`${prefix}-${segment.id}`} d={segment.d} fill="none" strokeLinejoin="round" strokeLinecap={frame.lineCap} strokeWidth={strokeWidth(frame, segment)} {...props} />;
  return <>
    <defs>
      <linearGradient id={overlayId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={frame.overlayTopColor} />
        <stop offset="45%" stopColor={frame.overlayMidColor} />
        <stop offset="100%" stopColor={frame.overlayBottomColor} />
      </linearGradient>
    </defs>
    {frame.glowOpacity > 0 && frame.glowWidth > 0 && <g opacity={frame.glowOpacity} filter={`url(#${filterId})`} pointerEvents="none">
      {segments.map((segment) => pathFor(segment, { stroke: frame.glowColor, strokeWidth: strokeWidth(frame, segment) + frame.glowWidth }, "glow"))}
    </g>}
    {frame.edgeOpacity > 0 && frame.edgeWidth > 0 && <g opacity={frame.edgeOpacity} filter={`url(#${filterId}-edge)`} pointerEvents="none">
      {segments.map((segment) => pathFor(segment, { stroke: frame.edgeColor, strokeWidth: strokeWidth(frame, segment) + frame.edgeWidth }, "edge"))}
    </g>}
    <g opacity={frame.opacity}>
      {segments.map((segment) => pathFor(segment, { stroke: frame.color }, "frame"))}
      {frame.overlayGradientOpacity > 0 && segments.map((segment) => pathFor(segment, { stroke: `url(#${overlayId})`, opacity: frame.overlayGradientOpacity, style: { mixBlendMode: frame.overlayBlend } }, "overlay"))}
    </g>
  </>;
}

function narrowFrame(frame: FrameStyleConfig, width: number, topWidth: number, bottomWidth: number, height = frame.h ?? 0): FrameStyleConfig {
  return {
    ...frame,
    x: (frame.x ?? 0) + ((frame.w ?? 0) - width) / 2,
    y: (frame.y ?? 0) + ((frame.h ?? 0) - height) / 2,
    w: width,
    h: height,
    topStepWidth: topWidth,
    bottomTabWidth: bottomWidth,
  };
}

function FrameArtwork({
  outerFrame,
  innerFrame,
  outerSegments,
  innerSegments,
}: {
  outerFrame: FrameStyleConfig;
  innerFrame: FrameStyleConfig;
  outerSegments: Segment[];
  innerSegments: Segment[];
}) {
  return <>
    <FrameFill frame={outerFrame} gradientId="outer-frame-fill-gradient" />
    <FrameLayer frame={outerFrame} segments={outerSegments} filterId="outer-frame-glow" />
    <FrameLayer frame={innerFrame} segments={innerSegments} filterId="inner-frame-glow" />
  </>;
}

function CarouselCard({ index, carousel, outerFrame }: { index: number; carousel: LeaderboardCarouselConfig; outerFrame: FrameStyleConfig }) {
  const item = {
    id: `carousel-${index}`,
    x: carousel.startX + index * carousel.gap,
    y: carousel.y,
    width: carousel.width,
    height: carousel.height,
    topBulgeWidth: carousel.topBulgeWidth,
    topBulgeHeight: carousel.bulgeHeight,
    bottomBulgeWidth: carousel.bottomBulgeWidth,
    bottomBulgeHeight: carousel.bulgeHeight,
    thickSegmentWidth: carousel.thickSegmentWidth,
    thinSegmentWidth: carousel.thinSegmentWidth,
    cornerCut: carousel.cornerCut,
  };

  const topWidth = clamp(item.topBulgeWidth, 0, Math.max(0, item.width - outerFrame.cornerCut * 2 - 24));
  const bottomWidth = clamp(item.bottomBulgeWidth, 0, Math.max(0, item.width - outerFrame.cornerCut * 2 - 24));
  const itemOuterFrame = {
    ...narrowFrame(outerFrame, item.width, topWidth, bottomWidth, item.height),
    topRise: item.topBulgeHeight,
    bottomTabDepth: item.bottomBulgeHeight,
    useOuterWidthControls: true,
    thickSegmentWidth: item.thickSegmentWidth,
    thinSegmentWidth: item.thinSegmentWidth,
    cornerCut: item.cornerCut,
    fillOpacity: 0.18,
  };

  return <g key={item.id} transform={`translate(${item.x} ${item.y})`} pointerEvents="none">
    <FrameFill frame={itemOuterFrame} gradientId={`carousel-fill-${index}`} />
    <FrameLayer frame={itemOuterFrame} segments={frameSegments(itemOuterFrame)} filterId={`carousel-frame-${index}`} />
  </g>;
}

function CarouselNav({ carousel, cfg }: { carousel: LeaderboardCarouselConfig; cfg: LeaderboardConfig }) {
  if (!carousel.enabled || carousel.count <= 0) return null;

  const y = cfg.viewBox.h / 2 + carousel.y;
  const leftX = cfg.viewBox.w / 2 + carousel.startX - carousel.width / 2 - carousel.arrowGap;
  const rightX = cfg.viewBox.w / 2 + carousel.startX + (carousel.count - 1) * carousel.gap + carousel.width / 2 + carousel.arrowGap;

  const Arrow = ({ x, flip }: { x: number; flip?: boolean }) => <g transform={`translate(${x} ${y}) ${flip ? "scale(-1 1)" : ""}`} pointerEvents="none">
    <path d="M -20 -34 L 20 0 L -20 34 Z" fill="#061222" stroke="#20d9ff" strokeWidth="3" strokeLinejoin="round" />
    <path d="M -10 -18 L 10 0 L -10 18" fill="none" stroke="#e8fbff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
  </g>;

  return <>
    <Arrow x={leftX} flip />
    <Arrow x={rightX} />
  </>;
}

function CarouselOverlay({ cfg, outerFrame }: { cfg: LeaderboardConfig; outerFrame: FrameStyleConfig }) {
  const carousel = cfg.carousel;
  if (!carousel?.enabled) return null;

  return <>
    {Array.from({ length: carousel.count }, (_, index) => <CarouselCard key={`carousel-card-${index}`} index={index} carousel={carousel} outerFrame={outerFrame} />)}
    <CarouselNav carousel={carousel} cfg={cfg} />
  </>;
}

let didRunSelfTests = false;
function runSelfTests() {
  if (didRunSelfTests) return;
  didRunSelfTests = true;

  console.assert(clamp(5, 0, 10) === 5, "clamp should keep in-range values");
  console.assert(clamp(-1, 0, 10) === 0, "clamp should enforce min");
  console.assert(clamp(20, 0, 10) === 10, "clamp should enforce max");

  const outer = anchoredFrame(DEFAULT_LEADERBOARD_CONFIG, "outerFrame", "outerAnchor");
  const segments = frameSegments(outer);
  console.assert(Array.isArray(segments) && segments.length > 0, "frameSegments should generate segments");
  console.assert(framePath(outer).startsWith("M "), "framePath should generate SVG path data");
}

function OcentraLeaderboardSvgPreview({ cfg }: { cfg: LeaderboardConfig }) {
  const outerFrame = anchoredFrame(cfg, "outerFrame", "outerAnchor");
  const innerFrame = anchoredFrame(cfg, "innerFrame", "innerAnchor");

  const renderFrame = (item: LeaderboardFrameItem) => {
    const topWidth = clamp(item.topBulgeWidth, 0, Math.max(0, item.width - outerFrame.cornerCut * 2 - 24));
    const bottomWidth = clamp(item.bottomBulgeWidth, 0, Math.max(0, item.width - outerFrame.cornerCut * 2 - 24));
    const innerTopWidth = clamp(item.topBulgeWidth, 0, Math.max(0, item.innerWidth - innerFrame.cornerCut * 2 - 24));
    const innerBottomWidth = clamp(item.bottomBulgeWidth, 0, Math.max(0, item.innerWidth - innerFrame.cornerCut * 2 - 24));
    const itemOuterFrame = {
      ...narrowFrame(outerFrame, item.width, topWidth, bottomWidth, item.height),
      topRise: item.topBulgeHeight,
      bottomTabDepth: item.bottomBulgeHeight,
      useOuterWidthControls: true,
      thickSegmentWidth: item.thickSegmentWidth,
      thinSegmentWidth: item.thinSegmentWidth,
      cornerCut: item.cornerCut,
    };
    const itemInnerFrame = {
      ...narrowFrame(innerFrame, item.innerWidth, innerTopWidth, innerBottomWidth, item.innerHeight),
      topRise: item.topBulgeHeight,
      bottomTabDepth: item.bottomBulgeHeight,
      cornerCut: item.cornerCut,
    };

    return <g key={item.id} transform={`translate(${item.x} ${item.y}) translate(${cfg.viewBox.w / 2} ${cfg.viewBox.h / 2}) scale(${item.scale}) translate(${-cfg.viewBox.w / 2} ${-cfg.viewBox.h / 2})`}>
      <FrameArtwork outerFrame={itemOuterFrame} innerFrame={itemInnerFrame} outerSegments={frameSegments(itemOuterFrame)} innerSegments={(item.showInnerFrame ?? true) ? frameSegments(itemInnerFrame) : []} />
    </g>;
  };

  return <div className="preview-stage">
    <svg className="leaderboard-svg" viewBox={`0 ${cfg.viewBox.y ?? 0} ${cfg.viewBox.w} ${cfg.viewBox.h}`} role="img" aria-label="Ocentra leaderboard frame prototype">
      <rect x="0" y={cfg.viewBox.y ?? 0} width={cfg.viewBox.w} height={cfg.viewBox.h} fill="#020713" />
      <SvgDefs outerFrame={outerFrame} innerFrame={innerFrame} />
      <Guides viewBox={cfg.viewBox} guides={cfg.guides} />
      {cfg.frames.map(renderFrame)}
      <CarouselOverlay cfg={cfg} outerFrame={outerFrame} />
    </svg>
  </div>;
}

interface OcentraLeaderboardPageProps {
  onNavigate?: (path: string) => void;
}

export function OcentraLeaderboardPage({ onNavigate }: OcentraLeaderboardPageProps) {
  runSelfTests();

  const [cfg, setCfg] = useSharedLeaderboardConfig();
  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
      return;
    }

    window.location.pathname = path;
  };

  return <div className="leaderboard-page">
    <nav className="route-links" aria-label="Scratchpad routes">
      <a href="/svg" onClick={(event) => { event.preventDefault(); handleNavigate("/svg"); }}>SVG</a>
      <a href="/controls" onClick={(event) => { event.preventDefault(); handleNavigate("/controls"); }}>Controls</a>
    </nav>
    <OcentraLeaderboardSvgPreview cfg={cfg} />
    <OcentraLeaderboardControls cfg={cfg} setCfg={setCfg} defaultConfig={DEFAULT_LEADERBOARD_CONFIG} />
  </div>;
}

interface ScratchpadHomePageProps {
  onNavigate?: (path: string) => void;
}

export function ScratchpadHomePage({ onNavigate }: ScratchpadHomePageProps) {
  const navigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
      return;
    }

    window.location.pathname = path;
  };

  return <div className="leaderboard-page home-page">
    <header className="home-header">
      <div className="home-kicker">Scratchpad</div>
      <h1>SVG route hub</h1>
      <p>Pick a layout surface and stay in the same tab while you move between the SVGs and their controls.</p>
    </header>
    <div className="home-grid">
      {ROUTE_LINKS.map((link) => <button
        key={link.path}
        type="button"
        className="home-card"
        onClick={() => navigate(link.path)}
      >
        <span className="home-card-title">{link.label}</span>
        <span className="home-card-description">{link.description}</span>
      </button>)}
    </div>
  </div>;
}

export function OcentraLeaderboardSvgRoute() {
  runSelfTests();
  const [cfg] = useSharedLeaderboardConfig();

  return <div className="leaderboard-page svg-route">
    <OcentraLeaderboardSvgPreview cfg={cfg} />
  </div>;
}

export function OcentraLeaderboardControlsRoute() {
  const [cfg, setCfg] = useSharedLeaderboardConfig();

  return <div className="leaderboard-page controls-route">
    <OcentraLeaderboardControls cfg={cfg} setCfg={setCfg} defaultConfig={DEFAULT_LEADERBOARD_CONFIG} />
  </div>;
}

export function OcentraLeaderboardForeignObjectRoute() {
  return <GoldenFrameForeignObjectSvgRoute />;
}

export function OcentraLeaderboardForeignObjectControlsRoute() {
  return <GoldenFrameForeignObjectControlsRoute />;
}
