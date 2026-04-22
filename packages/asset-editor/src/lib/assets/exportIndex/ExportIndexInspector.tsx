import React, { useMemo, useState, useEffect } from 'react';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetMetadataEvent } from '@ocentra/eventing-domain/events/assets/GetMetadataEvent';
import type { IResourceEntry } from '@ocentra/boundary-domain/types/resource-entry';
import type { InspectorComponent } from '@/lib/core/inspector/types';
import { toAssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import { InspectorGroup } from '@/lib/core/inspector/components/InspectorGroup';

import './ExportIndexInspector.css';

const LOG_EXPORT_INDEX = false;

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

type ExportIndexTab = 'homepage' | 'game-pages' | 'engine' | 'resources';

function extractGameIdFromPath(path: string): string | null {
  const match = path.match(/GameMode\/[^/]+\/([^/]+)\//);
  return match ? match[1] : null;
}

export const ExportIndexInspector: InspectorComponent<Record<string, unknown>> = ({
  data,
  onNavigateToAsset
}) => {
  const [activeTab, setActiveTab] = useState<ExportIndexTab>('resources');
  const [metadataCache, setMetadataCache] = useState<Map<string, Record<string, unknown>>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  const assetData = useMemo(() => {
    const dataObj = (data && typeof data === 'object')
      ? data as Record<string, unknown>
      : ({} as Record<string, unknown>);

    return ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
      ? (dataObj.data as Record<string, unknown>)
      : dataObj;
  }, [data]);


  const rawResources = useMemo(() => (Array.isArray(assetData.resources) ? assetData.resources : []), [assetData.resources]);

  const slices = useMemo(() => {
    const cardGameModes = rawResources.filter((item: unknown) => {
      if (typeof item !== 'object' || item === null) return false;
      const obj = item as Record<string, unknown>;
      const type = (obj.assetType as string) || (obj.resourceEntryType === 'AssetResourceEntry' ? 'AssetResourceEntry' : '');
      return type === 'CardGameMode';
    });

    const gamesByGameId = new Map<string, { displayName: string; guid: string; path: string }>();
    for (const item of cardGameModes) {
      const obj = item as Record<string, unknown>;
      const path = (obj.path as string) || '';
      const gameId = extractGameIdFromPath(path) || path.split('/').slice(-2)[0] || 'unknown';
      const displayName = (obj.displayName as string) || gameId;
      const guid = (obj.guid as string) || '';
      if (!gamesByGameId.has(gameId)) {
        gamesByGameId.set(gameId, { displayName, guid, path });
      }
    }

    const games = Array.from(gamesByGameId.entries()).map(([gameId, meta]) => ({ gameId, ...meta }));

    return {
      homepage: games,
      gamePages: games,
      engine: games,
      resources: rawResources,
    };
  }, [rawResources]);

  useEffect(() => {
    const loadMetadata = async () => {
      if (rawResources.length === 0) return;

      const guids = rawResources
        .map((item: unknown) => {
          if (typeof item !== 'object' || item === null) return null;
          const obj = item as Record<string, unknown>;
          if ('guid' in obj && typeof obj.guid === 'string') return obj.guid;
          if ('hash' in obj && typeof obj.hash === 'string') return obj.hash;
          if ('checksum' in obj && typeof obj.checksum === 'string') return obj.checksum;
          return null;
        })
        .filter((g): g is string => g !== null);

      const newCache = new Map<string, Record<string, unknown>>();

      await Promise.all(
        guids.map(async (guid) => {
          try {
            const getMetadataDeferred = new OperationDeferred<IResourceEntry | null>();
            await EventBus.instance.publishAsync(new GetMetadataEvent(guid, getMetadataDeferred));
            const result = await getMetadataDeferred.promise;

            if (result.isSuccess && result.value && typeof result.value === 'object') {
              const meta = result.value as unknown as Record<string, unknown>;
              newCache.set(guid, {
                path: meta.path ?? guid,
                type: meta.assetType ?? meta.fileType ?? (meta.hash ? 'Image' : 'File'),
              });
            }
          } catch (error) {
            if (LOG_EXPORT_INDEX) {
              log.logError('[ExportIndexInspector] Failed to load metadata', getStackTrace(), { guid, error });
            }
          }
        })
      );

      setMetadataCache(newCache);
    };

    void loadMetadata();
  }, [rawResources]);

  const getResourceIdentifier = (item: unknown): string | null => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      if ('guid' in obj && typeof obj.guid === 'string') return obj.guid;
      if ('hash' in obj && typeof obj.hash === 'string') return obj.hash;
      if ('checksum' in obj && typeof obj.checksum === 'string') return obj.checksum;
    }
    return null;
  };

  const getResourcePath = (item: unknown): string | undefined => {
    if (typeof item === 'object' && item !== null) {
      const obj = item as { path?: string };
      return obj.path && typeof obj.path === 'string' ? obj.path : undefined;
    }
    return undefined;
  };

  const getResourceType = (item: unknown): string | undefined => {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      if ('assetType' in obj && typeof obj.assetType === 'string') return obj.assetType;
      if ('type' in obj && typeof obj.type === 'string') return obj.type;
      if ('hash' in obj) return 'Image';
      if ('checksum' in obj && !('guid' in obj)) return 'File';
    }
    return undefined;
  };

  const getInheritanceChain = (item: unknown): string[] => {
    if (typeof item === 'object' && item !== null) {
      const obj = item as { inheritanceChain?: string[] };
      if (Array.isArray(obj.inheritanceChain)) return obj.inheritanceChain;
    }
    return [];
  };


  const GROUP_CATEGORIES = new Set(['BaseBonusRule', 'BaseRule', 'GameRule']);

  const filteredResources = rawResources.filter((item: unknown) => {
    const guid = getResourceIdentifier(item);
    if (!guid) return false;

    const type = getResourceType(item) || 'Unknown';
    const path = getResourcePath(item) || '';
    const inheritance = getInheritanceChain(item);

    if (filterType !== 'All') {
      const matchesType = type === filterType;
      const matchesInheritance = inheritance.includes(filterType);
      if (!matchesType && !matchesInheritance) return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesGuid = guid.toLowerCase().includes(term);
      const matchesPath = path.toLowerCase().includes(term);
      const matchesType = type.toLowerCase().includes(term);
      const matchesInheritance = inheritance.some((t: string) => t.toLowerCase().includes(term));
      return matchesGuid || matchesPath || matchesType || matchesInheritance;
    }

    return true;
  });

  const typesToShow = new Set<string>();
  rawResources.forEach((item: unknown) => {
    const concreteType = getResourceType(item);
    if (concreteType === 'Image' || concreteType === 'File') {
      typesToShow.add(concreteType);
      return;
    }
    const chain = getInheritanceChain(item);
    chain.forEach((t: string) => {
      if (GROUP_CATEGORIES.has(t)) typesToShow.add(t);
    });
    if (!Array.from(chain).some((t: string) => GROUP_CATEGORIES.has(t)) && concreteType) {
      typesToShow.add(concreteType);
    }
  });
  const availableTypes = Array.from(typesToShow).sort();

  const GuidItem: React.FC<{
    guid: string;
    index: number;
    metadata?: { path: string; type: string };
  }> = ({ guid, index, metadata }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const assetPath = metadata?.path || null;
    const assetType = metadata?.type || 'Unknown';
    const displayName = assetPath
      ? (assetPath.split('/').pop()?.replace(/\.(asset|meta)$/, '') || guid.substring(0, 8))
      : guid.substring(0, 8);
    const canNavigate = guid && onNavigateToAsset && assetType !== 'Unknown';

    const handleHeaderClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    };

    const handleTypeClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (canNavigate && guid && onNavigateToAsset) {
        onNavigateToAsset(toAssetIdentifier(guid));
      }
    };

    const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleHeaderClick(e as unknown as React.MouseEvent);
      }
    };

    const handleTypeKeyDown = (e: React.KeyboardEvent) => {
      if (canNavigate && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleTypeClick(e as unknown as React.MouseEvent);
      }
    };

    return (
      <div className={`export-index-inspector__guid-item ${isExpanded ? 'is-active' : ''}`}>
        <div
          className="export-index-inspector__guid-item-header"
          onClick={handleHeaderClick}
          onKeyDown={handleHeaderKeyDown}
          role="button"
          tabIndex={0}
        >
          <div className={`export-index-inspector__guid-item-indicator ${isExpanded ? 'is-expanded' : ''}`}>▶</div>
          <div className="export-index-inspector__guid-item-compact">
            <span className="export-index-inspector__guid-item-index">{(index + 1).toString().padStart(2, '0')}</span>
            <span
              className={`export-index-inspector__guid-item-type ${canNavigate ? 'export-index-inspector__guid-item-type--clickable' : ''}`}
              {...(canNavigate
                ? {
                    onClick: handleTypeClick,
                    onKeyDown: handleTypeKeyDown,
                    role: 'button',
                    tabIndex: 0,
                    title: 'Go to Asset',
                  }
                : {})}
            >
              {assetType}
            </span>
            <span className="export-index-inspector__guid-item-display-name">{displayName}</span>
          </div>
        </div>

        {isExpanded && (
          <div className="export-index-inspector__guid-item-content">
            <div className="export-index-inspector__guid-item-detail">
              <span className="export-index-inspector__guid-item-detail-label">GUID</span>
              <div className="export-index-inspector__guid-item-value-box">{guid}</div>
            </div>
            {assetPath && (
              <div className="export-index-inspector__guid-item-detail">
                <span className="export-index-inspector__guid-item-detail-label">Path</span>
                <div className="export-index-inspector__guid-item-value-box">{assetPath}</div>
              </div>
            )}
            <div className="export-index-inspector__guid-item-detail">
              <span className="export-index-inspector__guid-item-detail-label">Details</span>
              <div className="export-index-inspector__guid-item-value-box export-index-inspector__guid-item-value-box--flex">
                <span>Type: {assetType}</span>
                <span>Short: {guid.substring(0, 8)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const tabs: { id: ExportIndexTab; label: string; count: number }[] = [
    { id: 'homepage', label: 'Homepage', count: slices.homepage.length },
    { id: 'game-pages', label: 'Game Pages', count: slices.gamePages.length },
    { id: 'engine', label: 'Engine', count: slices.engine.length },
    { id: 'resources', label: 'Resources', count: slices.resources.length },
  ];

  if (rawResources.length === 0) {
    return (
      <div className="export-index-inspector">
        <InspectorGroup
          title="Export Index"
          fields={[{
            key: 'empty',
            label: 'Resources',
            value: [],
            fieldPath: 'resources',
            component: <div className="export-index-inspector__resources-info">No resources in index. Rebuild asset index or sync to populate.</div>,
          }]}
          defaultExpanded={true}
        />
      </div>
    );
  }

  const tabContent = (() => {
    if (activeTab === 'homepage') {
      return (
        <div className="export-index-inspector__tab-content">
          <div className="export-index-inspector__resources-info">
            What homepage will receive: index/home.json (featured, available, coming soon). Light data per game.
          </div>
          <div className="export-index-inspector__slice-list">
            {slices.homepage.length === 0 ? (
              <div className="export-index-inspector__no-results">No CardGameMode assets found.</div>
            ) : (
              slices.homepage.map((g) => (
                <div
                  key={g.gameId}
                  className="export-index-inspector__slice-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigateToAsset?.(toAssetIdentifier(g.guid))}
                  onKeyDown={(e) => e.key === 'Enter' && onNavigateToAsset?.(toAssetIdentifier(g.guid))}
                >
                  <span className="export-index-inspector__slice-item-type">GameHome</span>
                  <span className="export-index-inspector__slice-item-name">{g.displayName}</span>
                  <span className="export-index-inspector__slice-item-id">{g.gameId}</span>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'game-pages') {
      return (
        <div className="export-index-inspector__tab-content">
          <div className="export-index-inspector__resources-info">
            What selected-game page receives: games/&#123;gameId&#125;/page.json (GameInfo, carousel, description, history, strategy).
          </div>
          <div className="export-index-inspector__slice-list">
            {slices.gamePages.length === 0 ? (
              <div className="export-index-inspector__no-results">No CardGameMode assets found.</div>
            ) : (
              slices.gamePages.map((g) => (
                <div
                  key={g.gameId}
                  className="export-index-inspector__slice-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigateToAsset?.(toAssetIdentifier(g.guid))}
                  onKeyDown={(e) => e.key === 'Enter' && onNavigateToAsset?.(toAssetIdentifier(g.guid))}
                >
                  <span className="export-index-inspector__slice-item-type">GamePage</span>
                  <span className="export-index-inspector__slice-item-name">{g.displayName}</span>
                  <span className="export-index-inspector__slice-item-id">games/{g.gameId}/page.json</span>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'engine') {
      return (
        <div className="export-index-inspector__tab-content">
          <div className="export-index-inspector__resources-info">
            What game runtime receives: games/&#123;gameId&#125;/engine.json (rules, strategy, scoring, layout, deck).
          </div>
          <div className="export-index-inspector__slice-list">
            {slices.engine.length === 0 ? (
              <div className="export-index-inspector__no-results">No CardGameMode assets found.</div>
            ) : (
              slices.engine.map((g) => (
                <div
                  key={g.gameId}
                  className="export-index-inspector__slice-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigateToAsset?.(toAssetIdentifier(g.guid))}
                  onKeyDown={(e) => e.key === 'Enter' && onNavigateToAsset?.(toAssetIdentifier(g.guid))}
                >
                  <span className="export-index-inspector__slice-item-type">GameEngine</span>
                  <span className="export-index-inspector__slice-item-name">{g.displayName}</span>
                  <span className="export-index-inspector__slice-item-id">games/{g.gameId}/engine.json</span>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="export-index-inspector__tab-content">
        <div className="export-index-inspector__resources-info">
          Full resource index for sync. What will be exported to Cloudflare.
        </div>
        <div className="export-index-inspector__resources">
          <div className="export-index-inspector__toolbar">
                <input
                  type="text"
                  className="export-index-inspector__search-input"
                  placeholder="Search by GUID, Path, or Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="export-index-inspector__filter-select"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  aria-label="Filter by asset type"
                  title="Filter by asset type"
                >
                  <option value="All">All Types</option>
                  {availableTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
          <div className="export-index-inspector__resources-list">
            {filteredResources.length > 0 ? (
              filteredResources.map((item: unknown, index: number) => {
                const guid = getResourceIdentifier(item);
                if (!guid) return null;

                const path = getResourcePath(item);
                const type = getResourceType(item);
                let metadata: { path: string; type: string } | undefined;

                if (path && type) {
                  metadata = { path, type };
                } else {
                  const metaData = metadataCache.get(guid);
                  if (metaData) {
                    const resourceType = (metaData.type as string) || 'Unknown';
                    metadata = { path: (metaData.path as string) || path || guid, type: resourceType };
                  }
                }

                return <GuidItem key={`${guid}-${index}`} guid={guid} index={index} metadata={metadata} />;
              })
            ) : (
              <div className="export-index-inspector__no-results">No resources match your search/filter.</div>
            )}
          </div>
        </div>
      </div>
    );
  })();

  return (
    <div className="export-index-inspector">
      <div className="export-index-inspector__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`export-index-inspector__tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className="export-index-inspector__tab-count">({tab.count})</span>
          </button>
        ))}
      </div>
      <div className="export-index-inspector__body">{tabContent}</div>
    </div>
  );
};

export default ExportIndexInspector;

