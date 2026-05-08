import { parse } from 'node-html-parser';
import type { HTMLElement } from 'node-html-parser';
import type { SeoPageSnapshot } from './types';

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function attr(element: HTMLElement | null, name: string): string {
  return element?.getAttribute(name)?.trim() ?? '';
}

function text(element: HTMLElement | null): string {
  return normalizeText(element?.textContent ?? '');
}

function canonicalPath(value: string, baseUrl: string): string {
  if (!value) {
    return '';
  }
  try {
    return new URL(value, baseUrl).pathname;
  } catch {
    return '';
  }
}

function normalizeInternalHref(value: string, baseUrl: string): string | null {
  const href = value.trim();
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
    return null;
  }
  try {
    const base = new URL(baseUrl);
    const url = new URL(href, base);
    if (url.origin !== base.origin) {
      return null;
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function extractSeoPageSnapshot(html: string, url: string, status: number): SeoPageSnapshot {
  const root = parse(html);
  const title = text(root.querySelector('title'));
  const description = attr(root.querySelector('meta[name="description"]'), 'content');
  const robots = attr(root.querySelector('meta[name="robots"]'), 'content');
  const canonicalUrl = attr(root.querySelector('link[rel="canonical"]'), 'href');
  const h1Texts = root.querySelectorAll('h1').map(item => text(item)).filter(Boolean);
  const jsonLdScripts = root.querySelectorAll('script[type="application/ld+json"]');
  const invalidJsonLdCount = jsonLdScripts.filter((script) => {
    try {
      JSON.parse(script.textContent.trim());
      return false;
    } catch {
      return true;
    }
  }).length;
  const seoBody = root.querySelector('[data-ocentra-seo-body]');
  const body = root.querySelector('body');
  const internalLinks = unique(root.querySelectorAll('a[href]')
    .map(link => normalizeInternalHref(attr(link, 'href'), url))
    .filter((href): href is string => href !== null));

  return {
    url,
    status,
    title,
    description,
    robots,
    canonicalUrl,
    canonicalPath: canonicalPath(canonicalUrl, url),
    h1Texts,
    jsonLdCount: jsonLdScripts.length,
    invalidJsonLdCount,
    seoBodyKind: attr(seoBody, 'data-ocentra-seo-body'),
    seoBodyTextLength: text(seoBody).length,
    bodyTextLength: text(body).length,
    internalLinks,
  };
}
