import type { ShopPageSvgControls } from './ShopPageSvgSurfaceControls';

const MAX_BOTTOM_PREVIEW_ITEMS = 8;

export function previewCardWidth(cfg: ShopPageSvgControls): number {
  const availableH = cfg.layout.bottomPreviewH - cfg.bottomPreview.headerH - cfg.bottomPreview.bottomPad;
  return Math.max(88, Math.min(122, availableH * 1.14));
}

export function previewPanelWidthForCardCount(cardCount: number, cfg: ShopPageSvgControls): number {
  const itemCount = Math.max(1, Math.min(MAX_BOTTOM_PREVIEW_ITEMS, Math.round(cardCount)));
  return Math.max(
    260,
    cfg.bottomPreview.sidePad * 2 + itemCount * previewCardWidth(cfg) + Math.max(0, itemCount - 1) * cfg.bottomPreview.cardGap,
  );
}

export function maxBottomPreviewItems(): number {
  return MAX_BOTTOM_PREVIEW_ITEMS;
}
