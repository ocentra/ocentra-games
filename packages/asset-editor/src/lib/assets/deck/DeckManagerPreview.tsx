import React, { useEffect, useState } from 'react';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { Deck } from '@ocentra/game-asset-domain/card/deck/Deck';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetAssetRegistryResourcesEvent } from '@ocentra/eventing-domain/events/assets/GetAssetRegistryResourcesEvent';
import { toAssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import type { AssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import { DeckType } from '@ocentra/game-asset-domain/deck/DeckType';

import './DeckManagerPreview.css';

export interface DeckManagerPreviewProps {
  assetId: string;
  onNavigateToAsset?: (identifier: AssetIdentifier) => void;
}

function resolveDeckTypeLabel(entry: AssetResourceEntry<Deck>): string {
  const found = Object.values(DeckType).find(type => type === entry.displayName);
  return found ?? DeckType.Custom;
}

export const DeckManagerPreview: React.FC<DeckManagerPreviewProps> = ({
  assetId,
  onNavigateToAsset,
}) => {
  const [entries, setEntries] = useState<AssetResourceEntry<Deck>[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const deferred = new OperationDeferred<ResourceEntry[]>();
        await EventBus.instance.publishAsync(new GetAssetRegistryResourcesEvent(deferred));
        const result = await deferred.promise;
        if (cancelled) {
          return;
        }
        if (result.isSuccess && result.value) {
          const decks = result.value.filter(
            (resource): resource is AssetResourceEntry<Deck> =>
              resource instanceof AssetResourceEntry && resource.assetType === Deck.assetType
          );
          setEntries(decks.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')));
          setLoadError(null);
        } else {
          setEntries([]);
          setLoadError('Could not load deck registry');
        }
      } catch {
        if (!cancelled) {
          setEntries([]);
          setLoadError('Could not load deck registry');
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <div className="deck-manager-preview deck-manager-preview--empty">
        <p className="deck-manager-preview__error">{loadError}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="deck-manager-preview deck-manager-preview--empty">
        <p className="deck-manager-preview__hint">No deck assets found in the registry.</p>
      </div>
    );
  }

  return (
    <div className="deck-manager-preview" data-testid="deck-manager-preview">
      <div className="deck-manager-preview__toolbar">
        <span className="deck-manager-preview__count">{entries.length} decks</span>
        <span className="deck-manager-preview__subtitle">{assetId}</span>
      </div>
      <div className="deck-manager-preview__matrix" role="list">
        {entries.map(entry => {
          const label = entry.displayName || entry.guid;
          const initials = label
            .split(/\s+/)
            .map(part => part[0])
            .join('')
            .slice(0, 3)
            .toUpperCase();
          const deckKind = resolveDeckTypeLabel(entry);
          const handleActivate = () => {
            if (onNavigateToAsset) {
              onNavigateToAsset(toAssetIdentifier(entry.guid));
            }
          };
          return (
            <button
              key={entry.guid}
              type="button"
              className="deck-manager-preview__tile"
              role="listitem"
              onClick={handleActivate}
            >
              <div className="deck-manager-preview__tile-face" aria-hidden>
                <span className="deck-manager-preview__tile-initials">{initials}</span>
              </div>
              <span className="deck-manager-preview__tile-title">{label}</span>
              <span className="deck-manager-preview__tile-meta">{deckKind}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
