import React, { useMemo, useState } from 'react';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { useImageUrl } from '@/hooks/useImageUrl';
import { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { ImageResourceEntry } from '@ocentra/asset-domain/resourceEntry/ImageResourceEntry';
import { FileResourceEntry } from '@ocentra/asset-domain/resourceEntry/FileResourceEntry';
import { ResourceEntrySerializer } from '@ocentra/asset-domain/serialization/ResourceEntrySerializer';
import { assetTypeMap } from '@/lib/core/registry/assetTypeMap.generated';
import type { AssetIdentifier, AssetGUIDType, GameId, ImageHash, AssetChecksum } from '@ocentra/asset-domain/types/assetIdentifier';
import { tryAssetIdentifier, isAssetGUID, tryGameId, isImageHash, isAssetChecksum } from '@ocentra/asset-domain/types/assetIdentifier';
import type { AssetCategory } from '@ocentra/asset-domain/constants/assets';
import './AssetSummaryPreview.css';

interface AssetSummaryPreviewProps {
  assetData: Record<string, unknown>;
  assetType?: string;
  assetInstance?: unknown;
  onNavigateToAsset?: (identifier: AssetIdentifier) => void;
}

interface Field {
  key: string;
  label: string;
  value: unknown;
  type: 'text' | 'multiline' | 'guid' | 'image' | 'array' | 'object' | 'number' | 'boolean';
}

const isGuid = (value: unknown): value is string => {
  return typeof value === 'string' && AssetGUID.isValid(value);
};

const isMultilineText = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  return value.length > 100 || value.includes('\n');
};

const detectFieldType = (key: string, value: unknown): Field['type'] => {
  if (value === null || value === undefined) return 'text';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') {
    const obj = value as { assetRef?: boolean; guid?: string };
    if (obj.assetRef === true || (obj.guid && AssetGUID.isValid(obj.guid))) {
      return 'guid';
    }
    return 'object';
  }
  if (typeof value === 'string') {
    if (isGuid(value)) return 'guid';
    // Don't treat checksum fields as images - they're content hashes, not image hashes
    const isChecksumField = key.toLowerCase() === 'checksum' || key.toLowerCase() === 'filehash';
    const isActualImageHash = isImageHash(value);
    if (!isChecksumField && isActualImageHash) {
      return 'image';
    }
    if (isMultilineText(value)) return 'multiline';
    return 'text';
  }
  return 'text';
};

const formatLabel = (key: string): string => {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

const ResourcesArrayRenderer: React.FC<{ field: Field; arr: unknown[]; onNavigateToAsset?: (identifier: AssetIdentifier) => void }> = ({ field, arr, onNavigateToAsset }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const parseResourceItem = (item: unknown): { identifier: string; resource?: ResourceEntry; displayName?: string; type?: string } | null => {
    if (typeof item === 'string') {
      return { identifier: item };
    }
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      if ('guid' in obj && typeof obj.guid === 'string') {
        const resource = ResourceEntrySerializer.deserialize(obj);
        if (!(resource instanceof AssetResourceEntry)) {
          return null;
        }
        return { identifier: obj.guid, resource, displayName: resource.displayName, type: 'Asset' };
      }
      if ('hash' in obj && typeof obj.hash === 'string') {
        const resource = new ImageResourceEntry();
        resource.hash = (isImageHash(obj.hash) ? obj.hash : obj.hash as ImageHash);
        resource.displayName = typeof obj.displayName === 'string' ? obj.displayName : '';
        resource.path = typeof obj.path === 'string' ? obj.path : '';
        resource.gameId = typeof obj.gameId === 'string' ? (tryGameId(obj.gameId) ?? (obj.gameId as GameId)) : null;
        resource.category = typeof obj.category === 'string' ? (obj.category as AssetCategory) : null;
        return { identifier: obj.hash, resource, displayName: resource.displayName, type: 'Image' };
      }
      if ('checksum' in obj && typeof obj.checksum === 'string') {
        const resource = new FileResourceEntry();
        resource.checksum = (isAssetChecksum(obj.checksum) ? obj.checksum : obj.checksum as AssetChecksum);
        resource.displayName = typeof obj.displayName === 'string' ? obj.displayName : '';
        resource.path = typeof obj.path === 'string' ? obj.path : '';
        resource.fileType = typeof obj.type === 'string' ? obj.type : '';
        resource.gameId = typeof obj.gameId === 'string' ? (tryGameId(obj.gameId) ?? (obj.gameId as GameId)) : null;
        resource.category = typeof obj.category === 'string' ? (obj.category as AssetCategory) : null;
        return { identifier: obj.checksum, resource, displayName: resource.displayName, type: 'File' };
      }
    }
    return null;
  };

  return (
    <div className="asset-summary-preview__field asset-summary-preview__field--array">
      <div className="asset-summary-preview__field-header">
        <span className="asset-summary-preview__field-label">{field.label}:</span>
        <span className="asset-summary-preview__field-count">{arr.length} items</span>
        <button
          className="asset-summary-preview__expand-button"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>
      {isExpanded && (
        <div className="asset-summary-preview__array-items">
          {arr.map((item, index) => {
            const parsed = parseResourceItem(item);
            if (!parsed) return null;

            const { identifier, resource, displayName, type: resourceType } = parsed;
            const displayText = displayName ? `${displayName} | ${identifier.substring(0, 8)}...` : identifier.substring(0, 8) + '...';

            return (
              <div key={index} className="asset-summary-preview__array-item">
                <div className="asset-summary-preview__array-item-header">
                  <button
                    type="button"
                    className="asset-summary-preview__resource-link"
                    onClick={() => {
                      const assetIdentifier = tryAssetIdentifier(identifier);
                      if (assetIdentifier && onNavigateToAsset) {
                        onNavigateToAsset(assetIdentifier);
                      }
                    }}
                    title={`Navigate to: ${identifier}`}
                  >
                    {displayText}
                  </button>
                  {resourceType && <span className="asset-summary-preview__resource-type">{resourceType}</span>}
                </div>
                {resource && (
                  <div className="asset-summary-preview__array-item-content">
                    {resource instanceof AssetResourceEntry && (
                      <FieldRenderer field={{ key: 'guid', label: 'GUID', value: resource.guid, type: 'guid' }} onNavigateToAsset={onNavigateToAsset} />
                    )}
                    {resource instanceof ImageResourceEntry && (
                      <FieldRenderer field={{ key: 'hash', label: 'Hash', value: resource.hash, type: 'text' }} onNavigateToAsset={onNavigateToAsset} />
                    )}
                    {resource instanceof FileResourceEntry && (
                      <FieldRenderer field={{ key: 'checksum', label: 'Checksum', value: resource.checksum, type: 'text' }} onNavigateToAsset={onNavigateToAsset} />
                    )}
                    {resource.displayName && (
                      <FieldRenderer field={{ key: 'displayName', label: 'Display Name', value: resource.displayName, type: 'text' }} onNavigateToAsset={onNavigateToAsset} />
                    )}
                    {resource.path && (
                      <FieldRenderer field={{ key: 'path', label: 'Path', value: resource.path, type: 'text' }} onNavigateToAsset={onNavigateToAsset} />
                    )}
                    {(resource instanceof AssetResourceEntry && resource.assetType) && (
                      <FieldRenderer field={{ key: 'assetType', label: 'Asset Type', value: resource.assetType, type: 'text' }} onNavigateToAsset={onNavigateToAsset} />
                    )}
                    {(resource instanceof FileResourceEntry && resource.fileType) && (
                      <FieldRenderer field={{ key: 'fileType', label: 'File Type', value: resource.fileType, type: 'text' }} onNavigateToAsset={onNavigateToAsset} />
                    )}
                    {resource.gameId && <FieldRenderer field={{ key: 'gameId', label: 'Game ID', value: resource.gameId, type: 'text' }} onNavigateToAsset={onNavigateToAsset} />}
                    {resource.category && <FieldRenderer field={{ key: 'category', label: 'Category', value: resource.category, type: 'text' }} onNavigateToAsset={onNavigateToAsset} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


const ImageFieldRenderer: React.FC<{ imageHashOrGuid: ImageHash | AssetGUIDType; label: string }> = ({ imageHashOrGuid, label }) => {
  const { imageUrl } = useImageUrl(isImageHash(imageHashOrGuid) ? imageHashOrGuid : null);
  return (
    <div className="asset-summary-preview__field-image">
      {imageUrl ? (
        <img src={imageUrl} alt={label} className="asset-summary-preview__field-image-thumb" />
      ) : (
        <span className="asset-summary-preview__field-value">{imageHashOrGuid || '—'}</span>
      )}
    </div>
  );
};

const FieldRenderer: React.FC<{ field: Field; onNavigateToAsset?: (identifier: AssetIdentifier) => void }> = ({ field, onNavigateToAsset }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (field.type === 'guid') {
    const guid = typeof field.value === 'string'
      ? field.value
      : (field.value as { guid?: string })?.guid || '';
    const displayName = (field.value as { displayName?: string })?.displayName;
    return (
      <div className="asset-summary-preview__field asset-summary-preview__field--guid">
        <span className="asset-summary-preview__field-label">{field.label}:</span>
        <button
          type="button"
          className="asset-summary-preview__field-value asset-summary-preview__field-value--link"
          onClick={() => {
            const identifier = tryAssetIdentifier(guid);
            if (identifier && onNavigateToAsset) {
              onNavigateToAsset(identifier);
            }
          }}
          title={`Navigate to asset: ${guid}`}
        >
          {displayName || guid.substring(0, 8) + '...'}
        </button>
      </div>
    );
  }

  if (field.type === 'image') {
    const value = field.value as string;
    if (isImageHash(value)) {
      return (
        <div className="asset-summary-preview__field asset-summary-preview__field--image">
          <span className="asset-summary-preview__field-label">{field.label}:</span>
          <ImageFieldRenderer imageHashOrGuid={value} label={field.label} />
        </div>
      );
    }
    if (isAssetGUID(value)) {
      return (
        <div className="asset-summary-preview__field asset-summary-preview__field--image">
          <span className="asset-summary-preview__field-label">{field.label}:</span>
          <ImageFieldRenderer imageHashOrGuid={value} label={field.label} />
        </div>
      );
    }
  }

  if (field.type === 'multiline') {
    const text = field.value as string;
    return (
      <div className="asset-summary-preview__field asset-summary-preview__field--multiline">
        <span className="asset-summary-preview__field-label">{field.label}:</span>
        <pre className="asset-summary-preview__field-multiline">{text}</pre>
      </div>
    );
  }

  if (field.type === 'array') {
    const arr = field.value as unknown[];
    if (arr.length === 0) {
      return (
        <div className="asset-summary-preview__field">
          <span className="asset-summary-preview__field-label">{field.label}:</span>
          <span className="asset-summary-preview__field-value">Empty array</span>
        </div>
      );
    }

    const isResourcesArray = field.key === 'resources' || field.key.toLowerCase().includes('resources');
    const firstItem = arr[0];
    const isArrayOfObjects = typeof firstItem === 'object' && firstItem !== null && !Array.isArray(firstItem);

    if (isResourcesArray) {
      return <ResourcesArrayRenderer field={field} arr={arr} onNavigateToAsset={onNavigateToAsset} />;
    }

    if (isArrayOfObjects) {
      return (
        <div className="asset-summary-preview__field asset-summary-preview__field--array">
          <div className="asset-summary-preview__field-header">
            <span className="asset-summary-preview__field-label">{field.label}:</span>
            <span className="asset-summary-preview__field-count">{arr.length} items</span>
            <button
              className="asset-summary-preview__expand-button"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          </div>
          {isExpanded && (
            <div className="asset-summary-preview__array-items">
              {arr.map((item, index) => {
                const itemObj = item as Record<string, unknown>;
                const itemId = itemObj.id || itemObj.label || itemObj.name;
                const header = itemId ? String(itemId) : `Item ${index + 1}`;
                return (
                  <div key={index} className="asset-summary-preview__array-item">
                    <div className="asset-summary-preview__array-item-header">{header}</div>
                    <div className="asset-summary-preview__array-item-content">
                      {Object.entries(itemObj).map(([key, value]) => {
                        const subField: Field = {
                          key,
                          label: formatLabel(key),
                          value,
                          type: detectFieldType(key, value),
                        };
                        return <FieldRenderer key={key} field={subField} onNavigateToAsset={onNavigateToAsset} />;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="asset-summary-preview__field asset-summary-preview__field--array">
        <span className="asset-summary-preview__field-label">{field.label}:</span>
        <div className="asset-summary-preview__field-value">
          [{arr.map((item, i) => (
            <span key={i} className="asset-summary-preview__array-value">
              {String(item)}
              {i < arr.length - 1 ? ', ' : ''}
            </span>
          ))}]
        </div>
      </div>
    );
  }

  if (field.type === 'object') {
    const obj = field.value as Record<string, unknown>;
    const keys = Object.keys(obj);
    return (
      <div className="asset-summary-preview__field asset-summary-preview__field--object">
        <div className="asset-summary-preview__field-header">
          <span className="asset-summary-preview__field-label">{field.label}:</span>
          <span className="asset-summary-preview__field-count">{keys.length} properties</span>
          <button
            className="asset-summary-preview__expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
        {isExpanded && (
          <div className="asset-summary-preview__object-content">
            {keys.map((key) => {
              const subField: Field = {
                key,
                label: formatLabel(key),
                value: obj[key],
                type: detectFieldType(key, obj[key]),
              };
              return <FieldRenderer key={key} field={subField} onNavigateToAsset={onNavigateToAsset} />;
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="asset-summary-preview__field">
      <span className="asset-summary-preview__field-label">{field.label}:</span>
      <span className="asset-summary-preview__field-value">
        {field.type === 'boolean'
          ? (field.value ? 'Yes' : 'No')
          : String(field.value ?? '—')}
      </span>
    </div>
  );
};

export const AssetSummaryPreview: React.FC<AssetSummaryPreviewProps> = ({ assetData, assetType, onNavigateToAsset }) => {
  const hasImageHash = assetData.data && typeof assetData.data === 'object' &&
    ((assetData.data as { imageHash?: string; hash?: string })?.imageHash ||
      (assetData.data as { imageHash?: string; hash?: string })?.hash);
  const isImage = !!hasImageHash;
  const data = assetData.data as Record<string, unknown> | undefined;
  const systemDisplay = assetData.system as { displayName?: string } | undefined;
  const metadata = assetData.metadata as { displayName?: string; gameName?: string; assetId?: string } | undefined;

  const displayName = systemDisplay?.displayName || metadata?.displayName || metadata?.gameName || 'Unknown';
  const assetId = systemDisplay?.displayName || metadata?.assetId || 'N/A';

  const imageHash = data?.imageHash as string | undefined;
  const systemGuid = assetData.system as { guid?: string } | undefined;
  const imageGuidOrHashValue = imageHash || (isImage ? systemGuid?.guid : null) || null;
  const imageGuidOrHash: ImageHash | null = imageGuidOrHashValue && isImageHash(imageGuidOrHashValue) ? imageGuidOrHashValue : null;
  const { imageUrl } = useImageUrl(imageGuidOrHash);

  const isGameMode = assetType === assetTypeMap.CardGameMode.assetType;
  const bannerImage = data?.bannerImage as string | undefined;
  const bannerImageHash: ImageHash | null = bannerImage && isImageHash(bannerImage) ? bannerImage : null;
  const { imageUrl: bannerImageUrl } = useImageUrl(bannerImageHash);

  const fields = useMemo<Field[]>(() => {
    if (!data || typeof data !== 'object') {
      return [];
    }

    const excludeKeys = ['imageHash', 'bannerImage'];
    const result: Field[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (excludeKeys.includes(key)) continue;
      const fieldType = detectFieldType(key, value);
      result.push({
        key,
        label: formatLabel(key),
        value,
        type: fieldType,
      });
    }

    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  if (isImage && imageUrl) {
    return (
      <div className="asset-summary-preview">
        <div className="asset-summary-preview__header">
          <h2 className="asset-summary-preview__title">{displayName}</h2>
          <div className="asset-summary-preview__meta">
            <span className="asset-summary-preview__id">ID: {assetId}</span>
            {assetType && <span className="asset-summary-preview__type">{assetType}</span>}
          </div>
        </div>
        <div className="asset-summary-preview__content asset-summary-preview__content--image">
          <div className="asset-summary-preview__image-container">
            <img
              src={imageUrl}
              alt={assetId}
              className="asset-summary-preview__image"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="asset-summary-preview">
        <div className="asset-summary-preview__header">
          <h2 className="asset-summary-preview__title">{displayName}</h2>
          <div className="asset-summary-preview__meta">
            <span className="asset-summary-preview__id">ID: {assetId}</span>
            {assetType && <span className="asset-summary-preview__type">{assetType}</span>}
          </div>
        </div>
        {isGameMode && bannerImageUrl && (
          <div className="asset-summary-preview__banner">
            <img src={bannerImageUrl} alt={`${displayName} banner`} />
          </div>
        )}
        <div className="asset-summary-preview__content">
          <p className="asset-summary-preview__empty">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="asset-summary-preview">
      <div className="asset-summary-preview__header">
        <h2 className="asset-summary-preview__title">{displayName}</h2>
        <div className="asset-summary-preview__meta">
          <span className="asset-summary-preview__id">ID: {assetId}</span>
          {assetType && <span className="asset-summary-preview__type">{assetType}</span>}
        </div>
      </div>
      {isGameMode && bannerImageUrl && (
        <div className="asset-summary-preview__banner">
          <img src={bannerImageUrl} alt={`${displayName} banner`} />
        </div>
      )}
      <div className="asset-summary-preview__content">
        <div className="asset-summary-preview__group">
          <h3 className="asset-summary-preview__group-title">Data</h3>
          <div className="asset-summary-preview__fields">
            {fields.map((field) => (
              <FieldRenderer key={field.key} field={field} onNavigateToAsset={onNavigateToAsset} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

