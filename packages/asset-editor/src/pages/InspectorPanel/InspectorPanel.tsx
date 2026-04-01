import React from 'react';
import { BaseInspector } from '@/lib/core/inspector/components/BaseInspector';
import { GenericInspector } from '@/lib/core/inspector/components/GenericInspector';
import { Inspector } from '@/lib/core/inspector/Inspector';
import { InspectorService } from '@/lib/core/inspector/InspectorService';
import type { InspectorPanelProps, AssetSyncInfo } from '@/lib/core/inspector/types';
import { InspectorImagePreview } from './InspectorImagePreview';
import { useInspectorPanel } from './useInspectorPanel';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { ImageResourceEntry } from '@ocentra/asset-domain/resourceEntry/ImageResourceEntry';
import '@/lib/core/inspector/InspectorPanel.css';

const LOG_INSPECTOR_CONSTRUCTOR = false;
const LOG_IMAGE_INSPECTOR = false;

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const LOG_INSPECTOR_PANEL = false;

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  assetPath,
  assetData,
  isLoading = false,
  error = null,
  onAssetUpdate,
  onNavigateToAsset,
  onCreateAsset,
  onDeleteGameMode,
  syncStatus,
}) => {
  const systemGuid = assetData?.system && typeof assetData.system === 'object' && 'guid' in assetData.system
    ? (typeof (assetData.system as { guid?: string | { _value?: string } }).guid === 'string'
        ? (assetData.system as { guid: string }).guid
        : ((assetData.system as { guid?: { _value?: string } }).guid?._value || null))
    : null;
  
  const isVirtualAsset = assetPath?.startsWith('virtual:') || systemGuid?.startsWith('virtual:');
  const assetGuid = systemGuid || (assetPath && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assetPath) ? assetPath : null);

  const {
    editedData,
    hasChanges,
    resource,
    imageDimensions,
    cacheStatus,
    handleFieldChange,
    handleSave,
    handleReset,
  } = useInspectorPanel({
    assetGuid,
    assetData,
    onAssetUpdate,
  });

  const isImageResource = resource && 'hash' in resource && typeof resource.hash === 'string' && resource.hash !== '';
  const hasImageHash = assetData?.data && typeof assetData.data === 'object' && 
    ((assetData.data as { imageHash?: string; hash?: string })?.imageHash || 
     (assetData.data as { imageHash?: string; hash?: string })?.hash);
  const isImage = isImageResource || !!hasImageHash;

  const rawAssetType = (assetData?.system as { assetType?: string })?.assetType 
    || assetData?.metadata?.assetType 
    || (editedData?.system as { assetType?: string })?.assetType 
    || editedData?.metadata?.assetType 
    || 'Unknown';
  
  let assetType: string;
  if (resource instanceof AssetResourceEntry) {
    assetType = resource.assetType && resource.assetType !== '' ? resource.assetType : rawAssetType;
  } else if (resource instanceof ImageResourceEntry) {
    assetType = ImageResourceEntry.assetType || rawAssetType;
  } else if (resource && 'type' in resource && typeof resource.type === 'string' && resource.type !== '') {
    assetType = resource.type;
  } else if (rawAssetType === 'AssetResourceEntry' && assetData?.system && typeof assetData.system === 'object' && 'type' in assetData.system) {
    assetType = (assetData.system as { type?: string }).type || rawAssetType;
  } else {
    assetType = rawAssetType;
  }

  log.logInfo('[InspectorPanel] AssetType determined', getStackTrace(), {
    rawAssetType,
    finalAssetType: assetType,
    hasResource: !!resource,
    resourceType: resource ? resource.constructor.name : 'none',
    isVirtualAsset,
    assetPath,
    systemGuid
  }, LOG_INSPECTOR_PANEL);

  let assetId: string;
  if (resource instanceof ImageResourceEntry) {
    if (resource.path) {
      const fileName = resource.path.split('/').pop() || resource.displayName || 'image';
      assetId = fileName;
    } else {
      assetId = resource.displayName || 'N/A';
    }
  } else if (resource instanceof AssetResourceEntry) {
    assetId = resource.displayName || 'N/A';
  } else {
    assetId = (assetData?.system as { displayName?: string })?.displayName
      || assetData?.metadata?.assetId 
      || (editedData?.system as { displayName?: string })?.displayName
      || editedData?.metadata?.assetId 
      || 'N/A';
  }
  
  if (LOG_IMAGE_INSPECTOR && assetGuid) {
    log.logInfo('[InspectorPanel] Rendering inspector', getStackTrace(), {
      assetType,
      isImage,
      hasAssetData: !!assetData,
      hasEditedData: !!editedData,
      hasAssetGuid: !!assetGuid,
      editedDataKeys: editedData ? Object.keys(editedData) : [],
      editedDataDataKeys: editedData?.data && typeof editedData.data === 'object' ? Object.keys(editedData.data) : [],
    });
  }

  const getSyncInfo = (): AssetSyncInfo | undefined => {
    if (!assetGuid || !syncStatus?.assets) return undefined;

    const assetSync = syncStatus.assets[assetGuid];
    if (!assetSync) return undefined;

    return {
      synced: assetSync.synced,
      status: assetSync.status,
      localModified: assetSync.localModified,
      cloudModified: assetSync.cloudModified,
    };
  };

  const syncInfo = getSyncInfo();

  if (error) {
    return (
      <div className="inspector-panel inspector-panel--empty">
        <div className="inspector-panel__placeholder">
          <p className="inspector-panel__error">Error loading asset</p>
          <p className="inspector-panel__placeholder-subtitle inspector-panel__error-message">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="inspector-panel inspector-panel--empty">
        <div className="inspector-panel__placeholder">
          <div className="inspector-panel__loading">
            <div className="inspector-panel__spinner"></div>
          </div>
          <p className="inspector-panel__placeholder-subtitle">Loading asset...</p>
        </div>
      </div>
    );
  }

  if ((!isImage && !assetGuid && !isVirtualAsset) || !assetData || !editedData) {
    return (
      <div className="inspector-panel inspector-panel--empty">
        <div className="inspector-panel__placeholder">
          <p>No asset selected</p>
          <p className="inspector-panel__placeholder-subtitle">
            Select an asset to view and edit its properties
          </p>
        </div>
      </div>
    );
  }

  if (assetType === 'AssetCatalog') {
    return (
      <div className="inspector-panel inspector-panel--empty">
        <div className="inspector-panel__placeholder">
          <p>Workspace View</p>
          <p className="inspector-panel__placeholder-subtitle">
            Asset Catalog is a workspace surface. Open another inspector or lock one
            to compare authored assets side by side.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="inspector-panel">
      <div className="inspector-panel__header">
        <h3>Inspector</h3>
        {hasChanges && (
          <div className="inspector-panel__header-actions">
            <button
              className="inspector-panel__button inspector-panel__button--save"
              onClick={() => handleSave(assetGuid || '')}
            >
              Save
            </button>
            <button
              className="inspector-panel__button inspector-panel__button--reset"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        )}
      </div>
      <div className="inspector-panel__content">
        <BaseInspector
          assetType={assetType}
          assetId={assetId}
          assetPath={resource?.path || assetGuid || ''}
          syncInfo={syncInfo}
          resource={resource}
          displayMetadata={{
            typeCategory: editedData.metadata?.typeCategory,
            schemaVersion: editedData.system && typeof editedData.system === 'object' && 'schemaVersion' in editedData.system
              ? (editedData.system as { schemaVersion?: number }).schemaVersion
              : undefined,
            tags: editedData.metadata?.tags,
            status: editedData.metadata?.status,
            imageWidth: imageDimensions?.width,
            imageHeight: imageDimensions?.height,
            cacheStatus: cacheStatus || undefined,
          }}
        />

        {isImage ? (
          <>
            <div className="inspector-panel__section">
              <div className="inspector-panel__section-header">Image Preview</div>
              <div className="inspector-panel__image-preview-full">
                <InspectorImagePreview 
                  imageHash={resource && 'hash' in resource && typeof resource.hash === 'string'
                    ? resource.hash
                    : (editedData?.data && typeof editedData.data === 'object' 
                      ? ((editedData.data as { imageHash?: string; hash?: string })?.imageHash 
                        || (editedData.data as { imageHash?: string; hash?: string })?.hash)
                      : null)
                    || null}
                  assetId={assetId} 
                />
              </div>
            </div>
            <div className="inspector-panel__section">
              <div className="inspector-panel__section-header">Properties</div>
              <GenericInspector
                data={editedData?.data || editedData}
                assetType={assetType}
                onFieldChange={handleFieldChange}
                excludeKeys={['system', 'metadata', '_markdownBody']}
                onNavigateToAsset={onNavigateToAsset}
                onCreateAsset={onCreateAsset}
                onDeleteGameMode={onDeleteGameMode}
                currentGameId={(editedData.system as { gameId?: string; displayName?: string })?.gameId || (editedData.system as { displayName?: string })?.displayName}
              />
            </div>
          </>
        ) : (() => {
          const hasInspector = InspectorService.hasInspectorByTypeName(assetType);
          if (LOG_INSPECTOR_CONSTRUCTOR) {
            log.logInfo('[InspectorPanel] Checking inspector availability', getStackTrace(), {
              assetType,
              hasInspector
            });
          }
          return hasInspector;
        })() ? (
              <Inspector
                data={editedData}
            assetType={assetType}
                onFieldChange={handleFieldChange}
                onNavigateToAsset={onNavigateToAsset}
                onCreateAsset={onCreateAsset as ((folderPath?: string, options?: unknown) => void) | undefined}
                onDeleteGameMode={onDeleteGameMode}
              />
        ) : (
          <div className="inspector-panel__section">
            <div className="inspector-panel__section-header">Properties</div>
            <GenericInspector
              data={editedData?.data || editedData}
              assetType={assetType}
              onFieldChange={handleFieldChange}
              excludeKeys={['system', 'metadata', '_markdownBody']}
              onNavigateToAsset={onNavigateToAsset}
              onCreateAsset={onCreateAsset}
              onDeleteGameMode={onDeleteGameMode}
              currentGameId={editedData.metadata?.gameId as string | undefined || (editedData.system as { displayName?: string })?.displayName}
            />
          </div>
        )}
      </div>
    </div>
  );
};
