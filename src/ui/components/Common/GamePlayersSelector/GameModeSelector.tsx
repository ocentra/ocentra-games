import { useState, useEffect, useCallback } from 'react';
import { RequestModelListEvent } from '@ocentra/eventing-domain/events/model/RequestModelListEvent';
import { ModelAvailableEvent } from '@ocentra/eventing-domain/events/model/ModelAvailableEvent';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const LOG_UI = false;

const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_UI) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);
import './GameModeSelector.css';

interface GameModeSelectorProps {
  onPlaySinglePlayer?: (config: { aiCount: number; aiModel: string }) => void;
  onPlayMultiplayer?: (config: { humans: number; ai: number; aiModel: string }) => void;
}

interface AvailableModel {
  modelId: string;
  quants: Array<{
    path: string;
    dtype: string;
    status: 'available' | 'downloaded' | 'failed';
  }>;
}

export function GameModeSelector({ onPlaySinglePlayer, onPlayMultiplayer }: GameModeSelectorProps) {
  const [aiCount, setAiCount] = useState(3);
  const [aiModels, setAiModels] = useState<string[]>([]);
  const [multiplayerHumans, setMultiplayerHumans] = useState(2);
  const [multiplayerAI, setMultiplayerAI] = useState(2);
  const [multiplayerAiModels, setMultiplayerAiModels] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  const loadAvailableModels = useCallback(async () => {
    try {
      setIsLoadingModels(true)
      const event = new RequestModelListEvent()
      EventBus.instance.publish(event)
      const result = await event.deferred.promise

      if (result.isSuccess) {
        const models = result.value
        if (models && Array.isArray(models)) {
          const modelOptions: string[] = []
          models.forEach((model: AvailableModel) => {
            model.quants.forEach((quant) => {
              if (quant.status === 'downloaded' || quant.status === 'available') {
                const displayName = `${model.modelId} (${quant.dtype})`
                modelOptions.push(displayName)
              }
            })
          })
          setAvailableModels(models)
          if (modelOptions.length > 0) {
            setAiModels(prev => {
              if (prev.length === 0 || prev.every(m => !modelOptions.includes(m))) {
                return Array(aiCount).fill(modelOptions[0])
              }
              return prev
            })
            setMultiplayerAiModels(prev => {
              if (prev.length === 0 || prev.every(m => !modelOptions.includes(m))) {
                return Array(multiplayerAI).fill(modelOptions[0])
              }
              return prev
            })
          }
        }
      } else {
        logError('Failed to load models:', result.errorMessage, LOG_UI)
        const defaults = [
          'onnx-community/Phi-3.5-mini-instruct-onnx-web (q4f16)',
          'onnx-community/Phi-3.5-mini-instruct-onnx-web (q4)',
        ]
        setAiModels(Array(aiCount).fill(defaults[0]))
        setMultiplayerAiModels(Array(multiplayerAI).fill(defaults[0]))
      }
    } catch (error) {
      logError('Failed to load models:', error, LOG_UI)
      const defaults = [
        'onnx-community/Phi-3.5-mini-instruct-onnx-web (q4f16)',
        'onnx-community/Phi-3.5-mini-instruct-onnx-web (q4)',
      ]
      setAiModels(Array(aiCount).fill(defaults[0]))
      setMultiplayerAiModels(Array(multiplayerAI).fill(defaults[0]))
    } finally {
      setIsLoadingModels(false)
    }
  }, [aiCount, multiplayerAI])

  useEffect(() => {
    loadAvailableModels()

    const handleModelAvailable = () => {
      loadAvailableModels()
    }
    EventBus.instance.subscribe(ModelAvailableEvent, handleModelAvailable)

    return () => {
      EventBus.instance.unsubscribe(ModelAvailableEvent, handleModelAvailable)
    }
  }, [loadAvailableModels])

  const handleAiCountChange = (count: number) => {
    setAiCount(count);
    const currentModels = aiModels.length > 0 ? aiModels : availableModels.length > 0 
      ? [availableModels[0].modelId] 
      : ['onnx-community/Phi-3.5-mini-instruct-onnx-web (q4f16)'];
    setAiModels(Array(count).fill(0).map((_, i) => currentModels[i % currentModels.length]));
  };

  const handleAiModelChange = (index: number, model: string) => {
    const newModels = [...aiModels];
    newModels[index] = model;
    setAiModels(newModels);
  };

  const handleMultiplayerHumansChange = (count: number) => {
    setMultiplayerHumans(count);
    const aiCount = 4 - count;
    setMultiplayerAI(aiCount);
    const currentModels = multiplayerAiModels.length > 0 ? multiplayerAiModels : availableModels.length > 0 
      ? [availableModels[0].modelId] 
      : ['onnx-community/Phi-3.5-mini-instruct-onnx-web (q4f16)'];
    setMultiplayerAiModels(Array(aiCount).fill(0).map((_, i) => currentModels[i % currentModels.length]));
  };

  const handleMultiplayerAiModelChange = (index: number, model: string) => {
    const newModels = [...multiplayerAiModels];
    newModels[index] = model;
    setMultiplayerAiModels(newModels);
  };

  const handlePlaySinglePlayer = () => {
    const modelId = aiModels[0]?.split(' (')[0] || 'onnx-community/Phi-3.5-mini-instruct-onnx-web';
    onPlaySinglePlayer?.({ aiCount, aiModel: modelId });
  };

  const handlePlayMultiplayer = () => {
    const modelId = multiplayerAiModels[0]?.split(' (')[0] || 'onnx-community/Phi-3.5-mini-instruct-onnx-web';
    onPlayMultiplayer?.({ humans: multiplayerHumans, ai: multiplayerAI, aiModel: modelId });
  };

  const getModelOptions = (): string[] => {
    const options: string[] = [];
    availableModels.forEach((model) => {
      model.quants.forEach((quant) => {
        if (quant.status === 'downloaded' || quant.status === 'available') {
          options.push(`${model.modelId} (${quant.dtype})`);
        }
      });
    });
    
    if (options.length === 0) {
      options.push('onnx-community/Phi-3.5-mini-instruct-onnx-web (q4f16)');
      options.push('onnx-community/Phi-3.5-mini-instruct-onnx-web (q4)');
    }
    
    return options;
  };

  const modelOptions = getModelOptions();

  return (
    <div className="game-modes">
      <div className="mode-card">
        <div className="mode-header">
          <div className="mode-icon">🎮</div>
          <h3 className="mode-title">Single Player</h3>
        </div>
        
        <div className="mode-config">
          <div className="config-buttons">
            {[1, 2, 3].map(count => (
              <button
                key={count}
                className={`config-option ${aiCount === count ? 'active' : ''}`}
                onClick={() => handleAiCountChange(count)}
              >
                {count}
              </button>
            ))}
          </div>
          
          <div className="ai-models-grid">
            {aiModels.slice(0, aiCount).map((model, index) => (
              <select 
                key={index}
                className="config-select"
                value={model}
                onChange={(e) => handleAiModelChange(index, e.target.value)}
                aria-label={`Select AI ${index + 1} Model`}
                disabled={isLoadingModels}
              >
                {modelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>
        
        <button className="mode-button" onClick={handlePlaySinglePlayer} disabled={isLoadingModels}>
          {isLoadingModels ? 'Loading Models...' : `Player VS ${aiModels.slice(0, aiCount).map(m => m.split(' (')[0]).join(' | ')}`}
        </button>
      </div>

      <div className="mode-card">
        <div className="mode-header">
          <div className="mode-icon">👥</div>
          <h3 className="mode-title">Multiplayer</h3>
        </div>
        
        <div className="mode-config">
          <div className="config-buttons">
            {[2, 3, 4].map(count => (
              <button
                key={count}
                className={`config-option ${multiplayerHumans === count ? 'active' : ''}`}
                onClick={() => handleMultiplayerHumansChange(count)}
              >
                {count}
              </button>
            ))}
          </div>
          
          {multiplayerAI > 0 && (
            <div className="ai-models-grid">
              {multiplayerAiModels.slice(0, multiplayerAI).map((model, index) => (
                <select 
                  key={index}
                  className="config-select"
                  value={model}
                  onChange={(e) => handleMultiplayerAiModelChange(index, e.target.value)}
                  aria-label={`Select AI ${index + 1} Model for multiplayer`}
                  disabled={isLoadingModels}
                >
                  {modelOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          )}
        </div>
        
        <button className="mode-button" onClick={handlePlayMultiplayer} disabled={isLoadingModels}>
          {isLoadingModels 
            ? 'Loading Models...' 
            : `${multiplayerHumans} Player${multiplayerHumans > 1 ? 's' : ''} VS ${multiplayerAiModels.slice(0, multiplayerAI).map(m => m.split(' (')[0]).join(' | ')}`}
        </button>
      </div>
    </div>
  );
}

