import { EventRegistrar } from './EventRegistrar';
import type { EventConstructor, IEventArgs } from '@/interfaces/IEventArgs';
import { EventBus } from './EventBus';
import type { IEventBus } from '@/interfaces/IEventBus';

export interface RegistrarHandle {
  subscribe<T extends IEventArgs>(
    type: EventConstructor<T>,
    handler: (event: T) => void
  ): void;

  subscribeAsync<T extends IEventArgs>(
    type: EventConstructor<T>,
    handler: (event: T) => Promise<void>
  ): void;

  dispose(): void;
}

export const createEventRegistrar = (
  eventBus: IEventBus = EventBus.instance
): RegistrarHandle => {
  const registrar = new EventRegistrar(eventBus);

  return {
    subscribe<T extends IEventArgs>(
      type: EventConstructor<T>,
      handler: (event: T) => void
    ) {
      registrar.subscribe(type, handler);
    },

    subscribeAsync<T extends IEventArgs>(
      type: EventConstructor<T>,
      handler: (event: T) => Promise<void>
    ) {
      registrar.subscribeAsync(type, handler);
    },

    dispose() {
      registrar.dispose();
    },
  };
};

