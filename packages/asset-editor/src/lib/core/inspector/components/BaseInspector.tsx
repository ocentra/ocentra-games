import React, { useState } from 'react';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { AssetSyncStatus as AssetSyncStatusValue } from '@ocentra/asset-domain/constants/sync';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { ImageResourceEntry } from '@ocentra/asset-domain/resourceEntry/ImageResourceEntry';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { SyncAssetEvent } from '@ocentra/eventing-domain/events/assets/SyncAssetEvent';
import { getStorageConfig } from '@/services/storage/StorageConfig';
import './BaseInspector.css';
import type { AssetSyncInfo, BaseInspectorProps } from '@/lib/core/inspector/types';

const log = AssetEditorLogger.instance;
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

export type { AssetSyncInfo, BaseInspectorProps };

export const BaseInspector: React.FC<BaseInspectorProps> = ({
  assetType,
  assetId,
  assetPath,
  syncInfo,
  resource,
  displayMetadata,
  onSyncRequested,
  onSyncStatusRefresh,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAssetIdentityExpanded, setIsAssetIdentityExpanded] = useState(true);
  const [cloudCheckState, setCloudCheckState] = useState<{ checked: boolean; synced: boolean; url?: string } | null>(null);
  
  const [prevAssetPath, setPrevAssetPath] = useState(assetPath);
  if (assetPath !== prevAssetPath) {
    setPrevAssetPath(assetPath);
    setCloudCheckState(null);
  }

  
  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'Published':
        return 'base-inspector__status-badge--published';
      case 'Draft':
        return 'base-inspector__status-badge--draft';
      case 'ComingSoon':
        return 'base-inspector__status-badge--coming-soon';
      case 'Archived':
        return 'base-inspector__status-badge--archived';
      default:
        return 'base-inspector__status-badge--default';
    }
  };

  const getSyncStatusBadgeClass = (status?: string) => {
    switch (status) {
      case AssetSyncStatusValue.Synced:
        return 'base-inspector__status-badge--synced';
      case AssetSyncStatusValue.Changed:
        return 'base-inspector__status-badge--changed';
      case AssetSyncStatusValue.NotInCloud:
        return 'base-inspector__status-badge--not-in-cloud';
      case AssetSyncStatusValue.Syncing:
        return 'base-inspector__status-badge--syncing';
      default:
        return 'base-inspector__status-badge--default';
    }
  };

  const getRemoteUrl = (): string | null => {
    return syncInfo?.remoteUrl || null;
  };

  const handleSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      if (onSyncRequested) {
        await onSyncRequested();
      } else {
        const normalizedPath = assetPath ? assetPath.replace(/^\/+/, '').replace(/^Resources\//, '') : '';
        const syncDeferred = new OperationDeferred<void>();
        await EventBus.instance.publishAsync(new SyncAssetEvent(normalizedPath, syncDeferred));
        const result = await syncDeferred.promise;
        if (!result.isSuccess) {
          throw new Error(result.errorMessage || 'Sync failed');
        }
      }
      
      if (onSyncStatusRefresh) {
        await onSyncStatusRefresh();
      }
    } catch (error) {
      logError('Sync failed:', error);
      alert(`Failed to sync asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const getSyncStatusLabel = (): string => {
    if (!syncInfo) return 'Unknown';
    switch (syncInfo.status) {
      case AssetSyncStatusValue.Synced:
        return 'Synced';
      case AssetSyncStatusValue.Changed:
        return 'Changed (needs sync)';
      case AssetSyncStatusValue.NotInCloud:
        return 'Not in Cloud';
      case AssetSyncStatusValue.Syncing:
        return 'Syncing...';
      default:
        return 'Unknown';
    }
  };

  const hasChanges = syncInfo?.status === AssetSyncStatusValue.Changed;
  const needsSync = syncInfo?.status === AssetSyncStatusValue.Changed || syncInfo?.status === AssetSyncStatusValue.NotInCloud;
  const remoteUrl = getRemoteUrl();

  const guid = resource instanceof AssetResourceEntry ? (resource.guid || '') : (assetPath || '');
  const createdAt = resource?.createdAt;
  const updatedAt = resource?.updatedAt;
  const mimeType = resource?.mimeType;
  const fileSize = resource?.fileSize;
  const checksum = resource?.checksum;
  const imageHash = resource instanceof ImageResourceEntry ? resource.hash : undefined;

  return (
    <div className="base-inspector">
      <div className="base-inspector__section">
        <button
          className="base-inspector__section-header base-inspector__section-header--collapsible"
          onClick={() => setIsAssetIdentityExpanded(!isAssetIdentityExpanded)}
          type="button"
        >
          <span>Asset Identity</span>
          <span className="base-inspector__collapse-icon">
            {isAssetIdentityExpanded ? '▼' : '▶'}
          </span>
        </button>
        {isAssetIdentityExpanded && (
          <div className="base-inspector__section-content">
            <Field label="Type" value={assetType} readOnly />
            {displayMetadata?.typeCategory && (
              <Field label="Category" value={displayMetadata.typeCategory} readOnly />
            )}
            <Field label="ID" value={assetId} readOnly />
            <Field label="Local Path" value={assetPath} readOnly />
            {resource instanceof AssetResourceEntry && (
              <Field 
                label="GUID (Immutable)" 
                value={guid || '—'} 
                readOnly 
              />
            )}
            {resource instanceof ImageResourceEntry && imageHash && (
              <Field 
                label="Hash (Immutable)" 
                value={imageHash} 
                readOnly 
              />
            )}
            {displayMetadata?.schemaVersion && (
              <Field label="Schema Version" value={String(displayMetadata.schemaVersion)} readOnly />
            )}

            {(createdAt || updatedAt) && (
              <>
                <div className="base-inspector__subsection-header">Timestamps</div>
                {createdAt && (
                  <Field label="Created" value={(createdAt instanceof Date ? createdAt : createdAt.toDate()).toLocaleString()} readOnly />
                )}
                {updatedAt && (
                  <Field label="Modified" value={(updatedAt instanceof Date ? updatedAt : updatedAt.toDate()).toLocaleString()} readOnly />
                )}
              </>
            )}

            {resource instanceof ImageResourceEntry && resource && (
              <>
                <div className="base-inspector__subsection-header">File Information</div>
                {mimeType && (
                  <Field label="MIME Type" value={mimeType} readOnly />
                )}
                {fileSize !== undefined && fileSize !== null && (
                  <Field label="File Size" value={`${(fileSize / 1024).toFixed(2)} KB`} readOnly />
                )}
                {displayMetadata?.imageWidth && displayMetadata?.imageHeight && (
                  <Field label="Dimensions" value={`${displayMetadata.imageWidth} × ${displayMetadata.imageHeight} px`} readOnly />
                )}
                {checksum && (
                  <Field label="Checksum" value={checksum.substring(0, 16) + '...'} readOnly />
                )}
                <div className="base-inspector__subsection-header">Image Cache</div>
                {displayMetadata?.cacheStatus && (
                  <>
                    <Field 
                      label="Cache Status" 
                      value={displayMetadata.cacheStatus.isCached ? '✅ Cached' : '❌ Not Cached'} 
                      readOnly 
                    />
                    {displayMetadata.cacheStatus.isCached && (
                      <>
                        <Field 
                          label="Hash Verified" 
                          value={displayMetadata.cacheStatus.hashVerified ? '✅ Verified' : '⚠️ Mismatch'} 
                          readOnly 
                        />
                        {displayMetadata.cacheStatus.cacheSize !== undefined && (
                          <Field label="Cache Size" value={`${(displayMetadata.cacheStatus.cacheSize / 1024).toFixed(2)} KB`} readOnly />
                        )}
                        {displayMetadata.cacheStatus.cachedAt && (
                          <Field label="Cached At" value={new Date(displayMetadata.cacheStatus.cachedAt).toLocaleString()} readOnly />
                        )}
                      </>
                    )}
                  </>
                )}
                {imageHash && (
                  <Field label="Image Hash" value={imageHash.substring(0, 16) + '...'} readOnly />
                )}
                {displayMetadata?.imageETag && (
                  <Field label="ETag" value={displayMetadata.imageETag} readOnly />
                )}
                {displayMetadata?.imageCachedAt && (
                  <Field label="Meta Cached At" value={new Date(displayMetadata.imageCachedAt).toLocaleString()} readOnly />
                )}
                <div className="base-inspector__subsection-header">
                  ☁️ Cloud Sync Status
                  {!cloudCheckState?.checked && (
                    <button
                      className="base-inspector__sync-button"
                      onClick={async () => {
                        if (!assetPath) return;
                        try {
                          const config = getStorageConfig();
                          if (!config.r2Assets?.workerUrl) {
                            alert('Cloud storage is not enabled');
                            return;
                          }
                          
                          const cloudUrl = null;
                          
                          setCloudCheckState({
                            checked: true,
                            synced: false,
                            url: cloudUrl || undefined,
                          });
                        } catch (error) {
                          logError('Failed to check cloud status:', error);
                          alert('Failed to check cloud status');
                        }
                      }}
                      title="Check if this image is synced to cloud storage"
                    >
                      ☁️ Check Cloud Status
                    </button>
                  )}
                </div>
                {cloudCheckState?.checked ? (
                  <>
                    <Field 
                      label="Cloud Status" 
                      value={cloudCheckState.synced ? '✅ Synced' : '❌ Not Synced'} 
                      readOnly 
                    />
                    {cloudCheckState.url && (
                      <div className="base-inspector__field">
                        <div className="base-inspector__field-label">Cloud URL</div>
                        <a
                          href={cloudCheckState.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="base-inspector__link"
                          title={cloudCheckState.url}
                        >
                          {cloudCheckState.url.length > 60 
                            ? cloudCheckState.url.substring(0, 60) + '...' 
                            : cloudCheckState.url}
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="base-inspector__field">
                    <div className="base-inspector__field-value base-inspector__field-value--readonly">
                      Not checked (click "Check Cloud Status" to verify)
                    </div>
                  </div>
                )}
              </>
            )}

            {!(resource instanceof ImageResourceEntry) && (
              <>
                <div className="base-inspector__subsection-header">
                  ☁️ Cloud Sync
                  {needsSync && (
                    <button
                      className="base-inspector__sync-button"
                      onClick={handleSync}
                      disabled={isSyncing}
                      title={isSyncing ? 'Syncing...' : 'Sync this asset to cloud storage'}
                    >
                      {isSyncing ? 'Syncing...' : '☁️ Sync to Cloud'}
                    </button>
                  )}
                </div>
                {syncInfo ? (
              <>
                <div className="base-inspector__sync-status">
                  <span
                    className={`base-inspector__status-badge ${getSyncStatusBadgeClass(syncInfo.status)}`}
                  >
                    {getSyncStatusLabel()}
                  </span>
                  {hasChanges && (
                    <span className="base-inspector__change-indicator" title="Asset has been modified since last sync">
                      ⚠ Changed
                    </span>
                  )}
                </div>
                {syncInfo.localModified && (
                  <Field label="Local Modified" value={new Date(syncInfo.localModified).toLocaleString()} readOnly />
                )}
                {syncInfo.cloudModified && (
                  <Field label="Cloud Modified" value={new Date(syncInfo.cloudModified).toLocaleString()} readOnly />
                )}
                {hasChanges && syncInfo.localModified && syncInfo.cloudModified && (
                  <div className="base-inspector__field">
                    <div className="base-inspector__field-label">Status</div>
                    <div className="base-inspector__field-value base-inspector__field-value--warning">
                      Local version is newer than cloud version
                    </div>
                  </div>
                )}
                {remoteUrl && (
                  <div className="base-inspector__field">
                    <div className="base-inspector__field-label">Remote URL</div>
                    <a
                      href={remoteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="base-inspector__link"
                    >
                      {remoteUrl}
                    </a>
                  </div>
                )}
              </>
            ) : (
                  <div className="base-inspector__field">
                    <div className="base-inspector__field-value base-inspector__field-value--readonly">
                      Sync status not available
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {displayMetadata?.tags && displayMetadata.tags.length > 0 && (
        <div className="base-inspector__section">
          <div className="base-inspector__section-header">Tags</div>
          <div className="base-inspector__tags">
            {displayMetadata.tags.map((tag, index) => (
              <span key={index} className="base-inspector__tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {displayMetadata?.status && (
        <div className="base-inspector__section">
          <div className="base-inspector__section-header">Publication</div>
          <div className="base-inspector__status">
            <span
              className={`base-inspector__status-badge ${getStatusBadgeClass(displayMetadata.status)}`}
            >
              {displayMetadata.status}
            </span>
          </div>
        </div>
      )}

    </div>
  );
};

interface FieldProps {
  label: string;
  value: string;
  readOnly?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, value, readOnly = false }) => {
  const inputId = `field-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className="base-inspector__field">
      <label htmlFor={inputId} className="base-inspector__field-label">{label}</label>
      {readOnly ? (
        <div className="base-inspector__field-value base-inspector__field-value--readonly">{value}</div>
      ) : (
        <input
          id={inputId}
          type="text"
          className="base-inspector__field-input"
          value={value}
          readOnly
          title={label}
        />
      )}
    </div>
  )
}


