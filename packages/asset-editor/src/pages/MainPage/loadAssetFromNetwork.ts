import type { AssetData } from '@/types/assets';
import { AssetDocumentSchema } from '@/lib/validation/schemas';
import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import JSON5 from 'json5';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import type { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { GetDiskGameModeEntriesEvent } from '@ocentra/eventing-domain/events/assets/GetDiskGameModeEntriesEvent';
import { GetResourceByGuidEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByGuidEvent';
import { GetResourceByHashEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByHashEvent';
import { GetResourceEvent } from '@ocentra/eventing-domain/events/assets/GetResourceEvent';
import type { GameMode } from '@ocentra/game-asset-domain/gameMode/core/GameMode';
import { DeckManager } from '@ocentra/game-asset-domain/deck/DeckManager';
import { loadAsset, computeAssetHash } from '@/adapters/assets/TauriAssetAdapter';
import { setPreferredAssetUrl } from '@/adapters/assets/TauriAssetUrlResolver';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const RESOURCE_LOOKUP_TIMEOUT_MS = 6000;
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.avif'];

function fetchLocalAsset(path: string): Promise<Response> {
  return loadAsset({ path });
}

function withDeferredTimeout<T>(deferred: OperationDeferred<T>, label: string): Promise<OperationResult<T>> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${label} timed out after ${RESOURCE_LOOKUP_TIMEOUT_MS}ms`));
    }, RESOURCE_LOOKUP_TIMEOUT_MS);
  });
  return Promise.race([deferred.promise, timeout]);
}

function isImagePath(path: string): boolean {
  const lower = path.toLowerCase();
  return IMAGE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export async function loadAssetFromNetwork(
  identifier: string,
  setAssetData: (data: AssetData | null) => void,
  setAssetPath: (path: string | null) => void,
  setAssetRawContent: (content: string | null) => void,
  setAssetError: (error: string | null) => void,
  setIsLoadingAsset: (loading: boolean) => void
): Promise<void> {
  setIsLoadingAsset(true);
  setAssetError(null);
  setAssetData(null);
  setAssetPath(null);
  log.logInfo('[loadAssetFromNetwork] start', getStackTrace(), { identifier });

  try {
    const identifierClean = identifier.startsWith('/') ? identifier.substring(1) : identifier;
    const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifierClean);
    const isHash = /^[a-f0-9]{64}$/i.test(identifierClean);
    const isPath =
      identifierClean.includes('/') || identifierClean.endsWith('.asset') || identifierClean.endsWith('.json');

    const isVirtualAssetCatalog =
      identifierClean === 'virtual:AssetCatalog' || identifierClean === 'virtualAssetCatalog';
    if (isVirtualAssetCatalog) {
      const assetData: AssetData = {
        system: {
          guid: 'virtual:AssetCatalog',
          assetType: 'AssetCatalog',
          displayName: 'Asset Catalog',
          schemaVersion: 1,
        },
        data: {},
      };
      setAssetData(assetData);
      setAssetPath('virtual:AssetCatalog');
      setAssetRawContent(null);
      setAssetError(null);
      setIsLoadingAsset(false);
      log.logInfo('[loadAssetFromNetwork] success (virtual AssetCatalog)', getStackTrace(), {
        identifier: identifierClean,
      });
      return;
    }

    const isVirtualGameRegistry = identifierClean === 'virtual:GameRegistry';
    if (isVirtualGameRegistry) {
      try {
        const getGameModeEntriesDeferred = new OperationDeferred<
          AssetResourceEntry<GameMode>[]
        >();
        await EventBus.instance.publishAsync(
          new GetDiskGameModeEntriesEvent(getGameModeEntriesDeferred)
        );
        const result = await getGameModeEntriesDeferred.promise;

        if (!result.isSuccess || !result.value) {
          setAssetError(result.errorMessage ?? 'Failed to load Game Registry');
          setIsLoadingAsset(false);
          return;
        }

        const assetData: AssetData = {
          system: {
            guid: 'virtual:GameRegistry',
            assetType: 'GameRegistry',
            displayName: 'Game Registry',
            schemaVersion: 1,
          },
          data: {
            gameModeEntries: result.value,
          },
        };

        setAssetData(assetData);
        setAssetPath('virtual:GameRegistry');
        setAssetRawContent(null);
        setAssetError(null);
        setIsLoadingAsset(false);
        log.logInfo('[loadAssetFromNetwork] success (virtual GameRegistry)', getStackTrace(), {
          identifier: identifierClean,
        });
        return;
      } catch (e) {
        setAssetError(e instanceof Error ? e.message : 'Failed to load Game Registry');
        setIsLoadingAsset(false);
        return;
      }
    }

    const isVirtualDeckManager = identifierClean === 'virtual:DeckManager';
    if (isVirtualDeckManager) {
      try {
        const deckManager = await DeckManager.getOrCreateInstance();
        const assetData: AssetData = {
          system: {
            guid: 'virtual:DeckManager',
            assetType: 'DeckManager',
            displayName: 'Deck Manager',
            schemaVersion: 1,
          },
          data: {
            deckEntries: deckManager.deckEntries,
          },
        };
        setAssetData(assetData);
        setAssetPath('virtual:DeckManager');
        setAssetRawContent(null);
        setAssetError(null);
        setIsLoadingAsset(false);
        log.logInfo('[loadAssetFromNetwork] success (virtual DeckManager)', getStackTrace(), {
          identifier: identifierClean,
        });
        return;
      } catch (e) {
        setAssetError(e instanceof Error ? e.message : 'Failed to load Deck Manager');
        setIsLoadingAsset(false);
        return;
      }
    }

    if (isPath) {
      try {
        const response = await loadAsset({ path: identifierClean });
        if (!response.ok) {
          setAssetError(`Failed to load asset by path: ${response.status} ${response.statusText}`);
          return;
        }
        const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
        if (contentType.startsWith('image/') || isImagePath(identifierClean)) {
          const fileName = identifierClean.split('/').pop() || 'image';
          const imageHash = await computeAssetHash(identifierClean);
          const normalizedPath = identifierClean.startsWith('/') ? identifierClean : `/${identifierClean}`;
          setPreferredAssetUrl(imageHash, normalizedPath);
          const imageData: AssetData = {
            system: {
              displayName: fileName,
              guid: '',
              schemaVersion: 1,
            },
            data: {
              imageHash,
              hash: imageHash,
            },
          };
          setAssetData(imageData);
          setAssetPath(identifierClean);
          setAssetRawContent(null);
          setAssetError(null);
          log.logInfo('[loadAssetFromNetwork] success (Tauri load_asset path - image)', getStackTrace(), {
            identifier: identifierClean,
          });
          return;
        }
        const text = await response.text();
        const parsed = JSON5.parse(text) as unknown;
        const result = AssetDocumentSchema.safeParse(parsed);
        if (result.success) {
          const treePath = (result.data.system as { treePath?: string })?.treePath ?? identifierClean;
          setAssetData(result.data as AssetData);
          setAssetPath(treePath);
          setAssetRawContent(text);
          setAssetError(null);
          log.logInfo('[loadAssetFromNetwork] success (Tauri read_asset path)', getStackTrace(), {
            identifier: identifierClean,
          });
          return;
        }
        setAssetError(`Asset document validation failed for path: ${result.error.message}`);
      } catch (e) {
        setAssetError(`Failed to load asset by path: ${e instanceof Error ? e.message : String(e)}`);
      }
      return;
    }

    if (!isGuid && !isHash) {
      setAssetError(`Resource loading requires GUID, hash, or path identifier. Invalid input: ${identifier}`);
      return;
    }

    let guid: string | null = null;
    let resourcePath: string | null = null;
    let resourceEntry: ResourceEntry | null = null;

    if (isGuid) {
      guid = identifierClean;
      try {
        const response = await loadAsset({ guid });
        if (response.ok) {
          const text = await response.text();
          const parsed = JSON5.parse(text) as unknown;
          const result = AssetDocumentSchema.safeParse(parsed);
          if (result.success) {
            resourcePath = (result.data.system as { treePath?: string })?.treePath ?? null;
            setAssetData(result.data as AssetData);
            setAssetPath(resourcePath || guid);
            setAssetRawContent(text);
            setAssetError(null);
            log.logInfo('[loadAssetFromNetwork] success (load_asset guid)', getStackTrace(), {
              identifier,
              resourcePath,
            });
            return;
          }
        }
      } catch (e) {
        log.logWarn('[loadAssetFromNetwork] load_asset guid failed, falling through', getStackTrace(), {
          guid,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      if (!resourcePath) {
        const getResourceDeferred = new OperationDeferred<ResourceEntry | null>();
        await EventBus.instance.publishAsync(new GetResourceByGuidEvent(guid, getResourceDeferred));
        const getResourceResult = await withDeferredTimeout(getResourceDeferred, 'GetResourceByGuidEvent');
        if (getResourceResult.isSuccess && getResourceResult.value) {
          resourceEntry = getResourceResult.value;
          resourcePath = getResourceResult.value.path;
        }
      }
    } else {
      const getResourceDeferred = new OperationDeferred<ResourceEntry | null>();
      await EventBus.instance.publishAsync(new GetResourceByHashEvent(identifierClean, getResourceDeferred));
      const getResourceResult = await withDeferredTimeout(getResourceDeferred, 'GetResourceByHashEvent');
      if (getResourceResult.isSuccess && getResourceResult.value) {
        resourceEntry = getResourceResult.value;
        resourcePath = getResourceResult.value.path;
        if (getResourceResult.value instanceof AssetResourceEntry) {
          guid = getResourceResult.value.guid || null;
        }
      }
    }

    if (!resourcePath) {
      setAssetError(`Asset not found in index for identifier: ${identifier}`);
      return;
    }

    let response = await fetchLocalAsset(resourcePath);

    if (!response.ok) {
      const fallbackRequest = isGuid
        ? ({ guid: identifierClean } as const)
        : ({ hash: identifierClean } as const);
      const fallbackDeferred = new OperationDeferred<Response>();
      await EventBus.instance.publishAsync(new GetResourceEvent(fallbackRequest, fallbackDeferred));
      const fallbackResult = await withDeferredTimeout(fallbackDeferred, 'GetResourceEvent');
      if (fallbackResult.isSuccess && fallbackResult.value) {
        response = fallbackResult.value;
      }
    }

    if (!response.ok) {
      setAssetError(`Failed to load asset: ${response.status} ${response.statusText}`);
      return;
    }

    const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
    const resourceMimeType = ((resourceEntry as { mimeType?: string } | null)?.mimeType || '').toLowerCase();
    const resourceHash = (resourceEntry as { hash?: string } | null)?.hash;
    const hasImageHash = typeof resourceHash === 'string' && resourceHash.length > 0;
    const isImageContentType =
      contentType.startsWith('image/') ||
      resourceMimeType.startsWith('image/') ||
      isImagePath(resourcePath) ||
      hasImageHash;

    if (isImageContentType) {
      const fileName = resourcePath.split('/').pop() || identifier.split('/').pop() || 'image';
      const imageHash = isHash ? identifierClean : (resourceHash || identifierClean);
      const imageData: AssetData = {
        system: {
          displayName: fileName,
          guid: guid || '',
          schemaVersion: 1,
        },
        data: {
          imageHash,
          hash: imageHash,
        },
      };
      setAssetData(imageData);
      setAssetPath(resourcePath || identifier);
      setAssetRawContent(null);
      setAssetError(null);
      return;
    }

    const text = await response.text();
    if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
      setAssetError(`Asset not found for identifier: ${identifier}. Got HTML response instead.`);
      return;
    }

    const parsed = JSON5.parse(text.trim()) as unknown;
    const result = AssetDocumentSchema.safeParse(parsed);
    if (!result.success) {
      setAssetError(`Asset document validation failed: ${result.error.message}`);
      return;
    }
    setAssetData(result.data as AssetData);
    setAssetPath(resourcePath || identifier);
    setAssetRawContent(text);
    setAssetError(null);
    log.logInfo('[loadAssetFromNetwork] success', getStackTrace(), {
      identifier,
      resourcePath: resourcePath || identifier,
      isGuid,
      isHash,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    setAssetError(`Failed to load asset: ${errorMessage}`);
    setAssetData(null);
    setAssetPath(null);
    setAssetRawContent(null);
    log.logError('[loadAssetFromNetwork] failed', getStackTrace(), {
      identifier,
      errorMessage,
      error,
    });
  } finally {
    setIsLoadingAsset(false);
  }
}
