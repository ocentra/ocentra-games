import type { PropsWithChildren, ReactElement } from 'react';
import type { EventConstructor, IEventArgs } from '@ocentra/eventing-domain/interfaces/IEventArgs';
import { useEventListener } from '@/lib/eventing/hooks/useEventListener';

interface EventListenerProps<T extends IEventArgs> {
  event: EventConstructor<T>;
  handler: (event: T) => void | Promise<void>;
  async?: boolean;
  deps?: ReadonlyArray<unknown>;
}

export const EventListener = <T extends IEventArgs>({
  event,
  handler,
  async = false,
  deps = [],
  children,
}: PropsWithChildren<EventListenerProps<T>>): ReactElement => {
  useEventListener(event, handler, { async, deps });

  return <>{children}</>;
};


