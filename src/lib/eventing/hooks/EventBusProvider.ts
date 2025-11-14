import { createElement } from 'react';
import type { PropsWithChildren } from 'react';
import type { IEventBus } from '@lib/eventing/interfaces/IEventBus';
import { EventBus } from '@lib/eventing/EventBus';
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

