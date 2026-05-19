export type PictureViewerOrientation = 'portrait' | 'landscape';
export type PictureViewerLineCap = 'round' | 'butt' | 'square';
export type PictureViewerBottomTabDirection = 'down' | 'up';

export type PictureViewerFrameSegmentId =
  | 'topLeftRunStart'
  | 'topLeftRunMid'
  | 'topLeftRunEnd'
  | 'topLeftConnector'
  | 'topCenterRun'
  | 'topRightConnector'
  | 'topRightRunStart'
  | 'topRightRunMid'
  | 'topRightRunEnd'
  | 'rightTopCorner'
  | 'rightSideRunStart'
  | 'rightSideRunMid'
  | 'rightSideRunEnd'
  | 'rightBottomCorner'
  | 'bottomRightRunStart'
  | 'bottomRightRunMid'
  | 'bottomRightRunEnd'
  | 'bottomRightConnector'
  | 'bottomCenterRun'
  | 'bottomLeftConnector'
  | 'bottomLeftRunStart'
  | 'bottomLeftRunMid'
  | 'bottomLeftRunEnd'
  | 'leftBottomCorner'
  | 'leftSideRunStart'
  | 'leftSideRunMid'
  | 'leftSideRunEnd'
  | 'leftTopCorner';

export type PictureViewerFrameSegmentThicknesses = Partial<Record<PictureViewerFrameSegmentId, number>>;

export type PictureViewerFrameControls = {
  x: number;
  y: number;
  w: number;
  h: number;
  sideInset: number;
  cornerCut: number;
  topRise: number;
  topStepWidth: number;
  topStepInset: number;
  bottomTabWidth: number;
  bottomTabDepth: number;
  bottomTabInset: number;
  topLeftConnectorThickness: number;
  topLeftSliceTransitionThickness: number;
  topRightConnectorThickness: number;
  topRightSliceTransitionThickness: number;
  rightTopCornerThickness: number;
  rightBottomCornerThickness: number;
  rightSideSliceTransitionThickness: number;
  bottomRightConnectorThickness: number;
  bottomRightSliceTransitionThickness: number;
  bottomLeftConnectorThickness: number;
  bottomLeftSliceTransitionThickness: number;
  leftBottomCornerThickness: number;
  leftSideSliceTransitionThickness: number;
  leftTopCornerThickness: number;
  topLeftThickness: number;
  topCenterThickness: number;
  topRightThickness: number;
  leftSideThickness: number;
  rightSideThickness: number;
  bottomLeftThickness: number;
  bottomCenterThickness: number;
  bottomRightThickness: number;
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
  lineCap: PictureViewerLineCap;
  bottomTabDirection: PictureViewerBottomTabDirection;
  topGroupThickness: number;
  bottomGroupThickness: number;
  cornerGroupThickness: number;
  thinLineGroupThickness: number;
  segmentThicknesses: PictureViewerFrameSegmentThicknesses;
  color: string;
  glowEnabled: boolean;
  glowColor: string;
  glowOpacity: number;
  glowBlur: number;
  glowWidthBoost: number;
  outlineEnabled: boolean;
  outlineOpacity: number;
  outlineWidthBoost: number;
  opacity: number;
};

export type PictureViewerNavArrowControls = {
  enabled: boolean;
  size: number;
  topOffset: number;
  bottomOffset: number;
  opacity: number;
  edgeWidth: number;
  glowOpacity: number;
  glowBlur: number;
  hoverScale: number;
  activeScale: number;
};

export type PictureViewerFrameSurfaceControls = {
  orientation: PictureViewerOrientation;
  viewBox: { w: number; h: number };
  frameSpace: { w: number; h: number };
  frameGroup: { inset: number; offsetX: number; offsetY: number };
  navArrows: PictureViewerNavArrowControls;
  outerAnchor: { sideInset: number; topInset: number; bottomInset: number };
  innerAnchor: { sideInset: number; topInset: number; bottomInset: number };
  outerFrame: PictureViewerFrameControls;
  innerFrame: PictureViewerFrameControls;
};

export type PictureViewerFramePoint = {
  x: number;
  y: number;
};

export type PictureViewerFrameSegment = {
  id: PictureViewerFrameSegmentId;
  d: string;
  kind: keyof PictureViewerFrameControls;
  a: PictureViewerFramePoint;
  b: PictureViewerFramePoint;
};

const OUTER_FRAME_DEFAULT: PictureViewerFrameControls = {
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
  leftSideThickness: 1,
  rightSideThickness: 1,
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
  lineCap: 'round',
  bottomTabDirection: 'down',
  topGroupThickness: 4,
  bottomGroupThickness: 4,
  cornerGroupThickness: 6,
  thinLineGroupThickness: 2,
  segmentThicknesses: {
    topLeftRunMid: 2,
    topRightRunMid: 2,
    bottomRightRunMid: 2,
    bottomLeftRunMid: 2,
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
    bottomRightRunEnd: 4,
    bottomRightConnector: 4,
    bottomCenterRun: 4,
    bottomLeftConnector: 4,
    bottomLeftRunStart: 4,
    topLeftRunEnd: 4,
    topLeftConnector: 4,
    topCenterRun: 4,
    topRightConnector: 4,
    topRightRunStart: 4,
    leftSideRunMid: 1,
    rightSideRunMid: 1,
  },
  color: '#3ddcfe',
  glowEnabled: true,
  glowColor: '#00dcf4',
  glowOpacity: 0.25,
  glowBlur: 27,
  glowWidthBoost: 9,
  outlineEnabled: true,
  outlineOpacity: 0.85,
  outlineWidthBoost: 3,
  opacity: 1,
};

const INNER_FRAME_DEFAULT: PictureViewerFrameControls = {
  ...OUTER_FRAME_DEFAULT,
  topRise: 0,
  bottomTabDepth: 0,
  leftSideSliceTransitionThickness: 5,
  topLeftThickness: 2,
  topRightThickness: 2,
  leftSideThickness: 2,
  rightSideThickness: 2,
  bottomLeftThickness: 2,
  bottomRightThickness: 1,
  topLeftStartGap: 40,
  topRightEndGap: 40,
  bottomLeftEndGap: 40,
  bottomRightStartGap: 40,
  leftSideStartGap: 40,
  leftSideEndGap: 40,
  rightSideStartGap: 40,
  rightSideEndGap: 40,
  topGroupThickness: 1,
  bottomGroupThickness: 1,
  cornerGroupThickness: 3,
  thinLineGroupThickness: 1,
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
    leftSideRunStart: 3,
    leftSideRunEnd: 3,
    leftTopCorner: 3,
    topLeftRunStart: 3,
    topRightRunEnd: 3,
    rightTopCorner: 3,
    rightSideRunStart: 3,
    rightSideRunEnd: 3,
    rightBottomCorner: 3,
    bottomRightRunStart: 3,
    bottomLeftRunEnd: 3,
    leftBottomCorner: 3,
    topLeftRunMid: 1,
    topRightRunMid: 1,
    bottomLeftRunMid: 1,
    bottomRightRunMid: 1,
  },
  color: '#007cf9',
  glowEnabled: false,
  glowColor: '#ffd23b',
  glowOpacity: 0.55,
  glowBlur: 7,
  glowWidthBoost: 8,
  outlineEnabled: true,
  outlineOpacity: 0.85,
  outlineWidthBoost: 3,
};

export const DEFAULT_PICTURE_VIEWER_FRAME_CONTROLS: PictureViewerFrameSurfaceControls = {
  orientation: 'portrait',
  viewBox: { w: 1200, h: 2000 },
  frameSpace: { w: 2000, h: 1200 },
  frameGroup: { inset: 5, offsetX: 0, offsetY: 0 },
  navArrows: {
    enabled: true,
    size: 80,
    topOffset: 36,
    bottomOffset: -36,
    opacity: 1,
    edgeWidth: 1,
    glowOpacity: 0.35,
    glowBlur: 5,
    hoverScale: 1.08,
    activeScale: 0.94,
  },
  outerAnchor: { sideInset: 30, topInset: 30, bottomInset: 30 },
  innerAnchor: { sideInset: 45, topInset: 100, bottomInset: 100 },
  outerFrame: OUTER_FRAME_DEFAULT,
  innerFrame: INNER_FRAME_DEFAULT,
};

function numberOrFallback(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function mergeFrameControls(
  value: Partial<PictureViewerFrameControls> | null | undefined,
  fallback: PictureViewerFrameControls,
): PictureViewerFrameControls {
  return {
    ...fallback,
    ...value,
    lineCap: value?.lineCap === 'butt' || value?.lineCap === 'square' ? value.lineCap : fallback.lineCap,
    bottomTabDirection: value?.bottomTabDirection === 'up' ? 'up' : fallback.bottomTabDirection,
    segmentThicknesses: {
      ...fallback.segmentThicknesses,
      ...value?.segmentThicknesses,
    },
  };
}

export function normalizePictureViewerFrameControls(
  value?: Partial<PictureViewerFrameSurfaceControls> | null,
): PictureViewerFrameSurfaceControls {
  const defaults = DEFAULT_PICTURE_VIEWER_FRAME_CONTROLS;
  const orientation = value?.orientation === 'landscape' ? 'landscape' : defaults.orientation;
  const viewBox = {
    w: numberOrFallback(value?.viewBox?.w, defaults.viewBox.w),
    h: numberOrFallback(value?.viewBox?.h, defaults.viewBox.h),
  };
  const frameSpace = value?.frameSpace
    ? {
        w: numberOrFallback(value.frameSpace.w, defaults.frameSpace.w),
        h: numberOrFallback(value.frameSpace.h, defaults.frameSpace.h),
      }
    : getPictureViewerFrameSpaceForOrientation(viewBox, orientation);

  return {
    orientation,
    viewBox,
    frameSpace,
    frameGroup: {
      inset: numberOrFallback(value?.frameGroup?.inset, defaults.frameGroup.inset),
      offsetX: numberOrFallback(value?.frameGroup?.offsetX, defaults.frameGroup.offsetX),
      offsetY: numberOrFallback(value?.frameGroup?.offsetY, defaults.frameGroup.offsetY),
    },
    navArrows: {
      ...defaults.navArrows,
      ...value?.navArrows,
      enabled: value?.navArrows?.enabled ?? defaults.navArrows.enabled,
    },
    outerAnchor: {
      sideInset: numberOrFallback(value?.outerAnchor?.sideInset, defaults.outerAnchor.sideInset),
      topInset: numberOrFallback(value?.outerAnchor?.topInset, defaults.outerAnchor.topInset),
      bottomInset: numberOrFallback(value?.outerAnchor?.bottomInset, defaults.outerAnchor.bottomInset),
    },
    innerAnchor: {
      sideInset: numberOrFallback(value?.innerAnchor?.sideInset, defaults.innerAnchor.sideInset),
      topInset: numberOrFallback(value?.innerAnchor?.topInset, defaults.innerAnchor.topInset),
      bottomInset: numberOrFallback(value?.innerAnchor?.bottomInset, defaults.innerAnchor.bottomInset),
    },
    outerFrame: mergeFrameControls(value?.outerFrame, defaults.outerFrame),
    innerFrame: mergeFrameControls(value?.innerFrame, defaults.innerFrame),
  };
}

export function getPictureViewerFrameSpaceForOrientation(
  viewBox: { w: number; h: number },
  orientation: PictureViewerOrientation,
) {
  return orientation === 'portrait' ? { w: viewBox.h, h: viewBox.w } : { w: viewBox.w, h: viewBox.h };
}

export function getPictureViewerAnchoredFrame(
  cfg: PictureViewerFrameSurfaceControls,
  frameKey: 'outerFrame' | 'innerFrame',
  anchorKey: 'outerAnchor' | 'innerAnchor',
): PictureViewerFrameControls {
  const frame = cfg[frameKey];
  const anchor = cfg[anchorKey];
  const space = cfg.frameSpace ?? cfg.viewBox;

  return {
    ...frame,
    x: anchor.sideInset,
    y: anchor.topInset,
    w: space.w - anchor.sideInset * 2,
    h: space.h - anchor.topInset - anchor.bottomInset - frame.bottomTabDepth,
  };
}

export function getPictureViewerFrameTransform(cfg: PictureViewerFrameSurfaceControls): string | undefined {
  return cfg.orientation === 'portrait' ? `translate(${cfg.viewBox.w} 0) rotate(90)` : undefined;
}

export function getPictureViewerFrameGroupTransform(cfg: PictureViewerFrameSurfaceControls): string {
  const inset = Math.max(0, Math.min(cfg.frameGroup.inset, Math.min(cfg.viewBox.w, cfg.viewBox.h) / 2 - 1));
  const availableW = Math.max(1, cfg.viewBox.w - inset * 2);
  const availableH = Math.max(1, cfg.viewBox.h - inset * 2);
  const scale = Math.min(availableW / cfg.viewBox.w, availableH / cfg.viewBox.h);
  const extraX = (cfg.viewBox.w - cfg.viewBox.w * scale) / 2;
  const extraY = (cfg.viewBox.h - cfg.viewBox.h * scale) / 2;
  const x = extraX + cfg.frameGroup.offsetX;
  const y = extraY + cfg.frameGroup.offsetY;
  return `translate(${x} ${y}) scale(${scale})`;
}

export function getPictureViewerFramePoints(frame: PictureViewerFrameControls): PictureViewerFramePoint[] {
  const left = frame.x + frame.sideInset;
  const right = frame.x + frame.w - frame.sideInset;
  const cx = frame.x + frame.w / 2;
  const topA = cx - frame.topStepWidth / 2;
  const topB = cx + frame.topStepWidth / 2;
  const peakY = frame.y;
  const shoulderY = frame.y + frame.topRise;
  const bottomY = frame.y + frame.h;
  const tabDirection = frame.bottomTabDirection === 'up' ? -1 : 1;
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

export function getPictureViewerBulgeArrowCenters(
  frame: PictureViewerFrameControls,
  arrows: PictureViewerNavArrowControls,
) {
  const p = getPictureViewerFramePoints(frame);

  return {
    top: {
      x: (p[2].x + p[3].x) / 2,
      y: (p[2].y + p[3].y) / 2 + arrows.topOffset,
    },
    bottom: {
      x: (p[10].x + p[11].x) / 2,
      y: (p[10].y + p[11].y) / 2 + arrows.bottomOffset,
    },
  };
}

function lerpPoint(a: PictureViewerFramePoint, b: PictureViewerFramePoint, distanceFromA: number): PictureViewerFramePoint {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len <= 0.0001) return { x: a.x, y: a.y };
  const t = Math.max(0, Math.min(1, distanceFromA / len));
  return { x: a.x + dx * t, y: a.y + dy * t };
}

function splitEdge(
  a: PictureViewerFramePoint,
  b: PictureViewerFramePoint,
  thinKind: keyof PictureViewerFrameControls,
  thickKind: keyof PictureViewerFrameControls,
  startGap = 0,
  endGap = 0,
  id: string,
): PictureViewerFrameSegment[] {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len <= 0.0001) return [];

  const safeStart = Math.max(0, Math.min(startGap, len / 2));
  const safeEnd = Math.max(0, Math.min(endGap, len / 2));
  const p1 = lerpPoint(a, b, safeStart);
  const p2 = lerpPoint(a, b, len - safeEnd);

  if (safeStart <= 0 && safeEnd <= 0) {
    return [{ id: id as PictureViewerFrameSegmentId, d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`, kind: thinKind, a, b }];
  }

  const segments: PictureViewerFrameSegment[] = [];
  if (safeStart > 0) segments.push({ id: `${id}Start` as PictureViewerFrameSegmentId, d: `M ${a.x} ${a.y} L ${p1.x} ${p1.y}`, kind: thickKind, a, b: p1 });
  segments.push({ id: `${id}Mid` as PictureViewerFrameSegmentId, d: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`, kind: thinKind, a: p1, b: p2 });
  if (safeEnd > 0) segments.push({ id: `${id}End` as PictureViewerFrameSegmentId, d: `M ${p2.x} ${p2.y} L ${b.x} ${b.y}`, kind: thickKind, a: p2, b });
  return segments;
}

function edge(
  a: PictureViewerFramePoint,
  b: PictureViewerFramePoint,
  kind: keyof PictureViewerFrameControls,
  id: PictureViewerFrameSegmentId,
): PictureViewerFrameSegment[] {
  return [{ id, d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`, kind, a, b }];
}

export function pictureViewerFrameSegments(frame: PictureViewerFrameControls): PictureViewerFrameSegment[] {
  const p = getPictureViewerFramePoints(frame);
  return [
    ...splitEdge(p[14], p[15], 'leftSideThickness', 'leftSideSliceTransitionThickness', frame.leftSideStartGap, frame.leftSideEndGap, 'leftSideRun'),
    ...edge(p[15], p[0], 'leftTopCornerThickness', 'leftTopCorner'),
    ...splitEdge(p[0], p[1], 'topLeftThickness', 'topLeftSliceTransitionThickness', frame.topLeftStartGap, frame.topLeftEndGap, 'topLeftRun'),
    ...edge(p[1], p[2], 'topLeftConnectorThickness', 'topLeftConnector'),
    ...edge(p[2], p[3], 'topCenterThickness', 'topCenterRun'),
    ...edge(p[3], p[4], 'topRightConnectorThickness', 'topRightConnector'),
    ...splitEdge(p[4], p[5], 'topRightThickness', 'topRightSliceTransitionThickness', frame.topRightStartGap, frame.topRightEndGap, 'topRightRun'),
    ...edge(p[5], p[6], 'rightTopCornerThickness', 'rightTopCorner'),
    ...splitEdge(p[6], p[7], 'rightSideThickness', 'rightSideSliceTransitionThickness', frame.rightSideStartGap, frame.rightSideEndGap, 'rightSideRun'),
    ...edge(p[7], p[8], 'rightBottomCornerThickness', 'rightBottomCorner'),
    ...splitEdge(p[8], p[9], 'bottomRightThickness', 'bottomRightSliceTransitionThickness', frame.bottomRightStartGap, frame.bottomRightEndGap, 'bottomRightRun'),
    ...edge(p[9], p[10], 'bottomRightConnectorThickness', 'bottomRightConnector'),
    ...edge(p[10], p[11], 'bottomCenterThickness', 'bottomCenterRun'),
    ...edge(p[11], p[12], 'bottomLeftConnectorThickness', 'bottomLeftConnector'),
    ...splitEdge(p[12], p[13], 'bottomLeftThickness', 'bottomLeftSliceTransitionThickness', frame.bottomLeftStartGap, frame.bottomLeftEndGap, 'bottomLeftRun'),
    ...edge(p[13], p[14], 'leftBottomCornerThickness', 'leftBottomCorner'),
  ];
}

export function pictureViewerFrameSegmentThickness(
  frame: PictureViewerFrameControls,
  segment: PictureViewerFrameSegment,
): number {
  const fallback = frame[segment.kind];
  return frame.segmentThicknesses?.[segment.id] ?? (typeof fallback === 'number' ? fallback : 1);
}

export function pictureViewerDarkenHex(hex: string, amount = 0.5): string {
  const safeHex = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffd23b';
  const r = parseInt(safeHex.slice(1, 3), 16);
  const g = parseInt(safeHex.slice(3, 5), 16);
  const b = parseInt(safeHex.slice(5, 7), 16);
  const darken = (value: number) => Math.max(0, Math.min(255, Math.round(value * (1 - amount))));
  return `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`;
}
