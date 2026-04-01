import type { IEventRegistrar } from '@/interfaces/IEventRegistrar';
import { EventBus } from './EventBus';
import type { EventConstructor, IEventArgs } from '@/interfaces/IEventArgs';
import type { IEventBus } from '@/interfaces/IEventBus';
import { assertImplements } from '@ocentra/boundary-domain/contracts/Interface';
import { EventBusContract, IEventRegistrarContract } from '@/contracts/specs';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

interface EventRegistrarBase<T extends IEventArgs> {
  readonly type: EventConstructor<T>;
  equals(other: EventRegistrarBase<IEventArgs>): boolean;
  unsubscribe(eventBus: IEventBus): void;
}

class EventRegistrarSync<T extends IEventArgs> implements EventRegistrarBase<T> {
  readonly type: EventConstructor<T>;
  readonly handler: (event: T) => void;

  constructor(type: EventConstructor<T>, handler: (event: T) => void) {
    this.type = type;
    this.handler = handler;
  }

  unsubscribe(eventBus: IEventBus): void {
    eventBus.unsubscribe(this.type, this.handler);
  }

  equals(other: EventRegistrarBase<IEventArgs>): boolean {
    if (other instanceof EventRegistrarSync) {
      return this.handler === other.handler && this.type === other.type;
    }

    return false;
  }
}

class EventRegistrarAsync<T extends IEventArgs> implements EventRegistrarBase<T> {
  readonly type: EventConstructor<T>;
  readonly handler: (event: T) => Promise<void>;

  constructor(type: EventConstructor<T>, handler: (event: T) => Promise<void>) {
    this.type = type;
    this.handler = handler;
  }

  unsubscribe(eventBus: IEventBus): void {
    eventBus.unsubscribeAsync(this.type, this.handler);
  }

  equals(other: EventRegistrarBase<IEventArgs>): boolean {
    if (other instanceof EventRegistrarAsync) {
      return this.handler === other.handler && this.type === other.type;
    }

    return false;
  }
}

type RegistrarEntry =
  | EventRegistrarSync<IEventArgs>
  | EventRegistrarAsync<IEventArgs>;

export class EventRegistrar implements IEventRegistrar {
  private readonly subscriptions = new Map<RegistrarEntry, true>();
  private disposed = false;
  private readonly eventBus: IEventBus;
  private readonly log = MainAppLogger.instance;
  private readonly logError = (message: string, error?: unknown) => {
    this.log.logError(message, getStackTrace(), error);
  };

  static {
    MainAppLogger.instance.register(import.meta.url);
  }

  constructor(eventBus: IEventBus = EventBus.instance) {
    assertImplements(this, 'IEventRegistrar', IEventRegistrarContract);
    assertImplements(eventBus, 'EventBus', EventBusContract);
    this.eventBus = eventBus;
  }

  subscribe<T extends IEventArgs>(
    type: EventConstructor<T>,
    handler: (event: T) => void
  ): void {
    if (this.disposed) {
      return;
    }

    if (!handler) {
      return;
    }

    const entry = new EventRegistrarSync(type, handler);
    if (!this.hasEntry(entry)) {
      this.subscriptions.set(
        entry as unknown as RegistrarEntry,
        true
      );
      this.eventBus.subscribe(type, handler);
    }
  }

  subscribeAsync<T extends IEventArgs>(
    type: EventConstructor<T>,
    handler: (event: T) => Promise<void>
  ): void {
    if (this.disposed) {
      return;
    }

    if (!handler) {
      return;
    }

    const entry = new EventRegistrarAsync(type, handler);
    if (!this.hasEntry(entry)) {
      this.subscriptions.set(entry as unknown as RegistrarEntry, true);
      this.eventBus.subscribeAsync(type, handler);
    }
  }

  unsubscribeAll(): void {
    for (const entry of this.subscriptions.keys()) {
      try {
        entry.unsubscribe(this.eventBus);
      } catch (error) {
        const typeName = (entry as EventRegistrarSync<IEventArgs>).type?.name ?? 'Unknown';
        this.logError(
          `Failed to unsubscribe event of type ${typeName}`,
          error
        );
      }
    }

    this.subscriptions.clear();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.unsubscribeAll();
    this.disposed = true;
  }

  private hasEntry(entry: EventRegistrarBase<IEventArgs>): boolean {
    for (const existing of this.subscriptions.keys()) {
      if (
        existing instanceof EventRegistrarSync &&
        existing.equals(entry)
      ) {
        return true;
      }

      if (
        existing instanceof EventRegistrarAsync &&
        existing.equals(entry)
      ) {
        return true;
      }
    }

    return false;
  }
}

