import React, { useState, useEffect, useRef } from 'react';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetAssetRegistryResourcesEvent } from '@ocentra/eventing-domain/events/assets/GetAssetRegistryResourcesEvent';
import { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { ImageResourceEntry } from '@ocentra/asset-domain/resourceEntry/ImageResourceEntry';
import { FileResourceEntry } from '@ocentra/asset-domain/resourceEntry/FileResourceEntry';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { AssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import { tryAssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import './AssetGuidReferenceField.css';

const log = AssetEditorLogger.instance;
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

interface AssetGuidReferenceFieldProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  expectedAssetType?: string;
  onNavigateToAsset?: (identifier: AssetIdentifier) => void;
  readOnly?: boolean;
  isRequired?: boolean;
  validationError?: string | null;
}

export const AssetGuidReferenceField: React.FC<AssetGuidReferenceFieldProps> = ({
  label,
  value,
  onChange,
  expectedAssetType,
  onNavigateToAsset,
  readOnly = false,
  isRequired = false,
  validationError = null,
}) => {
  const hasError = !!validationError;
  const [assetName, setAssetName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const lastClickTimeRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;

    const loadAssetInfo = async () => {
      if (!value) {
        if (isMounted) {
          setAssetName(null);
        }
        return;
      }

      try {
        if (!isMounted) return;

        const getResourcesDeferred = new OperationDeferred<ResourceEntry[]>();
        await EventBus.instance.publishAsync(new GetAssetRegistryResourcesEvent(getResourcesDeferred));
        const resourcesResult = await getResourcesDeferred.promise;

        if (resourcesResult.isSuccess && resourcesResult.value) {
          const resource = resourcesResult.value.find(r => {
            if (r instanceof AssetResourceEntry) return r.guid === value;
            if (r instanceof ImageResourceEntry) return r.hash === value;
            if (r instanceof FileResourceEntry) return r.checksum === value;
            return false;
          });
          if (resource && resource.displayName && isMounted) {
            setAssetName(resource.displayName);
          } else {
            if (isMounted) {
              if (AssetGUID.isValid(value)) {
                setAssetName(value.substring(0, 8) + '...');
              } else {
                setAssetName(value.length > 20 ? value.substring(0, 20) + '...' : value);
              }
            }
          }
        } else {
          if (isMounted) {
            if (AssetGUID.isValid(value)) {
              setAssetName(value.substring(0, 8) + '...');
            } else {
              setAssetName(value.length > 20 ? value.substring(0, 20) + '...' : value);
            }
          }
        }
      } catch (error) {
        logError('Failed to load asset info:', error);
        if (isMounted) {
          if (AssetGUID.isValid(value)) {
            setAssetName(value.substring(0, 8) + '...');
          } else {
            setAssetName(value.length > 20 ? value.substring(0, 20) + '...' : value);
          }
        }
      }
    };

    loadAssetInfo();
    return () => {
      isMounted = false;
    };
  }, [value]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!fieldRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'link';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const draggedGuid = e.dataTransfer.getData('text/asset-guid');
    const draggedHash = e.dataTransfer.getData('text/asset-hash');
    
    if (draggedGuid && AssetGUID.isValid(draggedGuid)) {
      onChange(draggedGuid);
      return;
    }
    
    if (draggedHash) {
      onChange(draggedHash);
      return;
    }

    const draggedPath = e.dataTransfer.getData('text/asset-path') || e.dataTransfer.getData('text/plain');
    if (draggedPath && AssetGUID.isValid(draggedPath)) {
      onChange(draggedPath);
      return;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!value || !onNavigateToAsset) return;
    if (e.button !== 0) return;
    
    const now = Date.now();
    if (now - lastClickTimeRef.current < 500) {
      return;
    }
    lastClickTimeRef.current = now;
    
    const identifier = tryAssetIdentifier(value);
    if (identifier) {
      onNavigateToAsset(identifier);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange('');
  };

  return (
    <div className={`asset-guid-reference-field ${hasError ? 'asset-guid-reference-field--error' : ''}`}>
      {label && (
        <label className="asset-guid-reference-field__label">
          {label}
          {isRequired && <span className="asset-guid-reference-field__required" title="Required">*</span>}
        </label>
      )}
      <div
        ref={fieldRef}
        className={`asset-guid-reference-field__container ${
          isDragging ? 'asset-guid-reference-field__container--dragging' : ''
        } ${isHovering ? 'asset-guid-reference-field__container--hovering' : ''} ${
          value ? 'asset-guid-reference-field__container--has-value' : 'asset-guid-reference-field__container--empty'
        } ${hasError ? 'asset-guid-reference-field__container--error' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {value ? (
          <>
            {assetName ? (
              <button
                type="button"
                className="asset-guid-reference-field__value asset-guid-reference-field__value--clickable"
                onClick={handleClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (value && onNavigateToAsset) {
                      const identifier = tryAssetIdentifier(value);
                      if (identifier) {
                        onNavigateToAsset(identifier);
                      }
                    }
                  }
                }}
                title={value ? `Click to navigate to asset with GUID: ${value}` : `GUID: ${value}`}
                disabled={!value}
              >
                {assetName}
              </button>
            ) : (
              <span className="asset-guid-reference-field__value asset-guid-reference-field__value--loading">
                Loading...
              </span>
            )}
            {expectedAssetType && (
              <span className="asset-guid-reference-field__type">{expectedAssetType}</span>
            )}
            {isHovering && !readOnly && (
              <button
                type="button"
                className="asset-guid-reference-field__clear"
                onClick={handleClear}
                title="Clear reference"
              >
                ×
              </button>
            )}
          </>
        ) : (
          <span className="asset-guid-reference-field__placeholder">
            None {expectedAssetType ? `(${expectedAssetType})` : ''}
          </span>
        )}
      </div>
      {hasError && (
        <div className="asset-guid-reference-field__error">{validationError}</div>
      )}
    </div>
  );
};

