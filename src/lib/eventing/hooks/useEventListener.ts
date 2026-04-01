import type { DependencyList } from 'react';
import type { EventConstructor, IEventArgs } from '@ocentra/eventing-domain/interfaces/IEventArgs';
import { useEventRegistrar } from './useEventRegistrar';

interface EventListenerOptions {
  async?: boolean;
  deps?: DependencyList;
}

export const useEventListener = <T extends IEventArgs>(
  eventType: EventConstructor<T>,
  handler: (event: T) => void | Promise<void>,
  options?: EventListenerOptions
): void => {
  const isAsync = options?.async ?? false;
  const deps = options?.deps ?? [];

  useEventRegistrar(
    registrar => {
      if (isAsync) {
        registrar.subscribeAsync(eventType, handler as (event: T) => Promise<void>);
      } else {
        registrar.subscribe(eventType, handler as (event: T) => void);
      }

      return undefined;
    },
    [eventType, handler, isAsync, ...deps]
  );
};

