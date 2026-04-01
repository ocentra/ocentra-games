import type {
  InferenceRuntimeAdapter,
  LocalInferenceLoadConfig,
  ChatMessage,
  ProgressCallback,
  GetInferenceSettings
} from '@/types/browser-adapters';
import type { InferenceSettings } from '@/types/inference';
import { TextGenerationPipeline } from '@/pipelines/TextGenerationPipeline';
import { TextGenerationConfig } from '@/pipelines/PipelineConfigs';
import type { DtypeSimple } from '@/pipelines/PipelineTypes';
import { TextStreamer, InterruptableStoppingCriteria } from '@huggingface/transformers';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ModelGenerationUpdateEvent } from '@ocentra/eventing-domain/events/model/ModelGenerationUpdateEvent';
import { ModelGenerationCompleteEvent } from '@ocentra/eventing-domain/events/model/ModelGenerationCompleteEvent';

const SUPPORTED_DTYPES: DtypeSimple[] = [
  'fp32',
  'fp16',
  'q8',
  'q4',
  'q4f16',
  'int8',
  'uint8',
  'bnb4',
  'auto'
];

export interface TransformersJSRuntimeAdapterOptions {
  getInferenceSettings?: GetInferenceSettings;
}

export class TransformersJSRuntimeAdapter implements InferenceRuntimeAdapter {
  private pipeline: TextGenerationPipeline | null = null;
  private modelId: string | null = null;
  private quantPath: string | null = null;
  private stoppingCriteria: InterruptableStoppingCriteria | null = null;
  private shouldStop = false;
  private getInferenceSettings?: GetInferenceSettings;

  constructor(options?: TransformersJSRuntimeAdapterOptions) {
    this.getInferenceSettings = options?.getInferenceSettings;
  }

  async load(config: LocalInferenceLoadConfig, progress?: ProgressCallback): Promise<void> {
    this.modelId = config.modelId;
    this.quantPath = config.quantPath ?? null;

    if (config.getInferenceSettings) {
      this.getInferenceSettings = config.getInferenceSettings;
    }

    let dtype: DtypeSimple | undefined = config.dtype as DtypeSimple | undefined;
    if (this.quantPath && !dtype) {
      const match = this.quantPath.match(/model_([a-z0-9]+)\.onnx/i);
      const candidate = match?.[1];
      if (candidate && SUPPORTED_DTYPES.includes(candidate as DtypeSimple)) {
        dtype = candidate as DtypeSimple;
      }
    }

    const textConfig = await TextGenerationConfig.createWithAutoDetect(config.modelId, {
      dtype,
      useExternalData: config.useExternalData ?? false
    });

    this.pipeline = new TextGenerationPipeline();
    const progressCallback = progress
      ? (info: { status: string; progress?: number; message?: string }) => {
          progress({ status: info.status, progress: info.progress, message: info.message });
        }
      : undefined;
    await this.pipeline.load(textConfig, progressCallback);
  }

  async generate(
    messages: ChatMessage[],
    settings: InferenceSettings,
    stopSignal?: AbortSignal
  ): Promise<string> {
    if (!this.pipeline || !this.modelId) {
      throw new Error('TransformersJSRuntimeAdapter: not loaded. Call load() first.');
    }

    let s = { max_new_tokens: 512, temperature: 0.7, top_p: 0.9, top_k: 50, do_sample: true, repetition_penalty: 1 };
    let enabled: Record<string, boolean | undefined> = {};

    if (this.getInferenceSettings) {
      const stored = await this.getInferenceSettings(this.modelId, this.quantPath ?? '');
      if (stored) {
        s = {
          max_new_tokens: stored.max_new_tokens ?? 512,
          temperature: stored.temperature ?? 0.7,
          top_p: stored.top_p ?? 0.9,
          top_k: stored.top_k ?? 50,
          do_sample: stored.do_sample ?? true,
          repetition_penalty: stored.repetition_penalty ?? 1
        };
        enabled = (stored.enabled ?? {}) as Record<string, boolean | undefined>;
      }
    }

    this.shouldStop = false;
    this.stoppingCriteria = new InterruptableStoppingCriteria();
    this.stoppingCriteria.reset();

    const tokenizer = this.pipeline.getTokenizer();
    const model = this.pipeline.getModel();
    if (!tokenizer || !model) throw new Error('Pipeline components not loaded');

    const inputs = tokenizer.apply_chat_template(messages, {
      add_generation_prompt: true,
      return_dict: true
    });

    let fullText = '';
    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (output: string) => {
        if (this.shouldStop || stopSignal?.aborted) return;
        fullText += output;
        EventBus.instance.publish(
          new ModelGenerationUpdateEvent({ token: output, tps: undefined, numTokens: 0 })
        );
      }
    });

    const generateParams: Record<string, unknown> = {
      ...inputs,
      max_new_tokens: settings.max_new_tokens ?? s.max_new_tokens ?? 512,
      return_dict_in_generate: true,
      streamer,
      stopping_criteria: this.stoppingCriteria
    };
    if (enabled.do_sample !== false) generateParams.do_sample = settings.do_sample ?? s.do_sample ?? true;
    if (enabled.temperature) generateParams.temperature = settings.temperature ?? s.temperature ?? 0.7;
    if (enabled.top_p) generateParams.top_p = settings.top_p ?? s.top_p ?? 0.9;
    if (enabled.top_k) generateParams.top_k = settings.top_k ?? s.top_k ?? 50;
    if (enabled.repetition_penalty) generateParams.repetition_penalty = settings.repetition_penalty ?? s.repetition_penalty ?? 1;

    const result = await model.generate(generateParams);
    const response = fullText.trim();

    let finalDecoded = response;
    if (!finalDecoded && result && typeof result === 'object' && 'sequences' in result) {
      const decoded = tokenizer.batch_decode(result.sequences.slice(inputs.input_ids.data.length), {
        skip_special_tokens: true
      });
      finalDecoded = (Array.isArray(decoded) ? decoded[0] : decoded)?.trim() ?? '';
    }

    EventBus.instance.publish(
      new ModelGenerationCompleteEvent({
        text: finalDecoded,
        tps: undefined,
        numTokens: 0,
        ttft: undefined
      })
    );
    return finalDecoded;
  }

  stop(): void {
    this.shouldStop = true;
    if (this.stoppingCriteria) this.stoppingCriteria.interrupt();
  }

  isLoaded(): boolean {
    return this.pipeline !== null && this.pipeline.isLoaded();
  }

  reset(): void {
    if (this.pipeline) {
      this.pipeline.reset();
      this.pipeline = null;
    }
    this.modelId = null;
    this.quantPath = null;
    this.stoppingCriteria = null;
    this.shouldStop = false;
  }
}
