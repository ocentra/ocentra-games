import { useId, useMemo, type CSSProperties, type ReactNode } from 'react';
import {
  getPictureViewerAnchoredFrame,
  getPictureViewerFrameGroupTransform,
  getPictureViewerFrameTransform,
  normalizePictureViewerFrameControls,
  pictureViewerDarkenHex,
  pictureViewerFrameSegmentThickness,
  pictureViewerFrameSegments,
  type PictureViewerFrameControls,
  type PictureViewerFrameSegment,
  type PictureViewerFrameSurfaceControls,
} from './PictureViewerFrameControls';

export type PictureViewerRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PictureViewerFrameLayout = {
  rawId: string;
  cfg: PictureViewerFrameSurfaceControls;
  viewerRect: PictureViewerRect;
  outerFrame: PictureViewerFrameControls;
  innerFrame: PictureViewerFrameControls;
};

export type PictureViewerFrameProps = {
  controls?: Partial<PictureViewerFrameSurfaceControls> | null;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  renderDefs?: (layout: PictureViewerFrameLayout) => ReactNode;
  renderInset?: (layout: PictureViewerFrameLayout) => ReactNode;
  renderForeground?: (layout: PictureViewerFrameLayout) => ReactNode;
};

function frameToViewerRect(
  cfg: PictureViewerFrameSurfaceControls,
  frame: PictureViewerFrameControls,
): PictureViewerRect {
  if (cfg.orientation !== 'portrait') return { x: frame.x, y: frame.y, w: frame.w, h: frame.h };
  return {
    x: cfg.viewBox.w - (frame.y + frame.h),
    y: frame.x,
    w: frame.h,
    h: frame.w,
  };
}

function DrawFrame({
  frame,
  segments,
  glowFilterId,
}: {
  frame: PictureViewerFrameControls;
  segments: PictureViewerFrameSegment[];
  glowFilterId: string;
}) {
  return (
    <g opacity={frame.opacity ?? 1} pointerEvents="none">
      {frame.glowEnabled ? (
        <g filter={`url(#${glowFilterId})`} opacity={frame.glowOpacity}>
          {segments.map(segment => (
            <path
              key={`glow-${segment.id}`}
              d={segment.d}
              fill="none"
              stroke={frame.glowColor}
              strokeWidth={pictureViewerFrameSegmentThickness(frame, segment) + frame.glowWidthBoost}
              strokeLinejoin="round"
              strokeLinecap={frame.lineCap}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      ) : null}
      {frame.outlineEnabled ? (
        <g opacity={frame.outlineOpacity}>
          {segments.map(segment => (
            <path
              key={`outline-${segment.id}`}
              d={segment.d}
              fill="none"
              stroke={pictureViewerDarkenHex(frame.color, 0.5)}
              strokeWidth={pictureViewerFrameSegmentThickness(frame, segment) + frame.outlineWidthBoost}
              strokeLinejoin="round"
              strokeLinecap={frame.lineCap}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      ) : null}
      {segments.map(segment => (
        <path
          key={segment.id}
          d={segment.d}
          fill="none"
          stroke={frame.color}
          strokeWidth={pictureViewerFrameSegmentThickness(frame, segment)}
          strokeLinejoin="round"
          strokeLinecap={frame.lineCap}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

export function PictureViewerFrame({
  controls,
  className,
  style,
  ariaLabel = 'Picture viewer frame',
  renderDefs,
  renderInset,
  renderForeground,
}: PictureViewerFrameProps) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const cfg = useMemo(() => normalizePictureViewerFrameControls(controls), [controls]);
  const outerFrame = useMemo(() => getPictureViewerAnchoredFrame(cfg, 'outerFrame', 'outerAnchor'), [cfg]);
  const innerFrame = useMemo(() => getPictureViewerAnchoredFrame(cfg, 'innerFrame', 'innerAnchor'), [cfg]);
  const outerSegments = useMemo(() => pictureViewerFrameSegments(outerFrame), [outerFrame]);
  const innerSegments = useMemo(() => pictureViewerFrameSegments(innerFrame), [innerFrame]);
  const viewerRect = useMemo(() => frameToViewerRect(cfg, innerFrame), [cfg, innerFrame]);
  const outerGlowId = `pictureViewerOuterGlow-${rawId}`;
  const innerGlowId = `pictureViewerInnerGlow-${rawId}`;
  const layout = useMemo<PictureViewerFrameLayout>(() => ({
    rawId,
    cfg,
    viewerRect,
    outerFrame,
    innerFrame,
  }), [cfg, innerFrame, outerFrame, rawId, viewerRect]);

  return (
    <svg
      className={className}
      style={style}
      viewBox={`0 0 ${cfg.viewBox.w} ${cfg.viewBox.h}`}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id={outerGlowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={outerFrame.glowBlur} />
        </filter>
        <filter id={innerGlowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={innerFrame.glowBlur} />
        </filter>
        {renderDefs?.(layout)}
      </defs>
      <g transform={getPictureViewerFrameGroupTransform(cfg)}>
        <rect x={viewerRect.x + 32} y={viewerRect.y + 66} width={viewerRect.w - 64} height={viewerRect.h - 128} rx="18" fill="rgba(0, 10, 24, 0.34)" pointerEvents="none" />
        {renderInset?.(layout)}
        <g transform={getPictureViewerFrameTransform(cfg)}>
          <DrawFrame frame={outerFrame} segments={outerSegments} glowFilterId={outerGlowId} />
          <DrawFrame frame={innerFrame} segments={innerSegments} glowFilterId={innerGlowId} />
        </g>
        {renderForeground?.(layout)}
      </g>
    </svg>
  );
}
