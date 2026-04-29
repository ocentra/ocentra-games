import type { CSSProperties } from 'react';
import type {
  ResolvedCardGameStageAttachment,
  ResolvedCardGameStageZone,
} from '@ocentra/game-layout-domain/cardGameStageLayoutResolver';
import type {
  CardGameCardStripCardToken,
  CardGameDeckTrayControls,
  CardGameDeckTrayPresentation,
  PlainCardFrameSettings,
} from '@ocentra/game-ui-types/cardGameLayoutTypes';
import GameDeckTray from './GameDeckTray';
import PlainCard from './PlainCard';
import { PLAIN_CARD_FRAME_DEFAULTS } from './PlainCardFrame.types';
import './TableZonesLayer.css';

export interface CardGameZoneItemPresentation {
  id: string;
  label: string;
  detail?: string;
  accent?: boolean;
  card?: CardGameCardStripCardToken | null;
}

export interface CardGameZonePresentation {
  label?: string;
  valueText?: string;
  valueAccent?: boolean;
  valueCard?: CardGameCardStripCardToken | null;
  items?: CardGameZoneItemPresentation[];
  emptyText?: string;
  hidden?: boolean;
  testId?: string;
  deckTray?: CardGameDeckTrayPresentation;
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
      return '#173550';
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

  switch (value) {
    case 14:
      return 'A';
    case 13:
      return 'K';
    case 12:
      return 'Q';
    case 11:
      return 'J';
    default:
      return String(value);
  }
}

function scaleTableCardFrame(frameSettings: PlainCardFrameSettings): PlainCardFrameSettings {
  const targetWidth = 74;
  const targetHeight = 108;
  const safeWidth = Math.max(frameSettings.width, 1);
  const safeHeight = Math.max(frameSettings.height, 1);
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
    showBottomTitle: false,
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

function TableCardFace({ card }: { card: CardGameCardStripCardToken }) {
  const suitColor = getSuitColor(card.suit);
  const suitSymbol = getSuitSymbol(card.suit);
  const valueLabel = getCardValueLabel(card.value);

  return (
    <div className="card-game-table-zone__plain-card-face">
      <div className="card-game-table-zone__plain-card-corner" style={{ color: suitColor }}>
        <span>{valueLabel}</span>
        <span>{suitSymbol}</span>
      </div>
      <div className="card-game-table-zone__plain-card-suit" style={{ color: suitColor }}>
        {suitSymbol}
      </div>
      <div className="card-game-table-zone__plain-card-corner card-game-table-zone__plain-card-corner--bottom" style={{ color: suitColor }}>
        <span>{valueLabel}</span>
        <span>{suitSymbol}</span>
      </div>
    </div>
  );
}

function TableCardGlyph({
  card,
  label,
  detail,
  frameSettings,
}: {
  card: CardGameCardStripCardToken;
  label?: string;
  detail?: string;
  frameSettings: PlainCardFrameSettings;
}) {
  const resolvedFrameSettings = scaleTableCardFrame(frameSettings);

  return (
    <div className="card-game-table-zone__card-glyph">
      <PlainCard
        {...resolvedFrameSettings}
        content={<TableCardFace card={card} />}
      />
      {detail || label ? (
        <div className="card-game-table-zone__card-meta">
          {detail ? <span className="card-game-table-zone__card-detail">{detail}</span> : null}
          {label ? <span className="card-game-table-zone__card-label">{label}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

interface TableZonesLayerProps {
  zones: ResolvedCardGameStageZone[];
  presentationById?: Partial<Record<string, CardGameZonePresentation>>;
  authoringMode?: boolean;
  deckTrayControls: CardGameDeckTrayControls;
  deckTrayAttachment?: ResolvedCardGameStageAttachment | null;
  frameSettings?: PlainCardFrameSettings;
  showZones?: boolean;
  showDeckTray?: boolean;
  showDeckTrayDeck?: boolean;
  showZoneBounds?: boolean;
  showDeckTrayBounds?: boolean;
  showDeckTrayDeckBounds?: boolean;
}

function zoneClassName(type: string, authoringMode: boolean, hasCards: boolean): string {
  return [
    'card-game-table-zone',
    `card-game-table-zone--${type}`,
    authoringMode ? 'card-game-table-zone--authoring' : '',
    hasCards ? 'card-game-table-zone--has-cards' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export default function TableZonesLayer({
  zones,
  presentationById,
  authoringMode = false,
  deckTrayControls,
  deckTrayAttachment,
  frameSettings,
  showZones = true,
  showDeckTray = true,
  showDeckTrayDeck = true,
  showZoneBounds = false,
  showDeckTrayBounds = false,
  showDeckTrayDeckBounds = false,
}: TableZonesLayerProps) {
  const legacyDeckZonePresentation = zones
    .map(({ zone }) => presentationById?.[zone.id])
    .find((presentation) => presentation?.deckTray);
  const resolvedFrameSettings = {
    ...PLAIN_CARD_FRAME_DEFAULTS,
    ...(frameSettings ?? {}),
  };

  return (
    <div className="card-game-table-zones" aria-hidden="true">
      {showDeckTray && deckTrayAttachment ? (
        <div
          className={`card-game-table-zone card-game-table-zone--deck${showDeckTrayBounds ? ' card-game-table-zone--editor-bounds' : ''}`}
          style={{
            left: `${deckTrayAttachment.arenaRect.x}px`,
            top: `${deckTrayAttachment.arenaRect.y}px`,
            width: `${deckTrayAttachment.arenaRect.width}px`,
            height: `${deckTrayAttachment.arenaRect.height}px`,
            transform: `rotate(${deckTrayAttachment.rotation}deg)`,
          }}
        >
          {showDeckTrayBounds ? (
            <span className="card-game-table-zone__debug-label">Deck + Tray</span>
          ) : null}
          <div className="card-game-table-zone__deck-tray">
            <GameDeckTray
              controls={deckTrayControls}
              presentation={legacyDeckZonePresentation?.deckTray}
              showDeckLayer={showDeckTrayDeck}
              showDeckBounds={showDeckTrayDeckBounds}
            />
          </div>
        </div>
      ) : null}
      {showZones ? zones.filter(({ zone }) => zone.type !== 'deck').map(({ zone, arenaRect, rotation }) => {
        const presentation = presentationById?.[zone.id];
        if (presentation?.hidden) {
          return null;
        }

        const style = {
          left: `${arenaRect.x}px`,
          top: `${arenaRect.y}px`,
          width: `${arenaRect.width}px`,
          height: `${arenaRect.height}px`,
          transform: `rotate(${rotation}deg)`,
        } as CSSProperties;

        const label = presentation?.label ?? zone.label;
        const valueText = presentation?.valueText;
        const valueAccent = presentation?.valueAccent ?? zone.type === 'card';
        const valueCard = presentation?.valueCard;
        const items = presentation?.items ?? [];
        const emptyText = presentation?.emptyText ?? zone.emptyText ?? (zone.type === 'list' ? 'None' : 'Empty');
        const testId = presentation?.testId;
        const hasItems = items.length > 0;
        const hasValue = valueText !== undefined && valueText !== null && valueText !== '';
        const hasCards = Boolean(valueCard) || items.some((item) => Boolean(item.card));

        if (!authoringMode && !hasItems && !hasValue && !valueCard) {
          return null;
        }

        const showLabel = authoringMode || !hasCards;

        return (
          <div
            key={zone.id}
            className={`${zoneClassName(zone.type, authoringMode, hasCards)}${showZoneBounds ? ' card-game-table-zone--editor-bounds' : ''}`}
            style={style}
            data-testid={testId}
          >
            {zone.type === 'list' ? (
              <>
                {showLabel ? <span className="card-game-table-zone__label">{label}</span> : null}
                <div className="card-game-table-zone__items">
                  {hasItems
                    ? items.map((item) => (
                      item.card ? (
                        <TableCardGlyph
                          key={item.id}
                          card={item.card}
                          label={item.label}
                          detail={item.detail}
                          frameSettings={resolvedFrameSettings}
                        />
                      ) : (
                        <div
                          key={item.id}
                          className={`card-game-table-zone__item${item.accent ? ' card-game-table-zone__item--accent' : ''}`}
                        >
                          {item.detail ? <span className="card-game-table-zone__item-detail">{item.detail}</span> : null}
                          <span className="card-game-table-zone__item-label">{item.label}</span>
                        </div>
                      )
                    ))
                    : authoringMode ? <span className="card-game-table-zone__empty">{emptyText}</span> : null}
                </div>
              </>
            ) : (
              <>
                {showLabel ? <span className="card-game-table-zone__label">{label}</span> : null}
                {valueCard ? (
                  <TableCardGlyph
                    card={valueCard}
                    label={hasValue && authoringMode ? valueText : undefined}
                    frameSettings={resolvedFrameSettings}
                  />
                ) : (
                  hasValue || authoringMode ? (
                    <span className={`card-game-table-zone__value${valueAccent ? ' card-game-table-zone__value--accent' : ''}`}>
                      {hasValue ? valueText : emptyText}
                    </span>
                  ) : null
                )}
              </>
            )}
          </div>
        );
      }) : null}
    </div>
  );
}
