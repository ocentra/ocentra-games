export const HUGGINGFACE_API_BASE = 'https://huggingface.co' as const;

export const HUGGINGFACE_MODELS_API = `${HUGGINGFACE_API_BASE}/api/models` as const;

export const DTYPE_PRIORITY: Record<string, number> = {
  q4f16: 1,
  q4: 2,
  int8: 3,
  uint8: 4,
  fp16: 5,
  fp32: 6,
  bnb4: 7,
  q8: 8,
  auto: 9,
};

export const SUPPORTING_FILE_REGEX = /\.(onnx(\.data)?|onnx_data|json|bin|pt|txt|model)$/i;
