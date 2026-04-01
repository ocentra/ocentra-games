export const INFERENCE_SETTINGS_SINGLETON_ID = 'ClaimInferenceSettings';

export interface InferenceSettings {
  temperature: number;
  max_length: number;
  max_new_tokens: number;
  min_length: number;
  min_new_tokens: number;
  top_k: number;
  top_p: number;
  typical_p: number;
  epsilon_cutoff: number;
  eta_cutoff: number;
  repetition_penalty: number;
  encoder_repetition_penalty: number;
  do_sample: boolean;
  num_beams: number;
  num_beam_groups: number;
  diversity_penalty: number;
  early_stopping: boolean;
  length_penalty: number;
  penalty_alpha: number;
  no_repeat_ngram_size: number;
  encoder_no_repeat_ngram_size: number;
  decoder_start_token_id: number | null;
  forced_bos_token_id: number | null;
  forced_eos_token_id: number | null;
  bad_words_ids: number[][] | null;
  force_words_ids: number[][] | null;
  suppress_tokens: number[] | null;
  begin_suppress_tokens: number[] | null;
  num_return_sequences: number;
  output_attentions: boolean;
  output_hidden_states: boolean;
  output_scores: boolean;
  return_dict_in_generate: boolean;
  use_cache: boolean;
  remove_invalid_values: boolean;
  renormalize_logits: boolean;
  guidance_scale: number;
  max_time: number | null;
  exponential_decay_length_penalty: [number, number] | null;
  constraints: Array<Record<string, unknown>> | null;
  forced_decoder_ids: Array<[number, number]> | null;
  system_prompt: string;
  json_mode: boolean;
  enabled?: {
    [key: string]: boolean;
  };
}

export const DEFAULT_INFERENCE_SETTINGS: InferenceSettings = {
  temperature: 0.7,
  max_length: 2048,
  max_new_tokens: 512,
  min_length: 0,
  min_new_tokens: 0,
  top_k: 50,
  top_p: 0.9,
  typical_p: 0.0,
  epsilon_cutoff: 0.0,
  eta_cutoff: 0.0,
  repetition_penalty: 1.0,
  encoder_repetition_penalty: 1.0,
  do_sample: true,
  num_beams: 1,
  num_beam_groups: 1,
  diversity_penalty: 0.0,
  early_stopping: false,
  length_penalty: 1.0,
  penalty_alpha: 0.0,
  no_repeat_ngram_size: 0,
  encoder_no_repeat_ngram_size: 0,
  decoder_start_token_id: null,
  forced_bos_token_id: null,
  forced_eos_token_id: null,
  bad_words_ids: null,
  force_words_ids: null,
  suppress_tokens: null,
  begin_suppress_tokens: null,
  num_return_sequences: 1,
  output_attentions: false,
  output_hidden_states: false,
  output_scores: false,
  return_dict_in_generate: true,
  use_cache: true,
  remove_invalid_values: false,
  renormalize_logits: false,
  guidance_scale: 1.0,
  max_time: null,
  exponential_decay_length_penalty: null,
  constraints: null,
  forced_decoder_ids: null,
  system_prompt: '',
  json_mode: false,
  enabled: {},
};
