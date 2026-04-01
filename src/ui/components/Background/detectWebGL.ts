let cached: boolean | null = null;

export function detectWebGL(): boolean {
  if (cached !== null) return cached;
  if (typeof document === 'undefined' || typeof navigator === 'undefined') {
    cached = false;
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    cached = gl !== null && typeof (gl as WebGLRenderingContext).getParameter === 'function';
  } catch {
    cached = false;
  }
  return cached;
}
