import { GUID_REGEX } from './constants';

export function extractGuidFromAsset(content: string): string | null {
  const quotedMatch = content.match(/["']guid["']\s*:\s*["']([0-9a-f-]{36})["']/i);
  if (quotedMatch && GUID_REGEX.test(quotedMatch[1])) {
    return quotedMatch[1];
  }
  return null;
}

export function extractStringField(content: string, field: string): string | null {
  const matcher = new RegExp(`["']${field}["']\\s*:\\s*["']([^"']+)["']`, 'i');
  const match = content.match(matcher);
  return match ? match[1] : null;
}

export function inferContentType(path: string, fallback = 'application/octet-stream'): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.avif')) return 'image/avif';
  if (lower.endsWith('.asset') || lower.endsWith('.json') || lower.endsWith('.meta')) return 'application/json';
  if (lower.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return fallback;
}
