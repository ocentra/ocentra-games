import { useState, useEffect, useRef } from 'react';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ImageLoadRequestEvent } from '@ocentra/eventing-domain/events/image/ImageLoadRequestEvent';
import { ImageLoadedEvent } from '@ocentra/eventing-domain/events/image/ImageLoadedEvent';
import { ImageLoadFailedEvent } from '@ocentra/eventing-domain/events/image/ImageLoadFailedEvent';
import { ImageUnsubscribeEvent } from '@ocentra/eventing-domain/events/image/ImageUnsubscribeEvent';
import { ImageBatchLoadedEvent } from '@ocentra/eventing-domain/events/image/ImageBatchLoadedEvent';
import { createGuid } from '@ocentra/app-core/guid';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { EditorImageCache } from '@/lib/cache/EditorImageCache';
import { ImageVariant } from '@/lib/cache/editorImageTypes';
import { Resources } from '@ocentra/asset-domain/resources/Resources';
import { isImageHash, type ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { MetaData } from '@ocentra/eventing-domain/types/meta';

const LOG_IMAGE_SELECTION = false;
const LOG_IMAGE = false;

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

export interface UseImageUrlResult {
  imageUrl: string | null;
  isLoading: boolean;
  error: Error | null;
}

export interface UseImageUrlOptions {
  priority?: number;
  enabled?: boolean;
  variant?: ImageVariant;
  meta?: MetaData;
}

export function useImageUrl(
  identifier: ImageHash | null,
  options?: UseImageUrlOptions
): UseImageUrlResult {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const subscriberIdRef = useRef<string>(createGuid());
  const currentIdentifierRef = useRef<ImageHash | null>(null);
  const mountTimeRef = useRef<number>(Date.now());
  const imageUrlRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    imageUrlRef.current = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    mountTimeRef.current = Date.now();
    const subscriberId = subscriberIdRef.current;
    if (LOG_IMAGE && identifier) {
      log.logInfo(`[useImageUrl] Mounted`, getStackTrace(), { identifier, subscriberId });
    }
    
    return () => {
      const lifetime = Date.now() - mountTimeRef.current;
      const currentIdentifier = currentIdentifierRef.current;
      if (LOG_IMAGE && currentIdentifier) {
        log.logInfo(`[useImageUrl] Unmounted`, getStackTrace(), { 
          identifier: currentIdentifier, 
          subscriberId,
          lifetime,
          hadImageUrl: !!imageUrlRef.current
        });
      }
    };
  }, [identifier]);

  useEffect(() => {
    const enabled = options?.enabled !== false;

    if (!identifier || !enabled) {
      if (currentIdentifierRef.current) {
        EventBus.instance.publish(
          new ImageUnsubscribeEvent(currentIdentifierRef.current, subscriberIdRef.current)
        );
        currentIdentifierRef.current = null;
      }
      if (!identifier) {
        setImageUrl(null);
        setIsLoading(false);
        setError(null);
      }
      return;
    }

    if (!isImageHash(identifier)) {
      log.logError('[useImageUrl] Invalid ImageHash provided', getStackTrace(), { identifier });
      setImageUrl(null);
      setIsLoading(false);
      setError(new Error(`Invalid ImageHash: ${identifier}`));
      return;
    }

    if (currentIdentifierRef.current === identifier) {
      return;
    }

    if (currentIdentifierRef.current && currentIdentifierRef.current !== identifier) {
      EventBus.instance.publish(
        new ImageUnsubscribeEvent(currentIdentifierRef.current, subscriberIdRef.current)
      );
    }

    currentIdentifierRef.current = identifier;
    setIsLoading(true);
    setError(null);
    setImageUrl(null);

    const subscriberId = subscriberIdRef.current;
    const priority = options?.priority ?? 0;
    const variant = options?.variant ?? ImageVariant.Full;

    const handleLoaded = (event: ImageLoadedEvent) => {
      if (event.hash === identifier && event.variant === variant && currentIdentifierRef.current === identifier) {
        isLoadingRef.current = false;
        setImageUrl(event.blobUrl);
        setIsLoading(false);
        setError(null);
      }
    };

    const handleFailed = (event: ImageLoadFailedEvent) => {
      if (event.hash === identifier && event.variant === variant && currentIdentifierRef.current === identifier) {
        isLoadingRef.current = false;
        setError(new Error(event.error));
        setIsLoading(false);
        (async () => {
          try {
            const urlResult = Resources.getUrl(identifier);
            const fallbackUrl = typeof urlResult === 'string' ? urlResult : await urlResult;
            if (currentIdentifierRef.current === identifier) {
              setImageUrl(fallbackUrl);
            }
          } catch {
            if (currentIdentifierRef.current === identifier) {
              setImageUrl(null);
            }
          }
        })();
      }
    };

    const handleBatchLoaded = (event: ImageBatchLoadedEvent) => {
      if (event.subscriberId !== subscriberId) return;
      const result = event.results.find(r => r.hash === identifier && r.variant === variant);
      if (result && currentIdentifierRef.current === identifier) {
        isLoadingRef.current = false;
        if (result.error) {
          setError(new Error(result.error));
          setIsLoading(false);
          (async () => {
            try {
              const fallbackUrl = Resources.getUrl(identifier);
              const url = typeof fallbackUrl === 'string' ? fallbackUrl : await fallbackUrl;
              if (currentIdentifierRef.current === identifier) {
                setImageUrl(url);
              }
            } catch {
              if (currentIdentifierRef.current === identifier) {
                setImageUrl(null);
              }
            }
          })();
        } else if (result.blobUrl) {
          setImageUrl(result.blobUrl);
          setIsLoading(false);
          setError(null);
        }
      }
    };

    EventBus.instance.subscribe(ImageLoadedEvent, handleLoaded);
    EventBus.instance.subscribe(ImageLoadFailedEvent, handleFailed);
    EventBus.instance.subscribe(ImageBatchLoadedEvent, handleBatchLoaded);

    if (LOG_IMAGE_SELECTION) {
      log.logInfo('[useImageUrl] Publishing ImageLoadRequestEvent', getStackTrace(), {
        hash: identifier,
        subscriberId,
        priority,
        variant,
        hasMeta: !!options?.meta,
      });
    }

    const checkCacheAndRetry = async () => {
      if (currentIdentifierRef.current !== identifier || !isLoadingRef.current) return;
      
      try {
        const imageCache = EditorImageCache.getInstance();
        let cached = null;
        if (options?.meta?.imageHash) {
          if (isImageHash(options.meta.imageHash)) {
            cached = await imageCache.getCachedImageByHash(options.meta.imageHash, variant);
          }
        } else {
          cached = await imageCache.getCachedImageByHash(identifier, variant);
        }
        
        if (cached && cached.blob && currentIdentifierRef.current === identifier && isLoadingRef.current) {
          const blobUrl = URL.createObjectURL(cached.blob);
          isLoadingRef.current = false;
          setImageUrl(blobUrl);
          setIsLoading(false);
          setError(null);
          return;
        }
      } catch {
        void 0;
      }
      
      if (currentIdentifierRef.current === identifier && isLoadingRef.current) {
        EventBus.instance.publish(
          new ImageLoadRequestEvent(identifier, subscriberId, priority, variant, options?.meta)
        );
      }
    };

    const retryTimeoutId = setTimeout(checkCacheAndRetry, 50);

    EventBus.instance.publish(
      new ImageLoadRequestEvent(identifier, subscriberId, priority, variant, options?.meta)
    );

    return () => {
      clearTimeout(retryTimeoutId);
      EventBus.instance.unsubscribe(ImageLoadedEvent, handleLoaded);
      EventBus.instance.unsubscribe(ImageLoadFailedEvent, handleFailed);
      EventBus.instance.unsubscribe(ImageBatchLoadedEvent, handleBatchLoaded);
      if (currentIdentifierRef.current === identifier) {
        EventBus.instance.publish(
          new ImageUnsubscribeEvent(identifier, subscriberId)
        );
        currentIdentifierRef.current = null;
      }
    };
  }, [identifier, options?.priority, options?.enabled, options?.variant, options?.meta]);

  return { imageUrl, isLoading, error };
}

