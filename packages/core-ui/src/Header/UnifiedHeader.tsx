import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { authAnnonImageUrl } from '@ocentra/app-assets/auth';
import {
  SAFE_SYSTEM_FONTS,
  createUnifiedHeaderConfig,
  parseSerializedUnifiedHeaderConfig,
  parseUnifiedHeaderProfileDocument,
  type UnifiedHeaderConfig,
  type UnifiedHeaderConfigInput,
  type UnifiedHeaderLayoutConfig,
  type UnifiedHeaderStyleConfig,
  type UnifiedHeaderNavigationConfig,
  type UnifiedHeaderCenterConfig,
  type UnifiedHeaderLeftConfig,
  type UnifiedHeaderRightConfig,
  type CenterModeAConfig,
  type CenterModeBConfig,
  type HeaderBoxRect,
  type HeaderIconRenderArgs,
  type CenterMode,
  type TextStyleConfig,
  type HeaderIconType,
  type TextAnchorMode,
  type SplitMode,
  type FillStyle,
  type EdgeStyle,
  type ShadowStyle,
} from './UnifiedHeader.config';
import { ProfilePictureModal } from './ProfilePictureModal';
import { PrimarySiteNavigation } from './PrimarySiteNavigation';
import styles from './UnifiedHeader.module.css';

// Auto-import all bundled profiles
const BUNDLED_PROFILES = import.meta.glob('./profiles/*.json', { eager: true });
const bundledProfileNames = Object.keys(BUNDLED_PROFILES).map(path => 
  path.split('/').pop()?.replace('.json', '') || ''
).filter(Boolean);

function getBundledProfileConfig(name: string): UnifiedHeaderConfigInput | null {
  const bundledPath = `./profiles/${name}.json`;
  const bundledEntry = BUNDLED_PROFILES[bundledPath];

  if (!bundledEntry) {
    return null;
  }

  const bundledModule = bundledEntry as { default?: unknown };
  const bundledCandidate = bundledModule.default ?? bundledEntry;

  if (bundledCandidate && typeof bundledCandidate === 'object' && 'config' in (bundledCandidate as Record<string, unknown>)) {
    const bundledDocument = parseUnifiedHeaderProfileDocument(bundledCandidate);
    return bundledDocument.config;
  }

  return parseSerializedUnifiedHeaderConfig(bundledCandidate);
}

const ENABLE_HEADER_DEBUG_CONTROLS = true;
const DEFAULT_PROFILE_NAME = 'main_screen';
const HEADER_SVG_HEIGHT = 80;
const HEADER_BOX_VERTICAL_MARGIN = 8;
const AUTH_MODE_STORAGE_KEY = 'ocentra.auth.mode';

type DebugTab = 'layout' | 'profiles';
type LayoutSubtab = 'global' | 'home' | 'wings' | 'center' | 'login' | 'nav';
type TextStylePanelTab = 'basic' | 'fill' | 'edge' | 'shadow' | 'transform';
type CenterPanelTab = 'general' | 'modeA' | 'modeB';

const SVG_TITLE_PRESETS: Record<string, Partial<TextStyleConfig>> = {
  ocentraGold: {
    fontFamily: SAFE_SYSTEM_FONTS[0].value,
    fontSize: 92,
    fontWeight: 850,
    splitMode: 'first-letter',
    forceUppercase: true,
    firstScale: 1,
    restScale: 0.58,
    letterSpacing: 3,
    wordGap: 26,
    restYOffset: 0,
    fill: 'gold',
    edge: 'dark',
    shadow: 'holy',
    edgeWidthFirst: 2.2,
    edgeWidthRest: 1.1,
    opacity: 1,
    moveX: 0,
    moveY: 0,
    rotate: 0,
    skewX: 0,
    customColorA: '#ffffff',
    customColorB: '#d4af37',
    customColorC: '#6e3f00',
    customFlatFill: '#ffd86a',
    customEdgeColor: 'rgba(255,220,122,0.9)',
    customShadowColor: 'rgba(255,220,122,0.75)',
    customShadowBlur: 9,
    customShadowX: 0,
    customShadowY: 4,
  },
  royalCasino: {
    fontFamily: SAFE_SYSTEM_FONTS[7].value,
    fontSize: 96,
    fontWeight: 900,
    splitMode: 'first-letter',
    forceUppercase: true,
    firstScale: 1.08,
    restScale: 0.52,
    letterSpacing: 4.5,
    wordGap: 32,
    restYOffset: 0,
    fill: 'royalGold',
    edge: 'gold',
    shadow: 'deep',
    edgeWidthFirst: 2.2,
    edgeWidthRest: 1.1,
    opacity: 1,
    moveX: 0,
    moveY: 0,
    rotate: 0,
    skewX: 0,
    customColorA: '#ffffff',
    customColorB: '#d4af37',
    customColorC: '#6e3f00',
    customFlatFill: '#ffd86a',
    customEdgeColor: 'rgba(255,220,122,0.9)',
    customShadowColor: 'rgba(255,220,122,0.75)',
    customShadowBlur: 9,
    customShadowX: 0,
    customShadowY: 4,
  },
  arcaneEmerald: {
    fontFamily: SAFE_SYSTEM_FONTS[4].value,
    fontSize: 92,
    fontWeight: 800,
    splitMode: 'first-letter',
    forceUppercase: true,
    firstScale: 1,
    restScale: 0.56,
    letterSpacing: 5,
    wordGap: 26,
    restYOffset: 0,
    fill: 'emerald',
    edge: 'dark',
    shadow: 'neon',
    edgeWidthFirst: 2.2,
    edgeWidthRest: 1.1,
    opacity: 1,
    moveX: 0,
    moveY: 0,
    rotate: 0,
    skewX: 0,
    customColorA: '#ffffff',
    customColorB: '#d4af37',
    customColorC: '#6e3f00',
    customFlatFill: '#ffd86a',
    customEdgeColor: 'rgba(255,220,122,0.9)',
    customShadowColor: 'rgba(255,220,122,0.75)',
    customShadowBlur: 9,
    customShadowX: 0,
    customShadowY: 4,
  },
  iceSteel: {
    fontFamily: SAFE_SYSTEM_FONTS[6].value,
    fontSize: 92,
    fontWeight: 820,
    splitMode: 'first-letter',
    forceUppercase: true,
    firstScale: 1,
    restScale: 0.55,
    letterSpacing: 3,
    wordGap: 26,
    restYOffset: 0,
    fill: 'ice',
    edge: 'light',
    shadow: 'glow',
    edgeWidthFirst: 2.2,
    edgeWidthRest: 1.1,
    opacity: 1,
    moveX: 0,
    moveY: 0,
    rotate: 0,
    skewX: 0,
    customColorA: '#ffffff',
    customColorB: '#d4af37',
    customColorC: '#6e3f00',
    customFlatFill: '#ffd86a',
    customEdgeColor: 'rgba(255,220,122,0.9)',
    customShadowColor: 'rgba(255,220,122,0.75)',
    customShadowBlur: 9,
    customShadowX: 0,
    customShadowY: 4,
  },
  engravedStone: {
    fontFamily: SAFE_SYSTEM_FONTS[1].value,
    fontSize: 92,
    fontWeight: 900,
    splitMode: 'first-letter',
    forceUppercase: true,
    firstScale: 1,
    restScale: 0.55,
    letterSpacing: 3,
    wordGap: 26,
    restYOffset: 0,
    fill: 'flat',
    edge: 'dark',
    shadow: 'engraved',
    edgeWidthFirst: 2.2,
    edgeWidthRest: 1.1,
    opacity: 1,
    moveX: 0,
    moveY: 0,
    rotate: 0,
    skewX: 0,
    customColorA: '#ffffff',
    customColorB: '#d4af37',
    customColorC: '#6e3f00',
    customFlatFill: '#f4ead2',
    customEdgeColor: 'rgba(255,220,122,0.9)',
    customShadowColor: 'rgba(255,220,122,0.75)',
    customShadowBlur: 9,
    customShadowX: 0,
    customShadowY: 4,
  },
};

function pathMatchesPattern(pathname: string, pattern: string) {
  const regex = new RegExp(`^${pattern.replace(/\//g, '\\/').replace(/\*/g, '.*')}$`);
  return regex.test(pathname);
}

function pathMatchesProfile(pathname: string, config?: UnifiedHeaderConfigInput) {
  const patterns = config?.metadata?.matchPatterns || [];
  return patterns.some((pattern) => pathMatchesPattern(pathname, pattern));
}

function splitWord(word: string, mode: SplitMode) {
  if (mode === 'manual-pipe') {
    const parts = word.split('|');
    return { first: parts[0] || '', rest: parts[1] || '' };
  }

  if (mode === 'first-token') {
    let stop = 1;
    for (let index = 1; index < word.length; index += 1) {
      const character = word[index];
      if (character !== character.toUpperCase() || character === '-') {
        stop = index;
        break;
      }
    }

    return { first: word.slice(0, stop), rest: word.slice(stop) };
  }

  if (word.startsWith("O'") || word.startsWith('O’')) {
    return { first: word.slice(0, 2), rest: word.slice(2) };
  }

  return { first: word.slice(0, 1), rest: word.slice(1) };
}

function splitWords(text: string, style: TextStyleConfig) {
  const source = style.forceUppercase ? text.toUpperCase() : text;
  return source.trim().length === 0
    ? [{ first: '', rest: '' }]
    : source.trim().split(/\s+/).filter(Boolean).map((word) => splitWord(word, style.splitMode));
}

function getTextSolidColor(style: TextStyleConfig) {
  switch (style.fill) {
    case 'gold':
      return '#efc75c';
    case 'royalGold':
      return '#dfa832';
    case 'silver':
      return '#d8e1e6';
    case 'emerald':
      return '#72f0a9';
    case 'ice':
      return '#a8edff';
    case 'ruby':
      return '#ff6575';
    case 'fire':
      return '#ff9d2e';
    case 'flat':
      return style.customFlatFill;
    case 'custom':
      return style.customColorB;
    default:
      return style.customFlatFill;
  }
}

function estimateTextWidth(text: string, style: TextStyleConfig, fontSizeOverride?: number) {
  const fontSize = fontSizeOverride ?? style.fontSize;
  const normalizedStyle = { ...style, fontSize };
  const words = splitWords(text, normalizedStyle);

  return words.reduce((total, word, index) => {
    const firstWidth = Math.max(fontSize * 0.32, word.first.length * (fontSize * normalizedStyle.firstScale * 0.62));
    const restWidth = Math.max(0, word.rest.length * (fontSize * normalizedStyle.restScale * 0.55 + normalizedStyle.letterSpacing));
    return total + firstWidth + restWidth + (index === 0 ? 0 : normalizedStyle.wordGap);
  }, 0);
}

function truncateTextToWidth(text: string, style: TextStyleConfig, maxWidth: number) {
  if (!text) {
    return text;
  }

  if (estimateTextWidth(text, style) <= maxWidth) {
    return text;
  }

  const ellipsis = '...';
  let end = text.length;

  while (end > 1) {
    const candidate = `${text.slice(0, end).trimEnd()}${ellipsis}`;
    if (estimateTextWidth(candidate, style) <= maxWidth) {
      return candidate;
    }
    end -= 1;
  }

  return ellipsis;
}

function getProfileDisplayName(name: string | undefined, maxChars = 9) {
  const normalized = (name || 'Login').trim();
  const firstWord = normalized.split(/\s+/).filter(Boolean)[0] || 'Login';

  if (firstWord.length <= maxChars) {
    return firstWord;
  }

  return `${firstWord.slice(0, Math.max(1, maxChars - 2))}..`;
}

function estimateLeftBoxWidth(config: UnifiedHeaderLeftConfig, boxHeight: number, substituteVariables: (text: string | undefined) => string) {
  const text = substituteVariables(config.text);
  const circlePadding = 3;
  const circleRadius = Math.min((boxHeight - circlePadding * 2) / 2, 24);
  const textSize = Math.min(config.textStyle.fontSize, boxHeight * 0.52);
  const textWidth = estimateTextWidth(text, { ...config.textStyle, fontSize: textSize });
  return Math.ceil(circlePadding + circleRadius * 2 + 6 + textWidth + 14);
}

function estimateRightBoxWidth(
  config: UnifiedHeaderRightConfig,
  boxHeight: number,
  substituteVariables: (text: string | undefined) => string,
) {
  const textStyle = { ...config.textStyle, fontSize: Math.min(config.textStyle.fontSize, boxHeight * 0.45) };

  if (config.isProfile) {
    const avatarSize = boxHeight * 0.7;
    const name = getProfileDisplayName(config.user?.name);
    const textWidth = estimateTextWidth(name, textStyle);
    return Math.ceil(12 + avatarSize + 10 + textWidth + 28);
  }

  const text = substituteVariables(config.text);
  return Math.ceil(20 + estimateTextWidth(text, textStyle) + 20);
}

function fitSideWidths({
  leftDesired,
  rightDesired,
  leftMin,
  rightMin,
  maxTotal,
}: {
  leftDesired: number;
  rightDesired: number;
  leftMin: number;
  rightMin: number;
  maxTotal: number;
}) {
  let left = leftDesired;
  let right = rightDesired;

  if (left + right <= maxTotal) {
    return { left, right };
  }

  let overflow = left + right - maxTotal;
  const leftShrinkCap = Math.max(0, left - leftMin);
  const rightShrinkCap = Math.max(0, right - rightMin);
  const totalShrinkCap = leftShrinkCap + rightShrinkCap;

  if (totalShrinkCap <= 0) {
    return { left: leftMin, right: rightMin };
  }

  const leftShrink = Math.min(leftShrinkCap, overflow * (leftShrinkCap / totalShrinkCap));
  left -= leftShrink;
  overflow -= leftShrink;

  const rightShrink = Math.min(rightShrinkCap, overflow);
  right -= rightShrink;
  overflow -= rightShrink;

  if (overflow > 0) {
    const extraLeftShrink = Math.min(Math.max(0, left - leftMin), overflow);
    left -= extraLeftShrink;
    overflow -= extraLeftShrink;
  }

  if (overflow > 0) {
    const extraRightShrink = Math.min(Math.max(0, right - rightMin), overflow);
    right -= extraRightShrink;
  }

  return { left, right };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeLayoutConfig(layout: UnifiedHeaderLayoutConfig): UnifiedHeaderLayoutConfig {
  const boxHeight = clampNumber(layout.boxHeight, 36, HEADER_SVG_HEIGHT - HEADER_BOX_VERTICAL_MARGIN);
  const wingHeight = clampNumber(layout.wingHeight, 0, boxHeight / 2);

  return {
    ...layout,
    height: clampNumber(layout.height, 36, 120),
    outerMargin: clampNumber(layout.outerMargin, 0, 60),
    boxGap: clampNumber(layout.boxGap, 0, 40),
    leftExpandedWidth: clampNumber(layout.leftExpandedWidth, 72, 240),
    leftCollapsedWidth: clampNumber(layout.leftCollapsedWidth, 40, 120),
    leftCollapseWidth: clampNumber(layout.leftCollapseWidth, 320, 1600),
    centerWidth: clampNumber(layout.centerWidth, 96, 520),
    rightWidth: clampNumber(layout.rightWidth, 72, 300),
    rightCollapsedWidth: clampNumber(layout.rightCollapsedWidth, 40, 160),
    rightCollapseWidth: clampNumber(layout.rightCollapseWidth, 320, 1600),
    centerMinWidth: clampNumber(layout.centerMinWidth, 60, 320),
    wingCurve: clampNumber(layout.wingCurve, 0, 60),
    wingUnderlap: clampNumber(layout.wingUnderlap, 0, 60),
    wingHeight,
    boxHeight,
  };
}

function buildWingClipPath(width: number, height: number, curve: number) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const safeCurve = Math.min(curve, safeWidth / 2, safeHeight / 2);

  return `path('M 0 0 L ${safeWidth} 0 C ${safeWidth - safeCurve} 0 ${safeWidth - safeCurve} ${safeHeight} ${safeWidth} ${safeHeight} L 0 ${safeHeight} C ${safeCurve} ${safeHeight} ${safeCurve} 0 0 0 Z')`;
}

function estimateCenterBoxWidth(
  config: UnifiedHeaderCenterConfig,
  boxHeight: number,
  aspectCorrection: number,
  substituteVariables: (text: string | undefined) => string,
) {
  if (config.mode === 'A') {
    const leftText = substituteVariables(config.modeA.leftText);
    const rightText = substituteVariables(config.modeA.rightText);
    const textSize = Math.min(config.modeA.textStyle.fontSize, boxHeight);
    const logoSize = Math.min(config.modeA.logo.size, boxHeight) * aspectCorrection;

    return Math.ceil(
      config.sidePadding * 2 +
      estimateTextWidth(leftText, config.modeA.textStyle, textSize) +
      estimateTextWidth(rightText, config.modeA.textStyle, textSize) +
      logoSize +
      config.contentGap * 2 +
      16,
    );
  }

  const mainText = substituteVariables(config.modeB.text);
  const tagline = substituteVariables(config.modeB.tagline);
  const hasTagline = Boolean(tagline);
  const mainFontSize = Math.min(config.modeB.textStyle.fontSize, boxHeight * (hasTagline ? 0.6 : 0.8));
  const taglineFontSize = config.modeB.taglineStyle?.fontSize || mainFontSize * 0.6;
  const iconSize = Math.min(config.modeB.iconSize, boxHeight * 0.55);
  const leftIcons = config.modeB.leftIcons || (config.modeB.icons ? [config.modeB.icons[0], config.modeB.icons[1]] : []);
  const rightIcons = config.modeB.rightIcons || (config.modeB.icons ? [config.modeB.icons[2], config.modeB.icons[3]] : []);
  const leftIconCount = leftIcons.filter(Boolean).length;
  const rightIconCount = rightIcons.filter(Boolean).length;
  const leftIconsWidth = leftIconCount > 0 ? leftIconCount * iconSize + Math.max(0, leftIconCount - 1) * Math.max(0, config.modeB.pairGap) : 0;
  const rightIconsWidth = rightIconCount > 0 ? rightIconCount * iconSize + Math.max(0, rightIconCount - 1) * Math.max(0, config.modeB.pairGap) : 0;
  const mainContentWidth = config.modeB.logo
    ? Math.max(mainFontSize * 1.8, iconSize * 1.8)
    : estimateTextWidth(mainText, config.modeB.textStyle, mainFontSize);
  const taglineWidth = tagline
    ? estimateTextWidth(tagline, config.modeB.taglineStyle ?? config.modeB.textStyle, taglineFontSize)
    : 0;

  return Math.ceil(Math.max(
    config.sidePadding * 2 + leftIconsWidth + rightIconsWidth + mainContentWidth + config.contentGap * 2 + 20,
    config.sidePadding * 2 + taglineWidth + 20,
  ));
}

export interface UnifiedHeaderProps {
  config?: UnifiedHeaderConfigInput;
  profileName?: string;
  leftContent?: React.ReactNode;
  rightSuffixContent?: React.ReactNode;
  dynamicData?: Record<string, string>;
  showPrimaryNavigation?: boolean;
  showDebugControls?: boolean;
  includeAdminNavigation?: boolean;
  primaryNavigationItems?: Array<{
    label: string;
    path: string;
    matchPrefixes?: string[];
  }>;
  onResolvedConfigChange?: (config: UnifiedHeaderConfig) => void;
}

function mergeHeaderConfig(
  baseConfig?: UnifiedHeaderConfigInput,
  overrideConfig?: UnifiedHeaderConfigInput,
): UnifiedHeaderConfigInput {
  return {
    ...baseConfig,
    ...overrideConfig,
    layout: {
      ...baseConfig?.layout,
      ...overrideConfig?.layout,
    },
    style: {
      ...baseConfig?.style,
      ...overrideConfig?.style,
    },
    left: {
      ...baseConfig?.left,
      ...overrideConfig?.left,
    },
    right: {
      ...baseConfig?.right,
      ...overrideConfig?.right,
      ...(baseConfig?.right?.textStyle || overrideConfig?.right?.textStyle
        ? {
            textStyle: {
              ...baseConfig?.right?.textStyle,
              ...overrideConfig?.right?.textStyle,
            },
          }
        : {}),
      ...(baseConfig?.right?.user || overrideConfig?.right?.user
        ? {
            user: {
              ...baseConfig?.right?.user,
              ...overrideConfig?.right?.user,
            },
          }
        : {}),
    },
    center: {
      ...baseConfig?.center,
      ...overrideConfig?.center,
      modeA: {
        ...baseConfig?.center?.modeA,
        ...overrideConfig?.center?.modeA,
        ...(baseConfig?.center?.modeA?.textStyle || overrideConfig?.center?.modeA?.textStyle
          ? {
              textStyle: {
                ...baseConfig?.center?.modeA?.textStyle,
                ...overrideConfig?.center?.modeA?.textStyle,
              },
            }
          : {}),
        ...(baseConfig?.center?.modeA?.logo || overrideConfig?.center?.modeA?.logo
          ? {
              logo: {
                ...baseConfig?.center?.modeA?.logo,
                ...overrideConfig?.center?.modeA?.logo,
              },
            }
          : {}),
      },
      modeB: {
        ...baseConfig?.center?.modeB,
        ...overrideConfig?.center?.modeB,
        ...(baseConfig?.center?.modeB?.textStyle || overrideConfig?.center?.modeB?.textStyle
          ? {
              textStyle: {
                ...baseConfig?.center?.modeB?.textStyle,
                ...overrideConfig?.center?.modeB?.textStyle,
              },
            }
          : {}),
        ...(baseConfig?.center?.modeB?.taglineStyle || overrideConfig?.center?.modeB?.taglineStyle
          ? {
              taglineStyle: {
                ...baseConfig?.center?.modeB?.taglineStyle,
                ...overrideConfig?.center?.modeB?.taglineStyle,
              },
            }
          : {}),
      },
    },
    navigation: {
      ...baseConfig?.navigation,
      ...overrideConfig?.navigation,
    },
    metadata: {
      ...baseConfig?.metadata,
      ...overrideConfig?.metadata,
    },
  } as UnifiedHeaderConfigInput;
}

function sanitizeProfileConfig(config?: UnifiedHeaderConfigInput): UnifiedHeaderConfigInput | undefined {
  if (!config) {
    return undefined;
  }

  const sanitizeIcon = (icon?: HeaderIconType) => typeof icon === 'string' && icon.trim() ? icon.trim() : undefined;
  const sanitizeIconArray = (icons?: HeaderIconType[]) => {
    const next = (icons ?? []).map((icon) => sanitizeIcon(icon)).filter((icon): icon is string => Boolean(icon));
    return next.length > 0 ? next : undefined;
  };

  return {
    ...config,
    left: config.left
      ? {
          ...config.left,
          onClick: undefined,
          icon: sanitizeIcon(config.left.icon),
          customRenderer: undefined,
        }
      : config.left,
    right: config.right
      ? {
          ...config.right,
          user: undefined,
          isProfile: undefined,
          onClick: undefined,
          onLogout: undefined,
          onUpgradeGuestClick: undefined,
          onAdminDashboardClick: undefined,
          onViewProfileClick: undefined,
          onSettingsClick: undefined,
          onSecurityClick: undefined,
          onUpdatePhoto: undefined,
          getAvatars: undefined,
          customRenderer: undefined,
        }
      : config.right,
    center: config.center
      ? {
          ...config.center,
          customRenderer: undefined,
          modeA: config.center.modeA
            ? {
                ...config.center.modeA,
                logo: config.center.modeA.logo
                  ? {
                      ...config.center.modeA.logo,
                      renderer: undefined,
                    }
                  : config.center.modeA.logo,
              }
            : config.center.modeA,
          modeB: config.center.modeB
            ? {
                ...config.center.modeB,
                logo: sanitizeIcon(config.center.modeB.logo),
                icons: sanitizeIconArray(config.center.modeB.icons),
                leftIcons: sanitizeIconArray(config.center.modeB.leftIcons),
                rightIcons: sanitizeIconArray(config.center.modeB.rightIcons),
              }
            : config.center.modeB,
        }
      : config.center,
  };
}

function applyRuntimeOverlay(
  profileConfig: UnifiedHeaderConfig,
  runtimeOverlay?: UnifiedHeaderConfigInput,
): UnifiedHeaderConfig {
  if (!runtimeOverlay) {
    return profileConfig;
  }

  return {
    ...profileConfig,
    navigation: {
      ...profileConfig.navigation,
      ...runtimeOverlay.navigation,
    },
    left: {
      ...profileConfig.left,
      ...(runtimeOverlay.left?.onClick !== undefined ? { onClick: runtimeOverlay.left.onClick } : {}),
      ...(runtimeOverlay.left?.icon !== undefined ? { icon: runtimeOverlay.left.icon } : {}),
      ...(runtimeOverlay.left?.isButton !== undefined ? { isButton: runtimeOverlay.left.isButton } : {}),
      ...(runtimeOverlay.left?.ariaLabel !== undefined ? { ariaLabel: runtimeOverlay.left.ariaLabel } : {}),
    },
    right: {
      ...profileConfig.right,
      ...(runtimeOverlay.right?.text !== undefined ? { text: runtimeOverlay.right.text } : {}),
      ...(runtimeOverlay.right?.user !== undefined
        ? {
            user: {
              ...profileConfig.right.user,
              ...runtimeOverlay.right.user,
            },
          }
        : {}),
      ...(runtimeOverlay.right?.isProfile !== undefined ? { isProfile: runtimeOverlay.right.isProfile } : {}),
      ...(runtimeOverlay.right?.onClick !== undefined ? { onClick: runtimeOverlay.right.onClick } : {}),
      ...(runtimeOverlay.right?.onLogout !== undefined ? { onLogout: runtimeOverlay.right.onLogout } : {}),
      ...(runtimeOverlay.right?.onUpgradeGuestClick !== undefined ? { onUpgradeGuestClick: runtimeOverlay.right.onUpgradeGuestClick } : {}),
      ...(runtimeOverlay.right?.onAdminDashboardClick !== undefined ? { onAdminDashboardClick: runtimeOverlay.right.onAdminDashboardClick } : {}),
      ...(runtimeOverlay.right?.onViewProfileClick !== undefined ? { onViewProfileClick: runtimeOverlay.right.onViewProfileClick } : {}),
      ...(runtimeOverlay.right?.onSettingsClick !== undefined ? { onSettingsClick: runtimeOverlay.right.onSettingsClick } : {}),
      ...(runtimeOverlay.right?.onSecurityClick !== undefined ? { onSecurityClick: runtimeOverlay.right.onSecurityClick } : {}),
      ...(runtimeOverlay.right?.onUpdatePhoto !== undefined ? { onUpdatePhoto: runtimeOverlay.right.onUpdatePhoto } : {}),
      ...(runtimeOverlay.right?.getAvatars !== undefined ? { getAvatars: runtimeOverlay.right.getAvatars } : {}),
      ...(runtimeOverlay.right?.isButton !== undefined ? { isButton: runtimeOverlay.right.isButton } : {}),
      ...(runtimeOverlay.right?.ariaLabel !== undefined ? { ariaLabel: runtimeOverlay.right.ariaLabel } : {}),
    },
    center: {
      ...profileConfig.center,
      ...(runtimeOverlay.center?.mode !== undefined ? { mode: runtimeOverlay.center.mode } : {}),
      ...(runtimeOverlay.center?.customRenderer !== undefined ? { customRenderer: runtimeOverlay.center.customRenderer } : {}),
      modeA: {
        ...profileConfig.center.modeA,
        ...(runtimeOverlay.center?.modeA?.leftText !== undefined ? { leftText: runtimeOverlay.center.modeA.leftText } : {}),
        ...(runtimeOverlay.center?.modeA?.rightText !== undefined ? { rightText: runtimeOverlay.center.modeA.rightText } : {}),
        logo: {
          ...profileConfig.center.modeA.logo,
          ...(runtimeOverlay.center?.modeA?.logo?.renderer !== undefined ? { renderer: runtimeOverlay.center.modeA.logo.renderer } : {}),
        },
      },
      modeB: {
        ...profileConfig.center.modeB,
        ...(runtimeOverlay.center?.modeB?.text !== undefined ? { text: runtimeOverlay.center.modeB.text } : {}),
        ...(runtimeOverlay.center?.modeB?.tagline !== undefined ? { tagline: runtimeOverlay.center.modeB.tagline } : {}),
        ...(runtimeOverlay.center?.modeB?.logo !== undefined ? { logo: runtimeOverlay.center.modeB.logo } : {}),
        ...(runtimeOverlay.center?.modeB?.icons !== undefined ? { icons: runtimeOverlay.center.modeB.icons } : {}),
        ...(runtimeOverlay.center?.modeB?.leftIcons !== undefined ? { leftIcons: runtimeOverlay.center.modeB.leftIcons } : {}),
        ...(runtimeOverlay.center?.modeB?.rightIcons !== undefined ? { rightIcons: runtimeOverlay.center.modeB.rightIcons } : {}),
      },
    },
  };
}

function renderHeaderIcon(renderer: HeaderIconType | undefined, args: HeaderIconRenderArgs) {
  if (!renderer) {
    return null;
  }

  if (typeof renderer === 'string') {
    return (
      <image
        href={renderer}
        x={args.cx - args.size / 2}
        y={args.cy - args.size / 2}
        width={args.size}
        height={args.size}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }

  return renderer(args);
}

function fillValue(fill: FillStyle, ids: Record<string, string>, style: TextStyleConfig) {
  if (fill === 'flat') {
    return style.customFlatFill;
  }

  if (fill === 'custom') {
    return `url(#${ids.customGradient})`;
  }

  return `url(#${ids[`gradient${fill}`]})`;
}

function edgeValue(edge: EdgeStyle, style: TextStyleConfig) {
  switch (edge) {
    case 'none':
      return 'transparent';
    case 'dark':
      return 'rgba(32,18,4,0.78)';
    case 'gold':
      return 'rgba(255,220,122,0.9)';
    case 'light':
      return 'rgba(255,255,255,0.65)';
    case 'ember':
      return 'rgba(255,99,30,0.8)';
    case 'custom':
      return style.customEdgeColor;
    default:
      return style.customEdgeColor;
  }
}

function shadowFilter(shadow: ShadowStyle, ids: Record<string, string>) {
  if (shadow === 'none') {
    return undefined;
  }

  return `url(#${ids[`shadow${shadow}`]})`;
}

function resolveAnchorPosition(anchor: TextAnchorMode, start: number, end: number) {
  if (anchor === 'start') {
    return start;
  }

  if (anchor === 'end') {
    return end;
  }

  return (start + end) / 2;
}

function renderBackdropShape(style: CSSProperties, key: string) {
  return <div key={key} className={styles.headerBackdropShape} style={style} />;
}

export function UnifiedHeader({ 
  config: inputConfig, 
  profileName,
  leftContent,
  rightSuffixContent,
  dynamicData = {},
  showPrimaryNavigation = true,
  showDebugControls = true,
  includeAdminNavigation = false,
  primaryNavigationItems,
  onResolvedConfigChange,
}: UnifiedHeaderProps) {
  const derivedConfig = useMemo<UnifiedHeaderConfigInput>(() => {
    const hasModeBDynamicContent = Boolean(dynamicData.gameName || dynamicData.tagline);
    if (!hasModeBDynamicContent) {
      return {};
    }

    return {
      center: {
        mode: 'B',
        modeB: {
          text: '{{gameName}}',
          tagline: '{{tagline}}',
        },
      },
    };
  }, [dynamicData.gameName, dynamicData.tagline]);

  const runtimeConfig = useMemo(
    () => mergeHeaderConfig(derivedConfig, inputConfig),
    [derivedConfig, inputConfig],
  );

  const defaultEditableConfig = useMemo(() => {
    const initialProfileConfig = getBundledProfileConfig(profileName || DEFAULT_PROFILE_NAME);
    const next = createUnifiedHeaderConfig(sanitizeProfileConfig(initialProfileConfig ?? undefined));
    return {
      ...next,
      layout: normalizeLayoutConfig(next.layout),
    };
  }, [profileName]);
  const [initialConfig, setInitialConfig] = useState<UnifiedHeaderConfig>(defaultEditableConfig);
  const [config, setConfig] = useState<UnifiedHeaderConfig>(defaultEditableConfig);
  const [showControls, setShowControls] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [failedProfileAvatarUrl, setFailedProfileAvatarUrl] = useState<string | null>(null);
  const [profileDropdownAnchor, setProfileDropdownAnchor] = useState<{
    top: number;
    right: number;
    maxHeight: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<DebugTab>('layout');
  const [layoutSubtab, setLayoutSubtab] = useState<LayoutSubtab>('global');
  const [centerPanelTab, setCenterPanelTab] = useState<CenterPanelTab>('general');
  const [activeProfile, setActiveProfile] = useState(profileName || DEFAULT_PROFILE_NAME);
  const [selectedProfile, setSelectedProfile] = useState(profileName || DEFAULT_PROFILE_NAME);
  const [newProfileName, setNewProfileName] = useState('');
  const [profileStatus, setProfileStatus] = useState('');
  const [profiles, setProfiles] = useState<string[]>(Array.from(new Set([DEFAULT_PROFILE_NAME, ...bundledProfileNames])));
  const profileCacheRef = useRef<Record<string, UnifiedHeaderConfigInput | null>>({});
  const profileAvatarUrl = config.right.user?.avatarUrl?.trim() || '';
  const profileAvatarLoadFailed = Boolean(profileAvatarUrl) && failedProfileAvatarUrl === profileAvatarUrl;
  const isGuestUser = Boolean(config.right.user?.isGuest);

  const handleGuestUpgrade = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(AUTH_MODE_STORAGE_KEY, 'signup');
    }
    config.right.onUpgradeGuestClick?.();
    config.right.onLogout?.();
    setShowProfileDropdown(false);
  }, [config.right]);

  const normalizeLoadedConfig = useCallback(
    (loadedConfig?: UnifiedHeaderConfigInput) => {
      const next = createUnifiedHeaderConfig(sanitizeProfileConfig(loadedConfig));
      return {
        ...next,
        layout: normalizeLayoutConfig(next.layout),
      };
    },
    [],
  );

  // Helper to substitute {{var}} in strings
  const substituteVariables = useCallback((text: string | undefined): string => {
    if (!text) return '';
    if (!dynamicData) return text;
    return text.replace(/\{\{(.*?)\}\}/g, (match, key) => dynamicData[key.trim()] || match);
  }, [dynamicData]);

  const loadProfileConfig = useCallback(async (name: string) => {
    if (profileCacheRef.current[name] !== undefined) {
      return profileCacheRef.current[name];
    }

    try {
      if (typeof window !== 'undefined' && (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const savedJson = await invoke<string>('load_config', { name });
        const saved = parseUnifiedHeaderProfileDocument(JSON.parse(savedJson));
        profileCacheRef.current[name] = saved.config;
        return saved.config;
      }

      if (typeof window !== 'undefined') {
        const { LocalApiEndpoint } = await import('@ocentra/endpoint-domain/constants/local');
        const res = await fetch(`${LocalApiEndpoint.HeaderConfig}?name=${name}`);
        if (res.ok) {
          const saved = parseUnifiedHeaderProfileDocument(await res.json());
          profileCacheRef.current[name] = saved.config;
          return saved.config;
        }
      }
    } catch {
      // Fall through to bundled profile fallback.
    }

    const bundledPath = `./profiles/${name}.json`;
    const bundledEntry = BUNDLED_PROFILES[bundledPath];
    if (bundledEntry) {
      const bundledModule = bundledEntry as { default?: unknown };
      const bundledCandidate = bundledModule.default ?? bundledEntry;
      if (bundledCandidate && typeof bundledCandidate === 'object' && 'config' in (bundledCandidate as Record<string, unknown>)) {
        const bundledDocument = parseUnifiedHeaderProfileDocument(bundledCandidate);
        profileCacheRef.current[name] = bundledDocument.config;
        return bundledDocument.config;
      }

      const bundledConfig = parseSerializedUnifiedHeaderConfig(bundledCandidate);
      profileCacheRef.current[name] = bundledConfig;
      return bundledConfig;
    }

    profileCacheRef.current[name] = null;
    return null;
  }, []);

  const loadProfileIntoState = useCallback(async (name: string) => {
    const loadedConfig = await loadProfileConfig(name);
    if (loadedConfig) {
      const normalizedConfig = normalizeLoadedConfig(loadedConfig);
      setConfig(normalizedConfig);
      setInitialConfig(normalizedConfig);
      setActiveProfile(name);
      setSelectedProfile(name);
      setProfileStatus(`Loaded ${name}.json`);
      return true;
    }

    return false;
  }, [loadProfileConfig, normalizeLoadedConfig]);

  const resolveRouteProfile = useCallback(async (pathname: string) => {
    if (profileName) {
      return profileName;
    }

    for (const name of profiles) {
      const candidate = await loadProfileConfig(name);
      if (candidate && pathMatchesProfile(pathname, candidate)) {
        return name;
      }
    }

    return profiles.includes(DEFAULT_PROFILE_NAME) ? DEFAULT_PROFILE_NAME : null;
  }, [loadProfileConfig, profileName, profiles]);

  const resolved = useMemo(() => {
    const next = applyRuntimeOverlay(config, runtimeConfig);
    return {
      ...next,
      layout: normalizeLayoutConfig(next.layout),
    };
  }, [config, runtimeConfig]);
  const { layout, style, left, center, right } = resolved;
  const shouldShowPrimaryNavigation = showPrimaryNavigation && resolved.navigation.enabled;
  const navTop = layout.height + resolved.navigation.gapBelowHeader;
  const navDividerHeight = shouldShowPrimaryNavigation ? 1 : 0;
  const navBlockHeight = shouldShowPrimaryNavigation ? resolved.navigation.height + navDividerHeight : 0;
  const initialViewWidth = 1000;
  const svgHeight = HEADER_SVG_HEIGHT;
  const [renderedSize, setRenderedSize] = useState({ width: initialViewWidth, height: svgHeight });
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const initProfiles = async () => {
      try {
        let availableProfiles = Array.from(new Set([DEFAULT_PROFILE_NAME, ...bundledProfileNames]));

        if (typeof window !== 'undefined' && (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
          const { invoke } = await import('@tauri-apps/api/core');
          const savedProfiles = await invoke<string[]>('list_configs');
          if (savedProfiles.length > 0) {
            availableProfiles = Array.from(new Set([...availableProfiles, ...savedProfiles]));
          }
        } else if (typeof window !== 'undefined') {
          const { LocalApiEndpoint } = await import('@ocentra/endpoint-domain/constants/local');
          const response = await fetch(LocalApiEndpoint.HeaderConfig);
          const contentType = response.headers.get('content-type') ?? '';
          if (response.ok && contentType.includes('application/json')) {
            const savedProfiles = await response.json();
            if (Array.isArray(savedProfiles) && savedProfiles.length > 0) {
              availableProfiles = Array.from(new Set([...availableProfiles, ...savedProfiles]));
            }
          }
        }

        setProfiles(availableProfiles);
      } catch (e) {
        console.error('Failed to list header profiles:', e);
      }
    };

    void initProfiles();
  }, [svgHeight]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleLocationChange = async () => {
      const matchedProfile = await resolveRouteProfile(window.location.pathname);

      if (matchedProfile && await loadProfileIntoState(matchedProfile)) {
        return;
      }

      if (matchedProfile !== DEFAULT_PROFILE_NAME && await loadProfileIntoState(DEFAULT_PROFILE_NAME)) {
        return;
      }

      const fallbackConfig = normalizeLoadedConfig();
      setConfig(fallbackConfig);
      setInitialConfig(fallbackConfig);
      setActiveProfile(DEFAULT_PROFILE_NAME);
      setSelectedProfile(DEFAULT_PROFILE_NAME);
      setProfileStatus('Using runtime fallback');
    };

    void handleLocationChange();
  }, [loadProfileIntoState, normalizeLoadedConfig, profileName, profiles, resolveRouteProfile]);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element || typeof window === 'undefined') return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setRenderedSize({ width: rect.width || initialViewWidth, height: rect.height || svgHeight });
    };

    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, [svgHeight]);

  const updateLayout = (patch: Partial<UnifiedHeaderLayoutConfig>) =>
    setConfig((current) => ({ ...current, layout: normalizeLayoutConfig({ ...current.layout, ...patch }) }));

  const updateStyle = (patch: Partial<UnifiedHeaderStyleConfig>) =>
    setConfig((current) => ({ ...current, style: { ...current.style, ...patch } }));

  const updateLeft = (patch: Partial<UnifiedHeaderLeftConfig>) =>
    setConfig((current) => ({ ...current, left: { ...current.left, ...patch } }));

  const updateRight = (patch: Partial<UnifiedHeaderRightConfig>) =>
    setConfig((current) => ({ ...current, right: { ...current.right, ...patch } }));

  const updateCenter = (patch: Partial<UnifiedHeaderCenterConfig>) =>
    setConfig((current) => ({ ...current, center: { ...current.center, ...patch } }));

  const updateCenterA = (patch: Partial<CenterModeAConfig>) =>
    setConfig((current) => ({
      ...current,
      center: {
        ...current.center,
        modeA: { ...current.center.modeA, ...patch },
      },
    }));

  const updateCenterB = (patch: Partial<CenterModeBConfig>) =>
    setConfig((current) => ({
      ...current,
      center: {
        ...current.center,
        modeB: { ...current.center.modeB, ...patch },
      },
    }));

  const updateNavigation = (patch: Partial<UnifiedHeaderNavigationConfig>) =>
    setConfig((current) => ({
      ...current,
      navigation: { ...current.navigation, ...patch },
    }));

  const getModeBIconValue = (icon?: HeaderIconType) => typeof icon === 'string' ? icon : '';

  const updateModeBIcon = (side: 'leftIcons' | 'rightIcons', index: number, value: string) => {
    const nextIcons = [...(config.center.modeB[side] || [])];
    if (value.trim()) {
      nextIcons[index] = value.trim();
    } else {
      nextIcons.splice(index, 1, ...(nextIcons.length > index + 1 ? [''] : []));
      while (nextIcons.length > 0 && !nextIcons[nextIcons.length - 1]) {
        nextIcons.pop();
      }
    }
    updateCenterB({ [side]: nextIcons } as Partial<CenterModeBConfig>);
  };

  const handleLoadSelectedProfile = async () => {
    const targetProfile = selectedProfile || DEFAULT_PROFILE_NAME;
    if (await loadProfileIntoState(targetProfile)) {
      return;
    }

    setProfileStatus(`Profile ${targetProfile}.json not found`);
  };

  const handleSaveProfile = async () => {
    const targetProfile = newProfileName.trim() || activeProfile || DEFAULT_PROFILE_NAME;

    try {
      const serializedConfig = parseSerializedUnifiedHeaderConfig(sanitizeProfileConfig(config));
      const content = JSON.stringify({ profile: targetProfile, config: serializedConfig }, null, 2);

      if (typeof window !== 'undefined' && (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_config', { name: targetProfile, content });
      } else if (typeof window !== 'undefined') {
        const { LocalApiEndpoint } = await import('@ocentra/endpoint-domain/constants/local');
        const response = await fetch(LocalApiEndpoint.HeaderConfig, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: targetProfile, content }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      }

      profileCacheRef.current[targetProfile] = serializedConfig ?? null;
      if (!profiles.includes(targetProfile)) {
        setProfiles((current) => [...current, targetProfile]);
      }
      setInitialConfig(config);
      setActiveProfile(targetProfile);
      setSelectedProfile(targetProfile);
      setNewProfileName('');
      setProfileStatus(`Saved ${targetProfile}.json`);
    } catch (error) {
      console.error('Save failed:', error);
      setProfileStatus(`Save failed for ${targetProfile}.json`);
    }
  };

  useEffect(() => {
    onResolvedConfigChange?.(resolved);
  }, [onResolvedConfigChange, resolved]);

  const renderDebugPanel = () => {
    const defaultTaglineStyle: TextStyleConfig = config.center.modeB.taglineStyle ?? {
      fontFamily: SAFE_SYSTEM_FONTS[14].value,
      fontSize: Math.max(10, Math.round(config.center.modeB.textStyle.fontSize * 0.45)),
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
      customColorA: config.center.modeB.textStyle.customColorA,
      customColorB: config.center.modeB.textStyle.customColorB,
      customColorC: config.center.modeB.textStyle.customColorC,
      customFlatFill: config.center.modeB.textStyle.customFlatFill,
      customEdgeColor: config.center.modeB.textStyle.customEdgeColor,
      customShadowColor: config.center.modeB.textStyle.customShadowColor,
      customShadowBlur: 0,
      customShadowX: 0,
      customShadowY: 0,
    };

    return (
      <div className={styles.debugPanel}>
        <div className={styles.debugPanelHeader}>Header Tuning</div>

        <div className={styles.debugTabs}>
          {(['layout', 'profiles'] as const).map((tab) => (
            <button
              key={tab}
              className={`${styles.debugTabButton} ${activeTab === tab ? styles.active : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'layout' ? 'Layout' : 'Profiles'}
            </button>
          ))}
          <button
            className={styles.debugTabButton}
            style={{ marginLeft: 'auto', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}
            onClick={() => setConfig(initialConfig)}
          >
            Reset All
          </button>
        </div>

        {activeTab === 'layout' && (
          <div className={styles.debugSubtabs}>
            {(['global', 'home', 'wings', 'center', 'login', 'nav'] as const).map((tab) => (
              <button
                key={tab}
                className={`${styles.debugSubtabButton} ${layoutSubtab === tab ? styles.active : ''}`}
                onClick={() => setLayoutSubtab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        )}

        <div className={styles.debugScrollArea}>
          {activeTab === 'layout' && layoutSubtab === 'global' && (
            <>
              <div className={styles.debugSectionHeader}><span>Global Layout</span></div>
              <Control label="Height" path="layout.height" hint="Overall header height." value={config.layout.height} min={36} max={120} step={1} onChange={(v) => updateLayout({ height: v })} onReset={() => updateLayout({ height: initialConfig.layout.height })} />
              <ToggleControl label="Limit width" path="layout.maxWidth" hint="Enable a maximum header width." value={Boolean(config.layout.maxWidth)} onChange={(v) => updateLayout({ maxWidth: v ? 1920 : undefined })} />
              <Control label="Max width" path="layout.maxWidth" value={config.layout.maxWidth || 1920} min={640} max={5120} step={10} onChange={(v) => updateLayout({ maxWidth: v })} />
              <Control label="Outer margin" path="layout.outerMargin" value={config.layout.outerMargin} min={0} max={60} step={1} onChange={(v) => updateLayout({ outerMargin: v })} />
              <Control label="Box gap" path="layout.boxGap" hint="Gap between pills and connector bars." value={config.layout.boxGap} min={0} max={40} step={1} onChange={(v) => updateLayout({ boxGap: v })} />
              <Control label="Pill height" path="layout.boxHeight" value={config.layout.boxHeight} min={36} max={72} step={1} onChange={(v) => updateLayout({ boxHeight: v })} />
              <Control label="Center min width" path="layout.centerMinWidth" value={config.layout.centerMinWidth} min={60} max={320} step={1} onChange={(v) => updateLayout({ centerMinWidth: v })} />

              <div className={styles.debugDivider}>Global surface</div>
              <ColorControl label="Tint color" path="style.tintColor" value={config.style.tintColor} onChange={(v) => updateStyle({ tintColor: v })} />
              <ColorControl label="Edge color" path="style.edgeColor" value={config.style.edgeColor} onChange={(v) => updateStyle({ edgeColor: v })} />
              <ColorControl label="Circle fill" path="style.circleFillColor" value={config.style.circleFillColor} onChange={(v) => updateStyle({ circleFillColor: v })} />
              <Control label="Box opacity" path="style.boxOpacity" value={config.style.boxOpacity} min={0} max={1} step={0.01} onChange={(v) => updateStyle({ boxOpacity: v })} />
              <Control label="Pill glow" path="style.pillGlowBlur" value={config.style.pillGlowBlur} min={0} max={20} step={0.1} onChange={(v) => updateStyle({ pillGlowBlur: v })} />
              <Control label="Backdrop blur" path="style.backdropBlur" value={config.style.backdropBlur} min={0} max={40} step={1} onChange={(v) => updateStyle({ backdropBlur: v })} />
              <Control label="Icon glow" path="style.iconGlowBlur" hint="Global glow for icons, logos, and avatars only." value={config.style.iconGlowBlur} min={0} max={12} step={0.1} onChange={(v) => updateStyle({ iconGlowBlur: v })} />

              <div className={styles.debugDivider}>Hover</div>
              <ColorControl label="Hover tint" path="style.hoverTintColor" value={config.style.hoverTintColor} onChange={(v) => updateStyle({ hoverTintColor: v })} />
              <ColorControl label="Hover edge" path="style.hoverEdgeColor" value={config.style.hoverEdgeColor} onChange={(v) => updateStyle({ hoverEdgeColor: v })} />
              <Control label="Hover boost" path="style.hoverBoxOpacityBoost" value={config.style.hoverBoxOpacityBoost} min={0} max={0.4} step={0.01} onChange={(v) => updateStyle({ hoverBoxOpacityBoost: v })} />
            </>
          )}

          {activeTab === 'layout' && layoutSubtab === 'home' && (
            <>
              <div className={styles.debugSectionHeader}><span>Home Pill</span></div>
              <TextInput label="Label" path="left.text" value={config.left.text} onChange={(v) => updateLeft({ text: v })} />
              <Control label="Expanded width" path="layout.leftExpandedWidth" value={config.layout.leftExpandedWidth} min={72} max={240} step={1} onChange={(v) => updateLayout({ leftExpandedWidth: v })} />
              <Control label="Collapsed width" path="layout.leftCollapsedWidth" value={config.layout.leftCollapsedWidth} min={40} max={120} step={1} onChange={(v) => updateLayout({ leftCollapsedWidth: v })} />
              <Control label="Collapse at" path="layout.leftCollapseWidth" hint="Viewport width threshold for collapsing to icon-only." value={config.layout.leftCollapseWidth} min={320} max={1600} step={10} onChange={(v) => updateLayout({ leftCollapseWidth: v })} />
              <Control label="Icon size" path="left.iconSize" value={config.left.iconSize} min={8} max={44} step={1} onChange={(v) => updateLeft({ iconSize: v })} />
              <Control label="Icon offset X" path="left.iconOffsetX" value={config.left.iconOffsetX} min={-30} max={30} step={1} onChange={(v) => updateLeft({ iconOffsetX: v })} />
              <Control label="Icon offset Y" path="left.iconOffsetY" value={config.left.iconOffsetY} min={-20} max={20} step={1} onChange={(v) => updateLeft({ iconOffsetY: v })} />
              <ToggleControl label="Button" path="left.isButton" value={config.left.isButton ?? false} onChange={(v) => updateLeft({ isButton: v })} />
              <TextStyleControls
                title="Home text"
                value={config.left.textStyle}
                pathPrefix="left.textStyle"
                onChange={(next) => updateLeft({ textStyle: next })}
              />
            </>
          )}

          {activeTab === 'layout' && layoutSubtab === 'wings' && (
            <>
              <div className={styles.debugSectionHeader}><span>Connector Bars</span></div>
              <Control label="Curve" path="layout.wingCurve" value={config.layout.wingCurve} min={0} max={60} step={1} onChange={(v) => updateLayout({ wingCurve: v })} />
              <Control label="Underlap" path="layout.wingUnderlap" value={config.layout.wingUnderlap} min={0} max={60} step={1} onChange={(v) => updateLayout({ wingUnderlap: v })} />
              <Control label="Thickness" path="layout.wingHeight" value={config.layout.wingHeight} min={0} max={36} step={1} onChange={(v) => updateLayout({ wingHeight: v })} />
              <Control label="Opacity" path="style.wingOpacity" value={config.style.wingOpacity} min={0} max={0.8} step={0.01} onChange={(v) => updateStyle({ wingOpacity: v })} />
            </>
          )}

          {activeTab === 'layout' && layoutSubtab === 'center' && (
            <>
              <div className={styles.debugSectionHeader}><span>Center Pill</span></div>
              <div className={styles.debugTextTabs}>
                {([
                  { value: 'general', label: 'General' },
                  { value: 'modeA', label: 'Mode A' },
                  { value: 'modeB', label: 'Mode B' },
                ] as const).map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    className={`${styles.debugTextTabButton} ${centerPanelTab === tab.value ? styles.active : ''}`}
                    onClick={() => setCenterPanelTab(tab.value)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {centerPanelTab === 'general' && (
                <>
                  <label className={styles.debugSelectLabel}>
                    <span title="center.mode">Mode</span>
                    <select value={config.center.mode} onChange={(e) => updateCenter({ mode: e.target.value as CenterMode })}>
                      <option value="A">A</option>
                      <option value="B">B</option>
                    </select>
                  </label>
                  <Control label="Preferred width" path="layout.centerWidth" value={config.layout.centerWidth} min={96} max={520} step={1} onChange={(v) => updateLayout({ centerWidth: v })} />
                  <Control label="Min width" path="layout.centerMinWidth" value={config.layout.centerMinWidth} min={60} max={320} step={1} onChange={(v) => updateLayout({ centerMinWidth: v })} />
                  <Control label="Side padding" path="center.sidePadding" value={config.center.sidePadding} min={0} max={40} step={1} onChange={(v) => updateCenter({ sidePadding: v })} />
                  <Control label="Content gap" path="center.contentGap" value={config.center.contentGap} min={0} max={24} step={1} onChange={(v) => updateCenter({ contentGap: v })} />
                </>
              )}

              {centerPanelTab === 'modeA' && (
                <>
                  <TextInput label="Left text" path="center.modeA.leftText" value={config.center.modeA.leftText} onChange={(v) => updateCenterA({ leftText: v })} />
                  <TextInput label="Right text" path="center.modeA.rightText" value={config.center.modeA.rightText} onChange={(v) => updateCenterA({ rightText: v })} />
                  <SelectControl label="Left align" path="center.modeA.leftTextAlign" hint="Anchor for the left title text inside its half." value={config.center.modeA.leftTextAlign} onChange={(next) => updateCenterA({ leftTextAlign: next as TextAnchorMode })} options={[{ value: 'start', label: 'left' }, { value: 'middle', label: 'center' }, { value: 'end', label: 'right' }]} />
                  <SelectControl label="Right align" path="center.modeA.rightTextAlign" hint="Anchor for the right title text inside its half." value={config.center.modeA.rightTextAlign} onChange={(next) => updateCenterA({ rightTextAlign: next as TextAnchorMode })} options={[{ value: 'start', label: 'left' }, { value: 'middle', label: 'center' }, { value: 'end', label: 'right' }]} />
                  <Control label="Logo size" path="center.modeA.logo.size" value={config.center.modeA.logo.size} min={8} max={64} step={1} onChange={(v) => updateCenterA({ logo: { ...config.center.modeA.logo, size: v } })} />
                  <Control label="Logo offset X" path="center.modeA.logo.offsetX" value={config.center.modeA.logo.offsetX} min={-24} max={24} step={1} onChange={(v) => updateCenterA({ logo: { ...config.center.modeA.logo, offsetX: v } })} />
                  <Control label="Logo offset Y" path="center.modeA.logo.offsetY" value={config.center.modeA.logo.offsetY} min={-24} max={24} step={1} onChange={(v) => updateCenterA({ logo: { ...config.center.modeA.logo, offsetY: v } })} />
                  <Control label="Logo stroke" path="center.modeA.logo.strokeWidth" value={config.center.modeA.logo.strokeWidth} min={0} max={4} step={0.1} onChange={(v) => updateCenterA({ logo: { ...config.center.modeA.logo, strokeWidth: v } })} />
                  <Control label="Logo fill opacity" path="center.modeA.logo.innerOpacity" value={config.center.modeA.logo.innerOpacity} min={0} max={1} step={0.01} onChange={(v) => updateCenterA({ logo: { ...config.center.modeA.logo, innerOpacity: v } })} />
                  <TextStyleControls
                    title="Mode A text"
                    value={config.center.modeA.textStyle}
                    pathPrefix="center.modeA.textStyle"
                    onChange={(next) => updateCenterA({ textStyle: next })}
                  />
                </>
              )}

              {centerPanelTab === 'modeB' && (
                <>
                  <TextInput label="Main text" path="center.modeB.text" value={config.center.modeB.text || ''} onChange={(v) => updateCenterB({ text: v })} />
                  <TextInput label="Tagline" path="center.modeB.tagline" value={config.center.modeB.tagline || ''} onChange={(v) => updateCenterB({ tagline: v })} />
                  <SelectControl
                    label="Main font"
                    path="center.modeB.textStyle.fontFamily"
                    value={config.center.modeB.textStyle.fontFamily}
                    onChange={(next) => updateCenterB({ textStyle: { ...config.center.modeB.textStyle, fontFamily: next } })}
                    options={SAFE_SYSTEM_FONTS.map((font) => ({ value: font.value, label: font.name }))}
                  />
                  <SelectControl
                    label="Tagline font"
                    path="center.modeB.taglineStyle.fontFamily"
                    value={defaultTaglineStyle.fontFamily}
                    onChange={(next) => updateCenterB({ taglineStyle: { ...defaultTaglineStyle, fontFamily: next } })}
                    options={SAFE_SYSTEM_FONTS.map((font) => ({ value: font.value, label: font.name }))}
                  />
                  <TextInput label="Center logo image" path="center.modeB.logo" hint="Optional image URL for the center logo in mode B." value={getModeBIconValue(config.center.modeB.logo)} onChange={(v) => updateCenterB({ logo: v.trim() || undefined })} />
                  <Control label="Icon size" path="center.modeB.iconSize" value={config.center.modeB.iconSize} min={8} max={40} step={1} onChange={(v) => updateCenterB({ iconSize: v })} />
                  <Control label="Pair gap" path="center.modeB.pairGap" value={config.center.modeB.pairGap} min={-12} max={20} step={1} onChange={(v) => updateCenterB({ pairGap: v })} />
                  <TextInput label="Left icon 1" path="center.modeB.leftIcons[0]" value={getModeBIconValue(config.center.modeB.leftIcons?.[0])} onChange={(v) => updateModeBIcon('leftIcons', 0, v)} />
                  <TextInput label="Left icon 2" path="center.modeB.leftIcons[1]" value={getModeBIconValue(config.center.modeB.leftIcons?.[1])} onChange={(v) => updateModeBIcon('leftIcons', 1, v)} />
                  <TextInput label="Right icon 1" path="center.modeB.rightIcons[0]" value={getModeBIconValue(config.center.modeB.rightIcons?.[0])} onChange={(v) => updateModeBIcon('rightIcons', 0, v)} />
                  <TextInput label="Right icon 2" path="center.modeB.rightIcons[1]" value={getModeBIconValue(config.center.modeB.rightIcons?.[1])} onChange={(v) => updateModeBIcon('rightIcons', 1, v)} />
                  <TextStyleControls
                    title="Mode B main text"
                    value={config.center.modeB.textStyle}
                    pathPrefix="center.modeB.textStyle"
                    onChange={(next) => updateCenterB({ textStyle: next })}
                  />
                  <TextStyleControls
                    title="Mode B tagline"
                    value={defaultTaglineStyle}
                    pathPrefix="center.modeB.taglineStyle"
                    onChange={(next) => updateCenterB({ taglineStyle: next })}
                  />
                </>
              )}
            </>
          )}

          {activeTab === 'layout' && layoutSubtab === 'login' && (
            <>
              <div className={styles.debugSectionHeader}><span>Login / Profile Pill</span></div>
              <TextInput label="Fallback label" path="right.text" value={config.right.text} onChange={(v) => updateRight({ text: v })} />
              <Control label="Expanded width" path="layout.rightWidth" value={config.layout.rightWidth} min={72} max={300} step={1} onChange={(v) => updateLayout({ rightWidth: v })} />
              <Control label="Collapsed width" path="layout.rightCollapsedWidth" value={config.layout.rightCollapsedWidth} min={40} max={160} step={1} onChange={(v) => updateLayout({ rightCollapsedWidth: v })} />
              <Control label="Collapse at" path="layout.rightCollapseWidth" value={config.layout.rightCollapseWidth} min={320} max={1600} step={10} onChange={(v) => updateLayout({ rightCollapseWidth: v })} />
              <ToggleControl label="Profile mode" path="right.isProfile" value={config.right.isProfile ?? false} onChange={(v) => updateRight({ isProfile: v, user: v ? (config.right.user || { name: 'Player One', isLoggedIn: true }) : config.right.user })} />
              <ToggleControl label="Button" path="right.isButton" value={config.right.isButton ?? false} onChange={(v) => updateRight({ isButton: v })} />
              {config.right.isProfile && (
                <>
                  <TextInput label="User name" path="right.user.name" value={config.right.user?.name || ''} onChange={(v) => updateRight({ user: { ...config.right.user!, name: v } })} />
                  <TextInput label="Avatar URL" path="right.user.avatarUrl" value={config.right.user?.avatarUrl || ''} onChange={(v) => updateRight({ user: { ...config.right.user!, avatarUrl: v } })} />
                </>
              )}
              <TextStyleControls
                title="Login text"
                value={config.right.textStyle}
                pathPrefix="right.textStyle"
                onChange={(next) => updateRight({ textStyle: next })}
              />
              <div className={styles.debugDivider}>Dropdown</div>
              <ColorControl label="Dropdown tint" path="style.dropdownTint" value={config.style.dropdownTint} onChange={(v) => updateStyle({ dropdownTint: v })} />
              <TextInput label="Dropdown border" path="style.dropdownBorderColor" value={config.style.dropdownBorderColor} onChange={(v) => updateStyle({ dropdownBorderColor: v })} />
              <Control label="Section opacity" path="style.dropdownSectionOpacity" value={config.style.dropdownSectionOpacity} min={0} max={0.3} step={0.01} onChange={(v) => updateStyle({ dropdownSectionOpacity: v })} />
            </>
          )}

          {activeTab === 'layout' && layoutSubtab === 'nav' && (
            <>
              <div className={styles.debugSectionHeader}><span>Primary Nav</span></div>
              <ToggleControl label="Enabled" path="navigation.enabled" hint="Show the shared route nav under the header pills on pages that allow it." value={config.navigation.enabled} onChange={(v) => updateNavigation({ enabled: v })} />
              <Control label="Height" path="navigation.height" hint="Overall nav strip height." value={config.navigation.height} min={32} max={86} step={1} onChange={(v) => updateNavigation({ height: v })} />
              <Control label="Gap below header" path="navigation.gapBelowHeader" hint="Measured offset below the visible bottom of the three header pills." value={config.navigation.gapBelowHeader} min={0} max={24} step={1} onChange={(v) => updateNavigation({ gapBelowHeader: v })} />
              <Control label="Outer margin" path="navigation.outerMargin" hint="Horizontal inset from the page edges." value={config.navigation.outerMargin} min={0} max={80} step={1} onChange={(v) => updateNavigation({ outerMargin: v })} />
              <Control label="Panel inset Y" path="navigation.panelInsetY" value={config.navigation.panelInsetY} min={0} max={16} step={1} onChange={(v) => updateNavigation({ panelInsetY: v })} />
              <Control label="Shell inset" path="navigation.shellInset" value={config.navigation.shellInset} min={0} max={16} step={1} onChange={(v) => updateNavigation({ shellInset: v })} />
              <Control label="Panel radius" path="navigation.panelRadius" value={config.navigation.panelRadius} min={0} max={44} step={1} onChange={(v) => updateNavigation({ panelRadius: v })} />
              <Control label="Button radius" path="navigation.buttonRadius" value={config.navigation.buttonRadius} min={0} max={24} step={1} onChange={(v) => updateNavigation({ buttonRadius: v })} />
              <Control label="Min button width" path="navigation.minButtonWidth" value={config.navigation.minButtonWidth} min={50} max={180} step={1} onChange={(v) => updateNavigation({ minButtonWidth: v })} />
              <Control label="Max button width" path="navigation.maxButtonWidth" value={config.navigation.maxButtonWidth} min={90} max={280} step={1} onChange={(v) => updateNavigation({ maxButtonWidth: v })} />
              <Control label="Text side padding" path="navigation.textSidePadding" value={config.navigation.textSidePadding} min={8} max={60} step={1} onChange={(v) => updateNavigation({ textSidePadding: v })} />
              <Control label="Button gap" path="navigation.buttonGap" value={config.navigation.buttonGap} min={0} max={18} step={1} onChange={(v) => updateNavigation({ buttonGap: v })} />
              <Control label="Nav gap" path="navigation.navGap" hint="Gap between overflow arrow shells and the button run." value={config.navigation.navGap} min={0} max={18} step={1} onChange={(v) => updateNavigation({ navGap: v })} />
              <Control label="Text scale" path="navigation.textScale" value={config.navigation.textScale} min={0.28} max={0.6} step={0.01} onChange={(v) => updateNavigation({ textScale: v })} />
              <Control label="Accent inset" path="navigation.accentInset" value={config.navigation.accentInset} min={2} max={24} step={1} onChange={(v) => updateNavigation({ accentInset: v })} />
              <Control label="Arrow inset" path="navigation.sideArrowInset" value={config.navigation.sideArrowInset} min={4} max={18} step={1} onChange={(v) => updateNavigation({ sideArrowInset: v })} />
              <Control label="End curve padding" path="navigation.endCurvePadding" value={config.navigation.endCurvePadding} min={0} max={60} step={1} onChange={(v) => updateNavigation({ endCurvePadding: v })} />

              <div className={styles.debugDivider}>Nav surface</div>
              <ColorControl label="Tint color" path="navigation.tintColor" value={config.navigation.tintColor} onChange={(v) => updateNavigation({ tintColor: v })} />
              <ColorControl label="Edge color" path="navigation.edgeColor" value={config.navigation.edgeColor} onChange={(v) => updateNavigation({ edgeColor: v })} />
              <Control label="Box opacity" path="navigation.boxOpacity" value={config.navigation.boxOpacity} min={0} max={1} step={0.01} onChange={(v) => updateNavigation({ boxOpacity: v })} />
              <ColorControl label="Hover tint" path="navigation.hoverTintColor" value={config.navigation.hoverTintColor} onChange={(v) => updateNavigation({ hoverTintColor: v })} />
              <ColorControl label="Hover edge" path="navigation.hoverEdgeColor" value={config.navigation.hoverEdgeColor} onChange={(v) => updateNavigation({ hoverEdgeColor: v })} />
              <ColorControl label="Active tint" path="navigation.activeTintColor" value={config.navigation.activeTintColor} onChange={(v) => updateNavigation({ activeTintColor: v })} />
              <ColorControl label="Active edge" path="navigation.activeEdgeColor" value={config.navigation.activeEdgeColor} onChange={(v) => updateNavigation({ activeEdgeColor: v })} />
              <Control label="Glow blur" path="navigation.glowBlur" value={config.navigation.glowBlur} min={0} max={20} step={0.1} onChange={(v) => updateNavigation({ glowBlur: v })} />
            </>
          )}

          {activeTab === 'profiles' && (
            <>
              <div className={styles.debugSectionHeader}><span>Profiles</span></div>
              <div className={styles.debugControlRow} style={{ alignItems: 'center', gap: '0.5rem' }}>
                <ControlMeta label="Active profile" path="profile" hint="Currently loaded profile." />
                <span className={styles.debugValueDisplay}>{activeProfile}.json</span>
              </div>
              <div className={styles.debugControlRow} style={{ alignItems: 'center', gap: '0.5rem' }}>
                <ControlMeta label="Load profile" path="selectedProfile" hint="Load another profile into memory without saving yet." />
                <select value={selectedProfile} onChange={(e) => setSelectedProfile(e.target.value)} className={styles.debugInput} style={{ minWidth: '0', maxWidth: '120px' }}>
                  {profiles.map((p) => <option key={p} value={p}>{p}.json</option>)}
                </select>
                <button className={styles.debugMiniButton} onClick={() => void handleLoadSelectedProfile()}>Load</button>
                <input type="text" value={newProfileName} placeholder="new_profile" className={styles.debugInput} style={{ maxWidth: '110px' }} onChange={(e) => setNewProfileName(e.target.value)} />
              </div>
              <div className={styles.debugControlRow} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <ControlMeta label="Route match patterns" path="metadata.matchPatterns" hint="Routes that should auto-load this profile." />
                <textarea
                  style={{ width: '100%', minHeight: '40px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '6px', fontSize: '0.75rem' }}
                  value={(config.metadata?.matchPatterns || []).join(', ')}
                  onChange={(e) => {
                    const patterns = e.target.value.split(',').map((p) => p.trim()).filter(Boolean);
                    setConfig({ ...config, metadata: { ...config.metadata, matchPatterns: patterns } });
                  }}
                  placeholder="/route/*, /another-page"
                />
                <button className={styles.debugMiniButton} style={{ marginTop: '0.5rem' }} onClick={() => {
                  const current = window.location.pathname;
                  const patterns = config.metadata?.matchPatterns || [];
                  if (!patterns.includes(current)) {
                    setConfig({ ...config, metadata: { ...config.metadata, matchPatterns: [...patterns, current] } });
                  }
                }}>
                  Assign Current Route
                </button>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button className={styles.debugToggleButton} style={{ flex: 1, backgroundColor: '#0044ff', borderColor: '#0066ff', color: 'white' }} onClick={() => void handleSaveProfile()}>
                  {newProfileName.trim() ? 'Save As New' : 'Apply & Save'}
                </button>
              </div>
              <div className={styles.debugControlRow}>
                <ControlMeta label="Status" hint="Profile loader state." />
                <div className={styles.debugControlInputs}>
                  <span className={styles.debugValueDisplay}>{profileStatus || 'Ready'}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const scaleY = renderedSize.height / svgHeight;
  const viewWidth = Math.max(layout.minViewWidth, renderedSize.width / Math.max(0.0001, scaleY));
  const scaleX = renderedSize.width / viewWidth;
  const aspectCorrection = scaleX > 0 ? scaleY / scaleX : 1;
  const geometry = useMemo(() => {
    const boxHeight = Math.min(layout.boxHeight, svgHeight - HEADER_BOX_VERTICAL_MARGIN);
    const wingHeight = Math.min(layout.wingHeight, boxHeight / 2);
    const wingY = (svgHeight - wingHeight) / 2;
    const boxY = (svgHeight - boxHeight) / 2;
    const wingUnderlap = layout.wingUnderlap;

    const outerMargin = layout.outerMargin;
    const boxGap = layout.boxGap;

    const isLeftCollapsed = renderedSize.width < layout.leftCollapseWidth;
    const isRightCollapsed = renderedSize.width < layout.rightCollapseWidth;

    const leftDesiredWidth = isLeftCollapsed
      ? layout.leftCollapsedWidth
      : Math.min(layout.leftExpandedWidth, Math.max(layout.leftCollapsedWidth, estimateLeftBoxWidth(left, boxHeight, substituteVariables)));

    const rightDesiredWidth = isRightCollapsed
      ? layout.rightCollapsedWidth
      : Math.min(layout.rightWidth, Math.max(layout.rightCollapsedWidth, estimateRightBoxWidth(right, boxHeight, substituteVariables)));

    const fittedSideWidths = fitSideWidths({
      leftDesired: leftDesiredWidth,
      rightDesired: rightDesiredWidth,
      leftMin: layout.leftCollapsedWidth,
      rightMin: layout.rightCollapsedWidth,
      maxTotal: Math.max(0, viewWidth - outerMargin * 2 - layout.centerMinWidth - boxGap * 2),
    });

    const finalLeftWidth = isLeftCollapsed ? layout.leftCollapsedWidth : fittedSideWidths.left;
    const finalRightWidth = isRightCollapsed ? layout.rightCollapsedWidth : fittedSideWidths.right;

    const centerX = viewWidth / 2;
    const desiredCenterWidth = estimateCenterBoxWidth(center, boxHeight, aspectCorrection, substituteVariables);
    const maxCenterWidthFromLeft = Math.max(layout.centerMinWidth, 2 * (centerX - (outerMargin + finalLeftWidth + boxGap)));
    const maxCenterWidthFromRight = Math.max(layout.centerMinWidth, 2 * ((viewWidth - outerMargin - finalRightWidth - boxGap) - centerX));
    const responsiveCenterWidth = Math.max(
      layout.centerMinWidth,
      Math.min(Math.max(layout.centerWidth, desiredCenterWidth), maxCenterWidthFromLeft, maxCenterWidthFromRight),
    );

    const leftBox: HeaderBoxRect = { x: outerMargin, y: boxY, w: finalLeftWidth, h: boxHeight };
    const rightBox: HeaderBoxRect = { x: viewWidth - outerMargin - finalRightWidth, y: boxY, w: finalRightWidth, h: boxHeight };
    const centerBox: HeaderBoxRect = { x: centerX - responsiveCenterWidth / 2, y: boxY, w: responsiveCenterWidth, h: boxHeight };

    const leftWing = {
      x1: leftBox.x + leftBox.w - wingUnderlap,
      x2: centerBox.x + wingUnderlap,
      y: wingY,
      h: wingHeight,
    };

    const rightWing = {
      x1: centerBox.x + centerBox.w - wingUnderlap,
      x2: rightBox.x + wingUnderlap,
      y: wingY,
      h: wingHeight,
    };

    return {
      boxHeight,
      leftBox,
      rightBox,
      centerBox,
      leftWing,
      rightWing,
      isLeftCollapsed,
      isRightCollapsed,
    };
  }, [aspectCorrection, center, layout, left, renderedSize.width, right, substituteVariables, svgHeight, viewWidth]);

  useEffect(() => {
    if (!showProfileDropdown) {
      return;
    }

    const updateProfileDropdownAnchor = () => {
      const wrapNode = wrapRef.current;
      const rightPillNode = wrapNode?.querySelector('[data-header-pill="right"]');
      if (!(rightPillNode instanceof SVGGraphicsElement)) {
        return;
      }

      const rect = rightPillNode.getBoundingClientRect();
      const top = rect.bottom + 12;
      const right = Math.max(12, window.innerWidth - rect.right);
      const maxHeight = Math.max(180, window.innerHeight - top - 24);
      setProfileDropdownAnchor({ top, right, maxHeight });
    };

    updateProfileDropdownAnchor();

    const observer = new ResizeObserver(updateProfileDropdownAnchor);
    if (wrapRef.current) {
      observer.observe(wrapRef.current);
    }

    window.addEventListener('resize', updateProfileDropdownAnchor);
    window.addEventListener('scroll', updateProfileDropdownAnchor, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateProfileDropdownAnchor);
      window.removeEventListener('scroll', updateProfileDropdownAnchor, true);
    };
  }, [showProfileDropdown]);

  const activeProfileDropdownAnchor = showProfileDropdown ? profileDropdownAnchor : null;

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
      {leftContent}
      <div
        ref={wrapRef}
        className={styles.unifiedHeaderWrapper}
        style={{
          flex: 1,
          maxWidth: layout.maxWidth ? `${layout.maxWidth}px` : 'none',
          height: `${layout.height}px`,
        }}
      >
        <div className={styles.headerSvgFrame} style={{ height: `${layout.height}px` }}>
          {style.backdropBlur > 0 && (
            <div className={styles.headerBackdropLayer}>
              {renderBackdropShape({
                left: `${geometry.leftBox.x * scaleX}px`,
                top: `${geometry.leftBox.y * scaleY}px`,
                width: `${geometry.leftBox.w * scaleX}px`,
                height: `${geometry.leftBox.h * scaleY}px`,
                borderRadius: '999px',
                backdropFilter: `blur(${style.backdropBlur}px)`,
                WebkitBackdropFilter: `blur(${style.backdropBlur}px)`,
              }, 'left-pill')}
              {renderBackdropShape({
                left: `${geometry.centerBox.x * scaleX}px`,
                top: `${geometry.centerBox.y * scaleY}px`,
                width: `${geometry.centerBox.w * scaleX}px`,
                height: `${geometry.centerBox.h * scaleY}px`,
                borderRadius: '999px',
                backdropFilter: `blur(${style.backdropBlur}px)`,
                WebkitBackdropFilter: `blur(${style.backdropBlur}px)`,
              }, 'center-pill')}
              {renderBackdropShape({
                left: `${geometry.rightBox.x * scaleX}px`,
                top: `${geometry.rightBox.y * scaleY}px`,
                width: `${geometry.rightBox.w * scaleX}px`,
                height: `${geometry.rightBox.h * scaleY}px`,
                borderRadius: '999px',
                backdropFilter: `blur(${style.backdropBlur}px)`,
                WebkitBackdropFilter: `blur(${style.backdropBlur}px)`,
              }, 'right-pill')}
              {renderBackdropShape({
                left: `${Math.min(geometry.leftWing.x1, geometry.leftWing.x2) * scaleX}px`,
                top: `${geometry.leftWing.y * scaleY}px`,
                width: `${Math.abs(geometry.leftWing.x2 - geometry.leftWing.x1) * scaleX}px`,
                height: `${geometry.leftWing.h * scaleY}px`,
                clipPath: buildWingClipPath(Math.abs(geometry.leftWing.x2 - geometry.leftWing.x1) * scaleX, geometry.leftWing.h * scaleY, layout.wingCurve * scaleX),
                backdropFilter: `blur(${style.backdropBlur}px)`,
                WebkitBackdropFilter: `blur(${style.backdropBlur}px)`,
              }, 'left-wing')}
              {renderBackdropShape({
                left: `${Math.min(geometry.rightWing.x1, geometry.rightWing.x2) * scaleX}px`,
                top: `${geometry.rightWing.y * scaleY}px`,
                width: `${Math.abs(geometry.rightWing.x2 - geometry.rightWing.x1) * scaleX}px`,
                height: `${geometry.rightWing.h * scaleY}px`,
                clipPath: buildWingClipPath(Math.abs(geometry.rightWing.x2 - geometry.rightWing.x1) * scaleX, geometry.rightWing.h * scaleY, layout.wingCurve * scaleX),
                backdropFilter: `blur(${style.backdropBlur}px)`,
                WebkitBackdropFilter: `blur(${style.backdropBlur}px)`,
              }, 'right-wing')}
            </div>
          )}
          <svg
            viewBox={`0 0 ${viewWidth} ${svgHeight}`}
            preserveAspectRatio="none"
            className={styles.headerSvg}
            style={{ pointerEvents: 'auto' }}
          >
            <defs>
              <filter id="pillGlow" x="-20%" y="-80%" width="140%" height="260%">
                <feGaussianBlur stdDeviation={String(style.pillGlowBlur)} result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="iconGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={String(style.iconGlowBlur)} result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <>
              <WingShape box={geometry.leftWing} curve={layout.wingCurve} style={style} />
              <WingShape box={geometry.rightWing} curve={layout.wingCurve} style={style} />

              <HeaderPill box={geometry.leftBox} style={style} onClick={left.onClick} isButton={left.isButton} ariaLabel={left.ariaLabel ?? left.text}>
                {left.customRenderer ? (
                  left.customRenderer({ box: geometry.leftBox, config: left, aspectCorrection })
                ) : (
                  <LeftHomeContent
                    box={geometry.leftBox}
                    collapsed={geometry.isLeftCollapsed}
                    config={left}
                    style={style}
                    aspectCorrection={aspectCorrection}
                    substituteVariables={substituteVariables}
                  />
                )}
              </HeaderPill>

              <HeaderPill box={geometry.centerBox} style={style}>
                <CenterContent
                  box={geometry.centerBox}
                  config={center}
                  style={style}
                  aspectCorrection={aspectCorrection}
                  substituteVariables={substituteVariables}
                />
              </HeaderPill>

              <HeaderPill
                box={geometry.rightBox}
                style={style}
                onClick={right.isProfile ? () => setShowProfileDropdown((value) => !value) : right.onClick}
                isButton={right.isButton || right.isProfile}
                ariaLabel={right.ariaLabel ?? right.text}
                dataSlot="right"
              >
                {right.customRenderer ? (
                  right.customRenderer({ box: geometry.rightBox, config: right, aspectCorrection })
                ) : right.isProfile ? (
                  <RightProfileContent
                    box={geometry.rightBox}
                    collapsed={geometry.isRightCollapsed}
                    user={right.user}
                    textStyle={right.textStyle}
                    style={style}
                    avatarLoadFailed={profileAvatarLoadFailed}
                    onAvatarError={() => setFailedProfileAvatarUrl(profileAvatarUrl)}
                  />
                ) : (
                  <FitText
                    text={geometry.isRightCollapsed ? '' : right.text}
                    x={geometry.rightBox.x + geometry.rightBox.w / 2}
                    y={geometry.rightBox.y + geometry.rightBox.h / 2 + 5}
                    maxWidth={geometry.rightBox.w - 20}
                    anchor="middle"
                    textStyle={right.textStyle}
                    aspectCorrection={aspectCorrection}
                  />
                )}
              </HeaderPill>
            </>
          </svg>
        </div>
        {shouldShowPrimaryNavigation ? (
          <div
            className={styles.primaryNavExtension}
            data-oc-shell-header-extension="true"
            style={{
              top: `${navTop}px`,
              height: `${navBlockHeight}px`,
            }}
          >
            <PrimarySiteNavigation
              includeAdmin={includeAdminNavigation}
              config={resolved.navigation}
              extraItems={primaryNavigationItems}
            />
          </div>
        ) : null}
      </div>
      {rightSuffixContent}

      {showProfileDropdown && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'transparent', pointerEvents: 'auto' }} 
          onClick={() => setShowProfileDropdown(false)}
        />
      )}

        {showProfileDropdown && right.isProfile && right.user && (
          <div 
           className={styles.profileDropdown}
            style={{
              '--dropdown-tint': style.dropdownTint,
              '--dropdown-border': style.dropdownBorderColor,
              '--dropdown-section-opacity': style.dropdownSectionOpacity,
              top: activeProfileDropdownAnchor ? `${activeProfileDropdownAnchor.top}px` : undefined,
              right: activeProfileDropdownAnchor ? `${activeProfileDropdownAnchor.right}px` : undefined,
              maxHeight: activeProfileDropdownAnchor ? `${activeProfileDropdownAnchor.maxHeight}px` : undefined,
              zIndex: 10000,
              pointerEvents: 'auto'
            } as React.CSSProperties}
          >
            <div className={styles.dropdownHeader}>
              {isGuestUser ? (
                <div className={styles.dropdownAvatar}>
                  <img
                    src={authAnnonImageUrl}
                    alt="Anonymous User"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              ) : (
                <button
                  className={styles.dropdownAvatar}
                  onClick={() => {
                    setShowPictureModal(true);
                    setShowProfileDropdown(false);
                  }}
                  title="Change profile picture"
                >
                  {right.user.avatarUrl && !profileAvatarLoadFailed ? (
                    <img
                      src={right.user.avatarUrl}
                      alt={right.user.name}
                      style={{ width: '100%', height: '100%' }}
                      onError={() => setFailedProfileAvatarUrl(profileAvatarUrl)}
                    />
                  ) : (
                    <img
                      src={authAnnonImageUrl}
                      alt="Anonymous User"
                      style={{ width: '100%', height: '100%' }}
                    />
                  )}
                  <div className={styles.editOverlay}>
                    <span>Edit</span>
                  </div>
                </button>
              )}
              <div className={styles.dropdownInfo}>
                <div className={styles.dropdownName}>{right.user.name}</div>
                <div className={styles.dropdownStatus}>
                  {isGuestUser ? 'Guest session' : right.user.email}
                </div>
              </div>
            </div>
            <div className={styles.dropdownDivider} />
            {isGuestUser ? (
              <div className={styles.dropdownMenuSections}>
                <div className={styles.guestDropdownCopy}>
                  Save your progress, keep your identity, and unlock the real player profile once you register.
                </div>
                <div className={styles.guestBenefits}>
                  <div className={styles.guestBenefitCard}>
                    <span>Keep</span>
                    <strong>Your name</strong>
                  </div>
                  <div className={styles.guestBenefitCard}>
                    <span>Track</span>
                    <strong>Stats</strong>
                  </div>
                  <div className={styles.guestBenefitCard}>
                    <span>Unlock</span>
                    <strong>Social play</strong>
                  </div>
                </div>
                <div className={styles.dropdownMenuSection}>
                  <button className={styles.guestPrimaryButton} onClick={handleGuestUpgrade}>
                    Create Ocentra Account
                  </button>
                  <button className={styles.dropdownItem} onClick={() => { right.onLogout?.(); setShowProfileDropdown(false); }}>
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.dropdownStats}>
                  <div><span>ELO</span><strong>{right.user.eloRating ?? 1200}</strong></div>
                  <div><span>Games</span><strong>{right.user.gamesPlayed ?? 0}</strong></div>
                  <div><span>Win</span><strong>{right.user.winRate?.toFixed(1) ?? '0'}%</strong></div>
                </div>
                <div className={styles.dropdownDivider} />
                <div className={styles.dropdownMenuSections}>
                  <div className={styles.dropdownMenuSection}>
                    {right.user.isAdmin && right.onAdminDashboardClick && (
                      <button className={styles.dropdownItem} onClick={() => { right.onAdminDashboardClick?.(); setShowProfileDropdown(false); }}>
                        Admin Dashboard
                      </button>
                    )}
                    <button className={styles.dropdownItem} onClick={() => { right.onViewProfileClick?.(); setShowProfileDropdown(false); }}>View Profile</button>
                    <button className={styles.dropdownItem} onClick={() => { right.onSettingsClick?.(); setShowProfileDropdown(false); }}>Settings</button>
                    <button className={styles.dropdownItem} onClick={() => { right.onSecurityClick?.(); setShowProfileDropdown(false); }}>Security</button>
                  </div>

                  <div className={styles.dropdownMenuSectionDanger}>
                    <button className={styles.dropdownItemLogout} onClick={() => { right.onLogout?.(); setShowProfileDropdown(false); }}>
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      {showPictureModal && right.isProfile && right.user && !isGuestUser && right.onUpdatePhoto && (
        <ProfilePictureModal
          isOpen={showPictureModal}
          onClose={() => setShowPictureModal(false)}
          user={{
            uid: right.user.uid || right.user.name || 'current-user',
            displayName: right.user.name,
            email: right.user.email || '',
            photoURL: right.user.avatarUrl || '',
            isAdmin: right.user.isAdmin,
            eloRating: right.user.eloRating,
            gamesPlayed: right.user.gamesPlayed,
            winRate: right.user.winRate,
          }}
          onUpdatePhoto={right.onUpdatePhoto}
          getAvatars={right.getAvatars || (async () => [])}
        />
      )}

      {ENABLE_HEADER_DEBUG_CONTROLS && showDebugControls && (
        <div className={styles.debugControlsFloating}>
          {showControls && renderDebugPanel()}
          <button
            type="button"
            onClick={() => setShowControls((v) => !v)}
            className={styles.debugToggleButton}
          >
            {showControls ? 'Hide Header Controls' : 'Show Header Controls'}
          </button>
        </div>
      )}
    </div>
  );
}
type WingBox = {
  x1: number;
  x2: number;
  y: number;
  h: number;
};

function buildWingPath(box: WingBox, curve: number) {
  const top = box.y;
  const bottom = box.y + box.h;
  return [
    `M ${box.x1} ${top}`,
    `L ${box.x2} ${top}`,
    `C ${box.x2 - curve} ${top} ${box.x2 - curve} ${bottom} ${box.x2} ${bottom}`,
    `L ${box.x1} ${bottom}`,
    `C ${box.x1 + curve} ${bottom} ${box.x1 + curve} ${top} ${box.x1} ${top}`,
    'Z',
  ].join(' ');
}

function WingShape({ box, curve, style }: { box: WingBox; curve: number; style: UnifiedHeaderStyleConfig }) {
  const d = buildWingPath(box, curve);

  return (
    <path
      d={d}
      filter={style.pillGlowBlur > 0 ? 'url(#pillGlow)' : undefined}
      fill={style.tintColor}
      fillOpacity={style.wingOpacity}
      stroke={style.edgeColor}
      strokeWidth={1}
      strokeOpacity={0.45}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function HeaderPill({
  box,
  style,
  children,
  onClick,
  isButton,
  ariaLabel,
  dataSlot,
}: {
  box: HeaderBoxRect;
  style: UnifiedHeaderStyleConfig;
  children?: ReactNode;
  onClick?: () => void;
  isButton?: boolean;
  ariaLabel?: string;
  dataSlot?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const interactive = Boolean(onClick || isButton);
  const edgeColor = interactive && hovered ? style.hoverEdgeColor : style.edgeColor;
  const fillColor = interactive && hovered ? style.hoverTintColor : style.tintColor;
  const fillOpacity = interactive && hovered ? Math.min(1, style.boxOpacity + style.hoverBoxOpacityBoost) : style.boxOpacity;

  return (
    <g
      data-header-pill={dataSlot}
      onClick={() => onClick?.()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? ariaLabel : undefined}
      tabIndex={interactive ? 0 : undefined}
      style={{ cursor: interactive ? 'pointer' : 'default', outline: 'none' }}
    >
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx={box.h / 2}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke={edgeColor}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
        filter={style.pillGlowBlur > 0 ? 'url(#pillGlow)' : undefined}
      />
      {children}
    </g>
  );
}

function LeftHomeContent({
  box,
  collapsed,
  config,
  style,
  aspectCorrection,
  substituteVariables,
}: {
  box: HeaderBoxRect;
  collapsed: boolean;
  config: UnifiedHeaderLeftConfig;
  style: UnifiedHeaderStyleConfig;
  aspectCorrection: number;
  substituteVariables: (t: string | undefined) => string;
}) {
  const circleInset = box.h * 0.15;
  const circleRadius = Math.min((box.h - circleInset * 2) / 2, 24);
  const circleCx = collapsed ? box.x + box.w / 2 : box.x + circleInset + circleRadius;
  const circleCy = box.y + box.h / 2;
  const textX = circleCx + circleRadius + 6;
  const maxTextWidth = Math.max(1, box.x + box.w - 14 - textX);
  const safeIconSize = Math.min(config.iconSize, circleRadius * 1.55);

  return (
    <g>
      <g transform={`translate(${circleCx} ${circleCy}) scale(${aspectCorrection} 1) translate(${-circleCx} ${-circleCy})`}>
        <circle
          cx={circleCx}
          cy={circleCy}
          r={circleRadius}
          fill={style.circleFillColor}
          fillOpacity={0.22}
          stroke={style.edgeColor}
          strokeOpacity={0.55}
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
        <g filter={style.iconGlowBlur > 0 ? 'url(#iconGlow)' : undefined}>
          {renderHeaderIcon(config.icon, {
            cx: circleCx + config.iconOffsetX,
            cy: circleCy + config.iconOffsetY,
            size: safeIconSize,
            color: '#ffffff',
          })}
        </g>
      </g>

      {!collapsed && (
        <FitText
          text={substituteVariables(config.text)}
          x={textX}
          y={circleCy + 5}
          maxWidth={maxTextWidth}
          anchor="start"
          textStyle={config.textStyle}
        />
      )}
    </g>
  );
}

function CenterContent({ box, config, style, aspectCorrection, substituteVariables }: { box: HeaderBoxRect; config: UnifiedHeaderCenterConfig; style: UnifiedHeaderStyleConfig; aspectCorrection: number; substituteVariables: (t: string | undefined) => string }) {
  if (config.customRenderer) {
    return config.customRenderer({ box, config, aspectCorrection });
  }

  if (config.mode === 'B') {
    return <CenterModeB box={box} config={config} style={style} aspectCorrection={aspectCorrection} substituteVariables={substituteVariables} />;
  }

  return <CenterModeA box={box} config={config} style={style} aspectCorrection={aspectCorrection} substituteVariables={substituteVariables} />;
}

function CenterModeA({ 
  box, 
  config, 
  style,
  aspectCorrection, 
  substituteVariables 
}: { 
  box: HeaderBoxRect; 
  config: UnifiedHeaderCenterConfig; 
  style: UnifiedHeaderStyleConfig;
  aspectCorrection: number;
  substituteVariables: (t: string | undefined) => string;
}) {
  const mode = config.modeA;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const fontSize = Math.min(mode.textStyle.fontSize, box.h);
  const logoSize = Math.min(mode.logo.size, box.h);
  const logoCx = cx + mode.logo.offsetX;
  const logoCy = cy + mode.logo.offsetY;
  const logoVisualRadius = (logoSize / 2) * aspectCorrection;
  const leftTextEnd = logoCx - logoVisualRadius - config.contentGap;
  const rightTextStart = logoCx + logoVisualRadius + config.contentGap;
  const leftTextStart = box.x + config.sidePadding;
  const rightTextEnd = box.x + box.w - config.sidePadding;
  const leftTextWidth = Math.max(1, leftTextEnd - (box.x + config.sidePadding));
  const rightTextWidth = Math.max(1, box.x + box.w - config.sidePadding - rightTextStart);
  const leftTextX = resolveAnchorPosition(mode.leftTextAlign, leftTextStart, leftTextEnd);
  const rightTextX = resolveAnchorPosition(mode.rightTextAlign, rightTextStart, rightTextEnd);

  return (
    <g>
      <FitText
        text={substituteVariables(mode.leftText)}
        x={leftTextX}
        y={cy + fontSize * 0.36}
        maxWidth={leftTextWidth}
        anchor={mode.leftTextAlign}
        textStyle={{ ...mode.textStyle, fontSize }}
      />

      <g filter={style.iconGlowBlur > 0 ? 'url(#iconGlow)' : undefined}>
        {mode.logo.renderer?.({
          cx: logoCx,
          cy: logoCy,
          size: logoSize,
          color: getTextSolidColor(mode.textStyle),
          strokeWidth: mode.logo.strokeWidth,
          innerOpacity: mode.logo.innerOpacity,
          aspectCorrection,
        })}
      </g>

      <FitText
        text={substituteVariables(mode.rightText)}
        x={rightTextX}
        y={cy + fontSize * 0.36}
        maxWidth={rightTextWidth}
        anchor={mode.rightTextAlign}
        textStyle={{ ...mode.textStyle, fontSize }}
      />
    </g>
  );
}

function CenterModeB({ box, config, style, aspectCorrection, substituteVariables }: { 
  box: HeaderBoxRect; 
  config: UnifiedHeaderCenterConfig; 
  style: UnifiedHeaderStyleConfig;
  aspectCorrection: number;
  substituteVariables: (t: string | undefined) => string;
}) {
  const mode = config.modeB;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  
  const mainText = substituteVariables(mode.text);
  const tagline = substituteVariables(mode.tagline);
  
  // Layout constants
  const hasTagline = Boolean(tagline);
  const mainY = hasTagline ? cy - box.h * 0.12 : cy;
  const taglineY = cy + box.h * 0.28;
  
  const fontSize = Math.min(mode.textStyle.fontSize, box.h * (hasTagline ? 0.6 : 0.8));
  const taglineFontSize = mode.taglineStyle?.fontSize || fontSize * 0.6;
  
  const iconSize = Math.min(mode.iconSize, box.h * 0.55);
  
  // Calculate text width for centering
  const textWidthEstimate = mainText.length * (fontSize * 0.55);
  const maxTextWidth = Math.max(1, box.w - config.sidePadding * 2 - iconSize * 4 - mode.pairGap * 2 - config.contentGap * 2);
  const textWidth = Math.min(textWidthEstimate, maxTextWidth);

  const leftUnitStart = box.x + config.sidePadding;
  const leftUnitEnd = cx - textWidth / 2 - config.contentGap;
  const rightUnitStart = cx + textWidth / 2 + config.contentGap;
  const rightUnitEnd = box.x + box.w - config.sidePadding;
  
  const leftPairCenter = leftUnitStart + Math.max(1, leftUnitEnd - leftUnitStart) / 2;
  const rightPairCenter = rightUnitStart + Math.max(1, rightUnitEnd - rightUnitStart) / 2;
  const pairHalfSpread = Math.max(0, iconSize + mode.pairGap) / 2;

  // Use new icon arrays or fallback to legacy 'icons' array
  const leftIcons = mode.leftIcons || (mode.icons ? [mode.icons[0], mode.icons[1]] : []);
  const rightIcons = mode.rightIcons || (mode.icons ? [mode.icons[2], mode.icons[3]] : []);

  return (
    <g>
      {/* Left Icons */}
      {leftIcons[0] && <CorrectedIcon cx={leftPairCenter - pairHalfSpread} cy={mainY} size={iconSize} color="#050505" style={style} aspectCorrection={aspectCorrection} renderer={leftIcons[0]} />}
      {leftIcons[1] && <CorrectedIcon cx={leftPairCenter + pairHalfSpread} cy={mainY} size={iconSize} color="#ff3b45" style={style} aspectCorrection={aspectCorrection} renderer={leftIcons[1]} />}
      
      {/* Center Content: Logo or Text */}
      {mode.logo ? (
        <CorrectedIcon 
          cx={cx} 
          cy={mainY} 
          size={fontSize * 1.5} 
          color={getTextSolidColor(mode.textStyle)} 
          style={style}
          aspectCorrection={aspectCorrection} 
          renderer={mode.logo} 
        />
      ) : (
        <FitText
          text={mainText}
          x={cx}
          y={mainY + fontSize * 0.36}
          maxWidth={maxTextWidth}
          anchor="middle"
          textStyle={{ ...mode.textStyle, fontSize }}
        />
      )}

      {/* Tagline */}
      {tagline && (
        <FitText
          text={tagline}
          x={cx}
          y={taglineY}
          maxWidth={box.w * 0.9}
          anchor="middle"
          textStyle={{
            ...(mode.taglineStyle ?? mode.textStyle),
            fontSize: taglineFontSize,
            opacity: mode.taglineStyle?.opacity ?? 0.8,
          }}
        />
      )}

      {/* Right Icons */}
      {rightIcons[0] && <CorrectedIcon cx={rightPairCenter - pairHalfSpread} cy={mainY} size={iconSize} color="#ff3b45" style={style} aspectCorrection={aspectCorrection} renderer={rightIcons[0]} />}
      {rightIcons[1] && <CorrectedIcon cx={rightPairCenter + pairHalfSpread} cy={mainY} size={iconSize} color="#050505" style={style} aspectCorrection={aspectCorrection} renderer={rightIcons[1]} />}
    </g>
  );
}

function CorrectedIcon({
  cx,
  cy,
  size,
  color,
  style,
  aspectCorrection,
  renderer,
}: HeaderIconRenderArgs & { style: UnifiedHeaderStyleConfig; aspectCorrection: number; renderer?: HeaderIconType }) {
  if (!renderer) return null;
  
  return (
    <g filter={style.iconGlowBlur > 0 ? 'url(#iconGlow)' : undefined} transform={`translate(${cx} ${cy}) scale(${aspectCorrection} 1) translate(${-cx} ${-cy})`}>
      {renderHeaderIcon(renderer, { cx, cy, size, color })}
    </g>
  );
}


function RightProfileContent({
  box,
  collapsed,
  user,
  textStyle,
  style,
  avatarLoadFailed,
  onAvatarError,
}: {
  box: HeaderBoxRect;
  collapsed: boolean;
  user?: { name: string; avatarUrl?: string | null };
  textStyle: TextStyleConfig;
  style: UnifiedHeaderStyleConfig;
  avatarLoadFailed: boolean;
  onAvatarError: () => void;
}) {
  const avatarSize = box.h * 0.7;
  const avatarX = collapsed ? box.x + (box.w - avatarSize) / 2 : box.x + 12;
  const avatarY = box.y + (box.h - avatarSize) / 2;
  const rawName = getProfileDisplayName(user?.name);
  const name = truncateTextToWidth(
    rawName,
    { ...textStyle, fontSize: Math.min(textStyle.fontSize, box.h * 0.45) },
    Math.max(24, box.w - avatarSize - 40),
  );
  return (
    <g>
      <defs>
        <clipPath id="avatarClip">
          <circle cx={avatarX + avatarSize / 2} cy={avatarY + avatarSize / 2} r={avatarSize / 2} />
        </clipPath>
      </defs>

      <circle
        cx={avatarX + avatarSize / 2}
        cy={avatarY + avatarSize / 2}
        r={avatarSize / 2 + 1}
        fill="white"
        fillOpacity={0.1}
      />

      {user?.avatarUrl && !avatarLoadFailed ? (
        <g filter={style.iconGlowBlur > 0 ? 'url(#iconGlow)' : undefined}>
          <image
            href={user.avatarUrl}
            x={avatarX}
            y={avatarY}
            width={avatarSize}
            height={avatarSize}
            clipPath="url(#avatarClip)"
            preserveAspectRatio="xMidYMid slice"
            onError={onAvatarError}
          />
        </g>
      ) : (
        <g filter={style.iconGlowBlur > 0 ? 'url(#iconGlow)' : undefined}>
          <image
            href={authAnnonImageUrl}
            x={avatarX}
            y={avatarY}
            width={avatarSize}
            height={avatarSize}
            clipPath="url(#avatarClip)"
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      )}

      {!collapsed && (
        <FitText
          text={name}
          x={avatarX + avatarSize + 10}
          y={box.y + box.h / 2 + 5}
          maxWidth={box.w - avatarSize - 40}
          anchor="start"
          textStyle={textStyle}
        />
      )}

      {!collapsed && user && (
        <path
          d={`M ${box.x + box.w - 20} ${box.y + box.h / 2 - 2} l 5 5 l 5 -5`}
          fill="none"
          stroke={getTextSolidColor(textStyle)}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  );
}

function FitText({
  text,
  x,
  y,
  maxWidth,
  anchor,
  textStyle,
  aspectCorrection = 1,
}: {
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  anchor: "start" | "middle" | "end";
  textStyle: TextStyleConfig;
  aspectCorrection?: number;
}) {
  const safeStyle = textStyle;
  const safeFontSize = safeStyle.fontSize;
  const estimatedWidth = estimateTextWidth(text, safeStyle);
  const shrinkRatio = estimatedWidth > 0 ? Math.min(1, maxWidth / estimatedWidth) : 1;
  const adjustedFontSize = estimatedWidth > maxWidth
    ? Math.max(Math.max(8, safeFontSize * 0.62), safeFontSize * shrinkRatio)
    : safeFontSize;
  const adjustedStyle = adjustedFontSize === safeFontSize ? safeStyle : { ...safeStyle, fontSize: adjustedFontSize };
  const adjustedEstimatedWidth = estimateTextWidth(text, adjustedStyle);
  const shouldCompress = adjustedEstimatedWidth > maxWidth;
  const reactId = useId().replace(/:/g, '');
  const ids = {
    gradientgold: `titleGradientgold${reactId}`,
    gradientroyalGold: `titleGradientroyalGold${reactId}`,
    gradientsilver: `titleGradientsilver${reactId}`,
    gradientemerald: `titleGradientemerald${reactId}`,
    gradientice: `titleGradientice${reactId}`,
    gradientruby: `titleGradientruby${reactId}`,
    gradientfire: `titleGradientfire${reactId}`,
    customGradient: `titleGradientCustom${reactId}`,
    shadowsoft: `titleShadowsoft${reactId}`,
    shadowdeep: `titleShadowdeep${reactId}`,
    shadowglow: `titleShadowglow${reactId}`,
    shadowholy: `titleShadowholy${reactId}`,
    shadowneon: `titleShadowneon${reactId}`,
    shadowengraved: `titleShadowengraved${reactId}`,
    shadowcustom: `titleShadowcustom${reactId}`,
  } as const;
  const fill = fillValue(adjustedStyle.fill, ids, adjustedStyle);
  const stroke = edgeValue(adjustedStyle.edge, adjustedStyle);
  const filter = shadowFilter(adjustedStyle.shadow, ids);
  const words = splitWords(text, adjustedStyle);
  const transform = `translate(${adjustedStyle.moveX} ${adjustedStyle.moveY}) rotate(${adjustedStyle.rotate} ${x} ${y}) skewX(${adjustedStyle.skewX})`;

  return (
    <g transform={`translate(${x} ${y}) scale(${aspectCorrection} 1) translate(${-x} ${-y})`}>
      <defs>
        <linearGradient id={ids.gradientgold} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff8c9" /><stop offset="39%" stopColor="#efc75c" /><stop offset="70%" stopColor="#a96f1d" /><stop offset="100%" stopColor="#ffe9a6" /></linearGradient>
        <linearGradient id={ids.gradientroyalGold} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff" /><stop offset="18%" stopColor="#ffeeb0" /><stop offset="48%" stopColor="#dfa832" /><stop offset="72%" stopColor="#7c4812" /><stop offset="100%" stopColor="#fff0a8" /></linearGradient>
        <linearGradient id={ids.gradientsilver} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff" /><stop offset="38%" stopColor="#d8e1e6" /><stop offset="72%" stopColor="#74818a" /><stop offset="100%" stopColor="#ffffff" /></linearGradient>
        <linearGradient id={ids.gradientemerald} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e8fff0" /><stop offset="42%" stopColor="#72f0a9" /><stop offset="74%" stopColor="#137d49" /><stop offset="100%" stopColor="#cbffdf" /></linearGradient>
        <linearGradient id={ids.gradientice} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff" /><stop offset="45%" stopColor="#a8edff" /><stop offset="76%" stopColor="#2b86ae" /><stop offset="100%" stopColor="#eafcff" /></linearGradient>
        <linearGradient id={ids.gradientruby} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffe4e8" /><stop offset="42%" stopColor="#ff6575" /><stop offset="75%" stopColor="#8e1028" /><stop offset="100%" stopColor="#ffc2c8" /></linearGradient>
        <linearGradient id={ids.gradientfire} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff0a3" /><stop offset="34%" stopColor="#ff9d2e" /><stop offset="68%" stopColor="#d63616" /><stop offset="100%" stopColor="#ffe28a" /></linearGradient>
        <linearGradient id={ids.customGradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={safeStyle.customColorA} /><stop offset="48%" stopColor={safeStyle.customColorB} /><stop offset="100%" stopColor={safeStyle.customColorC} /></linearGradient>
        <filter id={ids.shadowsoft} x="-40%" y="-80%" width="180%" height="260%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="rgba(0,0,0,0.65)" /></filter>
        <filter id={ids.shadowdeep} x="-40%" y="-80%" width="180%" height="260%"><feDropShadow dx="0" dy="9" stdDeviation="7" floodColor="rgba(0,0,0,0.75)" /></filter>
        <filter id={ids.shadowglow} x="-40%" y="-80%" width="180%" height="260%"><feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="rgba(120,230,255,0.6)" /></filter>
        <filter id={ids.shadowholy} x="-40%" y="-80%" width="180%" height="260%"><feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="rgba(255,220,120,0.7)" /></filter>
        <filter id={ids.shadowneon} x="-40%" y="-80%" width="180%" height="260%"><feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="rgba(80,255,160,0.7)" /></filter>
        <filter id={ids.shadowengraved} x="-40%" y="-80%" width="180%" height="260%"><feDropShadow dx="2" dy="3" stdDeviation="1" floodColor="rgba(0,0,0,0.75)" /></filter>
        <filter id={ids.shadowcustom} x="-60%" y="-100%" width="220%" height="300%"><feDropShadow dx={safeStyle.customShadowX} dy={safeStyle.customShadowY} stdDeviation={safeStyle.customShadowBlur} floodColor={safeStyle.customShadowColor} /></filter>
      </defs>
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        dominantBaseline="alphabetic"
        fontFamily={adjustedStyle.fontFamily}
        fontWeight={adjustedStyle.fontWeight}
        opacity={adjustedStyle.opacity}
        fill={fill}
        stroke={stroke}
        paintOrder="stroke fill markers"
        filter={filter}
        transform={transform}
        textLength={shouldCompress ? maxWidth : undefined}
        lengthAdjust={shouldCompress ? 'spacingAndGlyphs' : undefined}
      >
        {words.map((word, index) => (
          <Fragment key={`${word.first}-${word.rest}-${index}`}>
            <tspan
              fontSize={adjustedFontSize * adjustedStyle.firstScale}
              strokeWidth={adjustedStyle.edge === 'none' ? 0 : adjustedStyle.edgeWidthFirst}
              letterSpacing={adjustedStyle.letterSpacing * 0.45}
              dx={index === 0 ? 0 : adjustedStyle.wordGap}
            >
              {word.first}
            </tspan>
            <tspan
              fontSize={adjustedFontSize * adjustedStyle.restScale}
              strokeWidth={adjustedStyle.edge === 'none' ? 0 : adjustedStyle.edgeWidthRest}
              letterSpacing={adjustedStyle.letterSpacing}
              dy={adjustedStyle.restYOffset}
            >
              {word.rest}
            </tspan>
            {adjustedStyle.restYOffset !== 0 && <tspan dy={-adjustedStyle.restYOffset}></tspan>}
          </Fragment>
        ))}
      </text>
    </g>
  );
}

function ControlMeta({ label, path, hint }: { label: string; path?: string; hint?: string }) {
  const primary = label;
  const secondary = path && path !== label ? path : undefined;
  const title = [label, path, hint].filter(Boolean).join('\n');

  return (
    <div className={styles.debugControlMeta} title={title}>
      <span className={styles.debugControlLabel}>{primary}</span>
      {secondary ? <span className={styles.debugControlPath}>{secondary}</span> : null}
    </div>
  );
}

function TextStyleControls({
  title,
  value,
  onChange,
  pathPrefix,
}: {
  title: string;
  value: TextStyleConfig;
  onChange: (next: TextStyleConfig) => void;
  pathPrefix: string;
}) {
  const [activeTextTab, setActiveTextTab] = useState<TextStylePanelTab>('basic');
  const [selectedPreset, setSelectedPreset] = useState('custom');

  const applyPreset = (presetName: string) => {
    const preset = SVG_TITLE_PRESETS[presetName];
    if (!preset) {
      return;
    }

    setSelectedPreset(presetName);
    onChange({ ...value, ...preset });
  };

  return (
    <>
      <div className={styles.debugDivider}>{title}</div>
      <div className={styles.debugTextTabs}>
        {(['basic', 'fill', 'edge', 'shadow', 'transform'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.debugTextTabButton} ${activeTextTab === tab ? styles.active : ''}`}
            onClick={() => setActiveTextTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTextTab === 'basic' && (
        <>
          <SelectControl label="Preset" path={`${pathPrefix}.__preset`} hint="Apply a ready-made title preset." value={selectedPreset} onChange={applyPreset} options={[{ value: 'custom', label: 'custom' }, ...Object.keys(SVG_TITLE_PRESETS).map((preset) => ({ value: preset, label: preset }))]} />
          <SelectControl label="fontFamily" path={`${pathPrefix}.fontFamily`} hint="Font stack for this text." value={value.fontFamily} onChange={(next) => onChange({ ...value, fontFamily: next })} options={SAFE_SYSTEM_FONTS.map((font) => ({ value: font.value, label: font.name }))} />
          <SelectControl label="splitMode" path={`${pathPrefix}.splitMode`} hint="How each word is split between first and rest glyphs." value={value.splitMode} onChange={(next) => onChange({ ...value, splitMode: next as SplitMode })} options={[{ value: 'first-letter', label: 'first-letter' }, { value: 'first-token', label: 'first-token' }, { value: 'manual-pipe', label: 'manual-pipe' }]} />
          <Control label="fontSize" path={`${pathPrefix}.fontSize`} hint="Base font size before split scaling." value={value.fontSize} min={7} max={96} step={1} onChange={(next) => onChange({ ...value, fontSize: next })} />
          <Control label="fontWeight" path={`${pathPrefix}.fontWeight`} hint="Font weight." value={value.fontWeight} min={100} max={900} step={50} onChange={(next) => onChange({ ...value, fontWeight: next })} />
          <Control label="firstScale" path={`${pathPrefix}.firstScale`} hint="Scale applied to the leading chunk of each word." value={value.firstScale} min={0.5} max={1.8} step={0.01} onChange={(next) => onChange({ ...value, firstScale: next })} />
          <Control label="restScale" path={`${pathPrefix}.restScale`} hint="Scale applied to the remainder of each word." value={value.restScale} min={0.2} max={1.2} step={0.01} onChange={(next) => onChange({ ...value, restScale: next })} />
          <Control label="letterSpacing" path={`${pathPrefix}.letterSpacing`} hint="Tracking between rest letters." value={value.letterSpacing} min={-4} max={14} step={0.1} onChange={(next) => onChange({ ...value, letterSpacing: next })} />
          <Control label="wordGap" path={`${pathPrefix}.wordGap`} hint="Gap between words." value={value.wordGap} min={0} max={80} step={1} onChange={(next) => onChange({ ...value, wordGap: next })} />
          <Control label="restYOffset" path={`${pathPrefix}.restYOffset`} hint="Vertical offset applied to the smaller rest glyphs." value={value.restYOffset} min={-40} max={40} step={1} onChange={(next) => onChange({ ...value, restYOffset: next })} />
          <Control label="opacity" path={`${pathPrefix}.opacity`} hint="Text opacity." value={value.opacity} min={0} max={1} step={0.01} onChange={(next) => onChange({ ...value, opacity: next })} />
          <ToggleControl label="forceUppercase" path={`${pathPrefix}.forceUppercase`} hint="Uppercase text before rendering." value={value.forceUppercase} onChange={(next) => onChange({ ...value, forceUppercase: next })} />
        </>
      )}

      {activeTextTab === 'fill' && (
        <>
          <SelectControl label="fill" path={`${pathPrefix}.fill`} hint="Gradient or flat fill style." value={value.fill} onChange={(next) => onChange({ ...value, fill: next as FillStyle })} options={[{ value: 'gold', label: 'gold' }, { value: 'royalGold', label: 'royalGold' }, { value: 'silver', label: 'silver' }, { value: 'emerald', label: 'emerald' }, { value: 'ice', label: 'ice' }, { value: 'ruby', label: 'ruby' }, { value: 'fire', label: 'fire' }, { value: 'flat', label: 'flat' }, { value: 'custom', label: 'custom' }]} />
          <ColorControl label="customFlatFill" path={`${pathPrefix}.customFlatFill`} value={value.customFlatFill} onChange={(next) => onChange({ ...value, customFlatFill: next, fill: 'flat' })} />
          <ColorControl label="customColorA" path={`${pathPrefix}.customColorA`} value={value.customColorA} onChange={(next) => onChange({ ...value, customColorA: next, fill: 'custom' })} />
          <ColorControl label="customColorB" path={`${pathPrefix}.customColorB`} value={value.customColorB} onChange={(next) => onChange({ ...value, customColorB: next, fill: 'custom' })} />
          <ColorControl label="customColorC" path={`${pathPrefix}.customColorC`} value={value.customColorC} onChange={(next) => onChange({ ...value, customColorC: next, fill: 'custom' })} />
        </>
      )}

      {activeTextTab === 'edge' && (
        <>
          <SelectControl label="edge" path={`${pathPrefix}.edge`} hint="Text outline style." value={value.edge} onChange={(next) => onChange({ ...value, edge: next as EdgeStyle })} options={[{ value: 'none', label: 'none' }, { value: 'dark', label: 'dark' }, { value: 'gold', label: 'gold' }, { value: 'light', label: 'light' }, { value: 'ember', label: 'ember' }, { value: 'custom', label: 'custom' }]} />
          <Control label="edgeWidthFirst" path={`${pathPrefix}.edgeWidthFirst`} hint="Outline width for the leading chunk." value={value.edgeWidthFirst} min={0} max={8} step={0.1} onChange={(next) => onChange({ ...value, edgeWidthFirst: next })} />
          <Control label="edgeWidthRest" path={`${pathPrefix}.edgeWidthRest`} hint="Outline width for the rest chunk." value={value.edgeWidthRest} min={0} max={8} step={0.1} onChange={(next) => onChange({ ...value, edgeWidthRest: next })} />
          <ColorControl label="customEdgeColor" path={`${pathPrefix}.customEdgeColor`} value={value.customEdgeColor} onChange={(next) => onChange({ ...value, customEdgeColor: next, edge: 'custom' })} />
        </>
      )}

      {activeTextTab === 'shadow' && (
        <>
          <SelectControl label="shadow" path={`${pathPrefix}.shadow`} hint="Shadow or glow preset." value={value.shadow} onChange={(next) => onChange({ ...value, shadow: next as ShadowStyle })} options={[{ value: 'none', label: 'none' }, { value: 'soft', label: 'soft' }, { value: 'deep', label: 'deep' }, { value: 'glow', label: 'glow' }, { value: 'holy', label: 'holy' }, { value: 'neon', label: 'neon' }, { value: 'engraved', label: 'engraved' }, { value: 'custom', label: 'custom' }]} />
          <ColorControl label="customShadowColor" path={`${pathPrefix}.customShadowColor`} value={value.customShadowColor} onChange={(next) => onChange({ ...value, customShadowColor: next, shadow: 'custom' })} />
          <Control label="customShadowBlur" path={`${pathPrefix}.customShadowBlur`} value={value.customShadowBlur} min={0} max={30} step={1} onChange={(next) => onChange({ ...value, customShadowBlur: next, shadow: 'custom' })} />
          <Control label="customShadowX" path={`${pathPrefix}.customShadowX`} value={value.customShadowX} min={-40} max={40} step={1} onChange={(next) => onChange({ ...value, customShadowX: next, shadow: 'custom' })} />
          <Control label="customShadowY" path={`${pathPrefix}.customShadowY`} value={value.customShadowY} min={-40} max={40} step={1} onChange={(next) => onChange({ ...value, customShadowY: next, shadow: 'custom' })} />
        </>
      )}

      {activeTextTab === 'transform' && (
        <>
          <Control label="moveX" path={`${pathPrefix}.moveX`} value={value.moveX} min={-250} max={250} step={1} onChange={(next) => onChange({ ...value, moveX: next })} />
          <Control label="moveY" path={`${pathPrefix}.moveY`} value={value.moveY} min={-120} max={120} step={1} onChange={(next) => onChange({ ...value, moveY: next })} />
          <Control label="rotate" path={`${pathPrefix}.rotate`} value={value.rotate} min={-45} max={45} step={1} onChange={(next) => onChange({ ...value, rotate: next })} />
          <Control label="skewX" path={`${pathPrefix}.skewX`} value={value.skewX} min={-30} max={30} step={1} onChange={(next) => onChange({ ...value, skewX: next })} />
        </>
      )}
    </>
  );
}

function SelectControl({
  label,
  value,
  onChange,
  options,
  path,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  path?: string;
  hint?: string;
}) {
  return (
    <div className={styles.debugControlRow}>
      <ControlMeta label={label} path={path} hint={hint} />
      <div className={styles.debugControlInputs}>
        <select value={value} onChange={(event) => onChange(event.target.value)} className={styles.debugInput}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  onReset,
  path,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onReset?: () => void;
  path?: string;
  hint?: string;
}) {
  return (
    <div className={styles.debugControlRow}>
      <ControlMeta label={label} path={path} hint={hint} />
      <div className={styles.debugControlInputs}>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={styles.debugInput} />
        {onReset && <button className={styles.debugResetLink} onClick={onReset} title="Reset">↺</button>}
      </div>
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange,
  onReset,
  path,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onReset?: () => void;
  path?: string;
  hint?: string;
}) {
  return (
    <div className={styles.debugControlRow}>
      <ControlMeta label={label} path={path} hint={hint} />
      <div className={styles.debugControlInputs}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className={styles.debugColorInput} />
        <span className={styles.debugValueDisplay}>{value}</span>
        {onReset && <button className={styles.debugResetLink} onClick={onReset} title="Reset">↺</button>}
      </div>
    </div>
  );
}

function ToggleControl({
  label,
  value,
  onChange,
  onReset,
  path,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  onReset?: () => void;
  path?: string;
  hint?: string;
}) {
  return (
    <div className={styles.debugControlRow}>
      <ControlMeta label={label} path={path} hint={hint} />
      <div className={styles.debugControlInputs}>
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        <span className={styles.debugValueDisplay}>{value ? 'ON' : 'OFF'}</span>
        {onReset && <button className={styles.debugResetLink} onClick={onReset} title="Reset">↺</button>}
      </div>
    </div>
  );
}

function Control({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onReset,
  path,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onReset?: () => void;
  path?: string;
  hint?: string;
}) {
  const [inputValue, setInputValue] = useState(String(value));
  const [isEditing, setIsEditing] = useState(false);

  const commitInputValue = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setInputValue(String(value));
      setIsEditing(false);
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setInputValue(String(value));
      setIsEditing(false);
      return;
    }

    const nextValue = clampNumber(parsed, min, max);
    setInputValue(String(nextValue));
    setIsEditing(false);
    onChange(nextValue);
  }, [inputValue, max, min, onChange, value]);

  return (
    <div className={styles.debugControlRow}>
      <ControlMeta label={label} path={path} hint={hint} />
      <div className={styles.debugControlInputs}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={styles.debugRangeInput}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={isEditing ? inputValue : String(value)}
          onFocus={() => {
            setIsEditing(true);
            setInputValue(String(value));
          }}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={commitInputValue}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitInputValue();
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === 'Escape') {
              setInputValue(String(value));
              setIsEditing(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={styles.debugNumberInput}
        />
        {onReset && <button className={styles.debugResetLink} onClick={onReset} title="Reset">↺</button>}
      </div>
    </div>
  );
}

