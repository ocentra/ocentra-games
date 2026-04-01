import React, { useEffect, useMemo, useState } from 'react';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetDiskGameModeEntriesEvent } from '@ocentra/eventing-domain/events/assets/GetDiskGameModeEntriesEvent';
import { toAssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import type { AssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import type { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { GameMode } from '@ocentra/game-asset-domain/gameMode/core/GameMode';
import './GameRegistryPreview.css';

interface GameRegistryPreviewProps {
  assetId: string;
  onNavigateToAsset?: (identifier: AssetIdentifier) => void;
}

function extractCategory(path: string): string {
  const match = path.match(/GameMode\/([^/]+)\//);
  return match ? match[1] : 'Other';
}

export const GameRegistryPreview: React.FC<GameRegistryPreviewProps> = ({
  assetId,
  onNavigateToAsset,
}) => {
  const [entries, setEntries] = useState<AssetResourceEntry<GameMode>[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const deferred = new OperationDeferred<AssetResourceEntry<GameMode>[]>();
        await EventBus.instance.publishAsync(new GetDiskGameModeEntriesEvent(deferred));
        const result = await deferred.promise;
        const list =
          result.isSuccess && Array.isArray(result.value)
            ? (result.value as AssetResourceEntry<GameMode>[])
            : [];
        setEntries(list);
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    map.set('all', entries.length);
    for (const e of entries) {
      const cat = extractCategory(e.path ?? '');
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (categoryFilter !== 'all') {
      result = result.filter((e) => extractCategory(e.path ?? '') === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((e) => {
        const name = (e.displayName ?? '').toLowerCase();
        const gameId = (e.gameId ?? '').toLowerCase();
        const path = (e.path ?? '').toLowerCase();
        return name.includes(q) || gameId.includes(q) || path.includes(q);
      });
    }
    return [...result].sort((a, b) =>
      (a.displayName ?? a.gameId ?? '').localeCompare(b.displayName ?? b.gameId ?? '')
    );
  }, [entries, categoryFilter, searchQuery]);

  const handleClick = (entry: AssetResourceEntry<GameMode>) => {
    const guid = entry.guid;
    if (guid && onNavigateToAsset) {
      onNavigateToAsset(toAssetIdentifier(guid));
    }
  };

  return (
    <div className="grp-list">
      <div className="grp-list__header">
        <h2 className="grp-list__title">{assetId}</h2>
        <p className="grp-list__subtitle">
          Internal view: GameMode + category. Use Asset Registry → Games for export layout.
        </p>
      </div>
      <div className="grp-list__bar">
        <input
          type="text"
          className="grp-list__search"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search games"
        />
        <div className="grp-list__categories">
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              type="button"
              className={`grp-list__cat ${categoryFilter === cat ? 'is-active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'all' ? 'All' : cat} ({count})
            </button>
          ))}
        </div>
      </div>
      <div className="grp-list__content">
        {loading ? (
          <div className="grp-list__empty">Loading…</div>
        ) : filteredEntries.length === 0 ? (
          <div className="grp-list__empty">
            {entries.length === 0
              ? 'No GameMode assets. Scan assets first.'
              : 'No games match search or filter.'}
          </div>
        ) : (
          <div className="grp-list__rows">
            {filteredEntries.map((entry) => (
              <div
                key={entry.guid ?? entry.gameId ?? entry.path}
                className="grp-list__row"
                role="button"
                tabIndex={0}
                onClick={() => handleClick(entry)}
                onKeyDown={(e) =>
                  (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), handleClick(entry))
                }
              >
                <span className="grp-list__type">{entry.assetType ?? 'CardGameMode'}</span>
                <span className="grp-list__category">{extractCategory(entry.path ?? '')}</span>
                <span className="grp-list__name">{entry.displayName ?? entry.gameId ?? '—'}</span>
                <span className="grp-list__path">{entry.path ?? ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
