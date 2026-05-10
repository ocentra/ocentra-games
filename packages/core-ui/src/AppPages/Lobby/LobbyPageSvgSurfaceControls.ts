export type LobbyPageSvgControls = {
  layout: {
    mainWidth: number;
    mainHeight: number;
    pagePad: number;
    mainRadius: number;
    panelStrokeWidth: number;
    outerGlowOpacity: number;
    popupBlurOpacity: number;
    sidePanelAnimMs: number;
  };
  header: {
    heroH: number;
    titleSize: number;
    titleSpacing: number;
    subtitleSize: number;
    statLargeW: number;
    statSmallW: number;
    statLargeH: number;
    statSmallH: number;
    statY: number;
    smallStatY: number;
    leftStatInset: number;
    rightStatInset: number;
  };
  leftPanel: {
    x: number;
    y: number;
    w: number;
    h: number;
    pad: number;
    actionGap: number;
    navGap: number;
    eventCardScale: number;
  };
  mainBody: {
    modeTabsY: number;
    modeTabsH: number;
    featuredY: number;
    featuredH: number;
    allTablesH: number;
    filtersY: number;
    activeY: number;
    footerY: number;
  };
  rightPanel: {
    x: number;
    y: number;
    w: number;
    h: number;
    profileY: number;
    friendsY: number;
    chatY: number;
  };
  spinner: {
    radius: number;
    innerRadius: number;
    resultHoldMs: number;
    spinMs: number;
    collectTickMs: number;
    extraTurnsMin: number;
    extraTurnsRandom: number;
    startTextRadius: number;
    startTextSize: number;
    resultY: number;
    numberBoxW: number;
    numberBoxH: number;
    centerGoldR: number;
    arrowHeight: number;
  };
  colors: {
    pageBg: string;
    panelStroke: string;
    panelFill: string;
    cyan: string;
    purple: string;
    gold: string;
    green: string;
    red: string;
    text: string;
  };
};

export type LobbyPageSvgControlGroup = keyof LobbyPageSvgControls;

export type LobbyPageSvgNumberField = {
  group: Exclude<LobbyPageSvgControlGroup, 'colors'>;
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
};

export type LobbyPageSvgColorField = {
  key: keyof LobbyPageSvgControls['colors'];
  label: string;
};

export const DEFAULT_LOBBY_PAGE_SVG_CONTROLS: LobbyPageSvgControls = {
  layout: {
    mainWidth: 1536,
    mainHeight: 930,
    pagePad: 8,
    mainRadius: 12,
    panelStrokeWidth: 1,
    outerGlowOpacity: 1,
    popupBlurOpacity: 0.58,
    sidePanelAnimMs: 900,
  },
  header: {
    heroH: 144,
    titleSize: 62,
    titleSpacing: 8,
    subtitleSize: 14,
    statLargeW: 116,
    statSmallW: 88,
    statLargeH: 88,
    statSmallH: 66,
    statY: 38,
    smallStatY: 49,
    leftStatInset: 26,
    rightStatInset: 28,
  },
  leftPanel: {
    x: 14,
    y: 12,
    w: 254,
    h: 856,
    pad: 10,
    actionGap: 6,
    navGap: 5,
    eventCardScale: 1,
  },
  mainBody: {
    modeTabsY: 154,
    modeTabsH: 68,
    featuredY: 230,
    featuredH: 430,
    allTablesH: 638,
    filtersY: 690,
    activeY: 760,
    footerY: 884,
  },
  rightPanel: {
    x: 1230,
    y: 12,
    w: 294,
    h: 856,
    profileY: 24,
    friendsY: 120,
    chatY: 512,
  },
  spinner: {
    radius: 266,
    innerRadius: 58,
    resultHoldMs: 5000,
    spinMs: 4300,
    collectTickMs: 130,
    extraTurnsMin: 6,
    extraTurnsRandom: 3,
    startTextRadius: 116,
    startTextSize: 17,
    resultY: -88,
    numberBoxW: 148,
    numberBoxH: 58,
    centerGoldR: 97,
    arrowHeight: 174,
  },
  colors: {
    pageBg: '#01040b',
    panelStroke: '#58bfff',
    panelFill: '#050b13',
    cyan: '#13d8f0',
    purple: '#7d49ff',
    gold: '#ffca4b',
    green: '#54eca0',
    red: '#ff4b58',
    text: '#edf7ff',
  },
};

export const LOBBY_PAGE_SVG_NUMBER_FIELDS: Record<Exclude<LobbyPageSvgControlGroup, 'colors'>, LobbyPageSvgNumberField[]> = {
  layout: [
    { group: 'layout', key: 'mainHeight', label: 'Main Height', min: 720, max: 1400 },
    { group: 'layout', key: 'mainRadius', label: 'Main Radius', min: 0, max: 30 },
    { group: 'layout', key: 'panelStrokeWidth', label: 'Panel Stroke', min: 0, max: 5, step: 0.1 },
    { group: 'layout', key: 'outerGlowOpacity', label: 'Outer Glow', min: 0, max: 1, step: 0.01 },
    { group: 'layout', key: 'popupBlurOpacity', label: 'Popup Blur Opacity', min: 0.1, max: 1, step: 0.01 },
    { group: 'layout', key: 'sidePanelAnimMs', label: 'Side Animation ms', min: 100, max: 2000, step: 50 },
  ],
  header: [
    { group: 'header', key: 'heroH', label: 'Hero Height', min: 100, max: 190 },
    { group: 'header', key: 'titleSize', label: 'Title Size', min: 32, max: 82 },
    { group: 'header', key: 'titleSpacing', label: 'Title Spacing', min: 0, max: 16 },
    { group: 'header', key: 'subtitleSize', label: 'Subtitle Size', min: 8, max: 28 },
    { group: 'header', key: 'statLargeW', label: 'Stat Large W', min: 80, max: 170 },
    { group: 'header', key: 'statSmallW', label: 'Stat Small W', min: 54, max: 130 },
    { group: 'header', key: 'statLargeH', label: 'Stat Large H', min: 48, max: 120 },
    { group: 'header', key: 'statSmallH', label: 'Stat Small H', min: 42, max: 100 },
    { group: 'header', key: 'statY', label: 'Stat Y', min: 14, max: 70 },
    { group: 'header', key: 'smallStatY', label: 'Small Stat Y', min: 14, max: 80 },
    { group: 'header', key: 'leftStatInset', label: 'Left Stat Inset', min: 0, max: 90 },
    { group: 'header', key: 'rightStatInset', label: 'Right Stat Inset', min: 0, max: 90 },
  ],
  leftPanel: [
    { group: 'leftPanel', key: 'x', label: 'Left X', min: 0, max: 80 },
    { group: 'leftPanel', key: 'y', label: 'Left Y', min: 0, max: 80 },
    { group: 'leftPanel', key: 'w', label: 'Left W', min: 210, max: 340 },
    { group: 'leftPanel', key: 'h', label: 'Left H', min: 700, max: 900 },
    { group: 'leftPanel', key: 'pad', label: 'Panel Pad', min: 4, max: 24 },
    { group: 'leftPanel', key: 'actionGap', label: 'Action Gap', min: 0, max: 16 },
    { group: 'leftPanel', key: 'navGap', label: 'Nav Gap', min: 0, max: 16 },
    { group: 'leftPanel', key: 'eventCardScale', label: 'Mini Spinner Scale', min: 0.75, max: 1.2, step: 0.01 },
  ],
  mainBody: [
    { group: 'mainBody', key: 'modeTabsY', label: 'Mode Tabs Y', min: 120, max: 220 },
    { group: 'mainBody', key: 'modeTabsH', label: 'Mode Tabs H', min: 44, max: 96 },
    { group: 'mainBody', key: 'featuredY', label: 'Featured Y', min: 190, max: 300 },
    { group: 'mainBody', key: 'featuredH', label: 'Featured H', min: 340, max: 540 },
    { group: 'mainBody', key: 'allTablesH', label: 'All Tables H', min: 520, max: 720 },
    { group: 'mainBody', key: 'filtersY', label: 'Filters Y', min: 620, max: 760 },
    { group: 'mainBody', key: 'activeY', label: 'Active Now Y', min: 700, max: 830 },
    { group: 'mainBody', key: 'footerY', label: 'Footer Y', min: 820, max: 910 },
  ],
  rightPanel: [
    { group: 'rightPanel', key: 'x', label: 'Right X', min: 1120, max: 1300 },
    { group: 'rightPanel', key: 'y', label: 'Right Y', min: 0, max: 80 },
    { group: 'rightPanel', key: 'w', label: 'Right W', min: 240, max: 380 },
    { group: 'rightPanel', key: 'h', label: 'Right H', min: 700, max: 900 },
    { group: 'rightPanel', key: 'profileY', label: 'Profile Y', min: 10, max: 80 },
    { group: 'rightPanel', key: 'friendsY', label: 'Friends Y', min: 90, max: 180 },
    { group: 'rightPanel', key: 'chatY', label: 'Chat Y', min: 440, max: 620 },
  ],
  spinner: [
    { group: 'spinner', key: 'radius', label: 'Radius', min: 180, max: 330 },
    { group: 'spinner', key: 'innerRadius', label: 'Inner Radius', min: 34, max: 90 },
    { group: 'spinner', key: 'resultHoldMs', label: 'Result Hold', min: 1000, max: 10000, step: 250 },
    { group: 'spinner', key: 'spinMs', label: 'Spin Duration', min: 1800, max: 8000, step: 100 },
    { group: 'spinner', key: 'collectTickMs', label: 'Collect Tick', min: 40, max: 500, step: 10 },
    { group: 'spinner', key: 'extraTurnsMin', label: 'Extra Turns Min', min: 1, max: 12 },
    { group: 'spinner', key: 'extraTurnsRandom', label: 'Extra Turns Random', min: 0, max: 8 },
    { group: 'spinner', key: 'startTextRadius', label: 'Start Text Radius', min: 70, max: 160 },
    { group: 'spinner', key: 'startTextSize', label: 'Start Text Size', min: 10, max: 28 },
    { group: 'spinner', key: 'resultY', label: 'Result Y', min: -160, max: 40 },
    { group: 'spinner', key: 'numberBoxW', label: 'Number Box W', min: 100, max: 220 },
    { group: 'spinner', key: 'numberBoxH', label: 'Number Box H', min: 42, max: 86 },
    { group: 'spinner', key: 'centerGoldR', label: 'Center Gold Radius', min: 60, max: 140 },
    { group: 'spinner', key: 'arrowHeight', label: 'Arrow Height', min: 80, max: 230 },
  ],
};

export const LOBBY_PAGE_SVG_COLOR_FIELDS: LobbyPageSvgColorField[] = [
  { key: 'panelStroke', label: 'Panel Stroke' },
  { key: 'panelFill', label: 'Panel Fill' },
  { key: 'cyan', label: 'Cyan' },
  { key: 'purple', label: 'Purple' },
  { key: 'gold', label: 'Gold' },
  { key: 'green', label: 'Green' },
  { key: 'red', label: 'Red' },
  { key: 'text', label: 'Text' },
];

export function normalizeLobbyPageSvgControls(value?: Partial<LobbyPageSvgControls> | null): LobbyPageSvgControls {
  const source = asRecord(value);
  return {
    layout: normalizeNumberGroup('layout', source.layout),
    header: normalizeNumberGroup('header', source.header),
    leftPanel: normalizeNumberGroup('leftPanel', source.leftPanel),
    mainBody: normalizeNumberGroup('mainBody', source.mainBody),
    rightPanel: normalizeNumberGroup('rightPanel', source.rightPanel),
    spinner: normalizeNumberGroup('spinner', source.spinner),
    colors: normalizeColors(source.colors),
  };
}

export function serializeLobbyPageSvgControls(value?: Partial<LobbyPageSvgControls> | null): LobbyPageSvgControls {
  return normalizeLobbyPageSvgControls(value);
}

function normalizeNumberGroup<Group extends Exclude<LobbyPageSvgControlGroup, 'colors'>>(
  group: Group,
  value: unknown,
): LobbyPageSvgControls[Group] {
  const source = asRecord(value);
  const defaults = DEFAULT_LOBBY_PAGE_SVG_CONTROLS[group];
  const next = { ...defaults } as Record<string, number>;
  const defaultRecord = defaults as Record<string, number>;
  LOBBY_PAGE_SVG_NUMBER_FIELDS[group].forEach(field => {
    next[field.key] = clampNumber(source[field.key], field.min, field.max, defaultRecord[field.key]);
  });
  return next as LobbyPageSvgControls[Group];
}

function normalizeColors(value: unknown): LobbyPageSvgControls['colors'] {
  const source = asRecord(value);
  return LOBBY_PAGE_SVG_COLOR_FIELDS.reduce<LobbyPageSvgControls['colors']>((next, field) => ({
    ...next,
    [field.key]: normalizeColor(source[field.key], DEFAULT_LOBBY_PAGE_SVG_CONTROLS.colors[field.key]),
  }), { ...DEFAULT_LOBBY_PAGE_SVG_CONTROLS.colors });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function normalizeColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}
