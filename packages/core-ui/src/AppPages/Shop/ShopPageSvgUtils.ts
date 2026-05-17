export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function alphaColor(color: string, opacity: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const alpha = Math.round(clampNumber(opacity, 0, 1) * 255).toString(16).padStart(2, '0');
  return `${color}${alpha}`;
}

export function fitSingleLineTextSize(text: string, width: number, min: number, max: number, factor = 0.52): number {
  const length = Math.max(1, text.length);
  return clampNumber(width / (length * factor), min, max);
}
