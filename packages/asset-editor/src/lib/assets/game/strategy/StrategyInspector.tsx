import { useState } from 'react';
import { Strategy } from '@ocentra/game-asset-domain/game/strategy/Strategy';
import type { InspectorComponent } from '@/lib/core/inspector/types';


import './StrategyInspector.css';

export const StrategyInspector: InspectorComponent<Strategy | Record<string, unknown>> = ({ data, onFieldChange }) => {
  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);
  
  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;
  
  const LLM = (assetData.LLM || '') as string;
  const Player = (assetData.Player || '') as string;
  const aggressiveness = (assetData.aggressiveness ?? 0.5) as number;
  const riskTolerance = (assetData.riskTolerance ?? 0.5) as number;
  const bluffFrequency = (assetData.bluffFrequency ?? 0.3) as number;
  const bluffSettings = (assetData.bluffSettings || {}) as Record<string, string>;

  const [settings, setSettings] = useState<Array<{ key: string; value: string }>>(
    Object.entries(bluffSettings).map(([key, value]) => ({ key, value }))
  );
  const [newSettingKey, setNewSettingKey] = useState('');
  const [newSettingValue, setNewSettingValue] = useState('');

  const handleFieldChange = (field: string, value: unknown) => {
    if (onFieldChange) {
      onFieldChange(field, value);
    }
  };

  const handleSettingsChange = (updated: Array<{ key: string; value: string }>) => {
    setSettings(updated);
    const dict: Record<string, string> = {};
    updated.forEach(({ key, value }) => {
      if (key.trim()) {
        dict[key.trim()] = value;
      }
    });
    handleFieldChange('bluffSettings', dict);
  };

  const handleAddSetting = () => {
    if (!newSettingKey.trim()) return;
    const updated = [...settings, { key: newSettingKey.trim(), value: newSettingValue }];
    handleSettingsChange(updated);
    setNewSettingKey('');
    setNewSettingValue('');
  };

  const handleRemoveSetting = (index: number) => {
    const updated = settings.filter((_, i) => i !== index);
    handleSettingsChange(updated);
  };

  const handleUpdateSetting = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...settings];
    updated[index] = { ...updated[index], [field]: value };
    handleSettingsChange(updated);
  };

  return (
    <div className="strategy-inspector">
      <div className="strategy-inspector__section">
        <div className="strategy-inspector__section-header">Strategy Tips</div>
        <div className="strategy-inspector__field">
          <label htmlFor="strategy-llm" className="strategy-inspector__label">LLM Strategy Tips</label>
          <textarea
            id="strategy-llm"
            className="strategy-inspector__textarea"
            value={LLM}
            onChange={(e) => handleFieldChange('LLM', e.target.value)}
            rows={10}
            title="LLM Strategy Tips"
            placeholder="Enter strategy tips for LLM..."
          />
        </div>
        <div className="strategy-inspector__field">
          <label htmlFor="strategy-player" className="strategy-inspector__label">Player Strategy Tips</label>
          <textarea
            id="strategy-player"
            className="strategy-inspector__textarea"
            value={Player}
            onChange={(e) => handleFieldChange('Player', e.target.value)}
            rows={10}
            title="Player Strategy Tips"
            placeholder="Enter strategy tips for players..."
          />
        </div>
      </div>

      <div className="strategy-inspector__section">
        <div className="strategy-inspector__section-header">Strategy Parameters</div>
        <div className="strategy-inspector__field">
          <div className="strategy-inspector__field-header">
            <label htmlFor="strategy-aggressiveness" className="strategy-inspector__label">Aggressiveness</label>
            <span className="strategy-inspector__value">{aggressiveness.toFixed(2)}</span>
          </div>
          <input
            id="strategy-aggressiveness"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={aggressiveness}
            onChange={(e) => handleFieldChange('aggressiveness', parseFloat(e.target.value))}
            className="strategy-inspector__slider"
            title="Aggressiveness"
            aria-label="Aggressiveness"
          />
        </div>
        <div className="strategy-inspector__field">
          <div className="strategy-inspector__field-header">
            <label htmlFor="strategy-risk" className="strategy-inspector__label">Risk Tolerance</label>
            <span className="strategy-inspector__value">{riskTolerance.toFixed(2)}</span>
          </div>
          <input
            id="strategy-risk"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={riskTolerance}
            onChange={(e) => handleFieldChange('riskTolerance', parseFloat(e.target.value))}
            className="strategy-inspector__slider"
            title="Risk Tolerance"
            aria-label="Risk Tolerance"
          />
        </div>
        <div className="strategy-inspector__field">
          <div className="strategy-inspector__field-header">
            <label htmlFor="strategy-bluff" className="strategy-inspector__label">Bluff Frequency</label>
            <span className="strategy-inspector__value">{bluffFrequency.toFixed(2)}</span>
          </div>
          <input
            id="strategy-bluff"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={bluffFrequency}
            onChange={(e) => handleFieldChange('bluffFrequency', parseFloat(e.target.value))}
            className="strategy-inspector__slider"
            title="Bluff Frequency"
            aria-label="Bluff Frequency"
          />
        </div>
      </div>

      <div className="strategy-inspector__section">
        <div className="strategy-inspector__section-header">Bluff Settings</div>
        {settings.length > 0 && (
          <div className="strategy-inspector__settings-list">
            {settings.map((setting, index) => (
              <div key={index} className="strategy-inspector__setting-item">
                <input
                  type="text"
                  className="strategy-inspector__setting-key"
                  value={setting.key}
                  onChange={(e) => handleUpdateSetting(index, 'key', e.target.value)}
                  placeholder="Setting name"
                  title="Setting key"
                />
                <input
                  type="text"
                  className="strategy-inspector__setting-value"
                  value={setting.value}
                  onChange={(e) => handleUpdateSetting(index, 'value', e.target.value)}
                  placeholder="Setting value"
                  title="Setting value"
                />
                <button
                  type="button"
                  className="strategy-inspector__remove-button"
                  onClick={() => handleRemoveSetting(index)}
                  title="Remove setting"
                  aria-label="Remove setting"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="strategy-inspector__add-setting">
          <input
            type="text"
            className="strategy-inspector__setting-key"
            value={newSettingKey}
            onChange={(e) => setNewSettingKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newSettingKey.trim()) {
                handleAddSetting();
              }
            }}
            placeholder="New setting name"
            title="Setting key"
          />
          <input
            type="text"
            className="strategy-inspector__setting-value"
            value={newSettingValue}
            onChange={(e) => setNewSettingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newSettingKey.trim()) {
                handleAddSetting();
              }
            }}
            placeholder="New setting value"
            title="Setting value"
          />
          <button
            type="button"
            className="strategy-inspector__add-button"
            onClick={handleAddSetting}
            disabled={!newSettingKey.trim()}
            title="Add setting"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

