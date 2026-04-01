import { useState, useEffect } from 'react';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { AssetReference } from '@ocentra/asset-domain/AssetReference';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const LOG_ASSETS = false;

const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_ASSETS) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

/**
 * Generic hook for loading any ScriptableObject asset
 * Handles loading state, error handling, and caching
 * 
 * @param constructor - Constructor function for the asset type
 * @param pathOrRef - Asset path string or AssetReference object
 * @returns Asset instance or null
 */
export function useAsset<T extends ScriptableObject>(
  constructor: new () => T,
  pathOrRef: string | AssetReference | null
): T | null {
  const [asset, setAsset] = useState<T | null>(null);

  useEffect(() => {
    if (!pathOrRef) {
      setAsset(null);
      return;
    }

    // Extract GUID from AssetReference or use path string directly
    if (typeof pathOrRef === 'string') {
      // Treat string as GUID
      (async () => {
        try {
          const { AssetGUID } = await import('@ocentra/asset-domain/AssetGUID');
          const loadedAsset = await ScriptableObject.loadByGuid(constructor, AssetGUID.from(pathOrRef));
          setAsset(loadedAsset);
        } catch (err) {
          logError(`Failed to load asset by GUID ${pathOrRef}:`, err, LOG_ASSETS);
          setAsset(null);
        }
      })();
    } else if (pathOrRef.guid) {
      // GUID-based loading
      (async () => {
        try {
          const { AssetGUID } = await import('@ocentra/asset-domain/AssetGUID');
          const loadedAsset = await ScriptableObject.loadByGuid(constructor, AssetGUID.from(pathOrRef.guid));
          setAsset(loadedAsset);
        } catch (err) {
          logError(`Failed to load asset by GUID ${pathOrRef.guid}:`, err, LOG_ASSETS);
          setAsset(null);
        }
      })();
    } else {
      setAsset(null);
    }
  }, [constructor, pathOrRef]);

  return asset;
}

/**
 * Hook state including loading and error states
 */
export interface UseAssetState<T extends ScriptableObject> {
  asset: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Enhanced hook with loading and error states
 */
export function useAssetWithState<T extends ScriptableObject>(
  constructor: new () => T,
  pathOrRef: string | AssetReference | null
): UseAssetState<T> {
  const [asset, setAsset] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!pathOrRef) {
      setAsset(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (typeof pathOrRef === 'string') {
      setLoading(true);
      setError(null);
      (async () => {
        try {
          const { AssetGUID } = await import('@ocentra/asset-domain/AssetGUID');
          const loadedAsset = await ScriptableObject.loadByGuid(constructor, AssetGUID.from(pathOrRef));
          setAsset(loadedAsset);
          setLoading(false);
        } catch (err) {
          logError(`Failed to load asset by GUID ${pathOrRef}:`, err, LOG_ASSETS);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      })();
    } else if (pathOrRef.guid) {
      setLoading(true);
      setError(null);
      (async () => {
        try {
          const { AssetGUID } = await import('@ocentra/asset-domain/AssetGUID');
          const loadedAsset = await ScriptableObject.loadByGuid(constructor, AssetGUID.from(pathOrRef.guid));
          setAsset(loadedAsset);
          setLoading(false);
        } catch (err) {
          logError(`Failed to load asset by GUID ${pathOrRef.guid}:`, err, LOG_ASSETS);
          setError(err instanceof Error ? err : new Error(String(err)));
          setAsset(null);
          setLoading(false);
        }
      })();
    } else {
      setAsset(null);
      setLoading(false);
      setError(new Error('No GUID available for asset'));
    }
  }, [constructor, pathOrRef]);

  return { asset, loading, error };
}

