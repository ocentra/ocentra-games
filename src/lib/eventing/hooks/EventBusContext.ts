import { createContext } from 'react'
import type { IEventBus } from '@ocentra/eventing-domain/interfaces/IEventBus'

export const EventBusContext = createContext<IEventBus | null>(null)
