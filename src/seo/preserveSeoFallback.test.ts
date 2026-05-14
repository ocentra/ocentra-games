import { beforeEach, describe, expect, it } from 'vitest';
import { preserveSeoFallbackForHydration, removeStaleSeoFallbackParity } from './preserveSeoFallback';

describe('SEO fallback hydration preservation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('moves the server fallback outside the React root and disables focusable descendants', () => {
    document.body.innerHTML = [
      '<div id="root">',
      '<main class="ocentra-seo-fallback" data-ocentra-seo-body="catalog">',
      '<h1>Card Games Catalog</h1>',
      '<a href="/games/claim">Claim</a>',
      '</main>',
      '</div>',
    ].join('');

    const root = document.getElementById('root')!;
    const parityRoot = preserveSeoFallbackForHydration(root);

    expect(parityRoot?.id).toBe('ocentra-seo-parity');
    expect(root.querySelector('.ocentra-seo-fallback')).toBeNull();
    expect(parityRoot?.querySelector('[data-ocentra-seo-body="catalog"]')).toBeTruthy();
    expect(parityRoot?.querySelector('a')?.getAttribute('tabindex')).toBe('-1');
    expect(parityRoot?.getAttribute('aria-hidden')).toBe('true');
    expect(parityRoot?.getAttribute('data-ocentra-seo-pathname')).toBe('/');
  });

  it('replaces an older preserved fallback when a new route renders', () => {
    document.body.innerHTML = [
      '<div id="root">',
      '<main class="ocentra-seo-fallback" data-ocentra-seo-body="game">',
      '<h1>Claim</h1>',
      '</main>',
      '</div>',
      '<div id="ocentra-seo-parity"><main data-ocentra-seo-body="catalog"></main></div>',
    ].join('');

    const root = document.getElementById('root')!;
    const parityRoot = preserveSeoFallbackForHydration(root);

    expect(document.querySelectorAll('#ocentra-seo-parity')).toHaveLength(1);
    expect(parityRoot?.querySelector('[data-ocentra-seo-body="game"]')).toBeTruthy();
    expect(document.querySelector('[data-ocentra-seo-body="catalog"]')).toBeNull();
  });

  it('does nothing when the server did not inject a managed fallback', () => {
    document.body.innerHTML = '<div id="root"><div>React app</div></div>';

    const root = document.getElementById('root')!;

    expect(preserveSeoFallbackForHydration(root)).toBeNull();
    expect(document.getElementById('ocentra-seo-parity')).toBeNull();
  });

  it('removes the preserved fallback when the route no longer matches it', () => {
    document.body.innerHTML = [
      '<div id="root"></div>',
      '<div id="ocentra-seo-parity" data-ocentra-seo-pathname="/games/card-games">',
      '<main class="ocentra-seo-fallback" data-ocentra-seo-body="catalog"></main>',
      '</div>',
    ].join('');

    removeStaleSeoFallbackParity('/games/claim');

    expect(document.getElementById('ocentra-seo-parity')).toBeNull();
  });

  it('keeps the preserved fallback when the route still matches it', () => {
    document.body.innerHTML = [
      '<div id="root"></div>',
      '<div id="ocentra-seo-parity" data-ocentra-seo-pathname="/games/card-games">',
      '<main class="ocentra-seo-fallback" data-ocentra-seo-body="catalog"></main>',
      '</div>',
    ].join('');

    removeStaleSeoFallbackParity('/games/card-games/');

    expect(document.getElementById('ocentra-seo-parity')).toBeTruthy();
  });
});
