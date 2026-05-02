import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS,
  resolveHomeShowcaseFrameControlsForVariant,
  type HomeShowcaseFrameControls,
  type HomeShowcaseFrameProps,
  type HomeShowcaseFrameSlot,
} from './HomeShowcaseFrame.types';
import './HomeShowcaseFrame.css';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mergeControls(value?: HomeShowcaseFrameControls): HomeShowcaseFrameControls {
  if (!value) return DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS;
  return {
    overall: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.overall, ...value.overall },
    body: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.body, ...value.body },
    sideA: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.sideA, ...value.sideA },
    sideB: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.sideB, ...value.sideB },
    copy: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.copy, ...value.copy },
    footer: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.footer, ...value.footer },
    colors: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.colors, ...value.colors },
    variants: value.variants,
  };
}

function roundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  return `M${x + r} ${y} H${x + width - r} Q${x + width} ${y} ${x + width} ${y + r} V${y + height - r} Q${x + width} ${y + height} ${x + width - r} ${y + height} H${x + r} Q${x} ${y + height} ${x} ${y + height - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
}

type CornerRadii = {
  tl: number;
  tr: number;
  br: number;
  bl: number;
};

function roundedRectPathByCorners(
  x: number,
  y: number,
  width: number,
  height: number,
  radii: CornerRadii,
): string {
  const maxR = Math.max(0, Math.min(width / 2, height / 2));
  const tl = clamp(radii.tl, 0, maxR);
  const tr = clamp(radii.tr, 0, maxR);
  const br = clamp(radii.br, 0, maxR);
  const bl = clamp(radii.bl, 0, maxR);

  return [
    `M${x + tl} ${y}`,
    `H${x + width - tr}`,
    tr > 0 ? `Q${x + width} ${y} ${x + width} ${y + tr}` : `L${x + width} ${y}`,
    `V${y + height - br}`,
    br > 0 ? `Q${x + width} ${y + height} ${x + width - br} ${y + height}` : `L${x + width} ${y + height}`,
    `H${x + bl}`,
    bl > 0 ? `Q${x} ${y + height} ${x} ${y + height - bl}` : `L${x} ${y + height}`,
    `V${y + tl}`,
    tl > 0 ? `Q${x} ${y} ${x + tl} ${y}` : `L${x} ${y}`,
    'Z',
  ].join(' ');
}

function renderSlotContent(
  content: ReactNode | ((slot: HomeShowcaseFrameSlot) => ReactNode),
  slot: HomeShowcaseFrameSlot,
): ReactNode {
  return typeof content === 'function'
    ? (content as (slot: HomeShowcaseFrameSlot) => ReactNode)(slot)
    : content;
}

export function HomeShowcaseFrame({
  controls,
  sideA,
  sideB,
  footer,
  className,
  style,
  allowDebugBounds = false,
  previewLayoutMode = 'auto',
}: HomeShowcaseFrameProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState(DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.overall.viewWidth);
  const mergedControls = useMemo(() => mergeControls(controls), [controls]);
  const c = useMemo(
    () => resolveHomeShowcaseFrameControlsForVariant(
      mergedControls,
      previewLayoutMode === 'narrow' ? 'narrow' : 'wide',
    ),
    [mergedControls, previewLayoutMode],
  );
  const vw = c.overall.viewWidth;
  const stageX = c.overall.stageInsetX;
  const stageY = c.overall.stageY;
  const stageW = vw - c.overall.stageInsetX * 2;
  const bodyX = stageX + c.body.insetX;
  const bodyW = stageW - c.body.insetX * 2;
  const measuredScale = Math.min(1, Math.max(1, measuredWidth) / vw);
  const canvasInsetX = c.overall.canvasInsetX * measuredScale;
  const measuredContentWidth = measuredWidth - canvasInsetX * 2;
  const renderScale = Math.min(1, Math.max(1, measuredContentWidth) / vw);
  const autoNarrow =
    bodyW * c.body.splitRatio * renderScale < c.body.minAWidth ||
    bodyW * (1 - c.body.splitRatio) * renderScale < c.body.minBWidth;
  const breakpointNarrow =
    c.overall.narrowBreakpoint > 0 && measuredContentWidth <= c.overall.narrowBreakpoint;
  const isNarrow = previewLayoutMode === 'narrow' || (previewLayoutMode === 'auto' && (breakpointNarrow || autoNarrow));
  const vh = isNarrow ? c.overall.narrowHeight : c.overall.wideHeight;
  const stageH = isNarrow ? c.overall.stageNarrowH : c.overall.stageWideH;
  const marginTop = isNarrow ? c.overall.narrowMarginTop : c.overall.marginTop;
  const marginBottom = isNarrow ? c.overall.narrowMarginBottom : c.overall.marginBottom;
  const footerH = c.footer.height;
  const bodyY = stageY + c.body.topGap;
  const bodyH = stageH - c.body.topGap - c.body.bottomGap - footerH;
  const leftW = isNarrow ? bodyW : Math.round(bodyW * clamp(c.body.splitRatio, 0.1, 0.9));
  const rightW = isNarrow ? bodyW : bodyW - leftW;
  const topH = isNarrow ? Math.round(bodyH * clamp(c.body.narrowAHeightRatio, 0.15, 0.9)) : bodyH;
  const splitX = bodyX + leftW;
  const splitY = bodyY + topH;
  const rightX = isNarrow ? bodyX : splitX;
  const rightY = isNarrow ? splitY : bodyY;
  const rightH = isNarrow ? bodyH - topH : bodyH;
  const footerY = stageY + stageH - footerH;
  const debugBounds = allowDebugBounds && c.overall.debugBounds;
  const stagePath = roundedRectPath(stageX, stageY, stageW, stageH, c.overall.stageRadius);
  const bodyRadii: CornerRadii = {
    tl: c.body.radiusTopLeft,
    tr: c.body.radiusTopRight,
    br: c.body.radiusBottomRight,
    bl: c.body.radiusBottomLeft,
  };
  const bodyPath = roundedRectPathByCorners(bodyX, bodyY, bodyW, bodyH, bodyRadii);
  const sideBRadii: CornerRadii = isNarrow
    ? {
        tl: 0,
        tr: 0,
        br: c.body.radiusBottomRight,
        bl: c.body.radiusBottomLeft,
      }
    : {
        tl: 0,
        tr: c.body.radiusTopRight,
        br: c.body.radiusBottomRight,
        bl: 0,
      };
  const sideBPath = roundedRectPathByCorners(rightX, rightY, rightW, rightH, sideBRadii);
  const footerLineInset = Math.max(0, Math.min(c.footer.lineInsetX, bodyW / 2));

  const aSlot: HomeShowcaseFrameSlot = {
    x: bodyX + c.sideA.padX,
    y: bodyY + c.sideA.padY,
    width: Math.max(0, leftW - c.sideA.padX * 2),
    height: Math.max(0, topH - c.sideA.padY * 2),
    isNarrow,
  };
  const bSlot: HomeShowcaseFrameSlot = {
    x: rightX + c.sideB.padX,
    y: rightY + c.sideB.padY,
    width: Math.max(0, rightW - c.sideB.padX * 2),
    height: Math.max(0, rightH - c.sideB.padY * 2),
    isNarrow,
  };
  const footerSlot: HomeShowcaseFrameSlot = {
    x: bodyX + c.footer.insetX,
    y: footerY,
    width: Math.max(0, bodyW - c.footer.insetX * 2),
    height: footerH,
    isNarrow,
  };

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;
    const updateWidth = () => setMeasuredWidth(node.getBoundingClientRect().width || vw);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, [vw]);

  return (
    <div
      ref={wrapperRef}
      className={`home-showcase-frame${className ? ` ${className}` : ''}`}
      style={{
        ...style,
        marginTop,
        marginBottom,
        marginLeft: c.overall.parentBleedX ? -c.overall.parentBleedX : undefined,
        marginRight: c.overall.parentBleedX ? -c.overall.parentBleedX : undefined,
      }}
    >
      <div
        className="home-showcase-frame__canvas"
        style={{ paddingLeft: canvasInsetX, paddingRight: canvasInsetX }}
      >
        <div className="home-showcase-frame__stage">
          <svg
            className="home-showcase-frame__svg"
            viewBox={`0 0 ${vw} ${vh}`}
            width="100%"
            preserveAspectRatio="xMidYMin meet"
          >
            <defs>
              <filter id="homeShowcaseFrameShadow" x="-20%" y="-30%" width="140%" height="160%">
                <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#000" floodOpacity="0.72" />
              </filter>
            </defs>
            <g filter="url(#homeShowcaseFrameShadow)">
              <path d={stagePath} fill={c.colors.stageFill} stroke={c.colors.stageStroke} strokeWidth="2" strokeOpacity="0.9" />
              <path d={bodyPath} fill="none" stroke={c.colors.bodyStroke} strokeWidth={c.body.outlineWidth} />
              <path d={sideBPath} fill={c.colors.sideBFill} opacity="0.76" />
              {isNarrow ? (
                <line x1={bodyX} y1={splitY} x2={bodyX + bodyW} y2={splitY} stroke={c.colors.bodyStroke} strokeWidth={c.body.outlineWidth} />
              ) : (
                <line x1={splitX} y1={bodyY} x2={splitX} y2={bodyY + bodyH} stroke={c.colors.bodyStroke} strokeWidth={c.body.outlineWidth} />
              )}
              {c.footer.showLine ? (
                <line
                  x1={bodyX + footerLineInset}
                  y1={footerY}
                  x2={bodyX + bodyW - footerLineInset}
                  y2={footerY}
                  stroke={c.colors.bodyStroke}
                  strokeWidth={c.footer.lineWidth}
                  strokeOpacity={c.footer.lineOpacity}
                />
              ) : null}
              {debugBounds && (
                <g pointerEvents="none">
                  <rect x={stageX} y={stageY} width={stageW} height={stageH} rx={c.overall.stageRadius} fill="none" stroke={c.colors.debugStage} strokeWidth="2.5" strokeDasharray="12 7" />
                  <path d={bodyPath} fill="none" stroke={c.colors.debugBody} strokeWidth="2.5" strokeDasharray="12 7" />
                  <rect x={bodyX} y={bodyY} width={leftW} height={topH} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="10 6" />
                  <rect x={rightX} y={rightY} width={rightW} height={rightH} fill="none" stroke="#c084fc" strokeWidth="2.5" strokeDasharray="10 6" />
                  <line x1={0} y1={footerY} x2={vw} y2={footerY} stroke="#38bdf8" strokeWidth="2" strokeDasharray="10 8" />
                </g>
              )}
            </g>
          </svg>
          <div className="home-showcase-frame__slots" style={{ aspectRatio: `${vw} / ${vh}` }}>
          <div
            className="home-showcase-frame__slot home-showcase-frame__slot-a"
            style={{
              left: `${((aSlot.x + c.sideA.contentOffsetX) / vw) * 100}%`,
              top: `${((aSlot.y + c.sideA.contentOffsetY) / vh) * 100}%`,
              width: `${(aSlot.width / vw) * 100}%`,
              height: `${(aSlot.height / vh) * 100}%`,
              overflow: c.sideA.overflowVisible ? 'visible' : undefined,
              transform: `scale(${c.sideA.contentScale})`,
              transformOrigin: 'center center',
              zIndex: c.sideA.contentZIndex,
            }}
          >
            {renderSlotContent(sideA, aSlot)}
          </div>
          <div
            className="home-showcase-frame__slot home-showcase-frame__slot-b"
            style={{
              left: `${((bSlot.x + c.sideB.contentOffsetX) / vw) * 100}%`,
              top: `${((bSlot.y + c.sideB.contentOffsetY) / vh) * 100}%`,
              width: `${(bSlot.width / vw) * 100}%`,
              height: `${(bSlot.height / vh) * 100}%`,
              overflow: c.sideB.overflowVisible ? 'visible' : undefined,
              transform: `scale(${c.sideB.contentScale})`,
              transformOrigin: 'center center',
              zIndex: c.sideB.contentZIndex,
            }}
          >
            {renderSlotContent(sideB, bSlot)}
          </div>
          {footer && (
            <div
              className="home-showcase-frame__slot home-showcase-frame__slot-footer"
              style={{
                left: `${(footerSlot.x / vw) * 100}%`,
                top: `${(footerSlot.y / vh) * 100}%`,
                width: `${(footerSlot.width / vw) * 100}%`,
                height: `${(footerSlot.height / vh) * 100}%`,
              }}
            >
              {renderSlotContent(footer, footerSlot)}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
