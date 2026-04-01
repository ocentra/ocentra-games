import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AIModelListFactory } from '@ocentra/game-asset-domain/factories/AIModelListAssetFactory';
import type { AIModelEntry } from '@ocentra/game-asset-domain/ai/aiModelList/AIModelList';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { AIModelListEditor } from './AIModelListEditor';
import './AIModelListEditorPage.css';

const log = MainAppLogger.instance;
log.register(import.meta.url);

export function AIModelListEditorPage() {
  const navigate = useNavigate();
  const [models, setModels] = useState<AIModelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetName, setAssetName] = useState<string>('default');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const factory = AIModelListFactory.getInstance();
        const asset = await factory.loadModelList('default');
        if (cancelled) return;

        if (!asset) {
          setError('Could not load AI model list');
          setModels([]);
          return;
        }

        setAssetName(asset.name || 'default');
        setModels(asset.models || []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load model list');
          log.logError('AIModelListEditorPage load failed', getStackTrace(), e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleModelsChange = async (updated: AIModelEntry[]) => {
    try {
      setSaving(true);
      setError(null);
      const factory = AIModelListFactory.getInstance();
      const asset = await factory.loadModelList('default');
      if (!asset) {
        setError('Could not load asset to save');
        return;
      }

      asset.models = updated;
      await asset.saveChanges();
      setModels(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
      log.logError('AIModelListEditorPage save failed', getStackTrace(), e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ai-model-list-editor-page">
        <div className="ai-model-list-editor-page__loading">Loading AI model list...</div>
      </div>
    );
  }

  if (error && models.length === 0) {
    return (
      <div className="ai-model-list-editor-page">
        <div className="ai-model-list-editor-page__header">
          <button
            type="button"
            className="ai-model-list-editor-page__back"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <h1>AI Model List Editor</h1>
        </div>
        <div className="ai-model-list-editor-page__error">{error}</div>
      </div>
    );
  }

  return (
    <div className="ai-model-list-editor-page">
      <div className="ai-model-list-editor-page__header">
        <button
          type="button"
          className="ai-model-list-editor-page__back"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        <h1>AI Model List Editor</h1>
        {saving && (
          <span className="ai-model-list-editor-page__saving">Saving...</span>
        )}
      </div>

      {error && (
        <div className="ai-model-list-editor-page__error">{error}</div>
      )}

      <div className="ai-model-list-editor-page__meta">
        Editing: <strong>{assetName}</strong>
      </div>

      <AIModelListEditor models={models} onModelsChange={handleModelsChange} />
    </div>
  );
}
