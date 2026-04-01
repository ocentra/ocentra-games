import { useState } from 'react';
import { CardRanking, CardRankingEntry } from '@ocentra/game-asset-domain/card/cardRanking/CardRanking';
import type { InspectorComponent } from '@/lib/core/inspector/types';
import './CardRankingInspector.css';



export const CardRankingInspector: InspectorComponent<CardRanking | Record<string, unknown>> = ({ data, onFieldChange }) => {
  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);
  
  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;
  const rankingsData = (assetData.rankings || []) as CardRankingEntry[];

  const [rankings, setRankings] = useState<CardRankingEntry[]>(rankingsData);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newCardName, setNewCardName] = useState('');
  const [newValue, setNewValue] = useState<number>(0);

  const handleAddRanking = () => {
    if (!newCardName.trim()) {
      return;
    }

    const maxDisplayOrder = rankings.length > 0 
      ? Math.max(...rankings.map(r => r.DisplayOrder || 0))
      : 0;

    const newRanking: CardRankingEntry = {
      CardName: newCardName.trim(),
      Value: newValue,
      CardSymbol: newCardName.trim().charAt(0).toUpperCase(),
      DisplayOrder: maxDisplayOrder + 1,
    };

    const updated = [...rankings, newRanking];
    setRankings(updated);

    if (onFieldChange) {
      onFieldChange('rankings', updated);
    }

    setNewCardName('');
    setNewValue(0);
  };

  const handleDeleteRanking = (index: number) => {
    const updated = rankings.filter((_, i) => i !== index);
    setRankings(updated);

    if (onFieldChange) {
      onFieldChange('rankings', updated);
    }
  };

  const handleUpdateRanking = (index: number, field: keyof CardRankingEntry, value: string | number) => {
    const updated = [...rankings];
    updated[index] = { ...updated[index], [field]: value };
    setRankings(updated);

    if (onFieldChange) {
      onFieldChange('rankings', updated);
    }
  };

  const handleMoveRanking = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === rankings.length - 1) return;

    const updated = [...rankings];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    setRankings(updated);

    if (onFieldChange) {
      onFieldChange('rankings', updated);
    }
  };

  return (
    <div className="card-ranking-inspector">
      <div className="card-ranking-inspector__header">
        <div className="card-ranking-inspector__title">Card Rankings</div>
        <div className="card-ranking-inspector__count">{rankings.length} ranking{rankings.length !== 1 ? 's' : ''}</div>
      </div>

      {rankings.length > 0 && (
        <div className="card-ranking-inspector__table">
          <div className="card-ranking-inspector__table-header">
            <div className="card-ranking-inspector__table-cell card-ranking-inspector__table-cell--rank">Rank</div>
            <div className="card-ranking-inspector__table-cell card-ranking-inspector__table-cell--name">Card Name</div>
            <div className="card-ranking-inspector__table-cell card-ranking-inspector__table-cell--value">Value</div>
            <div className="card-ranking-inspector__table-cell card-ranking-inspector__table-cell--actions">Actions</div>
          </div>
          {rankings.map((ranking, index) => (
            <div key={index} className="card-ranking-inspector__table-row">
              <div className="card-ranking-inspector__table-cell card-ranking-inspector__table-cell--rank">
                {index + 1}
              </div>
              <div className="card-ranking-inspector__table-cell card-ranking-inspector__table-cell--name">
                {editingIndex === index ? (
                  <input
                    type="text"
                    className="card-ranking-inspector__input"
                    value={ranking.CardName}
                    onChange={(e) => handleUpdateRanking(index, 'CardName', e.target.value)}
                    onBlur={() => setEditingIndex(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setEditingIndex(null);
                      }
                    }}
                    aria-label="Edit card name"
                  />
                ) : (
                  <span
                    className="card-ranking-inspector__editable-text"
                    onClick={() => setEditingIndex(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setEditingIndex(index);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    title="Click to edit"
                    aria-label="Click to edit card name"
                  >
                    {ranking.CardName}
                  </span>
                )}
              </div>
              <div className="card-ranking-inspector__table-cell card-ranking-inspector__table-cell--value">
                {editingIndex === index ? (
                  <input
                    type="number"
                    className="card-ranking-inspector__input card-ranking-inspector__input--number"
                    value={ranking.Value}
                    onChange={(e) => handleUpdateRanking(index, 'Value', parseInt(e.target.value, 10) || 0)}
                    onBlur={() => setEditingIndex(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setEditingIndex(null);
                      }
                    }}
                    aria-label="Edit card value"
                  />
                ) : (
                  <span
                    className="card-ranking-inspector__editable-text"
                    onClick={() => setEditingIndex(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setEditingIndex(index);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    title="Click to edit"
                    aria-label="Click to edit card value"
                  >
                    {ranking.Value}
                  </span>
                )}
              </div>
              <div className="card-ranking-inspector__table-cell card-ranking-inspector__table-cell--actions">
                <button
                  type="button"
                  className="card-ranking-inspector__action-button"
                  onClick={() => handleMoveRanking(index, 'up')}
                  disabled={index === 0}
                  title="Move up"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="card-ranking-inspector__action-button"
                  onClick={() => handleMoveRanking(index, 'down')}
                  disabled={index === rankings.length - 1}
                  title="Move down"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="card-ranking-inspector__action-button card-ranking-inspector__action-button--delete"
                  onClick={() => handleDeleteRanking(index)}
                  title="Delete"
                  aria-label="Delete"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card-ranking-inspector__add">
        <div className="card-ranking-inspector__add-header">Add New Ranking</div>
        <div className="card-ranking-inspector__add-fields">
          <input
            type="text"
            className="card-ranking-inspector__input"
            placeholder="Card Name"
            value={newCardName}
            onChange={(e) => setNewCardName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newCardName.trim()) {
                handleAddRanking();
              }
            }}
            title="Card Name"
          />
          <input
            type="number"
            className="card-ranking-inspector__input card-ranking-inspector__input--number"
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(parseInt(e.target.value, 10) || 0)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newCardName.trim()) {
                handleAddRanking();
              }
            }}
            title="Value"
          />
          <button
            type="button"
            className="card-ranking-inspector__add-button"
            onClick={handleAddRanking}
            disabled={!newCardName.trim()}
            title="Add ranking"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};



