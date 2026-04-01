import { useState } from 'react';
import { CardGameScoring, ScoringType } from '@ocentra/game-asset-domain/game/scoring/CardGameScoring';
import { ScoringInspector } from './ScoringInspector';
import type { InspectorComponent } from '@/lib/core/inspector/types';
import './ScoringInspector.css';

export const CardGameScoringInspector: InspectorComponent<CardGameScoring | Record<string, unknown>> = ({ 
  data, 
  onFieldChange, 
  onNavigateToAsset 
}) => {
  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);
  
  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;

  const scoringType = (assetData.scoringType || ScoringType.HoardersMultiplier) as ScoringType;
  const patternMultipliers = (assetData.patternMultipliers || {}) as Record<string, number>;
  const priorityOrder = (assetData.priorityOrder || []) as string[];

  const [multipliers, setMultipliers] = useState<Array<{ key: string; value: number }>>(
    Object.entries(patternMultipliers).map(([key, value]) => ({ key, value }))
  );
  const [newMultiplierKey, setNewMultiplierKey] = useState('');
  const [newMultiplierValue, setNewMultiplierValue] = useState('');
  const [priorities, setPriorities] = useState<string[]>(priorityOrder);
  const [newPriority, setNewPriority] = useState('');

  const handleFieldChange = (field: string, value: unknown) => {
    if (onFieldChange) {
      onFieldChange(field, value);
    }
  };

  const handleMultipliersChange = (updated: Array<{ key: string; value: number }>) => {
    setMultipliers(updated);
    const dict: Record<string, number> = {};
    updated.forEach(({ key, value }) => {
      if (key.trim()) {
        dict[key.trim()] = value;
      }
    });
    handleFieldChange('patternMultipliers', dict);
  };

  const handleAddMultiplier = () => {
    if (!newMultiplierKey.trim()) return;
    const updated = [...multipliers, { key: newMultiplierKey.trim(), value: Number(newMultiplierValue) || 0 }];
    handleMultipliersChange(updated);
    setNewMultiplierKey('');
    setNewMultiplierValue('');
  };

  const handleRemoveMultiplier = (index: number) => {
    const updated = multipliers.filter((_, i) => i !== index);
    handleMultipliersChange(updated);
  };

  const handlePrioritiesChange = (updated: string[]) => {
    setPriorities(updated);
    handleFieldChange('priorityOrder', updated);
  };

  const handleAddPriority = () => {
    if (!newPriority.trim()) return;
    const updated = [...priorities, newPriority.trim()];
    handlePrioritiesChange(updated);
    setNewPriority('');
  };

  const handleRemovePriority = (index: number) => {
    const updated = priorities.filter((_, i) => i !== index);
    handlePrioritiesChange(updated);
  };

  return (
    <div className="card-game-scoring-inspector">
      <ScoringInspector data={data} onFieldChange={onFieldChange} onNavigateToAsset={onNavigateToAsset} />

      <div className="scoring-inspector__section">
        <div className="scoring-inspector__section-header">Card Game Specific</div>
        
        <div className="scoring-inspector__field">
          <label htmlFor="scoring-type" className="scoring-inspector__label">Scoring Type</label>
          <select
            id="scoring-type"
            value={scoringType}
            onChange={(e) => handleFieldChange('scoringType', e.target.value)}
            className="scoring-inspector__select"
          >
            <option value={ScoringType.PokerRanking}>Poker Ranking</option>
            <option value={ScoringType.HoardersMultiplier}>Hoarder's Multiplier</option>
            <option value={ScoringType.Custom}>Custom</option>
          </select>
        </div>

        <div className="scoring-inspector__field">
          <div className="scoring-inspector__label">Pattern Multipliers</div>
          <div className="scoring-inspector__array-items">
            {multipliers.map((item, index) => (
              <div key={index} className="scoring-inspector__array-item">
                <input
                  type="text"
                  value={item.key}
                  onChange={(e) => {
                    const updated = [...multipliers];
                    updated[index] = { ...updated[index], key: e.target.value };
                    handleMultipliersChange(updated);
                  }}
                  className="scoring-inspector__input"
                  placeholder="Pattern"
                />
                <input
                  type="number"
                  value={item.value}
                  onChange={(e) => {
                    const updated = [...multipliers];
                    updated[index] = { ...updated[index], value: Number(e.target.value) || 0 };
                    handleMultipliersChange(updated);
                  }}
                  className="scoring-inspector__input"
                  placeholder="Multiplier"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveMultiplier(index)}
                  className="scoring-inspector__remove-button"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="scoring-inspector__add-item">
            <input
              type="text"
              value={newMultiplierKey}
              onChange={(e) => setNewMultiplierKey(e.target.value)}
              className="scoring-inspector__input"
              placeholder="Pattern"
            />
            <input
              type="number"
              value={newMultiplierValue}
              onChange={(e) => setNewMultiplierValue(e.target.value)}
              className="scoring-inspector__input"
              placeholder="Multiplier"
            />
            <button
              type="button"
              onClick={handleAddMultiplier}
              className="scoring-inspector__add-button"
              title="Add Multiplier"
            >
              +
            </button>
          </div>
        </div>

        <div className="scoring-inspector__field">
          <div className="scoring-inspector__label">Priority Order</div>
          <div className="scoring-inspector__array-items">
            {priorities.map((priority, index) => (
              <div key={index} className="scoring-inspector__array-item">
                <input
                  type="text"
                  value={priority}
                  onChange={(e) => {
                    const updated = [...priorities];
                    updated[index] = e.target.value;
                    handlePrioritiesChange(updated);
                  }}
                  className="scoring-inspector__input"
                  placeholder="Pattern"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePriority(index)}
                  className="scoring-inspector__remove-button"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="scoring-inspector__add-item">
            <input
              type="text"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPriority()}
              className="scoring-inspector__input"
              placeholder="Enter pattern"
            />
            <button
              type="button"
              onClick={handleAddPriority}
              className="scoring-inspector__add-button"
              title="Add Priority"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
