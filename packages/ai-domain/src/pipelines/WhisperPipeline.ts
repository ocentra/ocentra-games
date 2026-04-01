/// <reference lib="dom" />
import { LoadingStatusTypes } from './LoadingStatusTypes';
import { type EnhancedProgressCallback } from './PipelineTypes';
import { SpeechRecognitionConfig } from './PipelineConfigs';
import { BasePipeline } from './BasePipeline';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const LOG_CONFIG_CHANGE = false;
const LOG_LOADING = false;

export class WhisperPipeline extends BasePipeline<SpeechRecognitionConfig> {
  async load(
    config: SpeechRecognitionConfig,
    progressCallback?: EnhancedProgressCallback,
    loadId?: string
  ): Promise<void> {
    const needsReload = this.needsReload(config);

    if (needsReload) {
      if (this.currentConfig !== null) {
        if (LOG_CONFIG_CHANGE) {
          logInfo('Config changed, resetting pipeline', undefined, LOG_CONFIG_CHANGE);
        }
        this.reset();
      }

      this.currentConfig = config;

      if (LOG_LOADING) {
        logInfo('Loading model:', config.toObject(), LOG_LOADING);
      }
    }

    progressCallback?.({
      status: LoadingStatusTypes.INITIATE,
      file: JSON.stringify(config.dtype),
      progress: 0,
      loadId,
      message: 'Starting Whisper model load...'
    });

    if (!this.tokenizer) {
      progressCallback?.({
        status: LoadingStatusTypes.PROGRESS,
        file: 'tokenizer',
        progress: 10,
        loadId,
        message: 'Loading tokenizer...'
      });

      const { AutoTokenizer } = await import('@huggingface/transformers');
      this.tokenizer = await AutoTokenizer.from_pretrained(config.modelId, {
        progress_callback: this.wrapProgressCallback(progressCallback, loadId, 'tokenizer', [10, 30])
      });
    }

    if (!this.processor) {
      progressCallback?.({
        status: LoadingStatusTypes.PROGRESS,
        file: 'processor',
        progress: 30,
        loadId,
        message: 'Loading processor...'
      });

      const { AutoProcessor } = await import('@huggingface/transformers');
      this.processor = await AutoProcessor.from_pretrained(config.modelId, {
        progress_callback: this.wrapProgressCallback(progressCallback, loadId, 'processor', [30, 50])
      });
    }

    if (!this.model) {
      progressCallback?.({
        status: LoadingStatusTypes.PROGRESS,
        file: 'model',
        progress: 50,
        loadId,
        message: 'Loading Whisper model...'
      });

      const { WhisperForConditionalGeneration } = await import('@huggingface/transformers');
      this.model = await WhisperForConditionalGeneration.from_pretrained(config.modelId, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dtype: config.dtype as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        device: config.device as any,
        use_external_data_format: config.useExternalData,
        progress_callback: this.wrapProgressCallback(progressCallback, loadId, 'model', [50, 95])
      });
    }

    progressCallback?.({
      status: LoadingStatusTypes.DONE,
      file: 'model',
      progress: 100,
      loadId,
      message: 'Whisper model ready!'
    });
  }

  override isLoaded(): boolean {
    return this.tokenizer !== null && this.processor !== null && this.model !== null;
  }
}
