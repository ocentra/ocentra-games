# Eventing (app layer)

This folder is **React bindings and app wiring** for the event bus. The bus, events, and registrar live in **@ocentra/eventing-domain**; nothing here duplicates that.

**What lives here (src/lib/eventing)**

| Path | Role |
|------|------|
| `hooks/EventBusContext.ts` | React context holding `IEventBus`. |
| `hooks/EventBusProvider.tsx` | Provider; uses `EventBus.instance` by default, or inject your own. |
| `hooks/useEventBus.ts` | Hook: returns the bus from context or `EventBus.instance`. |
| `hooks/useEventRegistrar.ts` | Hook: returns an `EventRegistrar` bound to the current bus. |
| `hooks/useEventListener.ts` | Hook: subscribe to an event for the lifetime of the component. |
| `behaviours/` | EventBehaviour, EventBehaviourHost, useEventBehaviourState, useEventBehaviour. See `behaviours/README.md`. |
| `eventingInit.ts` | App startup: registers eventing in the global service container. |
| `serviceKeys.ts` | Service keys used by the container for eventing. |
| `components/EventListener.tsx` | React component that subscribes to an event. |

**What lives in eventing-domain (import from there)**

- `EventBus`, `EventRegistrar`, `EventArgsBase`, `OperationDeferred`, `OperationResult` → `@ocentra/eventing-domain/core/...`
- Event classes → `@ocentra/eventing-domain/events/...`
- Interfaces → `@ocentra/eventing-domain/interfaces/...`
- Test bus → `@ocentra/eventing-domain/testing/createTestEventBus` (if exported)

**Usage in React**

1. Wrap the tree (or app) with `EventBusProvider` (optional; `useEventBus()` falls back to `EventBus.instance`).
2. In components: `useEventBus()` to get the bus, or `useEventListener(SomeEvent, handler)` to subscribe for component lifetime, or `useEventBehaviourState(factory, selector)` for stateful behaviours (see `behaviours/README.md`).
3. Publish: `EventBus.instance.publish(event)` or `bus.publishAsync(event)`. Request/response: put `new OperationDeferred<T>()` on the event and await `deferred.promise` after publish.

**Imports**

- App hooks/provider/behaviours: `@/lib/eventing/hooks/useEventBus`, `@/lib/eventing/hooks/EventBusProvider`, `@/lib/eventing/behaviours/...`
- Bus, events, registrar, deferred, result: `@ocentra/eventing-domain/core/EventBus`, `@ocentra/eventing-domain/events/...`, `@ocentra/eventing-domain/core/OperationDeferred`, `@ocentra/eventing-domain/core/OperationResult`.
