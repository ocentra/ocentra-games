import { describe, it, expect } from 'vitest';
import { EventBus } from '@/core/EventBus';
import { EventRegistrar } from '@/core/EventRegistrar';
import { createEventRegistrar } from '@/core/createEventRegistrar';
import { createTestEventBus } from '@/testing/createTestEventBus';
import { EventArgsBase } from '@/core/EventArgsBase';

class TestEvent extends EventArgsBase {
  static readonly eventType = 'TestEvent';
  readonly n: number;
  constructor(n: number) {
    super();
    this.n = n;
  }
}

describe('EventRegistrar', () => {
  it('EventRegistrar subscribe then publish: handler receives event', async () => {
    const bus = createTestEventBus();
    const registrar = new EventRegistrar(bus);
    let received: number | null = null;
    registrar.subscribe(TestEvent, (e) => {
      received = e.n;
    });
    await bus.publish(new TestEvent(7));
    expect(received).toBe(7);
    registrar.dispose();
  });

  it('EventRegistrar dispose unsubscribes: handler not called after dispose', async () => {
    const bus = createTestEventBus();
    const registrar = new EventRegistrar(bus);
    let calls = 0;
    registrar.subscribe(TestEvent, () => {
      calls++;
    });
    await bus.publish(new TestEvent(1));
    expect(calls).toBe(1);
    registrar.dispose();
    await bus.publish(new TestEvent(2));
    expect(calls).toBe(1);
  });
});

describe('createEventRegistrar', () => {
  it('createEventRegistrar subscribe then publish: handler receives event', async () => {
    const bus = createTestEventBus();
    const handle = createEventRegistrar(bus);
    let received: number | null = null;
    handle.subscribe(TestEvent, (e) => {
      received = e.n;
    });
    await bus.publish(new TestEvent(11));
    expect(received).toBe(11);
    handle.dispose();
  });
});

describe('createTestEventBus', () => {
  it('createTestEventBus returns new EventBus instance', () => {
    const bus = createTestEventBus();
    expect(bus).toBeInstanceOf(EventBus);
  });
});
