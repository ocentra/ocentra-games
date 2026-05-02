import { useMemo } from 'react';
import type {
  CardGameCardStripCardToken,
  CardGameCardStripControls,
  CardGameCardStripPresentation,
  CardGameCardStripSlotControls,
  PlainCardFrameSettings,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';
import PlainCard from './PlainCard';
import { PLAIN_CARD_FRAME_DEFAULTS } from './PlainCardFrame.types';

interface GameCardStripProps {
  controls: CardGameCardStripControls;
  frameSettings?: PlainCardFrameSettings;
  presentation?: CardGameCardStripPresentation;
  showSlotBounds?: boolean;
}

interface ResolvedCardStripSlot extends CardGameCardStripSlotControls {
  card?: CardGameCardStripCardToken | null;
  faceUp: boolean;
  hidden: boolean;
  text?: string;
}

function getSuitSymbol(suit: string | null | undefined): string {
  switch (suit) {
    case 'spades':
      return 'S';
    case 'hearts':
      return 'H';
    case 'diamonds':
      return 'D';
    case 'clubs':
      return 'C';
    default:
      return '?';
  }
}

function getSuitColor(suit: string | null | undefined): string {
  switch (suit) {
    case 'hearts':
    case 'diamonds':
      return '#d64a46';
    case 'spades':
    case 'clubs':
      return '#15334d';
    default:
      return '#d8e6f7';
  }
}

function getCardValueLabel(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '?';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value === 14) {
    return 'A';
  }
  if (value === 13) {
    return 'K';
  }
  if (value === 12) {
    return 'Q';
  }
  if (value === 11) {
    return 'J';
  }
  return String(value);
}

function buildResolvedSlots(
  controls: CardGameCardStripControls,
  presentation?: CardGameCardStripPresentation,
): ResolvedCardStripSlot[] {
  return controls.slots.map((slot) => {
    const override = presentation?.slotsById?.[slot.id];
    const hasCard = Boolean(override?.card);
    const hasText = typeof override?.text === 'string' && override.text.length > 0;
    const faceUp = override?.faceUp ?? (hasCard || hasText || slot.previewFaceUp === true);
    return {
      ...slot,
      card: override?.card,
      faceUp,
      hidden: override?.hidden === true,
      label: override?.label ?? slot.label,
      text: hasText ? override?.text : slot.previewFaceUp ? slot.previewText : undefined,
    };
  });
}

function scaleFrameSettings(
  frameSettings: PlainCardFrameSettings,
  controls: CardGameCardStripControls,
  bottomTitle: string,
): PlainCardFrameSettings {
  const safeWidth = Math.max(frameSettings.width, 1);
  const safeHeight = Math.max(frameSettings.height, 1);
  const overallScale = Number.isFinite(controls.overallScale)
    ? Math.max(controls.overallScale, 0.01)
    : 1;
  const targetWidth = controls.cardWidth * overallScale;
  const targetHeight = controls.cardHeight * overallScale;
  const scale = Math.min(targetWidth / safeWidth, targetHeight / safeHeight);

  return {
    ...frameSettings,
    width: targetWidth,
    height: targetHeight,
    cornerRadius: frameSettings.cornerRadius * scale,
    goldBorderWidth: frameSettings.goldBorderWidth * scale,
    greenBorderWidth: frameSettings.greenBorderWidth * scale,
    glowBlur: frameSettings.glowBlur * scale,
    glowMargin: frameSettings.glowMargin * scale,
    bottomTitle: bottomTitle || frameSettings.bottomTitle,
    bottomTitleHeight: frameSettings.bottomTitleHeight * scale,
    bottomTitleSize: frameSettings.bottomTitleSize * scale,
    bottomTitleInsetX: frameSettings.bottomTitleInsetX * scale,
    bottomTitleBottomInset: frameSettings.bottomTitleBottomInset * scale,
    bottomTitleCornerRadius: frameSettings.bottomTitleCornerRadius * scale,
    bottomTitleStrokeWidth: frameSettings.bottomTitleStrokeWidth * scale,
    bottomTitleYOffset: frameSettings.bottomTitleYOffset * scale,
    bottomTitleTextPadding: frameSettings.bottomTitleTextPadding * scale,
    bottomTitleTextYOffset: frameSettings.bottomTitleTextYOffset * scale,
  };
}

function BackFace({ scale }: { scale: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: `${18 * scale}px`,
        background: [
          'radial-gradient(circle at 50% 24%, rgba(255,255,255,0.18), rgba(255,255,255,0) 55%)',
          'repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 10px, rgba(19,43,65,0.22) 10px 20px)',
          'linear-gradient(180deg, rgba(34,51,74,0.92) 0%, rgba(14,24,40,0.95) 100%)',
        ].join(','),
        boxShadow: `inset 0 0 ${18 * scale}px rgba(0, 0, 0, 0.35)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: `${16 * scale}px`,
          borderRadius: `${14 * scale}px`,
          border: `${2 * scale}px solid rgba(229, 205, 127, 0.68)`,
          boxShadow: `inset 0 0 ${10 * scale}px rgba(255, 214, 91, 0.18), 0 0 ${10 * scale}px rgba(18, 197, 255, 0.12)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: `${68 * scale}px`,
          height: `${68 * scale}px`,
          transform: 'translate(-50%, -50%) rotate(45deg)',
          borderRadius: `${16 * scale}px`,
          border: `${2 * scale}px solid rgba(229, 205, 127, 0.68)`,
          background: 'linear-gradient(180deg, rgba(28, 58, 84, 0.72) 0%, rgba(8, 20, 33, 0.84) 100%)',
          boxShadow: `0 0 ${16 * scale}px rgba(255, 214, 91, 0.16)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#ecd88d',
          fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
          fontSize: `${30 * scale}px`,
          lineHeight: 1,
          textShadow: `0 0 ${8 * scale}px rgba(255, 214, 91, 0.22)`,
        }}
      >
        OC
      </div>
    </div>
  );
}

function FaceUpCard({
  card,
  scale,
  text,
}: {
  card?: CardGameCardStripCardToken | null;
  scale: number;
  text?: string;
}) {
  if (!card) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: `${18 * scale}px`,
          background: 'linear-gradient(180deg, rgba(248,252,255,0.98) 0%, rgba(222,236,243,0.96) 100%)',
          boxShadow: `inset 0 0 ${16 * scale}px rgba(61, 95, 125, 0.12)`,
          color: '#14324a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: `${18 * scale}px`,
          fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
          fontSize: `${30 * scale}px`,
        }}
      >
        {text || 'Open'}
      </div>
    );
  }

  const suitSymbol = getSuitSymbol(card.suit);
  const suitColor = getSuitColor(card.suit);
  const valueLabel = getCardValueLabel(card.value);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: `${18 * scale}px`,
        background: 'linear-gradient(180deg, rgba(248,252,255,0.99) 0%, rgba(228,238,246,0.98) 100%)',
        boxShadow: `inset 0 0 ${14 * scale}px rgba(50, 78, 101, 0.1)`,
        color: suitColor,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: `${14 * scale}px`,
          top: `${12 * scale}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          lineHeight: 0.95,
          fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
        }}
      >
        <span style={{ fontSize: `${28 * scale}px` }}>{valueLabel}</span>
        <span style={{ fontSize: `${22 * scale}px` }}>{suitSymbol}</span>
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${68 * scale}px`,
          fontWeight: 800,
          fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
          color: suitColor,
          textShadow: `0 ${2 * scale}px ${8 * scale}px rgba(0, 0, 0, 0.12)`,
        }}
      >
        {suitSymbol}
      </div>
      <div
        style={{
          position: 'absolute',
          right: `${14 * scale}px`,
          bottom: `${12 * scale}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          lineHeight: 0.95,
          fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
          transform: 'rotate(180deg)',
        }}
      >
        <span style={{ fontSize: `${28 * scale}px` }}>{valueLabel}</span>
        <span style={{ fontSize: `${22 * scale}px` }}>{suitSymbol}</span>
      </div>
    </div>
  );
}

export default function GameCardStrip({
  controls,
  frameSettings,
  presentation,
  showSlotBounds = false,
}: GameCardStripProps) {
  const mergedFrameSettings = {
    ...PLAIN_CARD_FRAME_DEFAULTS,
    ...(frameSettings ?? {}),
  };
  const slots = useMemo(
    () => buildResolvedSlots(controls, presentation),
    [controls, presentation],
  );

  if (presentation?.hidden || slots.length === 0) {
    return null;
  }

  const frameScale = Math.min(
    (controls.cardWidth * controls.overallScale) / Math.max(mergedFrameSettings.width, 1),
    (controls.cardHeight * controls.overallScale) / Math.max(mergedFrameSettings.height, 1),
  );
  const scaledGap = controls.gap * controls.overallScale;
  const slotWidth = controls.cardWidth * controls.overallScale;
  const slotHeight = controls.cardHeight * controls.overallScale;
  const scaledGlowMargin = mergedFrameSettings.glowMargin * frameScale;

  return (
    <div
      aria-label="Card strip"
      role="group"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: `${scaledGap}px`,
        width: 'max-content',
        padding: `${scaledGlowMargin}px`,
        pointerEvents: 'none',
      }}
    >
      {slots.map((slot) => {
        const resolvedFrame = scaleFrameSettings(mergedFrameSettings, controls, slot.label);
        return (
          <div
            key={slot.id}
            data-testid={`card-strip-slot-${slot.id}`}
            style={{
              visibility: slot.hidden ? 'hidden' : 'visible',
              position: 'relative',
              width: `${slotWidth}px`,
              height: `${slotHeight}px`,
              overflow: 'visible',
            }}
          >
            {showSlotBounds ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  border: '2px dashed rgba(0, 255, 102, 0.92)',
                  borderRadius: '0.875rem',
                  boxShadow: '0 0 1rem rgba(0, 255, 102, 0.16)',
                  pointerEvents: 'none',
                }}
              />
            ) : null}
            <div
              style={{
                position: 'absolute',
                left: `${-scaledGlowMargin}px`,
                top: `${-scaledGlowMargin}px`,
              }}
            >
              <PlainCard
                {...resolvedFrame}
                content={slot.faceUp
                  ? <FaceUpCard card={slot.card} scale={frameScale} text={slot.text} />
                  : <BackFace scale={frameScale} />}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
