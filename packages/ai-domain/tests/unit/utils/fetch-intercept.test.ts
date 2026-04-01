import { describe, it, expect, afterEach } from 'vitest';
import {
  setPlatformUrlAdapter,
  clearPlatformUrlAdapter,
} from '@/utils/platform-url-adapter';
import {
  extractResourceUrl,
  shouldInterceptFile,
  mapOnnxModelPath,
  rewriteGenerationConfigPath,
  rewriteMainModelFilePath,
  rewriteSupportingFilePath,
  rewriteModelFileUrl,
  createEmptyGenerationConfig,
} from '@/utils/fetch-intercept';

describe('fetch-intercept', () => {
  afterEach(() => clearPlatformUrlAdapter());

  it('extractResourceUrl: returns url for string input', () => {
    const url = 'https://huggingface.co/repo/resolve/main/model.onnx';
    expect(extractResourceUrl(url).url).toBe(url);
    expect(extractResourceUrl(url).isRequestObject).toBe(false);
  });

  it('extractResourceUrl: returns url for URL input', () => {
    const url = 'https://example.com/file';
    expect(extractResourceUrl(new URL(url)).url).toBe(url);
  });

  it('extractResourceUrl: returns url for Request input', () => {
    const url = 'https://example.com/file';
    expect(extractResourceUrl(new Request(url)).url).toBe(url);
    expect(extractResourceUrl(new Request(url)).isRequestObject).toBe(true);
  });

  it('shouldInterceptFile: intercepts HuggingFace URLs', () => {
    const r = shouldInterceptFile('https://huggingface.co/repo/resolve/main/model.onnx');
    expect(r.shouldIntercept).toBe(true);
    expect(r.isHuggingFaceFile).toBe(true);
  });

  it('shouldInterceptFile: intercepts URLs with /resolve/', () => {
    const r = shouldInterceptFile('https://cdn.example.com/repo/resolve/main/model.onnx');
    expect(r.isHuggingFaceFile).toBe(true);
  });

  it('shouldInterceptFile: does not intercept random HTTPS URL', () => {
    const r = shouldInterceptFile('https://example.com/other');
    expect(r.shouldIntercept).toBe(false);
    expect(r.isHuggingFaceFile).toBe(false);
  });

  it('shouldInterceptFile: intercepts chrome-extension with model files', () => {
    const r = shouldInterceptFile('chrome-extension://id/path/model.onnx');
    expect(r.shouldIntercept).toBe(true);
    expect(r.isLocalFile).toBe(true);
  });

  it('shouldInterceptFile: uses custom PlatformUrlAdapter when set', () => {
    setPlatformUrlAdapter({
      isLocalResource: (url) => url.startsWith('custom://'),
    });
    const r = shouldInterceptFile('custom://app/path/model.onnx');
    expect(r.shouldIntercept).toBe(true);
    expect(r.isLocalFile).toBe(true);
  });

  it('shouldInterceptFile: intercepts file:// with model files (default adapter)', () => {
    const r = shouldInterceptFile('file:///tmp/model.onnx');
    expect(r.shouldIntercept).toBe(true);
    expect(r.isLocalFile).toBe(true);
  });

  it('mapOnnxModelPath: replaces generic model path with quant path', () => {
    const url = 'https://huggingface.co/repo/resolve/main/onnx/model.onnx';
    const result = mapOnnxModelPath(url, 'onnx/model_q4f16.onnx');
    expect(result).toContain('model_q4f16.onnx');
    expect(result).not.toContain('model.onnx');
  });

  it('mapOnnxModelPath: returns unchanged when quantPath null', () => {
    const url = 'https://huggingface.co/repo/resolve/main/model.onnx';
    expect(mapOnnxModelPath(url, null)).toBe(url);
  });

  it('mapOnnxModelPath: replaces .onnx_data pattern', () => {
    const url = 'https://huggingface.co/repo/resolve/main/onnx/model.onnx_data';
    const result = mapOnnxModelPath(url, 'onnx/model_q4f16.onnx');
    expect(result).toContain('model_q4f16.onnx_data');
  });

  it('rewriteGenerationConfigPath: rewrites to exact match when in files', () => {
    const files = ['onnx/generation_config.json', 'config.json'];
    const url = 'https://huggingface.co/repo/resolve/main/generation_config.json';
    const result = rewriteGenerationConfigPath(url, files);
    expect(result).toContain('onnx/generation_config.json');
  });

  it('rewriteGenerationConfigPath: returns unchanged when not generation_config', () => {
    const url = 'https://huggingface.co/repo/resolve/main/config.json';
    expect(rewriteGenerationConfigPath(url, ['config.json'])).toBe(url);
  });

  it('rewriteMainModelFilePath: rewrites to quant file when in files', () => {
    const files = ['onnx/model_q4f16.onnx', 'onnx/config.json'];
    const url = 'https://huggingface.co/repo/resolve/main/onnx/model.onnx';
    const result = rewriteMainModelFilePath(url, 'model.onnx', files);
    expect(result).toContain('onnx/model_q4f16.onnx');
  });

  it('rewriteSupportingFilePath: rewrites to manifest path when in files', () => {
    const files = ['onnx/config.json', 'onnx/model.onnx'];
    const url = 'https://huggingface.co/repo/resolve/main/config.json';
    const result = rewriteSupportingFilePath(url, 'config.json', files);
    expect(result).toContain('onnx/config.json');
  });

  it('rewriteModelFileUrl: orchestrates full rewrite for generation_config', () => {
    const files = ['onnx/generation_config.json', 'onnx/model_q4f16.onnx'];
    const url = 'https://huggingface.co/repo/resolve/main/generation_config.json';
    const result = rewriteModelFileUrl(url, files);
    expect(result).toContain('onnx/generation_config.json');
  });

  it('rewriteModelFileUrl: returns url unchanged when files empty', () => {
    const url = 'https://huggingface.co/repo/resolve/main/model.onnx';
    expect(rewriteModelFileUrl(url, [])).toBe(url);
  });

  it('createEmptyGenerationConfig: returns Response with empty JSON body', async () => {
    const resp = createEmptyGenerationConfig();
    expect(resp.status).toBe(200);
    expect(resp.headers.get('Content-Type')).toBe('application/json');
    const text = await resp.text();
    expect(text).toBe('{}');
  });
});
