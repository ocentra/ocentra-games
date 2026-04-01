import { useEventBus } from '@/lib/eventing/hooks/useEventBus';
import { useBehaviour } from '@ocentra/behaviour-domain/hooks/useBehaviour';
import type { EventBehaviour, EventBehaviourContext } from '@/lib/eventing/behaviours/EventBehaviour';
import type { UseBehaviourOptions } from '@ocentra/behaviour-domain/hooks/useBehaviour';

export const useEventBehaviour = <
  T extends EventBehaviour
>(
  factory: (context: EventBehaviourContext) => T,
  options?: UseBehaviourOptions
): T => {
  const eventBus = useEventBus();
  return useBehaviour<T, EventBehaviourContext>(
    context => factory(context ?? { eventBus }),
    { eventBus },
    options
  );
};


