import type { ReactNode } from 'react';
import { roundedRectPath as lobbyRoundedRectPath } from '../Lobby/LobbyPageSvgGeometry';
import { Txt, WrappedText } from './ShopPageSvgPrimitives';
import { sectionFrameContentRect } from './ShopPageSectionFrameGeometry';
import type { ShopPageSvgControls } from './ShopPageSvgSurfaceControls';
import { alphaColor } from './ShopPageSvgUtils';

function CarouselSideHandle({
  x,
  y,
  side,
  label,
  active = true,
  cfg,
  onClick,
}: {
  x: number;
  y: number;
  side: 'left' | 'right';
  label: string;
  active?: boolean;
  cfg: ShopPageSvgControls;
  onClick: () => void;
}) {
  const token = cfg.componentTokens.sectionFrame;
  const isLeft = side === 'left';
  const bodyPath = isLeft
    ? lobbyRoundedRectPath(x, y, token.handleW, token.handleH, { tl: token.handleRadius, tr: 0, br: 0, bl: token.handleRadius })
    : lobbyRoundedRectPath(x, y, token.handleW, token.handleH, { tl: 0, tr: token.handleRadius, br: token.handleRadius, bl: 0 });
  const arrowY = y + token.handleH / 2;
  const arrowTipX = isLeft ? x + token.handleW * 0.38 : x + token.handleW * 0.62;
  const arrowBackX = isLeft ? x + token.handleW * 0.62 : x + token.handleW * 0.38;
  const arrowPath = `M ${arrowTipX} ${arrowY} L ${arrowBackX} ${arrowY - token.handleArrowHalfH} V ${arrowY + token.handleArrowHalfH} Z`;
  return (
    <g
      className={`lobby-ui-hit${active ? '' : ' is-disabled'}`}
      aria-disabled={!active}
      filter="url(#shopGlassGlow)"
      opacity={active ? 1 : 0.56}
    >
      <path d={bodyPath} fill={cfg.colors.frameHandleFill} stroke={cfg.colors.frameStroke} strokeWidth={token.handleOuterStrokeWidth} pointerEvents="none" />
      <path d={bodyPath} fill={cfg.colors.frameHandleGlassFill} stroke={cfg.colors.frameHandleGlassStroke} strokeWidth={token.handleGlassStrokeWidth} pointerEvents="none" />
      <path d={arrowPath} fill={cfg.colors.frameHandleArrow} pointerEvents="none" />
      <path d={bodyPath} fill="none" stroke={cfg.colors.frameHandleAccent} strokeWidth={token.handleAccentStrokeWidth} opacity={token.handleAccentOpacity} pointerEvents="none" />
      <rect
        x={x - token.handleHitPadX}
        y={y - token.handleHitPadY}
        width={token.handleW + token.handleHitPadX * 2}
        height={token.handleH + token.handleHitPadY * 2}
        fill={cfg.colors.frameHandleHitFill}
        className="shop-page-svg-clickable"
        aria-label={label}
        role="button"
        tabIndex={0}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!active) return;
          onClick();
        }}
        onKeyDown={(event) => {
          if (!active) return;
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          onClick();
        }}
      />
    </g>
  );
}

function SectionFrameActionButton({
  frameX,
  frameY,
  frameW,
  label,
  accent,
  cfg,
  onClick,
}: {
  frameX: number;
  frameY: number;
  frameW: number;
  label: string;
  accent: string;
  cfg: ShopPageSvgControls;
  onClick?: () => void;
}) {
  const token = cfg.componentTokens.sectionFrame;
  const buttonH = Math.max(26, Math.min(32, token.tabH * 0.62));
  const buttonW = Math.max(112, Math.min(240, label.length * token.rightTextSize * 0.62 + 42));
  const buttonX = frameX + frameW - token.rightTextPad - buttonW;
  const buttonY = frameY + token.tabTop + Math.max(0, (token.tabH - buttonH) / 2);
  return (
    <g onClick={onClick} role="button" tabIndex={0} className="shop-page-svg-clickable">
      <rect x={buttonX} y={buttonY} width={buttonW} height={buttonH} rx={6} fill={alphaColor(accent, 0.09)} stroke={accent} strokeWidth="1.05" strokeOpacity="0.62" />
      <rect x={buttonX + 1} y={buttonY + 1} width={buttonW - 2} height={Math.max(6, buttonH * 0.35)} rx={5} fill={cfg.colors.frameTitleHighlightFill} stroke="none" opacity="0.5" />
      <Txt x={buttonX + buttonW / 2} y={buttonY + buttonH / 2 + 0.5} anchor="middle" fill={cfg.colors.frameActionText} size={token.rightTextSize} weight={token.rightTextWeight} cfg={cfg}>{label}</Txt>
    </g>
  );
}

export function SectionFrame({
  x,
  y,
  w,
  h,
  title,
  subtitle,
  rightText,
  accent,
  children,
  cfg,
  countText,
  pageIndex = 0,
  pageCount = 1,
  onRightTextClick,
  onPrevious,
  onNext,
  hideSubtitle = false,
  hideTitleTab = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle: string;
  rightText?: string;
  accent: string;
  children: ReactNode;
  cfg: ShopPageSvgControls;
  countText?: string;
  pageIndex?: number;
  pageCount?: number;
  onRightTextClick?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hideSubtitle?: boolean;
  hideTitleTab?: boolean;
}) {
  const token = cfg.componentTokens.sectionFrame;
  const handleY = y + Math.max(0, (h - token.handleH) / 2);
  const showCarouselChrome = Boolean(countText);
  const showSubtitle = !showCarouselChrome && !hideSubtitle;
  const resolvedPageCount = Math.max(1, pageCount);
  const canPage = resolvedPageCount > 1;
  const tabY = y + token.tabTop;
  const countW = countText ? token.countTabW : 0;
  const countX = x + token.countTabX;
  const labelW = hideTitleTab ? 0 : Math.max(token.titleTabMinW, Math.min(token.titleTabMaxW, title.length * token.titleTabCharW + 58));
  const labelX = countX + countW + token.titleTabGap;
  const titleLineX = hideTitleTab ? x + token.headerLineRightPad : Math.min(x + w - 90, labelX + labelW + 16);
  const tabBottom = tabY + token.tabH;
  const contentRect = sectionFrameContentRect(x, y, w, h, cfg, showCarouselChrome, showSubtitle);
  const footerLineY = y + h - token.footerLineBottom;
  const safePageIndex = ((pageIndex % resolvedPageCount) + resolvedPageCount) % resolvedPageCount;
  const dotsW = Math.max(0, resolvedPageCount - 1) * token.dotGap + resolvedPageCount * token.dotW;
  const dotsX = x + w / 2 - dotsW / 2;
  return (
    <g>
      <g filter="url(#shopGlassGlow)">
        <path d={lobbyRoundedRectPath(x, y, w, h, token.radius)} fill="none" stroke={cfg.colors.frameStroke} strokeWidth={token.outerGlowStrokeWidth} opacity={token.outerGlowOpacity} filter="url(#shopSoftGlow)" />
        <path d={lobbyRoundedRectPath(x, y, w, h, token.radius)} fill={cfg.colors.frameFill} stroke={cfg.colors.frameStroke} strokeWidth={token.outerStrokeWidth} />
        <path d={lobbyRoundedRectPath(x + token.glassInset, y + token.glassInset, w - token.glassInset * 2, h - token.glassInset * 2, token.glassRadius)} fill={cfg.colors.frameGlassFill} stroke={cfg.colors.frameGlassStroke} strokeWidth={token.innerStrokeWidth} />
        <path d={lobbyRoundedRectPath(x + token.glassHighlightInset, y + token.glassHighlightInset, w - token.glassHighlightInset * 2, Math.min(token.glassHighlightH, h - token.glassHighlightInset * 2), token.glassRadius)} fill={cfg.colors.frameGlassHighlightFill} stroke="none" />
        <line x1={titleLineX} y1={y + token.headerLineY} x2={x + w - token.headerLineRightPad} y2={y + token.headerLineY} stroke={cfg.colors.frameRail} strokeWidth={token.headerLineStrokeWidth} opacity={token.headerLineOpacity} />
        {countText ? (
          <path d={`M ${countX} ${tabBottom} V ${tabY + token.tabRadius} Q ${countX} ${tabY} ${countX + token.tabRadius} ${tabY} H ${countX + countW - token.tabRadius} Q ${countX + countW} ${tabY} ${countX + countW} ${tabY + token.tabRadius} V ${tabBottom} Z`} fill={cfg.colors.frameCountFill} stroke={cfg.colors.frameCountStroke} strokeWidth={token.countTabStrokeWidth} />
        ) : null}
        {countText ? <Txt x={countX + countW / 2} y={tabY + token.tabH * token.countTextBaselineRatio} anchor="middle" size={token.countTextSize} weight={token.countTextWeight} cfg={cfg}>{countText}</Txt> : null}
        {!hideTitleTab ? (
          <>
            <path d={`M ${labelX} ${tabBottom} V ${tabY + token.tabRadius} Q ${labelX} ${tabY} ${labelX + token.tabRadius} ${tabY} H ${labelX + labelW - token.tabRadius} Q ${labelX + labelW} ${tabY} ${labelX + labelW} ${tabY + token.tabRadius} V ${tabBottom} Z`} fill={cfg.colors.frameTitleFill} stroke={cfg.colors.frameTitleStroke} strokeWidth={token.titleTabStrokeWidth} />
            <path d={`M ${labelX + token.titleHighlightInsetX} ${tabY + token.tabRadius + token.titleHighlightTopShift} H ${labelX + labelW - token.titleHighlightInsetX} V ${tabY + token.tabRadius + token.titleHighlightTopShift + token.titleHighlightH} H ${labelX + token.titleHighlightInsetX} Z`} fill={cfg.colors.frameTitleHighlightFill} stroke="none" />
            <Txt x={labelX + labelW / 2} y={tabY + token.tabH * token.titleTextBaselineRatio} anchor="middle" fill={cfg.colors.frameTitleText} size={token.titleTextSize} weight={token.titleTextWeight} cfg={cfg}>{title}</Txt>
          </>
        ) : null}
        {showSubtitle ? <WrappedText x={x + token.subtitleX} y={y + token.subtitleY} width={w - token.subtitleRightReserve} lines={subtitle} size={token.subtitleSize} lineHeight={token.subtitleLineHeight} fill={cfg.colors.frameSubtitleText} maxLines={token.subtitleMaxLines} cfg={cfg} /> : null}
        {rightText ? <SectionFrameActionButton frameX={x} frameY={y} frameW={w} label={rightText} accent={accent} cfg={cfg} onClick={onRightTextClick} /> : null}
        <rect x={contentRect.x} y={contentRect.y} width={contentRect.w} height={contentRect.h} rx={token.contentRadius} fill="none" stroke={accent} strokeWidth={token.contentStrokeWidth} opacity={token.contentStrokeOpacity} />
        {countText ? <line x1={x + token.footerLineInset} y1={footerLineY} x2={x + w - token.footerLineInset} y2={footerLineY} stroke={cfg.colors.frameRail} strokeWidth={token.footerLineStrokeWidth} opacity={token.footerLineOpacity} /> : null}
        {countText ? (
          <g>
            {Array.from({ length: resolvedPageCount }, (_, index) => (
              <rect
                key={index}
                x={dotsX + index * (token.dotW + token.dotGap)}
                y={y + h - token.dotBottom}
                width={token.dotW}
                height={token.dotH}
                rx={token.dotH / 2}
                fill={index === safePageIndex ? cfg.colors.frameDotActive : cfg.colors.frameDotInactive}
                opacity={index === safePageIndex ? 1 : 0.55}
              />
            ))}
          </g>
        ) : null}
      </g>
      {children}
      {showCarouselChrome ? <CarouselSideHandle x={x - token.handleOutset} y={handleY} side="left" label={`Previous ${title} items`} active={canPage} cfg={cfg} onClick={() => onPrevious?.()} /> : null}
      {showCarouselChrome ? <CarouselSideHandle x={x + w - token.handleW + token.handleOutset} y={handleY} side="right" label={`Next ${title} items`} active={canPage} cfg={cfg} onClick={() => onNext?.()} /> : null}
    </g>
  );
}
