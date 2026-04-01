import React, { Suspense, useEffect, useState, useCallback } from 'react'
import { PreviewPanel } from '@/pages/PreviewPanel/PreviewPanel'
import { InspectorPanel } from '@/pages/InspectorPanel/InspectorPanel'
import { loadAssetFromNetwork } from '@/pages/MainPage/loadAssetFromNetwork'
import { ASSET_SELECTION_CHANNEL } from '@/utils/createPanelWindow'
import type { AssetData } from '@/types/assets'
import './StandalonePanelPage.css'

function useStandaloneAsset(assetPath: string | null) {
  const [assetData, setAssetData] = useState<AssetData | null>(null)
  const [assetRawContent, setAssetRawContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!assetPath) {
      setAssetData(null)
      setAssetRawContent(null)
      setError(null)
      return
    }
    loadAssetFromNetwork(
      assetPath,
      setAssetData,
      () => {},
      setAssetRawContent,
      setError,
      setIsLoading
    )
  }, [assetPath])

  return { assetData, assetRawContent, isLoading, error }
}

const StandalonePreview: React.FC<{ assetPath: string }> = ({ assetPath }) => {
  const { assetData, assetRawContent, isLoading, error } = useStandaloneAsset(assetPath)
  const noop = useCallback(() => {}, [])

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
  )
}

function isInspectable(assetPath: string, assetData: AssetData | null): boolean {
  if (assetPath.startsWith('virtual:AssetCatalog')) return false
  const type = assetData?.system?.assetType
  if (type === 'AssetCatalog') return false
  return true
}

const StandaloneInspector: React.FC<{ assetPath: string }> = ({ assetPath }) => {
  const { assetData, isLoading, error } = useStandaloneAsset(assetPath)
  const noop = useCallback(() => {}, [])
  const handleAssetUpdate = useCallback((_data: AssetData) => {
    noop()
  }, [noop])

  if (!assetData && !isLoading && !error) return null
  if (!isInspectable(assetPath, assetData)) {
    return (
      <div className="standalone-inspector-placeholder">
        No inspector for this asset type.
      </div>
    )
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
  )
}

export const StandalonePanelPage: React.FC = () => {
  const [params, setParams] = useState<{ panel: string; assetPath: string; locked: boolean } | null>(null)

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const panel = search.get('standalone')
    const assetPath = search.get('assetPath')
    const locked = search.get('locked') === 'true'
    if (panel && assetPath && (panel === 'preview' || panel === 'inspector')) {
      setParams({ panel, assetPath, locked })
    } else {
      setParams(null)
    }
  }, [])

  useEffect(() => {
    if (!params || params.locked) return
    const channel = new BroadcastChannel(ASSET_SELECTION_CHANNEL)
    const handler = (e: MessageEvent<{ assetPath: string }>) => {
      const next = e.data?.assetPath
      if (!next) return
      setParams((p) => (p ? { ...p, assetPath: next } : p))
    }
    channel.addEventListener('message', handler)
    return () => channel.close()
  }, [params?.locked])

  if (!params) {
    return (
      <div className="standalone-panel-page standalone-panel-page--empty">
        <p>Missing standalone or assetPath. Open a panel from the main Asset Editor.</p>
      </div>
    )
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
    </div>
  )
}
