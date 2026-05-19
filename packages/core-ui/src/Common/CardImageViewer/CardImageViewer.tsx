import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import {
  PictureViewerFrame,
  type PictureViewerFrameLayout,
  type PictureViewerFrameProps,
  type PictureViewerRect,
} from '../PictureViewerFrame/PictureViewerFrame';
import { type PictureViewerNavArrowControls } from '../PictureViewerFrame/PictureViewerFrameControls';

export type CardImageViewerProps = Omit<PictureViewerFrameProps, 'renderDefs' | 'renderInset' | 'renderForeground'> & {
  imageSrc?: string | null;
  imageAlt?: string;
  imageFit?: 'contain' | 'cover';
  missingLabel?: string;
  caption?: string;
  counter?: string;
  previousLabel?: string;
  nextLabel?: string;
  closeLabel?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  onClose?: () => void;
  onImageError?: () => void;
};

type SideArrowButtonProps = {
  rect: PictureViewerRect;
  side: 'left' | 'right';
  arrows: PictureViewerNavArrowControls;
  label: string;
  filterId: string;
  onClick?: () => void;
};

type CloseButtonProps = {
  x: number;
  y: number;
  size: number;
  label: string;
  filterId: string;
  onClick?: () => void;
};

function fitSvgText(value: string, maxWidth: number, fontSize: number): string {
  const normalized = value.trim();
  const maxChars = Math.max(4, Math.floor(maxWidth / Math.max(1, fontSize * 0.56)));
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(1, maxChars - 1)).trimEnd()}...`;
}

function handleButtonKey(event: KeyboardEvent<SVGGElement>, onClick?: () => void) {
  if (!onClick) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  onClick();
}

function insetPictureViewerRect(rect: PictureViewerRect, insetX: number, insetTop: number, insetBottom: number): PictureViewerRect {
  return {
    x: rect.x + insetX,
    y: rect.y + insetTop,
    w: Math.max(1, rect.w - insetX * 2),
    h: Math.max(1, rect.h - insetTop - insetBottom),
  };
}

function cardViewerRects(layout: PictureViewerFrameLayout) {
  const viewerRect = layout.viewerRect;
  const closeSize = 80;
  const closeInset = 4;
  return {
    viewerRect,
    mediaRect: insetPictureViewerRect(viewerRect, 86, 150, 220),
    closeSize,
    closeX: layout.cfg.viewBox.w - closeSize - closeInset,
    closeY: closeInset,
    captionY: viewerRect.y + viewerRect.h - 138,
  };
}

function SideArrowButton({
  rect,
  side,
  arrows,
  label,
  filterId,
  onClick,
}: SideArrowButtonProps) {
  const [hovered, setHovered] = useState(false);
  const disabled = !onClick;
  const height = Math.max(150, arrows.size * 2.2);
  const width = Math.max(84, arrows.size * 1.08);
  const radius = Math.min(12, width / 2);
  const x = side === 'left' ? rect.x - width * 0.56 : rect.x + rect.w - width * 0.44;
  const y = rect.y + rect.h / 2 - height / 2;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const arrowHalfW = width * 0.16;
  const arrowHalfH = width * 0.26;
  const arrowPath = side === 'left'
    ? `M${cx + arrowHalfW} ${cy - arrowHalfH} L${cx - arrowHalfW} ${cy} L${cx + arrowHalfW} ${cy + arrowHalfH}`
    : `M${cx - arrowHalfW} ${cy - arrowHalfH} L${cx + arrowHalfW} ${cy} L${cx - arrowHalfW} ${cy + arrowHalfH}`;
  const outerPath = side === 'left'
    ? `M${x + radius} ${y} H${x + width} V${y + height} H${x + radius} Q${x} ${y + height} ${x} ${y + height - radius} V${y + radius} Q${x} ${y} ${x + radius} ${y} Z`
    : `M${x} ${y} H${x + width - radius} Q${x + width} ${y} ${x + width} ${y + radius} V${y + height - radius} Q${x + width} ${y + height} ${x + width - radius} ${y + height} H${x} Z`;
  const shinePath = side === 'left'
    ? `M${x + radius} ${y + 3} H${x + width - 3} V${y + height * 0.5} H${x + 3} V${y + radius} Q${x + 3} ${y + 3} ${x + radius} ${y + 3} Z`
    : `M${x + 3} ${y + 3} H${x + width - radius} Q${x + width - 3} ${y + 3} ${x + width - 3} ${y + radius} V${y + height * 0.5} H${x + 3} Z`;

  return (
    <g
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled}
      opacity={disabled ? 0.34 : 1}
      style={{ cursor: disabled ? 'default' : 'pointer' }}
      onClick={onClick}
      onKeyDown={event => handleButtonKey(event, onClick)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      pointerEvents="auto"
    >
      {hovered && !disabled ? (
        <path d={outerPath} fill="#23ff98" opacity="0.35" filter={`url(#${filterId})`} pointerEvents="none" />
      ) : null}
      <path d={outerPath} fill={hovered && !disabled ? '#0d5930' : 'rgba(6, 27, 48, 0.96)'} stroke={hovered && !disabled ? '#23ff98' : '#69caff'} strokeWidth={hovered && !disabled ? 4.4 : 3.2} strokeLinejoin="round" />
      <path d={shinePath} fill="#ffffff" opacity={hovered && !disabled ? 0.16 : 0.08} pointerEvents="none" />
      <path d={arrowPath} fill="none" stroke="#001522" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
      <path d={arrowPath} fill="none" stroke={hovered && !disabled ? '#c9ffd8' : '#c7f2ff'} strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
    </g>
  );
}

function CloseButton({ x, y, size, label, filterId, onClick }: CloseButtonProps) {
  const [hovered, setHovered] = useState(false);
  const disabled = !onClick;
  const stroke = hovered && !disabled ? '#ff3b45' : '#69caff';
  const fill = hovered && !disabled ? 'rgba(78, 8, 16, 0.96)' : 'rgba(5, 18, 35, 0.94)';
  const pad = size * 0.28;
  const x1 = x + pad;
  const x2 = x + size - pad;
  const y1 = y + pad;
  const y2 = y + size - pad;

  return (
    <g
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled}
      style={{ cursor: disabled ? 'default' : 'pointer' }}
      onClick={onClick}
      onKeyDown={event => handleButtonKey(event, onClick)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      pointerEvents="auto"
    >
      {hovered && !disabled ? (
        <rect x={x} y={y} width={size} height={size} rx={size * 0.15} fill="#ff3b45" opacity="0.38" filter={`url(#${filterId})`} pointerEvents="none" />
      ) : null}
      <rect x={x} y={y} width={size} height={size} rx={size * 0.15} fill={fill} stroke="#07111c" strokeWidth="5" />
      <rect x={x + 4} y={y + 4} width={size - 8} height={size - 8} rx={size * 0.12} fill="none" stroke={stroke} strokeWidth={hovered && !disabled ? 4.4 : 2.7} />
      <path d={`M${x1} ${y1} L${x2} ${y2} M${x2} ${y1} L${x1} ${y2}`} fill="none" stroke={hovered && !disabled ? '#ff8790' : '#f1fbff'} strokeWidth={hovered && !disabled ? 8 : 6.3} strokeLinecap="round" />
    </g>
  );
}

export function CardImageViewer({
  controls,
  className,
  style,
  ariaLabel = 'Card image viewer',
  imageSrc,
  imageAlt = '',
  imageFit = 'contain',
  missingLabel = 'Missing image',
  caption,
  counter,
  previousLabel = 'Previous image',
  nextLabel = 'Next image',
  closeLabel = 'Close card image',
  onPrevious,
  onNext,
  onClose,
  onImageError,
}: CardImageViewerProps) {
  const renderDefs = (layout: PictureViewerFrameLayout) => {
    const { mediaRect } = cardViewerRects(layout);
    const cyanGlowId = `cardImageViewerCyanGlow-${layout.rawId}`;
    const closeGlowId = `cardImageViewerCloseGlow-${layout.rawId}`;
    const mediaClipId = `cardImageViewerMediaClip-${layout.rawId}`;

    return (
      <>
        <filter id={cyanGlowId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation={layout.cfg.navArrows.glowBlur + 1.5} />
        </filter>
        <filter id={closeGlowId} x="-90%" y="-90%" width="280%" height="280%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <clipPath id={mediaClipId}>
          <rect x={mediaRect.x} y={mediaRect.y} width={mediaRect.w} height={mediaRect.h} rx="10" />
        </clipPath>
      </>
    );
  };

  const renderInset = (layout: PictureViewerFrameLayout) => {
    const { mediaRect } = cardViewerRects(layout);
    const mediaClipId = `cardImageViewerMediaClip-${layout.rawId}`;
    const missingTitle = fitSvgText(missingLabel, mediaRect.w * 0.74, 42);
    const imagePreserveAspectRatio = imageFit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet';

    return (
      <g clipPath={`url(#${mediaClipId})`} pointerEvents="none">
        {imageSrc ? (
          <image
            href={imageSrc}
            x={mediaRect.x}
            y={mediaRect.y}
            width={mediaRect.w}
            height={mediaRect.h}
            preserveAspectRatio={imagePreserveAspectRatio}
            opacity="0.98"
            aria-label={imageAlt}
            onError={onImageError}
          />
        ) : (
          <g>
            <rect x={mediaRect.x} y={mediaRect.y} width={mediaRect.w} height={mediaRect.h} rx="10" fill="rgba(7, 19, 34, 0.82)" stroke="rgba(255, 211, 106, 0.55)" strokeWidth="2.2" />
            <text x={mediaRect.x + mediaRect.w / 2} y={mediaRect.y + mediaRect.h / 2 - 16} textAnchor="middle" dominantBaseline="central" fill="#edf7ff" fontSize="42" fontWeight="900" fontFamily="Arial, sans-serif" paintOrder="stroke" stroke="#020816" strokeWidth="8">
              {missingTitle}
            </text>
            <text x={mediaRect.x + mediaRect.w / 2} y={mediaRect.y + mediaRect.h / 2 + 44} textAnchor="middle" dominantBaseline="central" fill="#ffd36a" fontSize="27" fontWeight="950" fontFamily="Arial, sans-serif" paintOrder="stroke" stroke="#020816" strokeWidth="6">
              MISSING IMAGE
            </text>
          </g>
        )}
      </g>
    );
  };

  const renderForeground = (layout: PictureViewerFrameLayout) => {
    const { viewerRect, closeSize, closeX, closeY, captionY } = cardViewerRects(layout);
    const captionText = caption ? fitSvgText(caption.toUpperCase(), viewerRect.w * 0.58, 36) : '';
    const counterText = counter ? fitSvgText(counter, viewerRect.w * 0.22, 36) : '';
    const cyanGlowId = `cardImageViewerCyanGlow-${layout.rawId}`;
    const closeGlowId = `cardImageViewerCloseGlow-${layout.rawId}`;

    return (
      <>
        {layout.cfg.navArrows.enabled ? (
          <>
            <SideArrowButton rect={viewerRect} side="left" arrows={layout.cfg.navArrows} label={previousLabel} filterId={cyanGlowId} onClick={onPrevious} />
            <SideArrowButton rect={viewerRect} side="right" arrows={layout.cfg.navArrows} label={nextLabel} filterId={cyanGlowId} onClick={onNext} />
          </>
        ) : null}
        {captionText ? (
          <text x={viewerRect.x + 120} y={captionY} fill="#edf7ff" fontSize="36" fontWeight="950" fontFamily="Arial, sans-serif" paintOrder="stroke" stroke="#020816" strokeWidth="9">
            {captionText}
          </text>
        ) : null}
        {counterText ? (
          <text x={viewerRect.x + viewerRect.w - 118} y={captionY} textAnchor="end" fill="#edf7ff" fontSize="36" fontWeight="950" fontFamily="Arial, sans-serif" paintOrder="stroke" stroke="#020816" strokeWidth="9">
            {counterText}
          </text>
        ) : null}
        {onClose ? <CloseButton x={closeX} y={closeY} size={closeSize} label={closeLabel} filterId={closeGlowId} onClick={onClose} /> : null}
      </>
    );
  };

  return (
    <PictureViewerFrame
      controls={controls}
      className={className}
      style={style as CSSProperties}
      ariaLabel={ariaLabel}
      renderDefs={renderDefs}
      renderInset={renderInset}
      renderForeground={renderForeground}
    />
  );
}
