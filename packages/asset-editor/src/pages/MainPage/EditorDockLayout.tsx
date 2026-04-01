import React, {
  Suspense,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import DockLayout, { addHandlers, removeHandlers, DragState, addDragStateListener, removeDragStateListener } from 'rc-dock';
import type { DockContext, LayoutData, PanelData, TabData, TabGroup } from 'rc-dock';
import 'rc-dock/dist/rc-dock-dark.css';
import { useEditorState } from '@/context/EditorStateContext';
import './EditorDockLayout.css';
import {
  cloneLockedSnapshot,
  getWorkspaceTabTitle,
  isWorkspaceTab,
  makeWorkspaceTabId,
  type LockedAssetSnapshot,
  type WorkspaceTabBase,
  type WorkspaceTabData,
} from './dockWorkspace';
import { createPanelWindow, isTauri } from '@/utils/createPanelWindow';

const LAYOUT_KEY = 'ocentra-editor-dock-layout';

const PanelMaxIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="4" y="4" width="16" height="16" rx="1" />
  </svg>
);

const PanelRestoreIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8 4H4v4M4 20h4v-4M20 8V4h-4M16 20h4v-4" />
  </svg>
);

const MoveToWindowIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);

const ClosePanelIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const DockBackIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const LockIcon: React.FC<{ locked: boolean }> = ({ locked }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {locked ? (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" strokeWidth="2" />
      </>
    ) : (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    )}
  </svg>
)

const defaultLayout = {
  dockbox: {
    mode: 'horizontal' as const,
    children: [
      {
        size: 25,
        tabs: [{ id: 'resources', panelKind: 'resources', baseTab: true, closable: false }],
      },
      {
        size: 50,
        tabs: [{ id: 'preview', panelKind: 'preview', baseTab: true, closable: false }],
      },
      {
        size: 25,
        tabs: [{ id: 'inspector', panelKind: 'inspector', baseTab: true, closable: false }],
      },
    ],
  },
} as unknown as LayoutData;

export interface EditorDockLayoutHandle {
  openPreviewPanel: () => void
  openInspectorPanel: () => void
  resetLayout: () => void
}

const LazyResourceTree = React.lazy(async () => ({
  default: (await import('@/pages/ResourceTree/ResourceTree')).ResourceTree,
}));

const LazyPreviewPanel = React.lazy(async () => ({
  default: (await import('@/pages/PreviewPanel/PreviewPanel')).PreviewPanel,
}));

const LazyInspectorPanel = React.lazy(async () => ({
  default: (await import('@/pages/InspectorPanel/InspectorPanel')).InspectorPanel,
}));

const DockPanelLoading: React.FC<{ label: string }> = ({ label }) => (
  <div className="preview-panel preview-panel--empty">
    <div className="preview-panel__placeholder">
      <div className="preview-panel__loading">
        <div className="preview-panel__spinner"></div>
      </div>
      <p className="preview-panel__placeholder-subtitle">Loading {label}...</p>
    </div>
  </div>
);

function loadSavedLayout(): LayoutData | undefined {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    return raw ? (JSON.parse(raw) as unknown as LayoutData) : undefined;
  } catch {
    return undefined;
  }
}

const ResourcesPanel: React.FC = () => {
  const { selectedAsset, refreshTreeTrigger, onAssetSelect, onDeleteAsset, onCreateAsset } = useEditorState();
  return (
    <Suspense fallback={<DockPanelLoading label="resources" />}>
      <LazyResourceTree
        key={refreshTreeTrigger}
        selectedAsset={selectedAsset}
        onAssetSelect={onAssetSelect}
        onDeleteAsset={onDeleteAsset}
        onCreateAsset={onCreateAsset}
      />
    </Suspense>
  );
};

const PreviewPanelConnector: React.FC<{ tab: WorkspaceTabData }> = ({ tab }) => {
  const {
    assetPath, assetData, assetRawContent, assetInstance,
    isLoadingAsset, assetError, navigationHistory,
    onNavigateToAsset, onBack, onContentChange, onAssetUpdate,
  } = useEditorState();

  const lockedSnapshot = tab.lockedSnapshot;
  const useLiveSelection =
    !lockedSnapshot ||
    (lockedSnapshot.assetPath !== null && lockedSnapshot.assetPath === assetPath);

  const effectiveAssetPath = useLiveSelection ? assetPath : lockedSnapshot.assetPath;
  const effectiveAssetData = useLiveSelection ? assetData : lockedSnapshot.assetData;
  const effectiveRawContent = useLiveSelection
    ? assetRawContent
    : lockedSnapshot.assetRawContent;
  const effectiveError = useLiveSelection ? assetError : lockedSnapshot.assetError;
  const effectiveIsLoading = useLiveSelection ? isLoadingAsset : false;
  const effectiveNavigationHistory = lockedSnapshot ? [] : navigationHistory;
  const effectiveOnBack = lockedSnapshot ? undefined : navigationHistory.length > 0 ? onBack : undefined;

  return (
    <Suspense fallback={<DockPanelLoading label="preview" />}>
      <LazyPreviewPanel
        assetPath={effectiveAssetPath}
        assetData={effectiveAssetData}
        assetRawContent={effectiveRawContent}
        assetInstance={assetInstance}
        isLoading={effectiveIsLoading}
        error={effectiveError}
        onNavigateToAsset={onNavigateToAsset}
        navigationHistory={effectiveNavigationHistory}
        onBack={effectiveOnBack}
        onContentChange={onContentChange}
        onAssetUpdate={onAssetUpdate}
      />
    </Suspense>
  );
};

function isInspectableSelection(
  assetPath: string | null,
  assetData: { system?: { assetType?: string } } | null
): boolean {
  if (!assetPath) return false
  if (assetPath.startsWith('virtual:AssetCatalog')) return false
  const type = assetData?.system?.assetType
  if (type === 'AssetCatalog') return false
  return true
}

const InspectorPanelConnector: React.FC<{ tab: WorkspaceTabData }> = ({ tab }) => {
  const {
    assetPath, assetData, isLoadingAsset, assetError, syncStatus,
    onAssetUpdate, onNavigateToAsset, onCreateAsset, onDeleteGameMode,
  } = useEditorState();

  const lockedSnapshot = tab.lockedSnapshot;
  const useLiveSelection =
    !lockedSnapshot ||
    (lockedSnapshot.assetPath !== null && lockedSnapshot.assetPath === assetPath);

  const effectiveAssetPath = useLiveSelection ? assetPath : lockedSnapshot.assetPath;
  const effectiveAssetData = useLiveSelection ? assetData : lockedSnapshot.assetData;
  const effectiveError = useLiveSelection ? assetError : lockedSnapshot.assetError;
  const effectiveIsLoading = useLiveSelection ? isLoadingAsset : false;

  const showInspector = useLiveSelection
    ? isInspectableSelection(effectiveAssetPath, effectiveAssetData)
    : true;

  if (!showInspector) {
    return <div className="inspector-panel inspector-panel--hidden" aria-hidden />;
  }

  return (
    <Suspense fallback={<DockPanelLoading label="inspector" />}>
      <LazyInspectorPanel
        assetPath={effectiveAssetPath}
        assetData={effectiveAssetData}
        isLoading={effectiveIsLoading}
        error={effectiveError}
        syncStatus={syncStatus}
        onAssetUpdate={onAssetUpdate}
        onNavigateToAsset={onNavigateToAsset}
        onCreateAsset={onCreateAsset}
        onDeleteGameMode={onDeleteGameMode}
      />
    </Suspense>
  );
};

function buildLoadTab(
  toggleTabLock: (tab: WorkspaceTabData | undefined) => void,
  closeTab: (tab: WorkspaceTabData) => void
): (data: TabData) => TabData {
  return (data: TabData): TabData => {
    const tab = data as WorkspaceTabData
    const panelKind = tab.panelKind ?? (
      data.id === 'resources' ? 'resources' : data.id === 'preview' ? 'preview' : data.id === 'inspector' ? 'inspector' : undefined
    )

    switch (panelKind) {
      case 'resources':
        return {
          ...tab,
          panelKind: 'resources',
          group: 'resources',
          title: 'Resources',
          content: <ResourcesPanel />,
        }
      case 'preview': {
        const label = typeof tab.title === 'string' ? tab.title : getWorkspaceTabTitle('preview', tab.lockedSnapshot)
        const canClose = tab.closable !== false && !tab.baseTab
        return {
          ...tab,
          panelKind: 'preview',
          group: 'preview',
          title: (
            <span
              className="dock-tab-with-lock"
              title={canClose ? 'Right-click to close tab' : undefined}
              onContextMenu={canClose ? (e) => { e.preventDefault(); closeTab(tab) } : undefined}
            >
              <span className="dock-tab-label">{label}</span>
              <button
                type="button"
                className="dock-tab-lock-btn"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleTabLock(tab) }}
                onPointerDown={(e) => e.stopPropagation()}
                title={tab.lockedSnapshot ? 'Unlock' : 'Lock to current asset'}
                aria-label={tab.lockedSnapshot ? 'Unlock' : 'Lock'}
              >
                <LockIcon locked={Boolean(tab.lockedSnapshot)} />
              </button>
            </span>
          ),
          content: <PreviewPanelConnector tab={tab} />,
        }
      }
      case 'inspector': {
        const label = typeof tab.title === 'string' ? tab.title : getWorkspaceTabTitle('inspector', tab.lockedSnapshot)
        const canClose = tab.closable !== false && !tab.baseTab
        return {
          ...tab,
          panelKind: 'inspector',
          group: 'inspector',
          title: (
            <span
              className="dock-tab-with-lock"
              title={canClose ? 'Right-click to close tab' : undefined}
              onContextMenu={canClose ? (e) => { e.preventDefault(); closeTab(tab) } : undefined}
            >
              <span className="dock-tab-label">{label}</span>
              <button
                type="button"
                className="dock-tab-lock-btn"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleTabLock(tab) }}
                onPointerDown={(e) => e.stopPropagation()}
                title={tab.lockedSnapshot ? 'Unlock' : 'Lock to current asset'}
                aria-label={tab.lockedSnapshot ? 'Unlock' : 'Lock'}
              >
                <LockIcon locked={Boolean(tab.lockedSnapshot)} />
              </button>
            </span>
          ),
          content: <InspectorPanelConnector tab={tab} />,
        }
      }
      default:
        return data
    }
  }
}

export const EditorDockLayout = forwardRef<EditorDockLayoutHandle>((_, ref) => {
  const {
    assetPath,
    assetData,
    assetRawContent,
    assetError,
  } = useEditorState();
  const savedLayout = useRef(loadSavedLayout()).current;
  const dockRef = useRef<DockLayout | null>(null);

  const getCurrentSnapshot = useCallback((): LockedAssetSnapshot | null => {
    if (!assetPath || !assetData) {
      return null
    }

    const assetLabel =
      assetData.system?.displayName ||
      assetData.metadata?.assetId ||
      assetPath.split('/').pop() ||
      assetPath

    return {
      assetPath,
      assetData: JSON.parse(JSON.stringify(assetData)),
      assetRawContent,
      assetError,
      assetLabel,
    }
  }, [assetData, assetError, assetPath, assetRawContent]);

  const loadTabRef = useRef<(d: TabData) => TabData>(() => ({} as TabData))

  const toggleTabLock = useCallback((tab: WorkspaceTabData | undefined) => {
    if (!tab?.id) return
    const nextSnapshot = tab.lockedSnapshot ? null : getCurrentSnapshot()
    const updatedTab: WorkspaceTabData = {
      ...tab,
      lockedSnapshot: cloneLockedSnapshot(nextSnapshot),
      title: getWorkspaceTabTitle(tab.panelKind ?? 'preview', nextSnapshot),
    }
    dockRef.current?.updateTab(tab.id, loadTabRef.current(updatedTab), true)
  }, [getCurrentSnapshot])

  const closeTab = useCallback((tab: WorkspaceTabData) => {
    if (!tab?.id || tab.baseTab || tab.closable === false) return
    dockRef.current?.dockMove(tab, null, 'remove')
  }, [])

  const loadTabFn = useMemo(() => buildLoadTab(toggleTabLock, closeTab), [toggleTabLock, closeTab])
  loadTabRef.current = loadTabFn

  const createPanelTab = useCallback((kind: 'preview' | 'inspector') => {
    const id = makeWorkspaceTabId(kind)
    const tab: WorkspaceTabData = {
      id,
      panelKind: kind,
      instanceId: id,
      baseTab: false,
      closable: true,
      lockedSnapshot: null,
      title: getWorkspaceTabTitle(kind, null),
      group: kind,
      content: <div />,
    }
    return loadTabFn(tab) as WorkspaceTabData
  }, [loadTabFn])

  const openWorkspacePanel = useCallback((kind: 'preview' | 'inspector') => {
    const dock = dockRef.current
    if (!dock) return

    const newTab = createPanelTab(kind)
    const target = dock.find(item => isWorkspaceTab(item as WorkspaceTabData) && (item as WorkspaceTabData).panelKind === kind)

    if (target) {
      dock.dockMove(newTab, target as WorkspaceTabData, 'after-tab')
      return
    }

    dock.dockMove(newTab, null, 'float', {
      left: 160,
      top: 140,
      width: kind === 'preview' ? 1100 : 420,
      height: 720,
    })
  }, [createPanelTab])

  const restoreMaximizedRef = useRef<(() => void) | null>(null)

  const dockPanelBack = useCallback((panel: PanelData | WorkspaceTabData, context: DockContext) => {
    const dock = dockRef.current
    if (!dock) return
    const kind = (panel as WorkspaceTabData).panelKind ?? panel.group
    const targetId = kind === 'preview' ? 'preview' : kind === 'inspector' ? 'inspector' : kind === 'resources' ? 'resources' : null
    if (!targetId) return
    const target = dock.find(targetId)
    if (target && 'tabs' in target) {
      context.dockMove(panel, target, 'middle')
    }
  }, [])

  const movePanelToNewWindow = useCallback((
    kind: 'preview' | 'inspector',
    panel: PanelData,
    context: DockContext
  ) => {
    const activeTab = panel.activeId
      ? (panel.tabs.find(t => t.id === panel.activeId) as WorkspaceTabData | undefined)
      : undefined
    const effectivePath = activeTab?.lockedSnapshot?.assetPath ?? assetPath ?? 'virtual:AssetCatalog'
    const title = activeTab?.lockedSnapshot?.assetLabel ?? effectivePath.split('/').pop() ?? effectivePath
    const locked = Boolean(activeTab?.lockedSnapshot)
    const shouldRemove = activeTab && panel.tabs.length > 1
    void createPanelWindow(kind, effectivePath, title, locked)
      .then(() => {
        if (shouldRemove) context.dockMove(activeTab!, null, 'remove')
      })
      .catch(() => {})
  }, [assetPath])

  const groups = useMemo<Record<string, TabGroup>>(() => ({
    resources: {
      floatable: true,
      newWindow: true,
      maximizable: true,
      preferredFloatWidth: [320, 520],
      preferredFloatHeight: [420, 920],
      panelExtra: (panel, context) => {
        const isMaximized = panel.parent?.mode === 'maximize'
        const isFloated = panel.parent?.mode === 'float'
        const onMaximize = () => {
          context.dockMove(panel, null, 'maximize')
        }
        if (isMaximized) {
          restoreMaximizedRef.current = onMaximize
        }
        return (
          <div className="dock-panel-extra">
            {isFloated && (
              <button
                type="button"
                className="dock-panel-extra__button dock-panel-extra__button--icon"
                onClick={() => dockPanelBack(panel, context)}
                title="Dock back to main window"
                aria-label="Dock back"
              >
                <DockBackIcon />
              </button>
            )}
            <button
              type="button"
              className={`dock-panel-extra__button dock-panel-extra__button--icon ${isMaximized ? 'dock-panel-min-btn' : 'dock-panel-max-btn'}`}
              onClick={onMaximize}
              title={isMaximized ? 'Restore panel (Esc)' : 'Maximize panel'}
              aria-label={isMaximized ? 'Restore panel' : 'Maximize panel'}
            >
              {isMaximized ? <PanelRestoreIcon /> : <PanelMaxIcon />}
            </button>
          </div>
        )
      },
    },
    preview: {
      floatable: true,
      newWindow: true,
      maximizable: true,
      preferredFloatWidth: [720, 1600],
      preferredFloatHeight: [420, 1100],
      panelExtra: (panel, context) => {
        const isMaximized = panel.parent?.mode === 'maximize'
        const isFloated = panel.parent?.mode === 'float'
        const activeTab = panel.activeId
          ? (panel.tabs.find(t => t.id === panel.activeId) as WorkspaceTabData | undefined)
          : undefined
        const canClose = activeTab?.closable === true && !activeTab?.baseTab
        const onMaximize = () => {
          context.dockMove(panel, null, 'maximize')
        }
        const onClose = () => {
          if (activeTab) context.dockMove(activeTab, null, 'remove')
        }
        if (isMaximized) {
          restoreMaximizedRef.current = onMaximize
        }

        return (
          <div className="dock-panel-extra">
            {isTauri() && isFloated && (
              <button
                type="button"
                className="dock-panel-extra__button dock-panel-extra__button--icon"
                onClick={() => movePanelToNewWindow('preview', panel, context)}
                title="Move to new window (separate OS window)"
                aria-label="Move to new window"
              >
                <MoveToWindowIcon />
              </button>
            )}
            {isFloated && (
              <button
                type="button"
                className="dock-panel-extra__button dock-panel-extra__button--icon"
                onClick={() => dockPanelBack(panel, context)}
                title="Dock back to main window"
                aria-label="Dock back"
              >
                <DockBackIcon />
              </button>
            )}
            <button
              type="button"
              className="dock-panel-extra__button"
              onClick={() => openWorkspacePanel('preview')}
              title="Open another preview tab"
            >
              +
            </button>
            <button
              type="button"
              className={`dock-panel-extra__button dock-panel-extra__button--icon ${isMaximized ? 'dock-panel-min-btn' : 'dock-panel-max-btn'}`}
              onClick={onMaximize}
              title={isMaximized ? 'Restore panel (Esc)' : 'Maximize panel'}
              aria-label={isMaximized ? 'Restore panel' : 'Maximize panel'}
            >
              {isMaximized ? <PanelRestoreIcon /> : <PanelMaxIcon />}
            </button>
            {canClose && (
              <button
                type="button"
                className="dock-panel-extra__button dock-panel-extra__button--icon dock-panel-extra__button--close"
                onClick={onClose}
                title="Close panel"
                aria-label="Close"
              >
                <ClosePanelIcon />
              </button>
            )}
          </div>
        )
      },
    },
    inspector: {
      floatable: true,
      newWindow: true,
      maximizable: true,
      preferredFloatWidth: [320, 560],
      preferredFloatHeight: [420, 1000],
      panelExtra: (panel, context) => {
        const isMaximized = panel.parent?.mode === 'maximize'
        const isFloated = panel.parent?.mode === 'float'
        const activeTab = panel.activeId
          ? (panel.tabs.find(t => t.id === panel.activeId) as WorkspaceTabData | undefined)
          : undefined
        const canClose = activeTab?.closable === true && !activeTab?.baseTab
        const onMaximize = () => {
          context.dockMove(panel, null, 'maximize')
        }
        const onClose = () => {
          if (activeTab) context.dockMove(activeTab, null, 'remove')
        }
        if (isMaximized) {
          restoreMaximizedRef.current = onMaximize
        }

        return (
          <div className="dock-panel-extra">
            {isTauri() && isFloated && (
              <button
                type="button"
                className="dock-panel-extra__button dock-panel-extra__button--icon"
                onClick={() => movePanelToNewWindow('inspector', panel, context)}
                title="Move to new window (separate OS window)"
                aria-label="Move to new window"
              >
                <MoveToWindowIcon />
              </button>
            )}
            {isFloated && (
              <button
                type="button"
                className="dock-panel-extra__button dock-panel-extra__button--icon"
                onClick={() => dockPanelBack(panel, context)}
                title="Dock back to main window"
                aria-label="Dock back"
              >
                <DockBackIcon />
              </button>
            )}
            <button
              type="button"
              className="dock-panel-extra__button"
              onClick={() => openWorkspacePanel('inspector')}
              title="Open another inspector tab"
            >
              +
            </button>
            <button
              type="button"
              className={`dock-panel-extra__button dock-panel-extra__button--icon ${isMaximized ? 'dock-panel-min-btn' : 'dock-panel-max-btn'}`}
              onClick={onMaximize}
              title={isMaximized ? 'Restore panel (Esc)' : 'Maximize panel'}
              aria-label={isMaximized ? 'Restore panel' : 'Maximize panel'}
            >
              {isMaximized ? <PanelRestoreIcon /> : <PanelMaxIcon />}
            </button>
            {canClose && (
              <button
                type="button"
                className="dock-panel-extra__button dock-panel-extra__button--icon dock-panel-extra__button--close"
                onClick={onClose}
                title="Close panel"
                aria-label="Close"
              >
                <ClosePanelIcon />
              </button>
            )}
          </div>
        )
      },
    },
  }), [openWorkspacePanel, movePanelToNewWindow, dockPanelBack])

  const handleLayoutChange = useCallback((newLayout: LayoutData) => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(newLayout));
    const hasMaximized = (newLayout as { maxbox?: { children?: unknown[] } }).maxbox?.children?.length
    if (!hasMaximized) {
      restoreMaximizedRef.current = null
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        restoreMaximizedRef.current?.()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useImperativeHandle(ref, () => ({
    openPreviewPanel: () => openWorkspacePanel('preview'),
    openInspectorPanel: () => openWorkspacePanel('inspector'),
    resetLayout: () => {
      localStorage.removeItem(LAYOUT_KEY)
      dockRef.current?.loadLayout(defaultLayout)
    },
  }), [openWorkspacePanel])

  const fallbackDropRef = useRef<HTMLDivElement | null>(null)
  const dragOutRef = useRef<{
    lastX: number
    lastY: number
    activeTab: WorkspaceTabData | null
    panelTabCount?: number
  }>({ lastX: 0, lastY: 0, activeTab: null })

  useEffect(() => {
    if (!isTauri()) return

    const onDragState = (dragging: boolean | null) => {
      const dockId = dockRef.current ?? undefined
      if (dragging) {
        if (!dockId) return
        const tab = DragState.getData('tab', dockId) as WorkspaceTabData | undefined
        const panel = DragState.getData('panel', dockId) as { activeId?: string; tabs?: WorkspaceTabData[] } | undefined
        const at = tab ?? (panel?.activeId && panel?.tabs ? panel.tabs.find((t) => t.id === panel!.activeId) : panel?.tabs?.[0]) as WorkspaceTabData | undefined
        dragOutRef.current.panelTabCount = panel?.tabs?.length ?? 0
        if (at?.panelKind === 'preview' || at?.panelKind === 'inspector') {
          dragOutRef.current.activeTab = at
        }
        const onUp = (e: PointerEvent) => {
          dragOutRef.current.lastX = e.clientX
          dragOutRef.current.lastY = e.clientY
        }
        document.addEventListener('pointerup', onUp, true)
        ;(dragOutRef as { _cleanup?: () => void })._cleanup = () => {
          document.removeEventListener('pointerup', onUp, true)
        }
      } else {
        ;(dragOutRef as { _cleanup?: () => void })._cleanup?.()
        ;(dragOutRef as { _cleanup?: () => void })._cleanup = undefined
        const { lastX, lastY, activeTab, panelTabCount = 0 } = dragOutRef.current
        const out = lastX < 0 || lastY < 0 || lastX > window.innerWidth || lastY > window.innerHeight
        if (out && activeTab && (activeTab.panelKind === 'preview' || activeTab.panelKind === 'inspector') && dockRef.current) {
          const kind = activeTab.panelKind
          const effectivePath = activeTab.lockedSnapshot?.assetPath ?? assetPath ?? 'virtual:AssetCatalog'
          const title = activeTab.lockedSnapshot?.assetLabel ?? effectivePath.split('/').pop() ?? effectivePath
          const locked = Boolean(activeTab.lockedSnapshot)
          const shouldRemove = panelTabCount > 1
          void createPanelWindow(kind, effectivePath, title, locked).then(() => {
            if (shouldRemove) dockRef.current?.dockMove(activeTab, null, 'remove')
          }).catch(() => {})
        }
        dragOutRef.current.activeTab = null
      }
    }
    addDragStateListener(onDragState)
    return () => { (dragOutRef as { _cleanup?: () => void })._cleanup?.(); removeDragStateListener(onDragState) }
  }, [assetPath])

  useEffect(() => {
    if (!isTauri() || !fallbackDropRef.current || !dockRef.current) return

    const isOverDockZone = (x: number, y: number): boolean => {
      const elements = document.elementsFromPoint(x, y)
      return elements.some((el) => el.classList?.contains('dock-drop-square') || el.classList?.contains('dock-drop-edge'))
    }

    const handler = {
      getHandlers: () => ({
        onDragOverT: (state: { accept: (msg?: string) => void; reject: () => void; clientX: number; clientY: number }) => {
          const dockId = dockRef.current ?? undefined
          if (!dockId) return
          if (isOverDockZone(state.clientX, state.clientY)) { state.reject(); return }
          const tab = DragState.getData('tab', dockId) as WorkspaceTabData | undefined
          const panel = DragState.getData('panel', dockId) as { activeId?: string; tabs?: WorkspaceTabData[] } | undefined
          const activeTab = tab ?? (panel?.activeId && panel?.tabs ? panel.tabs.find((t) => t.id === panel!.activeId) : panel?.tabs?.[0]) as WorkspaceTabData | undefined
          const kind = activeTab?.panelKind
          if (kind === 'preview' || kind === 'inspector') state.accept('dock-accept')
        },
        onDropT: () => {
          const dockId = dockRef.current ?? undefined
          if (!dockId || !dockRef.current) return false
          const tab = DragState.getData('tab', dockId) as WorkspaceTabData | undefined
          const panel = DragState.getData('panel', dockId) as { activeId?: string; tabs?: WorkspaceTabData[] } | undefined
          const activeTab = tab ?? (panel?.activeId && panel?.tabs ? panel.tabs.find((t) => t.id === panel!.activeId) : panel?.tabs?.[0]) as WorkspaceTabData | undefined
          const kind = activeTab?.panelKind
          if (kind !== 'preview' && kind !== 'inspector' || !activeTab) return false
          const effectivePath = activeTab.lockedSnapshot?.assetPath ?? assetPath ?? 'virtual:AssetCatalog'
          const title = activeTab.lockedSnapshot?.assetLabel ?? effectivePath.split('/').pop() ?? effectivePath
          const locked = Boolean(activeTab.lockedSnapshot)
          const shouldRemove = (panel?.tabs?.length ?? 0) > 1
          void createPanelWindow(kind, effectivePath, title, locked).then(() => {
            if (shouldRemove) dockRef.current?.dockMove(activeTab, null, 'remove')
          }).catch(() => {})
          return true
        },
        onDragLeaveT: () => {},
      }),
    }
    addHandlers(fallbackDropRef.current, handler)
    return () => { if (fallbackDropRef.current) removeHandlers(fallbackDropRef.current) }
  }, [assetPath])

  const hideInspector = !isInspectableSelection(assetPath ?? null, assetData);

  return (
    <div className={hideInspector ? 'editor-dock-container editor-dock-container--hide-inspector' : 'editor-dock-container'}>
    <DockLayout
      ref={dockRef}
      defaultLayout={savedLayout ?? defaultLayout}
      groups={groups}
      loadTab={loadTabFn}
      onLayoutChange={handleLayoutChange}
      saveTab={tab => {
        const workspaceTab = tab as WorkspaceTabData
        const saved: WorkspaceTabBase = {
          id: workspaceTab.id,
          panelKind: workspaceTab.panelKind,
          instanceId: workspaceTab.instanceId,
          baseTab: workspaceTab.baseTab,
          lockedSnapshot: cloneLockedSnapshot(workspaceTab.lockedSnapshot ?? null),
        }
        return saved
      }}
      style={{ position: 'absolute', inset: 0 }}
    />
    {isTauri() && (
      <div ref={fallbackDropRef} className="dock-fallback-new-window" aria-hidden />
    )}
    </div>
  );
});

EditorDockLayout.displayName = 'EditorDockLayout'
