import type { EventConstructor, IEventArgs } from './IEventArgs';

export interface IEventRegistrar {
  subscribe<T extends IEventArgs>(
    type: EventConstructor<T>,
    handler: (args: T) => void
  ): void;

  subscribeAsync<T extends IEventArgs>(
    type: EventConstructor<T>,
    handler: (args: T) => Promise<void>
  ): void;

  unsubscribeAll(): void;
}

