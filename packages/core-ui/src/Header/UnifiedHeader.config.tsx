import type { ReactNode } from 'react';
import type { AvatarInfo } from '@/types/avatarInfo';
import { z } from 'zod';

export type SplitMode = 'first-letter' | 'first-token' | 'manual-pipe';
export type FillStyle = 'gold' | 'royalGold' | 'silver' | 'emerald' | 'ice' | 'ruby' | 'fire' | 'flat' | 'custom';
export type EdgeStyle = 'none' | 'dark' | 'gold' | 'light' | 'ember' | 'custom';
export type ShadowStyle = 'none' | 'soft' | 'deep' | 'glow' | 'holy' | 'neon' | 'engraved' | 'custom';

export const SAFE_SYSTEM_FONTS = [
  { name: 'Cinzel fallback', value: 'Cinzel, Trajan Pro, Georgia, Times New Roman, serif' },
  { name: 'Georgia', value: 'Georgia, Times New Roman, serif' },
  { name: 'Times New Roman', value: 'Times New Roman, Times, serif' },
  { name: 'Palatino', value: 'Palatino Linotype, Book Antiqua, Palatino, serif' },
  { name: 'Garamond fallback', value: 'Garamond, Baskerville, Georgia, serif' },
  { name: 'Baskerville fallback', value: 'Baskerville, Baskerville Old Face, Georgia, serif' },
  { name: 'Cambria', value: 'Cambria, Cochin, Georgia, Times, serif' },
  { name: 'Didot fallback', value: 'Didot, Bodoni 72, Bodoni MT, Georgia, serif' },
  { name: 'Copperplate fallback', value: 'Copperplate, Copperplate Gothic Light, fantasy' },
  { name: 'Trebuchet', value: 'Trebuchet MS, Lucida Grande, Arial, sans-serif' },
  { name: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { name: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { name: 'Arial Black', value: 'Arial Black, Impact, sans-serif' },
  { name: 'Impact', value: 'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif' },
  { name: 'System UI', value: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' },
  { name: 'Monospace', value: 'Consolas, Monaco, Lucida Console, monospace' },
] as const;

const splitModeValues = ['first-letter', 'first-token', 'manual-pipe'] as const;
const fillStyleValues = ['gold', 'royalGold', 'silver', 'emerald', 'ice', 'ruby', 'fire', 'flat', 'custom'] as const;
const edgeStyleValues = ['none', 'dark', 'gold', 'light', 'ember', 'custom'] as const;
const shadowStyleValues = ['none', 'soft', 'deep', 'glow', 'holy', 'neon', 'engraved', 'custom'] as const;
const centerModeValues = ['A', 'B'] as const;
const textAnchorValues = ['start', 'middle', 'end'] as const;

const textStyleSchema = z.object({
  fontFamily: z.string(),
  fontSize: z.number(),
  fontWeight: z.number(),
  splitMode: z.enum(splitModeValues),
  forceUppercase: z.boolean(),
  firstScale: z.number(),
  restScale: z.number(),
  letterSpacing: z.number(),
  wordGap: z.number(),
  restYOffset: z.number(),
  fill: z.enum(fillStyleValues),
  edge: z.enum(edgeStyleValues),
  shadow: z.enum(shadowStyleValues),
  edgeWidthFirst: z.number(),
  edgeWidthRest: z.number(),
  opacity: z.number(),
  moveX: z.number(),
  moveY: z.number(),
  rotate: z.number(),
  skewX: z.number(),
  customColorA: z.string(),
  customColorB: z.string(),
  customColorC: z.string(),
  customFlatFill: z.string(),
  customEdgeColor: z.string(),
  customShadowColor: z.string(),
  customShadowBlur: z.number(),
  customShadowX: z.number(),
  customShadowY: z.number(),
});

export const serializedUnifiedHeaderConfigSchema = z.object({
  layout: z.object({
    height: z.number(),
    maxWidth: z.number().optional(),
    minViewWidth: z.number(),
    outerMargin: z.number(),
    leftExpandedWidth: z.number(),
    leftCollapsedWidth: z.number(),
    leftCollapseWidth: z.number(),
    centerWidth: z.number(),
    rightWidth: z.number(),
    rightCollapsedWidth: z.number(),
    rightCollapseWidth: z.number(),
    centerMinWidth: z.number(),
    boxGap: z.number(),
    wingCurve: z.number(),
    wingUnderlap: z.number(),
    wingHeight: z.number(),
    boxHeight: z.number(),
  }),
  style: z.object({
    tintColor: z.string(),
    edgeColor: z.string(),
    boxOpacity: z.number(),
    wingOpacity: z.number(),
    pillGlowBlur: z.number(),
    iconGlowBlur: z.number(),
    backdropBlur: z.number(),
    circleFillColor: z.string(),
    hoverEdgeColor: z.string(),
    hoverTintColor: z.string(),
    hoverBoxOpacityBoost: z.number(),
    dropdownTint: z.string(),
    dropdownBorderColor: z.string(),
    dropdownSectionOpacity: z.number(),
  }),
  left: z.object({
    text: z.string(),
    textStyle: textStyleSchema,
    iconSize: z.number(),
    iconOffsetX: z.number(),
    iconOffsetY: z.number(),
    icon: z.string().optional(),
    isButton: z.boolean().optional(),
    ariaLabel: z.string().optional(),
  }),
  right: z.object({
    text: z.string(),
    textStyle: textStyleSchema,
    isButton: z.boolean().optional(),
    ariaLabel: z.string().optional(),
  }),
  center: z.object({
    mode: z.enum(centerModeValues),
    contentGap: z.number(),
    sidePadding: z.number(),
    modeA: z.object({
      leftText: z.string(),
      rightText: z.string(),
      leftTextAlign: z.enum(textAnchorValues),
      rightTextAlign: z.enum(textAnchorValues),
      textStyle: textStyleSchema,
      logo: z.object({
        size: z.number(),
        offsetX: z.number(),
        offsetY: z.number(),
        strokeWidth: z.number(),
        innerOpacity: z.number(),
      }),
    }),
    modeB: z.object({
      text: z.string().optional(),
      tagline: z.string().optional(),
      textStyle: textStyleSchema,
      taglineStyle: textStyleSchema.optional(),
      iconSize: z.number(),
      pairGap: z.number(),
      leftIcons: z.array(z.string()).optional(),
      rightIcons: z.array(z.string()).optional(),
      logo: z.string().optional(),
      icons: z.array(z.string()).optional(),
    }),
  }),
  metadata: z.object({
    displayName: z.string().optional(),
    matchPatterns: z.array(z.string()).optional(),
  }).optional(),
});

export const unifiedHeaderProfileDocumentSchema = z.object({
  profile: z.string().min(1),
  config: serializedUnifiedHeaderConfigSchema,
});

export type SerializedUnifiedHeaderConfig = z.infer<typeof serializedUnifiedHeaderConfigSchema>;
export type UnifiedHeaderProfileDocument = z.infer<typeof unifiedHeaderProfileDocumentSchema>;

export function parseSerializedUnifiedHeaderConfig(input: unknown): SerializedUnifiedHeaderConfig {
  return serializedUnifiedHeaderConfigSchema.parse(input);
}

export function parseUnifiedHeaderProfileDocument(input: unknown): UnifiedHeaderProfileDocument {
  return unifiedHeaderProfileDocumentSchema.parse(input);
}

export function createUnifiedHeaderConfig(input: UnifiedHeaderConfigInput = {}): UnifiedHeaderConfig {
  return {
    layout: {
      height: input.layout?.height ?? 52,
      maxWidth: input.layout?.maxWidth,
      minViewWidth: input.layout?.minViewWidth ?? 360,
      outerMargin: input.layout?.outerMargin ?? 12,
      leftExpandedWidth: input.layout?.leftExpandedWidth ?? 118,
      leftCollapsedWidth: input.layout?.leftCollapsedWidth ?? 64,
      leftCollapseWidth: input.layout?.leftCollapseWidth ?? 760,
      centerWidth: input.layout?.centerWidth ?? 176,
      rightWidth: input.layout?.rightWidth ?? 160,
      rightCollapsedWidth: input.layout?.rightCollapsedWidth ?? 78,
      rightCollapseWidth: input.layout?.rightCollapseWidth ?? 760,
      centerMinWidth: input.layout?.centerMinWidth ?? 96,
      boxGap: input.layout?.boxGap ?? 4,
      wingCurve: input.layout?.wingCurve ?? 9,
      wingUnderlap: input.layout?.wingUnderlap ?? 6,
      wingHeight: input.layout?.wingHeight ?? 30,
      boxHeight: input.layout?.boxHeight ?? 56,
    },
    style: {
      tintColor: input.style?.tintColor ?? '#1aff8c',
      edgeColor: input.style?.edgeColor ?? '#d9f7e7',
      boxOpacity: input.style?.boxOpacity ?? 0.14,
      wingOpacity: input.style?.wingOpacity ?? 0.1,
      pillGlowBlur: input.style?.pillGlowBlur ?? 2.5,
      iconGlowBlur: input.style?.iconGlowBlur ?? 0,
      backdropBlur: input.style?.backdropBlur ?? 0,
      circleFillColor: input.style?.circleFillColor ?? '#000000',
      hoverEdgeColor: input.style?.hoverEdgeColor ?? '#22ff88',
      hoverTintColor: input.style?.hoverTintColor ?? input.style?.tintColor ?? '#1aff8c',
      hoverBoxOpacityBoost: input.style?.hoverBoxOpacityBoost ?? 0.12,
      dropdownTint: input.style?.dropdownTint ?? '#3b82f6',
      dropdownBorderColor: input.style?.dropdownBorderColor ?? 'rgba(59, 130, 246, 0.3)',
      dropdownSectionOpacity: input.style?.dropdownSectionOpacity ?? 0.08,
    },
    left: {
      text: input.left?.text ?? 'Home',
      textStyle: createTextStyleConfig(input.left?.textStyle, {
        fontFamily: SAFE_SYSTEM_FONTS[14].value,
        fontSize: 13,
        fontWeight: 700,
        splitMode: 'first-letter',
        forceUppercase: false,
        firstScale: 1,
        restScale: 1,
        letterSpacing: 0,
        wordGap: 12,
        restYOffset: 0,
        fill: 'flat',
        edge: 'none',
        shadow: 'none',
        edgeWidthFirst: 0,
        edgeWidthRest: 0,
        opacity: 1,
        moveX: 0,
        moveY: 0,
        rotate: 0,
        skewX: 0,
        customColorA: '#ffffff',
        customColorB: '#ffffff',
        customColorC: '#ffffff',
        customFlatFill: '#ffffff',
        customEdgeColor: 'rgba(32, 18, 4, 0.78)',
        customShadowColor: '#ffffff',
        customShadowBlur: 0,
        customShadowX: 0,
        customShadowY: 0,
      }),
      iconSize: input.left?.iconSize ?? 25,
      iconOffsetX: input.left?.iconOffsetX ?? 0,
      iconOffsetY: input.left?.iconOffsetY ?? 0,
      icon: input.left?.icon ?? defaultHomeIcon,
      onClick: input.left?.onClick,
      isButton: input.left?.isButton ?? true,
      ariaLabel: input.left?.ariaLabel,
    },
    right: {
      text: input.right?.text ?? 'Login',
      textStyle: createTextStyleConfig(input.right?.textStyle, {
        fontFamily: SAFE_SYSTEM_FONTS[14].value,
        fontSize: 13,
        fontWeight: 700,
        splitMode: 'first-letter',
        forceUppercase: false,
        firstScale: 1,
        restScale: 1,
        letterSpacing: 0,
        wordGap: 12,
        restYOffset: 0,
        fill: 'flat',
        edge: 'none',
        shadow: 'none',
        edgeWidthFirst: 0,
        edgeWidthRest: 0,
        opacity: 1,
        moveX: 0,
        moveY: 0,
        rotate: 0,
        skewX: 0,
        customColorA: '#ffffff',
        customColorB: '#ffffff',
        customColorC: '#ffffff',
        customFlatFill: '#ffffff',
        customEdgeColor: 'rgba(32, 18, 4, 0.78)',
        customShadowColor: '#ffffff',
        customShadowBlur: 0,
        customShadowX: 0,
        customShadowY: 0,
      }),
      isProfile: input.right?.isProfile ?? false,
      user: input.right?.user,
      onClick: input.right?.onClick,
      onLogout: input.right?.onLogout,
      onAdminDashboardClick: input.right?.onAdminDashboardClick,
      onViewProfileClick: input.right?.onViewProfileClick,
      onSettingsClick: input.right?.onSettingsClick,
      onSecurityClick: input.right?.onSecurityClick,
      onUpdatePhoto: input.right?.onUpdatePhoto,
      getAvatars: input.right?.getAvatars,
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
        leftTextAlign: input.center?.modeA?.leftTextAlign ?? 'start',
        rightTextAlign: input.center?.modeA?.rightTextAlign ?? 'end',
        textStyle: createTextStyleConfig(input.center?.modeA?.textStyle, {
          fontFamily: SAFE_SYSTEM_FONTS[0].value,
          fontSize: 18,
          fontWeight: 800,
          splitMode: 'first-letter',
          forceUppercase: false,
          firstScale: 1,
          restScale: 0.58,
          letterSpacing: 1.5,
          wordGap: 14,
          restYOffset: 0,
          fill: 'flat',
          edge: 'none',
          shadow: 'none',
          edgeWidthFirst: 0,
          edgeWidthRest: 0,
          opacity: 1,
          moveX: 0,
          moveY: 0,
          rotate: 0,
          skewX: 0,
          customColorA: '#ffffff',
          customColorB: '#ffffff',
          customColorC: '#ffffff',
          customFlatFill: '#ffffff',
          customEdgeColor: '#0044ff',
          customShadowColor: '#ffffff',
          customShadowBlur: 0,
          customShadowX: 0,
          customShadowY: 0,
        }),
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
        textStyle: createTextStyleConfig(input.center?.modeB?.textStyle, {
          fontFamily: SAFE_SYSTEM_FONTS[0].value,
          fontSize: 25,
          fontWeight: 800,
          splitMode: 'first-letter',
          forceUppercase: false,
          firstScale: 1,
          restScale: 0.58,
          letterSpacing: 1,
          wordGap: 16,
          restYOffset: 0,
          fill: 'flat',
          edge: 'none',
          shadow: 'none',
          edgeWidthFirst: 0,
          edgeWidthRest: 0,
          opacity: 1,
          moveX: 0,
          moveY: 0,
          rotate: 0,
          skewX: 0,
          customColorA: '#ffffff',
          customColorB: '#ffffff',
          customColorC: '#ffffff',
          customFlatFill: '#ffffff',
          customEdgeColor: '#0044ff',
          customShadowColor: '#ffffff',
          customShadowBlur: 0,
          customShadowX: 0,
          customShadowY: 0,
        }),
        tagline: input.center?.modeB?.tagline,
        taglineStyle: input.center?.modeB?.taglineStyle
          ? createTextStyleConfig(input.center?.modeB?.taglineStyle, {
              fontFamily: SAFE_SYSTEM_FONTS[14].value,
              fontSize: 11,
              fontWeight: 500,
              splitMode: 'first-letter',
              forceUppercase: false,
              firstScale: 1,
              restScale: 1,
              letterSpacing: 0.5,
              wordGap: 10,
              restYOffset: 0,
              fill: 'flat',
              edge: 'none',
              shadow: 'none',
              edgeWidthFirst: 0,
              edgeWidthRest: 0,
              opacity: 0.8,
              moveX: 0,
              moveY: 0,
              rotate: 0,
              skewX: 0,
              customColorA: '#ffffff',
              customColorB: '#ffffff',
              customColorC: '#ffffff',
              customFlatFill: '#ffffff',
              customEdgeColor: 'rgba(32, 18, 4, 0.78)',
              customShadowColor: '#ffffff',
              customShadowBlur: 0,
              customShadowX: 0,
              customShadowY: 0,
            })
          : undefined,
        iconSize: input.center?.modeB?.iconSize ?? 13,
        pairGap: input.center?.modeB?.pairGap ?? 0,
        leftIcons: input.center?.modeB?.leftIcons,
        rightIcons: input.center?.modeB?.rightIcons,
        logo: input.center?.modeB?.logo,
        icons: input.center?.modeB?.icons ?? [defaultSpadeIcon, defaultHeartIcon, defaultDiamondIcon, defaultClubIcon],
      },
      customRenderer: input.center?.customRenderer,
    },
    metadata: {
      displayName: input.metadata?.displayName,
      matchPatterns: input.metadata?.matchPatterns,
    }
  };
}

export type UnifiedHeaderConfig = {
  layout: UnifiedHeaderLayoutConfig;
  style: UnifiedHeaderStyleConfig;
  left: UnifiedHeaderLeftConfig;
  right: UnifiedHeaderRightConfig;
  center: UnifiedHeaderCenterConfig;
  metadata?: UnifiedHeaderMetadata;
};

export type UnifiedHeaderConfigInput = DeepPartial<UnifiedHeaderConfig>;

export type UnifiedHeaderMetadata = {
  displayName?: string;
  matchPatterns?: string[]; // e.g. ["/admin/*", "/asset-editor", "/game/:id"]
};

export type UnifiedHeaderLayoutConfig = {
  height: number;
  maxWidth?: number;
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
  wingHeight: number;
  boxHeight: number;
};

export type UnifiedHeaderStyleConfig = {
  tintColor: string;
  edgeColor: string;
  boxOpacity: number;
  wingOpacity: number;
  pillGlowBlur: number;
  iconGlowBlur: number;
  backdropBlur: number;
  circleFillColor: string;
  hoverEdgeColor: string;
  hoverTintColor: string;
  hoverBoxOpacityBoost: number;
  dropdownTint: string;
  dropdownBorderColor: string;
  dropdownSectionOpacity: number;
};

export type UnifiedHeaderLeftConfig = {
  text: string;
  textStyle: TextStyleConfig;
  iconSize: number;
  iconOffsetX: number;
  iconOffsetY: number;
  icon: HeaderIconType;
  onClick?: () => void;
  isButton?: boolean;
  ariaLabel?: string;
  customRenderer?: LeftContentRenderer;
};

export type UnifiedHeaderRightConfig = {
  text: string;
  textStyle: TextStyleConfig;
  isProfile?: boolean;
  user?: {
    name: string;
    uid?: string;
    email?: string | null;
    avatarUrl?: string | null;
    isLoggedIn?: boolean;
    isAdmin?: boolean;
    eloRating?: number;
    gamesPlayed?: number;
    winRate?: number;
  };
  onClick?: () => void;
  onLogout?: () => void;
  onAdminDashboardClick?: () => void;
  onViewProfileClick?: () => void;
  onSettingsClick?: () => void;
  onSecurityClick?: () => void;
  onUpdatePhoto?: (data: { photoURL: string }) => Promise<void | { success: boolean; error?: string }>;
  getAvatars?: () => Promise<AvatarInfo[]>;
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
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  splitMode: SplitMode;
  forceUppercase: boolean;
  firstScale: number;
  restScale: number;
  letterSpacing: number;
  wordGap: number;
  restYOffset: number;
  fill: FillStyle;
  edge: EdgeStyle;
  shadow: ShadowStyle;
  edgeWidthFirst: number;
  edgeWidthRest: number;
  opacity: number;
  moveX: number;
  moveY: number;
  rotate: number;
  skewX: number;
  customColorA: string;
  customColorB: string;
  customColorC: string;
  customFlatFill: string;
  customEdgeColor: string;
  customShadowColor: string;
  customShadowBlur: number;
  customShadowX: number;
  customShadowY: number;
};

export type CenterModeAConfig = {
  leftText: string;
  rightText: string;
  leftTextAlign: TextAnchorMode;
  rightTextAlign: TextAnchorMode;
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

export type HeaderIconType = HeaderIconRenderer | string;

export type CenterModeBConfig = {
  text?: string;
  tagline?: string;
  textStyle: TextStyleConfig;
  taglineStyle?: TextStyleConfig;
  iconSize: number;
  pairGap: number;
  leftIcons?: HeaderIconType[];
  rightIcons?: HeaderIconType[];
  logo?: HeaderIconType;
  icons?: HeaderIconType[]; // Keep for legacy compatibility
};

export type HeaderBoxRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type TextAnchorMode = 'start' | 'middle' | 'end';



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

type LegacyTextStyleInput = Partial<TextStyleConfig> & {
  size?: number;
  color?: string;
  weight?: number;
  strokeColor?: string;
  strokeWidth?: number;
  smallCaps?: boolean;
  glowBlur?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
};

function createTextStyleConfig(input: LegacyTextStyleInput | undefined, defaults: TextStyleConfig): TextStyleConfig {
  const flatColor = input?.customFlatFill ?? input?.color ?? defaults.customFlatFill;
  const edgeColor = input?.customEdgeColor ?? input?.strokeColor ?? defaults.customEdgeColor;
  const legacyShadowColor = input?.customShadowColor ?? input?.shadowColor ?? flatColor;
  const legacyShadowBlur = input?.customShadowBlur ?? input?.shadowBlur ?? input?.glowBlur ?? defaults.customShadowBlur;
  const splitMode = input?.splitMode ?? (input?.smallCaps ? 'first-letter' : defaults.splitMode);
  const restScale = input?.restScale ?? (input?.smallCaps ? Math.min(defaults.restScale, 0.58) : defaults.restScale);
  const edge = input?.edge ?? ((input?.strokeWidth ?? 0) > 0 || Boolean(input?.strokeColor) ? 'custom' : defaults.edge);
  const shadow = input?.shadow ?? ((legacyShadowBlur ?? 0) > 0 ? 'custom' : defaults.shadow);

  return {
    fontFamily: input?.fontFamily ?? defaults.fontFamily,
    fontSize: input?.fontSize ?? input?.size ?? defaults.fontSize,
    fontWeight: input?.fontWeight ?? input?.weight ?? defaults.fontWeight,
    splitMode,
    forceUppercase: input?.forceUppercase ?? defaults.forceUppercase,
    firstScale: input?.firstScale ?? defaults.firstScale,
    restScale,
    letterSpacing: input?.letterSpacing ?? defaults.letterSpacing,
    wordGap: input?.wordGap ?? defaults.wordGap,
    restYOffset: input?.restYOffset ?? defaults.restYOffset,
    fill: input?.fill ?? defaults.fill,
    edge,
    shadow,
    edgeWidthFirst: input?.edgeWidthFirst ?? input?.strokeWidth ?? defaults.edgeWidthFirst,
    edgeWidthRest: input?.edgeWidthRest ?? input?.strokeWidth ?? defaults.edgeWidthRest,
    opacity: input?.opacity ?? defaults.opacity,
    moveX: input?.moveX ?? defaults.moveX,
    moveY: input?.moveY ?? defaults.moveY,
    rotate: input?.rotate ?? defaults.rotate,
    skewX: input?.skewX ?? defaults.skewX,
    customColorA: input?.customColorA ?? defaults.customColorA,
    customColorB: input?.customColorB ?? defaults.customColorB,
    customColorC: input?.customColorC ?? defaults.customColorC,
    customFlatFill: flatColor,
    customEdgeColor: edgeColor,
    customShadowColor: legacyShadowColor,
    customShadowBlur: legacyShadowBlur,
    customShadowX: input?.customShadowX ?? input?.shadowOffsetX ?? defaults.customShadowX,
    customShadowY: input?.customShadowY ?? input?.shadowOffsetY ?? defaults.customShadowY,
  };
}

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
