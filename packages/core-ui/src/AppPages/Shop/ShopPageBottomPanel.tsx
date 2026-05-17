import { useState, type MouseEvent, type WheelEvent } from 'react';
import { HeaderBar, MiniIcon, Txt } from './ShopPageSvgPrimitives';
import { topRoundedRectPath } from './ShopPageSvgGeometry';
import type { ShopPageSvgControls } from './ShopPageSvgSurfaceControls';
import type { ShopTab } from './ShopPageSvgTypes';
import { TransparentAssetImage } from './ShopPageAssetArtwork';
import { maxBottomPreviewItems, previewCardWidth } from './ShopPageBottomPanelGeometry';

export type BottomPreviewTarget = ShopTab | 'Earn Free AC';

export type PreviewPanelItem = {
  key: string;
  label: string;
  imageUrl: string;
};

export type ResolvedPreviewRow = {
  title: string;
  subtitle: string;
  tab: BottomPreviewTarget;
  accent: string;
  previewItems: PreviewPanelItem[];
};

export type BottomPanelTrackRow = {
  row: ResolvedPreviewRow;
  width: number;
  x: number;
};

function PreviewPanel({
  x,
  y,
  w,
  h,
  row,
  cfg,
  onSelect,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  row: ResolvedPreviewRow;
  cfg: ShopPageSvgControls;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const token = cfg.componentTokens.bottomPreviewPanel;
  const previewItems = row.previewItems.length > 0
    ? row.previewItems
    : [{ key: `${row.title}-empty`, label: 'Coming Soon', imageUrl: '' }];
  const itemW = previewCardWidth(cfg);
  const itemH = h - cfg.bottomPreview.headerH - cfg.bottomPreview.bottomPad;
  const bodyX = x + cfg.bottomPreview.sidePad;
  const bodyY = y + cfg.bottomPreview.headerH + token.cardInset;
  const bodyW = w - cfg.bottomPreview.sidePad * 2;
  const bodyH = itemH - token.cardInset;
  const showLabels = row.tab !== 'Vault';
  const footerH = showLabels ? Math.min(token.overlayMaxH, Math.max(token.overlayMinH, bodyH * token.overlayRatio)) : 0;
  const artH = Math.max(34, showLabels ? bodyH - footerH : bodyH - token.cardInset);
  const labelBoxY = bodyH - footerH + token.labelBoxInsetY;
  const labelBoxH = Math.max(16, footerH - token.labelBoxInsetY * 2);
  const itemStep = itemW + cfg.bottomPreview.cardGap;
  const fittedItemCount = Math.max(1, Math.floor((bodyW + cfg.bottomPreview.cardGap) / itemStep));
  const visibleItemCount = Math.max(1, Math.min(maxBottomPreviewItems(), previewItems.length, fittedItemCount));
  const pageCount = Math.max(1, Math.ceil(previewItems.length / visibleItemCount));
  const safePageIndex = ((pageIndex % pageCount) + pageCount) % pageCount;
  const visibleItems = previewItems.slice(safePageIndex * visibleItemCount, safePageIndex * visibleItemCount + visibleItemCount);
  const rowContentW = Math.max(0, visibleItems.length * itemW + Math.max(0, visibleItems.length - 1) * cfg.bottomPreview.cardGap);
  const itemStartX = Math.max(0, (bodyW - rowContentW) / 2);
  const canPage = pageCount > 1;
  const arrowW = 18;
  const arrowH = Math.min(46, bodyH - 10);
  const arrowY = bodyY + bodyH / 2 - arrowH / 2;
  const turnPage = (delta: number) => {
    setPageIndex(value => {
      const nextValue = value + delta;
      return ((nextValue % pageCount) + pageCount) % pageCount;
    });
  };

  return (
    <g className={cfg.svgDefaults.cursorPointerClassName} onClick={onSelect} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {hovered ? <path d={topRoundedRectPath(x - token.hoverPad, y - token.hoverPad, w + token.hoverPad * 2, h + token.hoverPad * 2, token.radius)} fill="none" stroke={row.accent} strokeWidth={token.hoverStrokeWidth} opacity={token.hoverOpacity} filter="url(#shopSoftGlow)" /> : null}
      <path d={topRoundedRectPath(x, y, w, h, token.radius)} fill={hovered ? `${row.accent}12` : cfg.colors.panelFill} stroke={row.accent} strokeWidth={hovered ? token.hoverPanelStrokeWidth : token.panelStrokeWidth} />
      <HeaderBar x={x + token.cardInset} y={y + token.cardInset} w={w - token.cardInset * 2} h={cfg.bottomPreview.headerH} stroke={row.accent} cfg={cfg}>
        <MiniIcon type="crate" x={x + token.headerIconX} y={y + token.headerIconY} size={token.headerIconSize} tone="cyan" cfg={cfg} />
        <Txt x={x + token.titleX} y={y + token.titleY} size={token.titleSize} weight="950" cfg={cfg}>{row.title}</Txt>
        <Txt x={x + token.titleX} y={y + token.subtitleY} size={token.subtitleSize} fill={cfg.colors.mutedText} cfg={cfg}>{row.subtitle}</Txt>
        {canPage ? (
          <Txt x={x + w - 22} y={y + token.titleY} anchor="end" size={8.2} weight="950" fill={row.accent} cfg={cfg}>{safePageIndex + 1}/{pageCount}</Txt>
        ) : null}
      </HeaderBar>
      <svg x={bodyX} y={bodyY} width={bodyW} height={bodyH} overflow="hidden">
        <g className="shop-preview-item-track">
          {visibleItems.map((item, index) => {
            const itemX = itemStartX + index * itemStep;
            const labelBoxX = itemX + token.labelBoxInsetX;
            const labelBoxW = Math.max(20, itemW - token.labelBoxInsetX * 2);
            const labelTextW = Math.max(8, labelBoxW - token.labelInsetX * 2);
            const labelFontSize = Math.min(token.labelSize, Math.max(7.2, labelTextW / Math.max(8.5, item.label.length * 0.62)));
            const artX = itemX + token.cardInset;
            const artY = token.cardInset;
            const artW = itemW - token.cardInset * 2;
            const artBoxH = artH - token.cardInset;
            return (
              <g key={`${item.key}-${index}`}>
                <TransparentAssetImage x={artX} y={artY} w={artW} h={artBoxH} imageUrl={item.imageUrl} cfg={cfg} glow={hovered} />
                <rect x={artX} y={artY} width={artW} height={artBoxH} rx={token.cardRadius} fill="none" stroke={row.accent} strokeWidth={token.panelStrokeWidth} strokeOpacity={token.imageStrokeOpacity} />
                {showLabels ? (
                  <>
                    <rect x={labelBoxX} y={labelBoxY} width={labelBoxW} height={labelBoxH} rx={token.labelBoxRadius} fill="none" stroke={row.accent} strokeWidth={token.labelBoxGlowStrokeWidth} opacity={token.labelBoxGlowOpacity} filter="url(#shopSoftGlow)" />
                    <rect x={labelBoxX} y={labelBoxY} width={labelBoxW} height={labelBoxH} rx={token.labelBoxRadius} fill={cfg.colors.tileFooterFill} stroke={row.accent} strokeWidth={token.labelBoxStrokeWidth} strokeOpacity=".9" />
                    <Txt x={labelBoxX + labelBoxW / 2} y={labelBoxY + labelBoxH / 2 + 0.5} anchor="middle" size={labelFontSize} weight="900" fill={cfg.colors.bodyText} cfg={cfg}>{item.label}</Txt>
                  </>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
      {canPage ? (
        <>
          <g
            onClick={(event) => {
              event.stopPropagation();
              turnPage(-1);
            }}
          >
            <rect x={bodyX + 2} y={arrowY} width={arrowW} height={arrowH} rx="5" fill={cfg.colors.headerFill} stroke={row.accent} strokeOpacity=".72" />
            <path d={`M ${bodyX + 12} ${arrowY + arrowH / 2 - 8} L ${bodyX + 6} ${arrowY + arrowH / 2} L ${bodyX + 12} ${arrowY + arrowH / 2 + 8}`} fill="none" stroke={row.accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" filter="url(#shopSoftGlow)" />
          </g>
          <g
            onClick={(event) => {
              event.stopPropagation();
              turnPage(1);
            }}
          >
            <rect x={bodyX + bodyW - arrowW - 2} y={arrowY} width={arrowW} height={arrowH} rx="5" fill={cfg.colors.headerFill} stroke={row.accent} strokeOpacity=".72" />
            <path d={`M ${bodyX + bodyW - 12} ${arrowY + arrowH / 2 - 8} L ${bodyX + bodyW - 6} ${arrowY + arrowH / 2} L ${bodyX + bodyW - 12} ${arrowY + arrowH / 2 + 8}`} fill="none" stroke={row.accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" filter="url(#shopSoftGlow)" />
          </g>
        </>
      ) : null}
    </g>
  );
}

export function BottomPanel({
  y,
  h,
  cfg,
  trackRows,
  trackX,
  resetting,
  onSelect,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
}: {
  y: number;
  h: number;
  cfg: ShopPageSvgControls;
  trackRows: BottomPanelTrackRow[];
  trackX: number;
  resetting: boolean;
  onSelect: (row: ResolvedPreviewRow) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onMouseDown: (event: MouseEvent<SVGGElement>) => void;
  onMouseMove: (event: MouseEvent<SVGGElement>) => void;
  onMouseUp: () => void;
  onWheel: (event: WheelEvent<SVGGElement>) => void;
}) {
  return (
    <g
      clipPath="url(#shopPreviewTrackClip)"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
    >
      <g
        className="shop-preview-track"
        style={{
          transform: `translateX(${-trackX}px)`,
          transition: resetting ? 'none' : 'transform 980ms cubic-bezier(.16,1.18,.34,1)',
        }}
      >
        {trackRows.map(({ row, width, x: panelX }, index) => (
          <PreviewPanel key={`${row.title}-${index}`} x={panelX} y={y} w={width} h={h} row={row} cfg={cfg} onSelect={() => onSelect(row)} />
        ))}
      </g>
    </g>
  );
}
