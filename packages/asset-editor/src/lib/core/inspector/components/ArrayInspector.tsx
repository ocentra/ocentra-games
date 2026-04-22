import React, { useState } from 'react';
import { CardGameMode } from '@ocentra/game-asset-domain/gameMode/cardGameMode/CardGameMode';
import { AssetGuidReferenceField } from '@/lib/core/inspector/fields/AssetGuidReferenceField';
import { Field } from '@/lib/core/inspector/fields/Field';
import { GenericInspector } from './GenericInspector';
import { ConfirmationDialog } from './ConfirmationDialog';
import { getGuidFromItem, isGuidString } from '@/lib/core/inspector/inspectorHelpers';
import { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { ImageResourceEntry } from '@ocentra/asset-domain/resourceEntry/ImageResourceEntry';
import { FileResourceEntry } from '@ocentra/asset-domain/resourceEntry/FileResourceEntry';
import type { CreateGameModeOptions } from '@/lib/core/inspector/types';
import './ArrayInspector.css';

import type { AssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';

interface ResourceEntryItemProps {
  guid: string;
  index: number;
  prefix: string;
  onNavigateToAsset?: (identifier: AssetIdentifier) => void;
  immutable: boolean;
  handleItemChange: (itemPrefix: string, value: unknown) => void;
}

const ResourceEntryItem: React.FC<ResourceEntryItemProps & { itemData?: unknown }> = ({ guid, index, prefix, onNavigateToAsset, immutable, handleItemChange, itemData }) => {
  const [resource, setResource] = useState<ResourceEntry | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const [prevIsExpanded, setPrevIsExpanded] = useState(isExpanded);
  const [prevItemData, setPrevItemData] = useState(itemData);

  if (isExpanded !== prevIsExpanded || itemData !== prevItemData) {
    setPrevIsExpanded(isExpanded);
    setPrevItemData(itemData);
    
    if (!isExpanded) {
      setResource(null);
    } else {
      if (itemData instanceof AssetResourceEntry || itemData instanceof ImageResourceEntry || itemData instanceof FileResourceEntry) {
        setResource(itemData);
      } else if (typeof itemData === 'object' && itemData !== null) {
        const obj = itemData as Record<string, unknown>;
        if ('guid' in obj || 'hash' in obj || 'checksum' in obj) {
          setResource(itemData as ResourceEntry);
        } else {
          setResource(null);
        }
      } else {
        setResource(null);
      }
    }
  }


  const resourceType = resource instanceof AssetResourceEntry ? 'Asset' : resource instanceof ImageResourceEntry ? 'Image' : resource instanceof FileResourceEntry ? 'File' : 'Unknown';

  return (
    <div className="inspector-panel__resource-entry-item">
      <div className="inspector-panel__resource-entry-header">
        <button
          type="button"
          className="inspector-panel__resource-entry-expand"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
        <AssetGuidReferenceField
          label=""
          value={guid}
          onChange={immutable ? () => { } : (newGuid) => handleItemChange(`${prefix}[${index}]`, newGuid)}
          onNavigateToAsset={onNavigateToAsset}
          readOnly={immutable}
        />
        <span className="inspector-panel__resource-entry-type">{resourceType}</span>
      </div>
      {isExpanded && (
        <div className="inspector-panel__resource-entry-content">
          {resource ? (
            <GenericInspector
              data={resource}
              onFieldChange={() => { }}
              prefix={`${prefix}[${index}]`}
              onNavigateToAsset={onNavigateToAsset}
            />
          ) : (
            <div className="inspector-panel__resource-entry-error">Resource not found</div>
          )}
        </div>
      )}
    </div>
  );
};

interface ArrayInspectorProps {
  label: string;
  data: unknown[];
  onFieldChange: (field: string, value: unknown) => void;
  prefix: string;
  onNavigateToAsset?: (identifier: AssetIdentifier) => void;
  onCreateAsset?: (folderPath?: string, options?: CreateGameModeOptions) => void;
  onDeleteGameMode?: (guid: string) => void;
  currentGameId?: string;
  isGameModesArray?: boolean;
  immutable?: boolean;
}

export const ArrayInspector: React.FC<ArrayInspectorProps> = ({
  label,
  data,
  onFieldChange,
  prefix,
  onNavigateToAsset,
  onCreateAsset,
  onDeleteGameMode,
  currentGameId,
  isGameModesArray,
  immutable = false
}) => {
  const [deleteConfirmGuid, setDeleteConfirmGuid] = useState<string | null>(null);

  const handleAddItem = () => {
    if (isGameModesArray && onCreateAsset) {
      onCreateAsset(undefined, {
        category: 'Game',
        assetType: CardGameMode.name,
        defaultPath: 'GameMode/CardGames',
      });
      return;
    }
    const newItem = typeof data[0] === 'object' && data[0] !== null ? { ...data[0] } : '';
    const updated = [...data, newItem];
    onFieldChange(prefix, updated);
  };

  const handleRemoveItem = (index: number) => {
    const item = data[index];
    const guidValue = getGuidFromItem(item);
    if (isGameModesArray && guidValue && onDeleteGameMode) {
      setDeleteConfirmGuid(guidValue);
      return;
    }
    const updated = data.filter((_, i) => i !== index);
    onFieldChange(prefix, updated);
  };

  const handleConfirmDelete = () => {
    if (onDeleteGameMode && deleteConfirmGuid) {
      onDeleteGameMode(deleteConfirmGuid);
      setDeleteConfirmGuid(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmGuid(null);
  };

  const handleItemChange = (itemPrefix: string, value: unknown) => {
    const match = itemPrefix.match(/\[(\d+)\]\.?(.*)$/);
    if (!match) return;

    const index = parseInt(match[1], 10);
    const field = match[2] || '';

    const updated = [...data];
    if (field) {
      if (typeof updated[index] === 'object' && updated[index] !== null) {
        const keys = field.split('.');
        let target: Record<string, unknown> = updated[index] as Record<string, unknown>;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!target[keys[i]]) {
            target[keys[i]] = {};
          }
          target = target[keys[i]] as Record<string, unknown>;
        }
        target[keys[keys.length - 1]] = value;
      }
    } else {
      updated[index] = value;
    }
    onFieldChange(prefix, updated);
  };

  const getVisibleItemCount = () => {
    return data.length;
  };

  const visibleCount = getVisibleItemCount();

  return (
    <>
      <div className="inspector-panel__array-section">
        <div className="inspector-panel__section-header">
          {label} ({visibleCount} items{visibleCount !== data.length ? ` of ${data.length}` : ''})
          {!immutable && (
            <button
              className="inspector-panel__array-add-button"
              onClick={handleAddItem}
              title="Add item"
            >
              +
            </button>
          )}
        </div>
        <div className={`inspector-panel__array-items ${isGameModesArray ? 'inspector-panel__array-items--compact' : ''}`}>
        {data
          .map((item, index) => {
            const guidValue = getGuidFromItem(item);
            const isAssetRef = typeof item === 'object' && item !== null && (item as { assetRef?: boolean }).assetRef === true;
            const fieldName = prefix.includes('[') ? prefix.split('[')[0] : prefix;
            const isAssetArray = fieldName.endsWith('Refs') || fieldName.endsWith('Ref') ||
              fieldName.endsWith('Assets') || fieldName.endsWith('Asset') ||
              fieldName.toLowerCase().includes('asset') || fieldName.toLowerCase().includes('ref');

            if (isGameModesArray) {
              const guidToUse = guidValue || (typeof item === 'string' ? item : null);
              if (!guidToUse) {
                return null;
              }
            const expectedAssetType = isAssetRef && typeof item === 'object' && item !== null
              ? (item as { type?: string }).type
              : fieldName.replace(/Refs?$/, '').replace(/Assets?$/, '').replace(/asset/gi, '').replace(/ref/gi, '') || undefined;

            return (
              <div key={index} className="inspector-panel__array-item inspector-panel__array-item--compact">
                <AssetGuidReferenceField
                  label=""
                  value={guidToUse}
                  onChange={(newGuid) => {
                    if (isAssetRef) {
                      handleItemChange(`${prefix}[${index}]`, {
                        assetRef: true,
                        guid: newGuid,
                        type: (item as { type?: string }).type,
                      });
                    } else {
                      handleItemChange(`${prefix}[${index}]`, newGuid);
                    }
                  }}
                  expectedAssetType={expectedAssetType}
                  onNavigateToAsset={onNavigateToAsset}
                />
                {!immutable && (
                  <button
                    className="inspector-panel__array-remove-button"
                    onClick={() => handleRemoveItem(index)}
                    title="Remove game mode"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                )}
              </div>
            );
          }


          const isResourcesArray = prefix === 'resources' || prefix.includes('resources');
          const isSimplePrimitive = typeof item !== 'object' || item === null;
          const isComplexObject = typeof item === 'object' && item !== null;
          const isGuidStringItem = typeof item === 'string' && isGuidString(item);
          const isHashStringItem = typeof item === 'string' && /^[a-f0-9]{64}$/i.test(item);
          const isResourceObject = isResourcesArray && isComplexObject && (('guid' in item) || ('hash' in item) || ('checksum' in item));
          const isResourceIdentifier = isResourcesArray && typeof item === 'string' && (isGuidStringItem || isHashStringItem);
          const hasComplexContent = guidValue && (isAssetRef || isAssetArray || isResourcesArray || typeof item === 'string') || isComplexObject;
          const itemClassName = `inspector-panel__array-item${hasComplexContent ? ' inspector-panel__array-item--nested' : ''}`;

          const renderItemContent = () => {
            if (isResourceObject) {
              const identifier = ('guid' in item && typeof item.guid === 'string') ? item.guid :
                ('hash' in item && typeof item.hash === 'string') ? item.hash :
                ('checksum' in item && typeof item.checksum === 'string') ? item.checksum : '';
              if (identifier) {
                return <ResourceEntryItem guid={identifier} index={index} prefix={prefix} onNavigateToAsset={onNavigateToAsset} immutable={immutable} handleItemChange={handleItemChange} itemData={item} />;
              }
            }
            if (isResourceIdentifier) {
              return <ResourceEntryItem guid={item as string} index={index} prefix={prefix} onNavigateToAsset={onNavigateToAsset} immutable={immutable} handleItemChange={handleItemChange} itemData={item} />;
            }

            if (guidValue && (isAssetRef || isAssetArray || isResourcesArray || typeof item === 'string')) {
              const expectedAssetType = isAssetRef && isComplexObject
                ? (item as { type?: string }).type
                : fieldName.replace(/Refs?$/, '').replace(/Assets?$/, '').replace(/asset/gi, '').replace(/ref/gi, '') || undefined;

              return (
                <AssetGuidReferenceField
                  label=""
                  value={guidValue}
                  onChange={immutable ? () => { } : (newGuid) => {
                    if (isAssetRef) {
                      handleItemChange(`${prefix}[${index}]`, {
                        assetRef: true,
                        guid: newGuid,
                        type: (item as { type?: string }).type,
                      });
                    } else {
                      handleItemChange(`${prefix}[${index}]`, newGuid);
                    }
                  }}
                  expectedAssetType={expectedAssetType}
                  onNavigateToAsset={onNavigateToAsset}
                  readOnly={immutable}
                />
              );
            }

            if (isComplexObject) {
              return (
                <GenericInspector
                  data={item}
                  onFieldChange={immutable ? () => { } : handleItemChange}
                  prefix={`${prefix}[${index}]`}
                  onNavigateToAsset={onNavigateToAsset}
                  onCreateAsset={onCreateAsset}
                  onDeleteGameMode={onDeleteGameMode}
                  currentGameId={currentGameId}
                />
              );
            }

            if (isSimplePrimitive && !immutable) {
              return (
                <Field
                  label=""
                  value={String(item ?? '')}
                  onChange={(v) => {
                    const value = String(v);
                    if (typeof item === 'number') {
                      const num = Number(value);
                      handleItemChange(`${prefix}[${index}]`, isNaN(num) ? 0 : num);
                    } else if (typeof item === 'boolean') {
                      handleItemChange(`${prefix}[${index}]`, value === 'true' || value === '1');
                    } else {
                      handleItemChange(`${prefix}[${index}]`, value);
                    }
                  }}
                />
              );
            }

            return <span className="inspector-panel__array-item-text">{String(item ?? '')}</span>;
          };

          return (
            <div key={index} className={itemClassName}>
              <div className="inspector-panel__array-item-header">
                <span className="inspector-panel__array-item-index">[{index}]</span>
                {!immutable && (
                  <button
                    className="inspector-panel__array-remove-button"
                    onClick={() => handleRemoveItem(index)}
                    title="Remove item"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                )}
              </div>
              <div className="inspector-panel__array-item-content">
                {renderItemContent()}
              </div>
            </div>
          );
          })
          .filter((item): item is React.ReactElement => item !== null)}
        {data.length === 0 && !immutable && (
          <div className="inspector-panel__array-empty">
            <p>Array is empty</p>
            <button
              className="inspector-panel__array-add-first-button"
              onClick={handleAddItem}
            >
              Add first item
            </button>
          </div>
        )}
        </div>
      </div>
      <ConfirmationDialog
        isOpen={deleteConfirmGuid !== null}
        title="Delete Game Mode"
        message="Are you sure you want to remove this game mode from the registry? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
};

