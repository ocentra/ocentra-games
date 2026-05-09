import React, { useState, useEffect } from 'react';
import type { InspectorComponent } from '@/lib/core/inspector/types';
import { DeckManager } from '@ocentra/game-asset-domain/deck/DeckManager';
import { getSerializableFields, type SerializableField } from '@ocentra/asset-domain/serialization/decorators';
import { InspectorGroup } from '@/lib/core/inspector/components/InspectorGroup';
import { Deck } from '@ocentra/game-asset-domain/card/deck/Deck';
import { BrandedLoadingSpinner } from '@ocentra/core-ui/Loading/BrandedLoadingSpinner';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { AssetTypeCategory } from '@ocentra/boundary-domain/types/asset-category';

import './DeckManagerInspector.css';

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const LOG_DECK_MANAGER_INSPECTOR = false;

const logInfo = (message: string, data?: unknown) => {
  if (LOG_DECK_MANAGER_INSPECTOR) {
    log.logInfo(message, getStackTrace(), data);
  }
};

const DECK_CREATE_FOLDER = 'Resources/GameMode/CardGames/Decks';

export const DeckManagerInspector: InspectorComponent<DeckManager | Record<string, unknown>> = ({
  data,
  onCreateAsset,
}) => {
  logInfo('[DeckManagerInspector] Component RENDER', {
    hasData: !!data,
    dataKeys: data && typeof data === 'object' ? Object.keys(data) : 'N/A',
  });

  const [fieldMetadata, setFieldMetadata] = useState<SerializableField[] | null>(null);

  const dataObj = data && typeof data === 'object' ? (data as Record<string, unknown>) : ({} as Record<string, unknown>);

  const assetData =
    'data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null
      ? (dataObj.data as Record<string, unknown>)
      : dataObj;

  useEffect(() => {
    const loadFieldMetadata = () => {
      try {
        logInfo('[DeckManagerInspector] loadFieldMetadata START');
        const fields = getSerializableFields(DeckManager);
        logInfo('[DeckManagerInspector] getSerializableFields returned', {
          fieldsType: typeof fields,
          isArray: Array.isArray(fields),
          length: Array.isArray(fields) ? fields.length : 'N/A',
        });
        setFieldMetadata(fields);
      } catch (error) {
        log.logError('[DeckManagerInspector] getSerializableFields threw error', getStackTrace(), error);
        setFieldMetadata(null);
      }
    };

    loadFieldMetadata();
  }, []);

  if (!fieldMetadata) {
    return (
      <div className="inspector-panel__loading" role="status" aria-label="Loading deck manager">
        <BrandedLoadingSpinner size="small" />
      </div>
    );
  }

  const dataObjData = assetData as Record<string, unknown>;
  const groups = new Map<
    string,
    Array<{
      key: string;
      label: string;
      value: unknown;
      fieldPath: string;
      component: React.ReactNode;
    }>
  >();

  const ungrouped: Array<{
    key: string;
    label: string;
    value: unknown;
    fieldPath: string;
    component: React.ReactNode;
  }> = [];

  for (const field of fieldMetadata) {
    if (field.key === 'deckEntries') {
      continue;
    }

    const value = dataObjData[field.key];
    if (value === undefined) continue;

    const fieldLabel =
      field.options.label || field.key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

    const component = (
      <div className="deck-manager-inspector__field">
        <div className="deck-manager-inspector__label">{fieldLabel}</div>
        <div className="deck-manager-inspector__value-readonly">{String(value ?? '')}</div>
      </div>
    );

    const groupName = field.options.group || 'General';
    if (groupName === 'General') {
      ungrouped.push({
        key: field.key,
        label: fieldLabel,
        value,
        fieldPath: field.key,
        component,
      });
    } else {
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName)!.push({
        key: field.key,
        label: fieldLabel,
        value,
        fieldPath: field.key,
        component,
      });
    }
  }

  const createDeckSection = {
    key: 'createDeck',
    label: 'New deck',
    value: null,
    fieldPath: 'createDeck',
    component: (
      <div className="deck-manager-inspector__create">
        <p className="deck-manager-inspector__create-hint">
          Opens the create dialog with type {Deck.assetType} under {DECK_CREATE_FOLDER}.
        </p>
        {onCreateAsset ? (
          <button
            type="button"
            className="deck-manager-inspector__create-button"
            onClick={() =>
              onCreateAsset(DECK_CREATE_FOLDER, {
                assetType: Deck.assetType,
                category: AssetTypeCategory.Game,
                defaultPath: DECK_CREATE_FOLDER,
              })
            }
          >
            Create deck asset
          </button>
        ) : (
          <span className="deck-manager-inspector__create-unavailable">Create asset is unavailable in this context.</span>
        )}
      </div>
    ),
  };

  return (
    <div className="deck-manager-inspector">
      <InspectorGroup title="Deck library" fields={[createDeckSection]} defaultExpanded={true} />

      {Array.from(groups.entries()).map(([groupName, fields]) => (
        <InspectorGroup key={groupName} title={groupName} fields={fields} defaultExpanded={true} />
      ))}

      {ungrouped.length > 0 && (
        <InspectorGroup title="General" fields={ungrouped} defaultExpanded={true} />
      )}
    </div>
  );
};
