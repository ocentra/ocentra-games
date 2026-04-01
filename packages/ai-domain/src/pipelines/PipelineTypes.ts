/// <reference lib="dom" />
import { LoadingStatusTypes } from './LoadingStatusTypes';

export interface PipelineProgressInfo {
  status: typeof LoadingStatusTypes[keyof typeof LoadingStatusTypes] | 'generating' | 'stopped' | 'complete';
  file?: string;
  progress?: number;
  loadId?: string;
  loaded?: number;
  total?: number;
  message?: string;
  error?: string;
  output?: string;
  generatedText?: string;
  tps?: string;
  numTokens?: number;
}

export type EnhancedProgressCallback = (info: PipelineProgressInfo) => void;

export type PipelineType =
  | 'text-generation'
  | 'text-classification'
  | 'token-classification'
  | 'question-answering'
  | 'fill-mask'
  | 'summarization'
  | 'translation'
  | 'text2text-generation'
  | 'feature-extraction'
  | 'image-classification'
  | 'zero-shot-classification'
  | 'automatic-speech-recognition'
  | 'image-to-text'
  | 'object-detection'
  | 'zero-shot-object-detection'
  | 'document-question-answering'
  | 'image-segmentation'
  | 'depth-estimation'
  | 'visual-language'
  | 'text-to-speech';

export const PipelineTypeEnum = {
  TEXT_GENERATION: 'text-generation',
  TEXT_CLASSIFICATION: 'text-classification',
  TOKEN_CLASSIFICATION: 'token-classification',
  QUESTION_ANSWERING: 'question-answering',
  FILL_MASK: 'fill-mask',
  SUMMARIZATION: 'summarization',
  TRANSLATION: 'translation',
  TEXT2TEXT_GENERATION: 'text2text-generation',
  FEATURE_EXTRACTION: 'feature-extraction',
  IMAGE_CLASSIFICATION: 'image-classification',
  ZERO_SHOT_CLASSIFICATION: 'zero-shot-classification',
  AUTOMATIC_SPEECH_RECOGNITION: 'automatic-speech-recognition',
  IMAGE_TO_TEXT: 'image-to-text',
  OBJECT_DETECTION: 'object-detection',
  ZERO_SHOT_OBJECT_DETECTION: 'zero-shot-object-detection',
  DOCUMENT_QUESTION_ANSWERING: 'document-question-answering',
  IMAGE_SEGMENTATION: 'image-segmentation',
  DEPTH_ESTIMATION: 'depth-estimation',
  VISUAL_LANGUAGE: 'visual-language',
  TEXT_TO_SPEECH: 'text-to-speech'
} as const;

export type DtypeSimple = 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16' | 'int8' | 'uint8' | 'bnb4' | 'auto';
export type DtypeComplex = Record<string, DtypeSimple>;
export type Dtype = DtypeSimple | DtypeComplex;

export type DeviceSimple = 'webgpu' | 'cpu' | 'wasm';
export type DeviceComplex = Record<string, DeviceSimple>;
export type Device = DeviceSimple | DeviceComplex;

export interface IBaseModelConfig {
  modelId: string;
  pipelineType: PipelineType;
}

export interface IComplexPipelineConfig extends IBaseModelConfig {
  dtype: Dtype;
  device: Device;
  useExternalData: boolean;
}

export interface ISimplePipelineConfig extends IBaseModelConfig {
  dtype: DtypeSimple;
}

export interface ITextGenerationConfig extends IComplexPipelineConfig {
  pipelineType: 'text-generation';
}

export interface ITranslationConfig extends ISimplePipelineConfig {
  pipelineType: 'translation';
}

export interface IMultimodalConfig extends IComplexPipelineConfig {
  pipelineType: 'image-to-text' | 'visual-language';
  imageOptions?: { doImageSplitting?: boolean };
}

export interface IFlorence2Config extends IComplexPipelineConfig {
  pipelineType: 'image-to-text';
  visionOptions?: { task?: string };
}

export interface IJanusConfig extends IComplexPipelineConfig {
  pipelineType: 'visual-language';
  multimodalOptions?: { maxNewTextTokens?: number; numImageTokens?: number };
}

export interface ISpeechRecognitionConfig extends IComplexPipelineConfig {
  pipelineType: 'automatic-speech-recognition';
  audioOptions?: { language?: string; task?: 'transcribe' | 'translate'; maxNewTokens?: number };
}

export interface IEmbeddingConfig extends ISimplePipelineConfig {
  pipelineType: 'feature-extraction';
}

export interface IZeroShotClassificationConfig extends ISimplePipelineConfig {
  pipelineType: 'zero-shot-classification';
}

export interface IClassificationConfig extends ISimplePipelineConfig {
  pipelineType: 'text-classification';
}

export interface ITextToSpeechConfig extends IComplexPipelineConfig {
  pipelineType: 'text-to-speech';
  vocoderId?: string;
  speakerEmbeddingsUrl?: string;
}

export interface ICodeCompletionConfig extends IComplexPipelineConfig {
  pipelineType: 'text-generation';
  codeOptions?: { language?: string; contextWindow?: number };
}

export interface ITokenizerConfig extends ISimplePipelineConfig {
  pipelineType: 'token-classification';
}

export type ModelConfig =
  | ITextGenerationConfig
  | IMultimodalConfig
  | IFlorence2Config
  | IJanusConfig
  | ISpeechRecognitionConfig
  | IEmbeddingConfig
  | ITranslationConfig
  | IZeroShotClassificationConfig
  | IClassificationConfig
  | ITextToSpeechConfig
  | ICodeCompletionConfig
  | ITokenizerConfig;
