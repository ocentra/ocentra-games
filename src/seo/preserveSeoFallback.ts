const parityRootId = 'ocentra-seo-parity';
const focusableSelector = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  '[tabindex]',
].join(',');

function normalizePathname(pathname: string): string {
  const normalized = pathname.trim() || '/';
  return normalized === '/' ? normalized : normalized.replace(/\/+$/, '');
}

export function preserveSeoFallbackForHydration(rootElement: HTMLElement): HTMLElement | null {
  const fallback = rootElement.querySelector<HTMLElement>('.ocentra-seo-fallback');
  if (!fallback) {
    return null;
  }

  document.getElementById(parityRootId)?.remove();

  const parityRoot = document.createElement('div');
  parityRoot.id = parityRootId;
  parityRoot.className = parityRootId;
  parityRoot.setAttribute('data-ocentra-seo-parity', '');
  parityRoot.setAttribute('data-ocentra-seo-pathname', normalizePathname(window.location.pathname));
  parityRoot.setAttribute('aria-hidden', 'true');
  parityRoot.style.position = 'fixed';
  parityRoot.style.inset = '0 auto auto 0';
  parityRoot.style.width = '1px';
  parityRoot.style.height = '1px';
  parityRoot.style.overflow = 'hidden';
  parityRoot.style.clipPath = 'inset(50%)';
  parityRoot.style.whiteSpace = 'nowrap';
  parityRoot.style.pointerEvents = 'none';
  parityRoot.style.opacity = '0';

  fallback.setAttribute('data-ocentra-seo-hydrated', 'preserved');
  fallback.setAttribute('aria-hidden', 'true');
  fallback.querySelectorAll<HTMLElement>(focusableSelector).forEach((element) => {
    element.setAttribute('tabindex', '-1');
  });

  parityRoot.appendChild(fallback);
  rootElement.after(parityRoot);
  return parityRoot;
}

export function removeStaleSeoFallbackParity(pathname: string): void {
  const parityRoot = document.getElementById(parityRootId);
  const preservedPathname = parityRoot?.getAttribute('data-ocentra-seo-pathname');
  if (parityRoot && preservedPathname && preservedPathname !== normalizePathname(pathname)) {
    parityRoot.remove();
  }
}
