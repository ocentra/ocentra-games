# @ocentra/behaviour-domain

Unity-like lifecycle base class (`ReactBehaviour`) and React hooks for lifecycle management. Enables ScriptableObject and asset untanglement.

## Exports

- `@ocentra/behaviour-domain/ReactBehaviour` – Base class with lifecycle hooks (awake, onStart, onUpdate, onDestroy)
- `@ocentra/behaviour-domain/BehaviourHost` – React component host for behaviours
- `@ocentra/behaviour-domain/hooks/useBehaviour` – Hook to create and manage a behaviour instance
- `@ocentra/behaviour-domain/hooks/useBehaviourState` – Hook to subscribe to behaviour state

## Usage

```ts
import { ReactBehaviour } from '@ocentra/behaviour-domain/ReactBehaviour';
import { useBehaviour } from '@ocentra/behaviour-domain/hooks/useBehaviour';
import { useBehaviourState } from '@ocentra/behaviour-domain/hooks/useBehaviourState';
import { BehaviourHost } from '@ocentra/behaviour-domain/BehaviourHost';
```

## Peer dependency

- `react` >= 18.0.0

