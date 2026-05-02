import { useId } from 'react';
import type {
  CardGameDeckTrayControls,
  CardGameDeckTrayPresentation,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';

interface GameDeckTrayProps {
  controls: CardGameDeckTrayControls;
  presentation?: CardGameDeckTrayPresentation;
  showDeckLayer?: boolean;
  showDeckBounds?: boolean;
}

export default function GameDeckTray({
  controls,
  presentation,
  showDeckLayer = true,
  showDeckBounds = false,
}: GameDeckTrayProps) {
  const uid = useId().replace(/:/g, '');

  if (presentation?.hidden) {
    return null;
  }

  const width = controls.svgWidth;
  const height = controls.svgHeight;
  const glowMargin = controls.glowMargin;
  const viewBox = `${-glowMargin} ${-glowMargin} ${width + glowMargin * 2} ${height + glowMargin * 2}`;
  const stackCount = Number.isFinite(presentation?.stackCount)
    ? Math.max(0, Math.round(Number(presentation?.stackCount)))
    : Math.max(0, Math.round(controls.stackCount));
  const maxStackCount = Number.isFinite(presentation?.maxStackCount)
    ? Math.max(1, Math.round(Number(presentation?.maxStackCount)))
    : Math.max(1, Math.round(controls.maxStackCount));
  const renderCount = stackCount > 0 ? Math.max(1, Math.min(stackCount, maxStackCount)) : 0;
  const referenceStackCount = Math.max(1, maxStackCount);
  const fitMinX = Math.min(0, (referenceStackCount - 1) * controls.stackOffsetX);
  const fitMinY = Math.min(0, (referenceStackCount - 1) * controls.stackOffsetY);
  const trayUsableW = Math.max(1, controls.trayWidth - controls.deckFitPaddingX * 2);
  const trayUsableH = Math.max(1, controls.trayHeight - controls.deckFitPaddingY * 2);
  const autoDeckScale = Math.min(trayUsableW / Math.max(1, controls.cardWidth), trayUsableH / Math.max(1, controls.cardHeight));
  const deckScale = controls.autoScaleDeckToTray ? autoDeckScale * controls.deckScale : controls.deckScale;
  const stackTotalW = controls.cardWidth * deckScale;
  const stackTotalH = controls.cardHeight * deckScale;
  const deckRenderX = controls.autoCenterDeck
    ? controls.trayX + (controls.trayWidth - stackTotalW) / 2 - fitMinX * deckScale + controls.deckCenterOffsetX
    : controls.deckX;
  const deckRenderY = controls.autoCenterDeck
    ? controls.trayY + (controls.trayHeight - stackTotalH) / 2 - fitMinY * deckScale + controls.deckCenterOffsetY
    : controls.deckY;
  const topLayerOffsetIndex = controls.stackRemoveFromTop
    ? Math.max(0, maxStackCount - Math.max(renderCount, 1))
    : 0;
  const topCardX = deckRenderX + controls.deckOffsetX + topLayerOffsetIndex * controls.stackOffsetX * deckScale;
  const topCardY = deckRenderY + controls.deckOffsetY + topLayerOffsetIndex * controls.stackOffsetY * deckScale;
  const topInnerX = topCardX + controls.topCardInset * deckScale;
  const topInnerY = topCardY + controls.topCardInset * deckScale;
  const topInnerW = (controls.cardWidth - controls.topCardInset * 2) * deckScale;
  const topInnerH = (controls.cardHeight - controls.topCardInset * 2) * deckScale;
  const scaledCardW = controls.cardWidth * deckScale;
  const scaledCardH = controls.cardHeight * deckScale;
  const scaledCardRadius = controls.cardRadius * deckScale;
  const scaledTopCardRadius = controls.topCardRadius * deckScale;
  const scaledStackStrokeWidth = controls.stackStrokeWidth * deckScale;
  const topCardImageUrl = presentation?.topCardImageUrl ?? controls.topCardImageUrl;
  const imageFit = presentation?.imageFit ?? controls.imageFit;
  const imageScale = presentation?.imageScale ?? controls.imageScale;
  const imageX = presentation?.imageX ?? controls.imageX;
  const imageY = presentation?.imageY ?? controls.imageY;
  const imageOpacity = presentation?.imageOpacity ?? controls.imageOpacity;
  const showDeck = (presentation?.showDeck ?? controls.showDeck) && showDeckLayer;
  const imagePreserveAspectRatio = imageFit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet';
  const imageCenterX = topInnerX + topInnerW / 2;
  const imageCenterY = topInnerY + topInnerH / 2;
  const imageTransform = `translate(${imageCenterX + imageX} ${imageCenterY + imageY}) scale(${imageScale}) translate(${-imageCenterX} ${-imageCenterY})`;
  const visibleBackCount = Math.max(0, renderCount - 1);
  const firstStackOffsetIndex = topLayerOffsetIndex;
  const lastStackOffsetIndex = topLayerOffsetIndex + visibleBackCount;
  const firstStackX = deckRenderX + controls.deckOffsetX + firstStackOffsetIndex * controls.stackOffsetX * deckScale;
  const firstStackY = deckRenderY + controls.deckOffsetY + firstStackOffsetIndex * controls.stackOffsetY * deckScale;
  const lastStackX = deckRenderX + controls.deckOffsetX + lastStackOffsetIndex * controls.stackOffsetX * deckScale;
  const lastStackY = deckRenderY + controls.deckOffsetY + lastStackOffsetIndex * controls.stackOffsetY * deckScale;
  const deckBoundsX = Math.min(firstStackX, lastStackX);
  const deckBoundsY = Math.min(firstStackY, lastStackY);
  const deckBoundsWidth = Math.max(firstStackX, lastStackX) - deckBoundsX + scaledCardW;
  const deckBoundsHeight = Math.max(firstStackY, lastStackY) - deckBoundsY + scaledCardH;

  return (
    <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Deck tray"
        preserveAspectRatio="xMidYMid meet"
        style={{ background: 'transparent', overflow: 'hidden', display: 'block' }}
      >
        <defs>
          <linearGradient id={`${uid}_trayFill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={controls.trayFillTop} />
            <stop offset="0.45" stopColor={controls.trayFillTop} stopOpacity="0.72" />
            <stop offset="1" stopColor={controls.trayFillBottom} />
          </linearGradient>

          <radialGradient id={`${uid}_trayVignette`} cx="50%" cy="36%" r="78%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="1" stopColor="#000000" stopOpacity={controls.trayVignetteOpacity} />
          </radialGradient>

          <linearGradient id={`${uid}_placeholderFill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={controls.placeholderTop} />
            <stop offset="1" stopColor={controls.placeholderBottom} />
          </linearGradient>

          <radialGradient id={`${uid}_placeholderLight`} cx="50%" cy="28%" r="75%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="0.62" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.22" />
          </radialGradient>

          <filter id={`${uid}_trayGlow`} x="-30%" y="-20%" width="160%" height="140%">
            <feGaussianBlur stdDeviation={controls.trayGlowBlur} result="blur" />
            <feFlood floodColor={controls.trayGlowColor} floodOpacity="0.55" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={`${uid}_shadow`} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity={controls.stackShadowOpacity} />
          </filter>

          <filter id={`${uid}_trayShadow`} x="-30%" y="-20%" width="160%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity={controls.trayShadowOpacity} />
          </filter>

          <linearGradient id={`${uid}_trayShine`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.35" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="0.5" stopColor={controls.trayRimHighlight} stopOpacity="0.55" />
            <stop offset="0.65" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <pattern id={`${uid}_ornament`} width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M 17 2 C 4 8 4 26 17 32 C 30 26 30 8 17 2 Z" fill="none" stroke={controls.patternStroke} strokeWidth="1.8" opacity="0.9" />
            <circle cx="17" cy="17" r="4" fill="none" stroke={controls.patternStroke} strokeWidth="1.4" opacity="0.9" />
            <path d="M 2 17 H 32 M 17 2 V 32" stroke={controls.patternStroke} strokeWidth="1" opacity="0.45" />
          </pattern>

          <clipPath id={`${uid}_topCardClip`}>
            <rect x={topInnerX} y={topInnerY} width={topInnerW} height={topInnerH} rx={scaledTopCardRadius} />
          </clipPath>

          <clipPath id={`${uid}_trayClip`}>
            <rect x={controls.trayX} y={controls.trayY} width={controls.trayWidth} height={controls.trayHeight} rx={controls.trayRadius} />
          </clipPath>
        </defs>

        <rect
          x={controls.trayX}
          y={controls.trayY}
          width={controls.trayWidth}
          height={controls.trayHeight}
          rx={controls.trayRadius}
          fill={`url(#${uid}_trayFill)`}
          stroke={controls.trayStroke}
          strokeWidth={controls.trayStrokeWidth}
          filter={`url(#${uid}_trayShadow)`}
        />

        <rect
          x={controls.trayX + controls.trayStrokeWidth * 0.5}
          y={controls.trayY + controls.trayStrokeWidth * 0.5}
          width={controls.trayWidth - controls.trayStrokeWidth}
          height={controls.trayHeight - controls.trayStrokeWidth}
          rx={Math.max(0, controls.trayRadius - controls.trayStrokeWidth * 0.3)}
          fill={`url(#${uid}_trayVignette)`}
        />

        <path
          d={`M ${controls.trayX + controls.trayRadius} ${controls.trayY + controls.trayStrokeWidth * 0.75}
             H ${controls.trayX + controls.trayWidth - controls.trayRadius}
             Q ${controls.trayX + controls.trayWidth - controls.trayStrokeWidth * 0.75} ${controls.trayY + controls.trayStrokeWidth * 0.75} ${controls.trayX + controls.trayWidth - controls.trayStrokeWidth * 0.75} ${controls.trayY + controls.trayRadius}`}
          fill="none"
          stroke={controls.trayRimHighlight}
          strokeWidth={Math.max(1, controls.trayStrokeWidth * 0.42)}
          strokeLinecap="round"
          opacity={controls.trayRimHighlightOpacity}
        />

        <rect
          x={controls.trayX + controls.trayStrokeWidth}
          y={controls.trayY + controls.trayStrokeWidth}
          width={controls.trayWidth - controls.trayStrokeWidth * 2}
          height={controls.trayHeight - controls.trayStrokeWidth * 2}
          rx={Math.max(0, controls.trayRadius - controls.trayStrokeWidth)}
          fill="none"
          stroke={controls.trayInnerStroke}
          strokeWidth={controls.trayInnerStrokeWidth}
          opacity="0.9"
          filter={`url(#${uid}_trayGlow)`}
        />

        <rect
          x={controls.trayX + controls.trayStrokeWidth + 5}
          y={controls.trayY + controls.trayStrokeWidth + 5}
          width={controls.trayWidth - controls.trayStrokeWidth * 2 - 10}
          height={controls.trayHeight - controls.trayStrokeWidth * 2 - 10}
          rx={Math.max(0, controls.trayRadius - controls.trayStrokeWidth - 2)}
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          opacity={controls.trayInnerHighlightOpacity}
        />

        {controls.showTrayShine ? (
          <g clipPath={`url(#${uid}_trayClip)`} opacity={controls.trayShineOpacity}>
            <rect
              x={controls.trayX + controls.trayShineX}
              y={controls.trayY - controls.trayHeight * 0.12}
              width={controls.trayShineWidth}
              height={controls.trayHeight * 1.24}
              fill={`url(#${uid}_trayShine)`}
              transform={`rotate(${controls.trayShineAngle} ${controls.trayX + controls.trayShineX + controls.trayShineWidth / 2} ${controls.trayY + controls.trayHeight / 2})`}
            />
            <rect
              x={controls.trayX + controls.trayStrokeWidth + 3}
              y={controls.trayY + controls.trayStrokeWidth + 3}
              width={controls.trayWidth - controls.trayStrokeWidth * 2 - 6}
              height={controls.trayHeight * 0.18}
              rx={Math.max(0, controls.trayRadius - controls.trayStrokeWidth)}
              fill="#ffffff"
              opacity="0.2"
            />
          </g>
        ) : null}

        {controls.showEmptyTrayGhost ? (
          <rect
            x={deckRenderX}
            y={deckRenderY}
            width={scaledCardW}
            height={scaledCardH}
            rx={scaledCardRadius}
            fill="#ffffff"
            opacity={controls.ghostOpacity}
          />
        ) : null}

        {showDeckBounds && showDeck && renderCount > 0 ? (
          <g aria-hidden="true" pointerEvents="none">
            <rect
              x={deckBoundsX}
              y={deckBoundsY}
              width={deckBoundsWidth}
              height={deckBoundsHeight}
              rx={Math.max(6, scaledCardRadius)}
              fill="rgba(104, 244, 255, 0.04)"
              stroke="rgba(104, 244, 255, 0.96)"
              strokeWidth="2"
              strokeDasharray="7 5"
            />
            <rect
              x={deckBoundsX + 8}
              y={deckBoundsY + 8}
              width={52}
              height={18}
              rx={9}
              fill="rgba(6, 21, 24, 0.92)"
              stroke="rgba(104, 244, 255, 0.74)"
              strokeWidth="1"
            />
            <text
              x={deckBoundsX + 34}
              y={deckBoundsY + 21}
              textAnchor="middle"
              fill="#68f4ff"
              fontSize="10"
              fontWeight="700"
              letterSpacing="0.08em"
            >
              DECK
            </text>
          </g>
        ) : null}

        {showDeck && renderCount > 0 ? (
          <g filter={`url(#${uid}_shadow)`}>
            {Array.from({ length: visibleBackCount }).map((_, index) => {
              const layerIndex = visibleBackCount - index;
              const offsetIndex = controls.stackRemoveFromTop
                ? topLayerOffsetIndex + layerIndex
                : layerIndex;
              const x = deckRenderX + controls.deckOffsetX + offsetIndex * controls.stackOffsetX * deckScale;
              const y = deckRenderY + controls.deckOffsetY + offsetIndex * controls.stackOffsetY * deckScale;
              return (
                <rect
                  key={index}
                  x={x}
                  y={y}
                  width={scaledCardW}
                  height={scaledCardH}
                  rx={scaledCardRadius}
                  fill={controls.stackFill}
                  stroke={controls.stackStroke}
                  strokeWidth={scaledStackStrokeWidth}
                />
              );
            })}

            <rect
              x={topCardX}
              y={topCardY}
              width={scaledCardW}
              height={scaledCardH}
              rx={scaledCardRadius}
              fill={controls.stackFill}
              stroke={controls.stackStroke}
              strokeWidth={scaledStackStrokeWidth}
            />

            <g clipPath={`url(#${uid}_topCardClip)`}>
              <rect x={topInnerX} y={topInnerY} width={topInnerW} height={topInnerH} fill={`url(#${uid}_placeholderFill)`} />
              <rect x={topInnerX} y={topInnerY} width={topInnerW} height={topInnerH} fill={`url(#${uid}_placeholderLight)`} />

              {controls.showPattern ? (
                <rect
                  x={topInnerX}
                  y={topInnerY}
                  width={topInnerW}
                  height={topInnerH}
                  fill={`url(#${uid}_ornament)`}
                  opacity={controls.patternOpacity}
                />
              ) : null}

              {topCardImageUrl ? (
                <g transform={imageTransform} opacity={imageOpacity}>
                  <image
                    href={topCardImageUrl}
                    x={topInnerX}
                    y={topInnerY}
                    width={topInnerW}
                    height={topInnerH}
                    preserveAspectRatio={imagePreserveAspectRatio}
                  />
                </g>
              ) : null}

              {!topCardImageUrl && controls.showPlaceholderText ? (
                <g>
                  <text
                    x={topInnerX + topInnerW / 2}
                    y={topInnerY + topInnerH / 2 - controls.placeholderTextSize * 0.1}
                    textAnchor="middle"
                    fontFamily="Georgia, Times New Roman, serif"
                    fontWeight="900"
                    fontSize={controls.placeholderTextSize}
                    fill={controls.placeholderTextColor}
                    stroke={controls.placeholderTextStroke}
                    strokeWidth="1.2"
                    paintOrder="stroke fill"
                  >
                    {controls.placeholderText}
                  </text>
                  <text
                    x={topInnerX + topInnerW / 2}
                    y={topInnerY + topInnerH / 2 + controls.placeholderTextSize * 0.78}
                    textAnchor="middle"
                    fontFamily="Georgia, Times New Roman, serif"
                    fontWeight="900"
                    fontSize={controls.placeholderTextSize * 0.72}
                    fill={controls.placeholderTextColor}
                    stroke={controls.placeholderTextStroke}
                    strokeWidth="1"
                    paintOrder="stroke fill"
                  >
                    {controls.placeholderText2}
                  </text>
                </g>
              ) : null}
            </g>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
