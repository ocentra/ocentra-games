import { describe, expect, it } from 'vitest';
import { shouldProxyImage, getProxiedImageUrl } from './imageProxy';

describe('imageProxy', () => {
  it('shouldProxyImage: returns false for null or undefined', () => {
    expect(shouldProxyImage(null)).toBe(false);
    expect(shouldProxyImage(undefined)).toBe(false);
  });

  it('shouldProxyImage: returns false for relative paths', () => {
    expect(shouldProxyImage('/path/to/image.png')).toBe(false);
    expect(shouldProxyImage('/api/something')).toBe(false);
  });

  it('shouldProxyImage: returns false for data URLs', () => {
    expect(shouldProxyImage('data:image/png;base64,abc')).toBe(false);
  });

  it('shouldProxyImage: returns true for external domains (google, facebook)', () => {
    expect(shouldProxyImage('https://lh3.googleusercontent.com/photo')).toBe(true);
    expect(shouldProxyImage('https://graph.facebook.com/123/picture')).toBe(true);
    expect(shouldProxyImage('https://scontent.fbcdn.net/photo.jpg')).toBe(true);
  });

  it('shouldProxyImage: returns false for non-proxyable external domains', () => {
    expect(shouldProxyImage('https://example.com/image.png')).toBe(false);
    expect(shouldProxyImage('https://cdn.example.org/photo.jpg')).toBe(false);
  });

  it('shouldProxyImage: returns false for invalid URL', () => {
    expect(shouldProxyImage('not-a-url')).toBe(false);
  });

  it('getProxiedImageUrl: returns empty string for null/undefined', () => {
    expect(getProxiedImageUrl(null)).toBe('');
    expect(getProxiedImageUrl(undefined)).toBe('');
  });

  it('getProxiedImageUrl: returns original URL when shouldProxyImage is false', () => {
    const url = '/Resources/Images/abc.png';
    expect(getProxiedImageUrl(url)).toBe(url);
    expect(getProxiedImageUrl('data:image/png;base64,x')).toBe('data:image/png;base64,x');
  });

  it('getProxiedImageUrl: returns proxy URL when shouldProxyImage is true and workerUrl provided', () => {
    const externalUrl = 'https://lh3.googleusercontent.com/photo';
    const workerUrl = 'https://worker.example.com';
    const result = getProxiedImageUrl(externalUrl, workerUrl);
    expect(result).toContain(workerUrl);
    expect(result).toContain('url=');
    expect(result).toContain(encodeURIComponent(externalUrl));
  });
});
