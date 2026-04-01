import { useState } from 'react';
import { Card } from '@ocentra/game-asset-domain/card/cardBase/Card';
import type { InspectorComponent } from '@/lib/core/inspector/types';
import { Suit } from '@ocentra/game-domain/types/game';
import type { CardValue } from '@ocentra/game-domain/types/game';
import { useImageUrl } from '@/hooks/useImageUrl';
import { ImageUploadField } from '@/lib/core/inspector/fields/ImageUploadField';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import './CardInspector.css';

export const CardInspector: InspectorComponent<Card | Record<string, unknown>> = ({ data, onFieldChange }) => {
  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);
  
  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;

  const suit = (assetData.suit || Suit.SPADES) as Suit;
  const rank = (assetData.rank || 2) as CardValue;
  const imageHash = (assetData.imageHash || '') as ImageHash;

  const [currentSuit, setCurrentSuit] = useState<Suit>(suit);
  const [currentRank, setCurrentRank] = useState<CardValue>(rank);
  const [currentImageHash, setCurrentImageHash] = useState<ImageHash>(imageHash);

  const { imageUrl } = useImageUrl(currentImageHash || null);

  const handleSuitChange = (newSuit: Suit) => {
    setCurrentSuit(newSuit);
    if (onFieldChange) {
      onFieldChange('suit', newSuit);
    }
  };

  const handleRankChange = (newRank: CardValue) => {
    setCurrentRank(newRank);
    if (onFieldChange) {
      onFieldChange('rank', newRank);
    }
  };

  const handleImageHashChange = (newHash: string) => {
    const hash = newHash as ImageHash;
    setCurrentImageHash(hash);
    if (onFieldChange) {
      onFieldChange('imageHash', hash);
    }
  };

  const suitOptions = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
  const rankOptions: CardValue[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  const getRankLabel = (rankValue: CardValue): string => {
    const rankMap: Record<number, string> = {
      11: 'Jack',
      12: 'Queen',
      13: 'King',
      14: 'Ace',
    };
    return rankMap[rankValue] || rankValue.toString();
  };

  return (
    <div className="card-inspector">
      <div className="card-inspector__header">
        <div className="card-inspector__title">Card Properties</div>
      </div>

      <div className="card-inspector__preview">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${getRankLabel(currentRank)} of ${currentSuit}`}
            className="card-inspector__preview-image"
          />
        ) : (
          <div className="card-inspector__preview-placeholder">
            <div className="card-inspector__preview-placeholder-icon">🃏</div>
            <div className="card-inspector__preview-placeholder-text">No image</div>
          </div>
        )}
      </div>

      <div className="card-inspector__fields">
        <div className="card-inspector__field card-inspector__field--image-hash">
          <ImageUploadField
            label="Image Hash"
            value={currentImageHash || null}
            onChange={(v) => handleImageHashChange(v ?? '')}
            fieldName="imageHash"
          />
        </div>

        <div className="card-inspector__field">
          <label htmlFor="card-inspector-suit" className="card-inspector__label">Suit</label>
          <select
            id="card-inspector-suit"
            className="card-inspector__select"
            value={currentSuit}
            onChange={(e) => handleSuitChange(e.target.value as Suit)}
          >
            {suitOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="card-inspector__field">
          <label htmlFor="card-inspector-rank" className="card-inspector__label">Rank</label>
          <select
            id="card-inspector-rank"
            className="card-inspector__select"
            value={currentRank}
            onChange={(e) => handleRankChange(parseInt(e.target.value, 10) as CardValue)}
          >
            {rankOptions.map(r => (
              <option key={r} value={r}>{getRankLabel(r)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card-inspector__info">
        <div className="card-inspector__info-row">
          <span className="card-inspector__info-label">Card ID:</span>
          <span className="card-inspector__info-value">{getRankLabel(currentRank).toLowerCase()}_of_{currentSuit}</span>
        </div>
      </div>
    </div>
  );
};

