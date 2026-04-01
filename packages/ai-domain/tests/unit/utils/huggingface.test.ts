import { describe, it, expect } from 'vitest';
import {
  fetchRepoInfo,
  getAvailableQuantsFromSiblings,
  CURRENT_MANIFEST_VERSION,
} from '@/utils/huggingface';
import type { FetchAdapter } from '@/types/adapters';
import type { HuggingFaceSibling } from '@/types/huggingface';

describe('huggingface', () => {
  it('getAvailableQuantsFromSiblings: returns empty for no siblings', () => {
    const result = getAvailableQuantsFromSiblings([]);
    expect(result).toEqual([]);
  });

  it('getAvailableQuantsFromSiblings: extracts quants from .onnx files', () => {
    const siblings: HuggingFaceSibling[] = [
      { rfilename: 'onnx/model_q4f16.onnx' },
      { rfilename: 'onnx/model_fp16.onnx' },
      { rfilename: 'config.json' },
    ];
    const result = getAvailableQuantsFromSiblings(siblings);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ path: 'onnx/model_q4f16.onnx', dtype: 'q4f16' });
    expect(result[1]).toEqual({ path: 'onnx/model_fp16.onnx', dtype: 'fp16' });
  });

  it('getAvailableQuantsFromSiblings: sorts by dtype priority', () => {
    const siblings: HuggingFaceSibling[] = [
      { rfilename: 'onnx/model_fp32.onnx' },
      { rfilename: 'onnx/model_q4f16.onnx' },
      { rfilename: 'onnx/model_q4.onnx' },
    ];
    const result = getAvailableQuantsFromSiblings(siblings);
    expect(result[0].dtype).toBe('q4f16');
    expect(result[1].dtype).toBe('q4');
    expect(result[2].dtype).toBe('fp32');
  });

  it('getAvailableQuantsFromSiblings: onlyOnnxFolder true filters to onnx/ only', () => {
    const siblings: HuggingFaceSibling[] = [
      { rfilename: 'onnx/model_q4.onnx' },
      { rfilename: 'model.onnx' },
    ];
    const result = getAvailableQuantsFromSiblings(siblings, { onlyOnnxFolder: true });
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('onnx/model_q4.onnx');
  });

  it('getAvailableQuantsFromSiblings: onlyOnnxFolder false includes root .onnx', () => {
    const siblings: HuggingFaceSibling[] = [
      { rfilename: 'model.onnx' },
      { rfilename: 'onnx/model_q4.onnx' },
    ];
    const result = getAvailableQuantsFromSiblings(siblings, { onlyOnnxFolder: false });
    expect(result).toHaveLength(2);
  });

  it('fetchRepoInfo: returns repo info from API response', async () => {
    const mockFetch: FetchAdapter = {
      fetch: async (url: string) => {
        if (url.includes('/api/models/')) {
          return new Response(
            JSON.stringify({
              siblings: [
                { rfilename: 'onnx/model_q4f16.onnx', size: 1000 },
                { rfilename: 'config.json' },
              ],
              pipeline_tag: 'text-generation',
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(null, { status: 404 });
      },
    };
    const result = await fetchRepoInfo(mockFetch, 'test/repo');
    expect(result.siblings).toHaveLength(2);
    expect(result.task).toBe('text-generation');
    expect(result.siblings[0].rfilename).toBe('onnx/model_q4f16.onnx');
  });

  it('fetchRepoInfo: throws on non-ok response', async () => {
    const mockFetch: FetchAdapter = {
      fetch: async () => new Response('Not Found', { status: 404 }),
    };
    await expect(fetchRepoInfo(mockFetch, 'missing/repo')).rejects.toThrow(
      'Failed to fetch repo files'
    );
  });

  it('CURRENT_MANIFEST_VERSION is 1', () => {
    expect(CURRENT_MANIFEST_VERSION).toBe(1);
  });
});
