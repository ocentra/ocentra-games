import type { ShopPageSvgControls } from './ShopPageSvgSurfaceControls';
import type { ShopTone } from './ShopPageSvgData';

export function toneColor(tone: ShopTone, cfg: ShopPageSvgControls): string {
  if (tone === 'gold') return cfg.colors.gold;
  if (tone === 'violet') return cfg.colors.violet;
  if (tone === 'green') return cfg.colors.green;
  if (tone === 'orange') return cfg.colors.orange;
  if (tone === 'silver') return cfg.colors.silver;
  if (tone === 'danger') return cfg.colors.danger;
  return cfg.colors.activeBlue;
}

export function topRoundedRectPath(x: number, y: number, w: number, h: number, r = 10): string {
  return `M ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h} H ${x} Z`;
}

export function bottomRoundedRectPath(x: number, y: number, w: number, h: number, r = 10): string {
  return `M ${x} ${y} H ${x + w} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} Z`;
}
