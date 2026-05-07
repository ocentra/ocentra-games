import type { CSSProperties } from 'react';

export const SUITS = ['club', 'diamond', 'heart', 'spade'] as const;
export type Suit = (typeof SUITS)[number];
export type Variant = 'filled' | 'hollow';
export type RingMode = 'none' | 'circle';
export type RingFit = 'viewport' | 'aroundIcon' | 'manual';
export type SystemMode = 'icon' | 'card';

export type SuitIconDefaults = {
  suit: Suit;
  variant: Variant;
  size: number;
  showBackground: boolean;
  showRings: boolean;
  showIcon: boolean;
  showBounds: boolean;
  ringMode: RingMode;
  ringFit: RingFit;
  ringCount: number;
  ringGap: number;
  ringStart: number;
  ringOuterPadding: number;
  ringScale: number;
  ringOpacity: number;
  ringStroke: number;
  ringColor: string;
  autoCenterIcon: boolean;
  iconOffsetX: number;
  iconOffsetY: number;
  iconScale: number;
  redFill: string;
  blackFill: string;
  outlineColor: string;
  outlineWidth: number;
  hollowOuterOpacity: number;
  hollowCutoutOpacity: number;
  hollowInnerOpacity: number;
  showHollowStripes: boolean;
  hollowStripeOpacity: number;
  shadowGlow: boolean;
  bgColor: string;
};

export type SuitCardDefaults = {
  cardAspectLocked: boolean;
  cardWidth: number;
  cardHeight: number;
  cardRadius: number;
  cardPadding: number;
  cardFill: string;
  cardFillOpacity: number;
  cardFillTransparent: boolean;
  cardStroke: string;
  cardStrokeWidth: number;
  cardInnerStroke: string;
  cardInnerStrokeWidth: number;
  showCardFrame: boolean;
  showCardPattern: boolean;
  cardPatternOpacity: number;
  mainIconSize: number;
  mainIconX: number;
  mainIconY: number;
  cornerIconSize: number;
  useCornerInsetLayout: boolean;
  cornerInsetX: number;
  cornerInsetY: number;
  topCornerX: number;
  topCornerY: number;
  bottomCornerX: number;
  bottomCornerY: number;
};

export type SuitIconProps = Partial<SuitIconDefaults> & {
  suit: Suit;
  className?: string;
  style?: CSSProperties;
  title?: string;
};

export type SuitCardProps = Partial<SuitIconDefaults & SuitCardDefaults> & {
  suit: Suit;
  className?: string;
  style?: CSSProperties;
  title?: string;
};

export type SuitArtKind = 'icon' | 'card';

export type SuitArtRequest = {
  suit: Suit;
  variant?: Variant;
  kind?: SuitArtKind;
  icon?: Partial<SuitIconDefaults>;
  card?: Partial<SuitCardDefaults>;
};

export const ICON_DEFAULTS: SuitIconDefaults = {
  suit: 'spade',
  variant: 'hollow',
  size: 317,
  showBackground: false,
  showRings: true,
  showIcon: true,
  showBounds: false,
  ringMode: 'none',
  ringFit: 'viewport',
  ringCount: 23,
  ringGap: 3,
  ringStart: 0,
  ringOuterPadding: 14,
  ringScale: 0.87,
  ringOpacity: 0.24,
  ringStroke: 0.72,
  ringColor: '#6a6a6a',
  autoCenterIcon: true,
  iconOffsetX: 0,
  iconOffsetY: 0,
  iconScale: 1,
  redFill: '#e50000',
  blackFill: '#020202',
  outlineColor: '#505050',
  outlineWidth: 0.75,
  hollowOuterOpacity: 0.39,
  hollowCutoutOpacity: 1,
  hollowInnerOpacity: 1,
  showHollowStripes: false,
  hollowStripeOpacity: 0.32,
  shadowGlow: true,
  bgColor: '#070707',
};

export const CARD_DESIGN_WIDTH = 160;
export const CARD_DESIGN_HEIGHT = 250;

export const CARD_DEFAULTS: SuitCardDefaults = {
  cardAspectLocked: true,
  cardWidth: 320,
  cardHeight: 500,
  cardRadius: 15,
  cardPadding: 9,
  cardFill: '#030303',
  cardFillOpacity: 0.14,
  cardFillTransparent: false,
  cardStroke: '#c7c7c7',
  cardStrokeWidth: 3,
  cardInnerStroke: '#3b3b3b',
  cardInnerStrokeWidth: 1.2,
  showCardFrame: true,
  showCardPattern: false,
  cardPatternOpacity: 0.18,
  mainIconSize: 126,
  mainIconX: 80,
  mainIconY: 126,
  cornerIconSize: 30,
  useCornerInsetLayout: true,
  cornerInsetX: 27,
  cornerInsetY: 27,
  topCornerX: 32,
  topCornerY: 45,
  bottomCornerX: 128,
  bottomCornerY: 205,
};

export const DEFAULT_SYSTEM_MODE: SystemMode = 'card';

export const SUIT_ART_KEYS = [
  'club-filled',
  'club-hollow',
  'diamond-filled',
  'diamond-hollow',
  'heart-filled',
  'heart-hollow',
  'spade-filled',
  'spade-hollow',
] as const;

export const suitPaths: Record<Suit, string> = {
  club: 'M128 31 C97 31 72 57 72 89 C72 98 74 107 78 116 C69 111 59 109 49 111 C24 116 7 138 10 164 C13 190 35 209 61 208 C75 207 87 201 96 192 C98 198 96 204 91 210 C83 221 69 226 54 226 C48 226 45 233 49 238 C58 249 75 252 90 244 C100 239 108 230 112 219 C116 224 122 226 128 226 C134 226 140 224 144 219 C148 230 156 239 166 244 C181 252 198 249 207 238 C211 233 208 226 202 226 C187 226 173 221 165 210 C160 204 158 198 160 192 C169 201 181 207 195 208 C221 209 243 190 246 164 C249 138 232 116 207 111 C197 109 187 111 178 116 C182 107 184 98 184 89 C184 57 159 31 128 31 Z',
  diamond: 'M128 25 C134 25 138 35 143 49 C157 91 189 121 229 128 C236 129 236 135 229 136 C189 143 157 173 143 215 C138 229 134 239 128 239 C122 239 118 229 113 215 C99 173 67 143 27 136 C20 135 20 129 27 128 C67 121 99 91 113 49 C118 35 122 25 128 25 Z',
  heart: 'M128 228 C123 209 86 186 54 157 C25 130 22 90 44 66 C64 44 101 47 128 80 C155 47 192 44 212 66 C234 90 231 130 202 157 C170 186 133 209 128 228 Z',
  spade: 'M128 25 C134 43 168 70 199 105 C225 135 234 174 214 201 C195 227 158 226 135 197 C139 211 146 219 158 224 C166 228 176 228 185 226 C190 225 194 231 191 236 C182 251 161 254 143 244 C135 239 130 231 128 222 C126 231 121 239 113 244 C95 254 74 251 65 236 C62 231 66 225 71 226 C80 228 90 228 98 224 C110 219 117 211 121 197 C98 226 61 227 42 201 C22 174 31 135 57 105 C88 70 122 43 128 25 Z',
};

export const iconBounds: Record<Suit, { x: number; y: number; width: number; height: number; outerRadius: number }> = {
  club: { x: 7, y: 31, width: 242, height: 221, outerRadius: 102 },
  diamond: { x: 20, y: 25, width: 216, height: 214, outerRadius: 102 },
  heart: { x: 22, y: 44, width: 212, height: 184, outerRadius: 100 },
  spade: { x: 22, y: 25, width: 212, height: 229, outerRadius: 104 },
};

const suitAliases: Record<string, Suit> = {
  club: 'club',
  clubs: 'club',
  c: 'club',
  '\u2663': 'club',
  '\u2667': 'club',
  diamond: 'diamond',
  diamonds: 'diamond',
  d: 'diamond',
  '\u2666': 'diamond',
  '\u2662': 'diamond',
  heart: 'heart',
  hearts: 'heart',
  h: 'heart',
  '\u2665': 'heart',
  '\u2661': 'heart',
  spade: 'spade',
  spades: 'spade',
  s: 'spade',
  '\u2660': 'spade',
  '\u2664': 'spade',
};

export function normalizeSuit(value: unknown): Suit | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  return suitAliases[normalized] ?? null;
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'heart' || suit === 'diamond';
}

export function getSuitColorKind(suit: Suit): 'red' | 'black' {
  return isRedSuit(suit) ? 'red' : 'black';
}

export function getSuitIconProps(
  suit: Suit,
  variant: Variant = ICON_DEFAULTS.variant,
  overrides: Partial<SuitIconDefaults> = {}
): SuitIconProps {
  return {
    ...ICON_DEFAULTS,
    suit,
    variant,
    ...overrides,
  };
}

export function getSuitCardProps(
  suit: Suit,
  variant: Variant = ICON_DEFAULTS.variant,
  iconOverrides: Partial<SuitIconDefaults> = {},
  cardOverrides: Partial<SuitCardDefaults> = {}
): SuitCardProps {
  return {
    ...ICON_DEFAULTS,
    ...CARD_DEFAULTS,
    suit,
    variant,
    ...iconOverrides,
    ...cardOverrides,
  };
}

export function getSuitArtProps(request: SuitArtRequest): SuitIconProps | SuitCardProps {
  const variant = request.variant ?? ICON_DEFAULTS.variant;
  if (request.kind === 'card') {
    return getSuitCardProps(request.suit, variant, request.icon, request.card);
  }
  return getSuitIconProps(request.suit, variant, request.icon);
}

export function iconTransform(suit: Suit, autoCenterIcon: boolean, iconOffsetX: number, iconOffsetY: number, iconScale: number) {
  const b = iconBounds[suit];
  const autoX = autoCenterIcon ? 128 - (b.x + b.width / 2) : 0;
  const autoY = autoCenterIcon ? 128 - (b.y + b.height / 2) : 0;
  return `translate(${autoX + iconOffsetX} ${autoY + iconOffsetY}) translate(128 128) scale(${iconScale}) translate(-128 -128)`;
}

export function radii(v: SuitIconDefaults) {
  if (v.ringCount <= 0 || v.ringMode === 'none') {
    return [];
  }
  if (v.ringFit === 'viewport') {
    const start = Math.max(0, v.ringStart);
    const max = 128 + v.ringOuterPadding;
    const step = v.ringCount === 1 ? 0 : (max - start) / (v.ringCount - 1);
    return Array.from({ length: v.ringCount }, (_, i) => (start + step * i) * v.ringScale);
  }
  if (v.ringFit === 'aroundIcon') {
    const start = iconBounds[v.suit].outerRadius + v.ringStart;
    const max = 128 + v.ringOuterPadding;
    const step = v.ringCount === 1 ? 0 : (max - start) / (v.ringCount - 1);
    return Array.from({ length: v.ringCount }, (_, i) => (start + step * i) * v.ringScale);
  }
  return Array.from({ length: v.ringCount }, (_, i) => (v.ringStart + v.ringGap * i) * v.ringScale);
}

function escapeSvgText(value: string | number | boolean): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function svgDataUrl(markup: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markup)}`;
}

function iconDefsMarkup(id: string, v: SuitIconDefaults): string {
  return [
    `<radialGradient id="${id}-bg" cx="50%" cy="46%" r="64%"><stop offset="0%" stop-color="#111111"/><stop offset="68%" stop-color="${escapeSvgText(v.bgColor)}"/><stop offset="100%" stop-color="#000000"/></radialGradient>`,
    `<linearGradient id="${id}-red" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff2a2a"/><stop offset="46%" stop-color="${escapeSvgText(v.redFill)}"/><stop offset="100%" stop-color="#790000"/></linearGradient>`,
    `<linearGradient id="${id}-black" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#151515"/><stop offset="44%" stop-color="${escapeSvgText(v.blackFill)}"/><stop offset="100%" stop-color="#000000"/></linearGradient>`,
    `<filter id="${id}-shadow" x="-35%" y="-35%" width="170%" height="170%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity="0.85"/></filter>`,
    `<filter id="${id}-red-glow" x="-35%" y="-35%" width="170%" height="170%"><feDropShadow dx="0" dy="0" stdDeviation="2.2" flood-color="#ff0000" flood-opacity="0.9"/><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.75"/></filter>`,
    `<filter id="${id}-gray-glow" x="-35%" y="-35%" width="170%" height="170%"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#777" flood-opacity="0.45"/><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity="0.85"/></filter>`,
    `<clipPath id="${id}-suit-clip"><path d="${suitPaths[v.suit]}"/></clipPath>`,
  ].join('');
}

function ringLayerMarkup(v: SuitIconDefaults): string {
  if (!v.showRings || v.ringMode === 'none') {
    return '';
  }
  const circles = radii(v)
    .map((r) => `<circle cx="128" cy="128" r="${r}"/>`)
    .join('');
  return `<g data-layer="rings" fill="none" stroke="${escapeSvgText(v.ringColor)}" stroke-width="${v.ringStroke}" opacity="${v.ringOpacity}">${circles}</g>`;
}

function suitLayerMarkup(id: string, v: SuitIconDefaults): string {
  if (!v.showIcon) {
    return '';
  }
  const red = isRedSuit(v.suit);
  const hollow = v.variant === 'hollow';
  const transform = iconTransform(v.suit, v.autoCenterIcon, v.iconOffsetX, v.iconOffsetY, v.iconScale);
  const groupFilter = v.shadowGlow ? ` filter="url(#${id}-shadow)"` : '';
  const glow = red ? `url(#${id}-red-glow)` : `url(#${id}-gray-glow)`;

  if (hollow) {
    const stripeLayer = v.showHollowStripes
      ? `<g clip-path="url(#${id}-suit-clip)" opacity="${v.hollowStripeOpacity}">${Array.from({ length: 40 }, (_, i) => `<rect x="${18 + i * 6}" y="28" width="2.4" height="210" fill="${red ? '#9b0000' : '#222'}"/>`).join('')}</g>`
      : '';
    const outerFilter = v.shadowGlow ? ` filter="${glow}"` : '';
    return `<g data-layer="main-icon" transform="${escapeSvgText(transform)}"${groupFilter}><path d="${suitPaths[v.suit]}" fill="none" stroke="${red ? '#ff1717' : escapeSvgText(v.outlineColor)}" stroke-width="${red ? v.outlineWidth * 4.4 : v.outlineWidth * 3.7}" stroke-linejoin="round" stroke-linecap="round" opacity="${v.hollowOuterOpacity}"${outerFilter}/><path d="${suitPaths[v.suit]}" fill="none" stroke="#050505" stroke-width="${Math.max(2, v.outlineWidth * 2.15)}" stroke-linejoin="round" stroke-linecap="round" opacity="${v.hollowCutoutOpacity}"/><path d="${suitPaths[v.suit]}" fill="none" stroke="${red ? '#ff3030' : '#777777'}" stroke-width="${Math.max(1, v.outlineWidth * 0.75)}" stroke-linejoin="round" stroke-linecap="round" opacity="${v.hollowInnerOpacity}"/>${stripeLayer}</g>`;
  }

  const pathFilter = v.shadowGlow ? ` filter="${glow}"` : '';
  return `<g data-layer="main-icon" transform="${escapeSvgText(transform)}"${groupFilter}><path d="${suitPaths[v.suit]}" fill="${red ? `url(#${id}-red)` : `url(#${id}-black)`}" stroke="${red ? '#5f5f5f' : escapeSvgText(v.outlineColor)}" stroke-width="${v.outlineWidth}" stroke-linejoin="round" stroke-linecap="round"${pathFilter}/><path d="${suitPaths[v.suit]}" fill="none" stroke="${red ? '#ff4545' : '#1f1f1f'}" stroke-width="1.1" stroke-linejoin="round" opacity="0.85" transform="translate(-1 -1)"/></g>`;
}

function artworkMarkup(id: string, v: SuitIconDefaults): string {
  const background = v.showBackground ? `<rect x="0" y="0" width="256" height="256" fill="url(#${id}-bg)"/>` : '';
  return `${background}${ringLayerMarkup(v)}${suitLayerMarkup(id, v)}`;
}

export function getSuitIconSvgMarkup(
  suit: Suit,
  variant: Variant = ICON_DEFAULTS.variant,
  overrides: Partial<SuitIconDefaults> = {}
): string {
  const v: SuitIconDefaults = {
    ...ICON_DEFAULTS,
    suit,
    variant,
    ...overrides,
  };
  const id = `ocentra-suit-${v.suit}-${v.variant}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${v.size}" height="${v.size}" viewBox="0 0 256 256" role="img" aria-label="${escapeSvgText(`${v.suit} ${v.variant}`)}" preserveAspectRatio="xMidYMid meet"><defs>${iconDefsMarkup(id, v)}</defs>${artworkMarkup(id, v)}</svg>`;
}

export function getSuitIconDataUrl(
  suit: Suit,
  variant: Variant = ICON_DEFAULTS.variant,
  overrides: Partial<SuitIconDefaults> = {}
): string {
  return svgDataUrl(getSuitIconSvgMarkup(suit, variant, overrides));
}

export function getSuitCardSvgMarkup(
  suit: Suit,
  variant: Variant = ICON_DEFAULTS.variant,
  iconOverrides: Partial<SuitIconDefaults> = {},
  cardOverrides: Partial<SuitCardDefaults> = {}
): string {
  const v: SuitIconDefaults & SuitCardDefaults = {
    ...ICON_DEFAULTS,
    ...CARD_DEFAULTS,
    suit,
    variant,
    ...iconOverrides,
    ...cardOverrides,
  };
  const id = `ocentra-card-${v.suit}-${v.variant}`;
  const red = isRedSuit(v.suit);
  const viewW = v.cardWidth;
  const viewH = v.cardHeight;
  const sx = viewW / CARD_DESIGN_WIDTH;
  const sy = viewH / CARD_DESIGN_HEIGHT;
  const uniformScale = Math.min(sx, sy);
  const mainX = v.mainIconX * sx;
  const mainY = v.mainIconY * sy;
  const baseTopX = v.useCornerInsetLayout ? v.cornerInsetX : v.topCornerX;
  const baseTopY = v.useCornerInsetLayout ? v.cornerInsetY : v.topCornerY;
  const baseBottomX = v.useCornerInsetLayout ? CARD_DESIGN_WIDTH - v.cornerInsetX : v.bottomCornerX;
  const baseBottomY = v.useCornerInsetLayout ? CARD_DESIGN_HEIGHT - v.cornerInsetY : v.bottomCornerY;
  const topX = baseTopX * sx;
  const topY = baseTopY * sy;
  const bottomX = baseBottomX * sx;
  const bottomY = baseBottomY * sy;
  const scaledMainIconSize = v.mainIconSize * uniformScale;
  const scaledCornerIconSize = v.cornerIconSize * uniformScale;
  const mainIcon: SuitIconDefaults = { ...v, size: 256, showBackground: false, showBounds: false };
  const cornerIcon: SuitIconDefaults = { ...mainIcon, ringCount: 22, ringOuterPadding: 10, ringScale: 0.78, ringOpacity: 0.18, ringStroke: 0.8, showHollowStripes: false, iconOffsetX: 0, iconOffsetY: 0, iconScale: 1, autoCenterIcon: true };
  const corner = (x: number, y: number, flip = false) => `<g transform="translate(${x} ${y}) ${flip ? 'rotate(180)' : ''} scale(${scaledCornerIconSize / 256}) translate(-128 -128)">${artworkMarkup(id, cornerIcon)}</g>`;
  const pattern = v.showCardPattern
    ? `<g opacity="${v.cardPatternOpacity}"><g transform="scale(${sx} ${sy})"><path d="M20 30 L136 88 L35 210 Z" fill="url(#${id}-slash)"/><path d="M120 12 L152 12 L152 238 L98 238 Z" fill="#151515" opacity="0.65"/></g></g>`
    : '';
  const frame = v.showCardFrame
    ? `<rect x="2" y="2" width="${viewW - 4}" height="${viewH - 4}" rx="${v.cardRadius + 2}" fill="none" stroke="${escapeSvgText(v.cardStroke)}" stroke-width="${v.cardStrokeWidth}"/><rect x="${v.cardPadding}" y="${v.cardPadding}" width="${viewW - v.cardPadding * 2}" height="${viewH - v.cardPadding * 2}" rx="${v.cardRadius}" fill="${v.cardFillTransparent ? 'none' : `url(#${id}-card)`}" fill-opacity="${v.cardFillTransparent ? 0 : v.cardFillOpacity}" stroke="${escapeSvgText(v.cardInnerStroke)}" stroke-width="${v.cardInnerStrokeWidth}"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}" role="img" aria-label="${escapeSvgText(`${v.suit} card`)}" preserveAspectRatio="xMidYMid meet"><defs>${iconDefsMarkup(id, v)}<linearGradient id="${id}-card" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#090909"/><stop offset="52%" stop-color="${escapeSvgText(v.cardFill)}"/><stop offset="100%" stop-color="#000000"/></linearGradient><linearGradient id="${id}-slash" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${red ? '#003636' : '#2b2b2b'}" stop-opacity="0.9"/><stop offset="55%" stop-color="#111" stop-opacity="0.2"/><stop offset="100%" stop-color="${red ? '#031f1f' : '#1c1c1c'}" stop-opacity="0.8"/></linearGradient><clipPath id="${id}-card-clip"><rect x="${v.cardPadding}" y="${v.cardPadding}" width="${viewW - v.cardPadding * 2}" height="${viewH - v.cardPadding * 2}" rx="${v.cardRadius}"/></clipPath></defs>${frame}<g clip-path="url(#${id}-card-clip)">${pattern}${corner(topX, topY)}${corner(bottomX, bottomY, true)}<g transform="translate(${mainX} ${mainY}) scale(${scaledMainIconSize / 256}) translate(-128 -128)">${artworkMarkup(id, mainIcon)}</g></g></svg>`;
}

export function getSuitCardDataUrl(
  suit: Suit,
  variant: Variant = ICON_DEFAULTS.variant,
  iconOverrides: Partial<SuitIconDefaults> = {},
  cardOverrides: Partial<SuitCardDefaults> = {}
): string {
  return svgDataUrl(getSuitCardSvgMarkup(suit, variant, iconOverrides, cardOverrides));
}
