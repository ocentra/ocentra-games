import { useState, useEffect, useRef, useCallback } from 'react';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ImageBatchLoadRequestEvent, ImageLoadPriority, type ImageBatchRequestItem } from '@ocentra/eventing-domain/events/image/ImageBatchLoadRequestEvent';
import { ImageBatchLoadedEvent } from '@ocentra/eventing-domain/events/image/ImageBatchLoadedEvent';
import { ImageVariant } from '@/lib/cache/editorImageTypes';
import { createGuid } from '@ocentra/app-core/guid';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { isImageHash, type ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';

const validateHash = (input: string): ImageHash | null => {
  if (isImageHash(input)) {
    return input;
  }
  return null;
};

const LOG_IMAGE_SELECTION = false;

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const FAILED_MARKER = '__FAILED__';

export function useBatchImageUrls(paths: string[], debounceMs: number = 500) {
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const subscriberIdRef = useRef<string>(createGuid());
  const pendingPathsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPathsRef = useRef<string[]>([]);
  const requestTimesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const subscriberId = subscriberIdRef.current;

    const handleBatchLoaded = (event: ImageBatchLoadedEvent) => {
      if (event.subscriberId !== subscriberId) {
        return;
      }

      setImageUrls(prev => {
        const next = new Map(prev);
        for (const result of event.results) {
          const variantKey = `${result.hash}:${result.variant}`;
          requestTimesRef.current.delete(variantKey);

          if (result.blobUrl) {
            next.set(variantKey, result.blobUrl);
          } else if (result.error) {
            next.set(variantKey, FAILED_MARKER);
          } else {
            next.delete(variantKey);
          }
        }
        return next;
      });
    };

    EventBus.instance.subscribe(ImageBatchLoadedEvent, handleBatchLoaded);

    return () => {
      EventBus.instance.unsubscribe(ImageBatchLoadedEvent, handleBatchLoaded);
    };
  }, []);

  const requestBatch = useCallback((imagePaths: string[], priority: ImageLoadPriority, replaceExisting: boolean = false) => {
    if (imagePaths.length === 0) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    for (const path of imagePaths) {
      pendingPathsRef.current.add(path);
    }

    debounceTimerRef.current = setTimeout(() => {
      const pathsToRequest = Array.from(pendingPathsRef.current);
      pendingPathsRef.current.clear();

      const requests: ImageBatchRequestItem[] = pathsToRequest
        .map((path): ImageBatchRequestItem | null => {
          const hash = validateHash(path);
          if (!hash) return null;
          const variantKey = `${hash}:${ImageVariant.Icon}`;
          requestTimesRef.current.set(variantKey, Date.now());
          return {
            hash,
            variant: ImageVariant.Icon,
            priority,
          };
        })
        .filter((item): item is ImageBatchRequestItem => item !== null);

      if (requests.length > 0) {
        EventBus.instance.publish(
          new ImageBatchLoadRequestEvent(requests, subscriberIdRef.current, replaceExisting)
        );
      }

      setTimeout(() => {
        const now = Date.now();
        const timeout = 15000;
        setImageUrls(prev => {
          const next = new Map(prev);
          let changed = false;
          for (const [variantKey, requestTime] of requestTimesRef.current.entries()) {
            if (now - requestTime > timeout && !prev.has(variantKey)) {
              next.set(variantKey, FAILED_MARKER);
              requestTimesRef.current.delete(variantKey);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }, 15000);
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    const pathsChanged = JSON.stringify(paths) !== JSON.stringify(lastPathsRef.current);
    lastPathsRef.current = paths;

    if (pathsChanged) {
      requestBatch(paths, ImageLoadPriority.MEDIUM, true);
    }
  }, [paths, requestBatch]);

  const requestHighPriority = useCallback((imagePath: string, variant: ImageVariant = ImageVariant.Icon) => {
    const hash = validateHash(imagePath);
    if (!hash) {
      log.logWarn('[useBatchImageUrls] requestHighPriority called with invalid hash', getStackTrace(), {
        imagePath,
        variant,
      });
      return;
    }

    if (LOG_IMAGE_SELECTION) {
      log.logInfo('[useBatchImageUrls] requestHighPriority called', getStackTrace(), {
        hash,
        variant,
        subscriberId: subscriberIdRef.current,
      });
    }

    EventBus.instance.publish(
      new ImageBatchLoadRequestEvent(
        [{ hash, variant, priority: ImageLoadPriority.HIGH }],
        subscriberIdRef.current,
        false
      )
    );
  }, []);

  return { imageUrls, requestHighPriority, FAILED_MARKER };
}

export { FAILED_MARKER };


