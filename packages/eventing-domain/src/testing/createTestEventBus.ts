import { EventBus, type EventBusOptions } from '@/core/EventBus';

export const createTestEventBus = (options?: EventBusOptions): EventBus => {
  return new EventBus(options);
};

