import React, { useState, useEffect } from 'react';
import { Card } from '@ocentra/game-asset-domain/card/cardBase/Card';
import { CardRanking } from '@ocentra/game-asset-domain/card/cardRanking/CardRanking';
import { useImageUrl } from '@/hooks/useImageUrl';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import './CardPreview.css';

interface CardPreviewProps {
  assetId: string;
  assetInstance?: Card | null;
  assetData?: { data?: Record<string, unknown> } | null;
}

export const CardPreview: React.FC<CardPreviewProps> = ({ assetId, assetInstance, assetData }) => {
  const data = assetData?.data as Record<string, unknown> | undefined;
  const cardIdentityData = data?.cardIdentity as { suit?: string; value?: number } | undefined;
  const imageHash = (assetInstance?.imageHash || data?.imageHash || '') as ImageHash;
  const identity = assetInstance?.cardIdentity;
  const identitySuit = identity && 'suit' in identity ? identity.suit : undefined;
  const identityValue = identity && 'value' in identity ? identity.value : undefined;
  const suit = (identitySuit || cardIdentityData?.suit || data?.suit || 'spades') as string;
  const rank = (identityValue || cardIdentityData?.value || data?.rank || 2) as number;

  const [cardRanking, setCardRanking] = useState<CardRanking | null>(null);
  const { imageUrl } = useImageUrl(imageHash || null);

  useEffect(() => {
    const loadCardRanking = async () => {
      try {
        const ranking = await CardRanking.getDefault();
        setCardRanking(ranking);
      } catch {
        setCardRanking(null);
      }
    };
    void loadCardRanking();
  }, []);

  const getRankLabel = (rankValue: number): string => {
    if (cardRanking) {
      return cardRanking.getRankName(rankValue);
    }
    const rankMap: Record<number, string> = {
      11: 'Jack',
      12: 'Queen',
      13: 'King',
      14: 'Ace',
    };
    return rankMap[rankValue] || rankValue.toString();
  };

  const getSuitSymbol = (suitName: string): string => {
    if (cardRanking) {
      const symbol = cardRanking.getSuitSymbol(suitName);
      if (symbol) return symbol;
    }
    const suitMap: Record<string, string> = {
      'spades': '♠',
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
    };
    return suitMap[suitName.toLowerCase()] || suitName.charAt(0).toUpperCase();
  };

  const getCardSymbol = (): string => {
    if (cardRanking) {
      return cardRanking.getCardSymbol(suit, rank);
    }
    return `${getRankLabel(rank)}${getSuitSymbol(suit)}`;
  };

  return (
    <div className="preview-panel">
      <div className="preview-panel__content preview-panel__content--card">
        <div className="card-preview">
          <div className="card-preview__header">
            <h2 className="card-preview__title">{assetId}</h2>
            <p className="card-preview__subtitle">
              {getRankLabel(rank)} of {suit}
            </p>
          </div>

          <div className="card-preview__card">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`${getRankLabel(rank)} of ${suit}`}
                className="card-preview__card-image"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="card-preview__card-placeholder">
                <div className="card-preview__card-placeholder-symbol">
                  <div className="card-preview__card-placeholder-rank">{getRankLabel(rank)}</div>
                  <div className="card-preview__card-placeholder-suit">{getSuitSymbol(suit)}</div>
                </div>
                <div className="card-preview__card-placeholder-text">No image</div>
                <div className="card-preview__card-placeholder-symbol-text">{getCardSymbol()}</div>
              </div>
            )}
          </div>

          <div className="card-preview__info">
            <div className="card-preview__info-row">
              <span className="card-preview__info-label">Suit:</span>
              <span className="card-preview__info-value">{suit}</span>
            </div>
            <div className="card-preview__info-row">
              <span className="card-preview__info-label">Rank:</span>
              <span className="card-preview__info-value">{getRankLabel(rank)}</span>
            </div>
            {imageHash && (
              <div className="card-preview__info-row">
                <span className="card-preview__info-label">Image Hash:</span>
                <span className="card-preview__info-value card-preview__info-value--hash">{imageHash}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

