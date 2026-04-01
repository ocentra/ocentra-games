import { describe, it, expect } from 'vitest';
import { buildManifestFromSiblings, CURRENT_MANIFEST_VERSION } from '@/utils/manifest-builder';
import type { HuggingFaceSibling } from '@/types/huggingface';
import { QUANT_STATUS } from '@/constants/quant-status';

describe('manifest-builder', () => {
  it('buildManifestFromSiblings: returns empty quants when no .onnx files', () => {
    const siblings: HuggingFaceSibling[] = [
      { rfilename: 'config.json' },
      { rfilename: 'tokenizer.json' },
    ];
    const result = buildManifestFromSiblings('repo/id', siblings, 'text-generation');
    expect(result.repo).toBe('repo/id');
    expect(result.task).toBe('text-generation');
    expect(result.manifestVersion).toBe(CURRENT_MANIFEST_VERSION);
    expect(Object.keys(result.quants)).toHaveLength(0);
  });

  it('buildManifestFromSiblings: builds quant entry for single .onnx', () => {
    const siblings: HuggingFaceSibling[] = [
      { rfilename: 'onnx/model_q4f16.onnx', size: 100 },
      { rfilename: 'onnx/config.json', size: 1 },
      { rfilename: 'config.json', size: 1 },
    ];
    const result = buildManifestFromSiblings('repo/id', siblings, 'text-generation');
    expect(Object.keys(result.quants)).toHaveLength(1);
    const quant = result.quants['onnx/model_q4f16.onnx'];
    expect(quant).toBeDefined();
    expect(quant.status).toBe(QUANT_STATUS.AVAILABLE);
    expect(quant.dtype).toBe('q4f16');
    expect(quant.files).toContain('onnx/model_q4f16.onnx');
    expect(quant.hasExternalData).toBe(false);
  });

  it('buildManifestFromSiblings: detects hasExternalData when .onnx_data present', () => {
    const siblings: HuggingFaceSibling[] = [
      { rfilename: 'onnx/model_q4f16.onnx', size: 100 },
      { rfilename: 'onnx/model_q4f16.onnx_data', size: 200 },
    ];
    const result = buildManifestFromSiblings('repo/id', siblings, 'text-generation');
    const quant = result.quants['onnx/model_q4f16.onnx'];
    expect(quant.hasExternalData).toBe(true);
  });

  it('buildManifestFromSiblings: includes supporting files in quant files', () => {
    const siblings: HuggingFaceSibling[] = [
      { rfilename: 'onnx/model_q4f16.onnx', size: 100 },
      { rfilename: 'onnx/config.json', size: 1 },
      { rfilename: 'onnx/tokenizer.json', size: 2 },
    ];
    const result = buildManifestFromSiblings('repo/id', siblings, 'text-generation');
    const quant = result.quants['onnx/model_q4f16.onnx'];
    expect(quant.files).toContain('onnx/model_q4f16.onnx');
    expect(quant.files).toContain('onnx/config.json');
    expect(quant.files).toContain('onnx/tokenizer.json');
  });

  it('buildManifestFromSiblings: fileSizes populated when siblings have size', () => {
    const siblings: HuggingFaceSibling[] = [
      { rfilename: 'onnx/model_q4f16.onnx', size: 500 },
      { rfilename: 'onnx/config.json', size: 10 },
    ];
    const result = buildManifestFromSiblings('repo/id', siblings, 'text-generation');
    const quant = result.quants['onnx/model_q4f16.onnx'];
    expect(quant.fileSizes).toBeDefined();
    expect(quant.fileSizes!['onnx/model_q4f16.onnx']).toBe(500);
    expect(quant.fileSizes!['onnx/config.json']).toBe(10);
  });
});
