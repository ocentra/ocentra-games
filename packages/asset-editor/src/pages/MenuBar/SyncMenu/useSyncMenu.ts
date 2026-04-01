import { useState, useEffect, useCallback } from 'react';
import type { SyncStatus } from './types';
import type { AssetSyncStatus } from '@/lib/core/inspector/types';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetSyncStatusEvent } from '@ocentra/eventing-domain/events/assets/GetSyncStatusEvent';
import { SyncToR2Event } from '@ocentra/eventing-domain/events/assets/SyncToR2Event';
import { SyncFromR2Event } from '@ocentra/eventing-domain/events/assets/SyncFromR2Event';
import { ScanR2StatusEvent } from '@ocentra/eventing-domain/events/assets/ScanR2StatusEvent';
import {
  ASSET_EDITOR_SYNC_TARGET_EVENT,
  getActiveAssetEditorSyncTarget,
  getAssetEditorSyncTargetDetails,
  getAvailableAssetEditorSyncTargets,
  setActiveAssetEditorSyncTarget,
  type AssetEditorSyncTargetValue,
} from '@/services/storage/syncTarget';

export function useSyncMenu() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncTargetKey, setSyncTargetKey] = useState<AssetEditorSyncTargetValue>(getActiveAssetEditorSyncTarget());

  const syncTarget = getAssetEditorSyncTargetDetails(syncTargetKey);
  const availableTargets = getAvailableAssetEditorSyncTargets();

  const loadSyncStatus = useCallback(async (retryCount = 0) => {
    try {
      const deferred = new OperationDeferred<AssetSyncStatus>();
      await EventBus.instance.publishAsync(new GetSyncStatusEvent(deferred));
      const result = await deferred.promise;
      if (result.isSuccess && result.value) {
        setSyncStatus(result.value);
      }
    } catch {
      if (retryCount < 3) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        setTimeout(() => loadSyncStatus(retryCount + 1), delay);
      }
    }
  }, []);

  useEffect(() => {
    const initialDelay = setTimeout(() => {
      loadSyncStatus();
    }, 2000);
    
    return () => {
      clearTimeout(initialDelay);
    };
  }, [loadSyncStatus]);

  useEffect(() => {
    const handleTargetChanged = () => {
      const nextTarget = getActiveAssetEditorSyncTarget();
      setSyncTargetKey(nextTarget);
      setSyncError(null);
      setSyncStatus(null);
      void loadSyncStatus();
    };

    window.addEventListener(ASSET_EDITOR_SYNC_TARGET_EVENT, handleTargetChanged as EventListener);
    window.addEventListener('storage', handleTargetChanged);
    return () => {
      window.removeEventListener(ASSET_EDITOR_SYNC_TARGET_EVENT, handleTargetChanged as EventListener);
      window.removeEventListener('storage', handleTargetChanged);
    };
  }, [loadSyncStatus]);

  const handleSelectSyncTarget = useCallback((target: AssetEditorSyncTargetValue) => {
    setActiveAssetEditorSyncTarget(target);
  }, []);

  const handleSyncToR2 = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const syncDeferred = new OperationDeferred<void>();
      await EventBus.instance.publishAsync(new SyncToR2Event(syncDeferred));
      const syncResult = await syncDeferred.promise;
      if (!syncResult.isSuccess) {
        throw new Error(syncResult.errorMessage || 'Sync failed');
      }
      const statusDeferred = new OperationDeferred<AssetSyncStatus>();
      await EventBus.instance.publishAsync(new GetSyncStatusEvent(statusDeferred));
      const statusResult = await statusDeferred.promise;
      if (statusResult.isSuccess && statusResult.value) {
        setSyncStatus(statusResult.value);
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncFromR2 = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const syncDeferred = new OperationDeferred<void>();
      await EventBus.instance.publishAsync(new SyncFromR2Event(syncDeferred));
      const syncResult = await syncDeferred.promise;
      if (!syncResult.isSuccess) {
        throw new Error(syncResult.errorMessage || 'Sync failed');
      }
      const statusDeferred = new OperationDeferred<AssetSyncStatus>();
      await EventBus.instance.publishAsync(new GetSyncStatusEvent(statusDeferred));
      const statusResult = await statusDeferred.promise;
      if (statusResult.isSuccess && statusResult.value) {
        setSyncStatus(statusResult.value);
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleScanR2Status = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const scanDeferred = new OperationDeferred<void>();
      await EventBus.instance.publishAsync(new ScanR2StatusEvent(scanDeferred));
      const scanResult = await scanDeferred.promise;
      if (!scanResult.isSuccess) {
        throw new Error(scanResult.errorMessage || 'Scan failed');
      }
      const statusDeferred = new OperationDeferred<AssetSyncStatus>();
      await EventBus.instance.publishAsync(new GetSyncStatusEvent(statusDeferred));
      const statusResult = await statusDeferred.promise;
      if (statusResult.isSuccess && statusResult.value) {
        setSyncStatus(statusResult.value);
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Scan failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    syncStatus,
    isSyncing,
    syncError,
    syncTarget,
    availableTargets,
    handleSyncToR2,
    handleSyncFromR2,
    handleScanR2Status,
    loadSyncStatus,
    handleSelectSyncTarget,
  };
}

