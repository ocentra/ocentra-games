import React, { useState, useEffect, useRef, useMemo } from 'react';
import { InspectorService } from './InspectorService';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const LOG_INSPECTOR = false;
const BATCH_KEY_INSPECTOR = 'Inspector.useEffect';

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

log.registerBatchContext(BATCH_KEY_INSPECTOR, {
  enabled: true,
  batchSize: 100,
  flushInterval: 2000,
});

export async function InspectorAsync<T>(props: Parameters<typeof InspectorService.resolveInspectorComponent<T>>[0]) {
  return InspectorService.resolveInspectorComponent(props);
}

export function Inspector<T>(props: Parameters<typeof InspectorService.resolveInspectorComponent<T>>[0]) {
  const [element, setElement] = useState<React.ReactElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const propsRef = useRef(props);
  const lastKeyRef = useRef<string>('');

  propsRef.current = props;

  const dataKey = useMemo(() => {
    try {
      const data = props.data;
      if (data && typeof data === 'object') {
        if ('guid' in data && (data as { guid?: string }).guid) {
          return (data as { guid: string }).guid;
        }
        if ('path' in data && (data as { path?: string }).path) {
          return (data as { path: string }).path;
        }
        if ('assetRef' in data) {
          const assetRef = (data as { assetRef?: { guid?: string } }).assetRef;
          if (assetRef && typeof assetRef === 'object' && 'guid' in assetRef) {
            return assetRef.guid || '';
          }
        }
      }
      if (data === null || data === undefined) {
        return '';
      }
      if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
        return String(data);
      }
      return '';
    } catch {
      return '';
    }
  }, [props.data]);

  const currentKey = useMemo(() => {
    return `${props.assetType}-${dataKey}-${props.index || ''}-${props.prefix || ''}-${String(props.immutable || false)}`;
  }, [props.assetType, dataKey, props.index, props.prefix, props.immutable]);

  useEffect(() => {
    if (LOG_INSPECTOR) {
      log.logInfo('[Inspector] useEffect triggered', getStackTrace(), {
        currentKey,
        lastKey: lastKeyRef.current,
        assetType: props.assetType,
        willSkip: currentKey === lastKeyRef.current
      }, true, BATCH_KEY_INSPECTOR);
    }

    if (currentKey === lastKeyRef.current) {
      if (LOG_INSPECTOR) {
        log.logInfo('[Inspector] Skipping load - same key', getStackTrace(), undefined, true, BATCH_KEY_INSPECTOR);
      }
      return;
    }

    lastKeyRef.current = currentKey;
    const loadKey = currentKey;

    const loadInspector = async () => {
      setIsLoading(true);
      setError(null);
      if (LOG_INSPECTOR) {
        log.logInfo('[Inspector] Starting load', getStackTrace(), {
          assetType: propsRef.current.assetType,
          loadKey
        }, true, BATCH_KEY_INSPECTOR);
      }
      try {
        if (!propsRef.current.assetType) {
          if (LOG_INSPECTOR) {
            log.logError('[Inspector] No assetType provided', getStackTrace(), undefined, true, BATCH_KEY_INSPECTOR);
          }
          if (lastKeyRef.current === loadKey) {
            setElement(null);
            setIsLoading(false);
            setError('No assetType provided');
          }
          return;
        }
        const result = await InspectorService.resolveInspectorComponent(propsRef.current);
        if (LOG_INSPECTOR) {
          log.logInfo('[Inspector] Load completed', getStackTrace(), {
            hasResult: !!result,
            resultType: result ? 'ReactElement' : 'null',
            loadKey,
            currentKey: lastKeyRef.current,
            stillValid: lastKeyRef.current === loadKey
          }, true, BATCH_KEY_INSPECTOR);
        }
        if (lastKeyRef.current === loadKey) {
          setElement(result);
          setIsLoading(false);
        } else {
          if (LOG_INSPECTOR) {
            log.logInfo('[Inspector] Key changed during load, not updating state', getStackTrace(), {
              loadKey,
              currentKey: lastKeyRef.current
            }, true, BATCH_KEY_INSPECTOR);
          }
        }
      } catch (err) {
        if (LOG_INSPECTOR) {
          log.logError('[Inspector] Load failed', getStackTrace(), { error: err, loadKey, currentKey: lastKeyRef.current }, true, BATCH_KEY_INSPECTOR);
        }
        if (lastKeyRef.current === loadKey) {
          setElement(null);
          setIsLoading(false);
          setError(err instanceof Error ? err.message : 'Failed to load inspector');
        }
      }
    };

    loadInspector();

    return () => {
      if (LOG_INSPECTOR) {
        log.logInfo('[Inspector] useEffect cleanup', getStackTrace(), { loadKey, currentKey: lastKeyRef.current }, true, BATCH_KEY_INSPECTOR);
      }
    };
  }, [currentKey, props.assetType]);

  if (error) {
    return React.createElement('div', { className: 'inspector-panel__error' }, `Error: ${error}`);
  }

  if (isLoading) {
    return React.createElement('div', { className: 'inspector-panel__loading' }, 'Loading inspector...');
  }

  return element;
}
