import { useState, useEffect, useRef } from 'react';
import { EditorImageCache } from '@/lib/cache/EditorImageCache';
import type { AssetData } from '@/types/assets';
import type { CacheStatus, ImageDimensions } from './types';
import JSON5 from 'json5';
import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { ImageResourceEntry } from '@ocentra/asset-domain/resourceEntry/ImageResourceEntry';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetResourceByHashEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByHashEvent';
import { GetResourceByGuidEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByGuidEvent';
import { UploadAssetEvent } from '@ocentra/eventing-domain/events/assets/UploadAssetEvent';
import { AssetLoader } from '@/adapters/assets/AssetLoader';
import type { AssetEntry } from '@ocentra/boundary-domain/types/asset-entry';

const LOG_IMAGE_INSPECTOR = false;

const ASSET_CATALOG_ASSET_TYPE = 'AssetCatalog' as const;

const imageCache = EditorImageCache.getInstance();
const log = AssetEditorLogger.instance;
log.register(import.meta.url);

interface UseInspectorPanelProps {
  assetGuid: string | null;
  assetData: AssetData | null;
  onAssetUpdate: (asset: AssetData) => void;
}

export function useInspectorPanel({ assetGuid, assetData, onAssetUpdate }: UseInspectorPanelProps) {
  const [editedData, setEditedData] = useState<AssetData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [resource, setResource] = useState<ResourceEntry | null>(null);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const lastProcessedGuidRef = useRef<string | null>(null);
  const lastProcessedHashRef = useRef<string | null>(null);
  const assetDataRef = useRef<AssetData | null>(null);

  useEffect(() => {
    assetDataRef.current = assetData;
  }, [assetData]);

  useEffect(() => {
    const currentAssetData = assetDataRef.current;

    if (!currentAssetData) {
      if (lastProcessedGuidRef.current !== null || lastProcessedHashRef.current !== null) {
        setEditedData(null);
        setHasChanges(false);
        lastProcessedGuidRef.current = null;
        lastProcessedHashRef.current = null;
      }
      return;
    }

      const hasImageHash = currentAssetData.data && typeof currentAssetData.data === 'object' && 
        ((currentAssetData.data as { imageHash?: string; hash?: string })?.imageHash || 
         (currentAssetData.data as { imageHash?: string; hash?: string })?.hash);
      const isImage = !!hasImageHash;
      const rawAssetType = (currentAssetData.system as { assetType?: string })?.assetType;
      const assetType = rawAssetType;
    
    if (LOG_IMAGE_INSPECTOR) {
      log.logInfo('[useInspectorPanel] Processing asset data', getStackTrace(), {
        assetType,
        isImage,
        hasData: !!currentAssetData.data,
        dataKeys: currentAssetData.data && typeof currentAssetData.data === 'object' ? Object.keys(currentAssetData.data) : [],
        imageHash: currentAssetData.data && typeof currentAssetData.data === 'object' 
          ? ((currentAssetData.data as { imageHash?: string; hash?: string })?.imageHash || 
             (currentAssetData.data as { imageHash?: string; hash?: string })?.hash)
          : null,
      });
    }
    
    const loadImageData = async () => {
      if (isImage && currentAssetData.data && typeof currentAssetData.data === 'object') {
        const imageHash = (currentAssetData.data as { imageHash?: string; hash?: string })?.imageHash || 
                         (currentAssetData.data as { imageHash?: string; hash?: string })?.hash;
        if (LOG_IMAGE_INSPECTOR) {
          log.logInfo('[useInspectorPanel] Image detected, loading data', getStackTrace(), {
            imageHash,
            lastProcessedHash: lastProcessedHashRef.current,
            willSkip: imageHash === lastProcessedHashRef.current,
          });
        }
        if (imageHash) {
          if (imageHash === lastProcessedHashRef.current) {
            if (LOG_IMAGE_INSPECTOR) {
              log.logInfo('[useInspectorPanel] Skipping - already processed', getStackTrace());
            }
            return;
          }
          lastProcessedHashRef.current = imageHash;
          
          if (LOG_IMAGE_INSPECTOR) {
            log.logInfo('[useInspectorPanel] Setting initial editedData for image', getStackTrace(), {
              hasData: !!currentAssetData.data,
            });
          }
          setEditedData(currentAssetData);
          setHasChanges(false);
          
          try {
            const getResourceDeferred = new OperationDeferred<ResourceEntry | null>();
            await EventBus.instance.publishAsync(new GetResourceByHashEvent(imageHash, getResourceDeferred));
            const getResourceResult = await getResourceDeferred.promise;
            const resource = getResourceResult.isSuccess ? (getResourceResult.value ?? null) : null;
            if (LOG_IMAGE_INSPECTOR) {
              log.logInfo('[useInspectorPanel] Resource lookup result', getStackTrace(), {
                found: !!resource,
                path: resource?.path,
                hash: resource ? (resource instanceof ImageResourceEntry ? resource.hash : (resource as { hash?: string }).hash) : null,
                displayName: resource?.displayName,
              });
            }
            if (resource) {
              const imageData: AssetData = {
                ...currentAssetData,
                data: {
                  ...currentAssetData.data,
                  path: resource.path,
                  hash: resource instanceof ImageResourceEntry ? resource.hash : (resource as { hash?: string }).hash,
                  displayName: resource.displayName,
                  gameId: resource.gameId,
                  category: resource.category,
                  mimeType: resource.mimeType,
                  fileSize: resource.fileSize,
                  createdAt: resource.createdAt,
                  updatedAt: resource.updatedAt,
                  lastScanAt: resource.lastScanAt,
                },
              };
              if (LOG_IMAGE_INSPECTOR) {
                log.logInfo('[useInspectorPanel] Setting enriched image data', getStackTrace(), {
                  dataKeys: Object.keys(imageData.data || {}),
                });
              }
              setEditedData(imageData);
              setHasChanges(false);
              return;
            }
          } catch (error) {
            if (LOG_IMAGE_INSPECTOR) {
              log.logWarn('[useInspectorPanel] Failed to load image resource metadata', getStackTrace(), {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        } else {
          if (LOG_IMAGE_INSPECTOR) {
            log.logWarn('[useInspectorPanel] Image detected but no hash found', getStackTrace(), {
              dataKeys: Object.keys(currentAssetData.data || {}),
            });
          }
        }
      }
      
      lastProcessedHashRef.current = null;
      
      const currentGuid = assetGuid || (currentAssetData.system as { guid?: string | { _value?: string } })?.guid
        ? (typeof (currentAssetData.system as { guid?: string | { _value?: string } }).guid === 'string'
          ? (currentAssetData.system as { guid: string }).guid
          : ((currentAssetData.system as { guid?: { _value?: string } }).guid?._value || null))
        : null;

      if (currentGuid === lastProcessedGuidRef.current && !isImage) {
        return;
      }
      lastProcessedGuidRef.current = currentGuid;

        setEditedData(currentAssetData);
      setHasChanges(false);
    };

    void loadImageData();
  }, [assetGuid, assetData]);

  useEffect(() => {
    let isMounted = true;

    const systemGuid = assetData?.system && typeof assetData.system === 'object' && 'guid' in assetData.system
      ? (typeof (assetData.system as { guid?: string | { _value?: string } }).guid === 'string'
        ? (assetData.system as { guid: string }).guid
        : ((assetData.system as { guid?: { _value?: string } }).guid?._value || null))
      : null;

    const loadMetaGuid = async () => {
      const currentGuid = assetGuid || systemGuid;

      const hasImageHash = assetData?.data && typeof assetData.data === 'object' && 
        ((assetData.data as { imageHash?: string; hash?: string })?.imageHash || 
         (assetData.data as { imageHash?: string; hash?: string })?.hash);
      const isImageFromData = !!hasImageHash;

      if (!currentGuid && !isImageFromData) {
        if (isMounted) {
          setResource(null);
          setImageDimensions(null);
          setCacheStatus(null);
        }
        return;
      }
      
      const rawAssetType = assetData?.system && typeof assetData.system === 'object' && 'assetType' in assetData.system
        ? (assetData.system as { assetType?: string }).assetType
        : null;

      if (rawAssetType === ASSET_CATALOG_ASSET_TYPE) {
        return;
      }

      try {
        let foundResource: ResourceEntry | null = null;
        
        if (isImageFromData && assetData?.data && typeof assetData.data === 'object') {
          const imageHash = (assetData.data as { imageHash?: string; hash?: string })?.imageHash || 
                           (assetData.data as { imageHash?: string; hash?: string })?.hash;
          if (imageHash) {
            const getResourceDeferred = new OperationDeferred<ResourceEntry | null>();
            await EventBus.instance.publishAsync(new GetResourceByHashEvent(imageHash, getResourceDeferred));
            const getResourceResult = await getResourceDeferred.promise;
            foundResource = getResourceResult.isSuccess ? (getResourceResult.value ?? null) : null;
          }
        }
        
        if (!foundResource && currentGuid) {
          const getResourceDeferred = new OperationDeferred<ResourceEntry | null>();
          await EventBus.instance.publishAsync(new GetResourceByGuidEvent(currentGuid, getResourceDeferred));
          const getResourceResult = await getResourceDeferred.promise;
          foundResource = getResourceResult.isSuccess ? (getResourceResult.value ?? null) : null;
        }

        if (isMounted) {
          setResource(foundResource);

          if (foundResource instanceof ImageResourceEntry && foundResource.hash) {
            const loadImageCacheInfo = async () => {
              try {
                const cached = await imageCache.getCachedImageByHash(foundResource.hash);

                if (cached) {
                  const hashVerified = cached.hash === foundResource.hash;
                  setCacheStatus({
                    isCached: true,
                    hashVerified,
                    cacheSize: cached.size,
                    cachedAt: cached.cachedAt,
                    r2Checked: false,
                    r2Synced: false,
                  });
                } else {
                  setCacheStatus({
                    isCached: false,
                    hashVerified: false,
                    r2Checked: false,
                    r2Synced: false,
                  });
                }
              } catch {
                setCacheStatus({
                  isCached: false,
                  hashVerified: false,
                  r2Checked: false,
                  r2Synced: false,
                });
              }
            };

            const loadImageDimensions = async () => {
              try {
                const loader = AssetLoader.getInstance();
                const imageUrl = await loader.resolveImageUrlByHash(foundResource.hash);
                const img = new Image();
                await new Promise<void>((resolve, reject) => {
                  img.onload = () => {
                    if (isMounted) {
                      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                    }
                    URL.revokeObjectURL(imageUrl);
                    resolve();
                  };
                  img.onerror = () => {
                    URL.revokeObjectURL(imageUrl);
                    reject(new Error('Failed to load image'));
                  };
                  img.src = imageUrl;
                });
              } catch {
                void 0;
              }
            };

            void loadImageCacheInfo();
            void loadImageDimensions();
          } else {
            setImageDimensions(null);
            setCacheStatus(null);
          }
        } else {
          if (isMounted) {
            setResource(null);
            setImageDimensions(null);
            setCacheStatus(null);
          }
        }
      } catch {
        if (isMounted) {
          setResource(null);
          setImageDimensions(null);
          setCacheStatus(null);
        }
      }
    };

    loadMetaGuid();

    return () => {
      isMounted = false;
    };
  }, [assetGuid, assetData]);


  const handleFieldChange = (field: string, value: unknown) => {
    if (!editedData) return;
    const updated = { ...editedData };

    const keys = field.split('.');
    let target: Record<string, unknown> = updated as Record<string, unknown>;

    if ('data' in updated && typeof updated.data === 'object' && updated.data !== null) {
      target = updated.data as Record<string, unknown>;
    }

    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) {
        target[keys[i]] = {};
      }
      target = target[keys[i]] as Record<string, unknown>;
    }

    target[keys[keys.length - 1]] = value;
    setEditedData(updated);
    setHasChanges(true);
  };

  const handleSave = async (guid: string) => {
    if (!guid || !editedData) return;

    try {
      const assetToSave = { ...editedData };
      const system = assetToSave.system && typeof assetToSave.system === 'object'
        ? (assetToSave.system as Record<string, unknown>)
        : {};
      const metadata = assetToSave.metadata as { assetType?: string; assetId?: string } | undefined;
      const data = assetToSave.data && typeof assetToSave.data === 'object'
        ? (assetToSave.data as Record<string, unknown>)
        : {};

      if (assetToSave.system && typeof assetToSave.system === 'object') {
        system.guid = guid;
      }

      const content = JSON5.stringify(assetToSave, null, 2);

      const uploadDeferred = new OperationDeferred<AssetEntry>();
      await EventBus.instance.publishAsync(new UploadAssetEvent(
        guid,
        content,
        {
          assetType:
            (typeof system.assetType === 'string' ? system.assetType : null) ||
            metadata?.assetType ||
            (typeof data.type === 'string' ? data.type : null) ||
            'Unknown',
          displayName:
            (typeof system.displayName === 'string' ? system.displayName : null) ||
            metadata?.assetId ||
            (typeof data.displayName === 'string' ? data.displayName : null) ||
            '',
          category:
            (typeof system.category === 'string' ? system.category : null) ||
            (typeof data.category === 'string' ? data.category : null) ||
            'Content',
          mimeType: 'application/json',
          fileSize: content.length
        },
        uploadDeferred
      ));

      const uploadResult = await uploadDeferred.promise;
      if (!uploadResult.isSuccess) {
        throw new Error(`Failed to save asset: ${uploadResult.errorMessage || 'Unknown error'}`);
      }

      setHasChanges(false);
      onAssetUpdate(assetToSave);
    } catch (error) {
      alert(`Failed to save asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReset = () => {
    if (!assetData) return;
    setEditedData(JSON.parse(JSON.stringify(assetData)));
    setHasChanges(false);
  };

  return {
    editedData,
    hasChanges,
    resource,
    imageDimensions,
    cacheStatus,
    handleFieldChange,
    handleSave,
    handleReset,
  };
}
