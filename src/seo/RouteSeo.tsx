import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DEFAULT_SEO_SITE_ORIGIN, resolveSeoMetadata, type RouteSeoMetadata } from './publicSeo';

function getClientSiteOrigin(): string {
  return import.meta.env.VITE_PUBLIC_SITE_ORIGIN || DEFAULT_SEO_SITE_ORIGIN;
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string): void {
  const selector = `meta[${attribute}="${key}"][data-ocentra-seo]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  const element = existing ?? document.createElement('meta');
  element.setAttribute(attribute, key);
  element.setAttribute('content', content);
  element.setAttribute('data-ocentra-seo', key);
  if (!existing) {
    document.head.appendChild(element);
  }
}

function upsertCanonical(href: string): void {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"][data-ocentra-seo]');
  const element = existing ?? document.createElement('link');
  element.setAttribute('rel', 'canonical');
  element.setAttribute('href', href);
  element.setAttribute('data-ocentra-seo', 'canonical');
  if (!existing) {
    document.head.appendChild(element);
  }
}

function upsertStructuredData(metadata: RouteSeoMetadata): void {
  const existing = document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"][data-ocentra-seo="jsonld"]');
  const element = existing ?? document.createElement('script');
  element.type = 'application/ld+json';
  element.setAttribute('data-ocentra-seo', 'jsonld');
  element.textContent = JSON.stringify(metadata.structuredData.length === 1 ? metadata.structuredData[0] : metadata.structuredData);
  if (!existing) {
    document.head.appendChild(element);
  }
}

function applyRouteSeo(metadata: RouteSeoMetadata): void {
  document.title = metadata.title;
  upsertMeta('name', 'description', metadata.description);
  upsertMeta('name', 'robots', metadata.robots);
  upsertCanonical(metadata.canonicalUrl);
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:title', metadata.title);
  upsertMeta('property', 'og:description', metadata.description);
  upsertMeta('property', 'og:url', metadata.canonicalUrl);
  upsertMeta('property', 'og:site_name', 'Ocentra Games');
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', metadata.title);
  upsertMeta('name', 'twitter:description', metadata.description);
  upsertStructuredData(metadata);
}

export function RouteSeo() {
  const location = useLocation();

  useEffect(() => {
    applyRouteSeo(resolveSeoMetadata(location.pathname, getClientSiteOrigin()));
  }, [location.pathname]);

  return null;
}
