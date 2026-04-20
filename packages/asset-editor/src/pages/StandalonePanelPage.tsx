import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { PreviewPanel } from '@/pages/PreviewPanel/PreviewPanel';
import { InspectorPanel } from '@/pages/InspectorPanel/InspectorPanel';
import { loadAssetFromNetwork } from '@/pages/MainPage/loadAssetFromNetwork';
import {
  ASSET_SELECTION_CHANNEL,
  CARD_GAME_LAYOUT_DRAFT_CHANNEL,
  createPanelWindow,
} from '@/utils/createPanelWindow';
import type { AssetData } from '@/types/assets';
import {
  buildLoadedLayoutAssetFromRaw,
  saveLayoutAsset,
  type LayoutAssetDocument,
} from '@/adapters/layout/LayoutAssetService';
import { CardGameDesignStudioWorkbench } from '@ocentra/card-game-ui/CardGameDesignStudioWorkbench';
import { CardGamePreviewSurface } from '@ocentra/card-game-ui/CardGamePreviewSurface';
import './StandalonePanelPage.css';

type StandalonePanel =
  | 'preview'
  | 'inspector'
  | 'design-studio'
  | 'preview-canvas';

function useStandaloneAsset(assetPath: string | null) {
  const [assetData, setAssetData] = useState<AssetData | null>(null);
  const [assetRawContent, setAssetRawContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assetPath) {
      setAssetData(null);
      setAssetRawContent(null);
      setError(null);
      return;
    }
    loadAssetFromNetwork(
      assetPath,
      setAssetData,
      () => {},
      setAssetRawContent,
      setError,
      setIsLoading,
    );
  }, [assetPath]);

  return { assetData, assetRawContent, isLoading, error };
}

function isInspectable(assetPath: string, assetData: AssetData | null): boolean {
  if (assetPath.startsWith('virtual:AssetCatalog')) return false;
  const type = assetData?.system?.assetType;
  if (type === 'AssetCatalog') return false;
  return true;
}

const StandalonePreview: React.FC<{ assetPath: string }> = ({ assetPath }) => {
  const { assetData, assetRawContent, isLoading, error } = useStandaloneAsset(assetPath);
  const noop = useCallback(() => {}, []);

  return (
    <PreviewPanel
      assetPath={assetPath}
      assetData={assetData}
      assetRawContent={assetRawContent}
      assetInstance={null}
      isLoading={isLoading}
      error={error}
      onNavigateToAsset={noop}
      navigationHistory={[]}
      onBack={noop}
      onContentChange={async () => {}}
      onAssetUpdate={noop}
    />
  );
};

const StandaloneInspector: React.FC<{ assetPath: string }> = ({ assetPath }) => {
  const { assetData, isLoading, error } = useStandaloneAsset(assetPath);
  const noop = useCallback(() => {}, []);
  const handleAssetUpdate = useCallback((_data: AssetData) => {
    noop();
  }, [noop]);

  if (!assetData && !isLoading && !error) return null;
  if (!isInspectable(assetPath, assetData)) {
    return (
      <div className="standalone-inspector-placeholder">
        No inspector for this asset type.
      </div>
    );
  }

  return (
    <InspectorPanel
      assetPath={assetPath}
      assetData={assetData}
      isLoading={isLoading}
      error={error}
      onAssetUpdate={handleAssetUpdate}
      onNavigateToAsset={noop}
      onCreateAsset={noop}
      onDeleteGameMode={noop}
      syncStatus={null}
    />
  );
};

const StandaloneCardGameDesignStudio: React.FC<{ assetPath: string; assetData: AssetData }> = ({
  assetPath,
  assetData,
}) => {
  const loadedAsset = useMemo(
    () => buildLoadedLayoutAssetFromRaw(assetPath, assetData as Record<string, unknown>),
    [assetData, assetPath],
  );
  const [document, setDocument] = useState<LayoutAssetDocument>(() => loadedAsset.document);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setDocument(loadedAsset.document);
    setStatus(null);
  }, [loadedAsset]);

  useEffect(() => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    const handler = (event: MessageEvent<{ assetPath?: string; document?: LayoutAssetDocument }>) => {
      if (event.data?.assetPath !== assetPath || !event.data.document) {
        return;
      }
      setDocument(event.data.document);
    };
    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
    };
  }, [assetPath]);

  const broadcast = useCallback((nextDocument: LayoutAssetDocument) => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    channel.postMessage({
      assetPath,
      document: nextDocument,
    });
    channel.close();
  }, [assetPath]);

  const handleChange = useCallback((nextDocument: LayoutAssetDocument) => {
    setDocument(nextDocument);
    broadcast(nextDocument);
  }, [broadcast]);

  const handleSave = useCallback(async () => {
    setStatus('Saving...');
    try {
      const saved = await saveLayoutAsset(loadedAsset, document);
      setDocument(saved.document);
      setStatus('Saved');
      broadcast(saved.document);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save layout');
    }
  }, [broadcast, document, loadedAsset]);

  const handleOpenPreviewCanvas = useCallback(() => {
    void createPanelWindow('preview-canvas', assetPath, loadedAsset.displayName, true);
  }, [assetPath, loadedAsset.displayName]);

  return (
    <div className="standalone-panel-page standalone-panel-page--card-game">
      <CardGameDesignStudioWorkbench
        document={document}
        title={loadedAsset.displayName}
        onChange={handleChange}
        onSave={handleSave}
        onOpenPreviewCanvas={handleOpenPreviewCanvas}
      />
      {status ? <div className="standalone-panel-page__status">{status}</div> : null}
    </div>
  );
};

const StandaloneCardGamePreviewCanvas: React.FC<{ assetPath: string; assetData: AssetData }> = ({
  assetPath,
  assetData,
}) => {
  const loadedAsset = useMemo(
    () => buildLoadedLayoutAssetFromRaw(assetPath, assetData as Record<string, unknown>),
    [assetData, assetPath],
  );
  const [document, setDocument] = useState<LayoutAssetDocument>(() => loadedAsset.document);

  useEffect(() => {
    setDocument(loadedAsset.document);
  }, [loadedAsset]);

  useEffect(() => {
    const channel = new BroadcastChannel(CARD_GAME_LAYOUT_DRAFT_CHANNEL);
    const handler = (event: MessageEvent<{ assetPath?: string; document?: LayoutAssetDocument }>) => {
      if (event.data?.assetPath !== assetPath || !event.data.document) {
        return;
      }
      setDocument(event.data.document);
    };
    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
      channel.close();
    };
  }, [assetPath]);

  return (
    <div className="standalone-panel-page standalone-panel-page--card-game-preview">
      <CardGamePreviewSurface document={document} />
    </div>
  );
};

export const StandalonePanelPage: React.FC = () => {
  const [params, setParams] = useState<{ panel: StandalonePanel; assetPath: string; locked: boolean } | null>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const panel = search.get('standalone');
    const assetPath = search.get('assetPath');
    const locked = search.get('locked') === 'true';
    if (
      panel &&
      assetPath &&
      (panel === 'preview' || panel === 'inspector' || panel === 'design-studio' || panel === 'preview-canvas')
    ) {
      setParams({ panel, assetPath, locked });
    } else {
      setParams(null);
    }
  }, []);

  useEffect(() => {
    if (!params || params.locked) return;
    const channel = new BroadcastChannel(ASSET_SELECTION_CHANNEL);
    const handler = (event: MessageEvent<{ assetPath: string }>) => {
      const next = event.data?.assetPath;
      if (!next) return;
      setParams((current) => (current ? { ...current, assetPath: next } : current));
    };
    channel.addEventListener('message', handler);
    return () => channel.close();
  }, [params?.locked]);

  const { assetData, assetRawContent, isLoading, error } = useStandaloneAsset(params?.assetPath ?? null);

  if (!params) {
    return (
      <div className="standalone-panel-page standalone-panel-page--empty">
        <p>Missing standalone or assetPath. Open a panel from the main Asset Editor.</p>
      </div>
    );
  }

  if (params.panel === 'design-studio' || params.panel === 'preview-canvas') {
    if (!assetData && !isLoading && !error) {
      return (
        <div className="standalone-panel-page standalone-panel-page--empty">
          <p>Loading card game layout...</p>
        </div>
      );
    }
    if (assetData?.system?.assetType !== 'CardGameLayout') {
      return (
        <div className="standalone-panel-page standalone-panel-page--empty">
          <p>Open a CardGameLayout asset to use this mode.</p>
        </div>
      );
    }
    return params.panel === 'design-studio'
      ? <StandaloneCardGameDesignStudio assetPath={params.assetPath} assetData={assetData} />
      : <StandaloneCardGamePreviewCanvas assetPath={params.assetPath} assetData={assetData} />;
  }

  return (
    <div className="standalone-panel-page">
      <Suspense fallback={<div className="standalone-panel-page__loading">Loading…</div>}>
        {params.panel === 'preview' ? (
          <StandalonePreview assetPath={params.assetPath} />
        ) : (
          <StandaloneInspector assetPath={params.assetPath} />
        )}
      </Suspense>
      {assetRawContent && isLoading ? null : null}
    </div>
  );
};
