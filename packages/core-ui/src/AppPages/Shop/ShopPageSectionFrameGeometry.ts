import type { ShopPageSvgControls } from './ShopPageSvgSurfaceControls';

export function carouselHandleInsideReserve(cfg: ShopPageSvgControls): number {
  const token = cfg.componentTokens.sectionFrame;
  return Math.max(0, token.handleW - token.handleOutset);
}

export function sectionFrameContentInset(cfg: ShopPageSvgControls, showCarouselChrome: boolean): number {
  return cfg.componentTokens.sectionFrame.contentXInset + (showCarouselChrome ? carouselHandleInsideReserve(cfg) : 0);
}

export function sectionFrameHeaderHeight(cfg: ShopPageSvgControls, showCarouselChrome: boolean, showSubtitle: boolean): number {
  const token = cfg.componentTokens.sectionFrame;
  if (showCarouselChrome) return cfg.mainBody.headerH;
  if (!showSubtitle) return Math.max(cfg.mainBody.headerH, token.tabTop + token.tabH + token.contentTopPad + 8);
  return Math.max(cfg.mainBody.headerH, token.subtitleY + token.subtitleLineHeight / 2 + token.contentTopPad + 12);
}

export function sectionFrameContentRect(
  x: number,
  y: number,
  w: number,
  h: number,
  cfg: ShopPageSvgControls,
  showCarouselChrome: boolean,
  showSubtitle = !showCarouselChrome,
): { x: number; y: number; w: number; h: number } {
  const token = cfg.componentTokens.sectionFrame;
  const inset = sectionFrameContentInset(cfg, showCarouselChrome);
  const headerH = sectionFrameHeaderHeight(cfg, showCarouselChrome, showSubtitle);
  return {
    x: x + inset,
    y: y + headerH + token.contentTopPad,
    w: Math.max(0, w - inset * 2),
    h: Math.max(0, h - headerH - (showCarouselChrome ? token.footerReserve + token.contentBottomPad : token.contentBottomPad + 12)),
  };
}

export function sectionFrameRowBounds(
  x: number,
  w: number,
  cfg: ShopPageSvgControls,
  fillFrame: boolean,
): { x: number; w: number } {
  const rowPad = fillFrame ? cfg.mainBody.bottomRowInnerPad : cfg.mainBody.topRowInnerPad;
  const inset = sectionFrameContentInset(cfg, true) + rowPad;
  return {
    x: x + inset,
    w: Math.max(0, w - inset * 2),
  };
}

export function mainSlotFrameBounds(
  x: number,
  w: number,
  cfg: ShopPageSvgControls,
  slot: 'top' | 'bottom',
): { x: number; w: number } {
  const inset = slot === 'top' ? cfg.mainBody.topFrameXInset : cfg.mainBody.bottomFrameXInset;
  return {
    x: x + inset,
    w: Math.max(0, w - inset * 2),
  };
}

export function mainBottomOverlayContentRect(
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } {
  const stageX = 18;
  const lineY = 44;
  const bodyInsetX = 10;
  const bodyY = lineY + 7;
  const footerY = h - 20;
  return {
    x: x + stageX + bodyInsetX,
    y: y + bodyY,
    w: Math.max(0, w - stageX * 2 - bodyInsetX * 2),
    h: Math.max(0, footerY - 5 - bodyY),
  };
}
