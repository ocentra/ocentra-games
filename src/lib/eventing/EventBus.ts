import type { EventConstructor, IEventArgs } from './interfaces/IEventArgs';
import type { IEventBus } from './interfaces/IEventBus';
import type { ModuleLogger } from '@lib/logging';
import { defaultEventLogger } from './eventLogger';
import { OperationResult } from './OperationResult';
import { withTimeout } from '@lib/core';

type SyncHandler<T extends IEventArgs> = (eventArgs: T) => void;
type AsyncHandler<T extends IEventArgs> = (eventArgs: T) => Promise<void>;

interface QueuedEvent<T extends IEventArgs> {
  event: T;
  attempts: number;
  enqueuedAt: number;
}

export interface EventBusOptions {
  queueBatchSize: number;
  maxRetryAttempts: number;
  queueTimeoutMs: number;
  maxQueuedEvents: number;
  eventTtlMs: number;
  asyncTimeoutMs: number;
}

const DEFAULT_OPTIONS: EventBusOptions = {
  queueBatchSize: 10,
  maxRetryAttempts: 5,
  queueTimeoutMs: 5000,
  maxQueuedEvents: 1000,
  eventTtlMs: 60_000,
  asyncTimeoutMs: 10_000,
};

const scheduleMicrotask =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (callback: () => void) => {
        void Promise.resolve().then(callback);
      };

export class EventBus implements IEventBus {
  private static _instance: EventBus | null = null;

  static get instance(): EventBus {
    if (!EventBus._instance) {
      EventBus._instance = new EventBus();
    }
    return EventBus._instance;
  }

  static set instance(bus: EventBus) {
    EventBus.configure(bus);
  }

  static configure(instance: EventBus): void {
    EventBus._instance = instance;
  }

  static reset(): void {
    EventBus._instance = null;
  }

  private readonly subscribers = new Map<string, Array<SyncHandler<IEventArgs>>>();
  private readonly asyncSubscribers = new Map<string, Array<AsyncHandler<IEventArgs>>>();
  private readonly queuedEvents = new Map<string, Array<QueuedEvent<IEventArgs>>>();
  private readonly inFlightEvents = new Map<string, number>();
  private readonly processingQueues = new Set<string>();
  private readonly options: EventBusOptions;
  private readonly logger: ModuleLogger;

  constructor(
    options: EventBusOptions = DEFAULT_OPTIONS,
    logger: ModuleLogger = defaultEventLogger
  ) {
    this.options = options;
    this.logger = logger;
  }

  /**
   * Register a synchronous subscriber for the specified event type.
   * @param type The event constructor to subscribe to.
   * @param handler Callback invoked when the event is raised.
   * @param force When true, duplicate handlers are allowed.
   */
  subscribe<T extends IEventArgs>(
    type: EventConstructor<T>,
    handler: SyncHandler<T>,
    force = false
  ): void {
    const key = this.getKey(type);
    const subscriptionList = this.subscribers.get(key) ?? [];

    if (force || !subscriptionList.includes(handler as SyncHandler<IEventArgs>)) {
      subscriptionList.push(handler as SyncHandler<IEventArgs>);
      this.subscribers.set(key, subscriptionList);
    }

    void this.processQueuedEvents(type);
  }

  /**
   * Register an asynchronous subscriber for the specified event type.
   * When {@link publishAsync} is awaited, subscribers are invoked sequentially in registration order.
   *
   * @param type The event constructor to subscribe to.
   * @param handler Async callback invoked when the event is raised.
   * @param force When true, duplicate handlers are allowed.
   */
  subscribeAsync<T extends IEventArgs>(
    type: EventConstructor<T>,
    handler: AsyncHandler<T>,
    force = false
  ): void {
    const key = this.getKey(type);
    const subscriptionList = this.asyncSubscribers.get(key) ?? [];

    if (force || !subscriptionList.includes(handler as AsyncHandler<IEventArgs>)) {
      subscriptionList.push(handler as AsyncHandler<IEventArgs>);
      this.asyncSubscribers.set(key, subscriptionList);
    }

    void this.processQueuedEvents(type);
  }

  unsubscribe<T extends IEventArgs>(type: EventConstructor<T>, handler: SyncHandler<T>): void {
    const key = this.getKey(type);
    const subscriptionList = this.subscribers.get(key);
    if (!subscriptionList?.length) {
      return;
    }

    const filtered = subscriptionList.filter(existing => existing !== handler);
    if (filtered.length) {
      this.subscribers.set(key, filtered);
    } else {
      this.subscribers.delete(key);
    }
  }

  unsubscribeAsync<T extends IEventArgs>(type: EventConstructor<T>, handler: AsyncHandler<T>): void {
    const key = this.getKey(type);
    const subscriptionList = this.asyncSubscribers.get(key);
    if (!subscriptionList?.length) {
      return;
    }

    const filtered = subscriptionList.filter(existing => existing !== handler);
    if (filtered.length) {
      this.asyncSubscribers.set(key, filtered);
    } else {
      this.asyncSubscribers.delete(key);
    }
  }

  /**
   * Publish an event and await synchronous subscribers. When `awaitAsync` is set to `true`,
   * asynchronous subscribers are also awaited sequentially, providing deterministic delivery order.
   *
   * @param eventArgs Event payload to publish.
   * @param options Optional publish flags.
   * @returns An {@link OperationResult} indicating whether any subscriber handled the event.
   */
  async publish<T extends IEventArgs>(
    eventArgs: T,
    options: { awaitAsync?: boolean; force?: boolean } = {}
  ): Promise<OperationResult<boolean>> {
    const { awaitAsync = false, force = false } = options;
    try {
      const handled = await this.guardAndPublish(eventArgs, awaitAsync, force, true);
      return OperationResult.success(handled);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Failed to publish ${eventArgs.constructor.name}`;
      this.logger.logError(`Error publishing event ${eventArgs.constructor.name}`, error);
      return OperationResult.failure(message);
    }
  }

  /**
   * Publish an event and await all asynchronous subscribers sequentially.
   * A timeout may be provided to guard against hung handlers.
   *
   * @param eventArgs Event payload to publish.
   * @param options Optional publish configuration.
   * @returns An {@link OperationResult} that resolves when async handlers complete or timeout.
   */
  publishAsync<T extends IEventArgs>(
    eventArgs: T,
    options: { force?: boolean; timeoutMs?: number } = {}
  ): Promise<OperationResult<boolean>> {
    const timeout = options.timeoutMs ?? this.options.asyncTimeoutMs;
    return withTimeout(
      this.publish(eventArgs, { awaitAsync: true, force: options.force ?? false }),
      timeout,
      `Timed out awaiting async subscribers for ${eventArgs.constructor.name}`
    ).catch(error => {
      const message =
        error instanceof Error ? error.message : `Failed to publish ${eventArgs.constructor.name}`;
      this.logger.logError(message, error);
      return OperationResult.failure(message);
    });
  }

  /**
   * Remove all registered subscribers and queued events from the bus.
   */
  clear(): void {
    if (
      this.subscribers.size ||
      this.asyncSubscribers.size ||
      this.queuedEvents.size
    ) {
      this.logger.logWarning(
        'EventBus is being cleared. All current subscribers and queued events will be removed.'
      );
    }

    this.subscribers.clear();
    this.asyncSubscribers.clear();
    this.queuedEvents.clear();
    this.inFlightEvents.clear();
    this.processingQueues.clear();
  }

  private getKey(type: EventConstructor<IEventArgs>): string {
    if (type.eventType && typeof type.eventType === 'string') {
      return type.eventType;
    }
    throw new Error(
      `Event constructor "${type.name}" is missing a static string eventType. ` +
        'Ensure every event extends EventArgsBase and declares a unique eventType.'
    );
  }

  private async guardAndPublish<T extends IEventArgs>(
    eventArgs: T,
    awaitAsyncSubscribers: boolean,
    force: boolean,
    allowQueue: boolean
  ): Promise<boolean> {
    const eventType = this.getKey(eventArgs.constructor as EventConstructor<IEventArgs>);

    if (!force && !eventArgs.isRePublishable && this.inFlightEvents.has(eventArgs.uniqueIdentifier)) {
      return false;
    }

    this.incrementInFlight(eventArgs.uniqueIdentifier);

    try {
      const handled = await this.handlePublishAction(eventArgs, awaitAsyncSubscribers);

      if (!handled && allowQueue) {
        const queued = await this.queueEvent(eventArgs);
        if (queued) {
          this.logger.logWarning(
            `Event of type ${eventType} was published but no subscribers handled it. Queued for later processing.`
          );
        } else {
          eventArgs.dispose();
          this.logger.logError(`Failed to queue event of type ${eventType}.`);
        }
      } else {
        eventArgs.dispose();
      }

      return handled;
    } catch (error) {
      this.logger.logError(`Error in publish for event type ${eventType}`, error);
      throw error;
    } finally {
      this.decrementInFlight(eventArgs.uniqueIdentifier);
    }
  }

  private async handlePublishAction<T extends IEventArgs>(
    eventArgs: T,
    awaitAsyncSubscribers: boolean
  ): Promise<boolean> {
    const key = this.getKey(eventArgs.constructor as EventConstructor<IEventArgs>);
    let handled = false;

    const syncSubscribers = this.subscribers.get(key);
    if (syncSubscribers?.length) {
      for (const subscriber of [...syncSubscribers]) {
        try {
          (subscriber as SyncHandler<T>)(eventArgs);
        } catch (error) {
          this.logger.logError(
            `Error in subscriber for event type ${key}: ${(error as Error)?.message ?? error}`,
            error
          );
          throw error;
        }
      }
      handled = true;
    }

    const asyncSubscribers = this.asyncSubscribers.get(key);
    if (asyncSubscribers?.length) {
      handled = true;
      if (awaitAsyncSubscribers) {
        for (const subscriber of [...asyncSubscribers]) {
          await this.invokeAsyncSubscriber(subscriber as AsyncHandler<T>, eventArgs, key, true);
        }
      } else {
        for (const subscriber of [...asyncSubscribers]) {
          scheduleMicrotask(() => {
            void this.invokeAsyncSubscriber(subscriber as AsyncHandler<T>, eventArgs, key, false);
          });
        }
      }
    }

    return handled;
  }

  private async invokeAsyncSubscriber<T extends IEventArgs>(
    subscriber: AsyncHandler<T>,
    eventArgs: T,
    key: string,
    enforceTimeout: boolean
  ): Promise<void> {
    const execute = async () => {
      const result = subscriber(eventArgs);
      if (enforceTimeout) {
        await withTimeout(
          result,
          this.options.asyncTimeoutMs,
          `Async subscriber timeout for event type ${key}`
        );
      } else {
        await result;
      }
    };

    try {
      await execute();
    } catch (error) {
      this.logger.logError(
        `Error in async subscriber for event type ${key}: ${(error as Error)?.message ?? error}`,
        error
      );
      throw error;
    }
  }

  private async queueEvent<T extends IEventArgs>(eventArgs: T): Promise<boolean> {
    try {
      const key = this.getKey(eventArgs.constructor as EventConstructor<IEventArgs>);
      const queue = this.queuedEvents.get(key) ?? [];

      if (queue.length >= this.options.maxQueuedEvents) {
        const dropped = queue.shift();
        if (dropped) {
          dropped.event.dispose();
          this.logger.logWarning(
            `Queue for ${key} reached capacity (${this.options.maxQueuedEvents}). Dropping oldest event.`
          );
        }
      }

      queue.push({ event: eventArgs, attempts: 0, enqueuedAt: Date.now() });
      this.queuedEvents.set(key, queue);

      await Promise.resolve();
      return true;
    } catch (error) {
      this.logger.logError(
        `Queue event failed for ${this.getKey(eventArgs.constructor as EventConstructor<IEventArgs>)}: ${
          (error as Error)?.message ?? error
        }`,
        error
      );
      return false;
    }
  }

  private async processQueuedEvents<T extends IEventArgs>(type: EventConstructor<T>): Promise<void> {
    const key = this.getKey(type as unknown as EventConstructor<IEventArgs>);
    const queue = this.queuedEvents.get(key);

    if (!queue?.length || this.processingQueues.has(key)) {
      return;
    }

    this.processingQueues.add(key);

    try {
      const remaining: Array<QueuedEvent<IEventArgs>> = [];

      while (queue.length) {
        const batch = queue.splice(0, this.options.queueBatchSize);
        for (const queued of batch) {
          if (this.isExpired(queued)) {
            queued.event.dispose();
            this.logger.logWarning(`Dropping expired event of type ${key} from queue.`);
            continue;
          }

          try {
            const handled = await withTimeout(
              this.guardAndPublish(queued.event as T, true, true, false),
              this.options.queueTimeoutMs,
              `Timeout occurred while processing queued event type ${key}`
            );

            if (handled) {
              queued.event.dispose();
            } else {
              this.requeueIfPossible(queued, remaining, key);
            }
          } catch (error) {
            this.logger.logError(
              `Error during queued event processing for ${key}: ${(error as Error)?.message ?? error}`,
              error
            );
            this.requeueIfPossible(queued, remaining, key);
          } finally {
            // guardAndPublish will balance in-flight tracking
          }
        }

        await Promise.resolve();
      }

      if (remaining.length) {
        this.queuedEvents.set(key, remaining);
      } else {
        this.queuedEvents.delete(key);
      }
    } finally {
      this.processingQueues.delete(key);
    }
  }

  private requeueIfPossible(
    queuedEvent: QueuedEvent<IEventArgs>,
    failedQueue: Array<QueuedEvent<IEventArgs>>,
    key: string
  ): void {
    const nextAttempt = queuedEvent.attempts + 1;

    if (nextAttempt <= this.options.maxRetryAttempts) {
      failedQueue.push({
        event: queuedEvent.event,
        attempts: nextAttempt,
        enqueuedAt: queuedEvent.enqueuedAt,
      });
    } else {
      queuedEvent.event.dispose();
      this.logger.logWarning(`Event ${key} has exceeded maximum retry attempts and will be dropped.`);
    }
  }

  private isExpired(queuedEvent: QueuedEvent<IEventArgs>): boolean {
    return Date.now() - queuedEvent.enqueuedAt > this.options.eventTtlMs;
  }

  private incrementInFlight(eventId: string): void {
    const current = this.inFlightEvents.get(eventId) ?? 0;
    this.inFlightEvents.set(eventId, current + 1);
  }

  private decrementInFlight(eventId: string): void {
    const current = this.inFlightEvents.get(eventId);
    if (current === undefined) {
      return;
    }

    if (current <= 1) {
      this.inFlightEvents.delete(eventId);
    } else {
      this.inFlightEvents.set(eventId, current - 1);
    }
  }
}

