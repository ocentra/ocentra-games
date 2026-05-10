import type { LobbyCanvasRect } from './LobbyPageSvgTypes';

export function centeredPopupRect(canvas: LobbyCanvasRect, w: number, h: number, yOffset = 0) {
  const margin = 34;
  const safeW = Math.min(w, Math.max(320, canvas.w - margin * 2));
  const safeH = Math.min(h, Math.max(260, canvas.h - margin * 2));
  return {
    x: canvas.x + (canvas.w - safeW) / 2,
    y: canvas.y + Math.max(margin, (canvas.h - safeH) / 2 + yOffset),
    w: safeW,
    h: safeH,
  };
}

export function clampText(text: unknown, maxChars: number): string {
  const value = String(text ?? '');
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1))}...`;
}

export function maxCharsFor(width: number, fontSize: number, reserve = 0): number {
  return Math.max(3, Math.floor((width - reserve) / (fontSize * 0.56)));
}

export function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | { tl?: number; tr?: number; br?: number; bl?: number },
): string {
  const radius = typeof r === 'number' ? { tl: r, tr: r, br: r, bl: r } : r;
  const tl = radius.tl ?? 0;
  const tr = radius.tr ?? 0;
  const br = radius.br ?? 0;
  const bl = radius.bl ?? 0;
  return [
    `M ${x + tl} ${y}`,
    `H ${x + w - tr}`,
    tr ? `Q ${x + w} ${y} ${x + w} ${y + tr}` : `L ${x + w} ${y}`,
    `V ${y + h - br}`,
    br ? `Q ${x + w} ${y + h} ${x + w - br} ${y + h}` : `L ${x + w} ${y + h}`,
    `H ${x + bl}`,
    bl ? `Q ${x} ${y + h} ${x} ${y + h - bl}` : `L ${x} ${y + h}`,
    `V ${y + tl}`,
    tl ? `Q ${x} ${y} ${x + tl} ${y}` : `L ${x} ${y}`,
    'Z',
  ].join(' ');
}

export function badgeWidth(label: string, min = 48, max = 92): number {
  return Math.max(min, Math.min(max, label.length * 6.6 + 16));
}
