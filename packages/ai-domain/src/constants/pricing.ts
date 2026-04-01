export const AI_PRICING: Record<string, { inputPer1k: number; outputPer1k: number }> = {
  // Anthropic
  'claude-sonnet-4-5': { inputPer1k: 0.3, outputPer1k: 1.5 },
  'claude-haiku-4-5': { inputPer1k: 0.08, outputPer1k: 0.4 },
  'claude-opus-4-6': { inputPer1k: 1.5, outputPer1k: 7.5 },
  // OpenAI
  'gpt-4o': { inputPer1k: 0.5, outputPer1k: 1.5 },
  'gpt-4o-mini': { inputPer1k: 0.015, outputPer1k: 0.06 },
  'o3-mini': { inputPer1k: 1.1, outputPer1k: 4.4 },
  // Google
  'gemini-2.0-flash': { inputPer1k: 0.01, outputPer1k: 0.04 },
  'gemini-1.5-pro': { inputPer1k: 0.35, outputPer1k: 1.05 },
  // Groq (fast inference, very cheap)
  'llama-3.3-70b': { inputPer1k: 0.059, outputPer1k: 0.079 },
  'mixtral-8x7b': { inputPer1k: 0.024, outputPer1k: 0.024 },
  // DeepSeek
  'deepseek-r1': { inputPer1k: 0.14, outputPer1k: 0.28 },
  'deepseek-chat': { inputPer1k: 0.014, outputPer1k: 0.028 },
  // Local / BYOK (zero platform cost — user pays their own API)
  'ollama': { inputPer1k: 0, outputPer1k: 0 },
  'local': { inputPer1k: 0, outputPer1k: 0 },
};

export function calculateAICost(
  modelVersion: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = AI_PRICING[modelVersion];
  if (!pricing) {
    throw new Error(`Unknown model for pricing: ${modelVersion}`);
  }
  return (inputTokens / 1000) * pricing.inputPer1k + (outputTokens / 1000) * pricing.outputPer1k;
}
