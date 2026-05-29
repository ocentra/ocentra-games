export const NAVIGATION_FEEDBACK_EVENT = 'ocentra:navigation-feedback' as const;

export interface NavigationFeedbackEventDetail {
  label?: string;
}

export function announceNavigationFeedback(detail: NavigationFeedbackEventDetail = {}): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent<NavigationFeedbackEventDetail>(NAVIGATION_FEEDBACK_EVENT, { detail }));
}
