import React from 'react';
import { CardRanking } from '@ocentra/game-asset-domain/card/cardRanking/CardRanking';
import type { CardSuitEntry, CardRankingEntry } from '@ocentra/game-asset-domain/card/cardRanking/CardRanking';
import { DeckType } from '@ocentra/game-asset-domain/deck/DeckType';
import {
  DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS,
  type SelectedGameRankingVisualControls,
} from '@ocentra/game-asset-domain/ui/selectedGame/SelectedGamePresentation';
import { CardGridMatrix } from '@ocentra/core-ui/Common/CardGridMatrix/CardGridMatrix';
import { SuitIcon } from '@ocentra/core-ui/Common/SuitArt/SuitArt';
import { normalizeSuit, type Suit } from '@ocentra/core-ui/Common/SuitArt/SuitArtPrimitives';
import './CardRankingPreview.css';

interface CardRankingPreviewProps {
  assetId: string;
  assetInstance?: CardRanking | null;
  assetData?: { data?: Record<string, unknown> } | null;
  compact?: boolean;
  compactControls?: SelectedGameRankingVisualControls;
}

type RankingPreviewStyle = React.CSSProperties & Record<`--${string}`, string | number | undefined>;

type ExplicitRankingEntry = {
  id?: string;
  label?: string | null;
  copies?: number;
  order?: number | null;
  points?: number | null;
  kind?: string | null;
  suit?: string | null;
  rank?: string | number | null;
};

export const CardRankingPreview: React.FC<CardRankingPreviewProps> = ({
  assetId,
  assetInstance,
  assetData,
  compact = false,
  compactControls,
}) => {
  const data = assetData?.data as Record<string, unknown> | undefined;
  const compactControlValues = compact
    ? {
      ...DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS,
      ...compactControls,
    }
    : DEFAULT_SELECTED_GAME_RANKING_VISUAL_CONTROLS;
  const compactStyle = compact ? buildRankingPreviewCompactStyle(compactControlValues) : undefined;
  
  const deckType = (assetInstance?.deckType || data?.deckType || DeckType.Custom) as DeckType;
  const expectedCardCount = (assetInstance?.expectedCardCount || data?.expectedCardCount || 0) as number;
  const includesJokers = (assetInstance?.includesJokers ?? data?.includesJokers ?? false) as boolean;
  const backCardCount = (assetInstance?.backCardCount ?? data?.backCardCount ?? 1) as number;
  
  const suits = (
    assetInstance?.getSuitsArray()
    || (data?.familyPayload as { french?: { suits?: CardSuitEntry[] } })?.french?.suits
    || []
  ) as CardSuitEntry[];
  const rankings = (
    assetInstance?.getRankingsArray()
    || (data?.familyPayload as { french?: { rankings?: CardRankingEntry[] } })?.french?.rankings
    || []
  ) as CardRankingEntry[];
  const explicitEntries = ((assetInstance?.cardEntries || data?.cardEntries || []) as ExplicitRankingEntry[]).slice();

  const sortedSuits = [...suits].sort((a, b) => (a.DisplayOrder || 0) - (b.DisplayOrder || 0));
  const sortedRankings = [...rankings].sort((a, b) => {
    const displayOrder = (a.DisplayOrder ?? Number.MAX_SAFE_INTEGER) - (b.DisplayOrder ?? Number.MAX_SAFE_INTEGER);
    return displayOrder !== 0 ? displayOrder : (b.Value ?? 0) - (a.Value ?? 0);
  });
  const sortedEntries = explicitEntries.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const meaningfulExplicitEntries = sortedEntries.filter(isMeaningfulExplicitRankingEntry);
  const strongestRank = sortedRankings[0];
  const weakestRank = sortedRankings[sortedRankings.length - 1];
  const rankingRows = sortedRankings.map((ranking, index) => ({
    key: `${ranking.Value}:${ranking.CardSymbol}:${index}`,
    label: ranking.CardSymbol || ranking.CardName || String(ranking.Value),
    symbol: ranking.CardSymbol || String(ranking.Value),
  }));
  const rankingByRowKey = new Map(
    rankingRows.map((row, index) => [row.key, sortedRankings[index]] as const)
  );

  const getDeckTypeLabel = (type: DeckType): string => {
    switch (type) {
      case DeckType.Standard52:
        return 'Standard 52-Card';
      case DeckType.Standard52PlusJokers:
        return 'Standard 52-Card + Jokers';
      case DeckType.Extended54:
        return 'Extended 54-Card';
      case DeckType.Custom:
        return 'Custom';
      default:
        return type;
    }
  };

  return (
    <div
      className={['card-ranking-preview', compact ? 'card-ranking-preview--compact' : ''].filter(Boolean).join(' ')}
      style={compactStyle}
    >
      <div className="card-ranking-preview__header">
        <h2 className="card-ranking-preview__title">{assetId}</h2>
        <div className="card-ranking-preview__metadata">
          <div className="card-ranking-preview__metadata-item">
            <span className="card-ranking-preview__metadata-label">Deck Type:</span>
            <span className="card-ranking-preview__metadata-value">{getDeckTypeLabel(deckType)}</span>
          </div>
          <div className="card-ranking-preview__metadata-item">
            <span className="card-ranking-preview__metadata-label">Expected Cards:</span>
            <span className="card-ranking-preview__metadata-value">{expectedCardCount}</span>
          </div>
          {includesJokers && (
            <div className="card-ranking-preview__metadata-item">
              <span className="card-ranking-preview__metadata-label">Includes Jokers:</span>
              <span className="card-ranking-preview__metadata-value">Yes</span>
            </div>
          )}
          <div className="card-ranking-preview__metadata-item">
            <span className="card-ranking-preview__metadata-label">Back Cards:</span>
            <span className="card-ranking-preview__metadata-value">{backCardCount}</span>
          </div>
        </div>
      </div>

      <div className="card-ranking-preview__content">
        {compact && compactControlValues.showSuitIcons && sortedSuits.length > 0 ? (
          <SuitIconStrip suits={sortedSuits} />
        ) : null}

        <div className="card-ranking-preview__value-summary">
          <div className="card-ranking-preview__value-summary-item">
            <span className="card-ranking-preview__value-summary-label">Strongest</span>
            <span className="card-ranking-preview__value-summary-value">
              {strongestRank ? `${strongestRank.CardSymbol || strongestRank.CardName} = ${strongestRank.Value}` : 'None'}
            </span>
          </div>
          <div className="card-ranking-preview__value-summary-item">
            <span className="card-ranking-preview__value-summary-label">Weakest</span>
            <span className="card-ranking-preview__value-summary-value">
              {weakestRank ? `${weakestRank.CardSymbol || weakestRank.CardName} = ${weakestRank.Value}` : 'None'}
            </span>
          </div>
          <div className="card-ranking-preview__value-summary-item">
            <span className="card-ranking-preview__value-summary-label">Ranks</span>
            <span className="card-ranking-preview__value-summary-value">{sortedRankings.length}</span>
          </div>
          <div className="card-ranking-preview__value-summary-item">
            <span className="card-ranking-preview__value-summary-label">Suits</span>
            <span className="card-ranking-preview__value-summary-value">{sortedSuits.length}</span>
          </div>
        </div>

        {!compact && (
          <>
            <div className="card-ranking-preview__section card-ranking-preview__section--suits">
              <h3 className="card-ranking-preview__section-title">Suit Axis</h3>
              <div className="card-ranking-preview__suit-strip">
                {sortedSuits.map((suit, index) => {
                  const isRedSuit = isRedRankingSuit(suit);
                  const colorLabel = isRedSuit ? 'Red' : 'Black';
                  const suitColorClass = isRedSuit
                    ? 'card-ranking-preview__suit-symbol--red'
                    : 'card-ranking-preview__suit-symbol--black';
                  const pillClass = [
                    'card-ranking-preview__suit-color',
                    isRedSuit ? 'card-ranking-preview__suit-color--red' : 'card-ranking-preview__suit-color--black',
                  ].join(' ');

                  return (
                    <div key={index} className="card-ranking-preview__suit-item">
                      <div className={['card-ranking-preview__suit-symbol', suitColorClass].join(' ')}>
                        <RankingSuitGlyph suit={suit} />
                      </div>
                      <div className="card-ranking-preview__suit-info">
                        <div className="card-ranking-preview__suit-name">{suit.SuitName}</div>
                        <div className="card-ranking-preview__suit-order">Order: {suit.DisplayOrder}</div>
                        <div className={pillClass}>{colorLabel}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card-ranking-preview__section card-ranking-preview__section--ladder">
              <h3 className="card-ranking-preview__section-title">Rank Value Ladder</h3>
              <div className="card-ranking-preview__rank-ladder">
                {sortedRankings.map((ranking) => (
                  <div key={`${ranking.Value}-${ranking.CardSymbol}`} className="card-ranking-preview__rank-chip">
                    <span className="card-ranking-preview__rank-chip-symbol">
                      {ranking.CardSymbol || ranking.CardName}
                    </span>
                    <span className="card-ranking-preview__rank-chip-value">{ranking.Value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="card-ranking-preview__section card-ranking-preview__section--matrix">
          <h3 className="card-ranking-preview__section-title">Value Matrix</h3>
          {compact ? (
            <CompactRankingValueMatrix rankings={sortedRankings} suits={sortedSuits} />
          ) : (
            <CardGridMatrix
              rows={rankingRows}
              columns={sortedSuits.map((suit) => ({
                key: suit.SuitName,
                label: suit.SuitName,
                symbol: suit.SuitSymbol || suit.SuitName,
                color: isRedRankingSuit(suit) ? 'red' : 'black',
              }))}
              renderCell={(rankKey) => {
                const ranking = rankingByRowKey.get(rankKey);
                return (
                  <div className="card-ranking-preview__matrix-value">
                    <span>{ranking?.Value ?? '-'}</span>
                  </div>
                );
              }}
              emptyMessage="No suit/rank matrix in this ranking asset."
            />
          )}
        </div>

        {meaningfulExplicitEntries.length > 0 && (
          <div className="card-ranking-preview__section card-ranking-preview__section--overrides">
            <h3 className="card-ranking-preview__section-title">Explicit Overrides</h3>
            <div className="card-ranking-preview__override-list">
              {meaningfulExplicitEntries.map((entry) => (
                <div key={`${entry.id || 'entry'}-${entry.order || 0}`} className="card-ranking-preview__override-item">
                  <span className="card-ranking-preview__override-name">{entry.label || entry.id || 'Unnamed'}</span>
                  <span>Copies {entry.copies ?? 1}</span>
                  {entry.points !== null && entry.points !== undefined ? <span>Points {entry.points}</span> : null}
                  {entry.kind ? <span>{entry.kind}</span> : null}
                  {entry.suit || entry.rank ? <span>{[entry.rank, entry.suit].filter(Boolean).join(' of ')}</span> : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function px(value: number | undefined): string | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}px` : undefined;
}

function buildRankingPreviewCompactStyle(
  controls: Required<SelectedGameRankingVisualControls>
): RankingPreviewStyle {
  return {
    '--ranking-suit-icon-gap': px(controls.suitIconGap),
    '--ranking-suit-icon-glyph-size': px(controls.suitIconGlyphSize),
    '--ranking-suit-icon-glyph-font': px(controls.suitIconGlyphFont),
    '--ranking-suit-icon-label-font': px(controls.suitIconLabelFont),
    '--ranking-suit-icon-radius': px(controls.suitIconRadius),
    '--ranking-suit-icon-pad-y': px(controls.suitIconPadY),
    '--ranking-suit-icon-pad-x': px(controls.suitIconPadX),
    '--ranking-summary-gap': px(controls.summaryGap),
    '--ranking-summary-label-font': px(controls.summaryLabelFont),
    '--ranking-summary-value-font': px(controls.summaryValueFont),
    '--ranking-summary-pad-y': px(controls.summaryPadY),
    '--ranking-summary-pad-x': px(controls.summaryPadX),
    '--ranking-matrix-row-height': px(controls.matrixRowHeight),
    '--ranking-matrix-rank-column-width': px(controls.matrixRankColumnWidth),
    '--ranking-matrix-cell-font': px(controls.matrixCellFont),
    '--ranking-matrix-header-font': px(controls.matrixHeaderFont),
    '--ranking-matrix-cell-pad-y': px(controls.matrixCellPadY),
    '--ranking-matrix-cell-pad-x': px(controls.matrixCellPadX),
    '--ranking-matrix-radius': px(controls.matrixRadius),
    '--ranking-matrix-scrollbar-size': px(controls.matrixScrollbarSize),
  };
}

const SuitIconStrip: React.FC<{ suits: CardSuitEntry[] }> = ({ suits }) => (
  <div className="card-ranking-preview__suit-icon-strip">
    {suits.map((suit) => {
      const isRedSuit = isRedRankingSuit(suit);
      return (
        <div
          key={suit.SuitName}
          className={[
            'card-ranking-preview__suit-icon-card',
            isRedSuit
              ? 'card-ranking-preview__suit-icon-card--red'
              : 'card-ranking-preview__suit-icon-card--black',
          ].join(' ')}
          title={suit.SuitName}
        >
          <span className="card-ranking-preview__suit-icon-glyph">
            <RankingSuitGlyph suit={suit} />
          </span>
          <span className="card-ranking-preview__suit-icon-name">{suit.SuitName}</span>
        </div>
      );
    })}
  </div>
);

const CompactRankingValueMatrix: React.FC<{
  rankings: CardRankingEntry[];
  suits: CardSuitEntry[];
}> = ({ rankings, suits }) => {
  if (rankings.length === 0 || suits.length === 0) {
    return <div className="card-ranking-preview__compact-empty">No suit/rank matrix in this ranking asset.</div>;
  }

  return (
    <div
      className="card-ranking-preview__compact-matrix"
      style={{ '--ranking-suit-count': String(suits.length) } as React.CSSProperties}
    >
      <div className="card-ranking-preview__compact-corner">Rank</div>
      {suits.map((suit) => (
        <div
          key={suit.SuitName}
          className={[
            'card-ranking-preview__compact-suit-head',
            isRedRankingSuit(suit)
              ? 'card-ranking-preview__compact-suit-head--red'
              : 'card-ranking-preview__compact-suit-head--black',
          ].join(' ')}
          title={suit.SuitName}
        >
          <RankingSuitGlyph suit={suit} />
        </div>
      ))}
      {rankings.map((ranking) => (
        <React.Fragment key={`${ranking.Value}-${ranking.CardSymbol}`}>
          <div className="card-ranking-preview__compact-rank-head">
            <span>{ranking.CardSymbol || ranking.CardName}</span>
          </div>
          {suits.map((suit) => (
            <div key={`${ranking.Value}-${suit.SuitName}`} className="card-ranking-preview__compact-value">
              {ranking.Value}
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

const RankingSuitGlyph: React.FC<{ suit: CardSuitEntry }> = ({ suit }) => {
  const normalizedSuit = getRankingSuit(suit);
  if (normalizedSuit) {
    return (
      <SuitIcon
        suit={normalizedSuit}
        variant="filled"
        size={28}
        showRings={false}
        shadowGlow={false}
        title={suit.SuitName}
        style={{ width: '100%', height: '100%' }}
      />
    );
  }

  return <>{suit.SuitSymbol || suit.SuitName.slice(0, 1)}</>;
};

function getRankingSuit(suit: CardSuitEntry): Suit | null {
  return normalizeSuit(suit.SuitSymbol) ?? normalizeSuit(suit.SuitName);
}

function isRedRankingSuit(suit: CardSuitEntry): boolean {
  const nameLower = String(suit.SuitName).toLowerCase();
  const colorLower = String(suit.SuitColor ?? '').toLowerCase();
  return nameLower.includes('heart') ||
    nameLower.includes('diamond') ||
    colorLower.includes('red');
}

function isMeaningfulExplicitRankingEntry(entry: ExplicitRankingEntry): boolean {
  const label = entry.label?.trim();
  const id = entry.id?.trim();
  return (entry.points !== null && entry.points !== undefined) ||
    Boolean(entry.kind) ||
    Boolean(entry.suit) ||
    (entry.rank !== null && entry.rank !== undefined) ||
    Boolean(label && id && label !== id);
}
