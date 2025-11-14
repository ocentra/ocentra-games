import { createElement, createContext, useContext, useMemo } from 'react'
import type { PropsWithChildren } from 'react'
import {
  ServiceContainer,
  globalServiceContainer,
  type ServiceKey,
} from './ServiceContainer'

const ServiceContainerContext = createContext<ServiceContainer>(globalServiceContainer)

interface ServiceContainerProviderProps {
  value?: ServiceContainer
  /**
   * Optional hook to configure overrides on a child container.
   * When provided, a new child container is created from the parent and passed to the configurator.
   */
  configure?: (container: ServiceContainer) => void
}

export function ServiceContainerProvider({
  value,
  configure,
  children,
}: PropsWithChildren<ServiceContainerProviderProps>) {
  const parentValue = useContext(ServiceContainerContext)
  const parent = value ?? parentValue

  const container = useMemo(() => {
    if (!configure) {
      return parent
    }
    const child = parent.createChild()
    configure(child)
    return child
  }, [parent, configure])

  return createElement(
    ServiceContainerContext.Provider,
    { value: container },
    children
  )
}

export function useServiceContainer(): ServiceContainer {
  return useContext(ServiceContainerContext)
}

export function useService<T>(key: ServiceKey<T>): T {
  const container = useServiceContainer()
  return container.resolve(key)
}

