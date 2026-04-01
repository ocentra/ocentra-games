/// <reference lib="dom" />
import {
  type PipelineType,
  type DtypeSimple,
  type Dtype,
  type Device,
  type DeviceSimple,
  type IBaseModelConfig,
  type ITextGenerationConfig,
  type ISpeechRecognitionConfig,
  type ITextToSpeechConfig
} from './PipelineTypes';
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
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const LOG_GENERAL = false;
const LOG_MODEL_LOADING = false;

export class DeviceCapabilities {
  private static _hasWebGPU: boolean | null = null;
  private static _hasFP16: boolean | null = null;
  private static _checkPromise: Promise<void> | null = null;

  static async initialize(): Promise<void> {
    if (this._checkPromise) {
      return this._checkPromise;
    }

    this._checkPromise = (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isNavigatorGpuAvailable = typeof navigator !== 'undefined' && !!(navigator as any).gpu;

        if (!isNavigatorGpuAvailable) {
          this._hasWebGPU = false;
          this._hasFP16 = false;
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (!adapter) {
          this._hasWebGPU = false;
          this._hasFP16 = false;
          return;
        }

        this._hasWebGPU = true;
        this._hasFP16 = adapter.features.has('shader-f16');

        if (LOG_GENERAL) {
          logInfo(`[DeviceCapabilities] WebGPU: ${this._hasWebGPU}, FP16: ${this._hasFP16}`, undefined, LOG_GENERAL);
        }
      } catch (error) {
        this._hasWebGPU = false;
        this._hasFP16 = false;
        if (LOG_GENERAL) {
          logError('[DeviceCapabilities] Detection failed:', error, LOG_GENERAL);
        }
      }
    })();

    return this._checkPromise;
  }

  static async hasWebGPU(): Promise<boolean> {
    await this.initialize();
    return this._hasWebGPU ?? false;
  }

  static async hasFP16(): Promise<boolean> {
    await this.initialize();
    return this._hasFP16 ?? false;
  }

  static async getBestDevice(): Promise<DeviceSimple> {
    const hasGPU = await this.hasWebGPU();
    return hasGPU ? 'webgpu' : 'cpu';
  }

  static async getRecommendedDtype(preferredDtype?: DtypeSimple): Promise<DtypeSimple> {
    if (preferredDtype) return preferredDtype;

    const hasFP16 = await this.hasFP16();
    return hasFP16 ? 'q4f16' : 'q4';
  }

  static async getOptimizedDtype(modelId: string, preferredDtype?: Dtype): Promise<Dtype> {
    if (LOG_MODEL_LOADING) {
      logInfo(
        `[getOptimizedDtype] Input: modelId: ${modelId} preferredDtype: ${JSON.stringify(preferredDtype)}`,
        undefined,
        LOG_MODEL_LOADING
      );
    }

    if (preferredDtype) {
      if (LOG_MODEL_LOADING) {
        logInfo(`[getOptimizedDtype] Using preferredDtype: ${JSON.stringify(preferredDtype)}`, undefined, LOG_MODEL_LOADING);
      }
      return preferredDtype;
    }

    const hasFP16Support = await this.hasFP16();
    const dtype = hasFP16Support ? 'q4f16' : 'q4';

    if (LOG_MODEL_LOADING) {
      logInfo(`[getOptimizedDtype] Auto-selected dtype: ${JSON.stringify(dtype)}`, undefined, LOG_MODEL_LOADING);
    }

    return dtype;
  }

  static async getOptimizedDevice(modelId: string, preferredDevice?: Device): Promise<Device> {
    if (LOG_MODEL_LOADING) {
      logInfo(
        `[getOptimizedDevice] Input: modelId: ${modelId} preferredDevice: ${JSON.stringify(preferredDevice)}`,
        undefined,
        LOG_MODEL_LOADING
      );
    }

    if (preferredDevice) {
      if (LOG_MODEL_LOADING) {
        logInfo(`[getOptimizedDevice] Using preferredDevice: ${JSON.stringify(preferredDevice)}`, undefined, LOG_MODEL_LOADING);
      }
      return preferredDevice;
    }

    const hasGPU = await this.hasWebGPU();
    const device = hasGPU ? 'webgpu' : 'cpu';

    if (LOG_MODEL_LOADING) {
      logInfo(`[getOptimizedDevice] Auto-selected device: ${JSON.stringify(device)}`, undefined, LOG_MODEL_LOADING);
    }

    return device;
  }

  static reset(): void {
    this._hasWebGPU = null;
    this._hasFP16 = null;
    this._checkPromise = null;
  }
}

export abstract class BaseModelConfig {
  modelId: string;
  pipelineType: PipelineType;

  constructor(config: IBaseModelConfig) {
    this.modelId = config.modelId;
    this.pipelineType = config.pipelineType;
    this.validate();
  }

  protected validate(): void {
    if (!this.modelId || this.modelId.trim().length === 0) {
      throw new Error('ModelConfig: modelId is required');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract equals(other: any): boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract clone(): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract toObject(): any;
}

export class TextGenerationConfig extends BaseModelConfig implements ITextGenerationConfig {
  dtype: Dtype;
  device: Device;
  useExternalData: boolean;
  override pipelineType = 'text-generation' as const;

  constructor(config: ITextGenerationConfig) {
    super(config);
    this.dtype = config.dtype;
    this.device = config.device;
    this.useExternalData = config.useExternalData;
  }

  static async createWithAutoDetect(
    modelId: string,
    options?: { dtype?: Dtype; device?: Device; useExternalData?: boolean }
  ): Promise<TextGenerationConfig> {
    if (LOG_MODEL_LOADING) {
      logInfo(
        `[TextGenerationConfig.createWithAutoDetect] Input: modelId: ${modelId} options: ${JSON.stringify(options)}`,
        undefined,
        LOG_MODEL_LOADING
      );
    }

    const device = await DeviceCapabilities.getOptimizedDevice(modelId, options?.device);
    const dtype = await DeviceCapabilities.getOptimizedDtype(modelId, options?.dtype);

    return new TextGenerationConfig({
      modelId,
      dtype,
      device,
      useExternalData: options?.useExternalData ?? false,
      pipelineType: 'text-generation'
    });
  }

  equals(other: TextGenerationConfig | null): boolean {
    if (other === null) return false;
    return (
      this.modelId === other.modelId &&
      JSON.stringify(this.dtype) === JSON.stringify(other.dtype) &&
      JSON.stringify(this.device) === JSON.stringify(other.device) &&
      this.useExternalData === other.useExternalData &&
      this.pipelineType === other.pipelineType
    );
  }

  clone(): TextGenerationConfig {
    return new TextGenerationConfig({
      modelId: this.modelId,
      dtype: this.dtype,
      device: this.device,
      useExternalData: this.useExternalData,
      pipelineType: this.pipelineType
    });
  }

  toObject(): ITextGenerationConfig {
    return {
      modelId: this.modelId,
      dtype: this.dtype,
      device: this.device,
      useExternalData: this.useExternalData,
      pipelineType: this.pipelineType
    };
  }
}

export class SpeechRecognitionConfig extends BaseModelConfig implements ISpeechRecognitionConfig {
  dtype: Dtype;
  device: Device;
  useExternalData: boolean;
  override pipelineType = 'automatic-speech-recognition' as const;
  audioOptions?: { language?: string; task?: 'transcribe' | 'translate'; maxNewTokens?: number };

  constructor(config: ISpeechRecognitionConfig) {
    super(config);
    this.dtype = config.dtype;
    this.device = config.device;
    this.useExternalData = config.useExternalData;
    this.audioOptions = config.audioOptions;
  }

  static async createWithAutoDetect(
    modelId: string,
    options?: {
      dtype?: Dtype;
      device?: Device;
      useExternalData?: boolean;
      audioOptions?: { language?: string; task?: 'transcribe' | 'translate'; maxNewTokens?: number };
    }
  ): Promise<SpeechRecognitionConfig> {
    const device = await DeviceCapabilities.getOptimizedDevice(modelId, options?.device);
    const dtype = await DeviceCapabilities.getOptimizedDtype(modelId, options?.dtype);

    return new SpeechRecognitionConfig({
      modelId,
      dtype,
      device,
      useExternalData: options?.useExternalData ?? false,
      pipelineType: 'automatic-speech-recognition',
      audioOptions: options?.audioOptions
    });
  }

  equals(other: SpeechRecognitionConfig | null): boolean {
    if (other === null) return false;
    return (
      this.modelId === other.modelId &&
      JSON.stringify(this.dtype) === JSON.stringify(other.dtype) &&
      JSON.stringify(this.device) === JSON.stringify(other.device) &&
      this.useExternalData === other.useExternalData &&
      this.pipelineType === other.pipelineType &&
      JSON.stringify(this.audioOptions) === JSON.stringify(other.audioOptions)
    );
  }

  clone(): SpeechRecognitionConfig {
    return new SpeechRecognitionConfig({
      modelId: this.modelId,
      dtype: this.dtype,
      device: this.device,
      useExternalData: this.useExternalData,
      pipelineType: this.pipelineType,
      audioOptions: this.audioOptions
    });
  }

  toObject(): ISpeechRecognitionConfig {
    return {
      modelId: this.modelId,
      dtype: this.dtype,
      device: this.device,
      useExternalData: this.useExternalData,
      pipelineType: this.pipelineType,
      audioOptions: this.audioOptions
    };
  }
}

export class TextToSpeechConfig extends BaseModelConfig implements ITextToSpeechConfig {
  dtype: Dtype;
  device: Device;
  useExternalData: boolean;
  override pipelineType = 'text-to-speech' as const;
  vocoderId?: string;
  speakerEmbeddingsUrl?: string;

  constructor(config: ITextToSpeechConfig) {
    super(config);
    this.dtype = config.dtype;
    this.device = config.device;
    this.useExternalData = config.useExternalData;
    this.vocoderId = config.vocoderId;
    this.speakerEmbeddingsUrl = config.speakerEmbeddingsUrl;
  }

  static async createWithAutoDetect(
    modelId: string,
    options?: {
      dtype?: Dtype;
      device?: Device;
      useExternalData?: boolean;
      vocoderId?: string;
      speakerEmbeddingsUrl?: string;
    }
  ): Promise<TextToSpeechConfig> {
    const device = await DeviceCapabilities.getOptimizedDevice(modelId, options?.device);
    const dtype = options?.dtype ?? (modelId.toLowerCase().includes('kokoro') ? 'fp32' : 'fp32');

    return new TextToSpeechConfig({
      modelId,
      dtype,
      device,
      useExternalData: options?.useExternalData ?? false,
      pipelineType: 'text-to-speech',
      vocoderId: options?.vocoderId,
      speakerEmbeddingsUrl: options?.speakerEmbeddingsUrl
    });
  }

  equals(other: TextToSpeechConfig | null): boolean {
    if (other === null) return false;
    return (
      this.modelId === other.modelId &&
      JSON.stringify(this.dtype) === JSON.stringify(other.dtype) &&
      JSON.stringify(this.device) === JSON.stringify(other.device) &&
      this.useExternalData === other.useExternalData &&
      this.pipelineType === other.pipelineType &&
      this.vocoderId === other.vocoderId &&
      this.speakerEmbeddingsUrl === other.speakerEmbeddingsUrl
    );
  }

  clone(): TextToSpeechConfig {
    return new TextToSpeechConfig({
      modelId: this.modelId,
      dtype: this.dtype,
      device: this.device,
      useExternalData: this.useExternalData,
      pipelineType: this.pipelineType,
      vocoderId: this.vocoderId,
      speakerEmbeddingsUrl: this.speakerEmbeddingsUrl
    });
  }

  toObject(): ITextToSpeechConfig {
    return {
      modelId: this.modelId,
      dtype: this.dtype,
      device: this.device,
      useExternalData: this.useExternalData,
      pipelineType: this.pipelineType,
      vocoderId: this.vocoderId,
      speakerEmbeddingsUrl: this.speakerEmbeddingsUrl
    };
  }
}
