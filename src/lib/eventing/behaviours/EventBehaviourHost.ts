import { useCallback, createElement } from 'react';
import type { PropsWithChildren, ReactElement } from 'react';
import { BehaviourHost } from '@lib/react-behaviours';
import { useEventBus } from '@lib/eventing/hooks';
import type { EventBehaviour, EventBehaviourContext } from '@lib/eventing/behaviours';

export interface EventBehaviourHostProps<T extends EventBehaviour> {
  create: (context: EventBehaviourContext) => T;
  onReady?: (behaviour: T) => void;
  autoStart?: boolean;
}

export const EventBehaviourHost = <T extends EventBehaviour>({
  create,
  onReady,
  autoStart,
  children,
}: PropsWithChildren<EventBehaviourHostProps<T>>): ReactElement | null => {
  const eventBus = useEventBus();
  const createWithContext = useCallback(
    () => create({ eventBus }),
    [create, eventBus]
  );
  const handleReady = useCallback(
    (behaviour: EventBehaviour) => {
      onReady?.(behaviour as T);
    },
    [onReady]
  );

  return createElement(
    BehaviourHost<EventBehaviour, EventBehaviourContext>,
    {
      create: createWithContext,
      onReady: handleReady,
      autoStart: autoStart,
    },
    children ?? null
  );
};

