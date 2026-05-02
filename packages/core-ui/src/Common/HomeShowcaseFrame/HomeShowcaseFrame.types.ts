import type { CSSProperties, ReactNode } from 'react';

export type HomeShowcasePreviewLayoutMode = 'auto' | 'wide' | 'narrow';

export type HomeShowcaseControlTab =
  | 'overall'
  | 'body'
  | 'sideA'
  | 'sideB'
  | 'copy'
  | 'footer';

export type HomeShowcaseFrameControls = {
  overall: {
    viewWidth: number;
    canvasInsetX: number;
    parentBleedX: number;
    marginTop: number;
    marginBottom: number;
    narrowMarginTop: number;
    narrowMarginBottom: number;
    wideHeight: number;
    narrowHeight: number;
    stageInsetX: number;
    stageY: number;
    stageWideH: number;
    stageNarrowH: number;
    stageRadius: number;
    narrowBreakpoint: number;
    debugBounds: boolean;
  };
  body: {
    insetX: number;
    topGap: number;
    bottomGap: number;
    radius: number;
    radiusTopLeft: number;
    radiusTopRight: number;
    radiusBottomRight: number;
    radiusBottomLeft: number;
    splitRatio: number;
    narrowAHeightRatio: number;
    minAWidth: number;
    minBWidth: number;
    outlineWidth: number;
  };
  sideA: {
    padX: number;
    padY: number;
    contentScale: number;
    contentOffsetX: number;
    contentOffsetY: number;
    contentZIndex: number;
    overflowVisible: boolean;
    glowOpacity: number;
    glowSize: number;
    glowBlur: number;
    glowOffsetX: number;
    glowOffsetY: number;
  };
  sideB: {
    padX: number;
    padY: number;
    contentScale: number;
    contentOffsetX: number;
    contentOffsetY: number;
    contentZIndex: number;
    overflowVisible: boolean;
  };
  copy: {
    titleMaxFont: number;
    titleMinFont: number;
    bodyMaxFont: number;
    bodyMinFont: number;
    bodyLineHeight: number;
    gap: number;
    titleLetterSpacing: number;
    titleColor: string;
    bodyColor: string;
    titleGlowColor: string;
    textAlign: string;
    bodyColorMode: string;
    bodyAccentPalette: string;
  };
  footer: {
    height: number;
    insetX: number;
    showLine: boolean;
    lineInsetX: number;
    lineWidth: number;
    lineOpacity: number;
  };
  colors: {
    bodyStroke: string;
    stageStroke: string;
    stageFill: string;
    sideBFill: string;
    debugStage: string;
    debugBody: string;
  };
};

export type HomeShowcaseFrameNumberControlGroup = Exclude<keyof HomeShowcaseFrameControls, 'colors'>;

export type HomeShowcaseFrameSlot = {
  x: number;
  y: number;
  width: number;
  height: number;
  isNarrow: boolean;
};

export type HomeShowcaseFrameProps = {
  controls?: HomeShowcaseFrameControls;
  sideA: ReactNode | ((slot: HomeShowcaseFrameSlot) => ReactNode);
  sideB: ReactNode | ((slot: HomeShowcaseFrameSlot) => ReactNode);
  footer?: ReactNode | ((slot: HomeShowcaseFrameSlot) => ReactNode);
  className?: string;
  style?: CSSProperties;
  allowDebugBounds?: boolean;
  previewLayoutMode?: HomeShowcasePreviewLayoutMode;
};

export const DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS: HomeShowcaseFrameControls = {
  overall: {
    viewWidth: 1505,
    canvasInsetX: 0,
    parentBleedX: 0,
    marginTop: 0,
    marginBottom: 0,
    narrowMarginTop: 10,
    narrowMarginBottom: 18,
    wideHeight: 278,
    narrowHeight: 520,
    stageInsetX: 0,
    stageY: 10,
    stageWideH: 252,
    stageNarrowH: 496,
    stageRadius: 18,
    narrowBreakpoint: 780,
    debugBounds: false,
  },
  body: {
    insetX: 22,
    topGap: 18,
    bottomGap: 18,
    radius: 10,
    radiusTopLeft: 10,
    radiusTopRight: 10,
    radiusBottomRight: 10,
    radiusBottomLeft: 10,
    splitRatio: 0.36,
    narrowAHeightRatio: 0.48,
    minAWidth: 280,
    minBWidth: 420,
    outlineWidth: 1.4,
  },
  sideA: {
    padX: 12,
    padY: 10,
    contentScale: 1,
    contentOffsetX: 0,
    contentOffsetY: 0,
    contentZIndex: 3,
    overflowVisible: true,
    glowOpacity: 0.64,
    glowSize: 138,
    glowBlur: 18,
    glowOffsetX: 0,
    glowOffsetY: 0,
  },
  sideB: {
    padX: 24,
    padY: 18,
    contentScale: 1,
    contentOffsetX: 0,
    contentOffsetY: 0,
    contentZIndex: 2,
    overflowVisible: false,
  },
  copy: {
    titleMaxFont: 61,
    titleMinFont: 27,
    bodyMaxFont: 19,
    bodyMinFont: 14,
    bodyLineHeight: 1.45,
    gap: 14,
    titleLetterSpacing: 0.08,
    titleColor: '#f5faff',
    bodyColor: '#ebf5ff',
    titleGlowColor: '#64d8ff',
    textAlign: 'left',
    bodyColorMode: 'solid',
    bodyAccentPalette: '#ffffff,#8fd8ff,#ffe187,#9dffc2,#ff70c8,#b88cff,#70c4ff',
  },
  footer: {
    height: 24,
    insetX: 24,
    showLine: true,
    lineInsetX: 0,
    lineWidth: 2,
    lineOpacity: 0.42,
  },
  colors: {
    bodyStroke: '#64d8ff',
    stageStroke: '#5fc9ff',
    stageFill: 'rgba(3, 13, 25, 0.42)',
    sideBFill: 'rgba(10, 14, 35, 0.48)',
    debugStage: '#b855ff',
    debugBody: '#47f29a',
  },
};

type HomeShowcasePrimitiveGroup = Record<string, number | boolean | string>;

function serializePrimitiveControlGroup<T extends HomeShowcasePrimitiveGroup>(
  defaults: T,
  value: T,
): T {
  const next: HomeShowcasePrimitiveGroup = { ...defaults };
  const record = value as HomeShowcasePrimitiveGroup;

  for (const key of Object.keys(defaults)) {
    const defaultValue = defaults[key];
    const incoming = record[key];
    if (
      typeof defaultValue === 'number' &&
      typeof incoming === 'number' &&
      Number.isFinite(incoming)
    ) {
      next[key] = incoming;
    } else if (
      typeof defaultValue === 'boolean' &&
      typeof incoming === 'boolean'
    ) {
      next[key] = incoming;
    } else if (
      typeof defaultValue === 'string' &&
      typeof incoming === 'string'
    ) {
      next[key] = incoming;
    }
  }

  return next as T;
}

export function serializeHomeShowcaseFrameControls(
  controls: HomeShowcaseFrameControls,
): HomeShowcaseFrameControls {
  return {
    overall: serializePrimitiveControlGroup(
      DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.overall,
      controls.overall,
    ),
    body: serializePrimitiveControlGroup(
      DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.body,
      controls.body,
    ),
    sideA: serializePrimitiveControlGroup(
      DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.sideA,
      controls.sideA,
    ),
    sideB: serializePrimitiveControlGroup(
      DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.sideB,
      controls.sideB,
    ),
    copy: serializePrimitiveControlGroup(
      DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.copy,
      controls.copy ?? DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.copy,
    ),
    footer: serializePrimitiveControlGroup(
      DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.footer,
      controls.footer,
    ),
    colors: serializePrimitiveControlGroup(
      DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.colors,
      controls.colors,
    ),
  };
}
