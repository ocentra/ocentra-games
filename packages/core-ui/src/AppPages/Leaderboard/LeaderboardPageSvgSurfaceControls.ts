export type LeaderboardPageSvgControls = {
  canvas: {
    width: number;
    height: number;
  };
  layout: {
    outerPad: number;
    gap: number;
    leftW: number;
    rightW: number;
    topY: number;
    headerH: number;
    tabsY: number;
    tabsH: number;
    mainY: number;
    bottomY: number;
    bottomH: number;
  };
  colors: {
    background: string;
    panelFill: string;
    panelStroke: string;
    cyan: string;
    gold: string;
    purple: string;
    red: string;
    muted: string;
    bodyText: string;
    mutedText: string;
    selectedFill: string;
  };
  chrome: {
    panelCut: number;
    panelStrokeWidth: number;
    panelInnerInset: number;
    hoverPad: number;
    glowOpacity: number;
    buttonArrowWidth: number;
    rowHeight: number;
    rowGap: number;
    avatarRadius: number;
  };
};

export type LeaderboardPageSvgNumberField = {
  group: Exclude<keyof LeaderboardPageSvgControls, 'colors'>;
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
};

export type LeaderboardPageSvgColorField = {
  key: keyof LeaderboardPageSvgControls['colors'];
  label: string;
};

export const DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS: LeaderboardPageSvgControls = {
  canvas: {
    width: 2048,
    height: 900,
  },
  layout: {
    outerPad: 16,
    gap: 14,
    leftW: 252,
    rightW: 336,
    topY: 20,
    headerH: 82,
    tabsY: 116,
    tabsH: 44,
    mainY: 116,
    bottomY: 824,
    bottomH: 76,
  },
  colors: {
    background: '#030712',
    panelFill: '#071625',
    panelStroke: '#3fc9e8',
    cyan: '#42e8ff',
    gold: '#f6c34a',
    purple: '#9b5cff',
    red: '#ff5d72',
    muted: '#c7d7ee',
    bodyText: '#ffffff',
    mutedText: '#9fb8cf',
    selectedFill: '#273184',
  },
  chrome: {
    panelCut: 14,
    panelStrokeWidth: 1.1,
    panelInnerInset: 5,
    hoverPad: 4,
    glowOpacity: 0.24,
    buttonArrowWidth: 26,
    rowHeight: 35,
    rowGap: 4,
    avatarRadius: 15,
  },
};

export const LEADERBOARD_PAGE_SVG_NUMBER_FIELDS: LeaderboardPageSvgNumberField[] = [
  { group: 'canvas', key: 'width', label: 'Canvas width', min: 960, max: 2600, step: 1 },
  { group: 'canvas', key: 'height', label: 'Canvas height', min: 640, max: 1120, step: 1 },
  { group: 'layout', key: 'outerPad', label: 'Outer padding', min: 8, max: 60, step: 1 },
  { group: 'layout', key: 'gap', label: 'Region gap', min: 6, max: 34, step: 1 },
  { group: 'layout', key: 'leftW', label: 'Left rail width', min: 180, max: 340, step: 1 },
  { group: 'layout', key: 'rightW', label: 'Right rail width', min: 240, max: 420, step: 1 },
  { group: 'layout', key: 'topY', label: 'Top Y', min: 0, max: 90, step: 1 },
  { group: 'layout', key: 'headerH', label: 'Header height', min: 48, max: 110, step: 1 },
  { group: 'layout', key: 'tabsY', label: 'Tabs Y', min: 80, max: 150, step: 1 },
  { group: 'layout', key: 'tabsH', label: 'Tabs height', min: 28, max: 58, step: 1 },
  { group: 'layout', key: 'mainY', label: 'Main Y', min: 125, max: 210, step: 1 },
  { group: 'layout', key: 'bottomY', label: 'Bottom rail Y', min: 680, max: 900, step: 1 },
  { group: 'layout', key: 'bottomH', label: 'Bottom rail height', min: 56, max: 180, step: 1 },
  { group: 'chrome', key: 'panelCut', label: 'Panel cut', min: 4, max: 28, step: 1 },
  { group: 'chrome', key: 'panelStrokeWidth', label: 'Panel stroke', min: 0.4, max: 3, step: 0.1 },
  { group: 'chrome', key: 'panelInnerInset', label: 'Inner inset', min: 0, max: 12, step: 0.5 },
  { group: 'chrome', key: 'hoverPad', label: 'Hover pad', min: 1, max: 10, step: 0.5 },
  { group: 'chrome', key: 'glowOpacity', label: 'Glow opacity', min: 0, max: 0.6, step: 0.01 },
  { group: 'chrome', key: 'buttonArrowWidth', label: 'Button arrow width', min: 16, max: 44, step: 1 },
  { group: 'chrome', key: 'rowHeight', label: 'Table row height', min: 28, max: 48, step: 1 },
  { group: 'chrome', key: 'rowGap', label: 'Table row gap', min: 0, max: 10, step: 1 },
  { group: 'chrome', key: 'avatarRadius', label: 'Avatar radius', min: 8, max: 24, step: 1 },
];

export const LEADERBOARD_PAGE_SVG_COLOR_FIELDS: LeaderboardPageSvgColorField[] = [
  { key: 'background', label: 'Background' },
  { key: 'panelFill', label: 'Panel fill' },
  { key: 'panelStroke', label: 'Panel stroke' },
  { key: 'cyan', label: 'Cyan' },
  { key: 'gold', label: 'Gold' },
  { key: 'purple', label: 'Purple' },
  { key: 'red', label: 'Red' },
  { key: 'muted', label: 'Muted' },
  { key: 'bodyText', label: 'Body text' },
  { key: 'mutedText', label: 'Muted text' },
  { key: 'selectedFill', label: 'Selected fill' },
];

export function normalizeLeaderboardPageSvgControls(
  controls?: Partial<LeaderboardPageSvgControls> | null,
): LeaderboardPageSvgControls {
  return {
    canvas: {
      width: clampNumber(controls?.canvas?.width, 960, 2600, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.canvas.width),
      height: clampNumber(controls?.canvas?.height, 640, 1120, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.canvas.height),
    },
    layout: {
      outerPad: clampNumber(controls?.layout?.outerPad, 8, 60, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.layout.outerPad),
      gap: clampNumber(controls?.layout?.gap, 6, 34, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.layout.gap),
      leftW: clampNumber(controls?.layout?.leftW, 180, 340, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.layout.leftW),
      rightW: clampNumber(controls?.layout?.rightW, 240, 420, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.layout.rightW),
      topY: clampNumber(controls?.layout?.topY, 0, 90, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.layout.topY),
      headerH: clampNumber(controls?.layout?.headerH, 48, 110, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.layout.headerH),
      tabsY: clampNumber(controls?.layout?.tabsY, 80, 150, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.layout.tabsY),
      tabsH: clampNumber(controls?.layout?.tabsH, 28, 58, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.layout.tabsH),
      mainY: clampNumber(controls?.layout?.mainY, 125, 210, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.layout.mainY),
      bottomY: clampNumber(controls?.layout?.bottomY, 680, 900, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.layout.bottomY),
      bottomH: clampNumber(controls?.layout?.bottomH, 56, 180, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.layout.bottomH),
    },
    colors: {
      background: controls?.colors?.background ?? DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.colors.background,
      panelFill: controls?.colors?.panelFill ?? DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.colors.panelFill,
      panelStroke: controls?.colors?.panelStroke ?? DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.colors.panelStroke,
      cyan: controls?.colors?.cyan ?? DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.colors.cyan,
      gold: controls?.colors?.gold ?? DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.colors.gold,
      purple: controls?.colors?.purple ?? DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.colors.purple,
      red: controls?.colors?.red ?? DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.colors.red,
      muted: controls?.colors?.muted ?? DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.colors.muted,
      bodyText: controls?.colors?.bodyText ?? DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.colors.bodyText,
      mutedText: controls?.colors?.mutedText ?? DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.colors.mutedText,
      selectedFill: controls?.colors?.selectedFill ?? DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.colors.selectedFill,
    },
    chrome: {
      panelCut: clampNumber(controls?.chrome?.panelCut, 4, 28, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.chrome.panelCut),
      panelStrokeWidth: clampNumber(controls?.chrome?.panelStrokeWidth, 0.4, 3, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.chrome.panelStrokeWidth),
      panelInnerInset: clampNumber(controls?.chrome?.panelInnerInset, 0, 12, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.chrome.panelInnerInset),
      hoverPad: clampNumber(controls?.chrome?.hoverPad, 1, 10, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.chrome.hoverPad),
      glowOpacity: clampNumber(controls?.chrome?.glowOpacity, 0, 0.6, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.chrome.glowOpacity),
      buttonArrowWidth: clampNumber(controls?.chrome?.buttonArrowWidth, 16, 44, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.chrome.buttonArrowWidth),
      rowHeight: clampNumber(controls?.chrome?.rowHeight, 28, 48, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.chrome.rowHeight),
      rowGap: clampNumber(controls?.chrome?.rowGap, 0, 10, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.chrome.rowGap),
      avatarRadius: clampNumber(controls?.chrome?.avatarRadius, 8, 24, DEFAULT_LEADERBOARD_PAGE_SVG_CONTROLS.chrome.avatarRadius),
    },
  };
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
