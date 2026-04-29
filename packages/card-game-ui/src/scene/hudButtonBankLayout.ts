import type { HudArtworkControls, HudButtonControls } from './HudArtwork.types';
import { resolveHudButtonArtSize } from './hudButtonGeometry';

export interface BankButtonDescriptor {
  index: number;
  label: string;
  config: HudButtonControls;
}

export interface BankLayoutItem {
  index: number;
  label: string;
  config: HudButtonControls;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface BankLayout {
  left: number;
  top: number;
  width: number;
  height: number;
  scale: number;
  gap: number;
  items: BankLayoutItem[];
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function createHudButtonBankLayout({
  buttons,
  hostLeft,
  hostTop,
  hostWidth,
  hostHeight,
  align,
  buttonScale,
  bankControls,
  offsetX,
  offsetY,
}: {
  buttons: BankButtonDescriptor[];
  hostLeft: number;
  hostTop: number;
  hostWidth: number;
  hostHeight: number;
  align: 'start' | 'end';
  buttonScale: number;
  bankControls: HudArtworkControls['buttonBank'];
  offsetX: number;
  offsetY: number;
}): BankLayout | null {
  if (buttons.length === 0 || hostWidth <= 0 || hostHeight <= 0) {
    return null;
  }

  const measuredButtons = buttons.map((entry) => ({
    ...entry,
    size: resolveHudButtonArtSize(entry.config),
  }));
  const naturalWidth = measuredButtons.reduce(
    (sum, entry, index) => sum + entry.size.width + (index > 0 ? bankControls.gap : 0),
    0,
  );
  const naturalHeight = measuredButtons.reduce(
    (max, entry) => Math.max(max, entry.size.height),
    1,
  );
  const innerWidth = Math.max(1, hostWidth - bankControls.paddingX * 2);
  const innerHeight = Math.max(1, hostHeight - bankControls.paddingY * 2);
  const fittedScale = Math.min(innerWidth / naturalWidth, innerHeight / naturalHeight);
  const minScale = Math.min(bankControls.minScale, bankControls.maxScale);
  const maxScale = Math.max(bankControls.minScale, bankControls.maxScale);
  const scaleMultiplier = clampNumber(
    Math.max(buttonScale, 0.01),
    minScale,
    maxScale,
  );
  const scale = fittedScale * scaleMultiplier;
  const renderedWidth = naturalWidth * scale;
  const renderedHeight = naturalHeight * scale;
  const left = align === 'end'
    ? hostLeft + bankControls.paddingX + innerWidth - renderedWidth + offsetX
    : hostLeft + bankControls.paddingX + offsetX;
  const top = hostTop + bankControls.paddingY + (innerHeight - renderedHeight) / 2 + offsetY;
  let cursorX = 0;
  const items: BankLayoutItem[] = measuredButtons.map((entry, index) => {
    const item = {
      index: entry.index,
      label: entry.label,
      config: entry.config,
      left: cursorX,
      top: (naturalHeight - entry.size.height) / 2,
      width: entry.size.width,
      height: entry.size.height,
    };
    cursorX += entry.size.width + (index < measuredButtons.length - 1 ? bankControls.gap : 0);
    return item;
  });

  return {
    left,
    top,
    width: naturalWidth,
    height: naturalHeight,
    scale,
    gap: bankControls.gap,
    items,
  };
}
