import { useState } from 'react';
import type { InspectorComponent } from '@/lib/core/inspector/types';


import { GameRules } from '@ocentra/game-asset-domain/game/gameRules/GameRules';
import './GameRulesInspector.css';

export const GameRulesInspector: InspectorComponent<GameRules | Record<string, unknown>> = ({ data, onFieldChange }) => {
  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);
  
  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;

  const llmRules = (assetData.LLM || '') as string;
  const playerRules = (assetData.Player || '') as string;
  const conditions = (assetData.moveValidityConditions || {}) as Record<string, string>;
  const examples = (assetData.exampleHands || []) as string[];
  const bonus = (assetData.bonusRules || '') as string;

  const [validityConditions, setValidityConditions] = useState<Array<{ key: string; value: string }>>(
    Object.entries(conditions).map(([key, value]) => ({ key, value }))
  );
  const [newConditionKey, setNewConditionKey] = useState('');
  const [newConditionValue, setNewConditionValue] = useState('');
  const [exampleHands, setExampleHands] = useState<string[]>(examples);
  const [newExampleHand, setNewExampleHand] = useState('');

  const handleFieldChange = (field: string, value: unknown) => {
    if (onFieldChange) {
      onFieldChange(field, value);
    }
  };

  const handleConditionsChange = (updated: Array<{ key: string; value: string }>) => {
    setValidityConditions(updated);
    const dict: Record<string, string> = {};
    updated.forEach(({ key, value }) => {
      if (key.trim()) {
        dict[key.trim()] = value;
      }
    });
    handleFieldChange('moveValidityConditions', dict);
  };

  const handleAddCondition = () => {
    if (!newConditionKey.trim()) return;
    const updated = [...validityConditions, { key: newConditionKey.trim(), value: newConditionValue }];
    handleConditionsChange(updated);
    setNewConditionKey('');
    setNewConditionValue('');
  };

  const handleRemoveCondition = (index: number) => {
    const updated = validityConditions.filter((_, i) => i !== index);
    handleConditionsChange(updated);
  };

  const handleUpdateCondition = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...validityConditions];
    updated[index] = { ...updated[index], [field]: value };
    handleConditionsChange(updated);
  };

  const handleAddExampleHand = () => {
    if (!newExampleHand.trim()) return;
    const updated = [...exampleHands, newExampleHand.trim()];
    setExampleHands(updated);
    handleFieldChange('exampleHands', updated);
    setNewExampleHand('');
  };

  const handleRemoveExampleHand = (index: number) => {
    const updated = exampleHands.filter((_, i) => i !== index);
    setExampleHands(updated);
    handleFieldChange('exampleHands', updated);
  };

  return (
    <div className="game-rules-inspector">
      <div className="game-rules-inspector__section">
        <div className="game-rules-inspector__section-header">LLM Rules</div>
        <div className="game-rules-inspector__field">
          <textarea
            className="game-rules-inspector__textarea"
            value={llmRules}
            onChange={(e) => handleFieldChange('LLM', e.target.value)}
            rows={6}
            placeholder="Enter rules for LLM..."
            title="LLM Rules"
          />
        </div>
      </div>

      <div className="game-rules-inspector__section">
        <div className="game-rules-inspector__section-header">Player Rules</div>
        <div className="game-rules-inspector__field">
          <textarea
            className="game-rules-inspector__textarea"
            value={playerRules}
            onChange={(e) => handleFieldChange('Player', e.target.value)}
            rows={6}
            placeholder="Enter rules for players..."
            title="Player Rules"
          />
        </div>
      </div>

      <div className="game-rules-inspector__section">
        <div className="game-rules-inspector__section-header">Move Validity Conditions</div>
        {validityConditions.length > 0 && (
          <div className="game-rules-inspector__list">
            {validityConditions.map((condition, index) => (
              <div key={index} className="game-rules-inspector__list-item">
                <input
                  type="text"
                  className="game-rules-inspector__input-key"
                  value={condition.key}
                  onChange={(e) => handleUpdateCondition(index, 'key', e.target.value)}
                  placeholder="Condition name"
                  title="Condition key"
                />
                <input
                  type="text"
                  className="game-rules-inspector__input-value"
                  value={condition.value}
                  onChange={(e) => handleUpdateCondition(index, 'value', e.target.value)}
                  placeholder="Description"
                  title="Condition value"
                />
                <button
                  type="button"
                  className="game-rules-inspector__remove-button"
                  onClick={() => handleRemoveCondition(index)}
                  title="Remove condition"
                  aria-label="Remove condition"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="game-rules-inspector__add-item">
          <input
            type="text"
            className="game-rules-inspector__input-key"
            value={newConditionKey}
            onChange={(e) => setNewConditionKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newConditionKey.trim()) {
                handleAddCondition();
              }
            }}
            placeholder="New condition"
            title="New condition key"
          />
          <input
            type="text"
            className="game-rules-inspector__input-value"
            value={newConditionValue}
            onChange={(e) => setNewConditionValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newConditionKey.trim()) {
                handleAddCondition();
              }
            }}
            placeholder="Description"
            title="New condition value"
          />
          <button
            type="button"
            className="game-rules-inspector__add-button"
            onClick={handleAddCondition}
            disabled={!newConditionKey.trim()}
            title="Add condition"
          >
            Add
          </button>
        </div>
      </div>

      <div className="game-rules-inspector__section">
        <div className="game-rules-inspector__section-header">Example Hands</div>
        {exampleHands.length > 0 && (
          <div className="game-rules-inspector__list">
            {exampleHands.map((hand, index) => (
              <div key={index} className="game-rules-inspector__list-item">
                <div className="game-rules-inspector__list-text">{hand}</div>
                <button
                  type="button"
                  className="game-rules-inspector__remove-button"
                  onClick={() => handleRemoveExampleHand(index)}
                  title="Remove example"
                  aria-label="Remove example"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="game-rules-inspector__add-item">
          <input
            type="text"
            className="game-rules-inspector__input-full"
            value={newExampleHand}
            onChange={(e) => setNewExampleHand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newExampleHand.trim()) {
                handleAddExampleHand();
              }
            }}
            placeholder="Add example hand..."
            title="New example hand"
          />
          <button
            type="button"
            className="game-rules-inspector__add-button"
            onClick={handleAddExampleHand}
            disabled={!newExampleHand.trim()}
            title="Add example"
          >
            Add
          </button>
        </div>
      </div>

      <div className="game-rules-inspector__section">
        <div className="game-rules-inspector__section-header">Bonus Rules</div>
        <div className="game-rules-inspector__field">
          <textarea
            className="game-rules-inspector__textarea"
            value={bonus}
            onChange={(e) => handleFieldChange('bonusRules', e.target.value)}
            rows={3}
            placeholder="Enter bonus rules..."
            title="Bonus Rules"
          />
        </div>
      </div>
    </div>
  );
};



