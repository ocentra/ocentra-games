import { describe, it, expect } from 'vitest';
import { EventBus, type EventBusOptions } from '@/core/EventBus';
import { EventArgsBase } from '@/core/EventArgsBase';

class TestEvent extends EventArgsBase {
  static readonly eventType = 'TestEvent';

  readonly payload: number;

  constructor(payload: number) {
    super();
    this.payload = payload;
  }
}

const createBus = (overrides: Partial<EventBusOptions> = {}) =>
  new EventBus({
    queueBatchSize: 4,
    maxRetryAttempts: 2,
    queueTimeoutMs: 50,
    maxQueuedEvents: 8,
    eventTtlMs: 50,
    asyncTimeoutMs: 50,
    ...overrides,
  });

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('EventBus', () => {
  it('returns failure OperationResult when a synchronous subscriber throws', async () => {
    const bus = createBus();
    bus.subscribe(TestEvent, () => {
      throw new Error('subscriber failed');
    });

    const result = await bus.publish(new TestEvent(1));

    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('subscriber failed');
  });

  it('processes async subscribers in parallel when awaiting', async () => {
    const bus = createBus();
    const callOrder: Array<string> = [];

    bus.subscribeAsync(TestEvent, async () => {
      callOrder.push('first-start');
      await wait(5);
      callOrder.push('first-end');
    });

    bus.subscribeAsync(TestEvent, async () => {
      callOrder.push('second');
    });

    const result = await bus.publishAsync(new TestEvent(42));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBe(true);
    expect(callOrder).toContain('first-start');
    expect(callOrder).toContain('second');
    expect(callOrder.indexOf('second')).toBeLessThan(callOrder.indexOf('first-end'));
  });

  it('drops queued events that exceed TTL', async () => {
    const bus = createBus({
      queueBatchSize: 1,
      maxQueuedEvents: 2,
      eventTtlMs: 10,
      queueTimeoutMs: 10,
      asyncTimeoutMs: 10,
    });

    const firstResult = await bus.publish(new TestEvent(7));
    expect(firstResult.isSuccess).toBe(true);
    expect(firstResult.value).toBe(false); // queued

    await wait(20);

    let handled = false;
    bus.subscribe(TestEvent, () => {
      handled = true;
    });

    await wait(20);
    expect(handled).toBe(false);
  });
});

