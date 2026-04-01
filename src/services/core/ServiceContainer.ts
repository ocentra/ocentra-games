export type ServiceLifecycle = 'singleton' | 'transient'

export interface ServiceKey<T> {
  readonly id: symbol
  readonly description?: string
  readonly __type?: (value: T) => T
}

export const createServiceKey = <T>(description?: string): ServiceKey<T> =>
  Object.freeze({
    id: Symbol(description ?? 'service'),
    description,
  })

export type ServiceFactory<T> = (container: ServiceContainer) => T

interface ServiceRegistration {
  factory: ServiceFactory<unknown>
  lifecycle: ServiceLifecycle
  instance?: unknown
  dispose?: (instance: unknown) => void | Promise<void>
}

export interface RegisterOptions<T> {
  lifecycle?: ServiceLifecycle
  dispose?: (instance: T) => void | Promise<void>
  replace?: boolean
}

export interface RegisterInstanceOptions<T> {
  replace?: boolean
  dispose?: (instance: T) => void | Promise<void>
}

export class ServiceContainer {
  private readonly registry = new Map<symbol, ServiceRegistration>()
  private readonly parent?: ServiceContainer
  private disposed = false

  constructor(parent?: ServiceContainer) {
    this.parent = parent
  }

  register<T>(
    key: ServiceKey<T>,
    factory: ServiceFactory<T>,
    options: RegisterOptions<T> = {}
  ): this {
    this.ensureNotDisposed()
    const lifecycle = options.lifecycle ?? 'singleton'
    if (!options.replace && this.registry.has(key.id)) {
      throw new Error(this.makeDuplicateMessage(key))
    }
    this.registry.set(key.id, {
      factory: factory as ServiceFactory<unknown>,
      lifecycle,
      dispose: options.dispose as ((instance: unknown) => void | Promise<void>) | undefined,
    })
    return this
  }

  registerInstance<T>(
    key: ServiceKey<T>,
    instance: T,
    options: RegisterInstanceOptions<T> = {}
  ): this {
    this.ensureNotDisposed()
    if (!options.replace && this.registry.has(key.id)) {
      throw new Error(this.makeDuplicateMessage(key))
    }
    this.registry.set(key.id, {
      factory: (() => instance) as ServiceFactory<unknown>,
      lifecycle: 'singleton',
      instance,
      dispose: options.dispose as ((instance: unknown) => void | Promise<void>) | undefined,
    })
    return this
  }

  resolve<T>(key: ServiceKey<T>): T {
    this.ensureNotDisposed()
    const registration = this.getRegistration(key)
    if (!registration) {
      throw new Error(this.makeMissingMessage(key))
    }
    return this.instantiate(key, registration)
  }

  tryResolve<T>(key: ServiceKey<T>): T | undefined {
    this.ensureNotDisposed()
    const registration = this.getRegistration(key)
    if (!registration) {
      return undefined
    }
    return this.instantiate(key, registration)
  }

  has<T>(key: ServiceKey<T>): boolean {
    return this.registry.has(key.id) || (!!this.parent && this.parent.has(key))
  }

  createChild(): ServiceContainer {
    this.ensureNotDisposed()
    return new ServiceContainer(this)
  }

  withOverrides(configure: (container: ServiceContainer) => void): ServiceContainer {
    const child = this.createChild()
    configure(child)
    return child
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return
    }
    this.disposed = true
    const disposalTasks: Array<Promise<void> | void> = []
    for (const registration of this.registry.values()) {
      if (registration.dispose && registration.instance !== undefined) {
        disposalTasks.push(registration.dispose(registration.instance))
      }
    }
    this.registry.clear()
    await Promise.all(disposalTasks)
  }

  private getRegistration<T>(key: ServiceKey<T>): ServiceRegistration | undefined {
    const local = this.registry.get(key.id)
    if (local) {
      return local
    }
    return this.parent?.getRegistration(key)
  }

  private instantiate<T>(_: ServiceKey<T>, registration: ServiceRegistration): T {
    if (registration.lifecycle === 'singleton') {
      if (registration.instance === undefined) {
        registration.instance = (registration.factory as ServiceFactory<T>)(this)
      }
      return registration.instance as T
    }

    return (registration.factory as ServiceFactory<T>)(this)
  }

  private ensureNotDisposed(): void {
    if (this.disposed) {
      throw new Error('Cannot interact with a disposed ServiceContainer.')
    }
  }

  private makeDuplicateMessage<T>(key: ServiceKey<T>): string {
    return `Service "${key.description ?? key.id.toString()}" is already registered. Pass { replace: true } to override.`
  }

  private makeMissingMessage<T>(key: ServiceKey<T>): string {
    return `Service "${key.description ?? key.id.toString()}" has not been registered.`
  }
}

export const globalServiceContainer = new ServiceContainer()

export const withServiceOverrides = (
  configure: (container: ServiceContainer) => void,
  parent: ServiceContainer = globalServiceContainer
): ServiceContainer => parent.withOverrides(configure)
