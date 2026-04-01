import type { DependencyList } from 'react';
import { useEffect } from 'react';
import { EventRegistrar } from '@ocentra/eventing-domain/core/EventRegistrar';
import { useEventBus } from './useEventBus';

type Cleanup = void | (() => void | Promise<void>);

export type EventRegistrarEffect = (registrar: EventRegistrar) => Cleanup;

export const useEventRegistrar = (
  effect: EventRegistrarEffect,
  deps: DependencyList = []
): void => {
  const eventBus = useEventBus();

  useEffect(() => {
    const registrar = new EventRegistrar(eventBus);
    const cleanup = effect(registrar);

    return () => {
      if (typeof cleanup === 'function') {
        const result = cleanup();
        if (result instanceof Promise) {
          void result;
        }
      }
      registrar.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventBus, ...deps]);
};

