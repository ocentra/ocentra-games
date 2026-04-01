# Event behaviours

Event-driven logic hosted in React: subscribe to EventBus in `awake()`, update internal state, call `notifyStateChanged()` so the component re-renders.

**Files**

| File | Role |
|------|------|
| `EventBehaviour.ts` | Base class. Extends `ReactBehaviour` from `@ocentra/behaviour-domain`; provides `eventBus` and `eventRegistrar`. Override `awake()` to subscribe, `onStart()` for initial work, `onDestroy()` is auto (disposes registrar). |
| `useEventBehaviourState.ts` | Hook: `useEventBehaviourState(factory, selector)` — creates behaviour from `useEventBus()` context and returns selected state. |
| `EventBehaviourHost.tsx` | Component: hosts a behaviour (create, optional onReady, autoStart). Use when the behaviour must live above a subtree. |
| `useEventBehaviour.ts` | Hook: returns the behaviour instance for the current host. |

**Imports**

- EventBehaviour, context, hooks: `@/lib/eventing/behaviours/EventBehaviour`, `@/lib/eventing/behaviours/useEventBehaviourState`, `@/lib/eventing/behaviours/EventBehaviourHost`, `@/lib/eventing/behaviours/useEventBehaviour`.
- EventBus, events, OperationDeferred, OperationResult: `@ocentra/eventing-domain/core/EventBus`, `@ocentra/eventing-domain/events/...`, `@ocentra/eventing-domain/core/OperationDeferred`, `@ocentra/eventing-domain/core/OperationResult`.

**When to use**

Implement a class extending `EventBehaviour<EventBehaviourContext>`, subscribe in `awake()`, hold state and call `notifyStateChanged()`. Use `useEventBehaviourState(factory, selector)` in the component to render that state. Put behaviour classes in your feature folders, not under `@/lib`.
