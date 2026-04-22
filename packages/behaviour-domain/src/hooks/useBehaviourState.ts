import { useSyncExternalStore, useCallback } from 'react';
import { useBehaviour } from './useBehaviour';
import type { ReactBehaviour } from '../ReactBehaviour';

type StateSelector<TBehaviour extends ReactBehaviour<TCtx>, TState, TCtx = undefined> = (behaviour: TBehaviour) => TState;

interface UseBehaviourStateOptions {
  autoStart?: boolean;
}

export const useBehaviourState = <
  T extends ReactBehaviour<TContext>,
  S,
  TContext = undefined
>(
  factory: (context: TContext | undefined) => T,
  selector: StateSelector<T, S, TContext>,
  context?: TContext,
  options?: UseBehaviourStateOptions
): S => {
  const behaviour = useBehaviour(factory, context, options);

  // useSyncExternalStore requires a stable subscribe function for the current behaviour
  const subscribe = useCallback((onStoreChange: () => void) => {
    return behaviour.__subscribe(onStoreChange);
  }, [behaviour]);

  // getSnapshot must return the current state
  const getSnapshot = useCallback(() => {
    return selector(behaviour);
  }, [behaviour, selector]);

  return useSyncExternalStore(subscribe, getSnapshot);
};
