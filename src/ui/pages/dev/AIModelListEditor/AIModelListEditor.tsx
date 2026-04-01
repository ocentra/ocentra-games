import { useState, useEffect } from 'react';
import {
  type AIModelEntry,
  type ModelQuantInfo,
} from '@ocentra/game-asset-domain/ai/aiModelList/AIModelList';
import { getHuggingFaceServiceInstance } from '@ocentra/ai-domain/services/HuggingFaceServiceInstance';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import './AIModelListEditor.css';

const log = MainAppLogger.instance;
const logError = (message: string, data?: unknown) => {
  log.logError(message, getStackTrace(), data);
};
log.register(import.meta.url);

interface AIModelListEditorProps {
  models: AIModelEntry[];
  onModelsChange: (models: AIModelEntry[]) => void;
}

export function AIModelListEditor({ models, onModelsChange }: AIModelListEditorProps) {
  const [localModels, setLocalModels] = useState<AIModelEntry[]>(models);
  const [newModelRepo, setNewModelRepo] = useState('');
  const [isFetchingQuants, setIsFetchingQuants] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedModelIndex, setExpandedModelIndex] = useState<number | null>(null);

  const hfService = getHuggingFaceServiceInstance();

  useEffect(() => {
    setLocalModels(models);
  }, [models]);

  const notifyChange = (updated: AIModelEntry[]) => {
    setLocalModels(updated);
    onModelsChange(updated);
  };

  const handleAddModel = async () => {
    if (!newModelRepo.trim()) return;

    setIsFetchingQuants(true);
    setFetchError(null);

    try {
      const quants = await hfService.getAvailableQuants(newModelRepo.trim());

      if (quants.length === 0) {
        setFetchError(`No .onnx files found in onnx/ folder for ${newModelRepo}`);
        setIsFetchingQuants(false);
        return;
      }

      const newModel: AIModelEntry = {
        modelId: newModelRepo.trim(),
        displayName: newModelRepo.split('/').pop() || newModelRepo.trim(),
        description: '',
        enabled: true,
        priority: localModels.length + 1,
        provider: 'local',
        tags: [],
        quants: quants.map((quant) => ({
          path: quant.path,
          dtype: quant.dtype,
          displayName: quant.dtype.toUpperCase(),
          enabled: true,
          priority: quant.dtype === 'q4f16' ? 1 : quant.dtype === 'q4' ? 2 : 3,
        })),
      };

      notifyChange([...localModels, newModel]);
      setNewModelRepo('');
      setFetchError(null);
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Failed to fetch quants');
      logError('Failed to add model:', error);
    } finally {
      setIsFetchingQuants(false);
    }
  };

  const handleDeleteModel = (index: number) => {
    if (!confirm(`Delete model "${localModels[index].displayName}"?`)) return;
    notifyChange(localModels.filter((_, i) => i !== index));
  };

  const handleModelFieldChange = (index: number, field: keyof AIModelEntry, value: unknown) => {
    const updated = [...localModels];
    updated[index] = { ...updated[index], [field]: value };
    notifyChange(updated);
  };

  const handleQuantFieldChange = (
    modelIndex: number,
    quantIndex: number,
    field: keyof ModelQuantInfo,
    value: unknown
  ) => {
    const updated = [...localModels];
    const model = { ...updated[modelIndex] };
    const quants = [...model.quants];
    quants[quantIndex] = { ...quants[quantIndex], [field]: value };
    model.quants = quants;
    updated[modelIndex] = model;
    notifyChange(updated);
  };

  const handleDeleteQuant = (modelIndex: number, quantIndex: number) => {
    const updated = [...localModels];
    const model = { ...updated[modelIndex] };
    model.quants = model.quants.filter((_, i) => i !== quantIndex);
    updated[modelIndex] = model;
    notifyChange(updated);
  };

  const handleRefreshQuants = async (modelIndex: number) => {
    const model = localModels[modelIndex];
    setIsFetchingQuants(true);
    setFetchError(null);

    try {
      const quants = await hfService.getAvailableQuants(model.modelId);

      if (quants.length === 0) {
        setFetchError(`No .onnx files found for ${model.modelId}`);
        setIsFetchingQuants(false);
        return;
      }

      const existingQuants = new Map(model.quants.map((q) => [q.path, q]));
      const mergedQuants: ModelQuantInfo[] = quants.map((quant) => {
        const existing = existingQuants.get(quant.path);
        return (
          existing || {
            path: quant.path,
            dtype: quant.dtype,
            displayName: quant.dtype.toUpperCase(),
            enabled: true,
            priority: quant.dtype === 'q4f16' ? 1 : quant.dtype === 'q4' ? 2 : 3,
          }
        );
      });

      handleModelFieldChange(modelIndex, 'quants', mergedQuants);
      setFetchError(null);
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : 'Failed to refresh quants');
      logError('Failed to refresh quants:', error);
    } finally {
      setIsFetchingQuants(false);
    }
  };

  return (
    <div className="ai-model-list-editor">
      <div className="ai-model-list-editor__add-section">
        <h3>Add New Model</h3>
        <div className="ai-model-list-editor__add-controls">
          <input
            type="text"
            value={newModelRepo}
            onChange={(e) => setNewModelRepo(e.target.value)}
            placeholder="HuggingFace repo ID (e.g., HuggingFaceTB/SmolLM3-3B-ONNX)"
            disabled={isFetchingQuants}
            onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
          />
          <button
            onClick={handleAddModel}
            disabled={!newModelRepo.trim() || isFetchingQuants}
            className="ai-model-list-editor__button ai-model-list-editor__button--add"
          >
            {isFetchingQuants ? 'Fetching...' : 'Add Model'}
          </button>
        </div>
        {fetchError && (
          <div className="ai-model-list-editor__error">{fetchError}</div>
        )}
      </div>

      <div className="ai-model-list-editor__models-section">
        <h3>Models ({localModels.length})</h3>
        {localModels.length === 0 ? (
          <div className="ai-model-list-editor__empty">No models added yet</div>
        ) : (
          <div className="ai-model-list-editor__models-list">
            {localModels.map((model, modelIndex) => (
              <div key={modelIndex} className="ai-model-list-editor__model-card">
                <div className="ai-model-list-editor__model-header">
                  <button
                    onClick={() =>
                      setExpandedModelIndex(
                        expandedModelIndex === modelIndex ? null : modelIndex
                      )
                    }
                    className="ai-model-list-editor__expand-button"
                  >
                    {expandedModelIndex === modelIndex ? '▼' : '▶'}
                  </button>
                  <input
                    type="text"
                    value={model.displayName}
                    onChange={(e) =>
                      handleModelFieldChange(modelIndex, 'displayName', e.target.value)
                    }
                    className="ai-model-list-editor__model-name"
                    placeholder="Display Name"
                  />
                  <button
                    onClick={() => handleDeleteModel(modelIndex)}
                    className="ai-model-list-editor__button ai-model-list-editor__button--delete"
                  >
                    Delete
                  </button>
                </div>

                {expandedModelIndex === modelIndex && (
                  <div className="ai-model-list-editor__model-details">
                    <div className="ai-model-list-editor__field">
                      <label htmlFor={`model-id-${modelIndex}`}>Model ID</label>
                      <input
                        id={`model-id-${modelIndex}`}
                        type="text"
                        value={model.modelId}
                        onChange={(e) =>
                          handleModelFieldChange(modelIndex, 'modelId', e.target.value)
                        }
                      />
                    </div>
                    <div className="ai-model-list-editor__field">
                      <label htmlFor={`model-desc-${modelIndex}`}>Description</label>
                      <textarea
                        id={`model-desc-${modelIndex}`}
                        value={model.description || ''}
                        onChange={(e) =>
                          handleModelFieldChange(modelIndex, 'description', e.target.value)
                        }
                        rows={2}
                      />
                    </div>
                    <div className="ai-model-list-editor__field-row">
                      <div className="ai-model-list-editor__field">
                        <label htmlFor={`model-priority-${modelIndex}`}>Priority</label>
                        <input
                          id={`model-priority-${modelIndex}`}
                          type="number"
                          value={model.priority ?? modelIndex + 1}
                          onChange={(e) =>
                            handleModelFieldChange(
                              modelIndex,
                              'priority',
                              parseInt(e.target.value, 10)
                            )
                          }
                        />
                      </div>
                      <div className="ai-model-list-editor__field">
                        <label>
                          <input
                            type="checkbox"
                            checked={model.enabled !== false}
                            onChange={(e) =>
                              handleModelFieldChange(modelIndex, 'enabled', e.target.checked)
                            }
                          />
                          Enabled
                        </label>
                      </div>
                    </div>

                    <div className="ai-model-list-editor__quants-section">
                      <div className="ai-model-list-editor__quants-header">
                        <h4>Quants ({model.quants.length})</h4>
                        <button
                          onClick={() => handleRefreshQuants(modelIndex)}
                          disabled={isFetchingQuants}
                          className="ai-model-list-editor__button ai-model-list-editor__button--refresh"
                        >
                          Refresh from HuggingFace
                        </button>
                      </div>

                      {model.quants.map((quant, quantIndex) => (
                        <div key={quantIndex} className="ai-model-list-editor__quant-item">
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span className="ai-model-list-editor__quant-path">
                              {quant.path}
                            </span>
                            <button
                              onClick={() => handleDeleteQuant(modelIndex, quantIndex)}
                              className="ai-model-list-editor__button ai-model-list-editor__button--delete-small"
                            >
                              ×
                            </button>
                          </div>
                          <div className="ai-model-list-editor__field-row">
                            <div className="ai-model-list-editor__field">
                              <label htmlFor={`dtype-${modelIndex}-${quantIndex}`}>Dtype</label>
                              <input
                                id={`dtype-${modelIndex}-${quantIndex}`}
                                type="text"
                                value={quant.dtype}
                                onChange={(e) =>
                                  handleQuantFieldChange(
                                    modelIndex,
                                    quantIndex,
                                    'dtype',
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="ai-model-list-editor__field">
                              <label htmlFor={`priority-${modelIndex}-${quantIndex}`}>Priority</label>
                              <input
                                id={`priority-${modelIndex}-${quantIndex}`}
                                type="number"
                                value={quant.priority ?? quantIndex + 1}
                                onChange={(e) =>
                                  handleQuantFieldChange(
                                    modelIndex,
                                    quantIndex,
                                    'priority',
                                    parseInt(e.target.value, 10)
                                  )
                                }
                              />
                            </div>
                            <div className="ai-model-list-editor__field">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={quant.enabled !== false}
                                  onChange={(e) =>
                                    handleQuantFieldChange(
                                      modelIndex,
                                      quantIndex,
                                      'enabled',
                                      e.target.checked
                                    )
                                  }
                                />
                                Enabled
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
