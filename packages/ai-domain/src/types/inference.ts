export interface InferenceSettings {
  max_new_tokens: number;
  temperature: number;
  top_p: number;
  top_k: number;
  do_sample: boolean;
  repetition_penalty: number;
  typical_p?: number;
  epsilon_cutoff?: number;
  eta_cutoff?: number;
  min_length?: number;
  min_new_tokens?: number;
  no_repeat_ngram_size?: number;
  encoder_repetition_penalty?: number;
}

export interface EnabledSettings {
  do_sample?: boolean;
  temperature?: boolean;
  top_p?: boolean;
  top_k?: boolean;
  repetition_penalty?: boolean;
  typical_p?: boolean;
  epsilon_cutoff?: boolean;
  eta_cutoff?: boolean;
  min_length?: boolean;
  min_new_tokens?: boolean;
  no_repeat_ngram_size?: boolean;
  encoder_repetition_penalty?: boolean;
}

export interface InferenceConfig {
  settings: InferenceSettings;
  enabled: EnabledSettings;
}

export const DEFAULT_INFERENCE_SETTINGS: InferenceSettings = {
  max_new_tokens: 512,
  temperature: 0.7,
  top_p: 0.9,
  top_k: 50,
  do_sample: true,
  repetition_penalty: 1.0,
};
