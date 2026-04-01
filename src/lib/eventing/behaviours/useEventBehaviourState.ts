import { useEventBus } from '@/lib/eventing/hooks/useEventBus';
import { useBehaviourState } from '@ocentra/behaviour-domain/hooks/useBehaviourState';
import type { EventBehaviour, EventBehaviourContext } from '@/lib/eventing/behaviours/EventBehaviour';

interface UseEventBehaviourStateOptions {
  autoStart?: boolean;
}

export const useEventBehaviourState = <
  T extends EventBehaviour,
  S
>(
  factory: (context: EventBehaviourContext) => T,
  selector: (behaviour: T) => S,
  options?: UseEventBehaviourStateOptions
): S => {
  const eventBus = useEventBus();
  return useBehaviourState<T, S, EventBehaviourContext>(
    context => factory(context ?? { eventBus }),
    selector,
    { eventBus },
    options
  );
};


