# @ocentra/behaviour-domain Architecture

`@ocentra/behaviour-domain` provides lifecycle-oriented behavior primitives used by UI and runtime components.

## Owns

- `ReactBehaviour` lifecycle base class
- Behavior hosting integration
- Hooks for behavior lifecycle and state access

## Design

```mermaid
flowchart TD
  behaviourDomain[behaviour-domain]
  uiRuntime[main app ui runtime]
  featureBehaviours[feature behaviour implementations]

  uiRuntime --> behaviourDomain
  featureBehaviours --> behaviourDomain
```

## Boundary Rules

- Keep lifecycle mechanics in this domain package.
- Keep feature-specific behavior implementations in consumer packages/apps.
