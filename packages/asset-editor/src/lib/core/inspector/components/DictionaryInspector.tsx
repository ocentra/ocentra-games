import React, { useState } from 'react';
import type { AssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import './DictionaryInspector.css';

interface DictionaryInspectorProps {
  label: string;
  data: Record<string, string>;
  onFieldChange: (field: string, value: unknown) => void;
  prefix: string;
  keyLabel?: string;
  valueLabel?: string;
  keyType?: 'guid' | 'path' | 'string';
  valueType?: 'guid' | 'path' | 'timestamp' | 'string';
  onNavigateToAsset?: (identifier: AssetIdentifier) => void;
}

export const DictionaryInspector: React.FC<DictionaryInspectorProps> = ({
  label,
  data,
  onFieldChange,
  prefix,
  keyLabel = 'Key',
  valueLabel = 'Value',
  keyType = 'string',
  valueType = 'string',
}) => {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  const handleAddItem = () => {
    if (!newKey || !newValue) return;
    
    const updated = { ...data, [newKey]: newValue };
    onFieldChange(prefix, updated);
    setNewKey('');
    setNewValue('');
  };

  const handleDeleteItem = (key: string) => {
    const updated = { ...data };
    delete updated[key];
    onFieldChange(prefix, updated);
  };

  const handleKeyChange = (oldKey: string, newKey: string) => {
    if (!newKey || newKey === oldKey) {
      setEditingKey(null);
      return;
    }
    
    const updated = { ...data };
    const value = updated[oldKey];
    delete updated[oldKey];
    updated[newKey] = value;
    onFieldChange(prefix, updated);
    setEditingKey(null);
  };

  const handleValueChange = (key: string, newValue: string) => {
    const updated = { ...data, [key]: newValue };
    onFieldChange(prefix, updated);
    setEditingValue('');
  };

  const handleStartEdit = (key: string, value: string) => {
    setEditingKey(key);
    setEditingValue(value);
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditingValue('');
  };

  const entries = Object.entries(data);

  return (
    <div className="dictionary-inspector">
      <div className="dictionary-inspector__header">
        <h3 className="dictionary-inspector__title">{label}</h3>
        <span className="dictionary-inspector__count">{entries.length} entries</span>
      </div>

      <div className="dictionary-inspector__entries">
        {entries.map(([key, value], index) => (
          <div key={key || `empty-key-${index}`} className="dictionary-inspector__entry">
            <div className="dictionary-inspector__key">
              {editingKey === key ? (
                <input
                  type="text"
                  value={editingKey}
                  onChange={(e) => setEditingKey(e.target.value)}
                  onBlur={() => handleKeyChange(key, editingKey)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleKeyChange(key, editingKey);
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  className="dictionary-inspector__input"
                  aria-label={`Edit ${keyLabel}`}
                />
              ) : (
                <button
                  type="button"
                  className="dictionary-inspector__key-text"
                  onClick={() => handleStartEdit(key, value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStartEdit(key, value);
                    }
                  }}
                  title="Click to edit key"
                  aria-label={`Edit ${keyLabel}: ${key}`}
                >
                  {keyType === 'guid' ? `${key.substring(0, 8)}...` : key}
                </button>
              )}
            </div>
            <div className="dictionary-inspector__value">
              {editingKey === key ? (
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={() => {
                    handleValueChange(key, editingValue);
                    handleCancelEdit();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleValueChange(key, editingValue);
                      handleCancelEdit();
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  className="dictionary-inspector__input"
                  aria-label={`Edit ${valueLabel}`}
                />
              ) : (
                <button
                  type="button"
                  className="dictionary-inspector__value-text"
                  onClick={() => handleStartEdit(key, value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStartEdit(key, value);
                    }
                  }}
                  title="Click to edit value"
                  aria-label={`Edit ${valueLabel}: ${value}`}
                >
                  {valueType === 'guid' ? `${value.substring(0, 8)}...` : value}
                </button>
              )}
            </div>
            <button
              className="dictionary-inspector__delete"
              onClick={() => handleDeleteItem(key)}
              title="Delete entry"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="dictionary-inspector__add">
        <input
          type="text"
          placeholder={keyLabel}
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="dictionary-inspector__add-key"
          aria-label={keyLabel}
        />
        <input
          type="text"
          placeholder={valueLabel}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAddItem();
            }
          }}
          className="dictionary-inspector__add-value"
          aria-label={valueLabel}
        />
        <button
          className="dictionary-inspector__add-button"
          onClick={handleAddItem}
          disabled={!newKey || !newValue}
        >
          Add
        </button>
      </div>
    </div>
  );
};

