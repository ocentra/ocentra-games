import React, { useState, useEffect } from 'react';
import type { InspectorComponent } from '@/lib/core/inspector/types';
import { GameRegistry } from '@ocentra/game-asset-domain/gameRegistry/GameRegistry';
import { getSerializableFields, type SerializableField } from '@ocentra/asset-domain/serialization/decorators';
import { InspectorGroup } from '@/lib/core/inspector/components/InspectorGroup';
import { ConfirmationDialog } from '@/lib/core/inspector/components/ConfirmationDialog';
import { AssetGuidReferenceField } from '@/lib/core/inspector/fields/AssetGuidReferenceField';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { GameMode } from '@ocentra/game-asset-domain/gameMode/core/GameMode';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetGameModeEntriesEvent } from '@ocentra/eventing-domain/events/assets/GetGameModeEntriesEvent';
import { CreateDialogMode } from '@ocentra/asset-domain/constants/assets';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { toAssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import './GameRegistryInspector.css';

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const LOG_GAME_REGISTRY_INSPECTOR = false;

log.logInfo('[GameRegistryInspector] MODULE LOADED - file executed', getStackTrace(), undefined, LOG_GAME_REGISTRY_INSPECTOR);

const GuidItem: React.FC<{
  guid: string;
  index: number;
  entry: AssetResourceEntry<GameMode>;
  onNavigateToAsset?: (identifier: ReturnType<typeof toAssetIdentifier>) => void;
  setDeleteConfirmGuid?: (guid: string) => void;
  onDeleteGameMode?: (guid: string) => void;
}> = ({ guid, index, entry, onNavigateToAsset, setDeleteConfirmGuid, onDeleteGameMode }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const assetPath = entry.path || null;
  const assetType = entry.assetType || 'Unknown';
  const displayName = entry.displayName || entry.gameId || (assetPath ? assetPath.split('/').pop()?.replace(/\.(asset|meta)$/, '') : guid.substring(0, 8));
  const shortGuid = guid.substring(0, 8);
  const canNavigate = guid && onNavigateToAsset && (assetType !== 'Unknown');

    const handleHeaderClick = () => {
    log.logInfo('[GameRegistryInspector] Game item header clicked', getStackTrace(), { guid, displayName, isExpanded: !isExpanded });
    setIsExpanded(!isExpanded);
  };

  const handleTypeClick = () => {
    if (canNavigate && guid && onNavigateToAsset) {
      try {
        const identifier = toAssetIdentifier(guid);
        onNavigateToAsset(identifier);
      } catch (error) {
        log.logError('[GameRegistryInspector] Invalid asset identifier', getStackTrace(), { guid, error });
      }
    }
  };

  const handleDelete = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (setDeleteConfirmGuid && guid) {
      setDeleteConfirmGuid(guid);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleHeaderClick();
    }
  };

  return (
    <div className={`game-registry-inspector__guid-item ${isExpanded ? 'is-active' : ''}`}>
      <div className="game-registry-inspector__guid-item-header">
        <button
          className="game-registry-inspector__guid-item-toggle"
          onClick={handleHeaderClick}
          onKeyDown={handleKeyDown}
          type="button"
          {...(isExpanded ? { 'aria-expanded': 'true' } : { 'aria-expanded': 'false' })}
        >
          <div className={`game-registry-inspector__guid-item-indicator ${isExpanded ? 'is-expanded' : ''}`}>
            ▶
          </div>

          <div className="game-registry-inspector__guid-item-compact">
            <span className="game-registry-inspector__guid-item-index">{(index + 1).toString().padStart(2, '0')}</span>

            {!canNavigate && (
              <span className="game-registry-inspector__guid-item-type">
                {assetType}
              </span>
            )}

            <span className="game-registry-inspector__guid-item-name">
              {displayName}
            </span>
          </div>
        </button>

        {canNavigate && (
          <button
            className="game-registry-inspector__guid-item-type-button"
            onClick={handleTypeClick}
            title={`Navigate to asset with GUID: ${guid}`}
            type="button"
          >
            {assetType}
          </button>
        )}

        {onDeleteGameMode && (
          <button
            className="game-registry-inspector__guid-item-delete-button"
            onClick={handleDelete}
            title="Delete game mode"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="game-registry-inspector__guid-item-content">
          <div className="game-registry-inspector__guid-item-detail">
            <span className="game-registry-inspector__guid-item-detail-label">GUID</span>
            <div className="game-registry-inspector__guid-item-value-box">{guid}</div>
          </div>

          {assetPath && (
            <div className="game-registry-inspector__guid-item-detail">
              <span className="game-registry-inspector__guid-item-detail-label">Path</span>
              <div className="game-registry-inspector__guid-item-value-box game-registry-inspector__guid-item-value-box--small">{assetPath}</div>
            </div>
          )}

          <div className="game-registry-inspector__guid-item-details-grid">
            {entry.gameId && (
              <div className="game-registry-inspector__guid-item-detail">
                <span className="game-registry-inspector__guid-item-detail-label">Game ID</span>
                <div className="game-registry-inspector__guid-item-value-box">{entry.gameId}</div>
              </div>
            )}
            {shortGuid && (
              <div className="game-registry-inspector__guid-item-detail">
                <span className="game-registry-inspector__guid-item-detail-label">Short GUID</span>
                <div className="game-registry-inspector__guid-item-value-box">{shortGuid}</div>
              </div>
            )}
          </div>

          {canNavigate && guid && (
            <div className="game-registry-inspector__guid-item-actions">
              {/* Navigation is handled by clicking the Type badge in the header */}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const GameRegistryInspector: InspectorComponent<GameRegistry | Record<string, unknown>> = ({
  data,
  onNavigateToAsset,
  onCreateAsset,
  onDeleteGameMode
}) => {
  log.logInfo('[GameRegistryInspector] Component RENDER - component mounted/rendered', getStackTrace(), {
    hasData: !!data,
    dataKeys: data && typeof data === 'object' ? Object.keys(data) : 'N/A'
  }, LOG_GAME_REGISTRY_INSPECTOR);
  const [fieldMetadata, setFieldMetadata] = useState<SerializableField[] | null>(null);
  const [gameModeEntries, setGameModeEntries] = useState<AssetResourceEntry<GameMode>[]>([]);
  const [deleteConfirmGuid, setDeleteConfirmGuid] = useState<string | null>(null);
  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);

  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;

  useEffect(() => {
    const loadFieldMetadata = () => {
      try {
        log.logInfo('[GameRegistryInspector] loadFieldMetadata START - calling getSerializableFields(GameRegistry)', getStackTrace(), undefined, LOG_GAME_REGISTRY_INSPECTOR);
        const fields = getSerializableFields(GameRegistry);
        log.logInfo('[GameRegistryInspector] getSerializableFields returned', getStackTrace(), {
          fieldsType: typeof fields,
          isArray: Array.isArray(fields),
          length: Array.isArray(fields) ? fields.length : 'N/A',
          fields: fields
        }, LOG_GAME_REGISTRY_INSPECTOR);
        setFieldMetadata(fields);
        log.logInfo('[GameRegistryInspector] setFieldMetadata called', getStackTrace(), { fieldsLength: fields.length }, LOG_GAME_REGISTRY_INSPECTOR);
      } catch (error) {
        log.logError('[GameRegistryInspector] getSerializableFields threw error', getStackTrace(), error);
        setFieldMetadata(null);
      }
    };

    loadFieldMetadata();
  }, []);

  useEffect(() => {
    const loadGameModeEntries = async () => {
      try {
        log.logInfo('[GameRegistryInspector] loadGameModeEntries START', getStackTrace(), undefined, LOG_GAME_REGISTRY_INSPECTOR);
        const getGameModeEntriesDeferred = new OperationDeferred<AssetResourceEntry<GameMode>[]>();
        await EventBus.instance.publishAsync(new GetGameModeEntriesEvent(getGameModeEntriesDeferred));
        const result = await getGameModeEntriesDeferred.promise;
        log.logInfo('[GameRegistryInspector] GetGameModeEntriesEvent result received', getStackTrace(), {
          isSuccess: result.isSuccess,
          hasValue: !!result.value,
          valueLength: result.value?.length ?? 0,
          errorMessage: result.errorMessage
        }, LOG_GAME_REGISTRY_INSPECTOR);
        if (result.isSuccess && result.value) {
          setGameModeEntries(result.value);
          log.logInfo('[GameRegistryInspector] setGameModeEntries called with', getStackTrace(), { count: result.value.length }, LOG_GAME_REGISTRY_INSPECTOR);
        } else {
          setGameModeEntries([]);
          log.logWarn('[GameRegistryInspector] setGameModeEntries called with empty array (failed or no value)', getStackTrace());
        }
      } catch (error) {
        log.logError('[GameRegistryInspector] loadGameModeEntries error', getStackTrace(), error);
        setGameModeEntries([]);
      }
    };

    void loadGameModeEntries();
  }, []);

  const handleConfirmDelete = () => {
    if (onDeleteGameMode && deleteConfirmGuid) {
      onDeleteGameMode(deleteConfirmGuid);
      setDeleteConfirmGuid(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmGuid(null);
  };

  const handleAddGameMode = () => {
    if (onCreateAsset) {
      onCreateAsset(undefined, {
        mode: CreateDialogMode.FullGameSet,
        category: AssetTypeCategory.Game,
        defaultPath: 'GameMode',
      });
    }
  };


  log.logInfo('[GameRegistryInspector] Render - checking fieldMetadata gate', getStackTrace(), {
    fieldMetadataType: typeof fieldMetadata,
    fieldMetadataValue: fieldMetadata,
    isNull: fieldMetadata === null,
    isUndefined: fieldMetadata === undefined,
    isArray: Array.isArray(fieldMetadata),
    arrayLength: Array.isArray(fieldMetadata) ? fieldMetadata.length : 'N/A',
    truthy: !!fieldMetadata,
    gameModeEntriesLength: gameModeEntries.length
  }, LOG_GAME_REGISTRY_INSPECTOR);

  if (fieldMetadata) {
    log.logInfo('[GameRegistryInspector] fieldMetadata gate PASSED - rendering main content', getStackTrace(), undefined, LOG_GAME_REGISTRY_INSPECTOR);
    const dataObj = assetData as Record<string, unknown>;
    const groups = new Map<string, Array<{
      key: string;
      label: string;
      value: unknown;
      fieldPath: string;
      component: React.ReactNode;
    }>>();

    const ungrouped: Array<{
      key: string;
      label: string;
      value: unknown;
      fieldPath: string;
      component: React.ReactNode;
    }> = [];

    for (const field of fieldMetadata) {
      if (field.key === 'gameModeEntries') {
        continue;
      }

      const value = dataObj[field.key];
      if (value === undefined) continue;

      const fieldLabel = field.options.label || field.key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

      let component: React.ReactNode;

      {
        const formattedValue = String(value ?? '');
        component = (
          <div className="game-registry-inspector__field">
            <div className="game-registry-inspector__label">{fieldLabel}</div>
            <div className="game-registry-inspector__value-readonly">{formattedValue}</div>
          </div>
        );
      }

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

    // ComingSoon asset reference
    const comingSoonGuid = 'c7f3a5a6-7cb4-488a-90a1-f40ac383d2a9';
    const comingSoonField = {
      key: 'comingSoonAsset',
      label: 'Coming Soon Images',
      value: comingSoonGuid,
      fieldPath: 'comingSoonAsset',
      component: (
        <AssetGuidReferenceField
          label="Coming Soon Images"
          value={comingSoonGuid}
          onChange={() => { }}
          expectedAssetType="ComingSoon"
          onNavigateToAsset={onNavigateToAsset}
          readOnly={true}
        />
      )
    };

    // Games Section as a Field Component to utilize InspectorGroup appropriately
    const gamesSectionField = {
      key: 'gameModeEntries',
      label: `Games (${gameModeEntries.length})`,
      value: gameModeEntries,
      fieldPath: 'gameModeEntries',
      component: (
        <div className="game-registry-inspector__resources">
          {onCreateAsset && (
            <div className="game-registry-inspector__toolbar game-registry-inspector__toolbar--right">
              <button
                className="game-registry-inspector__add-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddGameMode();
                }}
                title="Add Game"
              >
                + Add Game
              </button>
            </div>
          )}

          <div className="game-registry-inspector__resources-info">
            Click row to expand • Click Type to navigate
          </div>

          <div className="game-registry-inspector__resources-list">
            {gameModeEntries.length > 0 ? (
              gameModeEntries.map((entry, index) => {
                const guid = entry.guid || '';
                log.logInfo('[GameRegistryInspector] Mapping gameModeEntry', getStackTrace(), { index, guid, hasGuid: !!guid, entry }, LOG_GAME_REGISTRY_INSPECTOR);
                if (!guid) {
                  log.logWarn('[GameRegistryInspector] Entry has no GUID, skipping', getStackTrace(), { index, entry });
                  return null;
                }
                return (
                  <GuidItem
                    key={`${guid}-${index}`}
                    guid={guid}
                    index={index}
                    entry={entry}
                    onNavigateToAsset={onNavigateToAsset}
                    setDeleteConfirmGuid={setDeleteConfirmGuid}
                    onDeleteGameMode={onDeleteGameMode}
                  />
                );
              })
            ) : (
              <div className="game-registry-inspector__no-results">
                No games found in registry.
              </div>
            )}
          </div>
        </div>
      )
    };

    return (
      <>
        <div className="game-registry-inspector">
          {/* Render Games Section First via InspectorGroup */}
          <InspectorGroup
            title={`Games (${gameModeEntries.length} items)`}
            fields={[gamesSectionField]}
            defaultExpanded={true}
          />

          {/* ComingSoon Images Asset */}
          <InspectorGroup
            title="Display"
            fields={[comingSoonField]}
            defaultExpanded={true}
          />

          {Array.from(groups.entries()).map(([groupName, fields]) => (
            <InspectorGroup
              key={groupName}
              title={groupName}
              fields={fields}
              defaultExpanded={true}
            />
          ))}
          {ungrouped.length > 0 && (
            <InspectorGroup
              title="General"
              fields={ungrouped}
              defaultExpanded={true}
            />
          )}
        </div>
        <ConfirmationDialog
          isOpen={deleteConfirmGuid !== null}
          title="Delete Game Mode"
          message="Are you sure you want to remove this game mode from the registry? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      </>
    );
  }

  log.logInfo('[GameRegistryInspector] Render - fieldMetadata gate FAILED - rendering loading fallback', getStackTrace(), {
    fieldMetadataType: typeof fieldMetadata,
    fieldMetadataValue: fieldMetadata
  }, LOG_GAME_REGISTRY_INSPECTOR);

  return (
    <div className="game-registry-inspector">
      <div className="game-registry-inspector__no-results">
        Loading Registry...
      </div>
    </div>
  );
};
