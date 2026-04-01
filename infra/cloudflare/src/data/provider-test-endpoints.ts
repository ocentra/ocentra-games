export interface ConnectionTestResult {
  success: boolean;
  latencyMs: number;
  error?: string;
  providerName?: string;
}

type TestFn = (apiKey: string) => Promise<ConnectionTestResult>;

const OPENAI_BASE = 'https://api.openai.com/v1';
const ANTHROPIC_BASE = 'https://api.anthropic.com/v1';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';
const TOGETHER_BASE = 'https://api.together.xyz/v1';
const FIREWORKS_BASE = 'https://api.fireworks.ai/inference/v1';
const PERPLEXITY_BASE = 'https://api.perplexity.ai';
const XAI_BASE = 'https://api.x.ai/v1';
const MISTRAL_BASE = 'https://api.mistral.ai/v1';
const COHERE_BASE = 'https://api.cohere.ai/v2';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

async function testOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  providerName: string
): Promise<ConnectionTestResult> {
  const start = performance.now();
  try {
    const res = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const latencyMs = Math.round(performance.now() - start);
    const body = await res.text().catch(() => '');
    return {
      success: res.ok,
      latencyMs,
      error: res.ok ? undefined : body || res.statusText,
      providerName,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: false,
      latencyMs,
      error: err instanceof Error ? err.message : 'Connection failed',
      providerName,
    };
  }
}

async function testAnthropic(apiKey: string): Promise<ConnectionTestResult> {
  const start = performance.now();
  try {
    const res = await fetch(`${ANTHROPIC_BASE}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });
    const latencyMs = Math.round(performance.now() - start);
    const body = await res.text().catch(() => '');
    return {
      success: res.ok,
      latencyMs,
      error: res.ok ? undefined : body || res.statusText,
      providerName: 'anthropic',
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: false,
      latencyMs,
      error: err instanceof Error ? err.message : 'Connection failed',
      providerName: 'anthropic',
    };
  }
}

async function testGemini(apiKey: string): Promise<ConnectionTestResult> {
  const start = performance.now();
  try {
    const url = `${GEMINI_BASE}/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 1 },
      }),
    });
    const latencyMs = Math.round(performance.now() - start);
    const body = await res.text().catch(() => '');
    return {
      success: res.ok,
      latencyMs,
      error: res.ok ? undefined : body || res.statusText,
      providerName: 'gemini',
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: false,
      latencyMs,
      error: err instanceof Error ? err.message : 'Connection failed',
      providerName: 'gemini',
    };
  }
}

async function testCohere(apiKey: string): Promise<ConnectionTestResult> {
  const start = performance.now();
  try {
    const res = await fetch(`${COHERE_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'command-r',
        message: 'ping',
        max_tokens: 1,
      }),
    });
    const latencyMs = Math.round(performance.now() - start);
    const body = await res.text().catch(() => '');
    return {
      success: res.ok,
      latencyMs,
      error: res.ok ? undefined : body || res.statusText,
      providerName: 'cohere',
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: false,
      latencyMs,
      error: err instanceof Error ? err.message : 'Connection failed',
      providerName: 'cohere',
    };
  }
}

const PROVIDER_TEST_MAP: Record<string, TestFn> = {
  openai: (key) => testOpenAICompatible(OPENAI_BASE, key, 'openai'),
  anthropic: testAnthropic,
  gemini: testGemini,
  groq: (key) => testOpenAICompatible(GROQ_BASE, key, 'groq'),
  deepseek: (key) => testOpenAICompatible(DEEPSEEK_BASE, key, 'deepseek'),
  together: (key) => testOpenAICompatible(TOGETHER_BASE, key, 'together'),
  fireworks: (key) => testOpenAICompatible(FIREWORKS_BASE, key, 'fireworks'),
  perplexity: (key) => testOpenAICompatible(PERPLEXITY_BASE, key, 'perplexity'),
  xai: (key) => testOpenAICompatible(XAI_BASE, key, 'xai'),
  mistral: (key) => testOpenAICompatible(MISTRAL_BASE, key, 'mistral'),
  cohere: testCohere,
  openrouter: (key) => testOpenAICompatible(OPENROUTER_BASE, key, 'openrouter'),
};

export function testProviderKey(
  providerId: string,
  apiKey: string
): Promise<ConnectionTestResult> {
  const testFn = PROVIDER_TEST_MAP[providerId.toLowerCase()];
  if (!testFn) {
    return Promise.resolve({
      success: false,
      latencyMs: 0,
      error: `Provider "${providerId}" key test not supported via worker`,
      providerName: providerId,
    });
  }
  return testFn(apiKey);
}
