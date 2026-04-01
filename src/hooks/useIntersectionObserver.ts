import { useState, useEffect } from 'react';
import type { RefObject } from 'react';

export interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  rootMargin?: string;
  threshold?: number | number[];
}

export function useIntersectionObserver(
  elementRef: RefObject<HTMLElement | null>,
  options?: UseIntersectionObserverOptions
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: 0.01,
        ...options,
      }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [elementRef, options]);

  return isIntersecting;
}

