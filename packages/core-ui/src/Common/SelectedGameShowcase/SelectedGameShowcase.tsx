import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  SelectedGameLayoutControls,
  SelectedGamePresentation,
  SelectedGamePresentationChunk,
  SelectedGamePresentationMetric,
  SelectedGamePresentationVisualRef,
  SelectedGameTabId,
} from '@ocentra/game-asset-domain/ui/selectedGame/SelectedGamePresentation';

type LayoutMode = 'auto' | 'wide' | 'narrow';

interface StepInfo {
  title: string;
  body: string;
  icon: string;
}

interface TopTabContent {
  eyebrow: string;
  title: string;
  paragraphs: [string, string][];
  stepsTitle: string;
  steps: StepInfo[];
}

interface GoalCardInfo {
  id: string;
  chunkId: string;
  title: string;
  tabId: SelectedGameTabId;
  icon: string;
  iconColor: string;
  bullets: string[];
}

export interface SelectedGameShowcaseProps {
  activeTabId?: SelectedGameTabId;
  className?: string;
  designerMode?: boolean;
  fallbackArtUrl?: string;
  fallbackOverviewArtUrl?: string;
  layoutControls?: SelectedGameLayoutControls;
  layoutMode?: LayoutMode;
  onActiveTabChange?: (tabId: SelectedGameTabId) => void;
  onActionClick?: (actionId: SelectedGamePresentation['actions'][number]['id']) => void;
  onViewLobbies?: () => void;
  presentation?: SelectedGamePresentation;
  renderActiveVisualContent?: (context: {
    chunk: SelectedGamePresentationChunk | null;
    presentation: SelectedGamePresentation;
    tabId: SelectedGameTabId;
  }) => React.ReactNode;
  resolveVisualRefUrl?: (ref: SelectedGamePresentationVisualRef) => string | null | undefined;
  showDesignerControls?: boolean;
}

type SelectedGameShowcaseConfig = typeof DEFAULT_SELECTED_GAME_SHOWCASE_CONFIG;
type ConfigRecord = Record<string, unknown>;

type NumberControlField = [path: string, label: string, min: number, max: number, step?: number];
type ToggleControlField = [path: string, label: string, kind: 'toggle'];
type ColorControlField = [path: string, label: string, kind: 'color'];
type ControlField = NumberControlField | ToggleControlField | ColorControlField;

interface ControlSection {
  title: string;
  fields: ControlField[];
}

interface ControlGroup {
  label: string;
  sections: ControlSection[];
}

const defaultFallbackArtUrl = 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=1400&q=90';
const defaultFallbackOverviewArtUrl = 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=1200&q=90';

const TAB_ICONS: Record<SelectedGameTabId, string> = {
  about: 'i',
  rules: 'R',
  deck: 'D',
  ranking: 'A',
  scoring: '+',
  strategy: 'S',
  systems: '*',
};

const TAB_COLORS: Record<SelectedGameTabId, string> = {
  about: '#55ff7a',
  rules: '#c43cff',
  deck: '#62d8ff',
  ranking: '#6f86ff',
  scoring: '#ffd45a',
  strategy: '#ff8f5a',
  systems: '#55b7ff',
};

const FALLBACK_PRESENTATION: SelectedGamePresentation = {
  hero: { title: 'GAME', taglineLines: [], badges: [], media: [] },
  sideA: { stats: [], media: [] },
  tabs: [
    { id: 'about', label: 'About', chunks: [], tip: '' },
    { id: 'rules', label: 'Rules', chunks: [], tip: '' },
    { id: 'deck', label: 'Deck', chunks: [], tip: '' },
    { id: 'ranking', label: 'Ranking', chunks: [], tip: '' },
    { id: 'scoring', label: 'Scoring', chunks: [], tip: '' },
    { id: 'strategy', label: 'Strategy', chunks: [], tip: '' },
    { id: 'systems', label: 'Systems', chunks: [], tip: '' },
  ],
  quickInfo: { about: [], rules: [], deck: [], ranking: [], scoring: [], strategy: [], systems: [] },
  tip: { about: '', rules: '', deck: '', ranking: '', scoring: '', strategy: '', systems: '' },
  actions: [{ id: 'explore-card-games', label: 'Explore Games' }],
};
const DEFAULT_SELECTED_GAME_SHOWCASE_CONFIG = {
  canvas: {
    vw: 1920,
    vh: 1080,
    pad: 12,
    whitePreviewBg: true,
    svgBgOpacity: 0,
    showDebugLabels: false,
  },
  visibility: {
    tabGroup: true,
    pageFrame: true,
    bodyOverlay: true,
    sideA: true,
    hero: true,
    stats: true,
    sideAImage: true,
    sideB: true,
    divider: true,
    overview: true,
    overviewImage: true,
    howTo: true,
    howToCards: true,
    strip: true,
    tip: true,
    button: true,
  },
  page: {
    width: 1784,
    x: 68,
    y: 64,
    height: 980,
    radius: 14,
    strokeWidth: 1.7,
    shadowBlur: 18,
    shadowY: 15,
    shadowOpacity: 0.7,
  },
  tabGroup: {
    y: 18,
    tabW: 166,
    tabH: 50,
    tabGap: 10,
    bgPadX: 12,
    bgPadY: 8,
    radius: 10,
    tabTopRadius: 7,
    tabBottomRadius: 0,
    fontSize: 17,
    activeLineH: 3,
    shineH: 14,
  },
  body: {
    bottomInset: 24,
    rowGap: 18,
    leftWidth: 500,
    useABRatio: true,
    aRatio: 0.28,
    dividerWidth: 1.4,
    dividerConnectToStrip: true,
    dividerConnectorWidth: 1.4,
    dividerConnectorOpacity: 0.48,
    overlayRadius: 14,
    overlayDither: false,
    overlayDitherOpacity: 0.015,
    overlayDitherScale: 8,
    overlayMidStop: 0.36,
    overlaySoftStop: 0.72,
  },
  sideA: {
    logoXPad: 26,
    logoY: 30,
    logoFont: 62,
    taglineFont: 21,
    taglineGap: 30,
    statsY: 274,
    statsH: 60,
    statsGap: 10,
    statRadius: 8,
    artY: 374,
    artBottomPad: 280,
    artTopFade: 0.12,
    artBottomFade: 0.82,
  },
  overview: {
    xPad: 22,
    textX: 30,
    titleY: 44,
    titleFont: 23,
    titleLetterSpacing: 4,
    bodyY: 86,
    bodyFont: 18,
    lineGap: 29,
    paraGap: 53,
    imageRatio: 0.43,
    imageBottomHowToRatio: 1,
    imageCornerFadeCx: 1,
    imageCornerFadeCy: 0,
    imageCornerFadeInner: 0.18,
    imageCornerFadeSoft1: 0.42,
    imageCornerFadeSoft2: 0.68,
    imageCornerFadeOuter: 0.95,
    imageCornerFadeMidOpacity: 0.62,
    imageCornerFadeSoftOpacity: 0.22,
    imageMaskBlur: 18,
  },
  howTo: {
    yOffset: 26,
    topGap: 18,
    height: 265,
    xPad: 22,
    headerH: 54,
    bodyPadX: 18,
    bodyPadBottom: 16,
    arrowW: 34,
    titleFont: 22,
    titleLetterSpacing: 4,
    boxRadius: 12,
    stepRadius: 10,
    stepCircleMaxR: 34,
    stepIconScale: 0.78,
    stepTitleFont: 15,
    stepBodyFont: 11.5,
    stepsPerPage: 3,
    pagerArrowWidth: 34,
    pagerArrowHeight: 46,
    pagerSideInset: 8,
    pagerPillW: 10,
    pagerActivePillW: 24,
    pagerPillH: 6,
    pagerPillGap: 6,
  },
  strip: {
    yOffset: 0,
    topGap: 18,
    insetX: 24,
    height: 198,
    radius: 14,
    fillOpacity: 0.42,
    shineH: 34,
    carouselPadTop: 18,
    carouselPadBottom: 31,
    carouselSidePad: 14,
    arrowWidth: 46,
    arrowHeight: 46,
    arrowOutsideGap: 8,
    arrowYOffset: -6,
    arrowRadius: 10,
    cardGap: 14,
    forceUniformCardWidth: false,
    uniformCardWidth: 230,
    cardMinWidth: 150,
    cardMaxWidth: 300,
    cardTextPadRight: 20,
    headerTextExtraPad: 18,
    cardRadius: 12,
    headerStripHeight: 38,
    headerIconSize: 21,
    headerIconInsetX: 18,
    headerTitleFont: 15,
    headerTitleInsetX: 48,
    headerLetterSpacing: 2.4,
    bulletTop: 58,
    bulletFont: 11.5,
    bulletGap: 6,
    bulletInsetX: 18,
    bulletDotSize: 2.8,
    bodyLineHeight: 15,
    footerLineOffset: -5,
    footerPillY: 4,
    footerPillW: 14,
    footerActivePillW: 30,
    footerPillH: 8,
    footerPillGap: 7,
  },
  tip: {
    yOffset: 0,
    topGap: 18,
    height: 74,
    sideInset: 360,
    radius: 10,
    iconX: 32,
    textX: 130,
    iconFont: 20,
    textFont: 18,
  },
  button: {
    yOffsetFromBottom: 34,
    edgeOffsetY: 0,
    railHeight: 86,
    railInsetX: 0,
    width: 356,
    height: 62,
    radius: 9,
    fontSize: 23,
    letterSpacing: 3,
    strokeOpacity: 0.68,
    shineH: 16,
    innerBoxW: 42,
    innerBoxInset: 0,
    innerBoxInsetLeft: 0,
    innerBoxInsetTop: 0,
    innerBoxInsetRight: 0,
    innerBoxInsetBottom: 0,
    innerBoxRadius: 4,
    innerBoxStrokeWidth: 1.1,
    innerBoxStrokeOpacity: 0.78,
    innerBoxShineH: 12,
    innerBoxShineOpacity: 0.16,
    arrowSize: 11,
    arrowOffsetX: 0,
    arrowOffsetY: 0,
  },
  glow: {
    page: true,
    pageBlur: 7,
    pageOpacity: 0.55,
    tabs: true,
    tabsBlur: 5,
    tabsOpacity: 0.58,
    panels: true,
    panelsBlur: 5,
    panelsOpacity: 0.35,
    strip: true,
    stripBlur: 6,
    stripOpacity: 0.5,
    button: true,
    buttonBlur: 8,
    buttonOpacity: 0.55,
    color: '#64d8ff',
    activeColor: '#ffe187',
  },
  colors: {
    pageStroke: '#64d8ff',
    tabStroke: '#5fc9ff',
    tabInactiveFill: '#071827',
    tabActiveTop: '#332904',
    tabActiveMid: '#0e314b',
    tabActiveBottom: '#071827',
    tabActiveLine: '#63dfff',
    bodyOverlayTop: '#071d4b',
    bodyOverlayMid: '#08223a',
    bodyOverlayBottom: '#061221',
    cardPanelFill: '#061827',
    panelStroke: '#64d8ff',
    textPrimary: '#e8edff',
    textMuted: '#cbd5ff',
    titlePurple: '#c9b7ff',
    iconPurple: '#9d86ff',
    success: '#49d36d',
    tipGold: '#ffd66b',
    stripStroke: '#64d8ff',
    stripCardStroke: '#64d8ff',
    stripActiveStroke: '#ffe187',
    arrowHover: '#47f29a',
    buttonLeft: '#62bcff',
    buttonMid: '#7569ee',
    buttonRight: '#c927d5',
  },
};

const NARROW_CONFIG_OVERRIDES = {
  canvas: { vw: 390, vh: 760 },
  visibility: { stats: false },
  page: { x: 12, y: 47, width: 366, height: 535 },
  tabGroup: { y: 14, tabW: 47, tabH: 28, tabGap: 3, fontSize: 7.4, bgPadX: 4, bgPadY: 4 },
  body: { aRatio: 0.34, rowGap: 9, bottomInset: 12 },
  sideA: { logoXPad: 12, logoY: 18, logoFont: 22, taglineFont: 9.2, taglineGap: 16, statsY: 74, statsH: 30, statsGap: 4, artY: 106, artBottomPad: 220 },
  overview: { xPad: 10, textX: 16, titleY: 24, titleFont: 12.5, titleLetterSpacing: 1.2, bodyY: 48, bodyFont: 8.8, lineGap: 12, paraGap: 42, imageRatio: 0.25 },
  howTo: { yOffset: 0, topGap: 10, height: 190, xPad: 10, headerH: 48, bodyPadX: 9, bodyPadBottom: 8, arrowW: 14, titleFont: 11, titleLetterSpacing: 1.1, stepTitleFont: 8.8, stepBodyFont: 6.8, stepsPerPage: 2, pagerArrowWidth: 18, pagerArrowHeight: 34, pagerSideInset: -22 },
  strip: { topGap: 10, height: 145, insetX: 10, arrowWidth: 20, arrowHeight: 34, arrowOutsideGap: -20, cardGap: 8, cardMinWidth: 82, cardMaxWidth: 112, bulletFont: 6.8, headerTitleFont: 8.2, headerTitleInsetX: 24, headerIconInsetX: 9, headerIconSize: 14, headerLetterSpacing: 0.4, bulletTop: 42, bulletGap: 4, bulletInsetX: 10, bodyLineHeight: 9.8 },
  tip: { sideInset: 28, height: 48, iconX: 16, textX: 54, iconFont: 14, textFont: 9.2 },
  button: { railHeight: 52, railInsetX: 24, width: 260, height: 36, fontSize: 7.2, letterSpacing: 0.25, innerBoxW: 18, arrowSize: 6 },
};

function cloneDefaultConfig(): SelectedGameShowcaseConfig {
  return JSON.parse(JSON.stringify(DEFAULT_SELECTED_GAME_SHOWCASE_CONFIG)) as SelectedGameShowcaseConfig;
}

function mergeConfig(base: SelectedGameShowcaseConfig, overrides: ConfigRecord): SelectedGameShowcaseConfig {
  const next = cloneConfig(base) as ConfigRecord;
  Object.entries(overrides).forEach(([groupKey, groupValue]) => {
    if (typeof groupValue === 'object' && groupValue !== null && !Array.isArray(groupValue)) {
      next[groupKey] = {
        ...((next[groupKey] as ConfigRecord | undefined) ?? {}),
        ...(groupValue as ConfigRecord),
      };
      return;
    }
    next[groupKey] = groupValue;
  });
  return next as SelectedGameShowcaseConfig;
}

function cloneConfig(config: SelectedGameShowcaseConfig): SelectedGameShowcaseConfig {
  return JSON.parse(JSON.stringify(config)) as SelectedGameShowcaseConfig;
}

function isUnsafeConfigPathPart(part: string): boolean {
  return part === '__proto__' || part === 'prototype' || part === 'constructor' || part.length === 0;
}

function setConfigProperty(target: ConfigRecord, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function getByPath(obj: ConfigRecord, path: string): unknown {
  if (!isAllowedConfigPath(path)) return undefined;
  return path.split('.').reduce<unknown>((acc, part) => {
    if (typeof acc !== 'object' || acc === null) return undefined;
    if (isUnsafeConfigPathPart(part)) return undefined;
    return (acc as ConfigRecord)[part];
  }, obj);
}

function setByPath<T extends ConfigRecord>(obj: T, path: string, value: unknown): T {
  if (!isAllowedConfigPath(path)) return obj;
  const parts = path.split('.');
  if (parts.some(isUnsafeConfigPathPart)) {
    return obj;
  }
  const root = { ...obj };
  let cursor: ConfigRecord = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const current = cursor[part];
    const next = typeof current === 'object' && current !== null ? { ...(current as ConfigRecord) } : {};
    setConfigProperty(cursor, part, next);
    cursor = next;
  }
  setConfigProperty(cursor, parts[parts.length - 1], value);
  return root as T;
}

function roundedRectPath(x: number, y: number, w: number, h: number, tl = 0, tr = 0, br = 0, bl = 0): string {
  const maxR = Math.max(0, Math.min(w / 2, h / 2));
  const rtl = Math.min(Math.max(0, tl), maxR);
  const rtr = Math.min(Math.max(0, tr), maxR);
  const rbr = Math.min(Math.max(0, br), maxR);
  const rbl = Math.min(Math.max(0, bl), maxR);
  return [
    `M${x + rtl} ${y}`,
    `H${x + w - rtr}`,
    rtr ? `Q${x + w} ${y} ${x + w} ${y + rtr}` : `L${x + w} ${y}`,
    `V${y + h - rbr}`,
    rbr ? `Q${x + w} ${y + h} ${x + w - rbr} ${y + h}` : `L${x + w} ${y + h}`,
    `H${x + rbl}`,
    rbl ? `Q${x} ${y + h} ${x} ${y + h - rbl}` : `L${x} ${y + h}`,
    `V${y + rtl}`,
    rtl ? `Q${x} ${y} ${x + rtl} ${y}` : `L${x} ${y}`,
    'Z',
  ].join(' ');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines;
}

function estimateStripCardWidth(card: GoalCardInfo, c: SelectedGameShowcaseConfig['strip']): number {
  if (c.forceUniformCardWidth) return c.uniformCardWidth;
  const title = card.title.toUpperCase();
  const titleW = c.headerTitleInsetX + title.length * c.headerTitleFont * 0.66 + Math.max(0, title.length - 1) * c.headerLetterSpacing + c.cardTextPadRight + c.headerTextExtraPad;
  const bulletW = Math.max(...card.bullets.map((bullet) => bullet.length * c.bulletFont * 0.52)) + c.bulletInsetX + c.bulletDotSize * 5 + c.cardTextPadRight;
  return Math.min(c.cardMaxWidth, Math.max(c.cardMinWidth, titleW, bulletW));
}

function SvgFitText({ x, y, width, height, text, maxFontSize, minFontSize = 8, fontWeight = '400', fill = '#ffffff', fontFamily = 'Arial', stroke, strokeWidth, paintOrder = 'normal' }: {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  maxFontSize: number;
  minFontSize?: number;
  fontWeight?: string;
  fill?: string;
  fontFamily?: string;
  stroke?: string;
  strokeWidth?: number;
  paintOrder?: string;
}) {
  const approxWidthAtMax = text.length * maxFontSize * 0.52;
  const widthScale = width / Math.max(1, approxWidthAtMax);
  const heightScale = height / Math.max(1, maxFontSize * 1.2);
  const fontSize = Math.max(minFontSize, Math.min(maxFontSize, maxFontSize * Math.min(1, widthScale, heightScale)));
  return <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="central" fontFamily={fontFamily} fontSize={fontSize} fontWeight={fontWeight} fill={fill} stroke={stroke} strokeWidth={strokeWidth} paintOrder={paintOrder}>{text}</text>;
}

function SvgWrappedText({ x, y, width, height, text, maxFontSize, minFontSize = 7, lineHeight = 1.16, fill = '#cbd5ff', fontFamily = 'Arial', fontWeight = '400', stroke, strokeWidth, paintOrder = 'normal' }: {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  maxFontSize: number;
  minFontSize?: number;
  lineHeight?: number;
  fill?: string;
  fontFamily?: string;
  fontWeight?: string;
  stroke?: string;
  strokeWidth?: number;
  paintOrder?: string;
}) {
  const makeLines = (fontSize: number) => wrapText(text, Math.max(8, Math.floor(width / (fontSize * 0.5))));
  let fontSize = maxFontSize;
  let lines = makeLines(fontSize);
  while (fontSize > minFontSize && lines.length * fontSize * lineHeight > height) {
    fontSize -= 0.5;
    lines = makeLines(fontSize);
  }
  const totalH = lines.length * fontSize * lineHeight;
  const firstY = y + Math.max(0, (height - totalH) / 2) + fontSize * 0.78;
  return <text x={x + width / 2} y={firstY} textAnchor="middle" fontFamily={fontFamily} fontSize={fontSize} fontWeight={fontWeight} fill={fill} stroke={stroke} strokeWidth={strokeWidth} paintOrder={paintOrder}>{lines.map((line, index) => <tspan key={`${line}-${index}`} x={x + width / 2} dy={index === 0 ? 0 : fontSize * lineHeight}>{line}</tspan>)}</text>;
}

function DebugLabel({ x, y, label, cfg }: {
  x: number;
  y: number;
  label: string;
  cfg: SelectedGameShowcaseConfig;
}) {
  if (!cfg.canvas.showDebugLabels) return null;
  return <text x={x} y={y} fontFamily="Arial" fontSize="13" fontWeight="900" fill="#ff2f92" stroke="#ffffff" strokeWidth="3" paintOrder="stroke">{label}</text>;
}

function BoundsLabel({ x, y, label, fill = '#facc15' }: {
  x: number;
  y: number;
  label: string;
  fill?: string;
}) {
  const width = Math.max(74, label.length * 8.5 + 18);
  return (
    <g pointerEvents="none">
      <rect x={x} y={y - 18} width={width} height={22} rx="5" fill="#020617" fillOpacity="0.88" stroke={fill} strokeOpacity="0.86" />
      <text x={x + 9} y={y - 4} fontFamily="Arial" fontSize="12" fontWeight="900" fill={fill}>
        {label}
      </text>
    </g>
  );
}

function chunkToContent(tabId: SelectedGameTabId, chunk: SelectedGamePresentationChunk | null): TopTabContent {
  const sourceLines = chunk
    ? tabId === 'about'
      ? (chunk.body.length ? chunk.body : chunk.bullets)
      : [...chunk.body, ...chunk.bullets].filter(Boolean)
    : [];
  const bodyLines = sourceLines.slice(0, 4);
  const paragraphs = bodyLines.length > 0
    ? bodyLines.map((line) => {
      const wrapped = wrapText(line, 72);
      return [wrapped[0] ?? '', wrapped.slice(1).join(' ')] as [string, string];
    })
    : [['', ''] as [string, string]];
  const steps = (chunk?.bullets.length ? chunk.bullets : chunk?.body ?? []).slice(0, 5).map((item, index) => stepFromLine(tabId, chunk, item, index));

  return {
    eyebrow: chunk?.eyebrow && chunk.eyebrow.length <= 3 ? chunk.eyebrow : TAB_ICONS[tabId],
    title: (chunk?.title || 'Details').toUpperCase(),
    paragraphs,
    stepsTitle: (tabId === 'about' ? 'How to Play' : chunk?.kind === 'example' ? 'Examples' : 'Highlights').toUpperCase(),
    steps: steps.length > 0 ? steps : [{ title: 'No authored chunk', body: '', icon: TAB_ICONS[tabId] }],
  };
}

function stepFromLine(
  tabId: SelectedGameTabId,
  chunk: SelectedGamePresentationChunk | null,
  value: string,
  index: number,
): StepInfo {
  const separatorIndex = value.indexOf(':');
  const title = separatorIndex > 0 && separatorIndex <= 28 ? value.slice(0, separatorIndex).trim() : '';
  return {
    title: title || (tabId === 'about' ? `Step ${index + 1}` : chunk?.title || `Item ${index + 1}`),
    body: title ? value.slice(separatorIndex + 1).trim() : value,
    icon: TAB_ICONS[tabId],
  };
}

function chunkToGoalCard(tabId: SelectedGameTabId, chunk: SelectedGamePresentationChunk): GoalCardInfo {
  return {
    id: `${tabId}:${chunk.id}`,
    chunkId: chunk.id,
    title: chunk.title,
    tabId,
    icon: TAB_ICONS[tabId],
    iconColor: TAB_COLORS[tabId],
    bullets: (chunk.bullets.length ? chunk.bullets : chunk.body).slice(0, 4),
  };
}

function buildGlobalStripCards(tabs: SelectedGamePresentation['tabs']): GoalCardInfo[] {
  const seen = new Set<string>();
  const cards: GoalCardInfo[] = [];
  for (const tab of tabs) {
    for (const chunk of tab.chunks) {
      const key = `${tab.id}:${chunk.title.toLowerCase()}:${chunk.eyebrow ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push(chunkToGoalCard(tab.id, chunk));
    }
  }
  return cards;
}

function resolveFirstVisualUrl(
  refs: SelectedGamePresentationVisualRef[],
  resolveVisualRefUrl: SelectedGameShowcaseProps['resolveVisualRefUrl'],
): string | null {
  for (const ref of refs) {
    if (ref.kind !== 'image') continue;
    const url = resolveVisualRefUrl?.(ref);
    if (url) return url;
  }
  return null;
}

function resolveVisualUrls(
  refs: SelectedGamePresentationVisualRef[],
  resolveVisualRefUrl: SelectedGameShowcaseProps['resolveVisualRefUrl'],
): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  refs.forEach((ref) => {
    if (ref.kind !== 'image') return;
    const url = resolveVisualRefUrl?.(ref);
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  });
  return urls;
}

function isHowToChunk(chunk: SelectedGamePresentationChunk): boolean {
  return /\b(how to|how-to|setup|turn|showdown|play)\b/i.test(`${chunk.id} ${chunk.title} ${chunk.eyebrow}`);
}

function metricFallbacks(metrics: SelectedGamePresentationMetric[]): Array<{ label: string; value: string; icon: string }> {
  return metrics.slice(0, 4).map((metric) => ({
    label: metric.label,
    value: metric.value,
    icon: metric.icon || '#',
  }));
}

function mergeLayoutControls(base: SelectedGameShowcaseConfig, controls: SelectedGameLayoutControls | undefined): SelectedGameShowcaseConfig {
  return controls && Object.keys(controls).length > 0 ? mergeConfig(base, controls as ConfigRecord) : base;
}

function HeroSummary({ x, y, w, cfg, logoUrl, presentation }: {
  x: number;
  y: number;
  w: number;
  cfg: SelectedGameShowcaseConfig;
  logoUrl?: string | null;
  presentation: SelectedGamePresentation;
}) {
  const title = presentation.hero.title || 'GAME';
  const taglineLines = presentation.hero.taglineLines.length > 0 ? presentation.hero.taglineLines.slice(0, 2) : presentation.hero.badges.slice(0, 2);
  const subtitle = taglineLines[0] ?? '';
  const detail = taglineLines[1] ?? presentation.hero.badges[0] ?? '';
  const logoH = Math.min(94, Math.max(56, cfg.sideA.logoFont * 1.24));
  const fallbackTitleH = Math.min(120, Math.max(70, cfg.sideA.logoFont * 1.72));
  const logoY = y;
  const titleH = logoUrl ? logoH : fallbackTitleH;
  const subtitleY = logoY + titleH + (logoUrl ? 2 : 8);
  const detailY = subtitleY + (logoUrl ? 24 : 30);
  const narrowCanvas = cfg.canvas.vw <= 500;
  const subtitleMinFont = narrowCanvas ? 5 : 9;
  const detailMinFont = narrowCanvas ? 5 : 8;
  return (
    <g>
      {logoUrl ? (
        <image href={logoUrl} x={x + w * 0.12} y={logoY} width={w * 0.76} height={logoH} preserveAspectRatio="xMidYMid meet" />
      ) : (
        <SvgWrappedText
          x={x + 18}
          y={logoY + 2}
          width={w - 36}
          height={fallbackTitleH}
          text={title.toUpperCase()}
          maxFontSize={Math.min(cfg.sideA.logoFont, 58)}
          minFontSize={cfg.canvas.vw <= 500 ? 8 : 12}
          lineHeight={0.96}
          fontFamily="Impact, Arial Black"
          fontWeight="900"
          fill="#f4f7ff"
          stroke="#071321"
          strokeWidth={3}
          paintOrder="stroke"
        />
      )}
      {subtitle && <SvgFitText x={x + 14} y={subtitleY} width={w - 28} height={28} text={subtitle} maxFontSize={cfg.sideA.taglineFont} minFontSize={subtitleMinFont} fontWeight="800" fill="#ffffff" />}
      {detail && <SvgWrappedText x={x + 26} y={detailY} width={w - 52} height={42} text={detail} maxFontSize={Math.max(9, cfg.sideA.taglineFont * 0.72)} minFontSize={detailMinFont} fill="#cbd5ff" />}
    </g>
  );
}

function compactDeckMetric(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const plusJokers = normalized.match(/(\d+)[-\s]*card[^0-9]+(?:plus|\+)\s*(\d+)\s*jokers?/i);
  if (plusJokers) {
    return `${plusJokers[1]} + ${plusJokers[2]} Jokers`;
  }

  const cardCount = normalized.match(/(\d+)[-\s]*cards?/i) ?? normalized.match(/\bstandard\s+(\d+)\b/i);
  if (cardCount) {
    return `${cardCount[1]} Cards`;
  }

  return normalized;
}

function statDisplayValue(stat: { label: string; value: string }): string {
  if (/deck/i.test(stat.label)) {
    return compactDeckMetric(stat.value);
  }
  return stat.value;
}

function StatIcon({ x, y, size, label, fallback }: {
  x: number;
  y: number;
  size: number;
  label: string;
  fallback: string;
}) {
  const key = label.toLowerCase();
  const stroke = '#7c8dff';
  const fill = 'rgba(124, 141, 255, 0.16)';
  const cx = x + size / 2;
  const cy = y + size / 2;

  if (key.includes('player')) {
    return (
      <g fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx={x + size * 0.38} cy={y + size * 0.36} r={size * 0.16} fill={fill} />
        <circle cx={x + size * 0.66} cy={y + size * 0.42} r={size * 0.13} fill={fill} opacity="0.82" />
        <path d={`M${x + size * 0.18} ${y + size * 0.76} Q${x + size * 0.38} ${y + size * 0.56} ${x + size * 0.58} ${y + size * 0.76}`} />
        <path d={`M${x + size * 0.5} ${y + size * 0.77} Q${x + size * 0.67} ${y + size * 0.62} ${x + size * 0.83} ${y + size * 0.77}`} opacity="0.82" />
      </g>
    );
  }

  if (key.includes('deck')) {
    return (
      <g fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinejoin="round">
        <rect x={x + size * 0.22} y={y + size * 0.2} width={size * 0.5} height={size * 0.64} rx={size * 0.07} transform={`rotate(-8 ${cx} ${cy})`} />
        <rect x={x + size * 0.32} y={y + size * 0.15} width={size * 0.5} height={size * 0.64} rx={size * 0.07} transform={`rotate(7 ${cx} ${cy})`} />
      </g>
    );
  }

  if (key.includes('goal')) {
    return (
      <g fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round">
        <circle cx={cx} cy={cy} r={size * 0.34} fill={fill} />
        <circle cx={cx} cy={cy} r={size * 0.18} />
        <path d={`M${cx} ${y + size * 0.08} V${y + size * 0.26} M${cx} ${y + size * 0.74} V${y + size * 0.92} M${x + size * 0.08} ${cy} H${x + size * 0.26} M${x + size * 0.74} ${cy} H${x + size * 0.92}`} />
      </g>
    );
  }

  if (key.includes('timer') || key.includes('round')) {
    return (
      <g fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx={cx} cy={cy} r={size * 0.34} fill={fill} />
        <path d={`M${cx} ${cy} V${y + size * 0.34} L${x + size * 0.68} ${y + size * 0.62}`} />
        <path d={`M${x + size * 0.38} ${y + size * 0.1} H${x + size * 0.62}`} />
      </g>
    );
  }

  return <text x={cx} y={cy + 5} textAnchor="middle" fontFamily="Arial" fontSize={Math.max(12, size * 0.68)} fill={stroke}>{fallback}</text>;
}

function StatCard({ x, y, w, h, stat, cfg }: {
  x: number;
  y: number;
  w: number;
  h: number;
  stat: { label: string; value: string; icon: string };
  cfg: SelectedGameShowcaseConfig;
}) {
  const displayValue = statDisplayValue(stat);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={cfg.sideA.statRadius} fill={cfg.colors.cardPanelFill} fillOpacity="0.72" stroke={cfg.colors.panelStroke} strokeWidth="1.1" strokeOpacity="0.34" />
      <StatIcon x={x + 9} y={y + 14} size={22} label={stat.label} fallback={stat.icon} />
      <SvgFitText x={x + 36} y={y + 11} width={Math.max(18, w - 44)} height={23} text={displayValue} maxFontSize={15} minFontSize={7} fontWeight="800" fill="#ffffff" />
      <SvgFitText x={x + 8} y={y + 35} width={Math.max(18, w - 16)} height={18} text={stat.label} maxFontSize={13} minFontSize={7} fill="#d9ddff" />
    </g>
  );
}

function LeftCardArt({ x, y, w, h, cfg, imageUrls, activeIndex, previousIndex }: {
  x: number;
  y: number;
  w: number;
  h: number;
  cfg: SelectedGameShowcaseConfig;
  imageUrls: string[];
  activeIndex: number;
  previousIndex: number | null;
}) {
  const top = Math.max(0, Math.min(1, cfg.sideA.artTopFade));
  const bottom = Math.max(0, Math.min(1, cfg.sideA.artBottomFade));
  const activeUrl = imageUrls[activeIndex] ?? imageUrls[0] ?? defaultFallbackArtUrl;
  const previousUrl = previousIndex !== null ? imageUrls[previousIndex] : null;
  const pillW = 18;
  const pillGap = 7;
  const pillTotalW = imageUrls.length * pillW + Math.max(0, imageUrls.length - 1) * pillGap;
  const pillStartX = x + w / 2 - pillTotalW / 2;
  const pillY = y + h - 28;
  return (
    <g>
      <defs>
        <clipPath id="leftArtClip"><rect x={x} y={y} width={w} height={h} /></clipPath>
        <linearGradient id="leftArtFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000000" />
          <stop offset={top} stopColor="#ffffff" />
          <stop offset={bottom} stopColor="#ffffff" />
          <stop offset="1" stopColor="#000000" />
        </linearGradient>
        <mask id="leftArtMask" maskUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}>
          <rect x={x} y={y} width={w} height={h} fill="url(#leftArtFade)" />
        </mask>
      </defs>
      {previousUrl && <image href={previousUrl} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath="url(#leftArtClip)" mask="url(#leftArtMask)" style={{ opacity: 0, transition: 'opacity 900ms ease-in-out' }} />}
      <image href={activeUrl} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath="url(#leftArtClip)" mask="url(#leftArtMask)" style={{ opacity: 1, transition: 'opacity 900ms ease-in-out' }} />
      {imageUrls.length > 1 && imageUrls.slice(0, 12).map((url, index) => (
        <rect key={`${url}-${index}`} x={pillStartX + index * (pillW + pillGap)} y={pillY} width={index === activeIndex ? pillW + 10 : pillW} height="6" rx="3" fill={index === activeIndex ? cfg.colors.stripActiveStroke : cfg.colors.panelStroke} opacity={index === activeIndex ? 0.92 : 0.35} />
      ))}
    </g>
  );
}

function ChunkSelectorRow({ x, y, maxW, chunks, activeChunkId, cfg, onSelectChunk }: {
  x: number;
  y: number;
  maxW: number;
  chunks: SelectedGamePresentationChunk[];
  activeChunkId: string;
  cfg: SelectedGameShowcaseConfig;
  onSelectChunk: (chunkId: string) => void;
}) {
  if (chunks.length <= 1) return null;
  const gap = 8;
  const height = 31;
  const visibleChunks = chunks.slice(0, 7);
  const widths = visibleChunks.map((chunk) => Math.max(86, Math.min(152, chunk.title.length * 9 + 36)));
  const totalW = widths.reduce((sum, value) => sum + value, 0) + Math.max(0, visibleChunks.length - 1) * gap;
  const scale = Math.min(1, maxW / Math.max(1, totalW));
  const positionedChunks = visibleChunks.reduce<Array<{ chunk: SelectedGamePresentationChunk; currentX: number; width: number }>>((rows, chunk, index) => {
    const width = widths[index];
    const previous = rows.at(-1);
    const currentX = previous ? previous.currentX + previous.width + gap : x;
    return [...rows, { chunk, currentX, width }];
  }, []);
  return (
    <g transform={scale < 1 ? `translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})` : undefined}>
      {positionedChunks.map(({ chunk, currentX, width }) => {
        const active = chunk.id === activeChunkId;
        return (
          <g key={chunk.id} onClick={() => onSelectChunk(chunk.id)} style={{ cursor: 'pointer' }} filter={active ? 'url(#cyanGlow)' : undefined}>
            <rect x={currentX} y={y} width={width} height={height} rx="7" fill={active ? 'url(#tabSelectedFill)' : cfg.colors.tabInactiveFill} stroke={active ? '#d8bfff' : cfg.colors.tabStroke} strokeWidth={active ? 1.8 : 1.1} strokeOpacity={active ? 0.95 : 0.62} />
            <rect x={currentX + 3} y={y + 3} width={width - 6} height="9" rx="4" fill="#ffffff" opacity={active ? 0.16 : 0.06} />
            <SvgFitText x={currentX + 10} y={y + 6} width={width - 20} height={height - 10} text={chunk.title} maxFontSize={12} minFontSize={7} fontWeight="900" fill={active ? '#ffffff' : cfg.colors.textPrimary} />
          </g>
        );
      })}
    </g>
  );
}

function OverviewContent({ x, y, w, imageBottomY, cfg, content, imageUrl = defaultFallbackOverviewArtUrl, chunks, activeChunkId, onSelectChunk }: {
  x: number;
  y: number;
  w: number;
  imageBottomY: number;
  cfg: SelectedGameShowcaseConfig;
  content: TopTabContent;
  imageUrl?: string;
  chunks: SelectedGamePresentationChunk[];
  activeChunkId: string;
  onSelectChunk: (chunkId: string) => void;
}) {
  const o = cfg.overview;
  const textX = x + o.textX;
  const imageW = w * o.imageRatio;
  const imageX = x + w - imageW;
  const imageH = imageBottomY - y;
  const hasChunkSelector = chunks.length > 1;
  const textShiftY = hasChunkSelector ? 42 : 0;
  const chunkSelectorMaxW = Math.max(120, w - o.textX - 72);
  const textColumnW = Math.max(80, imageX - textX - 12);
  const maxLineChars = Math.max(12, Math.floor(textColumnW / Math.max(1, o.bodyFont * 0.52)));
  const rewrapParagraphs = cfg.canvas.vw <= 500;
  return (
    <g>
      <defs>
        <clipPath id="overviewImageClip"><rect x={imageX} y={y} width={imageW} height={imageH} /></clipPath>
        <radialGradient id="overviewImageMaskGradient" cx={o.imageCornerFadeCx} cy={o.imageCornerFadeCy} r={o.imageCornerFadeOuter}>
          <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <stop offset={o.imageCornerFadeInner} stopColor="#ffffff" stopOpacity="1" />
          <stop offset={o.imageCornerFadeSoft1} stopColor="#ffffff" stopOpacity={o.imageCornerFadeMidOpacity} />
          <stop offset={o.imageCornerFadeSoft2} stopColor="#ffffff" stopOpacity={o.imageCornerFadeSoftOpacity} />
          <stop offset={o.imageCornerFadeOuter} stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="overviewImageMaskBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={o.imageMaskBlur} />
        </filter>
        <mask id="overviewImageMask" maskUnits="userSpaceOnUse" x={imageX} y={y} width={imageW} height={imageH}>
          <rect x={imageX} y={y} width={imageW} height={imageH} fill="url(#overviewImageMaskGradient)" filter="url(#overviewImageMaskBlur)" />
        </mask>
      </defs>
      {cfg.visibility.overviewImage && <image href={imageUrl} x={imageX} y={y} width={imageW} height={imageH} preserveAspectRatio="xMidYMid slice" clipPath="url(#overviewImageClip)" mask="url(#overviewImageMask)" />}
      <ChunkSelectorRow x={textX} y={y + 14} maxW={chunkSelectorMaxW} chunks={chunks} activeChunkId={activeChunkId} cfg={cfg} onSelectChunk={onSelectChunk} />
      <text x={textX} y={y + o.titleY + textShiftY} fontFamily="Arial" fontSize="18" fontWeight="900" fill={cfg.colors.iconPurple}>{content.eyebrow}</text>
      <text x={textX + 30} y={y + o.titleY + textShiftY} fontFamily="Impact, Arial Black" fontSize={o.titleFont} letterSpacing={o.titleLetterSpacing} fill={cfg.colors.titlePurple}>{content.title}</text>
      {content.paragraphs.map((lines, paragraphIndex) => {
        const startY = y + o.bodyY + textShiftY + paragraphIndex * o.paraGap;
        const paragraphLines = rewrapParagraphs ? wrapText(lines.filter(Boolean).join(' '), maxLineChars).slice(0, 3) : lines;
        return paragraphLines.map((line, lineIndex) => (
          <text key={`${paragraphIndex}-${lineIndex}`} x={textX} y={startY + lineIndex * o.lineGap} fontFamily="Arial" fontSize={o.bodyFont} fill={cfg.colors.textPrimary}>{line}</text>
        ));
      })}
      <DebugLabel x={x + 8} y={y + 16} label="overview" cfg={cfg} />
    </g>
  );
}

function HowToContent({ x, y, w, h, cfg, content }: {
  x: number;
  y: number;
  w: number;
  h: number;
  cfg: SelectedGameShowcaseConfig;
  content: TopTabContent;
}) {
  const c = cfg.howTo;
  const activeSteps = content.steps;
  const stepsPerPage = Math.max(1, Math.min(activeSteps.length, Math.round(c.stepsPerPage)));
  const maxStepStart = Math.max(0, activeSteps.length - stepsPerPage);
  const [stepStart, setStepStart] = useState(0);
  const safeStepStart = Math.min(stepStart, maxStepStart);
  const visibleSteps = activeSteps.slice(safeStepStart, safeStepStart + stepsPerPage);
  const pageCount = Math.max(1, Math.ceil(activeSteps.length / stepsPerPage));
  const currentPage = Math.min(pageCount - 1, Math.floor(safeStepStart / stepsPerPage));
  const bodyX = x + c.bodyPadX;
  const bodyY = y + c.headerH;
  const bodyW = w - c.bodyPadX * 2;
  const bodyH = h - c.headerH - c.bodyPadBottom;
  const hasPager = activeSteps.length > stepsPerPage;
  const deckW = bodyW;
  const deckX = bodyX;
  const stepW = (deckW - c.arrowW * (visibleSteps.length - 1)) / Math.max(1, visibleSteps.length);
  const nextPage = () => setStepStart((value) => Math.min(maxStepStart, Math.min(value, maxStepStart) + stepsPerPage));
  const previousPage = () => setStepStart((value) => Math.max(0, Math.min(value, maxStepStart) - stepsPerPage));
  const pagerW = pageCount * c.pagerPillW + Math.max(0, pageCount - 1) * c.pagerPillGap + c.pagerActivePillW - c.pagerPillW;
  const pagerX = x + w - pagerW - 28;
  const pagerY = y + c.headerH / 2 - c.pagerPillH / 2;
  const shellRadius = Math.max(c.boxRadius, cfg.strip.radius);
  const shellFillOpacity = Math.max(0.34, Math.min(0.78, cfg.strip.fillOpacity));
  const pagerArrowY = y + h / 2 - c.pagerArrowHeight / 2;
  const pagerRows = Array.from({ length: pageCount }).reduce<Array<{ active: boolean; currentX: number; width: number; index: number }>>((rows, _, index) => {
    const active = index === currentPage;
    const width = active ? c.pagerActivePillW : c.pagerPillW;
    const previous = rows.at(-1);
    const currentX = previous ? previous.currentX + previous.width + c.pagerPillGap : pagerX;
    return [...rows, { active, currentX, width, index }];
  }, []);
  return (
    <g>
      <rect x={x} y={y + 8} width={w} height={h} rx={shellRadius} fill="#000000" opacity="0.18" pointerEvents="none" />
      {cfg.glow.strip && <rect x={x - 1.5} y={y - 1.5} width={w + 3} height={h + 3} rx={shellRadius + 1.5} fill="none" stroke={cfg.glow.color} strokeWidth="3" strokeOpacity={Math.min(0.35, cfg.glow.stripOpacity * 0.42)} pointerEvents="none" />}
      <rect x={x} y={y} width={w} height={h} rx={shellRadius} fill="url(#skeletonGlass)" fillOpacity={shellFillOpacity} stroke={cfg.colors.stripStroke} strokeWidth="2" strokeOpacity="0.84" />
      <rect x={x + 2} y={y + 2} width={w - 4} height={Math.min(c.headerH - 8, cfg.strip.shineH)} rx="12" fill="#ffffff" opacity="0.03" />
      <text x={x + 32} y={y + 39} fontFamily="Impact, Arial Black" fontSize={c.titleFont} letterSpacing={c.titleLetterSpacing} fill={cfg.colors.titlePurple}>{content.stepsTitle}</text>
      {pageCount > 1 && pagerRows.map(({ active, currentX, width, index }) => (
        <rect key={index} x={currentX} y={pagerY} width={width} height={c.pagerPillH} rx={c.pagerPillH / 2} fill={active ? 'url(#footerSelectedPill)' : 'transparent'} stroke={active ? cfg.colors.stripActiveStroke : cfg.colors.stripStroke} strokeWidth={active ? 1.4 : 1} strokeOpacity={active ? 0.9 : 0.46} />
      ))}
      {cfg.visibility.howToCards && hasPager && (
        <>
          <SmallArrow x={x - c.pagerArrowWidth - c.pagerSideInset} y={pagerArrowY} width={c.pagerArrowWidth} height={c.pagerArrowHeight} dir="left" radius={8} hoverColor={cfg.colors.arrowHover} onClick={previousPage} />
          <SmallArrow x={x + w + c.pagerSideInset} y={pagerArrowY} width={c.pagerArrowWidth} height={c.pagerArrowHeight} dir="right" radius={8} hoverColor={cfg.colors.arrowHover} onClick={nextPage} />
        </>
      )}
      {cfg.visibility.howToCards && visibleSteps.map((step, i) => {
        const stepX = deckX + i * (stepW + c.arrowW);
        const circleR = Math.min(c.stepCircleMaxR, bodyH * 0.23, stepW * 0.28);
        const circleCy = bodyY + bodyH * 0.34;
        const cx = stepX + stepW / 2;
        const titleY = circleCy + circleR + 10;
        const titleH = 22;
        const bodyTextY = titleY + titleH + 2;
        const bodyTextH = Math.max(18, bodyY + bodyH - bodyTextY - 8);
        return (
          <g key={`${step.title}-${i}`}>
            <rect x={stepX} y={bodyY} width={stepW} height={bodyH} rx={c.stepRadius} fill="url(#infoCardFill)" fillOpacity="0.78" stroke={cfg.colors.stripStroke} strokeWidth="1.1" strokeOpacity="0.34" />
            <rect x={stepX + 1.5} y={bodyY + 1.5} width={Math.max(0, stepW - 3)} height={Math.max(7, bodyH * 0.18)} rx={Math.max(0, c.stepRadius - 2)} fill="#ffffff" opacity="0.045" />
            <circle cx={cx} cy={circleCy} r={circleR} fill={cfg.colors.cardPanelFill} stroke={i === 0 ? cfg.colors.success : cfg.colors.panelStroke} strokeWidth="1.7" strokeOpacity="0.76" />
            <text x={cx} y={circleCy + 4} textAnchor="middle" dominantBaseline="central" fontFamily="Arial" fontSize={circleR * c.stepIconScale} fill="#d9e4ff">{step.icon}</text>
            <SvgFitText x={stepX + 8} y={titleY} width={stepW - 16} height={titleH} text={step.title} maxFontSize={c.stepTitleFont} minFontSize={8} fontWeight="800" fill={cfg.colors.textPrimary} />
            <SvgWrappedText x={stepX + 8} y={bodyTextY} width={stepW - 16} height={bodyTextH} text={step.body} maxFontSize={c.stepBodyFont} minFontSize={7} fill={cfg.colors.textMuted} />
            {i < visibleSteps.length - 1 && <text x={stepX + stepW + c.arrowW / 2} y={circleCy + 8} textAnchor="middle" fontFamily="Arial" fontSize="32" fill="#4c65d9" opacity="0.72">&gt;</text>}
          </g>
        );
      })}
      <DebugLabel x={x + 8} y={y + 16} label="howTo" cfg={cfg} />
    </g>
  );
}

function TipContent({ x, y, w, h, cfg, text }: {
  x: number;
  y: number;
  w: number;
  h: number;
  cfg: SelectedGameShowcaseConfig;
  text: string;
}) {
  const tipText = text || '';
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={cfg.tip.radius} fill={cfg.colors.cardPanelFill} fillOpacity="0.78" stroke={cfg.colors.panelStroke} strokeWidth="1.25" strokeOpacity="0.38" />
      <text x={x + cfg.tip.iconX} y={y + h / 2 + 7} fontFamily="Arial" fontSize={cfg.tip.iconFont} fontWeight="900" fill={cfg.colors.tipGold}>TIP</text>
      <SvgWrappedText x={x + cfg.tip.textX} y={y + 10} width={Math.max(20, w - cfg.tip.textX - 20)} height={h - 20} text={tipText} maxFontSize={cfg.tip.textFont} minFontSize={8} fill={cfg.colors.textPrimary} />
    </g>
  );
}

function SmallArrow({ x, y, width, height, dir, radius = 10, hoverColor = '#47f29a', onClick }: {
  x: number;
  y: number;
  width: number;
  height: number;
  dir: 'left' | 'right';
  radius?: number;
  hoverColor?: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const cx = x + width / 2;
  const cy = y + height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  const outerPath = dir === 'left'
    ? `M${x + r} ${y} H${x + width} V${y + height} H${x + r} Q${x} ${y + height} ${x} ${y + height - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`
    : `M${x} ${y} H${x + width - r} Q${x + width} ${y} ${x + width} ${y + r} V${y + height - r} Q${x + width} ${y + height} ${x + width - r} ${y + height} H${x} Z`;
  const arrowHalfW = Math.min(width * 0.22, 11);
  const arrowHalfH = Math.min(height * 0.28, 15);
  const arrow = dir === 'left'
    ? `${cx + arrowHalfW},${cy - arrowHalfH} ${cx - arrowHalfW},${cy} ${cx + arrowHalfW},${cy + arrowHalfH}`
    : `${cx - arrowHalfW},${cy - arrowHalfH} ${cx + arrowHalfW},${cy} ${cx - arrowHalfW},${cy + arrowHalfH}`;
  return (
    <g onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ cursor: 'pointer' }} filter={hover ? 'url(#cyanGlow)' : undefined}>
      <path d={outerPath} fill={hover ? '#0d5930' : 'url(#navIdle)'} stroke={hover ? hoverColor : '#69caff'} strokeWidth={hover ? 2 : 1.2} />
      <polygon points={arrow} fill={hover ? '#9dffc2' : '#8bd7ff'} />
    </g>
  );
}

function GoalCard({ x, y, w, h, card, active, onClick, config, clipPrefix }: {
  x: number;
  y: number;
  w: number;
  h: number;
  card: GoalCardInfo;
  active: boolean;
  onClick: () => void;
  config: SelectedGameShowcaseConfig;
  clipPrefix: string;
}) {
  const c = config.strip;
  const colors = config.colors;
  const [hover, setHover] = useState(false);
  const stroke = active ? colors.stripActiveStroke : hover ? colors.arrowHover : colors.stripCardStroke;
  const headerH = Math.min(c.headerStripHeight, h * 0.32);
  const iconTileW = Math.min(Math.max(30, headerH * 1.1), 46);
  const bulletMaxChars = Math.max(9, Math.floor((w - c.bulletInsetX * 2 - c.bulletDotSize * 5) / (c.bulletFont * 0.54)));
  const clipId = `${clipPrefix}-card-${card.id}`;
  const bulletRows = card.bullets.reduce<Array<{ baseY: number; lines: string[]; key: string }>>((rows, bullet, index) => {
    const previous = rows.at(-1);
    const baseY = previous ? previous.baseY + Math.max(c.bodyLineHeight, previous.lines.length * c.bodyLineHeight) + c.bulletGap : y + c.bulletTop;
    return [...rows, { baseY, lines: wrapText(bullet, bulletMaxChars), key: `${card.id}-${index}` }];
  }, []);
  return (
    <g onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ cursor: 'pointer' }} filter={active ? 'url(#goldGlow)' : hover ? 'url(#tabGreenGlow)' : undefined}>
      <defs><clipPath id={clipId}><rect x={x + 5} y={y + headerH + 6} width={w - 10} height={h - headerH - 12} rx="8" /></clipPath></defs>
      <rect x={x} y={y} width={w} height={h} rx={c.cardRadius} fill={active ? 'url(#tabSelectedFill)' : hover ? 'url(#tabHoverFill)' : 'url(#infoCardFill)'} fillOpacity={active ? 0.92 : hover ? 0.82 : 0.94} stroke={stroke} strokeWidth={active ? 2 : hover ? 1.6 : 1.1} strokeOpacity={active ? 0.9 : hover ? 0.8 : 0.5} />
      <rect x={x + 1.5} y={y + 1.5} width={w - 3} height={headerH} rx={Math.max(0, c.cardRadius - 2)} fill={active ? 'url(#cardHeaderActiveStrip)' : hover ? 'url(#tabHoverFill)' : 'url(#cardHeaderStrip)'} />
      <rect x={x + 2} y={y + 2} width={w - 4} height={Math.max(7, headerH * 0.45)} rx="8" fill="#ffffff" opacity="0.045" />
      <path d={roundedRectPath(x + 1.5, y + 1.5, iconTileW, headerH, Math.max(0, c.cardRadius - 2), 0, 0, Math.max(0, c.cardRadius - 2))} fill={active ? 'url(#tabCountGoldFill)' : hover ? 'url(#tabHoverFill)' : 'url(#navIdle)'} stroke={active ? '#f7c84a' : hover ? colors.arrowHover : colors.stripStroke} strokeWidth="1.1" strokeOpacity={active || hover ? 0.86 : 0.42} />
      <path d={roundedRectPath(x + 1.5, y + 1.5, iconTileW, Math.max(7, headerH * 0.48), Math.max(0, c.cardRadius - 2), 0, 0, 0)} fill="url(#tabCountGoldShine)" opacity={active ? 0.28 : 0.08} pointerEvents="none" />
      <text x={x + iconTileW / 2 + 1} y={y + headerH / 2 + 1} textAnchor="middle" dominantBaseline="central" fontFamily="Georgia, serif" fontSize={c.headerIconSize} fill={active ? '#fff3b6' : hover ? '#9dffc2' : card.iconColor}>{card.icon}</text>
      <text x={x + Math.max(c.headerTitleInsetX, iconTileW + 12)} y={y + headerH / 2 + 1} dominantBaseline="central" fontFamily="Arial Narrow, Arial" fontSize={c.headerTitleFont} fontWeight="900" letterSpacing={c.headerLetterSpacing} fill={active ? colors.stripActiveStroke : hover ? '#9dffc2' : '#d9edff'}>{card.title.toUpperCase()}</text>
      <g clipPath={`url(#${clipId})`}>
        {bulletRows.map((row) => (
          <g key={row.key}>
            <circle cx={x + c.bulletInsetX} cy={row.baseY - c.bulletFont * 0.28} r={c.bulletDotSize} fill={active ? colors.stripActiveStroke : '#cfd8ff'} opacity="0.86" />
            <text x={x + c.bulletInsetX + c.bulletDotSize * 3.2} y={row.baseY} fontFamily="Arial" fontSize={c.bulletFont} fill="#dce7ff" opacity="0.92">
              {row.lines.map((line, lineIndex) => <tspan key={lineIndex} x={x + c.bulletInsetX + c.bulletDotSize * 3.2} dy={lineIndex === 0 ? 0 : c.bodyLineHeight}>{line}</tspan>)}
            </text>
          </g>
        ))}
      </g>
    </g>
  );
}

function GoalStripCarousel({ x, y, w, h, config, cards, selectedChunkId, onSelectChunk }: {
  x: number;
  y: number;
  w: number;
  h: number;
  config: SelectedGameShowcaseConfig;
  cards: GoalCardInfo[];
  selectedChunkId: string;
  onSelectChunk: (chunkId: string) => void;
}) {
  const selectedIndex = Math.max(0, cards.findIndex((card) => card.id === selectedChunkId));
  const [windowStart, setWindowStart] = useState(selectedIndex);
  const c = config.strip;
  const colors = config.colors;
  const arrowW = c.arrowWidth;
  const arrowH = c.arrowHeight;
  const arrowGap = c.arrowOutsideGap;
  const viewportX = x + c.carouselSidePad;
  const viewportY = y + c.carouselPadTop;
  const viewportW = Math.max(0, w - c.carouselSidePad * 2);
  const footerY = y + h - c.carouselPadBottom;
  const cardH = Math.max(40, footerY - viewportY - 12);
  const arrowY = y + h / 2 - arrowH / 2 + c.arrowYOffset;
  const clipPrefix = `goal-strip-${Math.round(x)}-${Math.round(y)}`;
  const viewportClipId = `${clipPrefix}-viewport`;
  const cardWidths = useMemo(() => cards.map((card) => estimateStripCardWidth(card, c)), [cards, c]);
  const cardCount = cards.length;
  const getVisibleIndexes = useCallback((startIndex: number) => {
    const safeStart = Math.max(0, Math.min(cardCount - 1, Math.floor(startIndex)));
    const indexes: number[] = [];
    let usedW = 0;
    for (let i = safeStart; i < cardCount; i += 1) {
      const nextW = cardWidths[i];
      const requiredW = indexes.length === 0 ? nextW : usedW + c.cardGap + nextW;
      if (requiredW > viewportW && indexes.length > 0) break;
      indexes.push(i);
      usedW = requiredW;
      if (requiredW > viewportW) break;
    }
    return indexes;
  }, [cardCount, cardWidths, viewportW, c.cardGap]);
  const visibleIndexes = getVisibleIndexes(windowStart);
  const visibleW = visibleIndexes.reduce((sum, index) => sum + cardWidths[index], 0) + Math.max(0, visibleIndexes.length - 1) * c.cardGap;
  const startX = viewportX + Math.max(0, (viewportW - visibleW) / 2);
  const goPrev = () => setWindowStart((prev) => Math.max(0, prev - 2));
  const goNext = () => setWindowStart((prev) => {
    const visible = getVisibleIndexes(prev);
    const nextStart = visible.length ? visible[visible.length - 1] + 1 : prev + 2;
    return Math.min(cardCount - 1, nextStart);
  });
  const totalPillW = cards.reduce((sum, _, i) => sum + (i === selectedIndex ? c.footerActivePillW : c.footerPillW), 0) + Math.max(0, cards.length - 1) * c.footerPillGap;
  const pillRows = cards.reduce<Array<{ active: boolean; card: GoalCardInfo; currentX: number; width: number }>>((rows, card, i) => {
    const active = i === selectedIndex;
    const width = active ? c.footerActivePillW : c.footerPillW;
    const previous = rows.at(-1);
    const currentX = previous ? previous.currentX + previous.width + c.footerPillGap : x + w / 2 - totalPillW / 2;
    return [...rows, { active, card, currentX, width }];
  }, []);
  return (
    <g>
      <rect x={x} y={y + 8} width={w} height={h} rx={c.radius} fill="#000000" opacity="0.2" pointerEvents="none" />
      {config.glow.strip && <rect x={x - 1.5} y={y - 1.5} width={w + 3} height={h + 3} rx={c.radius + 1.5} fill="none" stroke={config.glow.color} strokeWidth="3" strokeOpacity={Math.min(0.34, config.glow.stripOpacity * 0.42)} pointerEvents="none" />}
      <rect x={x} y={y} width={w} height={h} rx={c.radius} fill="url(#skeletonGlass)" fillOpacity={c.fillOpacity} stroke={colors.stripStroke} strokeWidth="2" strokeOpacity="0.9" />
      <rect x={x + 2} y={y + 2} width={w - 4} height={c.shineH} rx="12" fill="#ffffff" opacity="0.03" />
      <SmallArrow x={x - arrowW - arrowGap} y={arrowY} width={arrowW} height={arrowH} dir="left" radius={c.arrowRadius} hoverColor={colors.arrowHover} onClick={goPrev} />
      <SmallArrow x={x + w + arrowGap} y={arrowY} width={arrowW} height={arrowH} dir="right" radius={c.arrowRadius} hoverColor={colors.arrowHover} onClick={goNext} />
      <defs><clipPath id={viewportClipId}><rect x={viewportX} y={viewportY - 8} width={viewportW} height={cardH + 16} rx="12" /></clipPath></defs>
      <g clipPath={`url(#${viewportClipId})`}>
        {visibleIndexes.map((cardIndex, visibleIndex) => {
          const card = cards[cardIndex];
          const cardX = startX + visibleIndexes.slice(0, visibleIndex).reduce((sum, idx) => sum + cardWidths[idx], 0) + visibleIndex * c.cardGap;
          return <GoalCard key={card.id} x={cardX} y={viewportY} w={cardWidths[cardIndex]} h={cardH} card={card} active={selectedIndex === cardIndex} onClick={() => onSelectChunk(card.id)} config={config} clipPrefix={clipPrefix} />;
        })}
      </g>
      <line x1={viewportX} y1={footerY + c.footerLineOffset} x2={viewportX + viewportW} y2={footerY + c.footerLineOffset} stroke={colors.stripStroke} strokeWidth="2" strokeOpacity="0.42" />
      {pillRows.map(({ active, card, currentX, width }) => (
        <g key={card.id} onClick={() => onSelectChunk(card.id)} style={{ cursor: 'pointer' }} filter={active ? 'url(#cyanGlow)' : undefined}>
          <rect x={currentX} y={footerY + c.footerPillY} width={width} height={c.footerPillH} rx={c.footerPillH / 2} fill={active ? 'url(#footerSelectedPill)' : 'transparent'} stroke={active ? colors.stripActiveStroke : colors.stripStroke} strokeWidth={active ? 1.5 : 1.1} strokeOpacity={active ? 0.95 : 0.55} />
        </g>
      ))}
    </g>
  );
}

function safeNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value) || 0;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const CONTROL_GROUPS: Record<string, ControlGroup> = {
  overall: {
    label: 'Overall',
    sections: [
      { title: 'Canvas / Background', fields: [
        ['canvas.vw', 'ViewBox width', 720, 2400],
        ['canvas.vh', 'ViewBox height', 720, 1400],
        ['canvas.pad', 'Preview pad', 0, 40],
        ['canvas.svgBgOpacity', 'SVG bg opacity', 0, 1, 0.01],
        ['canvas.whitePreviewBg', 'White preview bg', 'toggle'],
        ['canvas.showDebugLabels', 'Show debug labels', 'toggle'],
      ] },
      { title: 'Page Frame', fields: [
        ['page.x', 'Page X', 0, 200],
        ['page.y', 'Page Y', 0, 220],
        ['page.width', 'Page width', 560, 1900],
        ['page.height', 'Page height', 600, 1200],
        ['page.radius', 'Page radius', 0, 40],
        ['page.strokeWidth', 'Page stroke width', 0, 6, 0.1],
        ['page.shadowBlur', 'Shadow blur', 0, 40],
        ['page.shadowY', 'Shadow Y', -20, 40],
        ['page.shadowOpacity', 'Shadow opacity', 0, 1, 0.01],
      ] },
    ],
  },
  tabGroup: {
    label: 'TabGroup',
    sections: [
      { title: 'Placement / Size', fields: [
        ['tabGroup.y', 'Tab group Y', 0, 160],
        ['tabGroup.tabW', 'Tab width', 60, 260],
        ['tabGroup.tabH', 'Tab height', 24, 90],
        ['tabGroup.tabGap', 'Tab gap', 0, 30],
        ['tabGroup.fontSize', 'Tab font size', 8, 28],
        ['tabGroup.activeLineH', 'Active line H', 0, 10],
      ] },
    ],
  },
  mainBody: {
    label: 'Main Body',
    sections: [
      { title: 'A | B Split', fields: [
        ['body.useABRatio', 'Use A/B ratio', 'toggle'],
        ['body.aRatio', 'A side ratio', 0.15, 0.55, 0.01],
        ['body.leftWidth', 'A side fixed width', 220, 900],
        ['body.bottomInset', 'Body bottom inset', 0, 100],
        ['body.rowGap', 'Row gap', 0, 60],
        ['body.dividerWidth', 'A/B divider width', 0, 8, 0.1],
        ['body.overlayRadius', 'Overlay radius', 0, 50],
        ['body.overlayDither', 'Anti-band dither', 'toggle'],
      ] },
    ],
  },
  sideA: {
    label: 'A Side',
    sections: [
      { title: 'Logo / Stats / Image', fields: [
        ['sideA.logoXPad', 'Logo X pad', 0, 80],
        ['sideA.logoY', 'Logo Y', 0, 120],
        ['sideA.logoFont', 'Logo font', 20, 100],
        ['sideA.taglineFont', 'Tagline font', 8, 36],
        ['sideA.statsY', 'Stats Y', 80, 300],
        ['sideA.statsH', 'Stats height', 30, 100],
        ['sideA.artY', 'Art Y', 160, 420],
        ['sideA.artBottomPad', 'Art bottom pad', 0, 520],
      ] },
    ],
  },
  sideB: {
    label: 'B Side',
    sections: [
      { title: 'Overview / How To', fields: [
        ['overview.titleFont', 'Overview title font', 10, 40],
        ['overview.bodyFont', 'Overview body font', 8, 30],
        ['overview.imageRatio', 'Image width ratio', 0.1, 0.8, 0.01],
        ['howTo.yOffset', 'HowTo Y offset', -140, 180],
        ['howTo.height', 'HowTo height', 120, 420],
        ['howTo.titleFont', 'HowTo title font', 10, 40],
        ['howTo.stepTitleFont', 'Step title font', 8, 28],
        ['howTo.stepBodyFont', 'Step body font', 6, 22, 0.5],
      ] },
    ],
  },
  strip: {
    label: 'Strip',
    sections: [
      { title: 'Strip / Cards', fields: [
        ['strip.yOffset', 'Strip Y offset', -140, 180],
        ['strip.topGap', 'Strip top gap', 0, 100],
        ['strip.insetX', 'Strip side inset', 0, 160],
        ['strip.height', 'Strip height', 100, 360],
        ['strip.arrowWidth', 'Arrow width', 20, 140],
        ['strip.arrowHeight', 'Arrow height', 20, 140],
        ['strip.forceUniformCardWidth', 'Force same width', 'toggle'],
        ['strip.uniformCardWidth', 'Manual card width', 120, 620],
        ['strip.cardGap', 'Card gap', 0, 50],
        ['strip.bulletFont', 'Bullet font', 7, 24, 0.5],
      ] },
    ],
  },
  bottom: {
    label: 'Tip / Button',
    sections: [
      { title: 'Tip / Button', fields: [
        ['tip.yOffset', 'Tip Y offset', -140, 160],
        ['tip.height', 'Tip height', 30, 140],
        ['tip.sideInset', 'Tip side inset', 0, 700],
        ['tip.textFont', 'Tip text font', 10, 32],
        ['button.edgeOffsetY', 'Action rail Y offset', -90, 90],
        ['button.railHeight', 'Action rail height', 40, 180],
        ['button.railInsetX', 'Action rail inset X', 0, 600],
        ['button.width', 'Button width', 160, 600],
        ['button.height', 'Button height', 30, 120],
        ['button.fontSize', 'Button font', 10, 40],
      ] },
    ],
  },
  colors: {
    label: 'Colors',
    sections: [
      { title: 'Main Colors', fields: [
        ['colors.pageStroke', 'Page stroke', 'color'],
        ['colors.tabStroke', 'Tab stroke', 'color'],
        ['colors.tabActiveLine', 'Active line', 'color'],
        ['colors.bodyOverlayTop', 'Overlay top', 'color'],
        ['colors.bodyOverlayMid', 'Overlay mid', 'color'],
        ['colors.bodyOverlayBottom', 'Overlay bottom', 'color'],
        ['colors.cardPanelFill', 'Panel fill', 'color'],
        ['colors.panelStroke', 'Panel stroke', 'color'],
        ['colors.textPrimary', 'Text primary', 'color'],
        ['colors.textMuted', 'Text muted', 'color'],
        ['colors.buttonLeft', 'Button left', 'color'],
        ['colors.buttonMid', 'Button middle', 'color'],
        ['colors.buttonRight', 'Button right', 'color'],
      ] },
    ],
  },
};

const ALLOWED_CONFIG_PATHS = new Set<string>(
  Object.values(CONTROL_GROUPS).flatMap((group) =>
    group.sections.flatMap((section) => section.fields.map((field) => field[0]))
  )
);

function isAllowedConfigPath(path: string): boolean {
  return ALLOWED_CONFIG_PATHS.has(path);
}

const ControlNumberField = React.memo(function ControlNumberField({ config, setConfig, path, label, min, max, step = 1 }: {
  config: SelectedGameShowcaseConfig;
  setConfig: React.Dispatch<React.SetStateAction<SelectedGameShowcaseConfig>>;
  path: string;
  label: string;
  min: number;
  max: number;
  step?: number;
}) {
  const value = safeNumber(getByPath(config as unknown as ConfigRecord, path));
  const defaultValue = safeNumber(getByPath(DEFAULT_SELECTED_GAME_SHOWCASE_CONFIG as unknown as ConfigRecord, path));
  const set = (next: number) => setConfig((prev) => setByPath(prev as unknown as ConfigRecord, path, next) as unknown as SelectedGameShowcaseConfig);
  return (
    <label className="grid grid-cols-[1fr_140px_78px_30px] items-center gap-2 rounded-lg border border-cyan-400/20 bg-black/25 p-2 text-xs">
      <span className="text-cyan-50">{label}</span>
      <input className="h-7 w-full accent-cyan-300" type="range" min={min} max={max} step={step} value={value} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => set(Number(event.target.value))} />
      <input className="h-7 rounded-md border border-cyan-400/30 bg-slate-950 px-2 text-right text-cyan-50 outline-none" type="number" min={min} max={max} step={step} value={value} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => set(Number(event.target.value))} />
      <button type="button" title="Reset this control" onClick={(event) => { event.preventDefault(); event.stopPropagation(); set(defaultValue); }} className="h-7 rounded-md border border-amber-300/40 bg-amber-300/10 text-amber-200 hover:bg-amber-300 hover:text-black">R</button>
    </label>
  );
});

const ControlColorField = React.memo(function ControlColorField({ config, setConfig, path, label }: {
  config: SelectedGameShowcaseConfig;
  setConfig: React.Dispatch<React.SetStateAction<SelectedGameShowcaseConfig>>;
  path: string;
  label: string;
}) {
  const value = String(getByPath(config as unknown as ConfigRecord, path) ?? '#ffffff');
  const defaultValue = String(getByPath(DEFAULT_SELECTED_GAME_SHOWCASE_CONFIG as unknown as ConfigRecord, path) ?? '#ffffff');
  const set = (next: string) => setConfig((prev) => setByPath(prev as unknown as ConfigRecord, path, next) as unknown as SelectedGameShowcaseConfig);
  return (
    <label className="grid grid-cols-[1fr_42px_104px_30px] items-center gap-2 rounded-lg border border-cyan-400/20 bg-black/25 p-2 text-xs">
      <span className="text-cyan-50">{label}</span>
      <input className="h-7 w-10 rounded" type="color" value={value} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => set(event.target.value)} />
      <input className="h-7 rounded-md border border-cyan-400/30 bg-slate-950 px-2 text-cyan-50 outline-none" value={value} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => set(event.target.value)} />
      <button type="button" title="Reset this color" onClick={(event) => { event.preventDefault(); event.stopPropagation(); set(defaultValue); }} className="h-7 rounded-md border border-amber-300/40 bg-amber-300/10 text-amber-200 hover:bg-amber-300 hover:text-black">R</button>
    </label>
  );
});

const ControlToggleField = React.memo(function ControlToggleField({ config, setConfig, path, label }: {
  config: SelectedGameShowcaseConfig;
  setConfig: React.Dispatch<React.SetStateAction<SelectedGameShowcaseConfig>>;
  path: string;
  label: string;
}) {
  const value = Boolean(getByPath(config as unknown as ConfigRecord, path));
  const defaultValue = Boolean(getByPath(DEFAULT_SELECTED_GAME_SHOWCASE_CONFIG as unknown as ConfigRecord, path));
  const set = (next: boolean) => setConfig((prev) => setByPath(prev as unknown as ConfigRecord, path, next) as unknown as SelectedGameShowcaseConfig);
  return (
    <label className="grid grid-cols-[1fr_44px_30px] items-center gap-2 rounded-lg border border-cyan-400/20 bg-black/25 p-2 text-xs">
      <span className="text-cyan-50">{label}</span>
      <input type="checkbox" checked={value} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => set(event.target.checked)} />
      <button type="button" title="Reset this toggle" onClick={(event) => { event.preventDefault(); event.stopPropagation(); set(defaultValue); }} className="h-7 rounded-md border border-amber-300/40 bg-amber-300/10 text-amber-200 hover:bg-amber-300 hover:text-black">R</button>
    </label>
  );
});

function FieldRenderer({ field, config, setConfig }: {
  field: ControlField;
  config: SelectedGameShowcaseConfig;
  setConfig: React.Dispatch<React.SetStateAction<SelectedGameShowcaseConfig>>;
}) {
  const [path, label, third] = field;
  if (third === 'color') return <ControlColorField config={config} setConfig={setConfig} path={path} label={label} />;
  if (third === 'toggle') return <ControlToggleField config={config} setConfig={setConfig} path={path} label={label} />;
  return <ControlNumberField config={config} setConfig={setConfig} path={path} label={label} min={third} max={field[3]} step={field[4] ?? 1} />;
}

function DesignerControls({ config, setConfig, layoutMode, setLayoutMode }: {
  config: SelectedGameShowcaseConfig;
  setConfig: React.Dispatch<React.SetStateAction<SelectedGameShowcaseConfig>>;
  layoutMode: LayoutMode;
  setLayoutMode: React.Dispatch<React.SetStateAction<LayoutMode>>;
}) {
  const [tab, setTab] = useState('overall');
  const [subTabByGroup, setSubTabByGroup] = useState<Record<string, number>>({ overall: 0 });
  const group = CONTROL_GROUPS[tab];
  const activeSubIndex = subTabByGroup[tab] ?? 0;
  const activeSection = group.sections[Math.min(activeSubIndex, group.sections.length - 1)] ?? group.sections[0];
  const setSubTab = (index: number) => setSubTabByGroup((prev) => ({ ...prev, [tab]: index }));
  const setWideDefaults = () => setConfig(cloneDefaultConfig());
  const setNarrowDefaults = () => setConfig(mergeConfig(cloneDefaultConfig(), NARROW_CONFIG_OVERRIDES));

  return (
    <div className="mt-4 rounded-2xl border border-cyan-300/30 bg-slate-950/95 p-4 text-white shadow-2xl" onPointerDown={(event) => event.stopPropagation()}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-cyan-100">Selected Game Page Controls</div>
          <div className="text-xs text-cyan-200/70">Main app uses this surface without controls. Asset editor can enable these.</div>
        </div>
        <div className="flex items-center gap-2">
          {(['auto', 'wide', 'narrow'] as LayoutMode[]).map((mode) => (
            <button key={mode} type="button" onClick={() => setLayoutMode(mode)} className={`rounded-lg px-3 py-2 text-xs font-bold ${layoutMode === mode ? 'bg-cyan-300 text-black' : 'bg-slate-900 text-cyan-100'}`}>
              {mode.toUpperCase()}
            </button>
          ))}
          <button type="button" onClick={setWideDefaults} className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-bold text-black hover:bg-cyan-200">Wide Defaults</button>
          <button type="button" onClick={setNarrowDefaults} className="rounded-lg bg-purple-300 px-3 py-2 text-xs font-bold text-black hover:bg-purple-200">Narrow Defaults</button>
          <button type="button" onClick={() => setConfig(cloneDefaultConfig())} className="rounded-lg bg-rose-400 px-3 py-2 text-xs font-bold text-black">Reset All</button>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-cyan-400/20 bg-black/20 p-2">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300/80">Area</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CONTROL_GROUPS).map(([id, item]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${tab === id ? 'bg-cyan-300 text-black' : 'bg-slate-900 text-cyan-100 hover:bg-emerald-500/30'}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-purple-400/20 bg-black/20 p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-purple-200/80">Sub group</div>
          <div className="text-xs text-cyan-100/70">{group.label} / {activeSection.title}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {group.sections.map((section, index) => (
            <button key={section.title} type="button" onClick={() => setSubTab(index)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${index === activeSubIndex ? 'bg-purple-300 text-black' : 'bg-slate-900 text-purple-100 hover:bg-purple-500/30'}`}>
              {section.title}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-xl border border-cyan-400/20 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-cyan-200">{activeSection.title}</div>
            <div className="text-xs text-cyan-200/50">{activeSection.fields.length} controls</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfig((prev) => {
                let next = prev as unknown as ConfigRecord;
                activeSection.fields.forEach((field) => {
                  next = setByPath(next, field[0], getByPath(DEFAULT_SELECTED_GAME_SHOWCASE_CONFIG as unknown as ConfigRecord, field[0]));
                });
                return next as unknown as SelectedGameShowcaseConfig;
              });
            }}
            className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-300 hover:text-black"
          >
            Reset subgroup
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeSection.fields.map((field) => (
            <FieldRenderer key={field[0]} field={field} config={config} setConfig={setConfig} />
          ))}
        </div>
      </section>
    </div>
  );
}

export function SelectedGameShowcase({
  activeTabId,
  className,
  designerMode = false,
  fallbackArtUrl = defaultFallbackArtUrl,
  fallbackOverviewArtUrl = defaultFallbackOverviewArtUrl,
  layoutControls,
  layoutMode: initialLayoutMode = 'auto',
  onActiveTabChange,
  onActionClick,
  onViewLobbies,
  presentation = FALLBACK_PRESENTATION,
  renderActiveVisualContent,
  resolveVisualRefUrl,
  showDesignerControls = false,
}: SelectedGameShowcaseProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [config, setConfig] = useState(() => mergeLayoutControls(cloneDefaultConfig(), layoutControls));
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(initialLayoutMode);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [activeTopTab, setActiveTopTab] = useState<SelectedGameTabId>(presentation.tabs[0]?.id ?? 'about');
  const [hoverTopTab, setHoverTopTab] = useState<SelectedGameTabId | null>(null);
  const [activeChunkByTab, setActiveChunkByTab] = useState<Record<string, string>>({});
  const effectiveLayoutMode = layoutMode === 'auto' && containerSize.width > 0 && containerSize.width < 860 ? 'narrow' : layoutMode;
  const propConfig = useMemo(() => mergeLayoutControls(cloneDefaultConfig(), layoutControls), [layoutControls]);
  const configSource = designerMode ? config : propConfig;
  const cfg = effectiveLayoutMode === 'narrow' ? mergeConfig(configSource, NARROW_CONFIG_OVERRIDES) : configSource;
  const tabs = presentation.tabs.length > 0 ? presentation.tabs : FALLBACK_PRESENTATION.tabs;
  const controlledActiveTopTab = activeTabId && tabs.some((tab) => tab.id === activeTabId) ? activeTabId : null;
  const normalizedActiveTopTab = controlledActiveTopTab ?? (tabs.some((tab) => tab.id === activeTopTab) ? activeTopTab : tabs[0]?.id ?? 'about');
  const activeTab = tabs.find((tab) => tab.id === normalizedActiveTopTab) ?? tabs[0] ?? FALLBACK_PRESENTATION.tabs[0];
  const activeChunks = activeTab.chunks;
  const selectedChunkId = activeChunkByTab[activeTab.id] ?? activeChunks[0]?.id ?? '';
  const activeChunk = activeChunks.find((chunk) => chunk.id === selectedChunkId) ?? activeChunks[0] ?? null;
  const activeContent = chunkToContent(activeTab.id, activeChunk);
  const howToChunk = activeTab.id === 'about' ? activeChunks.find(isHowToChunk) ?? activeChunk : activeChunk;
  const howToContent = chunkToContent(activeTab.id, howToChunk ?? activeChunk);
  const activeVisualContent = renderActiveVisualContent?.({
    chunk: activeChunk,
    presentation,
    tabId: activeTab.id,
  });
  const hasActiveVisualContent = activeVisualContent !== null && activeVisualContent !== undefined;
  const sideAImageUrls = useMemo(() => {
    const mediaRefs = presentation.sideA.media.filter((ref) => !/^logo$/i.test(ref.label));
    const resolvedUrls = resolveVisualUrls(mediaRefs.length > 0 ? mediaRefs : presentation.sideA.media, resolveVisualRefUrl);
    return resolvedUrls.length > 0 ? resolvedUrls : [fallbackArtUrl];
  }, [fallbackArtUrl, presentation.sideA.media, resolveVisualRefUrl]);
  const heroLogoUrl = resolveFirstVisualUrl(presentation.hero.media.filter((ref) => /^logo$/i.test(ref.label)), resolveVisualRefUrl);
  const sideAImageKey = sideAImageUrls.join('|');
  const [sideAImageIndex, setSideAImageIndex] = useState(0);
  const [previousSideAImageIndex, setPreviousSideAImageIndex] = useState<number | null>(null);
  useEffect(() => {
    if (sideAImageUrls.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setSideAImageIndex((index) => {
        setPreviousSideAImageIndex(index);
        return (index + 1) % sideAImageUrls.length;
      });
    }, 3200);
    return () => window.clearInterval(timer);
  }, [sideAImageUrls.length, sideAImageKey]);
  useEffect(() => {
    if (previousSideAImageIndex === null) return undefined;
    const timer = window.setTimeout(() => setPreviousSideAImageIndex(null), 950);
    return () => window.clearTimeout(timer);
  }, [previousSideAImageIndex]);
  const safeSideAImageIndex = sideAImageUrls.length > 0 ? sideAImageIndex % sideAImageUrls.length : 0;
  const overviewImageUrl = resolveFirstVisualUrl(activeChunk?.visualRefs ?? [], resolveVisualRefUrl)
    ?? resolveFirstVisualUrl(presentation.hero.media, resolveVisualRefUrl)
    ?? sideAImageUrls[safeSideAImageIndex]
    ?? fallbackOverviewArtUrl;
  const stripCards = useMemo(() => buildGlobalStripCards(tabs), [tabs]);
  const activeCards = stripCards.length > 0
    ? stripCards
    : [{ id: `${activeTab.id}-empty`, chunkId: '', title: activeTab.label, tabId: activeTab.id, icon: TAB_ICONS[activeTab.id], iconColor: TAB_COLORS[activeTab.id], bullets: [] }];
  const selectedStripChunkId = activeCards.find((card) => card.tabId === activeTab.id && card.chunkId === activeChunk?.id)?.id ?? activeCards[0]?.id ?? '';
  const activeCardsKey = activeCards.map((card) => card.id).join('|');
  const showHowTo = activeTab.id === 'about' && cfg.visibility.howTo;
  const sideAStats = metricFallbacks(presentation.sideA.stats);
  const visibleActions = presentation.actions.filter((action) => action.enabled !== false);
  const showInternalDesignerControls = designerMode && showDesignerControls;
  const vw = cfg.canvas.vw;
  const defaultVh = cfg.canvas.vh;
  const measuredAspect = containerSize.width > 0 && containerSize.height > 0 ? containerSize.width / containerSize.height : vw / defaultVh;
  const fittedVh = Math.round(vw / clampNumber(measuredAspect, 0.52, 2.4));
  const authoredPageH = cfg.page.height;
  const minimumProductionPageH = Math.min(authoredPageH, Math.max(900, authoredPageH * 0.92));
  const minimumProductionVh = cfg.page.y + minimumProductionPageH + cfg.button.edgeOffsetY + cfg.button.height / 2 + 8;
  const vh = showInternalDesignerControls ? defaultVh : clampNumber(fittedVh, minimumProductionVh, defaultVh * 1.55);
  const pageX = cfg.page.x;
  const pageY = cfg.page.y;
  const pageW = cfg.page.width;
  const pageH = showInternalDesignerControls
    ? authoredPageH
    : Math.max(minimumProductionPageH, vh - pageY - cfg.button.edgeOffsetY - cfg.button.height / 2 - 8);
  const tabW = cfg.tabGroup.tabW;
  const tabH = cfg.tabGroup.tabH;
  const tabsBgW = tabs.length * tabW + (tabs.length - 1) * cfg.tabGroup.tabGap + cfg.tabGroup.bgPadX * 2;
  const tabStartX = pageX + (pageW - tabsBgW) / 2 + cfg.tabGroup.bgPadX;
  const tabsBgX = tabStartX - cfg.tabGroup.bgPadX;
  const tabsBgY = cfg.tabGroup.y - cfg.tabGroup.bgPadY;
  const tabsBgH = tabH + cfg.tabGroup.bgPadY * 2;
  const bodyX = pageX;
  const bodyY = pageY;
  const bodyW = pageW;
  const bodyBottom = pageY + pageH - cfg.body.bottomInset;
  const actionRailY = pageY + pageH + cfg.button.edgeOffsetY;
  const actionRailH = Math.max(cfg.button.railHeight, cfg.button.height);
  const actionRailX = pageX + cfg.button.railInsetX;
  const actionRailW = Math.max(0, pageW - cfg.button.railInsetX * 2);
  const viewButtonY = actionRailY - cfg.button.height / 2;
  const actionGap = Math.max(10, Math.min(24, cfg.button.width * 0.08));
  const actionCount = Math.max(1, visibleActions.length);
  const minimumActionButtonW = cfg.canvas.vw <= 500 ? 78 : 120;
  const maxActionButtonW = Math.max(minimumActionButtonW, (actionRailW - actionGap * (actionCount - 1)) / actionCount);
  const actionButtonW = Math.min(cfg.button.width, maxActionButtonW);
  const actionGroupW = actionButtonW * actionCount + actionGap * (actionCount - 1);
  const actionStartX = actionRailX + actionRailW / 2 - actionGroupW / 2;
  const tipY = actionRailY - cfg.button.height / 2 - cfg.body.rowGap - cfg.tip.height + cfg.tip.yOffset;
  const sideAW = cfg.body.useABRatio ? Math.round(bodyW * cfg.body.aRatio) : cfg.body.leftWidth;
  const mainX = bodyX + sideAW;
  const mainW = bodyW - sideAW;
  const stripY = Math.max(bodyY + 180, tipY - cfg.body.rowGap - cfg.strip.height + cfg.strip.yOffset);
  const topContentH = Math.max(160, stripY - bodyY - cfg.body.rowGap);
  const availableForHowTo = Math.max(96, topContentH - cfg.howTo.topGap - 132);
  const targetHowToH = showHowTo ? Math.min(cfg.howTo.height, Math.max(96, topContentH * 0.42), availableForHowTo) : 0;
  const maxHowToY = stripY - cfg.body.rowGap - targetHowToH;
  const minHowToY = bodyY + 132 + cfg.howTo.topGap;
  const howToY = showHowTo ? clampNumber(maxHowToY + cfg.howTo.yOffset, minHowToY, Math.max(minHowToY, maxHowToY)) : 0;
  const howToH = targetHowToH;
  const bandBY = stripY;
  const stripX = bodyX + cfg.strip.insetX;
  const stripW = bodyW - cfg.strip.insetX * 2;
  const bandAH = Math.max(120, bandBY - cfg.body.rowGap - bodyY);
  const leftH = bandAH;
  const mainH = bandAH;
  const sideAArtY = bodyY + cfg.sideA.artY;
  const sideAArtH = Math.max(0, bandBY - sideAArtY);
  const bgClass = showInternalDesignerControls && cfg.canvas.whitePreviewBg ? 'bg-white' : 'bg-transparent';
  const actionX = actionStartX;
  const tipX = bodyX + cfg.tip.sideInset;
  const tipW = bodyW - cfg.tip.sideInset * 2;
  const rootStyle: React.CSSProperties = {
    height: showInternalDesignerControls ? undefined : '100%',
    minHeight: showInternalDesignerControls ? undefined : 0,
    overflow: showInternalDesignerControls ? undefined : 'hidden',
    padding: showInternalDesignerControls ? cfg.canvas.pad : 0,
  };

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || containerRef.current === null) {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setContainerSize((previous) => {
          const next = { width: entry.contentRect.width, height: entry.contentRect.height };
          return Math.abs(previous.width - next.width) < 0.5 && Math.abs(previous.height - next.height) < 0.5 ? previous : next;
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const selectTopTab = useCallback((tabId: SelectedGameTabId) => {
    if (!activeTabId) {
      setActiveTopTab(tabId);
    }
    onActiveTabChange?.(tabId);
  }, [activeTabId, onActiveTabChange]);

  return (
    <div ref={containerRef} className={`selected-game-showcase relative w-full ${bgClass} text-white ${className ?? ''}`} style={rootStyle}>
      <svg viewBox={`0 0 ${vw} ${vh}`} width="100%" height={showInternalDesignerControls ? undefined : '100%'} preserveAspectRatio="xMidYMin meet" className={showInternalDesignerControls ? 'block h-auto w-full' : 'block h-full w-full'}>
        <defs>
          <linearGradient id="tabActive" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={cfg.colors.tabActiveTop} /><stop offset="0.62" stopColor={cfg.colors.tabActiveMid} /><stop offset="1" stopColor={cfg.colors.tabActiveBottom} /></linearGradient>
          <linearGradient id="skeletonGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0b3b52" stopOpacity="0.34" /><stop offset="0.52" stopColor="#02080d" stopOpacity="0.58" /><stop offset="1" stopColor="#0c1835" stopOpacity="0.42" /></linearGradient>
          <linearGradient id="tabSelectedFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#332904" stopOpacity="0.74" /><stop offset="0.52" stopColor="#0e314b" stopOpacity="0.48" /><stop offset="1" stopColor="#071827" stopOpacity="0.68" /></linearGradient>
          <linearGradient id="tabHoverFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0d4f2b" stopOpacity="0.82" /><stop offset="0.55" stopColor="#0a3527" stopOpacity="0.58" /><stop offset="1" stopColor="#062018" stopOpacity="0.76" /></linearGradient>
          <linearGradient id="selectedTabGradientLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#63dfff" /><stop offset="0.46" stopColor="#58bdfb" /><stop offset="1" stopColor="#d026d9" /></linearGradient>
          <linearGradient id="tabCountGoldFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff7c7" /><stop offset="0.18" stopColor="#ffd85c" /><stop offset="0.48" stopColor="#d89010" /><stop offset="0.78" stopColor="#8b5700" /><stop offset="1" stopColor="#3a2100" /></linearGradient>
          <linearGradient id="tabCountGoldShine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity="0.7" /><stop offset="0.44" stopColor="#fff5b4" stopOpacity="0.24" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
          <linearGradient id="buttonGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={cfg.colors.buttonLeft} /><stop offset="0.52" stopColor={cfg.colors.buttonMid} /><stop offset="1" stopColor={cfg.colors.buttonRight} /></linearGradient>
          <linearGradient id="leftTopOverlay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={cfg.colors.bodyOverlayTop} stopOpacity="0.96" /><stop offset={cfg.body.overlayMidStop} stopColor={cfg.colors.bodyOverlayMid} stopOpacity="0.58" /><stop offset={cfg.body.overlaySoftStop} stopColor={cfg.colors.bodyOverlayBottom} stopOpacity="0.18" /><stop offset="1" stopColor={cfg.colors.bodyOverlayBottom} stopOpacity="0" /></linearGradient>
          <linearGradient id="navIdle" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#133b59" /><stop offset="1" stopColor="#020711" /></linearGradient>
          <linearGradient id="infoCardFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#103a55" stopOpacity="0.82" /><stop offset="0.52" stopColor="#071321" stopOpacity="0.94" /><stop offset="1" stopColor="#150b2d" stopOpacity="0.88" /></linearGradient>
          <linearGradient id="infoCardActiveFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#493708" stopOpacity="0.9" /><stop offset="0.5" stopColor="#102c42" stopOpacity="0.95" /><stop offset="1" stopColor="#231047" stopOpacity="0.9" /></linearGradient>
          <linearGradient id="cardHeaderStrip" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#111c3a" stopOpacity="0.34" /><stop offset="0.55" stopColor="#121631" stopOpacity="0.2" /><stop offset="1" stopColor="#0a0d24" stopOpacity="0.06" /></linearGradient>
          <linearGradient id="cardHeaderActiveStrip" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3b2d08" stopOpacity="0.32" /><stop offset="0.58" stopColor="#10233e" stopOpacity="0.24" /><stop offset="1" stopColor="#150b2d" stopOpacity="0.08" /></linearGradient>
          <linearGradient id="footerSelectedPill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe187" /><stop offset="1" stopColor="#b98214" /></linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy={cfg.page.shadowY} stdDeviation={cfg.page.shadowBlur} floodColor="#000000" floodOpacity={cfg.page.shadowOpacity} /></filter>
          <filter id="cyanGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="blur" /><feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.28 0 0 0 0 0.78 0 0 0 0 1 0 0 0 0.85 0" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="tabGreenGlow" x="-40%" y="-80%" width="180%" height="260%"><feGaussianBlur stdDeviation="4" result="blur" /><feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.2 0 0 0 0 1 0 0 0 0 0.55 0 0 0 0.75 0" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="goldGlow" x="-60%" y="-80%" width="220%" height="260%"><feGaussianBlur stdDeviation="3.5" result="blur" /><feColorMatrix in="blur" type="matrix" values="1 0 0 0 0.95 0 1 0 0 0.62 0 0 1 0 0.12 0 0 0 0.85 0" result="glow" /><feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="skeletonShadow" x="-20%" y="-30%" width="140%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#000" floodOpacity="0.72" /></filter>
          <filter id="pageEdgeGlow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation={cfg.glow.pageBlur} floodColor={cfg.glow.color} floodOpacity={cfg.glow.pageOpacity} /></filter>
          <filter id="tabEdgeGlow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation={cfg.glow.tabsBlur} floodColor={cfg.glow.color} floodOpacity={cfg.glow.tabsOpacity} /></filter>
          <filter id="panelEdgeGlow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="0" stdDeviation={cfg.glow.panelsBlur} floodColor={cfg.glow.color} floodOpacity={cfg.glow.panelsOpacity} /></filter>
          <filter id="stripEdgeGlow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="0" stdDeviation={cfg.glow.stripBlur} floodColor={cfg.glow.color} floodOpacity={cfg.glow.stripOpacity} /></filter>
          <filter id="buttonEdgeGlow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation={cfg.glow.buttonBlur} floodColor={cfg.glow.activeColor} floodOpacity={cfg.glow.buttonOpacity} /></filter>
        </defs>

        <rect x="0" y="0" width={vw} height={vh} fill={showInternalDesignerControls && cfg.canvas.whitePreviewBg ? '#ffffff' : '#020617'} opacity={showInternalDesignerControls ? cfg.canvas.svgBgOpacity : 0} />

        {cfg.visibility.tabGroup && (
          <g id="tabGroup">
            <rect x={tabsBgX} y={tabsBgY} width={tabsBgW} height={tabsBgH} rx={cfg.tabGroup.radius} fill="transparent" stroke={cfg.colors.tabStroke} strokeWidth="1.2" strokeOpacity="0.48" />
            {tabs.map((tab, index) => {
              const tx = tabStartX + index * (tabW + cfg.tabGroup.tabGap);
              const active = tab.id === normalizedActiveTopTab;
              const hover = hoverTopTab === tab.id;
              const tabY = cfg.tabGroup.y;
              const text = tab.label.toUpperCase();
              return (
                <g key={tab.id} onClick={() => selectTopTab(tab.id)} onMouseEnter={() => setHoverTopTab(tab.id)} onMouseLeave={() => setHoverTopTab(null)} style={{ cursor: 'pointer' }} filter={active ? 'url(#cyanGlow)' : hover ? 'url(#tabGreenGlow)' : undefined}>
                  <path d={roundedRectPath(tx, tabY, tabW, tabH, cfg.tabGroup.tabTopRadius, cfg.tabGroup.tabTopRadius, cfg.tabGroup.tabBottomRadius, cfg.tabGroup.tabBottomRadius)} fill={active ? 'url(#buttonGradient)' : hover ? 'url(#tabHoverFill)' : cfg.colors.tabInactiveFill} fillOpacity={active ? 0.88 : hover ? 0.7 : 0.62} stroke={active ? '#d8bfff' : hover ? cfg.colors.arrowHover : cfg.colors.tabStroke} strokeWidth={active || hover ? 1.7 : 1.25} strokeOpacity={active ? 0.86 : hover ? 0.82 : 0.5} />
                  <rect x={tx + 4} y={tabY + 4} width={Math.max(0, tabW - 8)} height={Math.min(cfg.tabGroup.shineH, Math.max(0, tabH - 8))} rx={Math.max(0, cfg.tabGroup.tabTopRadius - 2)} fill="#ffffff" opacity={active ? 0.14 : hover ? 0.08 : 0.04} pointerEvents="none" />
                  <SvgFitText x={tx + 13} y={tabY + tabH * 0.18} width={Math.max(18, tabW - 26)} height={tabH * 0.62} text={text} maxFontSize={cfg.tabGroup.fontSize} minFontSize={8} fontWeight="900" fill={active ? '#ffffff' : hover ? '#9dffc2' : '#d9edff'} />
                  {active && <rect x={tx + 4} y={tabY + tabH - cfg.tabGroup.activeLineH - 1} width={Math.max(0, tabW - 8)} height={cfg.tabGroup.activeLineH} fill="url(#selectedTabGradientLine)" />}
                </g>
              );
            })}
          </g>
        )}

        <g id="page">
          {cfg.visibility.pageFrame && <rect x={pageX} y={pageY + Math.max(0, cfg.page.shadowY)} width={pageW} height={pageH} rx={cfg.page.radius} fill="#000000" opacity={Math.min(0.32, cfg.page.shadowOpacity * 0.32)} pointerEvents="none" />}
          {cfg.visibility.pageFrame && cfg.glow.page && <rect x={pageX - 2} y={pageY - 2} width={pageW + 4} height={pageH + 4} rx={cfg.page.radius + 2} fill="none" stroke={cfg.glow.color} strokeWidth={Math.max(3, cfg.page.strokeWidth + 2)} strokeOpacity={Math.min(0.35, cfg.glow.pageOpacity * 0.42)} pointerEvents="none" />}
          {cfg.visibility.pageFrame && <rect x={pageX} y={pageY} width={pageW} height={pageH} rx={cfg.page.radius} fill="url(#skeletonGlass)" fillOpacity="0.5" stroke={cfg.colors.pageStroke} strokeWidth={Math.max(2, cfg.page.strokeWidth)} strokeOpacity="0.86" />}
          {cfg.visibility.bodyOverlay && <path d={`M${bodyX + cfg.body.overlayRadius} ${bodyY} H${bodyX + bodyW - cfg.body.overlayRadius} Q${bodyX + bodyW} ${bodyY} ${bodyX + bodyW} ${bodyY + cfg.body.overlayRadius} V${bodyBottom} H${bodyX} V${bodyY + cfg.body.overlayRadius} Q${bodyX} ${bodyY} ${bodyX + cfg.body.overlayRadius} ${bodyY} Z`} fill="url(#leftTopOverlay)" />}

          {cfg.visibility.sideA && (
            <g id="a-side">
              {cfg.visibility.hero && <HeroSummary x={bodyX + cfg.sideA.logoXPad} y={bodyY + cfg.sideA.logoY} w={sideAW - cfg.sideA.logoXPad * 2} cfg={cfg} logoUrl={heroLogoUrl} presentation={presentation} />}
              {cfg.visibility.stats && (
                <g id="stats">
                  {sideAStats.map((stat, i) => {
                    const sw = (sideAW - cfg.sideA.logoXPad * 2 - cfg.sideA.statsGap * 3) / 4;
                    const sx = bodyX + cfg.sideA.logoXPad + i * (sw + cfg.sideA.statsGap);
                    return <StatCard key={stat.label} x={sx} y={bodyY + cfg.sideA.statsY} w={sw} h={cfg.sideA.statsH} stat={stat} cfg={cfg} />;
                  })}
                </g>
              )}
              {cfg.visibility.sideAImage && sideAArtH > 10 && <LeftCardArt x={bodyX} y={sideAArtY} w={sideAW} h={sideAArtH} cfg={cfg} imageUrls={sideAImageUrls} activeIndex={safeSideAImageIndex} previousIndex={previousSideAImageIndex} />}
              <DebugLabel x={bodyX + 12} y={bodyY + 18} label="A side" cfg={cfg} />
            </g>
          )}

          {cfg.visibility.sideB && (
            <g id="b-side">
              {cfg.visibility.divider && <line x1={mainX} y1={bodyY} x2={mainX} y2={bodyY + mainH} stroke={cfg.colors.pageStroke} strokeWidth={cfg.body.dividerWidth} strokeOpacity="0.48" />}
              {cfg.visibility.divider && cfg.body.dividerConnectToStrip && <line x1={mainX} y1={bodyY + mainH} x2={mainX} y2={bandBY + (cfg.body.dividerConnectorWidth > 0 ? 1 : 0)} stroke={cfg.colors.pageStroke} strokeWidth={cfg.body.dividerConnectorWidth} strokeOpacity={cfg.body.dividerConnectorOpacity} />}
              {hasActiveVisualContent ? (
                <foreignObject
                  x={mainX + cfg.overview.xPad}
                  y={bodyY + 12}
                  width={Math.max(0, mainW - cfg.overview.xPad * 2)}
                  height={Math.max(80, bandBY - bodyY - 24)}
                >
                  <div
                    className="selected-game-showcase__visual-slot"
                    style={{
                      background: 'rgba(2, 6, 23, 0.42)',
                      border: '1px solid rgba(100, 216, 255, 0.22)',
                      borderRadius: 12,
                      color: '#ffffff',
                      height: '100%',
                      overflow: 'auto',
                      width: '100%',
                    }}
                  >
                    {activeVisualContent}
                  </div>
                </foreignObject>
              ) : (
                <>
                  {cfg.visibility.overview && (
                    <OverviewContent
                      x={mainX + cfg.overview.xPad}
                      y={bodyY}
                      w={mainW - cfg.overview.xPad}
                      imageBottomY={bandBY}
                      cfg={cfg}
                      content={activeContent}
                      imageUrl={overviewImageUrl}
                      chunks={activeChunks}
                      activeChunkId={activeChunk?.id ?? ''}
                      onSelectChunk={(chunkId) => setActiveChunkByTab((prev) => ({ ...prev, [activeTab.id]: chunkId }))}
                    />
                  )}
                  {showHowTo && <HowToContent key={howToChunk?.id ?? activeTab.id} x={mainX + cfg.howTo.xPad} y={howToY} w={mainW - cfg.howTo.xPad * 2} h={howToH} cfg={cfg} content={howToContent} />}
                </>
              )}
              <DebugLabel x={mainX + 12} y={bodyY + 18} label="B side" cfg={cfg} />
            </g>
          )}

          {cfg.visibility.strip && <GoalStripCarousel key={`${activeCardsKey}:${selectedStripChunkId}`} x={stripX} y={bandBY} w={stripW} h={cfg.strip.height} config={cfg} cards={activeCards} selectedChunkId={selectedStripChunkId} onSelectChunk={(chunkId) => {
            const card = activeCards.find((item) => item.id === chunkId);
            const nextTabId = card?.tabId ?? activeTab.id;
            selectTopTab(nextTabId);
            setActiveChunkByTab((prev) => ({ ...prev, [nextTabId]: card?.chunkId ?? chunkId }));
          }} />}
          {cfg.visibility.tip && <TipContent x={bodyX + cfg.tip.sideInset} y={tipY} w={bodyW - cfg.tip.sideInset * 2} h={cfg.tip.height} cfg={cfg} text={activeTab.tip || presentation.tip[activeTab.id] || ''} />}

          {cfg.visibility.button && visibleActions.length > 0 && (
            <g id="bottom-actions">
              <rect
                x={actionRailX}
                y={actionRailY - actionRailH / 2}
                width={actionRailW}
                height={actionRailH}
                fill="transparent"
                pointerEvents="none"
              />
              {visibleActions.map((action, index) => {
                const bx = actionStartX + index * (actionButtonW + actionGap);
                const by = viewButtonY;
                const bw = actionButtonW;
                const bh = cfg.button.height;
                const isBackAction = action.id === 'explore-card-games';
                const innerInset = cfg.button.innerBoxInset;
                const innerLeftInset = innerInset + cfg.button.innerBoxInsetLeft;
                const innerTopInset = innerInset + cfg.button.innerBoxInsetTop;
                const innerRightInset = innerInset + cfg.button.innerBoxInsetRight;
                const innerBottomInset = innerInset + cfg.button.innerBoxInsetBottom;
                const innerW = Math.min(cfg.button.innerBoxW, Math.max(28, bw * 0.18));
                const innerH = Math.max(0, bh - innerTopInset - innerBottomInset);
                const innerX = isBackAction ? bx + innerLeftInset : bx + bw - innerRightInset - innerW;
                const innerY = by + innerTopInset;
                const arrowCx = innerX + innerW / 2 + cfg.button.arrowOffsetX;
                const arrowCy = innerY + innerH / 2 + cfg.button.arrowOffsetY;
                const a = cfg.button.arrowSize;
                const textX = isBackAction ? innerX + innerW + 10 : bx + 8;
                const textRight = isBackAction ? bx + bw - 10 : innerX - 8;
                const arrowPoints = isBackAction
                  ? `${arrowCx + a * 0.45},${arrowCy - a} ${arrowCx - a * 0.65},${arrowCy} ${arrowCx + a * 0.45},${arrowCy + a}`
                  : `${arrowCx - a * 0.45},${arrowCy - a} ${arrowCx + a * 0.65},${arrowCy} ${arrowCx - a * 0.45},${arrowCy + a}`;
                return (
                  <g
                    key={action.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      if (onActionClick) {
                        onActionClick(action.id);
                      } else if (action.id === 'view-lobbies') {
                        onViewLobbies?.();
                      }
                    }}
                  >
                    <rect x={bx} y={by} width={bw} height={bh} rx={cfg.button.radius} fill="url(#buttonGradient)" stroke="#d8bfff" strokeOpacity={cfg.button.strokeOpacity} filter={cfg.glow.button ? 'url(#buttonEdgeGlow)' : undefined} />
                    <rect x={bx + 3} y={by + 3} width={Math.max(0, bw - 6)} height={cfg.button.shineH} rx={Math.max(0, cfg.button.radius - 2)} fill="#ffffff" opacity="0.11" />
                    <rect x={innerX} y={innerY} width={innerW} height={innerH} rx={cfg.button.innerBoxRadius} fill="#02030a" stroke="#8bd7ff" strokeWidth={cfg.button.innerBoxStrokeWidth} strokeOpacity={cfg.button.innerBoxStrokeOpacity} />
                    <rect x={innerX + 1.5} y={innerY + 1.5} width={Math.max(0, innerW - 3)} height={Math.max(0, cfg.button.innerBoxShineH)} rx={Math.max(0, cfg.button.innerBoxRadius - 1.5)} fill="#ffffff" opacity={cfg.button.innerBoxShineOpacity} />
                    <polygon points={arrowPoints} fill="#8bd7ff" filter="url(#cyanGlow)" />
                    <SvgFitText x={textX} y={by + 4} width={Math.max(32, textRight - textX)} height={Math.max(20, bh - 8)} text={action.label.toUpperCase()} maxFontSize={cfg.button.fontSize} minFontSize={8} fontWeight="900" fill="#ffffff" />
                  </g>
                );
              })}
            </g>
          )}
        </g>
        {designerMode ? (
          <g id="selected-game-debug-bounds" pointerEvents="none">
            <rect x={1} y={1} width={vw - 2} height={vh - 2} fill="none" stroke="#facc15" strokeWidth="2.5" strokeDasharray="16 10" />
            <BoundsLabel x={12} y={28} label="canvas" />
            <rect x={tabsBgX} y={tabsBgY} width={tabsBgW} height={tabsBgH} rx={cfg.tabGroup.radius} fill="none" stroke="#f472b6" strokeWidth="2.5" strokeDasharray="12 8" />
            <BoundsLabel x={tabsBgX + 8} y={tabsBgY + 22} label="tabs" fill="#f472b6" />
            <rect x={pageX} y={pageY} width={pageW} height={pageH} rx={cfg.page.radius} fill="none" stroke="#facc15" strokeWidth="3" strokeDasharray="18 10" />
            <BoundsLabel x={pageX + 12} y={pageY + 24} label="page frame" />
            <rect x={bodyX} y={bodyY} width={bodyW} height={Math.max(0, bodyBottom - bodyY)} rx={cfg.body.overlayRadius} fill="none" stroke="#a855f7" strokeWidth="2.5" strokeDasharray="14 8" />
            <BoundsLabel x={bodyX + 12} y={bodyY + 52} label="body" fill="#a855f7" />
            <rect x={bodyX} y={bodyY} width={sideAW} height={leftH} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="11 7" />
            <BoundsLabel x={bodyX + 12} y={bodyY + 80} label="side A" fill="#38bdf8" />
            <rect x={mainX} y={bodyY} width={mainW} height={mainH} fill="none" stroke="#c084fc" strokeWidth="2.5" strokeDasharray="11 7" />
            <BoundsLabel x={mainX + 12} y={bodyY + 80} label="side B" fill="#c084fc" />
            <rect x={mainX + cfg.overview.xPad} y={bodyY + 12} width={Math.max(0, mainW - cfg.overview.xPad * 2)} height={Math.max(80, bandBY - bodyY - 24)} fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="8 6" />
            <BoundsLabel x={mainX + cfg.overview.xPad + 8} y={bodyY + 108} label="B content" fill="#22d3ee" />
            {showHowTo ? (
              <>
                <rect x={mainX + cfg.howTo.xPad} y={howToY} width={Math.max(0, mainW - cfg.howTo.xPad * 2)} height={howToH} fill="none" stroke="#34d399" strokeWidth="2" strokeDasharray="8 6" />
                <BoundsLabel x={mainX + cfg.howTo.xPad + 8} y={howToY + 24} label="how to" fill="#34d399" />
              </>
            ) : null}
            <rect x={stripX} y={bandBY} width={stripW} height={cfg.strip.height} rx={cfg.strip.radius} fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeDasharray="12 8" />
            <BoundsLabel x={stripX + 12} y={bandBY + 24} label="quick strip" fill="#2dd4bf" />
            <rect x={tipX} y={tipY} width={tipW} height={cfg.tip.height} rx={cfg.tip.radius} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="10 7" />
            <BoundsLabel x={tipX + 12} y={tipY + 24} label="tip" fill="#fbbf24" />
            <rect x={actionRailX} y={actionRailY - actionRailH / 2} width={actionRailW} height={actionRailH} rx={Math.min(18, actionRailH / 2)} fill="none" stroke="#4ade80" strokeWidth="2.5" strokeDasharray="14 9" />
            <BoundsLabel x={actionRailX + 12} y={actionRailY - actionRailH / 2 + 24} label="action rail" fill="#4ade80" />
            <rect x={actionX} y={viewButtonY} width={cfg.button.width} height={cfg.button.height} rx={cfg.button.radius} fill="none" stroke="#fb7185" strokeWidth="2.5" strokeDasharray="10 7" />
            <BoundsLabel x={actionX + 12} y={viewButtonY + 24} label="action" fill="#fb7185" />
          </g>
        ) : null}
      </svg>
      {showInternalDesignerControls && <DesignerControls config={config} setConfig={setConfig} layoutMode={layoutMode} setLayoutMode={setLayoutMode} />}
    </div>
  );
}

export default SelectedGameShowcase;
