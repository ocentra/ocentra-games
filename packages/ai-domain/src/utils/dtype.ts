export function extractDtypeFromPath(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') return 'fp32';
  const filename = filePath.split('/').pop() || filePath;
  const nameWithoutExt = filename.replace(/\.onnx$/, '');
  if (nameWithoutExt.includes('q4f16')) return 'q4f16';
  if (nameWithoutExt.includes('uint8')) return 'uint8';
  if (nameWithoutExt.includes('int8')) return 'int8';
  if (nameWithoutExt.includes('bnb4')) return 'bnb4';
  if (nameWithoutExt.includes('q4')) return 'q4';
  if (nameWithoutExt.includes('q8')) return 'q8';
  if (nameWithoutExt.includes('fp16')) return 'fp16';
  if (nameWithoutExt.includes('fp32')) return 'fp32';
  if (nameWithoutExt.includes('quantized')) return 'quantized';
  return 'fp32';
}

export function parseQuantFromFilename(filename: string): string | null {
  const match = filename.match(/model_([a-z0-9_]+)\.onnx$/i);
  return match ? match[1] : null;
}
