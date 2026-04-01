import { describe, it, expect } from 'vitest';
import { EventArgsBase } from '@/core/EventArgsBase';

describe('EventArgsBase', () => {
  it('EventArgsBase subclass without static eventType throws', () => {
    class BadEvent extends EventArgsBase {
      constructor() {
        super();
      }
    }
    expect(() => new BadEvent()).toThrow(/must declare static readonly eventType/);
  });

  it('EventArgsBase subclass with static eventType has timestamp and uniqueIdentifier', () => {
    class GoodEvent extends EventArgsBase {
      static readonly eventType = 'GoodEvent';
      constructor() {
        super();
      }
    }
    const e = new GoodEvent();
    expect(e.timestamp).toBeGreaterThan(0);
    expect(typeof e.uniqueIdentifier).toBe('string');
    expect(e.uniqueIdentifier.length).toBeGreaterThan(0);
    expect((e.constructor as typeof GoodEvent).eventType).toBe('GoodEvent');
  });

  it('EventArgsBase dispose calls onDispose', () => {
    let disposed = false;
    class DisposableEvent extends EventArgsBase {
      static readonly eventType = 'DisposableEvent';
      constructor() {
        super();
      }
      protected onDispose(): void {
        disposed = true;
      }
    }
    const e = new DisposableEvent();
    e.dispose();
    expect(disposed).toBe(true);
  });
});
