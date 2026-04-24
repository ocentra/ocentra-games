import type { ReactNode } from 'react';

export function createUnifiedHeaderConfig(input: UnifiedHeaderConfigInput = {}): UnifiedHeaderConfig {
  return {
    layout: {
      widthPercent: input.layout?.widthPercent ?? 100,
      minHeightPx: input.layout?.minHeightPx ?? 52,
      preferredHeightVw: input.layout?.preferredHeightVw ?? 5.2,
      maxHeightPx: input.layout?.maxHeightPx ?? 80,
      minViewWidth: input.layout?.minViewWidth ?? 360,
      outerMargin: input.layout?.outerMargin ?? 12,
      leftExpandedWidth: input.layout?.leftExpandedWidth ?? 118,
      leftCollapsedWidth: input.layout?.leftCollapsedWidth ?? 64,
      leftCollapseWidth: input.layout?.leftCollapseWidth ?? 760,
      centerWidth: input.layout?.centerWidth ?? 176,
      rightWidth: input.layout?.rightWidth ?? 118,
      rightCollapsedWidth: input.layout?.rightCollapsedWidth ?? 78,
      rightCollapseWidth: input.layout?.rightCollapseWidth ?? 760,
      centerMinWidth: input.layout?.centerMinWidth ?? 96,
      boxGap: input.layout?.boxGap ?? 4,
      wingCurve: input.layout?.wingCurve ?? 9,
      wingUnderlap: input.layout?.wingUnderlap ?? 6,
      wingY: input.layout?.wingY ?? 25,
      wingHeight: input.layout?.wingHeight ?? 30,
    },
    style: {
      tintColor: input.style?.tintColor ?? '#1aff8c',
      edgeColor: input.style?.edgeColor ?? '#d9f7e7',
      boxOpacity: input.style?.boxOpacity ?? 0.14,
      wingOpacity: input.style?.wingOpacity ?? 0.1,
      glowBlur: input.style?.glowBlur ?? 2.5,
      backdropBlur: input.style?.backdropBlur ?? 0,
      circleFillColor: input.style?.circleFillColor ?? '#000000',
      hoverEdgeColor: input.style?.hoverEdgeColor ?? '#22ff88',
      hoverTintColor: input.style?.hoverTintColor ?? input.style?.tintColor ?? '#1aff8c',
      hoverBoxOpacityBoost: input.style?.hoverBoxOpacityBoost ?? 0.12,
    },
    left: {
      text: input.left?.text ?? 'Home',
      iconSize: input.left?.iconSize ?? 25,
      iconOffsetX: input.left?.iconOffsetX ?? 0,
      iconOffsetY: input.left?.iconOffsetY ?? 0,
      icon: input.left?.icon ?? defaultHomeIcon,
      onClick: input.left?.onClick,
      isButton: input.left?.isButton ?? true,
      ariaLabel: input.left?.ariaLabel,
    },
    right: {
      text: input.right?.text ?? 'Right Box',
      textStyle: {
        size: input.right?.textStyle?.size ?? 13,
        color: input.right?.textStyle?.color ?? '#ffffff',
        weight: input.right?.textStyle?.weight ?? 700,
        letterSpacing: input.right?.textStyle?.letterSpacing ?? 0,
      },
      onClick: input.right?.onClick,
      isButton: input.right?.isButton ?? true,
      ariaLabel: input.right?.ariaLabel,
    },
    center: {
      mode: input.center?.mode ?? 'A',
      contentGap: input.center?.contentGap ?? 4,
      sidePadding: input.center?.sidePadding ?? 10,
      modeA: {
        leftText: input.center?.modeA?.leftText ?? 'System',
        rightText: input.center?.modeA?.rightText ?? 'Alpha',
        textStyle: {
          size: input.center?.modeA?.textStyle?.size ?? 11,
          color: input.center?.modeA?.textStyle?.color ?? '#ffffff',
          weight: input.center?.modeA?.textStyle?.weight ?? 700,
          letterSpacing: input.center?.modeA?.textStyle?.letterSpacing ?? 0,
        },
        logo: {
          size: input.center?.modeA?.logo?.size ?? 45,
          offsetX: input.center?.modeA?.logo?.offsetX ?? 0,
          offsetY: input.center?.modeA?.logo?.offsetY ?? 0,
          strokeWidth: input.center?.modeA?.logo?.strokeWidth ?? 1.4,
          innerOpacity: input.center?.modeA?.logo?.innerOpacity ?? 0.35,
          renderer: input.center?.modeA?.logo?.renderer ?? defaultCircleLogo,
        },
      },
      modeB: {
        text: input.center?.modeB?.text ?? 'Claim',
        textStyle: {
          size: input.center?.modeB?.textStyle?.size ?? 25,
          color: input.center?.modeB?.textStyle?.color ?? '#ffffff',
          weight: input.center?.modeB?.textStyle?.weight ?? 800,
          letterSpacing: input.center?.modeB?.textStyle?.letterSpacing ?? 0,
        },
        iconSize: input.center?.modeB?.iconSize ?? 13,
        pairGap: input.center?.modeB?.pairGap ?? 0,
        icons: input.center?.modeB?.icons ?? [defaultSpadeIcon, defaultHeartIcon, defaultDiamondIcon, defaultClubIcon],
      },
      customRenderer: input.center?.customRenderer,
    },
  };
}

export type UnifiedHeaderConfig = {
  layout: UnifiedHeaderLayoutConfig;
  style: UnifiedHeaderStyleConfig;
  left: UnifiedHeaderLeftConfig;
  right: UnifiedHeaderRightConfig;
  center: UnifiedHeaderCenterConfig;
};

export type UnifiedHeaderConfigInput = DeepPartial<UnifiedHeaderConfig>;

export type UnifiedHeaderLayoutConfig = {
  widthPercent: number;
  minHeightPx: number;
  preferredHeightVw: number;
  maxHeightPx: number;
  minViewWidth: number;
  outerMargin: number;
  leftExpandedWidth: number;
  leftCollapsedWidth: number;
  leftCollapseWidth: number;
  centerWidth: number;
  rightWidth: number;
  rightCollapsedWidth: number;
  rightCollapseWidth: number;
  centerMinWidth: number;
  boxGap: number;
  wingCurve: number;
  wingUnderlap: number;
  wingY: number;
  wingHeight: number;
};

export type UnifiedHeaderStyleConfig = {
  tintColor: string;
  edgeColor: string;
  boxOpacity: number;
  wingOpacity: number;
  glowBlur: number;
  backdropBlur: number;
  circleFillColor: string;
  hoverEdgeColor: string;
  hoverTintColor: string;
  hoverBoxOpacityBoost: number;
};

export type UnifiedHeaderLeftConfig = {
  text: string;
  iconSize: number;
  iconOffsetX: number;
  iconOffsetY: number;
  icon: HeaderIconRenderer;
  onClick?: () => void;
  isButton?: boolean;
  ariaLabel?: string;
  customRenderer?: LeftContentRenderer;
};

export type UnifiedHeaderRightConfig = {
  text: string;
  textStyle: TextStyleConfig;
  onClick?: () => void;
  isButton?: boolean;
  ariaLabel?: string;
  customRenderer?: RightContentRenderer;
};

export type UnifiedHeaderCenterConfig = {
  mode: CenterMode;
  contentGap: number;
  sidePadding: number;
  modeA: CenterModeAConfig;
  modeB: CenterModeBConfig;
  customRenderer?: CenterContentRenderer;
};

export type CenterMode = 'A' | 'B';

export type TextStyleConfig = {
  size: number;
  color: string;
  weight: number;
  strokeColor?: string;
  strokeWidth?: number;
  smallCaps?: boolean;
  letterSpacing?: number;
};

export type CenterModeAConfig = {
  leftText: string;
  rightText: string;
  textStyle: TextStyleConfig;
  logo: CenterLogoConfig;
};

export type CenterLogoConfig = {
  size: number;
  offsetX: number;
  offsetY: number;
  strokeWidth: number;
  innerOpacity: number;
  renderer: CenterLogoRenderer;
};

export type CenterModeBConfig = {
  text: string;
  textStyle: TextStyleConfig;
  iconSize: number;
  pairGap: number;
  icons: HeaderIconRenderer[];
};

export type HeaderBoxRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};



export type HeaderIconRenderArgs = {
  cx: number;
  cy: number;
  size: number;
  color: string;
};

export type CenterLogoRenderArgs = HeaderIconRenderArgs & {
  strokeWidth: number;
  innerOpacity: number;
  aspectCorrection: number;
};

export type CenterContentRenderArgs = {
  box: HeaderBoxRect;
  config: UnifiedHeaderCenterConfig;
  aspectCorrection: number;
};

export type LeftContentRenderArgs = {
  box: HeaderBoxRect;
  config: UnifiedHeaderLeftConfig;
  aspectCorrection: number;
};

export type RightContentRenderArgs = {
  box: HeaderBoxRect;
  config: UnifiedHeaderRightConfig;
  aspectCorrection: number;
};

export type HeaderIconRenderer = (args: HeaderIconRenderArgs) => ReactNode;
export type CenterLogoRenderer = (args: CenterLogoRenderArgs) => ReactNode;
export type CenterContentRenderer = (args: CenterContentRenderArgs) => ReactNode;
export type LeftContentRenderer = (args: LeftContentRenderArgs) => ReactNode;
export type RightContentRenderer = (args: RightContentRenderArgs) => ReactNode;

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends Array<infer U>
      ? Array<U>
      : T[K] extends object
        ? DeepPartial<T[K]>
        : T[K];
};

function defaultCircleLogo({ cx, cy, size, color, strokeWidth, innerOpacity, aspectCorrection }: CenterLogoRenderArgs) {
  const outerRadius = size / 2;
  const logoMargin = Math.max(0.35, size * 0.018);
  const innerRadius = Math.max(1, outerRadius - logoMargin - strokeWidth * 0.5);
  const markRadius = innerRadius * 0.42;

  return (
    <g transform={`translate(${cx} ${cy}) scale(${aspectCorrection} 1) translate(${-cx} ${-cy})`}>
      <circle
        cx={cx}
        cy={cy}
        r={outerRadius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={0.95}
        vectorEffect="non-scaling-stroke"
      />

      <circle
        cx={cx}
        cy={cy}
        r={innerRadius}
        fill={color}
        opacity={innerOpacity}
      />

      <path
        d={`M ${cx} ${cy - markRadius} L ${cx + markRadius} ${cy} L ${cx} ${cy + markRadius} L ${cx - markRadius} ${cy} Z`}
        fill="none"
        stroke={color}
        strokeWidth={Math.max(0.8, strokeWidth * 0.8)}
        opacity={0.8}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function defaultSpadeIcon({ cx, cy, size, color }: HeaderIconRenderArgs) {
  const s = size;
  return (
    <g fill={color} stroke="white" strokeWidth={0.45} strokeOpacity={0.45} vectorEffect="non-scaling-stroke">
      <path d={`M ${cx} ${cy - s * 0.55} C ${cx - s * 0.55} ${cy - s * 0.05} ${cx - s * 0.55} ${cy + s * 0.45} ${cx - s * 0.12} ${cy + s * 0.32} C ${cx - s * 0.05} ${cy + s * 0.3} ${cx - s * 0.02} ${cy + s * 0.22} ${cx} ${cy + s * 0.16} C ${cx + s * 0.02} ${cy + s * 0.22} ${cx + s * 0.05} ${cy + s * 0.3} ${cx + s * 0.12} ${cy + s * 0.32} C ${cx + s * 0.55} ${cy + s * 0.45} ${cx + s * 0.55} ${cy - s * 0.05} ${cx} ${cy - s * 0.55} Z`} />
      <path d={`M ${cx - s * 0.18} ${cy + s * 0.55} C ${cx - s * 0.04} ${cy + s * 0.36} ${cx - s * 0.03} ${cy + s * 0.25} ${cx} ${cy + s * 0.12} C ${cx + s * 0.03} ${cy + s * 0.25} ${cx + s * 0.04} ${cy + s * 0.36} ${cx + s * 0.18} ${cy + s * 0.55} Z`} />
    </g>
  );
}

function defaultHeartIcon({ cx, cy, size, color }: HeaderIconRenderArgs) {
  const s = size;
  return (
    <path
      d={`M ${cx} ${cy + s * 0.48} C ${cx - s * 0.65} ${cy} ${cx - s * 0.58} ${cy - s * 0.52} ${cx - s * 0.2} ${cy - s * 0.45} C ${cx - s * 0.04} ${cy - s * 0.42} ${cx} ${cy - s * 0.28} ${cx} ${cy - s * 0.2} C ${cx} ${cy - s * 0.28} ${cx + s * 0.04} ${cy - s * 0.42} ${cx + s * 0.2} ${cy - s * 0.45} C ${cx + s * 0.58} ${cy - s * 0.52} ${cx + s * 0.65} ${cy} ${cx} ${cy + s * 0.48} Z`}
      fill={color}
      stroke="white"
      strokeWidth={0.45}
      strokeOpacity={0.35}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function defaultDiamondIcon({ cx, cy, size, color }: HeaderIconRenderArgs) {
  const s = size;
  return <path d={`M ${cx} ${cy - s * 0.58} L ${cx + s * 0.42} ${cy} L ${cx} ${cy + s * 0.58} L ${cx - s * 0.42} ${cy} Z`} fill={color} stroke="white" strokeWidth={0.45} strokeOpacity={0.35} vectorEffect="non-scaling-stroke" />;
}

function defaultClubIcon({ cx, cy, size, color }: HeaderIconRenderArgs) {
  const s = size;
  return (
    <g fill={color} stroke="white" strokeWidth={0.45} strokeOpacity={0.45} vectorEffect="non-scaling-stroke">
      <circle cx={cx} cy={cy - s * 0.23} r={s * 0.24} />
      <circle cx={cx - s * 0.24} cy={cy + s * 0.06} r={s * 0.24} />
      <circle cx={cx + s * 0.24} cy={cy + s * 0.06} r={s * 0.24} />
      <path d={`M ${cx - s * 0.16} ${cy + s * 0.55} C ${cx - s * 0.03} ${cy + s * 0.32} ${cx - s * 0.02} ${cy + s * 0.18} ${cx} ${cy + s * 0.08} C ${cx + s * 0.02} ${cy + s * 0.18} ${cx + s * 0.03} ${cy + s * 0.32} ${cx + s * 0.16} ${cy + s * 0.55} Z`} />
    </g>
  );
}

function defaultHomeIcon({ cx, cy, size }: HeaderIconRenderArgs) {
  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={size}
      fontFamily="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif"
      style={{ userSelect: 'none', pointerEvents: 'none' }}
    >
      🏠
    </text>
  );
}
