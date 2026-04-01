import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { ImageResourceEntry } from '@ocentra/asset-domain/resourceEntry/ImageResourceEntry';
import { FileResourceEntry } from '@ocentra/asset-domain/resourceEntry/FileResourceEntry';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { SaveAssetRegistryEvent } from '@ocentra/eventing-domain/events/assets/SaveAssetRegistryEvent';
import { ReplaceAllResourcesEvent } from '@ocentra/eventing-domain/events/assets/ReplaceAllResourcesEvent';
import { ScanAssetsEvent } from '@ocentra/eventing-domain/events/assets/ScanAssetsEvent';
import './ScanAssetsDialog.css';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { GameId, ImageHash, AssetChecksum } from '@ocentra/asset-domain/types/assetIdentifier';
import { tryGameId, isImageHash, isAssetChecksum } from '@ocentra/asset-domain/types/assetIdentifier';
import { asAssetType } from '@ocentra/asset-domain/types/assetType';
import type { MimeType, AssetCategory } from '@ocentra/asset-domain/constants/assets';
import { Timestamp } from '@ocentra/asset-domain/core/Timestamp';
import type { ScanResponse } from '@ocentra/boundary-domain/types/scan-response';
import { getIndexStatus, rebuildIndex } from '@/adapters/assets/TauriAssetAdapter';

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const ScanStage = {
  Idle: 'idle',
  Rebuilding: 'rebuilding',
  Scanning: 'scanning',
  Registering: 'registering',
  Saving: 'saving',
  Complete: 'complete',
  Error: 'error',
} as const;

type ScanStage = typeof ScanStage[keyof typeof ScanStage];

interface ScanAssetsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete?: () => void;
}

interface ScanProgress {
  stage: ScanStage;
  message: string;
  progress?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

interface ScanResults {
  assets: number;
  images: number;
  files: number;
  imagesWithHash: number;
  imagesWithoutHash: number;
  needsMeta: number;
  stats?: {
    totalAssets: number;
    assetsWithMeta: number;
    assetsNeedingMeta: number;
  };
}

export const ScanAssetsDialog: React.FC<ScanAssetsDialogProps> = ({
  isOpen,
  onClose,
  onScanComplete,
}) => {
  const [progress, setProgress] = useState<ScanProgress>({ stage: ScanStage.Idle, message: '' });
  const [results, setResults] = useState<ScanResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleScan = useCallback(async () => {
    const scanStart = performance.now();
    log.logInfo('[ScanAssetsDialog] SCAN START', getStackTrace());

    try {
      const initialStatus = await getIndexStatus().catch(() => null);
      if (initialStatus?.running) {
        setProgress({
          stage: ScanStage.Rebuilding,
          message: 'Local asset cache is already rebuilding on startup. Waiting for it to finish...',
          progress: 5,
        });

        for (;;) {
          await sleep(250);
          const status = await getIndexStatus().catch(() => null);
          if (!status?.running) {
            if (status?.lastError) {
              throw new Error(status.lastError);
            }
            break;
          }
        }
      } else {
        setProgress({
          stage: ScanStage.Rebuilding,
          message: 'Rebuilding local asset cache...',
          progress: 5,
        });

        const rebuildPromise = rebuildIndex();
        for (;;) {
          const completed = await Promise.race([
            rebuildPromise.then(() => true),
            sleep(250).then(() => false),
          ]);
          const status = await getIndexStatus().catch(() => null);
          if (status?.running) {
            setProgress({
              stage: ScanStage.Rebuilding,
              message: 'Rebuilding local asset cache...',
              progress: 15,
            });
          }
          if (completed) {
            if (status?.lastError) {
              throw new Error(status.lastError);
            }
            break;
          }
        }
      }

      setProgress({ stage: ScanStage.Scanning, message: 'Reading indexed resources...', progress: 25 });
      
      const scanDeferred = new OperationDeferred<ScanResponse>();
      await EventBus.instance.publishAsync(new ScanAssetsEvent({ limit: 1000, createMeta: true }, scanDeferred));
      const scanResult = await scanDeferred.promise;

      if (!scanResult.isSuccess || !scanResult.value) {
        throw new Error(scanResult.errorMessage || 'Index rebuild failed');
      }

      setProgress({ stage: ScanStage.Scanning, message: 'Processing indexed resources...', progress: 45 });
      
      const result = scanResult.value;
      
      const imagesWithHash = result.images?.filter((img: { hash?: string }) => img.hash) || [];
      const imagesWithoutHash = result.images?.filter((img: { hash?: string }) => !img.hash) || [];
      
      setProgress({ stage: ScanStage.Registering, message: 'Rebuilding resource entries...', progress: 55 });

      const newEntries: ResourceEntry[] = [];

      for (const asset of result.assets || []) {
                    if (asset.inheritanceChain && Array.isArray(asset.inheritanceChain) && asset.inheritanceChain.includes('AssetRegistry')) {
          continue;
        }
        const entry = AssetResourceEntry.fromGuid(
            asset.guid,
            asAssetType(asset.type),
            asset.displayName
        );
        entry.path = asset.path;
        entry.gameId = asset.gameId ? (tryGameId(asset.gameId) ?? (asset.gameId as GameId)) : null;
        entry.category = (asset.category as AssetCategory | null | undefined) ?? null;
        entry.mimeType = (asset.mimeType as MimeType | null | undefined) ?? null;
        entry.fileSize = asset.fileSize ?? null;
        entry.createdAt = asset.createdAt ? (typeof asset.createdAt === 'object' && 'toDate' in asset.createdAt ? asset.createdAt as Timestamp : Timestamp.fromDate(new Date(asset.createdAt as string))) : null;
        entry.updatedAt = asset.updatedAt ? (typeof asset.updatedAt === 'object' && 'toDate' in asset.updatedAt ? asset.updatedAt as Timestamp : Timestamp.fromDate(new Date(asset.updatedAt as string))) : null;
        entry.lastScanAt = asset.lastScanAt ? (typeof asset.lastScanAt === 'object' && 'toDate' in asset.lastScanAt ? asset.lastScanAt as Timestamp : Timestamp.fromDate(new Date(asset.lastScanAt as string))) : null;
        entry.inheritanceChain = asset.inheritanceChain ?? null;
        const checksumValue = asset.checksum ?? null;
        entry.checksum = checksumValue ? (isAssetChecksum(checksumValue) ? checksumValue : checksumValue as AssetChecksum) : null;
        entry.variant = (asset as { variant?: string }).variant || null;
        newEntries.push(entry);
      }

      for (const image of result.images || []) {
        if (!image.hash) {
          continue;
        }
        const entry = new ImageResourceEntry();
        entry.hash = (isImageHash(image.hash) ? image.hash : image.hash as ImageHash);
        entry.path = image.path;
        entry.displayName = image.path.split('/').pop() || image.hash.substring(0, 8);
        entry.gameId = image.gameId ? (tryGameId(image.gameId) ?? (image.gameId as GameId)) : null;
        entry.mimeType = (image.mimeType as MimeType | null | undefined) ?? null;
        entry.fileSize = image.fileSize ?? null;
        entry.createdAt = image.createdAt ? (typeof image.createdAt === 'object' && 'toDate' in image.createdAt ? image.createdAt as Timestamp : Timestamp.fromDate(new Date(image.createdAt as string))) : null;
        entry.updatedAt = image.updatedAt ? (typeof image.updatedAt === 'object' && 'toDate' in image.updatedAt ? image.updatedAt as Timestamp : Timestamp.fromDate(new Date(image.updatedAt as string))) : null;
        entry.lastScanAt = image.lastScanAt ? (typeof image.lastScanAt === 'object' && 'toDate' in image.lastScanAt ? image.lastScanAt as Timestamp : Timestamp.fromDate(new Date(image.lastScanAt as string))) : null;
        newEntries.push(entry);
      }

      for (const file of result.files || []) {
        const entry = new FileResourceEntry();
        const checksumValue = file.checksum;
        entry.checksum = checksumValue ? (isAssetChecksum(checksumValue) ? checksumValue : checksumValue as AssetChecksum) : null;
        entry.path = file.path;
        entry.displayName = file.path.split('/').pop() || file.checksum?.substring(0, 8) || '';
        entry.gameId = file.gameId ? (tryGameId(file.gameId) ?? (file.gameId as GameId)) : null;
        entry.mimeType = (file.mimeType as MimeType | null | undefined) ?? null;
        entry.fileSize = file.fileSize ?? null;
        entry.createdAt = file.createdAt ? (typeof file.createdAt === 'object' && 'toDate' in file.createdAt ? file.createdAt as Timestamp : Timestamp.fromDate(new Date(file.createdAt as string))) : null;
        entry.updatedAt = file.updatedAt ? (typeof file.updatedAt === 'object' && 'toDate' in file.updatedAt ? file.updatedAt as Timestamp : Timestamp.fromDate(new Date(file.updatedAt as string))) : null;
        entry.lastScanAt = file.lastScanAt ? (typeof file.lastScanAt === 'object' && 'toDate' in file.lastScanAt ? file.lastScanAt as Timestamp : Timestamp.fromDate(new Date(file.lastScanAt as string))) : null;
        newEntries.push(entry);
      }

      setProgress({ stage: ScanStage.Registering, message: 'Updating resource index...', progress: 75 });

      const replaceAllResourcesDeferred = new OperationDeferred<boolean>();
      await EventBus.instance.publishAsync(new ReplaceAllResourcesEvent(newEntries, replaceAllResourcesDeferred));
      const replaceResult = await replaceAllResourcesDeferred.promise;
      
      if (!replaceResult.isSuccess) {
        setProgress({ 
          stage: ScanStage.Error, 
          message: replaceResult.errorMessage || 'Failed to update resource index', 
          progress: 0 
        });
        return;
      }

      const assetsCount = newEntries.filter(e => e instanceof AssetResourceEntry).length;
      const imagesCount = newEntries.filter(e => e instanceof ImageResourceEntry).length;
      const filesCount = newEntries.filter(e => e instanceof FileResourceEntry).length;

      setProgress({ stage: ScanStage.Saving, message: 'Finalizing index...', progress: 90 });

      const saveDeferred = new OperationDeferred<boolean>();
      await EventBus.instance.publishAsync(new SaveAssetRegistryEvent(saveDeferred));
      const saveResult = await saveDeferred.promise;

      if (saveResult.isSuccess && saveResult.value) {
      setProgress({ stage: ScanStage.Complete, message: 'Local asset cache rebuilt successfully.', progress: 100 });
        setResults({
          assets: assetsCount,
          images: imagesCount,
          files: filesCount,
          imagesWithHash: imagesWithHash.length,
          imagesWithoutHash: imagesWithoutHash.length,
          needsMeta: (result.needsMeta?.assets?.length || 0) + (result.needsMeta?.files?.length || 0),
          stats: result.stats,
        });

        const scanEnd = performance.now();
        log.logInfo(`[ScanAssetsDialog] SCAN END (success) - ${(scanEnd - scanStart).toFixed(2)}ms`, getStackTrace());
        onScanComplete?.();
      } else {
        setProgress({ stage: ScanStage.Complete, message: 'Index rebuild finished, but asset registry save failed.', progress: 100 });
        setResults({
          assets: assetsCount,
          images: imagesCount,
          files: filesCount,
          imagesWithHash: imagesWithHash.length,
          imagesWithoutHash: imagesWithoutHash.length,
          needsMeta: (result.needsMeta?.assets?.length || 0) + (result.needsMeta?.files?.length || 0),
          stats: result.stats,
        });
        setError(saveResult.errorMessage || 'Index save failed');
      }
    } catch (err) {
      const scanEnd = performance.now();
      log.logError(`[ScanAssetsDialog] SCAN END (error) - ${(scanEnd - scanStart).toFixed(2)}ms`, getStackTrace(), { error: err });
      setProgress({ stage: ScanStage.Error, message: 'Local asset cache rebuild failed.' });
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [onScanComplete]);

  useEffect(() => {
    if (isOpen) {
      setProgress({ stage: ScanStage.Idle, message: '' });
      setResults(null);
      setError(null);
      handleScan();
    }
  }, [isOpen, handleScan]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && progress.stage !== ScanStage.Rebuilding && progress.stage !== ScanStage.Scanning && progress.stage !== ScanStage.Registering && progress.stage !== ScanStage.Saving) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, progress.stage, onClose]);

  useEffect(() => {
    if (progressBarRef.current) {
      progressBarRef.current.style.setProperty('--progress-width', `${progress.progress || 0}%`);
    }
  }, [progress.progress]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && progress.stage !== ScanStage.Rebuilding && progress.stage !== ScanStage.Scanning && progress.stage !== ScanStage.Registering && progress.stage !== ScanStage.Saving) {
      onClose();
    }
  };

  const isProcessing = progress.stage === ScanStage.Rebuilding || progress.stage === ScanStage.Scanning || progress.stage === ScanStage.Registering || progress.stage === ScanStage.Saving;
  const isComplete = progress.stage === ScanStage.Complete;
  const hasError = progress.stage === ScanStage.Error;

  return (
    <div 
      className="scan-assets-dialog-overlay" 
      onClick={handleOverlayClick}
      role="presentation"
      aria-label="Dialog backdrop"
    >
      <div 
        className="scan-assets-dialog" 
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-assets-dialog-title"
      >
        <div className="scan-assets-dialog__header">
          <h2 id="scan-assets-dialog-title">Rebuild Local Asset Cache</h2>
          {!isProcessing && (
            <button
              className="scan-assets-dialog__close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ✕
            </button>
          )}
        </div>

        <div className="scan-assets-dialog__content">
          {isProcessing && (
            <div className="scan-assets-dialog__progress">
              <div className="scan-assets-dialog__progress-bar-container">
                <div 
                  ref={progressBarRef}
                  className="scan-assets-dialog__progress-bar"
                />
              </div>
              <p className="scan-assets-dialog__progress-message">{progress.message}</p>
            </div>
          )}

          {hasError && (
            <div className="scan-assets-dialog__error">
              <span className="scan-assets-dialog__error-icon">❌</span>
              <div>
                <p className="scan-assets-dialog__error-title">Local Cache Rebuild Failed</p>
                <p className="scan-assets-dialog__error-text">{error || 'An unknown error occurred'}</p>
              </div>
            </div>
          )}

          {isComplete && results && (
            <div className="scan-assets-dialog__results">
              <div className="scan-assets-dialog__success-icon">✅</div>
              <h3 className="scan-assets-dialog__results-title">Local Cache Rebuilt</h3>
              
              <div className="scan-assets-dialog__results-grid">
                <div className="scan-assets-dialog__result-item">
                  <span className="scan-assets-dialog__result-label">Assets Found:</span>
                  <span className="scan-assets-dialog__result-value">{results.assets}</span>
                </div>
                <div className="scan-assets-dialog__result-item">
                  <span className="scan-assets-dialog__result-label">Images Found:</span>
                  <span className="scan-assets-dialog__result-value">{results.images}</span>
                </div>
                <div className="scan-assets-dialog__result-item">
                  <span className="scan-assets-dialog__result-label">Files Found:</span>
                  <span className="scan-assets-dialog__result-value">{results.files}</span>
                </div>
                {results.imagesWithHash > 0 && (
                  <div className="scan-assets-dialog__result-item">
                    <span className="scan-assets-dialog__result-label">Images with Hash:</span>
                    <span className="scan-assets-dialog__result-value">{results.imagesWithHash}</span>
                  </div>
                )}
                {results.imagesWithoutHash > 0 && (
                  <div className="scan-assets-dialog__result-item scan-assets-dialog__result-item--warning">
                    <span className="scan-assets-dialog__result-label">Images without Hash:</span>
                    <span className="scan-assets-dialog__result-value">{results.imagesWithoutHash}</span>
                  </div>
                )}
                {results.needsMeta > 0 && (
                  <div className="scan-assets-dialog__result-item scan-assets-dialog__result-item--info">
                    <span className="scan-assets-dialog__result-label">Needs Meta:</span>
                    <span className="scan-assets-dialog__result-value">{results.needsMeta}</span>
                  </div>
                )}
              </div>

              {results.stats && (
                <div className="scan-assets-dialog__stats">
                  <div className="scan-assets-dialog__stat-row">
                    <span>Total Assets:</span>
                    <span>{results.stats.totalAssets}</span>
                  </div>
                  <div className="scan-assets-dialog__stat-row">
                    <span>With Meta:</span>
                    <span>{results.stats.assetsWithMeta}</span>
                  </div>
                  <div className="scan-assets-dialog__stat-row">
                    <span>Needing Meta:</span>
                    <span>{results.stats.assetsNeedingMeta}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="scan-assets-dialog__warning">
                  <span className="scan-assets-dialog__warning-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="scan-assets-dialog__footer">
          {isProcessing && (
            <div className="scan-assets-dialog__processing-note">
              Please wait while the local cache is rebuilt...
            </div>
          )}
          {!isProcessing && (
            <button
              className="scan-assets-dialog__button scan-assets-dialog__button--primary"
              onClick={onClose}
            >
              {hasError ? 'Close' : 'OK'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
