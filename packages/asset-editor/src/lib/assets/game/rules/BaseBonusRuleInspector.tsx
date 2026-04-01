import { useState, useEffect } from 'react';
import type { InspectorComponent } from '@/lib/core/inspector/types';
import type { BaseBonusRule } from '@ocentra/game-asset-domain/game/rules/BaseBonusRule';
import type { CardRanking } from '@ocentra/game-asset-domain/card/cardRanking/CardRanking';
import type { CardGameMode } from '@ocentra/game-asset-domain/gameMode/cardGameMode/CardGameMode';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetAssetTypeInfoEvent } from '@ocentra/eventing-domain/events/assets/GetAssetTypeInfoEvent';
import { GetAllGameIdsEvent } from '@ocentra/eventing-domain/events/game/GetAllGameIdsEvent';
import { GetGameModeEvent } from '@ocentra/eventing-domain/events/game/GetGameModeEvent';
import type { AssetTypeInfo } from '@ocentra/game-asset-domain/constants/asset-type-info';
import type { GameMode } from '@ocentra/game-asset-domain/gameMode/core/GameMode';
import { Suit } from '@ocentra/game-domain/types/game';
import { Json5Preview } from '@/pages/PreviewPanel/Json5Preview';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import './BaseBonusRuleInspector.css';

const log = AssetEditorLogger.instance;

const logWarn = (message: string, data?: unknown) => {
  log.logWarn(message, getStackTrace(), data);
};

const logError = (message: string, data?: unknown) => {
  log.logError(message, getStackTrace(), data);
};

export const BaseBonusRuleInspector: InspectorComponent<BaseBonusRule | Record<string, unknown>> = ({ 
  data, 
  onFieldChange 
}) => {
  const dataObj = (data && typeof data === 'object')
    ? data as Record<string, unknown>
    : ({} as Record<string, unknown>);
  
  const assetData = ('data' in dataObj && typeof dataObj.data === 'object' && dataObj.data !== null)
    ? (dataObj.data as Record<string, unknown>)
    : dataObj;

  const minNumberOfCard = (assetData.minNumberOfCard || 3) as number;
  const bonusValue = (assetData.bonusValue || 0) as number;
  const patternType = (assetData.patternType || '') as string;
  const ruleName = (assetData.ruleName || '') as string;
  const priority = (assetData.priority || 0) as number;
  const description = (assetData.description || '') as string;
  const examples = (assetData.examples || { LLM: '', Player: '' }) as { LLM?: string; Player?: string };

  const [handSize, setHandSize] = useState<number>(3);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);
  const [exampleHandPreview, setExampleHandPreview] = useState<string[]>([]);
  const [cardRanking, setCardRanking] = useState<CardRanking | null>(null);
  const [gameMode, setGameMode] = useState<CardGameMode | null>(null);

  useEffect(() => {
    const loadGameMode = async () => {
      try {
        const getAllGameIdsDeferred = new OperationDeferred<string[]>();
        await EventBus.instance.publishAsync(new GetAllGameIdsEvent(getAllGameIdsDeferred));
        const gameIdsResult = await getAllGameIdsDeferred.promise;
        
        if (!gameIdsResult.isSuccess || !gameIdsResult.value || gameIdsResult.value.length === 0) {
          logWarn('No game IDs found for example hand generation');
          return;
        }
        
        const firstGameId = gameIdsResult.value[0];
        const getGameModeDeferred = new OperationDeferred<GameMode | null>();
        await EventBus.instance.publishAsync(new GetGameModeEvent(firstGameId, getGameModeDeferred));
        const gameModeResult = await getGameModeDeferred.promise;
        
        if (gameModeResult.isSuccess && gameModeResult.value) {
          const loadedGameMode = gameModeResult.value as unknown as CardGameMode;
          setGameMode(loadedGameMode);
          const ranking = await loadedGameMode.getCardRanking();
          if (ranking) {
            setCardRanking(ranking);
          }
        }
      } catch (error) {
        logWarn('Failed to load game mode for example hand generation:', error);
      }
    };
    loadGameMode();
  }, []);

  const handleFieldChange = (field: string, value: unknown) => {
    if (onFieldChange) {
      onFieldChange(field, value);
    }
  };

  const handleGenerateExampleHand = async () => {
    if (!cardRanking || isGenerating) return;

    setIsGenerating(true);
    try {
      const Constructor = assetData.constructor as typeof ScriptableObject & { assetType?: string };
      const assetType = Constructor.assetType ?? Constructor.name;
      if (!assetType) {
        logWarn('Cannot generate example hand: missing asset type');
        return;
      }

      const getTypeInfoDeferred = new OperationDeferred<AssetTypeInfo | null>();
      await EventBus.instance.publishAsync(new GetAssetTypeInfoEvent(assetType, getTypeInfoDeferred));
      const typeInfoResult = await getTypeInfoDeferred.promise;

      if (!typeInfoResult.isSuccess || !typeInfoResult.value?.constructor) {
        logWarn('Cannot generate example hand: constructor not found', { assetType });
        return;
      }

      const ruleInstance = new typeInfoResult.value.constructor() as BaseBonusRule;
      
      if (typeof ruleInstance.createExampleHand === 'function') {
        const hand = ruleInstance.createExampleHand(handSize, cardRanking, undefined, false);
        setExampleHandPreview(hand);
      }
    } catch (error) {
      logError('Failed to generate example hand:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAllExamples = async () => {
    if (!cardRanking || !gameMode || isGeneratingAll) return;

    setIsGeneratingAll(true);
    try {
      const Constructor = assetData.constructor as typeof ScriptableObject & { assetType?: string };
      const assetType = Constructor.assetType ?? Constructor.name;
      if (!assetType) {
        logWarn('Cannot generate examples: missing asset type');
        return;
      }

      const getTypeInfoDeferred = new OperationDeferred<AssetTypeInfo | null>();
      await EventBus.instance.publishAsync(new GetAssetTypeInfoEvent(assetType, getTypeInfoDeferred));
      const typeInfoResult = await getTypeInfoDeferred.promise;

      if (!typeInfoResult.isSuccess || !typeInfoResult.value?.constructor) {
        logWarn('Cannot generate examples: constructor not found', { assetType });
        return;
      }

      const ruleInstance = new typeInfoResult.value.constructor() as BaseBonusRule;
      
      if (typeof ruleInstance.createExampleHand !== 'function') {
        logWarn('Rule does not implement createExampleHand');
        return;
      }

      const numberOfCards = gameMode.maxNumberOfCards || gameMode.initialNumberOfCards || 3;
      const llmExamples: string[] = [];
      const playerExamples: string[] = [];
      const llmTrumpExamples: string[] = [];
      const playerTrumpExamples: string[] = [];

      for (let cardCount = minNumberOfCard; cardCount <= numberOfCards; cardCount++) {
        const exampleHand = ruleInstance.createExampleHand(cardCount, cardRanking, undefined, false);
        
        if (exampleHand.length > 0) {
          const exampleString = exampleHand.join(', ');
          llmExamples.push(exampleString);
          playerExamples.push(exampleString);

          if (gameMode.useTrump && cardRanking) {
            const trumpCardSymbol = cardRanking.getCardSymbol(Suit.HEARTS, 6, false);
            const trumpCard = cardRanking.getCardFromSymbol(trumpCardSymbol);
            if (trumpCard) {
              const trumpHand = ruleInstance.createExampleHand(cardCount, cardRanking, trumpCard, false);
              if (trumpHand.length > 0) {
                const trumpString = trumpHand.join(', ');
                llmTrumpExamples.push(trumpString);
                playerTrumpExamples.push(trumpString);
              }
            }
          }
        }
      }

      const formatExamples = (examples: string[], trumpExamples: string[], useTrump: boolean): string => {
        if (examples.length === 0) {
          return 'Rule Not Applicable to this GameMode';
        }
        let result = examples.join('\n');
        if (useTrump && trumpExamples.length > 0) {
          result += '\nTrump Examples:\n' + trumpExamples.join('\n') + '\n';
        }
        return result;
      };

      const llmDescription = `${ruleName || assetType} ${description || ''}\n${ruleName || assetType} Bonus: ${bonusValue}\nExamples:\n${formatExamples(llmExamples, llmTrumpExamples, gameMode.useTrump || false)}`;
      const playerDescription = `${ruleName || assetType} ${description || ''}\n${ruleName || assetType} Bonus: ${bonusValue}\nExamples:\n${formatExamples(playerExamples, playerTrumpExamples, gameMode.useTrump || false)}`;

      handleFieldChange('examples', {
        LLM: llmDescription,
        Player: playerDescription,
      });
    } catch (error) {
      logError('Failed to generate all examples:', error);
    } finally {
      setIsGeneratingAll(false);
    }
  };

  return (
    <div className="base-bonus-rule-inspector">
      <div className="base-bonus-rule-inspector__section">
        <div className="base-bonus-rule-inspector__section-header">Rule Properties</div>
        
        <div className="base-bonus-rule-inspector__field">
          <label htmlFor="rule-name" className="base-bonus-rule-inspector__label">Rule Name</label>
          <input
            id="rule-name"
            type="text"
            value={ruleName}
            onChange={(e) => handleFieldChange('ruleName', e.target.value)}
            className="base-bonus-rule-inspector__input"
            placeholder="Rule name"
          />
        </div>

        <div className="base-bonus-rule-inspector__field">
          <label htmlFor="pattern-type" className="base-bonus-rule-inspector__label">Pattern Type</label>
          <input
            id="pattern-type"
            type="text"
            value={patternType}
            onChange={(e) => handleFieldChange('patternType', e.target.value)}
            className="base-bonus-rule-inspector__input"
            placeholder="Pattern type"
          />
        </div>

        <div className="base-bonus-rule-inspector__field">
          <label htmlFor="description" className="base-bonus-rule-inspector__label">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            className="base-bonus-rule-inspector__textarea"
            rows={3}
            placeholder="Rule description"
          />
        </div>

        <div className="base-bonus-rule-inspector__field-row">
          <div className="base-bonus-rule-inspector__field">
            <label htmlFor="min-cards" className="base-bonus-rule-inspector__label">Minimum Cards</label>
            <input
              id="min-cards"
              type="number"
              value={minNumberOfCard}
              onChange={(e) => handleFieldChange('minNumberOfCard', Number(e.target.value) || 0)}
              className="base-bonus-rule-inspector__input"
              min={1}
            />
          </div>

          <div className="base-bonus-rule-inspector__field">
            <label htmlFor="bonus-value" className="base-bonus-rule-inspector__label">Bonus Value</label>
            <input
              id="bonus-value"
              type="number"
              value={bonusValue}
              onChange={(e) => handleFieldChange('bonusValue', Number(e.target.value) || 0)}
              className="base-bonus-rule-inspector__input"
              min={0}
            />
          </div>

          <div className="base-bonus-rule-inspector__field">
            <label htmlFor="priority" className="base-bonus-rule-inspector__label">Priority</label>
            <input
              id="priority"
              type="number"
              value={priority}
              onChange={(e) => handleFieldChange('priority', Number(e.target.value) || 0)}
              className="base-bonus-rule-inspector__input"
              min={0}
            />
          </div>
        </div>
      </div>

      <div className="base-bonus-rule-inspector__section">
        <div className="base-bonus-rule-inspector__section-header">Example Hand Generator</div>
        
        <div className="base-bonus-rule-inspector__field-row">
          <div className="base-bonus-rule-inspector__field">
            <label htmlFor="hand-size" className="base-bonus-rule-inspector__label">Hand Size</label>
            <input
              id="hand-size"
              type="number"
              value={handSize}
              onChange={(e) => setHandSize(Number(e.target.value) || 3)}
              className="base-bonus-rule-inspector__input"
              min={minNumberOfCard}
              max={gameMode?.maxNumberOfCards || 13}
            />
          </div>
          <button
            type="button"
            onClick={handleGenerateExampleHand}
            disabled={isGenerating || !cardRanking}
            className="base-bonus-rule-inspector__generate-button"
            title="Generate a single example hand for testing"
          >
            {isGenerating ? 'Generating...' : 'Generate Single Hand'}
          </button>
        </div>

        {exampleHandPreview.length > 0 && (
          <div className="base-bonus-rule-inspector__preview">
            <div className="base-bonus-rule-inspector__preview-label">Generated Hand:</div>
            <div className="base-bonus-rule-inspector__preview-hand">
              {exampleHandPreview.join(', ')}
            </div>
          </div>
        )}

        <div className="base-bonus-rule-inspector__field-row" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            onClick={handleGenerateAllExamples}
            disabled={isGeneratingAll || !cardRanking || !gameMode}
            className="base-bonus-rule-inspector__generate-all-button"
            title="Generate examples for all card counts (like Unity's Initialize)"
          >
            {isGeneratingAll ? 'Generating All...' : 'Generate All Examples'}
          </button>
        </div>
        {(!gameMode || !cardRanking) && (
          <p className="base-bonus-rule-inspector__warning" style={{ marginTop: '0.5rem', color: '#ff9800' }}>
            {!gameMode ? 'GameMode not loaded' : 'CardRanking not loaded'}
          </p>
        )}
      </div>

      {examples && (examples.LLM || examples.Player) && (
        <div className="base-bonus-rule-inspector__section">
          <div className="base-bonus-rule-inspector__section-header">Examples</div>
          
          {examples.LLM && (
            <div className="base-bonus-rule-inspector__field">
              <label htmlFor="llm-example" className="base-bonus-rule-inspector__label">LLM Example</label>
              <Json5Preview content={examples.LLM} />
              <textarea
                id="llm-example"
                value={examples.LLM}
                onChange={(e) => handleFieldChange('examples', { ...examples, LLM: e.target.value })}
                className="base-bonus-rule-inspector__textarea"
                rows={4}
                placeholder="LLM example"
              />
            </div>
          )}

          {examples.Player && (
            <div className="base-bonus-rule-inspector__field">
              <label htmlFor="player-example" className="base-bonus-rule-inspector__label">Player Example</label>
              <Json5Preview content={examples.Player} />
              <textarea
                id="player-example"
                value={examples.Player}
                onChange={(e) => handleFieldChange('examples', { ...examples, Player: e.target.value })}
                className="base-bonus-rule-inspector__textarea"
                rows={4}
                placeholder="Player example"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

