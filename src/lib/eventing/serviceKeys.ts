import { createServiceKey, type ServiceContainer } from '@/services/core/ServiceContainer';
import type { IEventBus } from '@ocentra/eventing-domain/interfaces/IEventBus';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';

export const EVENT_BUS = createServiceKey<IEventBus>('EventBus')

export const registerEventingServices = (container: ServiceContainer): void => {
  if (!container.has(EVENT_BUS)) {
    container.registerInstance(EVENT_BUS, EventBus.instance)
  }
}

