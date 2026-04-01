import type { OperationResult } from '@/core/OperationResult';
import type { EventConstructor, IEventArgs } from '@/interfaces/IEventArgs';

export interface PublishOptions {
  awaitAsync?: boolean;
  force?: boolean;
}

export interface IEventBus {
  subscribe<T extends IEventArgs>(
    type: EventConstructor<T>,
    handler: (event: T) => void,
    force?: boolean
  ): void;

  subscribeAsync<T extends IEventArgs>(
    type: EventConstructor<T>,
    handler: (event: T) => Promise<void>,
    force?: boolean
  ): void;

  unsubscribe<T extends IEventArgs>(
    type: EventConstructor<T>,
    handler: (event: T) => void
  ): void;

  unsubscribeAsync<T extends IEventArgs>(
    type: EventConstructor<T>,
    handler: (event: T) => Promise<void>
  ): void;

  publish<T extends IEventArgs>(
    eventArgs: T,
    options?: PublishOptions
  ): Promise<OperationResult<boolean>>;

  publishAsync<T extends IEventArgs>(
    eventArgs: T,
    options?: { force?: boolean; timeoutMs?: number }
  ): Promise<OperationResult<boolean>>;

  clear(): void;
}


