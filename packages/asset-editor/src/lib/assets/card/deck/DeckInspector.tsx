
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Deck } from '@ocentra/game-asset-domain/card/deck/Deck';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { GetTreeFolderContentEvent } from '@ocentra/eventing-domain/events/assets/GetTreeFolderContentEvent';
import { Card } from '@ocentra/game-asset-domain/card/cardBase/Card';
import type { InspectorComponent } from '@/lib/core/inspector/types';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { AssetType } from '@ocentra/asset-domain/types/assetType';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { EnsureCardsProgressDialog } from '@/pages/Dialogs/EnsureCardsProgressDialog';
import { ImageAssignmentProgressDialog } from '@/pages/Dialogs/ImageAssignmentProgressDialog';
import { getImageHashesFromMetaFolder } from '@/adapters/assets/assignCardImageHashesFromMeta';
import { isTauri } from '@/utils/createPanelWindow';
import { openFolderPicker, absolutePathToResourcesRelative } from '@/utils/openFolderPicker';
import { getResourcesDir } from '@/adapters/assets/TauriAssetAdapter';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { extractDeckTemplateRefs } from '@/lib/assets/card/deck/deckTemplateRefs';


const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const LOG_DECK_INSPECTOR = true;
const LOG_DECK_PERF = true;

const BATCH_KEY_AUTO_ENSURE = 'DeckInspector.autoEnsure';

AssetEditorLogger.instance.registerBatchContext(BATCH_KEY_AUTO_ENSURE, {
  enabled: true,
  batchSize: 10,
  flushInterval: 1000,
});

const BATCH_KEY_LOADING_CARDS = 'DeckInspector.loadingCards';
const BATCH_KEY_CARD_LOADED = 'DeckInspector.cardLoaded';

log.registerBatchContext(BATCH_KEY_LOADING_CARDS, {
  enabled: true,
  batchSize: 52,
  flushInterval: 1000,
});

log.registerBatchContext(BATCH_KEY_CARD_LOADED, {
  enabled: true,
  batchSize: 52,
  flushInterval: 1000,
});

import './DeckInspector.css';

export const DeckInspector: InspectorComponent<Deck | Record<string, unknown>> = ({ data, onFieldChange }) => {
  const perfStartRef = useRef<number | null>(null);
  const perfMarkersRef = useRef<Record<string, number>>({});

  if (LOG_DECK_PERF && perfStartRef.current === null) {
    perfStartRef.current = performance.now();
    perfMarkersRef.current = { init: perfStartRef.current };
    log.logInfo('[DeckInspector] Performance: Component initialized', getStackTrace(), {
      timestamp: perfStartRef.current,
    });
  }

  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);

  const isFullAssetData = 'system' in dataObj && 'data' in dataObj;
  const systemData = isFullAssetData ? (dataObj.system as { guid?: string | { _value?: string } }) : null;
  const guidFromSystem = systemData?.guid
    ? (typeof systemData.guid === 'string' ? systemData.guid : systemData.guid._value || null)
    : null;
  const guidFromData = (dataObj.guid as string) || null;
  const assetGuid = guidFromSystem || guidFromData || null;

  if (LOG_DECK_PERF && perfStartRef.current) {
    const now = performance.now();
    perfMarkersRef.current.dataParsed = now;
    log.logInfo('[DeckInspector] Performance: Data parsed', getStackTrace(), {
      elapsed: (now - perfStartRef.current).toFixed(2) + 'ms',
      timestamp: now,
    });
  }

  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;

  if (LOG_DECK_INSPECTOR) {
    log.logInfo('[DeckInspector] Initialized', getStackTrace(), {
      hasData: !!data,
      dataType: typeof data,
      isFullAssetData,
      guidFromSystem,
      guidFromData,
      assetGuid,
      dataObjKeys: Object.keys(dataObj),
      hasSystem: 'system' in dataObj,
      hasDataKey: 'data' in dataObj,
      systemKeys: isFullAssetData && dataObj.system ? Object.keys(dataObj.system as Record<string, unknown>) : [],
      assetDataKeys: Object.keys(assetData),
      name: assetData.name,
      cardTemplatesCount: Array.isArray(assetData.cardTemplates) ? assetData.cardTemplates.length : 0,
      hasBackCardHash: !!assetData.backCardHash,
      rawDataSample: JSON.stringify(dataObj).substring(0, 200),
    });
  }

  const name = (assetData.name || '') as string;
  const cardTemplatesData = extractDeckTemplateRefs(assetData.cardTemplates, assetData.cardComposition) as AssetResourceEntry<Card>[];
  const backCardHashData = (assetData.backCardHash || '') as ImageHash;
  const imageSourceFolderPathData = (assetData.imageSourceFolderPath || 'Resources/GameMode/CardGames/Images') as string;
  const cardOutputPathData = (assetData.cardOutputPath || '') as string;
  const backCardSourceFolderPathData = (assetData.backCardSourceFolderPath || '') as string;

  const [cardTemplates, setCardTemplates] = useState<AssetResourceEntry<Card>[]>(cardTemplatesData);
  const [backCardHash, setBackCardHash] = useState<ImageHash>(backCardHashData);
  const [loadedCards, setLoadedCards] = useState<Card[]>([]);
  const lastGuidsRef = useRef<string>('');
  const isLoadingRef = useRef<boolean>(false);
  const hasLoadedRef = useRef<boolean>(false);
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null);
  const [expandedBackCardIndex, setExpandedBackCardIndex] = useState<number | null>(null);
  const [isPopulating, setIsPopulating] = useState(false);
  const [cardsOutputPath, setCardsOutputPath] = useState<string>(cardOutputPathData || '');
  const [imageSourceFolder, setImageSourceFolder] = useState<string>(imageSourceFolderPathData);
  const [imageSourceFolderId, setImageSourceFolderId] = useState<string>('');
  const [backCardSourceFolder, setBackCardSourceFolder] = useState<string>(backCardSourceFolderPathData || '');
  const [backCardSourceFolderId, setBackCardSourceFolderId] = useState<string>('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isDraggingOverBackCards, setIsDraggingOverBackCards] = useState(false);

  const [showEnsureDialog, setShowEnsureDialog] = useState(false);
  const [showImageAssignmentDialog, setShowImageAssignmentDialog] = useState(false);
  const [imageAssignmentCallback, setImageAssignmentCallback] = useState<(() => Promise<{ updated: number; warnings: string[] }>) | null>(null);
  const [populationWarnings, setPopulationWarnings] = useState<string[]>([]);
  const [_, setDummyState] = useState({});
  // For loading optimization
  const hasAutoEnsuredRef = useRef<boolean>(false);
  const isProcessingImagesRef = useRef<boolean>(false);

  const cardFolderInputRef = useRef<HTMLInputElement>(null);
  const backCardFolderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updatedCardTemplates = extractDeckTemplateRefs(assetData.cardTemplates, assetData.cardComposition) as AssetResourceEntry<Card>[];
    const updatedBackCardHash = (assetData.backCardHash || '') as ImageHash;

    if (updatedCardTemplates !== cardTemplates) {
      setCardTemplates(updatedCardTemplates);
    }
    if (updatedBackCardHash !== backCardHash) {
      setBackCardHash(updatedBackCardHash);
    }
  }, [assetData.cardTemplates, assetData.cardComposition, assetData.backCardHash, cardTemplates, backCardHash]);

  useEffect(() => {
    const loadDeckPath = async () => {
      if (!assetGuid || cardsOutputPath) return;
      try {
        const infoUrl = `/local/api/resources?guid=${assetGuid}&info=true`;
        const infoResponse = await fetch(infoUrl);
        if (infoResponse.ok) {
          const info = await infoResponse.json() as { path?: string };
          if (info.path) {
            const pathParts = info.path.split('/');
            pathParts.pop();
            const parentPath = pathParts.join('/');
            setCardsOutputPath(parentPath);
          }
        }
      } catch {
        // Ignore
      }
    };
    loadDeckPath();
  }, [assetGuid, cardsOutputPath]);

  useEffect(() => {
    hasAutoEnsuredRef.current = false;
  }, [assetGuid]);

  useEffect(() => {
    lastGuidsRef.current = '';
    hasLoadedRef.current = false;
    isLoadingRef.current = false;
  }, [assetGuid]);

  useEffect(() => {
    const autoEnsureCards = async () => {
      if (!assetGuid || hasAutoEnsuredRef.current) return;

      try {
        const guid = AssetGUID.from(assetGuid);
        const deckInstance = await ScriptableObject.loadByGuid(Deck, guid);

        if (!deckInstance) {
          if (LOG_DECK_INSPECTOR) {
            log.logWarn('[DeckInspector] Cannot auto-ensure: deck not loaded', getStackTrace());
          }
          return;
        }

        hasAutoEnsuredRef.current = true;

        const validation = await deckInstance.quickValidateCards();

        if (validation.isValid) {
          if (LOG_DECK_INSPECTOR) {
            log.logInfo('[DeckInspector] Cards validated: all present, skipping auto-ensure', getStackTrace(), {
              expectedCount: validation.expectedCount
            }, LOG_DECK_INSPECTOR, BATCH_KEY_AUTO_ENSURE);
          }
          return;
        }

        if (LOG_DECK_INSPECTOR) {
          log.logInfo('[DeckInspector] Auto-ensuring cards', getStackTrace(), {
            missingCount: validation.missingCount,
            expectedCount: validation.expectedCount
          }, LOG_DECK_INSPECTOR, BATCH_KEY_AUTO_ENSURE);
        }

        setShowEnsureDialog(true);
      } catch (error) {
        log.logError('[DeckInspector] Failed to auto-ensure cards', getStackTrace(), error);
        hasAutoEnsuredRef.current = false;
      }
    };

    if (assetGuid) {
      autoEnsureCards();
    }
  }, [assetGuid]);


  const handleEnsureComplete = async (results: { created: number; total: number }) => {
    setShowEnsureDialog(false);

    if (LOG_DECK_INSPECTOR) {
      log.logInfo(`[DeckInspector] Reconciliation complete. Syncing state once. Created: ${results.created}`, getStackTrace());
    }

    try {
      const guid = AssetGUID.from(assetGuid!);
      const deckInstance = await ScriptableObject.loadByGuid(Deck, guid);
      if (deckInstance) {
        setCardTemplates([...deckInstance.cardTemplates]);
        if (onFieldChange) {
          onFieldChange('cardTemplates', deckInstance.cardTemplates);
        }
      }
    } catch (err) {
      log.logError('[DeckInspector] Failed to refresh deck after reconciliation', getStackTrace(), err);
    }
  };

  const handleImageAssignmentComplete = async (results: { updated: number; warnings: string[] }) => {
    setShowImageAssignmentDialog(false);
    setImageAssignmentCallback(null);

    if (LOG_DECK_INSPECTOR) {
      log.logInfo(`[DeckInspector] Image assignment complete. Updated: ${results.updated}`, getStackTrace());
    }

    try {
      const guid = AssetGUID.from(assetGuid!);
      const deckInstance = await ScriptableObject.loadByGuid(Deck, guid);
      if (deckInstance) {
        setCardTemplates([...deckInstance.cardTemplates]);
        setBackCardHash(deckInstance.backCardHash);
        setPopulationWarnings(results.warnings);
        setDummyState({});
        if (onFieldChange) {
          onFieldChange('cardTemplates', deckInstance.cardTemplates);
          onFieldChange('backCardHash', deckInstance.backCardHash);
        }
      }
    } catch (err) {
      log.logError('[DeckInspector] Failed to refresh deck after image assignment', getStackTrace(), err);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const loadCards = async () => {
      if (isLoadingRef.current || hasLoadedRef.current) {
        return;
      }

      const currentGuids = cardTemplates
        .map(t => {
          if (t instanceof AssetResourceEntry) return t.guid;
          if (t && typeof t === 'object' && 'guid' in t) return (t as { guid: string }).guid;
          if (t && typeof t === 'object' && 'ref' in t) {
            const ref = (t as { ref: { guid: string } | string }).ref;
            return typeof ref === 'string' ? ref : ref?.guid;
          }
          return 'unknown';
        })
        .filter(Boolean)
        .join(',');

      if (currentGuids === lastGuidsRef.current && hasLoadedRef.current) {
        if (LOG_DECK_INSPECTOR) {
          log.logInfo('[DeckInspector] Skipping redundant card load - content is stable', getStackTrace());
        }
        return;
      }

      isLoadingRef.current = true;
      lastGuidsRef.current = currentGuids;

      const loadStart = LOG_DECK_PERF ? performance.now() : 0;
      if (LOG_DECK_PERF && perfStartRef.current) {
        const now = performance.now();
        perfMarkersRef.current.loadCardsStart = now;
        log.logInfo('[DeckInspector] Performance: Starting parallel card loading', getStackTrace(), {
          elapsed: (now - perfStartRef.current).toFixed(2) + 'ms',
          cardCount: cardTemplates.length,
          timestamp: now,
        });
      }

      if (LOG_DECK_INSPECTOR) {
        log.logInfo('[DeckInspector] Loading cards (Parallel)', getStackTrace(), {
          cardTemplatesCount: cardTemplates.length,
          firstRefType: cardTemplates[0] ? typeof cardTemplates[0] : 'none',
          firstRefIsAssetRef: cardTemplates[0] instanceof AssetResourceEntry,
        });
      }

      try {
        const cardLoadTimes = LOG_DECK_PERF ? new Map<string, number>() : null;
        const cardPromises = cardTemplates.map(async (refOrObj, idx) => {
          if (isCancelled) return null;

          let ref: AssetResourceEntry<Card>;
          if (refOrObj instanceof AssetResourceEntry) {
            ref = refOrObj;
          } else if (refOrObj && typeof refOrObj === 'object') {
            if ('ref' in refOrObj) {
              const refValue = (refOrObj as { ref?: { guid?: string; type?: string; displayName?: string } | string }).ref;
              if (typeof refValue === 'string') {
                ref = AssetResourceEntry.fromGuid<Card>(refValue, Card.assetType! as AssetType);
              } else if (refValue && typeof refValue === 'object' && 'guid' in refValue && typeof refValue.guid === 'string') {
                const assetType = (refValue.type as AssetType) || (Card.assetType! as AssetType);
                ref = AssetResourceEntry.fromGuid<Card>(refValue.guid, assetType);
                if (refValue.displayName) ref.displayName = refValue.displayName;
              } else {
                return null;
              }
            } else if ('guid' in refOrObj && typeof (refOrObj as { guid: unknown }).guid === 'string') {
              const assetType = (('type' in refOrObj && typeof (refOrObj as { type: unknown }).type === 'string')
                ? (refOrObj as { type: string }).type
                : (('assetType' in refOrObj && typeof (refOrObj as { assetType: unknown }).assetType === 'string')
                  ? (refOrObj as { assetType: string }).assetType
                  : Card.assetType!)) as AssetType;
              ref = AssetResourceEntry.fromGuid<Card>((refOrObj as { guid: string }).guid, assetType);
              if ('displayName' in refOrObj && typeof (refOrObj as { displayName: unknown }).displayName === 'string') {
                ref.displayName = (refOrObj as { displayName: string }).displayName;
              }
            } else {
              return null;
            }
          } else {
            return null;
          }

          const cardGuid = ref.guid || 'no-guid';
          if (LOG_DECK_INSPECTOR) {
            log.logInfo('[DeckInspector] Loading card', getStackTrace(), {
              cardGuid,
              index: idx,
            }, true, BATCH_KEY_LOADING_CARDS);
          }

          const cardLoadStart = LOG_DECK_PERF ? performance.now() : 0;
          const card = await ref.load(Card);

          if (LOG_DECK_PERF && cardLoadTimes && cardLoadStart) {
            const cardLoadEnd = performance.now();
            const cardLoadDuration = cardLoadEnd - cardLoadStart;
            cardLoadTimes.set(cardGuid, cardLoadDuration);
            log.logInfo('[DeckInspector] Performance: Card loaded', getStackTrace(), {
              cardGuid,
              duration: cardLoadDuration.toFixed(2) + 'ms',
              index: idx,
              timestamp: cardLoadEnd,
            });
          }

          if (card && LOG_DECK_INSPECTOR) {
            log.logInfo('[DeckInspector] Card loaded', getStackTrace(), {
              cardGuid: card.guid.toString(),
              displayName: card.displayName,
              index: idx,
            }, true, BATCH_KEY_CARD_LOADED);
          }
          return card;
        });

        const results = await Promise.all(cardPromises);

        if (isCancelled) {
          return;
        }

        const validCards = results.filter((c: Card | null): c is Card => c !== null);

        if (LOG_DECK_INSPECTOR) {
          AssetEditorLogger.instance.flushAllBatches();
        }

        if (LOG_DECK_PERF && perfStartRef.current && loadStart) {
          const now = performance.now();
          perfMarkersRef.current.cardsLoaded = now;
          const totalElapsed = (now - perfStartRef.current).toFixed(2);
          const loadElapsed = (now - loadStart).toFixed(2);
          const avgCardLoad = cardLoadTimes && cardLoadTimes.size > 0
            ? (Array.from(cardLoadTimes.values()).reduce((sum, duration) => sum + duration, 0) / cardLoadTimes.size).toFixed(2)
            : 'N/A';
          const minCardLoad = cardLoadTimes && cardLoadTimes.size > 0
            ? Math.min(...Array.from(cardLoadTimes.values())).toFixed(2)
            : 'N/A';
          const maxCardLoad = cardLoadTimes && cardLoadTimes.size > 0
            ? Math.max(...Array.from(cardLoadTimes.values())).toFixed(2)
            : 'N/A';
          log.logInfo('[DeckInspector] Performance: All cards loaded - SUMMARY', getStackTrace(), {
            totalElapsed: totalElapsed + 'ms',
            loadDuration: loadElapsed + 'ms',
            cardCount: validCards.length,
            avgCardLoad: avgCardLoad + 'ms',
            minCardLoad: minCardLoad + 'ms',
            maxCardLoad: maxCardLoad + 'ms',
            timestamp: now,
          });
        } else if (LOG_DECK_INSPECTOR) {
          const loadEnd = performance.now();
          log.logInfo('[DeckInspector] Cards loaded (Parallel complete)', getStackTrace(), {
            loadedCount: validCards.length,
            elapsed: (loadEnd - loadStart).toFixed(2) + 'ms'
          });
        }

        setLoadedCards(validCards);
        hasLoadedRef.current = true;
      } catch (err) {
        if (!isCancelled) {
          log.logError('[DeckInspector] Critical error in parallel card loading', getStackTrace(), err);
          hasLoadedRef.current = false;
        }
      } finally {
        if (!isCancelled) {
          isLoadingRef.current = false;
        }
      }
    };

    if (assetGuid && cardTemplates.length > 0) {
      loadCards();
    } else if (cardTemplates.length === 0) {
      setLoadedCards([]);
      hasLoadedRef.current = true;
    }

    return () => {
      isCancelled = true;
    };
  }, [cardTemplates, assetGuid]);

  const handleFieldChange = (field: string, value: unknown) => {
    if (onFieldChange) {
      onFieldChange(field, value);
    }
  };

  const populateFromKnownFolder = async (folderId: string, isBackCards: boolean = false): Promise<{ updated: number; warnings: string[] }> => {
    if (!assetGuid) {
      throw new Error('Asset GUID not found');
    }

    const guid = AssetGUID.from(assetGuid);
    const deckInstance = await ScriptableObject.loadByGuid(Deck, guid);

    if (!deckInstance) {
      throw new Error('Failed to load Deck instance');
    }

    const deferred = new OperationDeferred<Array<{ name: string; hash?: string; isFolder: boolean }>>();
    await EventBus.instance.publishAsync(new GetTreeFolderContentEvent(folderId, deferred));

    const result = await deferred.promise;
    if (!result.isSuccess || !result.value) {
      throw new Error(result.errorMessage || 'Failed to get tree folder content');
    }

    return await deckInstance.populateFromTreeData(result.value, isBackCards);
  };

  const handlePopulateAll = async () => {
    if (!assetGuid) {
      alert('Cannot populate deck: Asset GUID not found');
      return;
    }
    if (isProcessingImagesRef.current) return;

    setImageAssignmentCallback(() => async () => {
      isProcessingImagesRef.current = true;
      setIsPopulating(true);

      try {
        const guid = AssetGUID.from(assetGuid!);
        const deckInstance = await ScriptableObject.loadByGuid(Deck, guid);

        if (!deckInstance) {
          throw new Error('Failed to load Deck instance');
        }

        let mainCardsResult = { updated: 0, warnings: [] as string[] };
        let backCardsResult = { updated: 0, warnings: [] as string[] };

        const mainFolderId = imageSourceFolderId || imageSourceFolder;
        const backFolderId = backCardSourceFolderId || backCardSourceFolder;

        if (!mainFolderId && !backFolderId) {
          throw new Error('No image source folders configured. Please set image source folder or back card source folder.');
        }

        [mainCardsResult, backCardsResult] = await Promise.all([
          mainFolderId
            ? populateFromKnownFolder(mainFolderId, false)
            : Promise.resolve({ updated: 0, warnings: [] as string[] }),
          backFolderId
            ? populateFromKnownFolder(backFolderId, true)
            : Promise.resolve({ updated: 0, warnings: [] as string[] })
        ]);

        await deckInstance.saveChanges();

        const totalUpdated = mainCardsResult.updated + backCardsResult.updated;
        const allWarnings = [...mainCardsResult.warnings, ...backCardsResult.warnings];

        return { updated: totalUpdated, warnings: allWarnings };
      } catch (error) {
        log.logError('[DeckInspector] Failed to populate all', getStackTrace(), error);
        throw error;
      } finally {
        setIsPopulating(false);
        isProcessingImagesRef.current = false;
      }
    });

    setShowImageAssignmentDialog(true);
  };

  const handleAssignFromMeta = () => {
    if (!assetGuid) return;
    if (isProcessingImagesRef.current) return;

    setImageAssignmentCallback(() => async () => {
      isProcessingImagesRef.current = true;
      setIsPopulating(true);
      try {
        const guid = AssetGUID.from(assetGuid!);
        const deckInstance = await ScriptableObject.loadByGuid(Deck, guid);
        if (!deckInstance) throw new Error('Failed to load Deck');

        const rawPath = imageSourceFolder || assetData.imageSourceFolderPath || 'Resources/GameMode/CardGames/Images';
        const imagesPath = typeof rawPath === 'string' ? rawPath : 'Resources/GameMode/CardGames/Images';
        const treePath = (dataObj.system as { treePath?: string })?.treePath;
        const hashMap = await getImageHashesFromMetaFolder(imagesPath, {
          resolveRelativeTo: treePath,
        });
        if (hashMap.size === 0) {
          return {
            updated: 0,
            warnings: ['No .meta files found in Images folder. Set Image Source Folder to the folder containing PNG images and their .meta files.'],
          };
        }

        return await deckInstance.mapImagesToCards(hashMap);
      } catch (error) {
        log.logError('[DeckInspector] Failed to assign from .meta', getStackTrace(), error);
        throw error;
      } finally {
        setIsPopulating(false);
        isProcessingImagesRef.current = false;
      }
    });
    setShowImageAssignmentDialog(true);
  };

  const handleBrowseFolder = async (isBackCards: boolean) => {
    if (isTauri()) {
      try {
        const resourcesDir = await getResourcesDir();
        const selected = await openFolderPicker({ defaultPath: resourcesDir });
        if (!selected) return;
        const rel = absolutePathToResourcesRelative(selected, resourcesDir);
        if (isBackCards) {
          setBackCardSourceFolder(rel);
          setBackCardSourceFolderId(rel);
          handleFieldChange('backCardSourceFolderPath', rel);
        } else {
          setImageSourceFolder(rel);
          setImageSourceFolderId(rel);
          handleFieldChange('imageSourceFolderPath', rel);
        }
      } catch (err) {
        log.logError('[DeckInspector] Browse folder failed', getStackTrace(), err);
      }
      return;
    }
    const inputRef = isBackCards ? backCardFolderInputRef : cardFolderInputRef;
    inputRef.current?.click();
  };

  const handleFolderSelected = async (event: React.ChangeEvent<HTMLInputElement>, isBackCards: boolean) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (!assetGuid) return;
    if (isProcessingImagesRef.current) return;

    const fileArray = Array.from(files);
    const isBack = isBackCards;
    const inputElement = event.target;

    setImageAssignmentCallback(() => async () => {
      isProcessingImagesRef.current = true;
      setIsPopulating(true);

      try {
        const guid = AssetGUID.from(assetGuid!);
        const deckInstance = await ScriptableObject.loadByGuid(Deck, guid);
        if (!deckInstance) throw new Error('Failed to load Deck');

        const assignmentResult = await deckInstance.populateFromFolder(fileArray, isBack);

        await deckInstance.saveChanges();

        return assignmentResult;
      } catch (error) {
        log.logError('[DeckInspector] Failed to populate from upload', getStackTrace(), error);
        throw error;
      } finally {
        setIsPopulating(false);
        isProcessingImagesRef.current = false;
        if (inputElement) inputElement.value = '';
      }
    });

    setShowImageAssignmentDialog(true);
  };

  const handleDeleteCard = (index: number) => {
    const updated = cardTemplates.filter((_, i) => i !== index);
    setCardTemplates(updated);
    handleFieldChange('cardTemplates', updated);
  };

  const handleDeleteBackCard = () => {
    setBackCardHash('' as ImageHash);
    handleFieldChange('backCardHash', '');
  };

  return (
    <div className="deck-inspector">
      {populationWarnings.length > 0 && (
        <div className="deck-inspector__section deck-inspector__section--warning">
          <div className="deck-inspector__section-header">Warnings</div>
          <ul className="deck-inspector__warning-list">
            {populationWarnings.map((warning, i) => (
              <li key={i} className="deck-inspector__warning-item">{warning}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="deck-inspector__section">
        <div className="deck-inspector__section-header">Settings</div>
        <div className="deck-inspector__field" style={{ marginBottom: '16px' }}>
          <button
            type="button"
            className="deck-inspector__scan-button deck-inspector__scan-button--populate"
            onClick={handlePopulateAll}
            disabled={isPopulating}
            style={{ width: '100%', padding: '12px', fontSize: '16px', fontWeight: '600' }}
          >
            {isPopulating ? 'Processing...' : 'Populate All Images'}
          </button>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-color-secondary, #999)' }}>
            Processes both main cards and back cards from configured folders
          </div>
          <button
            type="button"
            className="deck-inspector__scan-button"
            onClick={handleAssignFromMeta}
            disabled={isPopulating}
            style={{ marginTop: '8px', width: '100%' }}
          >
            Assign image hashes from .meta
          </button>
          <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-color-secondary, #999)' }}>
            Fills card imageHash from Image Source Folder .meta files (cardId matches filename)
          </div>
        </div>
        <div className="deck-inspector__field">
          <label htmlFor="deck-name" className="deck-inspector__label">Deck Name</label>
          <input
            id="deck-name"
            type="text"
            className="deck-inspector__input"
            value={name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            title="Deck Name"
            placeholder="Enter deck name"
          />
        </div>
        <div className="deck-inspector__field">
          <label htmlFor="cards-output-path" className="deck-inspector__label">Cards Output Path</label>
          <input
            id="cards-output-path"
            type="text"
            className="deck-inspector__input"
            value={cardsOutputPath}
            onChange={(e) => {
              setCardsOutputPath(e.target.value);
              handleFieldChange('cardOutputPath', e.target.value);
            }}
            title="Path where card assets will be saved (default: same folder as deck)"
            placeholder="Resources/GameMode/CardGames/Cards"
          />
        </div>
        <div className="deck-inspector__field">
          <label htmlFor="image-source-folder" className="deck-inspector__label">Image Source Folder</label>
          <div
            className={`deck-inspector__drop-zone ${isDraggingOver ? 'deck-inspector__drop-zone--active' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDraggingOver(false);

              const folderId = e.dataTransfer.getData('text/folder-id');
              const assetPath = e.dataTransfer.getData('text/asset-path');

              if (folderId || assetPath) {
                let folderPath = '';
                if (folderId && folderId.startsWith('folder:')) {
                  folderPath = folderId.replace('folder:', '');
                  const fullPath = `Resources/${folderPath}`;
                  setImageSourceFolder(fullPath);
                  setImageSourceFolderId(folderId);
                  handleFieldChange('imageSourceFolderPath', fullPath);
                } else if (assetPath) {
                  folderPath = assetPath.replace(/^Resources\//, '');
                  setImageSourceFolder(assetPath);
                  setImageSourceFolderId(assetPath);
                  handleFieldChange('imageSourceFolderPath', assetPath);
                }

                if (LOG_DECK_INSPECTOR) {
                  log.logInfo('[DeckInspector] Folder dropped from tree, path set', getStackTrace(), {
                    folderId,
                    assetPath,
                    folderPath,
                  });
                }
                return;
              }

              const files = e.dataTransfer.files;
              if (files.length > 0) {
                const firstFile = files[0];
                const path = firstFile.webkitRelativePath || firstFile.name;
                const folderPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
                setImageSourceFolder(folderPath || path);
                if (cardFolderInputRef.current) {
                  const dataTransfer = new DataTransfer();
                  Array.from(files).forEach(file => dataTransfer.items.add(file));
                  cardFolderInputRef.current.files = dataTransfer.files;
                  handleFolderSelected({ target: cardFolderInputRef.current } as React.ChangeEvent<HTMLInputElement>, false);
                  return;
                }
              }
            }}
          >
            <div className="deck-inspector__drop-zone-content">
              {imageSourceFolder ? (
                <>
                  <span className="deck-inspector__drop-zone-text deck-inspector__drop-zone-text--success">{imageSourceFolder}</span>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="button"
                      className="deck-inspector__scan-button"
                      onClick={() => handleBrowseFolder(false)}
                      disabled={isPopulating}
                    >
                      Browse Folder
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="deck-inspector__drop-zone-text">Drag & drop folder here or click to browse</span>
                  <button
                    type="button"
                    className="deck-inspector__scan-button"
                    onClick={() => handleBrowseFolder(false)}
                    disabled={isPopulating}
                    style={{ marginTop: '8px' }}
                  >
                    Browse Folder
                  </button>
                </>
              )}
            </div>
          </div>
          <input
            ref={cardFolderInputRef}
            type="file"
            {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                const firstFile = files[0];
                const path = firstFile.webkitRelativePath || firstFile.name;
                const folderPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
                const fullPath = folderPath || path;
                setImageSourceFolder(fullPath);
                handleFieldChange('imageSourceFolderPath', fullPath);
              }
              handleFolderSelected(e, false);
            }}
            accept="image/png"
          />
        </div>
        <div className="deck-inspector__field">
          <label htmlFor="back-card-source-folder" className="deck-inspector__label">Back Card Source Folder</label>
          <div
            className={`deck-inspector__drop-zone ${isDraggingOverBackCards ? 'deck-inspector__drop-zone--active' : ''} ${backCardSourceFolder ? 'deck-inspector__drop-zone--has-folder' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              setIsDraggingOverBackCards(true);
            }}
            onDragLeave={() => setIsDraggingOverBackCards(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDraggingOverBackCards(false);

              const folderId = e.dataTransfer.getData('text/folder-id');
              const assetPath = e.dataTransfer.getData('text/asset-path');

              if (folderId || assetPath) {
                let folderPath = '';
                if (folderId && folderId.startsWith('folder:')) {
                  folderPath = folderId.replace('folder:', '');
                  const fullPath = `Resources/${folderPath}`;
                  setBackCardSourceFolder(fullPath);
                  setBackCardSourceFolderId(folderId);
                  handleFieldChange('backCardSourceFolderPath', fullPath);
                } else if (assetPath) {
                  folderPath = assetPath.replace(/^Resources\//, '');
                  setBackCardSourceFolder(assetPath);
                  setBackCardSourceFolderId(assetPath);
                  handleFieldChange('backCardSourceFolderPath', assetPath);
                }

                if (LOG_DECK_INSPECTOR) {
                  log.logInfo('[DeckInspector] Back card folder dropped from tree, path set', getStackTrace(), {
                    folderId,
                    assetPath,
                    folderPath,
                  });
                }
                return;
              }

              const files = e.dataTransfer.files;
              if (files.length > 0) {
                const firstFile = files[0];
                const path = firstFile.webkitRelativePath || firstFile.name;
                const folderPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
                setBackCardSourceFolder(folderPath || path);
                if (backCardFolderInputRef.current) {
                  const dataTransfer = new DataTransfer();
                  Array.from(files).forEach(file => dataTransfer.items.add(file));
                  backCardFolderInputRef.current.files = dataTransfer.files;
                  handleFolderSelected({ target: backCardFolderInputRef.current } as React.ChangeEvent<HTMLInputElement>, true);
                }
              }
            }}
          >
            <div className="deck-inspector__drop-zone-content">
              {backCardSourceFolder ? (
                <>
                  <span className="deck-inspector__drop-zone-text deck-inspector__drop-zone-text--success">{backCardSourceFolder}</span>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="button"
                      className="deck-inspector__scan-button"
                      onClick={() => handleBrowseFolder(true)}
                      disabled={isPopulating}
                    >
                      Browse Folder
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="deck-inspector__drop-zone-text">Drag & drop folder here or click to browse</span>
                  <button
                    type="button"
                    className="deck-inspector__scan-button"
                    onClick={() => handleBrowseFolder(true)}
                    disabled={isPopulating}
                    style={{ marginTop: '8px' }}
                  >
                    Browse Folder
                  </button>
                </>
              )}
            </div>
          </div>
          <input
            ref={backCardFolderInputRef}
            type="file"
            {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) {
                const firstFile = files[0];
                const path = firstFile.webkitRelativePath || firstFile.name;
                const folderPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
                const fullPath = folderPath || path;
                setBackCardSourceFolder(fullPath);
                handleFieldChange('backCardSourceFolderPath', fullPath);
              }
              handleFolderSelected(e, true);
            }}
            accept="image/png"
          />
        </div>
      </div>

      <div className="deck-inspector__section">
        <div className="deck-inspector__header">
          <div className="deck-inspector__title">Cards</div>
          <div className="deck-inspector__count">{cardTemplates.length} card{cardTemplates.length !== 1 ? 's' : ''}</div>
        </div>

        {loadedCards.length > 0 && (
          <div className="deck-inspector__list">
            {loadedCards.map((card, index) => {
              return (
                <div key={`${card.guid.toString()} -${index} `} className="deck-inspector__item">
                  <div className="deck-inspector__item-header">
                    <span className="deck-inspector__item-index">[{index}]</span>
                    <span className="deck-inspector__item-name">
                      {card.getCardId()}
                    </span>
                    <span className="deck-inspector__item-type">Card Asset</span>
                    <div className="deck-inspector__item-actions">
                      <button
                        type="button"
                        className="deck-inspector__action-button deck-inspector__action-button--delete"
                        onClick={() => handleDeleteCard(index)}
                        title="Delete"
                        aria-label="Delete"
                      >
                        ×
                      </button>
                      <button
                        type="button"
                        className="deck-inspector__action-button"
                        onClick={() => setExpandedCardIndex(expandedCardIndex === index ? null : index)}
                        title={expandedCardIndex === index ? "Collapse" : "Expand"}
                        aria-label={expandedCardIndex === index ? "Collapse" : "Expand"}
                      >
                        {expandedCardIndex === index ? '▼' : '▶'}
                      </button>
                    </div>
                  </div>
                  {expandedCardIndex === index && (
                    <div className="deck-inspector__item-content">
                      <div className="deck-inspector__field">
                        <div className="deck-inspector__label">GUID</div>
                        <span className="deck-inspector__text" style={{ wordBreak: 'break-all', fontSize: '0.85em' }}>{card.guid.toString()}</span>
                      </div>
                      <div className="deck-inspector__field">
                        <div className="deck-inspector__label">Suit</div>
                        <span className="deck-inspector__text">{'suit' in card.cardIdentity ? card.cardIdentity.suit : 'n/a'}</span>
                      </div>
                      <div className="deck-inspector__field">
                        <div className="deck-inspector__label">Rank</div>
                        <span className="deck-inspector__text">{'value' in card.cardIdentity ? String(card.cardIdentity.value) : 'n/a'}</span>
                      </div>
                      <div className="deck-inspector__field">
                        <div className="deck-inspector__label">Image Hash</div>
                        <span className="deck-inspector__text" style={{ wordBreak: 'break-all', fontSize: '0.85em' }}>{card.imageHash}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="deck-inspector__section">
        <div className="deck-inspector__header">
          <div className="deck-inspector__title">Back Card</div>
          <div className="deck-inspector__count">{backCardHash ? '1 card' : 'No back card'}</div>
        </div>

        {backCardHash && (
          <div className="deck-inspector__list">
            <div className="deck-inspector__item">
              <div className="deck-inspector__item-header">
                <span className="deck-inspector__item-name">Back Card</span>
                <span className="deck-inspector__item-type">Image Hash</span>
                <div className="deck-inspector__item-actions">
                  <button
                    type="button"
                    className="deck-inspector__action-button deck-inspector__action-button--delete"
                    onClick={handleDeleteBackCard}
                    title="Delete"
                    aria-label="Delete"
                  >
                    ×
                  </button>
                  <button
                    type="button"
                    className="deck-inspector__action-button"
                    onClick={() => setExpandedBackCardIndex(expandedBackCardIndex === 0 ? null : 0)}
                    title={expandedBackCardIndex === 0 ? "Collapse" : "Expand"}
                    aria-label={expandedBackCardIndex === 0 ? "Collapse" : "Expand"}
                  >
                    {expandedBackCardIndex === 0 ? '▼' : '▶'}
                  </button>
                </div>
              </div>
              {expandedBackCardIndex === 0 && (
                <div className="deck-inspector__item-content">
                  <div className="deck-inspector__field">
                    <div className="deck-inspector__label">Image Hash</div>
                    <span className="deck-inspector__text" style={{ wordBreak: 'break-all', fontSize: '0.85em' }}>{backCardHash}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showEnsureDialog && createPortal(
        <EnsureCardsProgressDialog
          isOpen={showEnsureDialog}
          assetGuid={assetGuid}
          onClose={() => setShowEnsureDialog(false)}
          onComplete={handleEnsureComplete}
        />,
        document.body
      )}

      {showImageAssignmentDialog && imageAssignmentCallback && createPortal(
        <ImageAssignmentProgressDialog
          isOpen={showImageAssignmentDialog}
          onClose={() => {
            setShowImageAssignmentDialog(false);
            setImageAssignmentCallback(null);
          }}
          onStart={imageAssignmentCallback}
          onComplete={handleImageAssignmentComplete}
        />,
        document.body
      )}
    </div>
  );
};





