import React from 'react';
import { CardRanking } from '@ocentra/game-asset-domain/card/cardRanking/CardRanking';
import type { CardSuitEntry, CardRankingEntry } from '@ocentra/game-asset-domain/card/cardRanking/CardRanking';
import { DeckType } from '@ocentra/game-asset-domain/deck/DeckType';
import { CardGridMatrix } from '@ocentra/core-ui';
import './CardRankingPreview.css';

interface CardRankingPreviewProps {
  assetId: string;
  assetInstance?: CardRanking | null;
  assetData?: { data?: Record<string, unknown> } | null;
}

export const CardRankingPreview: React.FC<CardRankingPreviewProps> = ({ assetId, assetInstance, assetData }) => {
  const data = assetData?.data as Record<string, unknown> | undefined;
  
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
  const explicitEntries = ((assetInstance?.cardEntries || data?.cardEntries || []) as Array<{
    id?: string;
    label?: string | null;
    copies?: number;
    order?: number | null;
  }>).slice();

  const sortedSuits = [...suits].sort((a, b) => (a.DisplayOrder || 0) - (b.DisplayOrder || 0));
  const sortedRankings = [...rankings].sort((a, b) => (b.DisplayOrder || 0) - (a.DisplayOrder || 0));
  const sortedEntries = explicitEntries.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

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
    <div className="card-ranking-preview">
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
        <div className="card-ranking-preview__section">
          <h3 className="card-ranking-preview__section-title">Suits ({sortedSuits.length})</h3>
          <div className="card-ranking-preview__suits">
            {sortedSuits.map((suit, index) => {
              const nameLower = String(suit.SuitName).toLowerCase();
              const isRedSuit = nameLower.includes('heart') || nameLower.includes('diamond');
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
                    {suit.SuitSymbol}
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

        <div className="card-ranking-preview__section">
          <h3 className="card-ranking-preview__section-title">Card Matrix</h3>
          <CardGridMatrix
            rows={sortedSuits.map((suit) => ({ key: suit.SuitName, label: suit.SuitSymbol || suit.SuitName }))}
            columns={sortedRankings.map((ranking) => ({ key: String(ranking.Value), label: ranking.CardSymbol || ranking.CardName }))}
            renderCell={(suitKey, rankKey) => {
              const suit = sortedSuits.find((item) => item.SuitName === suitKey);
              const ranking = sortedRankings.find((item) => String(item.Value) === rankKey);
              const isRedSuit = suit ? String(suit.SuitName).toLowerCase().includes('heart') || String(suit.SuitName).toLowerCase().includes('diamond') : false;
              return (
                <div className="card-ranking-preview__matrix-card">
                  {ranking?.CardSymbol || rankKey}
                  <span
                    className={
                      isRedSuit
                        ? 'card-ranking-preview__matrix-suit-symbol--red'
                        : 'card-ranking-preview__matrix-suit-symbol--black'
                    }
                  >
                    {suit?.SuitSymbol || ''}
                  </span>
                </div>
              );
            }}
            emptyMessage="No suit/rank matrix in this ranking asset."
          />
          {sortedEntries.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <h4 className="card-ranking-preview__section-title">Explicit Entries ({sortedEntries.length})</h4>
              <div className="card-ranking-preview__suits">
                {sortedEntries.map((entry) => (
                  <div key={`${entry.id || 'entry'}-${entry.order || 0}`} className="card-ranking-preview__suit-item">
                    <div className="card-ranking-preview__suit-info">
                      <div className="card-ranking-preview__suit-name">{entry.label || entry.id || 'Unnamed'}</div>
                      <div className="card-ranking-preview__suit-order">Copies: {entry.copies ?? 1}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

