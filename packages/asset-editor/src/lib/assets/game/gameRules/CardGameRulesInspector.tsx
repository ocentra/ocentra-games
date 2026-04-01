import { useState } from 'react';
import type { InspectorComponent } from '@/lib/core/inspector/types';
import { CardGameRules } from '@ocentra/game-asset-domain/game/gameRules/CardGameRules';
import { GameRulesInspector } from './GameRulesInspector';
import { AssetGuidReferenceField } from '@/lib/core/inspector/fields/AssetGuidReferenceField';
import './GameRulesInspector.css';

export const CardGameRulesInspector: InspectorComponent<CardGameRules | Record<string, unknown>> = ({ data, onFieldChange, onNavigateToAsset }) => {
  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);
  
  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;

  const bonusRuleGuids = (assetData.bonusRuleGuids || []) as string[];
  const useTrump = (assetData.useTrump || false) as boolean;

  const [guidList, setGuidList] = useState<string[]>(bonusRuleGuids);
  const [newGuid, setNewGuid] = useState('');

  const handleFieldChange = (field: string, value: unknown) => {
    if (onFieldChange) {
      onFieldChange(field, value);
    }
  };

  const handleAddGuid = () => {
    if (!newGuid.trim()) return;
    const updated = [...guidList, newGuid.trim()];
    setGuidList(updated);
    handleFieldChange('bonusRuleGuids', updated);
    setNewGuid('');
  };

  const handleRemoveGuid = (index: number) => {
    const updated = guidList.filter((_, i) => i !== index);
    setGuidList(updated);
    handleFieldChange('bonusRuleGuids', updated);
  };

  return (
    <div className="card-game-rules-inspector">
      <GameRulesInspector data={data} onFieldChange={onFieldChange} />

      <div className="game-rules-inspector__section">
        <div className="game-rules-inspector__section-header">Card Game Specific</div>
        
        <div className="game-rules-inspector__field">
          <label className="game-rules-inspector__label">
            <input
              type="checkbox"
              checked={useTrump}
              onChange={(e) => handleFieldChange('useTrump', e.target.checked)}
              title="Use Trump Cards"
            />
            <span>Use Trump Cards</span>
          </label>
        </div>

        <div className="game-rules-inspector__field">
          <div className="game-rules-inspector__label">Bonus Rules</div>
          <div className="game-rules-inspector__array-items">
            {guidList.map((guid, index) => (
              <div key={index} className="game-rules-inspector__array-item">
                <AssetGuidReferenceField
                  label=""
                  value={guid}
                  onChange={(newGuid) => {
                    const updated = [...guidList];
                    updated[index] = newGuid;
                    setGuidList(updated);
                    handleFieldChange('bonusRuleGuids', updated);
                  }}
                  expectedAssetType="BaseBonusRule"
                  onNavigateToAsset={onNavigateToAsset}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveGuid(index)}
                  className="game-rules-inspector__remove-button"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="game-rules-inspector__add-item">
            <AssetGuidReferenceField
              label=""
              value={newGuid}
              onChange={setNewGuid}
              expectedAssetType="BaseBonusRule"
              onNavigateToAsset={onNavigateToAsset}
            />
            <button
              type="button"
              onClick={handleAddGuid}
              className="game-rules-inspector__add-button"
              title="Add Bonus Rule"
              disabled={!newGuid.trim()}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
