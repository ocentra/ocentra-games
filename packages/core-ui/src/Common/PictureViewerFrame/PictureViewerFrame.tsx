import { useId, useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
  getPictureViewerAnchoredFrame,
  getPictureViewerBulgeArrowCenters,
  getPictureViewerFrameGroupTransform,
  getPictureViewerFrameTransform,
  normalizePictureViewerFrameControls,
  pictureViewerDarkenHex,
  pictureViewerFrameSegmentThickness,
  pictureViewerFrameSegments,
  type PictureViewerFrameControls,
  type PictureViewerFrameSegment,
  type PictureViewerFrameSurfaceControls,
  type PictureViewerNavArrowControls,
} from './PictureViewerFrameControls';

export type PictureViewerFrameProps = {
  controls?: Partial<PictureViewerFrameSurfaceControls> | null;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  previousLabel?: string;
  nextLabel?: string;
  onPrevious?: () => void;
  onNext?: () => void;
};

type FilledTriangleProps = {
  cx: number;
  cy: number;
  size: number;
  direction: 'up' | 'down';
  color: string;
  opacity: number;
  edgeWidth: number;
  glowOpacity: number;
  hoverScale: number;
  activeScale: number;
  label: string;
  filterId: string;
  onClick?: () => void;
};

function FilledTriangle({
  cx,
  cy,
  size,
  direction,
  color,
  opacity,
  edgeWidth,
  glowOpacity,
  hoverScale,
  activeScale,
  label,
  filterId,
  onClick,
}: FilledTriangleProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const half = size / 2;
  const points = direction === 'up'
    ? `${cx},${cy - half} ${cx - half},${cy + half} ${cx + half},${cy + half}`
    : `${cx},${cy + half} ${cx - half},${cy - half} ${cx + half},${cy - half}`;
  const scale = pressed ? activeScale : hovered ? hoverScale : 1;
  const edgeColor = pictureViewerDarkenHex(color, 0.35);
  const disabled = !onClick;
  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <g
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled}
      transform={`translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`}
      style={{ cursor: disabled ? 'default' : 'pointer', transition: 'transform 140ms ease, opacity 140ms ease' }}
      opacity={disabled ? 0.35 : 1}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      pointerEvents="auto"
    >
      <polygon points={points} fill={color} opacity={glowOpacity} filter={`url(#${filterId})`} />
      <polygon
        points={points}
        fill={color}
        opacity={hovered ? 1 : opacity}
        stroke={edgeColor}
        strokeWidth={edgeWidth}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function FrameNavArrows({
  frame,
  arrows,
  previousLabel,
  nextLabel,
  previousFilterId,
  nextFilterId,
  onPrevious,
  onNext,
}: {
  frame: PictureViewerFrameControls;
  arrows: PictureViewerNavArrowControls;
  previousLabel: string;
  nextLabel: string;
  previousFilterId: string;
  nextFilterId: string;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  if (!arrows.enabled) return null;
  const centers = getPictureViewerBulgeArrowCenters(frame, arrows);

  return (
    <g pointerEvents="auto">
      <FilledTriangle
        cx={centers.top.x}
        cy={centers.top.y}
        size={arrows.size}
        direction="up"
        color={frame.color}
        opacity={arrows.opacity}
        edgeWidth={arrows.edgeWidth}
        glowOpacity={arrows.glowOpacity}
        hoverScale={arrows.hoverScale}
        activeScale={arrows.activeScale}
        label={previousLabel}
        filterId={previousFilterId}
        onClick={onPrevious}
      />
      <FilledTriangle
        cx={centers.bottom.x}
        cy={centers.bottom.y}
        size={arrows.size}
        direction="down"
        color={frame.color}
        opacity={arrows.opacity}
        edgeWidth={arrows.edgeWidth}
        glowOpacity={arrows.glowOpacity}
        hoverScale={arrows.hoverScale}
        activeScale={arrows.activeScale}
        label={nextLabel}
        filterId={nextFilterId}
        onClick={onNext}
      />
    </g>
  );
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
  previousLabel = 'Previous image',
  nextLabel = 'Next image',
  onPrevious,
  onNext,
}: PictureViewerFrameProps) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const cfg = useMemo(() => normalizePictureViewerFrameControls(controls), [controls]);
  const outerFrame = useMemo(() => getPictureViewerAnchoredFrame(cfg, 'outerFrame', 'outerAnchor'), [cfg]);
  const innerFrame = useMemo(() => getPictureViewerAnchoredFrame(cfg, 'innerFrame', 'innerAnchor'), [cfg]);
  const outerSegments = useMemo(() => pictureViewerFrameSegments(outerFrame), [outerFrame]);
  const innerSegments = useMemo(() => pictureViewerFrameSegments(innerFrame), [innerFrame]);
  const outerGlowId = `pictureViewerOuterGlow-${rawId}`;
  const innerGlowId = `pictureViewerInnerGlow-${rawId}`;
  const previousFilterId = `pictureViewerPreviousArrowGlow-${rawId}`;
  const nextFilterId = `pictureViewerNextArrowGlow-${rawId}`;

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
        <filter id={previousFilterId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation={cfg.navArrows.glowBlur} />
        </filter>
        <filter id={nextFilterId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation={cfg.navArrows.glowBlur} />
        </filter>
      </defs>
      <g transform={getPictureViewerFrameGroupTransform(cfg)}>
        <g transform={getPictureViewerFrameTransform(cfg)}>
          <DrawFrame frame={outerFrame} segments={outerSegments} glowFilterId={outerGlowId} />
          <DrawFrame frame={innerFrame} segments={innerSegments} glowFilterId={innerGlowId} />
          <FrameNavArrows
            frame={outerFrame}
            arrows={cfg.navArrows}
            previousLabel={previousLabel}
            nextLabel={nextLabel}
            previousFilterId={previousFilterId}
            nextFilterId={nextFilterId}
            onPrevious={onPrevious}
            onNext={onNext}
          />
        </g>
      </g>
    </svg>
  );
}
