export type AppPageSvgControls = {
  accentColor: string;
  panelOpacity: number;
  density: number;
  stageScale: number;
  heroOffsetY: number;
  showGuides: boolean;
};

export type AppPageSvgMetric = {
  label: string;
  value: string | number;
};

export type AppPageSvgAction = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
};

export type AppPageSvgPanelRow = {
  label: string;
  value: string | number;
};

export type AppPageSvgPanel = {
  title: string;
  subtitle?: string;
  rows: AppPageSvgPanelRow[];
  actions?: AppPageSvgAction[];
};

export const DEFAULT_APP_PAGE_SVG_CONTROLS: AppPageSvgControls = {
  accentColor: '#67e8f9',
  panelOpacity: 0.9,
  density: 1,
  stageScale: 1,
  heroOffsetY: 0,
  showGuides: false,
};

export function normalizeAppPageSvgControls(
  controls?: Partial<AppPageSvgControls> | null,
): AppPageSvgControls {
  return {
    accentColor: controls?.accentColor ?? DEFAULT_APP_PAGE_SVG_CONTROLS.accentColor,
    panelOpacity: clampNumber(controls?.panelOpacity, 0.35, 1, DEFAULT_APP_PAGE_SVG_CONTROLS.panelOpacity),
    density: clampNumber(controls?.density, 0.72, 1.35, DEFAULT_APP_PAGE_SVG_CONTROLS.density),
    stageScale: clampNumber(controls?.stageScale, 0.82, 1.16, DEFAULT_APP_PAGE_SVG_CONTROLS.stageScale),
    heroOffsetY: clampNumber(controls?.heroOffsetY, -90, 140, DEFAULT_APP_PAGE_SVG_CONTROLS.heroOffsetY),
    showGuides: controls?.showGuides ?? DEFAULT_APP_PAGE_SVG_CONTROLS.showGuides,
  };
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
