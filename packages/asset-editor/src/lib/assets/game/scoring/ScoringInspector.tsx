import { useState } from 'react';
import { Scoring } from '@ocentra/game-asset-domain/game/scoring/Scoring';
import { AssetGuidReferenceField } from '@/lib/core/inspector/fields/AssetGuidReferenceField';
import { CardRanking } from '@ocentra/game-asset-domain/card/cardRanking/CardRanking';
import type { InspectorComponent } from '@/lib/core/inspector/types';


import './ScoringInspector.css';

export const ScoringInspector: InspectorComponent<Scoring | Record<string, unknown>> = ({ data, onFieldChange, onNavigateToAsset }) => {
  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);
  
  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;
  const cardRankingAssetRef = (assetData.cardRankingAsset || '') as string;
  const scoringFormula = (assetData.scoringFormula || '') as string;
  const scoringRules = (assetData.scoringRules || {}) as Record<string, unknown>;
  
  const [rules, setRules] = useState<Array<{ key: string; value: string }>>(
    Object.entries(scoringRules).map(([key, value]) => ({ key, value: String(value) }))
  );
  const [newRuleKey, setNewRuleKey] = useState('');
  const [newRuleValue, setNewRuleValue] = useState('');

  const handleFieldChange = (field: string, value: unknown) => {
    if (onFieldChange) {
      onFieldChange(field, value);
    }
  };

  const handleRulesChange = (updated: Array<{ key: string; value: string }>) => {
    setRules(updated);
    const dict: Record<string, unknown> = {};
    updated.forEach(({ key, value }) => {
      if (key.trim()) {
        const numValue = Number(value);
        dict[key.trim()] = isNaN(numValue) ? value : numValue;
      }
    });
    handleFieldChange('scoringRules', dict);
  };

  const handleAddRule = () => {
    if (!newRuleKey.trim()) return;
    const updated = [...rules, { key: newRuleKey.trim(), value: newRuleValue }];
    handleRulesChange(updated);
    setNewRuleKey('');
    setNewRuleValue('');
  };

  const handleRemoveRule = (index: number) => {
    const updated = rules.filter((_, i) => i !== index);
    handleRulesChange(updated);
  };

  const handleUpdateRule = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: value };
    handleRulesChange(updated);
  };

  return (
    <div className="scoring-inspector">
      <div className="scoring-inspector__section">
        <div className="scoring-inspector__section-header">Card Ranking Asset</div>
        <div className="scoring-inspector__field">
          <AssetGuidReferenceField
            label="Card Ranking Asset"
            value={typeof cardRankingAssetRef === 'string' ? cardRankingAssetRef : ''}
            onChange={(newValue) => handleFieldChange('cardRankingAsset', newValue)}
            expectedAssetType={CardRanking.name}
            onNavigateToAsset={onNavigateToAsset}
          />
        </div>
      </div>

      <div className="scoring-inspector__section">
        <div className="scoring-inspector__section-header">Scoring Formula</div>
        <div className="scoring-inspector__field">
          <textarea
            className="scoring-inspector__textarea"
            value={scoringFormula}
            onChange={(e) => handleFieldChange('scoringFormula', e.target.value)}
            rows={4}
            title="Scoring Formula"
            placeholder="Enter scoring formula..."
          />
        </div>
      </div>

      <div className="scoring-inspector__section">
        <div className="scoring-inspector__section-header">Scoring Rules</div>
        {rules.length > 0 && (
          <div className="scoring-inspector__rules-list">
            {rules.map((rule, index) => (
              <div key={index} className="scoring-inspector__rule-item">
                <input
                  type="text"
                  className="scoring-inspector__rule-key"
                  value={rule.key}
                  onChange={(e) => handleUpdateRule(index, 'key', e.target.value)}
                  placeholder="Rule name"
                  title="Rule key"
                />
                <input
                  type="text"
                  className="scoring-inspector__rule-value"
                  value={rule.value}
                  onChange={(e) => handleUpdateRule(index, 'value', e.target.value)}
                  placeholder="Rule value"
                  title="Rule value"
                />
                <button
                  type="button"
                  className="scoring-inspector__remove-button"
                  onClick={() => handleRemoveRule(index)}
                  title="Remove rule"
                  aria-label="Remove rule"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="scoring-inspector__add-rule">
          <input
            type="text"
            className="scoring-inspector__rule-key"
            value={newRuleKey}
            onChange={(e) => setNewRuleKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newRuleKey.trim()) {
                handleAddRule();
              }
            }}
            placeholder="New rule name"
            title="Rule key"
          />
          <input
            type="text"
            className="scoring-inspector__rule-value"
            value={newRuleValue}
            onChange={(e) => setNewRuleValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newRuleKey.trim()) {
                handleAddRule();
              }
            }}
            placeholder="New rule value"
            title="Rule value"
          />
          <button
            type="button"
            className="scoring-inspector__add-button"
            onClick={handleAddRule}
            disabled={!newRuleKey.trim()}
            title="Add rule"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};



