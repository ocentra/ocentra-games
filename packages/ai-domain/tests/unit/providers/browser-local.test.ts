import { describe, it, expect } from 'vitest';
import { BrowserLocalProvider } from '@/providers/browser-local';
import { ProviderType } from '@/types/provider';
import { createBrowserLocalSubstitutes } from '../../helpers/browser-local-substitutes';

describe('BrowserLocalProvider', () => {
  it('initialize: requires model (modelId)', async () => {
    const { adapters } = createBrowserLocalSubstitutes();
    const provider = new BrowserLocalProvider(adapters);
    await expect(
      provider.initialize({ providerId: ProviderType.LocalTransformers })
    ).rejects.toThrow('model (modelId) is required');
  });

  it('initialize: loads inference adapter with modelId', async () => {
    const { adapters, inference } = createBrowserLocalSubstitutes();
    const provider = new BrowserLocalProvider(adapters);
    await provider.initialize({
      providerId: ProviderType.LocalTransformers,
      model: 'test-model',
    });
    expect(inference.isLoaded()).toBe(true);
  });

  it('generate: returns text from inference adapter', async () => {
    const { adapters, inference } = createBrowserLocalSubstitutes();
    inference.primeResponse('Hello from substitute');
    const provider = new BrowserLocalProvider(adapters);
    await provider.initialize({
      providerId: ProviderType.LocalTransformers,
      model: 'test-model',
    });
    const result = await provider.generate({
      systemPrompt: 'test',
      userPrompt: 'hi',
    });
    expect(result.text).toBe('Hello from substitute');
    expect(result.metrics.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.finishReason).toBe('stop');
  });

  it('generate: throws when not initialized', async () => {
    const { adapters } = createBrowserLocalSubstitutes();
    const provider = new BrowserLocalProvider(adapters);
    await expect(
      provider.generate({ systemPrompt: 'test', userPrompt: 'hi' })
    ).rejects.toThrow('not initialized');
  });

  it('isReady: returns false before initialize, true after', async () => {
    const { adapters } = createBrowserLocalSubstitutes();
    const provider = new BrowserLocalProvider(adapters);
    expect(provider.isReady()).toBe(false);
    await provider.initialize({
      providerId: ProviderType.LocalTransformers,
      model: 'test-model',
    });
    expect(provider.isReady()).toBe(true);
  });

  it('dispose: resets inference and isReady', async () => {
    const { adapters, inference } = createBrowserLocalSubstitutes();
    const provider = new BrowserLocalProvider(adapters);
    await provider.initialize({
      providerId: ProviderType.LocalTransformers,
      model: 'test-model',
    });
    expect(provider.isReady()).toBe(true);
    provider.dispose();
    expect(provider.isReady()).toBe(false);
    expect(inference.isLoaded()).toBe(false);
  });

  it('testConnection: returns success when ready', async () => {
    const { adapters } = createBrowserLocalSubstitutes();
    const provider = new BrowserLocalProvider(adapters);
    await provider.initialize({
      providerId: ProviderType.LocalTransformers,
      model: 'test-model',
    });
    const result = await provider.testConnection();
    expect(result.success).toBe(true);
    expect(result.providerName).toBe('local_transformers');
  });

  it('initialize: passes quantPath and dtype to inference.load', async () => {
    const { adapters, inference } = createBrowserLocalSubstitutes();
    const provider = new BrowserLocalProvider(adapters);
    await provider.initialize({
      providerId: ProviderType.LocalTransformers,
      model: 'Xenova/Qwen2.5-0.5B',
      quantPath: 'model_q4f16.onnx',
      dtype: 'q4f16',
    });
    expect(provider.isReady()).toBe(true);
    expect(inference.lastLoadConfig).toEqual({
      modelId: 'Xenova/Qwen2.5-0.5B',
      quantPath: 'model_q4f16.onnx',
      dtype: 'q4f16',
      useExternalData: false,
    });
  });

  it('initialize: sets useExternalData true when manifest quant requires external data', async () => {
    const { adapters, inference, modelCache } = createBrowserLocalSubstitutes();
    modelCache.seedManifestEntry('onnx-community/Phi-3.5-mini-instruct-onnx-web', {
      repo: 'onnx-community/Phi-3.5-mini-instruct-onnx-web',
      quants: {
        'onnx/model_q4f16.onnx': {
          hasExternalData: true,
        },
      },
    });

    const provider = new BrowserLocalProvider(adapters);
    await provider.initialize({
      providerId: ProviderType.LocalTransformers,
      model: 'onnx-community/Phi-3.5-mini-instruct-onnx-web',
      quantPath: 'onnx/model_q4f16.onnx',
      dtype: 'q4f16',
    });

    expect(inference.lastLoadConfig).toEqual({
      modelId: 'onnx-community/Phi-3.5-mini-instruct-onnx-web',
      quantPath: 'onnx/model_q4f16.onnx',
      dtype: 'q4f16',
      useExternalData: true,
    });
  });
});
