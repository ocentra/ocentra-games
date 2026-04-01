import { createElement } from 'react';
import type { PropsWithChildren } from 'react';
import type { IEventBus } from '@ocentra/eventing-domain/interfaces/IEventBus';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { EventBusContext } from './EventBusContext';

interface EventBusProviderProps {
  value?: IEventBus;
}

export const EventBusProvider = ({
  value,
  children,
}: PropsWithChildren<EventBusProviderProps>) => {
  const bus = value ?? EventBus.instance;
  return createElement(
    EventBusContext.Provider,
    { value: bus },
    children
  );
};

