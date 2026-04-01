import { CardGameMode } from '@ocentra/game-asset-domain/gameMode/cardGameMode/CardGameMode';
import type { InspectorComponent } from '@/lib/core/inspector/types';
import { AssetGuidReferenceField } from '@/lib/core/inspector/fields/AssetGuidReferenceField';
import { ImageField } from '@/lib/core/inspector/fields/ImageField';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';

import { Scoring } from '@ocentra/game-asset-domain/game/scoring/Scoring';
import { GameRules } from '@ocentra/game-asset-domain/game/gameRules/GameRules';
import { Strategy } from '@ocentra/game-asset-domain/game/strategy/Strategy';
import { GameInfo } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';
import { Layout } from '@ocentra/game-asset-domain/ui/layout/Layout';
import { GameModeStatus } from '@ocentra/game-asset-domain/constants/game-mode-status';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import './CardGameModeInspector.css';

export const CardGameModeInspector: InspectorComponent<CardGameMode | Record<string, unknown>> = ({
  data,
  onFieldChange,
  onNavigateToAsset
}) => {
  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);

  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;

  const handleFieldChange = (field: string, value: unknown) => {
    if (onFieldChange) {
      onFieldChange(field, value);
    }
  };

  const getValue = (field: string, defaultValue: unknown = ''): unknown => {
    const record = assetData as Record<string, unknown>;
    return record[field] ?? defaultValue;
  };

  const getGuidValue = (field: string): string => {
    const value = getValue(field);
    if (!value) return '';

    if (typeof value === 'string') {
      return value;
    }

    if (value instanceof AssetResourceEntry) {
      return value.guid || '';
    }

    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      if (obj.guid && typeof obj.guid === 'string') {
        return obj.guid;
      }
      if (obj.assetGuid && typeof obj.assetGuid === 'string') {
        return obj.assetGuid;
      }
    }

    return '';
  };

  return (
    <div className="card-game-mode-inspector">
      <div className="card-game-mode-inspector__section">
        <div className="card-game-mode-inspector__section-header">Betting</div>
        <div className="card-game-mode-inspector__field-row">
          <label htmlFor="card-game-mode-base-bet" className="card-game-mode-inspector__label">Base Bet</label>
          <input
            id="card-game-mode-base-bet"
            type="number"
            className="card-game-mode-inspector__input"
            value={getValue('baseBet', 5) as number}
            onChange={(e) => handleFieldChange('baseBet', Number(e.target.value))}
            min="0"
            step="1"
          />
        </div>
      </div>

      <div className="card-game-mode-inspector__section">
        <div className="card-game-mode-inspector__section-header">Card Settings</div>
        <div className="card-game-mode-inspector__field-row">
          <label htmlFor="card-game-mode-initial-cards" className="card-game-mode-inspector__label">Initial Number of Cards</label>
          <input
            id="card-game-mode-initial-cards"
            type="number"
            className="card-game-mode-inspector__input"
            value={getValue('initialNumberOfCards', 3) as number}
            onChange={(e) => handleFieldChange('initialNumberOfCards', Number(e.target.value))}
            min="1"
            step="1"
          />
        </div>
        <div className="card-game-mode-inspector__field-row">
          <label htmlFor="card-game-mode-max-cards" className="card-game-mode-inspector__label">Max Cards In Hand</label>
          <input
            id="card-game-mode-max-cards"
            type="number"
            className="card-game-mode-inspector__input"
            value={getValue('maxNumberOfCards', 13) as number}
            onChange={(e) => handleFieldChange('maxNumberOfCards', Number(e.target.value))}
            min="1"
            step="1"
          />
        </div>
        <div className="card-game-mode-inspector__field-row">
          <label htmlFor="card-game-mode-min-decks" className="card-game-mode-inspector__label">Min Decks</label>
          <input
            id="card-game-mode-min-decks"
            type="number"
            className="card-game-mode-inspector__input"
            value={getValue('minDecks', 1) as number}
            onChange={(e) => handleFieldChange('minDecks', Number(e.target.value))}
            min="1"
            step="1"
          />
        </div>
        <div className="card-game-mode-inspector__field-row">
          <label htmlFor="card-game-mode-max-decks" className="card-game-mode-inspector__label">Max Decks</label>
          <input
            id="card-game-mode-max-decks"
            type="number"
            className="card-game-mode-inspector__input"
            value={getValue('maxDecks', 1) as number}
            onChange={(e) => handleFieldChange('maxDecks', Number(e.target.value))}
            min="1"
            step="1"
          />
        </div>
      </div>

      <div className="card-game-mode-inspector__section">
        <div className="card-game-mode-inspector__section-header">Player Settings</div>
        <div className="card-game-mode-inspector__field-row">
          <label htmlFor="card-game-mode-min-players" className="card-game-mode-inspector__label">Min Players</label>
          <input
            id="card-game-mode-min-players"
            type="number"
            className="card-game-mode-inspector__input"
            value={getValue('minPlayers', 2) as number}
            onChange={(e) => handleFieldChange('minPlayers', Number(e.target.value))}
            min="1"
            step="1"
          />
        </div>
        <div className="card-game-mode-inspector__field-row">
          <label htmlFor="card-game-mode-max-players" className="card-game-mode-inspector__label">Max Players</label>
          <input
            id="card-game-mode-max-players"
            type="number"
            className="card-game-mode-inspector__input"
            value={getValue('maxPlayers', 4) as number}
            onChange={(e) => handleFieldChange('maxPlayers', Number(e.target.value))}
            min="1"
            step="1"
          />
        </div>
        <div className="card-game-mode-inspector__field-row">
          <label htmlFor="card-game-mode-min-human-players" className="card-game-mode-inspector__label">Min Human Players</label>
          <input
            id="card-game-mode-min-human-players"
            type="number"
            className="card-game-mode-inspector__input"
            value={getValue('minHumanPlayers', 1) as number}
            onChange={(e) => handleFieldChange('minHumanPlayers', Number(e.target.value))}
            min="0"
            step="1"
          />
        </div>
        <div className="card-game-mode-inspector__field-row">
          <label htmlFor="card-game-mode-max-human-players" className="card-game-mode-inspector__label">Max Human Players</label>
          <input
            id="card-game-mode-max-human-players"
            type="number"
            className="card-game-mode-inspector__input"
            value={getValue('maxHumanPlayers', 4) as number}
            onChange={(e) => handleFieldChange('maxHumanPlayers', Number(e.target.value))}
            min="0"
            step="1"
          />
        </div>
        <div className="card-game-mode-inspector__field-row">
          <label htmlFor="card-game-mode-supports-ai" className="card-game-mode-inspector__label">Supports AI</label>
          <input
            id="card-game-mode-supports-ai"
            type="checkbox"
            className="card-game-mode-inspector__checkbox"
            checked={getValue('supportsAI', true) as boolean}
            onChange={(e) => handleFieldChange('supportsAI', e.target.checked)}
          />
        </div>
        <div className="card-game-mode-inspector__field-row">
          <label htmlFor="card-game-mode-ai-counts-as-player" className="card-game-mode-inspector__label">AI Counts As Player</label>
          <input
            id="card-game-mode-ai-counts-as-player"
            type="checkbox"
            className="card-game-mode-inspector__checkbox"
            checked={getValue('aiCountsAsPlayer', true) as boolean}
            onChange={(e) => handleFieldChange('aiCountsAsPlayer', e.target.checked)}
          />
        </div>
      </div>

      <div className="card-game-mode-inspector__section">
        <div className="card-game-mode-inspector__section-header">Turn Settings</div>
        <div className="card-game-mode-inspector__field-row">
          <label htmlFor="card-game-mode-min-rounds" className="card-game-mode-inspector__label">Min Rounds</label>
          <input
            id="card-game-mode-min-rounds"
            type="number"
            className="card-game-mode-inspector__input"
            value={getValue('minRounds', 1) as number}
            onChange={(e) => handleFieldChange('minRounds', Number(e.target.value))}
            min="1"
            step="1"
          />
        </div>
        <div className="card-game-mode-inspector__field-row">
          <label htmlFor="card-game-mode-max-rounds" className="card-game-mode-inspector__label">Max Rounds</label>
          <input
            id="card-game-mode-max-rounds"
            type="number"
            className="card-game-mode-inspector__input"
            value={getValue('maxRounds', 10) as number}
            onChange={(e) => handleFieldChange('maxRounds', Number(e.target.value))}
            min="1"
            step="1"
          />
        </div>
        <div className="card-game-mode-inspector__field-row">
          <label htmlFor="card-game-mode-turn-duration" className="card-game-mode-inspector__label">Turn Duration (seconds)</label>
          <input
            id="card-game-mode-turn-duration"
            type="number"
            className="card-game-mode-inspector__input"
            value={getValue('turnDuration', 60) as number}
            onChange={(e) => handleFieldChange('turnDuration', Number(e.target.value))}
            min="1"
            step="1"
          />
        </div>
      </div>

      <div className="card-game-mode-inspector__section">
        <div className="card-game-mode-inspector__section-header">Status</div>
        <div className="card-game-mode-inspector__field-row">
          <label htmlFor="card-game-mode-release-status" className="card-game-mode-inspector__label">Release Status</label>
          <select
            id="card-game-mode-release-status"
            className="card-game-mode-inspector__select"
            value={getValue('releaseStatus', GameModeStatus.Available) as string}
            onChange={(e) => handleFieldChange('releaseStatus', e.target.value)}
          >
            {Object.values(GameModeStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card-game-mode-inspector__section">
        <div className="card-game-mode-inspector__section-header">Display</div>
        <div className="card-game-mode-inspector__field">
          <ImageField
            label="Banner Image"
            value={(getValue('bannerImage', '') || '') as ImageHash}
            onChange={(newValue) => handleFieldChange('bannerImage', newValue)}
            onNavigateToAsset={onNavigateToAsset}
          />
        </div>
        <div className="card-game-mode-inspector__field">
          <ImageField
            label="Game Icon"
            value={(getValue('gameIcon', '') || '') as ImageHash}
            onChange={(newValue) => handleFieldChange('gameIcon', newValue)}
            onNavigateToAsset={onNavigateToAsset}
          />
        </div>
      </div>

      <div className="card-game-mode-inspector__section">
        <div className="card-game-mode-inspector__section-header">Deck</div>
        <div className="card-game-mode-inspector__field">
          <AssetGuidReferenceField
            label="Deck Asset"
            value={getGuidValue('deckAsset')}
            onChange={(newGuid) => handleFieldChange('deckAsset', newGuid)}
            expectedAssetType="Deck"
            onNavigateToAsset={onNavigateToAsset}
          />
        </div>
      </div>

      <div className="card-game-mode-inspector__section">
        <div className="card-game-mode-inspector__section-header">Asset References</div>
        <div className="card-game-mode-inspector__field">
          <AssetGuidReferenceField
            label="Scoring Asset"
            value={getGuidValue('scoringAsset')}
            onChange={(newGuid) => handleFieldChange('scoringAsset', newGuid)}
            expectedAssetType={Scoring.name}
            onNavigateToAsset={onNavigateToAsset}
          />
        </div>
        <div className="card-game-mode-inspector__field">
          <AssetGuidReferenceField
            label="Game Rules Asset"
            value={getGuidValue('gameRulesAsset')}
            onChange={(newGuid) => handleFieldChange('gameRulesAsset', newGuid)}
            expectedAssetType={GameRules.name}
            onNavigateToAsset={onNavigateToAsset}
          />
        </div>
        <div className="card-game-mode-inspector__field">
          <AssetGuidReferenceField
            label="Strategy Asset"
            value={getGuidValue('strategyAsset')}
            onChange={(newGuid) => handleFieldChange('strategyAsset', newGuid)}
            expectedAssetType={Strategy.name}
            onNavigateToAsset={onNavigateToAsset}
          />
        </div>
        <div className="card-game-mode-inspector__field">
          <AssetGuidReferenceField
            label="Game Info Asset"
            value={getGuidValue('gameInfoAsset')}
            onChange={(newGuid) => handleFieldChange('gameInfoAsset', newGuid)}
            expectedAssetType={GameInfo.name}
            onNavigateToAsset={onNavigateToAsset}
          />
        </div>
        <div className="card-game-mode-inspector__field">
          <AssetGuidReferenceField
            label="Layout Asset"
            value={getGuidValue('layoutAsset')}
            onChange={(newGuid) => handleFieldChange('layoutAsset', newGuid)}
            expectedAssetType={Layout.name}
            onNavigateToAsset={onNavigateToAsset}
          />
        </div>
      </div>
    </div>
  );
};



