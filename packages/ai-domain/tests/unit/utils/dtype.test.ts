import { describe, it, expect } from 'vitest';
import { extractDtypeFromPath, parseQuantFromFilename } from '@/utils/dtype';

describe('dtype', () => {
  it('extractDtypeFromPath: returns q4f16 for model_q4f16.onnx', () => {
    expect(extractDtypeFromPath('onnx/model_q4f16.onnx')).toBe('q4f16');
    expect(extractDtypeFromPath('model_q4f16.onnx')).toBe('q4f16');
  });

  it('extractDtypeFromPath: returns fp32 for model.onnx or unknown', () => {
    expect(extractDtypeFromPath('model.onnx')).toBe('fp32');
    expect(extractDtypeFromPath('onnx/model.onnx')).toBe('fp32');
  });

  it('extractDtypeFromPath: returns correct dtype for each known pattern', () => {
    expect(extractDtypeFromPath('model_uint8.onnx')).toBe('uint8');
    expect(extractDtypeFromPath('model_int8.onnx')).toBe('int8');
    expect(extractDtypeFromPath('model_bnb4.onnx')).toBe('bnb4');
    expect(extractDtypeFromPath('model_q4.onnx')).toBe('q4');
    expect(extractDtypeFromPath('model_q8.onnx')).toBe('q8');
    expect(extractDtypeFromPath('model_fp16.onnx')).toBe('fp16');
    expect(extractDtypeFromPath('model_fp32.onnx')).toBe('fp32');
    expect(extractDtypeFromPath('model_quantized.onnx')).toBe('quantized');
  });

  it('extractDtypeFromPath: returns fp32 for empty or invalid input', () => {
    expect(extractDtypeFromPath('')).toBe('fp32');
    expect(extractDtypeFromPath(null as unknown as string)).toBe('fp32');
  });

  it('parseQuantFromFilename: returns quant from model_*.onnx', () => {
    expect(parseQuantFromFilename('model_q4f16.onnx')).toBe('q4f16');
    expect(parseQuantFromFilename('model_fp16.onnx')).toBe('fp16');
  });

  it('parseQuantFromFilename: returns null when no match', () => {
    expect(parseQuantFromFilename('config.json')).toBe(null);
    expect(parseQuantFromFilename('model.onnx')).toBe(null);
  });
});
