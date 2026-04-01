/// <reference lib="dom" />
import { LoadingStatusTypes } from './LoadingStatusTypes';
import { type EnhancedProgressCallback, type Dtype, type Device } from './PipelineTypes';
import { TextToSpeechConfig } from './PipelineConfigs';
import { BasePipeline } from './BasePipeline';
import { createKokoroTokenizer } from '@/services/KokoroTokenizer';
import type { KokoroTokenizer } from '@/services/KokoroTokenizer';
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
const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const LOG_CONFIG_CHANGE = false;
const LOG_LOADING = false;

type ModelLoadOptions = {
  dtype?: Dtype;
  device?: Device;
  use_external_data_format?: boolean;
  progress_callback?: (data: {
    status?: string;
    progress?: number;
    file?: string;
    loaded?: number;
    total?: number;
  }) => void;
};

export class TextToSpeechPipeline extends BasePipeline<TextToSpeechConfig> {
  private vocoder: unknown = null;
  private kokoroTokenizer: KokoroTokenizer | null = null;

  async load(
    config: TextToSpeechConfig,
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
      message: 'Starting text-to-speech model load...'
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

    if (!this.model) {
      progressCallback?.({
        status: LoadingStatusTypes.PROGRESS,
        file: 'model',
        progress: 30,
        loadId,
        message: 'Loading TTS model...'
      });

      const lowerModelId = config.modelId.toLowerCase();

      if (lowerModelId.includes('kokoro')) {
        if (!this.kokoroTokenizer) {
          this.kokoroTokenizer = createKokoroTokenizer({
            useBackend: false,
            backendUrl: undefined
          });

          if (this.tokenizer) {
            this.kokoroTokenizer.setTokenizer(this.tokenizer);
            if (LOG_LOADING) {
              logInfo('Using transformers.js tokenizer for Kokoro', undefined, LOG_LOADING);
            }
          } else {
            logWarn('No tokenizer loaded. This should not happen - Kokoro includes tokenizer files.');
          }
        }

        const { KokoroTTS } = await import('kokoro-js');

        const supportedKokoroDtypes: Array<'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16'> = ['fp32', 'fp16', 'q8', 'q4', 'q4f16'];
        let dtypeOption: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16' = 'fp32';
        if (
          typeof config.dtype === 'string' &&
          supportedKokoroDtypes.includes(config.dtype as 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16')
        ) {
          dtypeOption = config.dtype as 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';
        }

        progressCallback?.({
          status: LoadingStatusTypes.PROGRESS,
          file: 'model',
          progress: 60,
          loadId,
          message: 'Initializing Kokoro TTS…'
        });

        this.model = await KokoroTTS.from_pretrained(config.modelId, {
          dtype: dtypeOption
        });
      } else {
        const { SpeechT5ForTextToSpeech } = await import('@huggingface/transformers');
        const modelOptions = this.createModelOptions(config, progressCallback, loadId, [30, 70]);
        this.model = await SpeechT5ForTextToSpeech.from_pretrained(config.modelId, modelOptions);

        if (!this.vocoder) {
          progressCallback?.({
            status: LoadingStatusTypes.PROGRESS,
            file: 'vocoder',
            progress: 70,
            loadId,
            message: 'Loading vocoder...'
          });

          const vocoderId = config.vocoderId || 'Xenova/speecht5_hifigan';
          const { SpeechT5HifiGan } = await import('@huggingface/transformers');
          this.vocoder = await SpeechT5HifiGan.from_pretrained(vocoderId, {
            dtype: 'fp32',
            progress_callback: this.wrapProgressCallback(progressCallback, loadId, 'vocoder', [70, 95])
          });
        }
      }
    }

    progressCallback?.({
      status: LoadingStatusTypes.DONE,
      file: 'model',
      progress: 100,
      loadId,
      message: 'Text-to-speech model ready!'
    });
  }

  getVocoder(): unknown {
    return this.vocoder;
  }

  getKokoroTokenizer(): KokoroTokenizer | null {
    return this.kokoroTokenizer;
  }

  async tokenizeForKokoro(text: string): Promise<number[]> {
    if (!this.kokoroTokenizer) {
      throw new Error('Kokoro tokenizer not initialized. Load Kokoro model first.');
    }

    const result = await this.kokoroTokenizer.tokenize(text);
    return result.tokenIds;
  }

  override reset(): void {
    super.reset();
    this.vocoder = null;
    this.kokoroTokenizer = null;
  }

  private createModelOptions(
    config: TextToSpeechConfig,
    progressCallback: EnhancedProgressCallback | undefined,
    loadId: string | undefined,
    progressRange: [number, number]
  ): ModelLoadOptions {
    return {
      dtype: config.dtype,
      device: config.device,
      use_external_data_format: config.useExternalData,
      progress_callback: this.wrapProgressCallback(progressCallback, loadId, 'model', progressRange)
    };
  }

  override isLoaded(): boolean {
    const lowerModelId = this.currentConfig?.modelId.toLowerCase() || '';
    if (lowerModelId.includes('kokoro')) {
      return this.tokenizer !== null && this.model !== null;
    }
    return this.tokenizer !== null && this.model !== null && this.vocoder !== null;
  }
}
