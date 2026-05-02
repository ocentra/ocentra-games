import { useState, useCallback, useEffect, useRef } from 'react';
import type { AssetData } from '@/types/assets';
import { EditorImageCache } from '@/lib/cache/EditorImageCache';
import { ImageVariant } from '@/lib/cache/editorImageTypes';
import { isTauri } from '@/adapters/assets/TauriAssetAdapter';
import type { AssetSelectInfo } from '@/pages/ResourceTree/types';
import type { AssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

export function useAssetNavigation(
  selectedAsset: string | null,
  setSelectedAsset: (asset: string | null) => void,
  assetPath: string | null,
  assetData: AssetData | null,
  isLoadingAsset: boolean,
  loadAsset: (path: string) => Promise<void>,
  setAssetData: (data: AssetData | null) => void,
  setAssetPath: (path: string | null) => void,
  setAssetRawContent: ((content: string | null) => void) | null,
  setAssetError: ((error: string | null) => void) | null,
  setIsLoadingAsset: ((loading: boolean) => void) | null
) {
  const [navigationHistory, setNavigationHistory] = useState<Array<{ path: string; name: string }>>([]);
  const isNavigatingRef = useRef(false);
  const selectedAssetRef = useRef(selectedAsset);

  useEffect(() => {
    selectedAssetRef.current = selectedAsset;
  }, [selectedAsset]);

  const handleAssetSelect = useCallback((info: AssetSelectInfo | string) => {
    const selectStart = performance.now();
    log.logInfo('[useAssetNavigation] handleAssetSelect START', getStackTrace(), { info }, false);

    let identifier: string;
    let isGuid = false;
    let isHash = false;
    
    if (typeof info === 'string') {
      identifier = info;
      isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      isHash = /^[a-f0-9]{64}$/i.test(identifier);
    } else {
      if (info.path && isTauri()) {
        identifier = info.path;
      } else if (info.hash) {
        identifier = info.hash;
        isHash = true;
      } else if (info.guid) {
        identifier = info.guid;
        isGuid = true;
      } else {
        identifier = info.id;
        isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        isHash = /^[a-f0-9]{64}$/i.test(identifier);
      }
    }
    
    const normalizedNew = isGuid || isHash ? identifier : (identifier.startsWith('/') ? identifier : `/${identifier}`);
    const normalizedCurrent = selectedAsset?.startsWith('/') ? selectedAsset : selectedAsset ? `/${selectedAsset}` : null;

    if (normalizedNew === normalizedCurrent) {
      return;
    }

    selectedAssetRef.current = normalizedNew;
    setSelectedAsset(normalizedNew);
    if (setAssetError) setAssetError(null);

    if (typeof info === 'object' && info.meta?.imageHash) {
      const imageCache = EditorImageCache.getInstance();
      void imageCache.getCachedImageByHash(info.meta.imageHash, ImageVariant.Full).then((cached) => {
        if (selectedAssetRef.current !== normalizedNew) return;
        if (cached && info.meta) {
          const fileName = typeof info === 'object' && info.meta?.guid ? info.meta.guid : (identifier.split('/').pop() || 'image');
          const imageData: AssetData = {
            system: {
              displayName: fileName,
              guid: info.meta.guid || '',
              schemaVersion: 1,
            },
            data: {
              imageHash: info.meta.imageHash,
              hash: info.meta.imageHash,
            },
            _meta: info.meta,
          };
          setAssetData(imageData);
          setAssetPath(normalizedNew);
          if (setAssetRawContent) setAssetRawContent(null);
          if (setAssetError) setAssetError(null);
          if (setIsLoadingAsset) setIsLoadingAsset(false);
        }
      }).catch(() => {
        void 0;
      });
    } else if (typeof info === 'object' && info.hash) {
      const imageCache = EditorImageCache.getInstance();
      void imageCache.getCachedImageByHash(info.hash, ImageVariant.Full).then((cached) => {
        if (selectedAssetRef.current !== normalizedNew) return;
        if (cached) {
          const fileName = identifier.split('/').pop() || 'image';
          const imageData: AssetData = {
            system: {
              displayName: fileName,
              guid: info.guid || '',
              schemaVersion: 1,
            },
            data: {
              imageHash: info.hash,
              hash: info.hash,
            },
          };
          setAssetData(imageData);
          setAssetPath(normalizedNew);
          if (setAssetRawContent) setAssetRawContent(null);
          if (setAssetError) setAssetError(null);
          if (setIsLoadingAsset) setIsLoadingAsset(false);
        } else {
          void loadAsset(normalizedNew);
        }
      }).catch(() => {
        if (selectedAssetRef.current !== normalizedNew) return;
        void loadAsset(normalizedNew);
      });
    } else {
      void loadAsset(normalizedNew);
    }

    const selectEnd = performance.now();
    log.logInfo(`[useAssetNavigation] handleAssetSelect END - ${(selectEnd - selectStart).toFixed(2)}ms`, getStackTrace(), undefined, false);
  }, [selectedAsset, setSelectedAsset, setAssetData, setAssetPath, setAssetRawContent, setAssetError, setIsLoadingAsset, loadAsset]);

  const handleNavigateToAsset = useCallback((identifier: AssetIdentifier) => {
    if (!identifier) return;
    if (isNavigatingRef.current) return;
    if (isLoadingAsset) return;

    const targetPath = identifier as string;
    const pathForCheck = targetPath.startsWith('/') ? targetPath.substring(1) : targetPath;
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pathForCheck);
    const isHash = /^[a-f0-9]{64}$/i.test(pathForCheck);
    
    const normalizedTarget = (isGuid || isHash) ? targetPath : (targetPath.startsWith('/') ? targetPath : `/${targetPath}`);
    const normalizedCurrent = assetPath?.startsWith('/') ? assetPath : assetPath ? `/${assetPath}` : null;

    if (normalizedTarget === normalizedCurrent) return;

    const isInHistory = navigationHistory.some(item => {
      const normalizedItem = item.path.startsWith('/') ? item.path : `/${item.path}`;
      return normalizedItem === normalizedTarget;
    });

    if (isInHistory && normalizedCurrent) {
      const targetIndex = navigationHistory.findIndex(item => {
        const normalizedItem = item.path.startsWith('/') ? item.path : `/${item.path}`;
        return normalizedItem === normalizedTarget;
      });

      if (targetIndex >= 0) {
        setNavigationHistory(prev => prev.slice(0, targetIndex + 1));
        handleAssetSelect(normalizedTarget);
        return;
      }
    }

    if (normalizedCurrent && assetData) {
      const system = assetData.system as { displayName?: string } | undefined;
      const assetName = system?.displayName || assetData.assetId || assetData.metadata?.assetId || normalizedCurrent.split('/').pop() || 'Unknown';
      setNavigationHistory(prev => {
        const lastItem = prev[prev.length - 1];
        if (lastItem?.path === normalizedCurrent) {
          return prev;
        }
        return [...prev, { path: normalizedCurrent, name: String(assetName) }];
      });
    }

    handleAssetSelect(normalizedTarget);
  }, [assetPath, assetData, handleAssetSelect, isLoadingAsset, navigationHistory]);

  const handleBack = useCallback(() => {
    if (isNavigatingRef.current) return;
    if (isLoadingAsset) return;
    if (navigationHistory.length === 0) return;

    const previous = navigationHistory[navigationHistory.length - 1];
    const normalizedPrevious = previous.path.startsWith('/') ? previous.path : `/${previous.path}`;
    const normalizedCurrent = assetPath?.startsWith('/') ? assetPath : assetPath ? `/${assetPath}` : null;

    if (normalizedPrevious === normalizedCurrent) {
      setNavigationHistory(prev => prev.slice(0, -1));
      return;
    }

    isNavigatingRef.current = true;
    setNavigationHistory(prev => prev.slice(0, -1));
    handleAssetSelect(normalizedPrevious);

    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 300);
  }, [navigationHistory, assetPath, handleAssetSelect, isLoadingAsset]);

  return {
    navigationHistory,
    handleAssetSelect,
    handleNavigateToAsset,
    handleBack,
  };
}
