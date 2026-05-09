type ScrollActivityGlobal = typeof globalThis & {
  __ocentraScrollActivityCleanup?: () => void;
  __ocentraScrollActivityInstalled?: boolean;
};

export type ScrollActivityOptions = {
  durationMs?: number;
};

const ACTIVE_ATTR = 'data-oc-scroll-active';

function resolveScrollElement(target: EventTarget | null): Element | null {
  if (target instanceof HTMLElement) {
    return target;
  }

  if (target instanceof Document) {
    return target.scrollingElement ?? target.documentElement;
  }

  return document.scrollingElement ?? document.documentElement;
}

export function installOcentraScrollActivityTracker(options: ScrollActivityOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const scrollGlobal = globalThis as ScrollActivityGlobal;
  if (scrollGlobal.__ocentraScrollActivityInstalled) {
    return scrollGlobal.__ocentraScrollActivityCleanup ?? (() => {});
  }

  const durationMs = options.durationMs ?? 720;
  const timers = new WeakMap<Element, number>();

  const markScrolling = (event: Event) => {
    const element = resolveScrollElement(event.target);
    if (!element) {
      return;
    }

    element.setAttribute(ACTIVE_ATTR, 'true');

    const existingTimer = timers.get(element);
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
    }

    const nextTimer = window.setTimeout(() => {
      element.removeAttribute(ACTIVE_ATTR);
      timers.delete(element);
    }, durationMs);
    timers.set(element, nextTimer);
  };

  document.addEventListener('scroll', markScrolling, { capture: true, passive: true });
  window.addEventListener('scroll', markScrolling, { capture: true, passive: true });

  const cleanup = () => {
    document.removeEventListener('scroll', markScrolling, { capture: true });
    window.removeEventListener('scroll', markScrolling, { capture: true });
    scrollGlobal.__ocentraScrollActivityInstalled = false;
    scrollGlobal.__ocentraScrollActivityCleanup = undefined;
  };

  scrollGlobal.__ocentraScrollActivityInstalled = true;
  scrollGlobal.__ocentraScrollActivityCleanup = cleanup;

  return cleanup;
}
