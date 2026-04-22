import React, { useEffect, useState, useRef } from 'react';
import { Deck } from '@ocentra/game-asset-domain/card/deck/Deck';
import { Card } from '@ocentra/game-asset-domain/card/cardBase/Card';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { Suit } from '@ocentra/game-domain/types/game';
import type { CardValue } from '@ocentra/game-domain/types/game';
import { useImageUrl } from '@/hooks/useImageUrl';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import type { AssetType } from '@ocentra/asset-domain/types/assetType';
import { CardRanking } from '@ocentra/game-asset-domain/card/cardRanking/CardRanking';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { CardGridMatrix } from '@ocentra/core-ui';
import { extractDeckTemplateRefs } from '@/lib/assets/card/deck/deckTemplateRefs';
import './DeckPreview.css';

interface DeckPreviewProps {
  assetId: string;
  assetInstance?: Deck | null;
  assetData?: { data?: Record<string, unknown> } | null;
}

const CardCell: React.FC<{ card: Card | undefined }> = ({ card }) => {
  const imageHash = card?.imageHash as ImageHash | null;
  const { imageUrl } = useImageUrl(imageHash || null);

  return (
    <div className={`deck-preview__matrix-cell ${card ? 'deck-preview__matrix-cell--has-card' : 'deck-preview__matrix-cell--empty'}`}>
      {card && imageUrl ? (
        <img
          src={imageUrl}
          alt={card.getCardId()}
          className="deck-preview__matrix-card-image"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : card ? (
        <div className="deck-preview__matrix-card-placeholder">✓</div>
      ) : (
        <div className="deck-preview__matrix-card-empty">—</div>
      )}
    </div>
  );
};

const DeckPreviewMatrix: React.FC<{
  cards: Card[];
  suitOrder: string[];
  rankOrder: CardValue[];
  cardRanking?: CardRanking | null;
}> = ({ cards, suitOrder, rankOrder, cardRanking }) => {
  const cardMap = new Map<string, Card>();
  cards.forEach(card => {
    const identity = card.cardIdentity;
    if (!('suit' in identity) || !('value' in identity)) return;
    const key = `${identity.suit}_${identity.value}`;
    cardMap.set(key, card);
  });

  const getRankSymbol = (rank: CardValue): string => {
    if (!cardRanking) return rank.toString();
    return cardRanking.getRankSymbol(rank) || rank.toString();
  };

  const getSuitSymbol = (suit: string): string => {
    if (cardRanking) {
      const symbol = cardRanking.getSuitSymbol(suit);
      if (symbol) return symbol;
    }
    return suit.charAt(0).toUpperCase() + suit.slice(1);
  };

  return (
    <CardGridMatrix
      rows={suitOrder.map((suit) => ({ key: suit, label: getSuitSymbol(suit) }))}
      columns={rankOrder.map((rank) => ({ key: String(rank), label: getRankSymbol(rank) }))}
      renderCell={(suit, rank) => <CardCell card={cardMap.get(`${suit}_${Number(rank)}`)} />}
      emptyMessage="No card matrix available."
    />
  );
};

export const DeckPreview: React.FC<DeckPreviewProps> = ({ assetId, assetInstance, assetData }) => {
  const [loadedCards, setLoadedCards] = useState<Card[]>([]);
  const [backCardHash, setBackCardHash] = useState<ImageHash>('' as ImageHash);
  const [suitOrder, setSuitOrder] = useState<string[]>([Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS]);
  const [rankOrder, setRankOrder] = useState<CardValue[]>([14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const [cardRanking, setCardRanking] = useState<CardRanking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isLoadingRef = useRef<boolean>(false);
  const hasLoadedRef = useRef<boolean>(false);
  const lastGuidsRef = useRef<string>('');

  useEffect(() => {
    // Reset state when inputs change to allow a fresh load
    hasLoadedRef.current = false;
    isLoadingRef.current = false;
    lastGuidsRef.current = '';
  }, [assetId, assetInstance, assetData]);

  useEffect(() => {
    let isCancelled = false;

    const loadCards = async () => {
      // Synchronous Guard: Block StrictMode double-fire immediately
      if (isLoadingRef.current || hasLoadedRef.current) {
        return;
      }

      isLoadingRef.current = true;
      setIsLoading(true);

      const log = AssetEditorLogger.instance;

      try {
        let deck: Deck | null = null;
        let cardTemplatesToLoad: unknown[] = [];
        let backCardToSet: ImageHash = '' as ImageHash;

        // 1. Resolve the source of data (prioritizing existing instance)
        if (assetInstance) {
          deck = assetInstance;
          cardTemplatesToLoad = deck.getExpandedCardTemplateRefs();
          backCardToSet = deck.backCardHash || ('' as ImageHash);
        } else if (assetData?.data) {
          cardTemplatesToLoad = extractDeckTemplateRefs(assetData.data.cardTemplates, assetData.data.cardComposition);
          backCardToSet = (assetData.data.backCardHash || '') as ImageHash;

          const system = (assetData as { system?: { guid?: string } }).system;
          const guid = system?.guid;

          if (guid) {
            try {
              deck = await ScriptableObject.loadByGuid(Deck, AssetGUID.from(guid));
              if (deck && !isCancelled) {
                cardTemplatesToLoad = deck.getExpandedCardTemplateRefs();
                backCardToSet = deck.backCardHash || ('' as ImageHash);
              }
            } catch {
              // Failed to load deck by GUID, fallback to templates from assetData
            }
          }
        }

        if (isCancelled) return;

        // 2. Optimization: Check if content actually changed
        const currentGuids = cardTemplatesToLoad
          .map((t: unknown) => {
            if (t instanceof AssetResourceEntry) return t.guid;
            if (t && typeof t === 'object' && 'guid' in t) return (t as { guid: string }).guid;
            if (t && typeof t === 'object' && 'ref' in t) {
              const refValue = (t as { ref: { guid: string } | string }).ref;
              return typeof refValue === 'string' ? refValue : refValue?.guid;
            }
            return 'unknown';
          })
          .filter(Boolean)
          .join(',');

        if (currentGuids === lastGuidsRef.current && hasLoadedRef.current) {
          setIsLoading(false);
          isLoadingRef.current = false;
          return;
        }

        lastGuidsRef.current = currentGuids;
        const loadStart = performance.now();

        // 3. Parallel Card Loading Pattern
        const cardPromises = cardTemplatesToLoad.map(async (refOrObj) => {
          if (isCancelled) return null;

          let ref: AssetResourceEntry<Card>;
          if (refOrObj instanceof AssetResourceEntry) {
            ref = refOrObj;
          } else if (refOrObj && typeof refOrObj === 'object') {
            if ('ref' in refOrObj) {
              const refValue = (refOrObj as { ref?: { guid?: string } | string }).ref;
              if (typeof refValue === 'string') {
                ref = AssetResourceEntry.fromGuid<Card>(refValue, Card.assetType! as AssetType);
              } else if (refValue && typeof refValue === 'object' && 'guid' in refValue && typeof refValue.guid === 'string') {
                ref = AssetResourceEntry.fromGuid<Card>(refValue.guid, Card.assetType! as AssetType);
              } else {
                return null;
              }
            } else if ('guid' in refOrObj && typeof (refOrObj as { guid: unknown }).guid === 'string') {
              ref = AssetResourceEntry.fromGuid<Card>((refOrObj as { guid: string }).guid, Card.assetType! as AssetType);
            } else {
              return null;
            }
          } else {
            return null;
          }

          return await ref.load(Card);
        });

        const results = await Promise.all(cardPromises);

        if (isCancelled) return;

        const validCards = results.filter((c): c is Card => c !== null);
        setLoadedCards(validCards);
        setBackCardHash(backCardToSet);

        // 4. Resolve Ranking and Orders
        if (deck) {
          const [ranking, suits, ranks] = await Promise.all([
            deck.getCardRanking(),
            deck.getSuitOrder(),
            deck.getRankOrder()
          ]);

          if (!isCancelled) {
            setCardRanking(ranking);
            setSuitOrder(suits);
            setRankOrder(ranks);
          }
        } else if (validCards.length > 0) {
          // Fallback extraction if no deck instance
          const suits = new Set<Suit>();
          const ranks = new Set<CardValue>();
          validCards.forEach(card => {
            const identity = card.cardIdentity;
            if ('suit' in identity) suits.add(identity.suit as Suit);
            if ('value' in identity) ranks.add(identity.value as CardValue);
          });
          const standardSuitOrder = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
          setSuitOrder(standardSuitOrder.filter(suit => suits.has(suit)));
          setRankOrder(Array.from(ranks).sort((a, b) => b - a));
        }

        if (!isCancelled) {
          const loadEnd = performance.now();
          log.logInfo('[DeckPreview] Cards loaded (Parallel complete)', getStackTrace(), {
            loadedCount: validCards.length,
            elapsed: (loadEnd - loadStart).toFixed(2) + 'ms'
          });
          hasLoadedRef.current = true;
        }
      } catch (error) {
        if (!isCancelled) {
          log.logError('Failed to load deck cards in parallel', getStackTrace(), error);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          isLoadingRef.current = false;
        }
      }
    };

    loadCards();

    return () => {
      isCancelled = true;
    };
  }, [assetId, assetInstance, assetData]);

  if (isLoading) {
    return (
      <div className="preview-panel__content">
        <div className="preview-panel__placeholder">
          <div className="preview-panel__loading">
            <div className="preview-panel__spinner"></div>
          </div>
          <p className="preview-panel__placeholder-subtitle">Loading deck...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-panel__content preview-panel__content--deck">
      <div className="deck-preview">
        <div className="deck-preview__header">
          <h2 className="deck-preview__title">{assetId}</h2>
          <p className="deck-preview__subtitle">
            {loadedCards.length} card{loadedCards.length !== 1 ? 's' : ''} in deck
          </p>
        </div>
        <DeckPreviewMatrix cards={loadedCards} suitOrder={suitOrder} rankOrder={rankOrder} cardRanking={cardRanking} />
        {backCardHash && (
          <div className="deck-preview__back-cards">
            <div className="deck-preview__back-cards-header">
              <h3 className="deck-preview__back-cards-title">Back Card</h3>
            </div>
            <div className="deck-preview__back-cards-grid">
              <BackCardCell hash={backCardHash} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const BackCardCell: React.FC<{ hash: ImageHash }> = ({ hash }) => {
  const { imageUrl } = useImageUrl(hash);

  return (
    <div className="deck-preview__back-card-cell">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Back card"
          className="deck-preview__back-card-image"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="deck-preview__back-card-placeholder">✓</div>
      )}
    </div>
  );
};

