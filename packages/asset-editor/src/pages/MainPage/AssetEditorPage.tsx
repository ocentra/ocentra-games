import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { useAuth } from '@/hooks/useAuth';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { EditorStateContext } from '@/context/EditorStateContext';
import { EditorDockLayout, type EditorDockLayoutHandle } from './EditorDockLayout';
import { AssetEditorHeader } from '@/components/AssetEditorHeader';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import './AssetEditorPage.css';

const log = AssetEditorLogger.instance;
const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);
import { MenuBar } from '@/pages/MenuBar/MenuBar';
import { WindowControls } from '@/components/WindowControls';
import { useAssetEditorDialogs } from './useAssetEditorDialogs';
import { useSyncMenu } from '@/pages/MenuBar/SyncMenu/useSyncMenu';
import type { AssetData } from '@/types/assets';
import { useAssetLoader } from './useAssetLoader';
import { useAssetNavigation } from './useAssetNavigation';
import { handleDeleteGameMode, handleAssetCreated } from './assetHandlers';
import { ASSET_SELECTION_CHANNEL, createPanelWindow, getStandalonePanelUrl, isTauri } from '@/utils/createPanelWindow';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { SyncFromR2Event } from '@ocentra/eventing-domain/events/assets/SyncFromR2Event';
import { getIndexStatus, rebuildIndex } from '@/adapters/assets/TauriAssetAdapter';

const LazyCreateAssetDialog = React.lazy(async () => ({
  default: (await import('@/pages/Dialogs/CreateAssetDialog')).CreateAssetDialog,
}));

const LazyDeleteAssetDialog = React.lazy(async () => ({
  default: (await import('@/pages/Dialogs/DeleteAssetDialog')).DeleteAssetDialog,
}));

export const AssetEditorPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { isAdmin } = useAdminPermissions();
  const headerProps = useCoreUIHeaderProps();

  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const dockLayoutRef = React.useRef<EditorDockLayoutHandle | null>(null);
  const titleBarRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const isDev = import.meta.env.DEV;
    const isProd = import.meta.env.PROD || import.meta.env.CF_PAGES === '1';

    if (!isDev && !isProd) {
      window.location.href = '/';
      return;
    }

    if (!isAdmin && isAuthenticated && user) {
      logWarn('[AssetEditorPage] Access denied - admin only', { 
        data: { 
          email: user.email, 
          isAdmin: user.isAdmin,
          userId: user.uid 
        } 
      });
    }
  }, [isAdmin, user, isAuthenticated]);

  const [syncStatus, setSyncStatus] = useState<ReturnType<typeof useSyncMenu>['syncStatus']>(null);

  const handleSyncStatusChange = useCallback((status: ReturnType<typeof useSyncMenu>['syncStatus']) => {
    setSyncStatus(status);
  }, []);

  const {
    isCreateDialogOpen,
    createDialogPath,
    createDialogCategory,
    createDialogAssetType,
    createDialogMode,
    createDialogGameIdFromContext,
    isDeleteDialogOpen,
    assetToDelete,
    handleCreateAsset,
    handleDeleteAsset,
    closeCreateDialog,
    closeDeleteDialog,
  } = useAssetEditorDialogs();

  const {
    assetData,
    assetPath,
    assetRawContent,
    assetInstance,
    isLoadingAsset,
    assetError,
    loadAsset,
    setAssetData,
    setAssetPath,
    setAssetRawContent,
    setAssetError,
    setIsLoadingAsset,
  } = useAssetLoader();

  const {
    navigationHistory,
    handleAssetSelect,
    handleNavigateToAsset,
    handleBack,
  } = useAssetNavigation(
    selectedAsset,
    setSelectedAsset,
    assetPath,
    assetData,
    isLoadingAsset,
    loadAsset,
    setAssetData,
    setAssetPath,
    setAssetRawContent,
    setAssetError,
    setIsLoadingAsset
  );

  const [refreshTreeTrigger, setRefreshTreeTrigger] = useState(0);
  const refreshTree = useCallback(() => {
    const run = async () => {
      if (isTauri()) {
        const initialStatus = await getIndexStatus().catch(() => null);
        if (!initialStatus?.running) {
          await rebuildIndex().catch(() => undefined);
        }
        for (;;) {
          const status = await getIndexStatus().catch(() => null);
          if (!status?.running) {
            break;
          }
          await new Promise<void>((resolve) => window.setTimeout(resolve, 250));
        }
      }
      setRefreshTreeTrigger(prev => prev + 1);
    };
    void run();
  }, []);

  const handleAssetDeleted = useCallback((path: string) => {
    if (selectedAsset === path) {
      setSelectedAsset(null);
      setAssetData(null);
      setAssetPath(null);
      setAssetRawContent(null);
      setAssetError(null);
    }
    refreshTree();
  }, [refreshTree, selectedAsset, setSelectedAsset, setAssetData, setAssetError, setAssetPath, setAssetRawContent]);

  const onAssetCreated = useCallback((path: string) => {
    handleAssetCreated(
      path,
      selectedAsset,
      setSelectedAsset,
      loadAsset,
      refreshTree
    );
  }, [selectedAsset, loadAsset, refreshTree]);

  const onDeleteGameMode = useCallback(async (guid: string) => {
    await handleDeleteGameMode(guid, handleAssetDeleted);
  }, [handleAssetDeleted]);

  useEffect(() => {
    if (!selectedAsset) {
      setAssetData(null);
      setAssetPath(null);
    }
  }, [selectedAsset, setAssetData, setAssetPath]);

  const broadcastChannelRef = React.useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    broadcastChannelRef.current = new BroadcastChannel(ASSET_SELECTION_CHANNEL);
    return () => {
      broadcastChannelRef.current?.close();
      broadcastChannelRef.current = null;
    };
  }, []);
  useEffect(() => {
    if (assetPath && broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ assetPath });
    }
  }, [assetPath]);

  useEffect(() => {
    const autoSync = async () => {
      if (syncStatus && syncStatus.totalAssets === 0) {
        const syncDeferred = new OperationDeferred<void>();
        await EventBus.instance.publishAsync(new SyncFromR2Event(syncDeferred));
        await syncDeferred.promise;
      }
    };
    autoSync().catch(() => { });
  }, [syncStatus]);

  const handleAssetUpdate = useCallback((updatedData: AssetData) => {
    setAssetData(updatedData);
  }, [setAssetData]);

  const handleContentChange = async (content: string) => {
    if (!assetPath || !assetData) return;

    const updatedData = {
      ...assetData,
      _markdownBody: content,
    };

    setAssetData(updatedData);
  };

  if (!isAuthenticated || !user || !isAdmin) {
    return null;
  }

  return (
    <EditorStateContext.Provider value={{
      selectedAsset,
      assetPath,
      assetData,
      assetRawContent,
      assetInstance,
      isLoadingAsset,
      assetError,
      navigationHistory,
      refreshTreeTrigger,
      syncStatus,
      onAssetSelect: handleAssetSelect,
      onNavigateToAsset: handleNavigateToAsset,
      onBack: handleBack,
      onContentChange: handleContentChange,
      onAssetUpdate: handleAssetUpdate,
      onCreateAsset: handleCreateAsset,
      onDeleteAsset: handleDeleteAsset,
      onDeleteGameMode,
    }}>
      <div className="asset-editor">
        <div ref={titleBarRef} className="asset-editor__titlebar-wrap">
          <AssetEditorHeader
            user={user ? {
              displayName: user.displayName ?? null,
              email: user.email ?? null,
              photoURL: user.photoURL ?? null,
              isAdmin,
            } : null}
            onLogout={headerProps.onLogout}
            getImageUrl={headerProps.getImageUrl}
            centerIconSrc="/favicon.svg"
            rightSuffixContent={<WindowControls />}
            leftContent={
              <div className="asset-editor__topbar">
                <MenuBar
                  onCreateAsset={handleCreateAsset}
                  onRefreshTree={refreshTree}
                  onSyncStatusChange={handleSyncStatusChange}
                  onOpenPreviewWindow={() => {
                    const path = assetPath ?? 'virtual:AssetCatalog';
                    const title = path.split('/').pop() ?? path;
                    if (isTauri()) {
                      void createPanelWindow('preview', path, title, false);
                    } else {
                      window.open(getStandalonePanelUrl('preview', path, false), '_blank');
                    }
                  }}
                  onOpenInspectorWindow={() => {
                    const path = assetPath ?? 'virtual:AssetCatalog';
                    const title = path.split('/').pop() ?? path;
                    if (isTauri()) {
                      void createPanelWindow('inspector', path, title, false);
                    } else {
                      window.open(getStandalonePanelUrl('inspector', path, false), '_blank');
                    }
                  }}
                  onOpenPreviewPanel={() => dockLayoutRef.current?.openPreviewPanel()}
                  onOpenInspectorPanel={() => dockLayoutRef.current?.openInspectorPanel()}
                  onResetLayout={() => dockLayoutRef.current?.resetLayout()}
                />
              </div>
            }
          />
        </div>

        <div className="asset-editor__dock-container">
          <EditorDockLayout ref={dockLayoutRef} />
        </div>

        <div className="asset-editor__footer">
          <GameFooter
            appVersion={
              typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION != null
                ? String(import.meta.env.VITE_APP_VERSION)
                : '0.1.0'
            }
          />
        </div>

        {isCreateDialogOpen && (
          <Suspense fallback={null}>
            <LazyCreateAssetDialog
              isOpen={isCreateDialogOpen}
              onClose={closeCreateDialog}
              onAssetCreated={onAssetCreated}
              defaultPath={createDialogPath}
              defaultCategory={createDialogCategory}
              defaultAssetType={createDialogAssetType}
              mode={createDialogMode}
              gameIdFromContext={createDialogGameIdFromContext}
            />
          </Suspense>
        )}
        {isDeleteDialogOpen && (
          <Suspense fallback={null}>
            <LazyDeleteAssetDialog
              isOpen={isDeleteDialogOpen}
              assetPath={assetToDelete}
              onClose={closeDeleteDialog}
              onAssetDeleted={handleAssetDeleted}
            />
          </Suspense>
        )}
      </div>
    </EditorStateContext.Provider>
  );
};
