import { useEffect, useMemo, useState } from 'react';
import { CardGridMatrix } from '@ocentra/core-ui/Common/CardGridMatrix/CardGridMatrix';
import { getGameMode } from '@/adapters/assets/GameCatalogService';
import { useImageUrl } from '@/hooks/useImageUrl';
import type { Card } from '@ocentra/game-asset-domain/card/cardBase/Card';
import { CardGameMode } from '@ocentra/game-asset-domain/gameMode/cardGameMode/CardGameMode';

interface GameCardDeckPreviewProps {
  gameIdentifier: string;
}

function GameCardCell({ card }: { card?: Card }) {
  const hash = card?.imageHash ?? null;
  const { imageUrl } = useImageUrl(hash);

  if (!card) {
    return <span style={{ opacity: 0.45 }}>-</span>;
  }

  if (!imageUrl) {
    return <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>{card.getCardId()}</span>;
  }

  return (
    <img
      src={imageUrl}
      alt={card.getCardId()}
      style={{ width: '100%', maxWidth: '56px', height: '74px', objectFit: 'cover', borderRadius: '4px' }}
      onError={(event) => {
        (event.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

export function GameCardDeckPreview({ gameIdentifier }: GameCardDeckPreviewProps) {
  const normalizedIdentifier = gameIdentifier.includes(':') ? gameIdentifier.split(':')[0] : gameIdentifier;
  const [cards, setCards] = useState<Card[]>([]);
  const [suitOrder, setSuitOrder] = useState<string[]>([]);
  const [rankOrder, setRankOrder] = useState<number[]>([]);
  const [rankLabels, setRankLabels] = useState<Record<number, string>>({});
  const [suitLabels, setSuitLabels] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadDeckPreview = async () => {
      setIsLoading(true);
      try {
        if (!normalizedIdentifier) {
          setCards([]);
          setIsLoading(false);
          return;
        }
        const gameMode = await getGameMode(normalizedIdentifier);
        if (!(gameMode instanceof CardGameMode)) {
          setCards([]);
          setIsLoading(false);
          return;
        }
        const deck = await gameMode?.getDeckAsset();
        if (!deck || cancelled) {
          setCards([]);
          setIsLoading(false);
          return;
        }

        const [allCards, ranking, suits, ranks] = await Promise.all([
          deck.getAllCards(),
          deck.getCardRanking(),
          deck.getSuitOrder(),
          deck.getRankOrder(),
        ]);

        if (cancelled) {
          return;
        }

        const nextRankLabels: Record<number, string> = {};
        const nextSuitLabels: Record<string, string> = {};
        for (const rank of ranks) {
          nextRankLabels[rank] = ranking.getRankSymbol(rank) || String(rank);
        }
        for (const suit of suits) {
          nextSuitLabels[suit] = ranking.getSuitSymbol(suit) || suit;
        }

        setCards(allCards);
        setSuitOrder(suits);
        setRankOrder(ranks);
        setRankLabels(nextRankLabels);
        setSuitLabels(nextSuitLabels);
      } catch {
        if (!cancelled) {
          setCards([]);
          setSuitOrder([]);
          setRankOrder([]);
          setRankLabels({});
          setSuitLabels({});
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDeckPreview();
    return () => {
      cancelled = true;
    };
  }, [normalizedIdentifier]);

  const cardMap = useMemo(() => {
    const map = new Map<string, Card>();
    for (const card of cards) {
      const identity = card.cardIdentity;
      if (!('suit' in identity) || !('value' in identity)) {
        continue;
      }
      map.set(`${identity.suit}_${identity.value}`, card);
    }
    return map;
  }, [cards]);

  if (isLoading) {
    return <div style={{ marginBottom: '1rem', opacity: 0.8 }}>Loading deck preview...</div>;
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <section style={{ marginBottom: '1rem' }}>
      <h3 style={{ margin: '0 0 0.5rem 0' }}>Deck Preview</h3>
      <p style={{ margin: '0 0 0.75rem 0', opacity: 0.8 }}>{cards.length} cards loaded</p>
      <CardGridMatrix
        rows={suitOrder.map((suit) => ({ key: suit, label: suitLabels[suit] || suit }))}
        columns={rankOrder.map((rank) => ({ key: String(rank), label: rankLabels[rank] || String(rank) }))}
        renderCell={(suit, rank) => <GameCardCell card={cardMap.get(`${suit}_${Number(rank)}`)} />}
        emptyMessage="No standard suit/rank matrix available."
      />
      <div style={{ marginTop: '0.75rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0' }}>Card Ranking</h4>
        <CardGridMatrix
          rows={suitOrder.map((suit) => ({ key: suit, label: suitLabels[suit] || suit }))}
          columns={rankOrder.map((rank) => ({ key: String(rank), label: rankLabels[rank] || String(rank) }))}
          renderCell={(suit, rank) => (
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
              {(rankLabels[Number(rank)] || rank)}{suitLabels[suit] || suit}
            </span>
          )}
          emptyMessage="No ranking matrix available."
        />
      </div>
    </section>
  );
}
