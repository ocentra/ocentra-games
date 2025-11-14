import { useEffect, useState } from 'react';
import { useBehaviour } from './useBehaviour';
import { ReactBehaviour } from '../ReactBehaviour';

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
  const [state, setState] = useState(() => selector(behaviour));

  useEffect(() => {
    setState(selector(behaviour));
    return behaviour.__subscribeState(setState, selector);
  }, [behaviour, selector]);

  return state;
};

