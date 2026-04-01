import { useContext } from 'react';
import type { IEventBus } from '@ocentra/eventing-domain/interfaces/IEventBus';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { EventBusContext } from './EventBusContext';

export const useEventBus = (): IEventBus => {
  const bus = useContext(EventBusContext);
  return bus ?? EventBus.instance;
};

