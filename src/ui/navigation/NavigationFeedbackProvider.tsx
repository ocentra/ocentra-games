import { type MutableRefObject, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NAVIGATION_FEEDBACK_EVENT, type NavigationFeedbackEventDetail } from '@/ui/navigation/navigationFeedbackEvents';
import { BrandedLoadingSpinner } from '@/ui/components/Loading/BrandedLoadingSpinner';
import './NavigationFeedbackProvider.css';

const DEFAULT_LABEL = 'Loading';
const INTERACTION_IDLE_MS = 700;
const ROUTE_SETTLE_MIN_MS = 420;
const MAX_VISIBLE_MS = 5000;

interface NavigationFeedbackProviderProps {
  children: ReactNode;
}

interface NavigationFeedbackState {
  label: string;
  startedAt: number;
}

function getNow(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function clearTimer(timerRef: MutableRefObject<number | undefined>): void {
  if (timerRef.current === undefined) return;
  window.clearTimeout(timerRef.current);
  timerRef.current = undefined;
}

function isButtonLikeInput(element: Element): boolean {
  if (!(element instanceof HTMLInputElement)) return false;

  return element.type === 'button' || element.type === 'submit' || element.type === 'reset';
}

function isDisabled(element: Element): boolean {
  return element.closest('[disabled], [aria-disabled="true"]') !== null;
}

function resolvePointerCursorElement(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;

  let current: Element | null = target;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    if (style.pointerEvents !== 'none' && style.cursor === 'pointer') return current;
    const nextElement: Element | null = current.parentElement ?? (current.parentNode instanceof SVGElement ? current.parentNode : null);
    current = nextElement;
  }

  return null;
}

function resolveInteractiveElement(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;

  const element = target.closest(
    'a[href], button, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="option"], summary, input, [data-ocentra-click-feedback]',
  );
  const interactiveElement = element ?? resolvePointerCursorElement(target);
  if (!interactiveElement || isDisabled(interactiveElement)) return null;

  if (interactiveElement instanceof HTMLInputElement && !isButtonLikeInput(interactiveElement)) return null;
  if (interactiveElement instanceof HTMLTextAreaElement || interactiveElement instanceof HTMLSelectElement) return null;

  return interactiveElement;
}

export function NavigationFeedbackProvider({ children }: NavigationFeedbackProviderProps) {
  const location = useLocation();
  const routeKey = useMemo(() => `${location.key}:${location.pathname}:${location.search}`, [location.key, location.pathname, location.search]);
  const [feedback, setFeedback] = useState<NavigationFeedbackState | null>(null);
  const feedbackRef = useRef<NavigationFeedbackState | null>(null);
  const hideTimerRef = useRef<number | undefined>(undefined);
  const maxTimerRef = useRef<number | undefined>(undefined);
  const previousRouteKeyRef = useRef(routeKey);

  useEffect(() => {
    feedbackRef.current = feedback;
    if (typeof document === 'undefined') return;

    if (feedback) {
      document.body.dataset.ocentraNavigationPending = 'true';
    } else {
      delete document.body.dataset.ocentraNavigationPending;
    }
  }, [feedback]);

  const hideFeedback = useCallback(() => {
    clearTimer(hideTimerRef);
    clearTimer(maxTimerRef);
    setFeedback(null);
  }, []);

  const scheduleHide = useCallback((delayMs: number) => {
    clearTimer(hideTimerRef);
    hideTimerRef.current = window.setTimeout(hideFeedback, delayMs);
  }, [hideFeedback]);

  const startFeedback = useCallback((label = DEFAULT_LABEL) => {
    clearTimer(hideTimerRef);
    clearTimer(maxTimerRef);
    setFeedback({ label, startedAt: getNow() });
    scheduleHide(INTERACTION_IDLE_MS);
    maxTimerRef.current = window.setTimeout(hideFeedback, MAX_VISIBLE_MS);
  }, [hideFeedback, scheduleHide]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (!resolveInteractiveElement(event.target)) return;

      startFeedback();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (!resolveInteractiveElement(event.target)) return;

      startFeedback();
    };

    const handleNavigationFeedback = (event: Event) => {
      const detail = (event as CustomEvent<NavigationFeedbackEventDetail>).detail;
      startFeedback(detail?.label ?? DEFAULT_LABEL);
    };

    document.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener(NAVIGATION_FEEDBACK_EVENT, handleNavigationFeedback);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener(NAVIGATION_FEEDBACK_EVENT, handleNavigationFeedback);
      delete document.body.dataset.ocentraNavigationPending;
      clearTimer(hideTimerRef);
      clearTimer(maxTimerRef);
    };
  }, [startFeedback]);

  useEffect(() => {
    if (previousRouteKeyRef.current === routeKey) return;
    previousRouteKeyRef.current = routeKey;

    const activeFeedback = feedbackRef.current;
    if (!activeFeedback) return;

    const elapsed = getNow() - activeFeedback.startedAt;
    scheduleHide(Math.max(ROUTE_SETTLE_MIN_MS - elapsed, 0));
  }, [routeKey, scheduleHide]);

  return (
    <>
      {children}
      <div
        className={`ocentra-navigation-feedback${feedback ? ' ocentra-navigation-feedback--visible' : ''}`}
        role="status"
        aria-live="polite"
        aria-hidden={feedback ? undefined : true}
        aria-label={feedback?.label}
        data-ocentra-navigation-feedback={feedback ? 'visible' : 'hidden'}
        hidden={!feedback}
      >
        {feedback ? (
          <>
            <span className="ocentra-navigation-feedback__spinner" aria-hidden="true">
              <BrandedLoadingSpinner size="small" />
            </span>
            <span className="ocentra-navigation-feedback__label">{feedback.label}</span>
          </>
        ) : null}
      </div>
    </>
  );
}
