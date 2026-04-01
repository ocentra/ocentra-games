/// <reference lib="dom" />
import { PipelineTypeEnum, type Dtype, type Device } from '@/pipelines/PipelineTypes';
import { BasePipeline } from '@/pipelines/BasePipeline';
import { BaseModelConfig } from '@/pipelines/PipelineConfigs';
import {
  TextGenerationConfig,
  SpeechRecognitionConfig,
  TextToSpeechConfig
} from '@/pipelines/PipelineConfigs';
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

const LOG_GENERAL = false;
const LOG_MODEL_LOADING = false;

type PipelineKind = 'text-generation' | 'automatic-speech-recognition' | 'text-to-speech';

function resolvePipelineKind(task?: string, modelId?: string): PipelineKind {
  const pipelineTask = task || PipelineTypeEnum.TEXT_GENERATION;
  if (modelId) {
    const lowerModelId = modelId.toLowerCase();
    if (lowerModelId.includes('whisper') || lowerModelId.includes('moonshine')) return 'automatic-speech-recognition';
    if (lowerModelId.includes('kokoro') || lowerModelId.includes('speecht5') || lowerModelId.includes('tts')) return 'text-to-speech';
  }
  switch (pipelineTask) {
    case PipelineTypeEnum.AUTOMATIC_SPEECH_RECOGNITION: return 'automatic-speech-recognition';
    case PipelineTypeEnum.TEXT_TO_SPEECH: return 'text-to-speech';
    default: return 'text-generation';
  }
}

export class PipelineFactory {
  static async createPipeline(task?: string, modelId?: string): Promise<BasePipeline> {
    const pipelineTask = task || PipelineTypeEnum.TEXT_GENERATION;
    const kind = resolvePipelineKind(task, modelId);

    if (LOG_GENERAL) {
      logInfo(`Creating pipeline for task: ${pipelineTask}, modelId: ${modelId || 'none'}`, undefined, LOG_GENERAL);
    }

    if (kind === 'automatic-speech-recognition') {
      const { WhisperPipeline } = await import('@/pipelines/WhisperPipeline');
      return new WhisperPipeline();
    }
    if (kind === 'text-to-speech') {
      const { TextToSpeechPipeline } = await import('@/pipelines/TextToSpeechPipeline');
      return new TextToSpeechPipeline();
    }
    const { TextGenerationPipeline } = await import('@/pipelines/TextGenerationPipeline');
    return new TextGenerationPipeline();
  }

  static async createPipelineWithConfig(
    task: string | undefined,
    modelId: string,
    options?: {
      dtype?: Dtype;
      device?: Device;
      useExternalData?: boolean;
    }
  ): Promise<{
    pipeline: BasePipeline;
    config: BaseModelConfig;
  }> {
    if (LOG_MODEL_LOADING) {
      logInfo(
        `[createPipelineWithConfig] Inputs: task: ${task} modelId: ${modelId} options: ${JSON.stringify(options)}`,
        undefined,
        LOG_MODEL_LOADING
      );
    }

    const kind = resolvePipelineKind(task, modelId);
    const [pipeline, config] = await Promise.all([
      this.createPipeline(task, modelId),
      kind === 'automatic-speech-recognition'
        ? SpeechRecognitionConfig.createWithAutoDetect(modelId, options)
        : kind === 'text-to-speech'
          ? TextToSpeechConfig.createWithAutoDetect(modelId, options)
          : TextGenerationConfig.createWithAutoDetect(modelId, options)
    ]);

    return { pipeline, config };
  }
}
