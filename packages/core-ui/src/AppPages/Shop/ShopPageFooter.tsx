import type { ShopIcon, ShopTone } from './ShopPageSvgData';
import type { ShopPageContentData } from './ShopPageSvgContent';
import { bottomRoundedRectPath } from './ShopPageSvgGeometry';
import { MiniIcon, Txt } from './ShopPageSvgPrimitives';
import type { ShopPageSvgControls } from './ShopPageSvgSurfaceControls';

export function FooterLayer({ x, y, w, h, content, cfg }: { x: number; y: number; w: number; h: number; content: ShopPageContentData; cfg: ShopPageSvgControls }) {
  const token = cfg.componentTokens.footerLayer;
  const columns = content.uiCopy.footer.slice(0, Math.max(1, Math.min(content.uiCopy.footer.length, Math.round(cfg.footer.columns))));
  const colW = w / columns.length;
  return (
    <g>
      <path d={bottomRoundedRectPath(x, y, w, h, cfg.footer.radius)} fill={cfg.colors.footerFill} stroke={cfg.colors.panelStroke} strokeWidth={token.strokeWidth} />
      <line x1={x + token.topLineInset} y1={y + 1} x2={x + w - token.topLineInset} y2={y + 1} stroke={cfg.colors.edgeStroke} strokeOpacity={token.topLineOpacity} />
      {columns.map((item, index) => {
        const cx = x + index * colW;
        return (
          <g key={item.title}>
            <rect x={cx} y={y + 1} width={colW} height={h - 2} fill={cfg.colors.tableRowFillOdd} />
            {index > 0 ? <line x1={cx} y1={y + token.separatorPad} x2={cx} y2={y + h - token.separatorPad} stroke={cfg.colors.line} /> : null}
            <MiniIcon type={item.icon as ShopIcon} x={cx + cfg.footer.iconLeftPad} y={y + h / 2 - token.iconYPad} size={token.iconSize} tone={item.tone as ShopTone} cfg={cfg} />
            <Txt x={cx + colW / 2} y={y + h / 2 + token.titleY} size={cfg.footer.titleSize} weight="850" anchor="middle" cfg={cfg}>{item.title}</Txt>
            <Txt x={cx + colW / 2} y={y + h / 2 + token.subtitleY} size={cfg.footer.subtitleSize} fill={cfg.colors.mutedText} anchor="middle" cfg={cfg}>{item.sub}</Txt>
          </g>
        );
      })}
    </g>
  );
}
