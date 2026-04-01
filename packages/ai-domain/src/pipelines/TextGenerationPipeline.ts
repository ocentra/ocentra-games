/// <reference lib="dom" />
import { AutoTokenizer, AutoModelForCausalLM } from '@huggingface/transformers';
import { LoadingStatusTypes } from './LoadingStatusTypes';
import { type EnhancedProgressCallback } from './PipelineTypes';
import { TextGenerationConfig } from './PipelineConfigs';
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
const LOG_MODEL_LOADING = false;

export class TextGenerationPipeline extends BasePipeline<TextGenerationConfig> {
  async load(
    config: TextGenerationConfig,
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
      file: config.dtype.toString(),
      progress: 0,
      loadId,
      message: 'Starting model load...'
    });

    if (!this.tokenizer) {
      progressCallback?.({
        status: LoadingStatusTypes.PROGRESS,
        file: 'tokenizer',
        progress: 10,
        loadId,
        message: 'Loading tokenizer from cache...'
      });

      this.tokenizer = await AutoTokenizer.from_pretrained(config.modelId, {
        progress_callback: this.wrapProgressCallback(progressCallback, loadId, 'tokenizer', [10, 40])
      });
    }

    if (!this.model) {
      progressCallback?.({
        status: LoadingStatusTypes.PROGRESS,
        file: 'model',
        progress: 30,
        loadId,
        message: 'Loading model from cache...'
      });

      if (LOG_MODEL_LOADING) {
        logInfo(
          `[load] Calling AutoModelForCausalLM.from_pretrained with: modelId: ${config.modelId} dtype: ${JSON.stringify(config.dtype)} device: ${JSON.stringify(config.device)} use_external_data_format: ${config.useExternalData}`,
          undefined,
          LOG_MODEL_LOADING
        );
      }

      this.model = await AutoModelForCausalLM.from_pretrained(config.modelId, {
        dtype: config.dtype,
        device: config.device,
        use_external_data_format: config.useExternalData,
        progress_callback: this.wrapProgressCallback(progressCallback, loadId, 'model', [40, 90])
      });

      if (LOG_MODEL_LOADING) {
        logInfo('[load] AutoModelForCausalLM.from_pretrained completed successfully', undefined, LOG_MODEL_LOADING);
      }
    }

    progressCallback?.({
      status: LoadingStatusTypes.PROGRESS,
      file: 'model',
      progress: 90,
      loadId,
      message: 'Initializing model...'
    });

    progressCallback?.({
      status: LoadingStatusTypes.DONE,
      file: 'model',
      progress: 100,
      loadId,
      message: 'Model ready for inference!'
    });
  }
}
