import { useEffect, useRef, createElement, Fragment } from 'react';
import type { PropsWithChildren, ReactElement } from 'react';
import { ReactBehaviour } from './ReactBehaviour';

export interface BehaviourHostProps<
  TBehaviour extends ReactBehaviour<TContext>,
  TContext = undefined
> {
  create: (context: TContext | undefined) => TBehaviour;
  context?: TContext;
  onReady?: (behaviour: TBehaviour) => void;
  autoStart?: boolean;
}

export const BehaviourHost = <
  TBehaviour extends ReactBehaviour<TContext>,
  TContext = undefined
>({
  create,
  context,
  onReady,
  autoStart = true,
  children,
}: PropsWithChildren<BehaviourHostProps<TBehaviour, TContext>>): ReactElement | null => {
  const behaviourRef = useRef<TBehaviour | null>(null);

  useEffect(() => {
    const behaviour = create(context);
    behaviourRef.current = behaviour;
    behaviour.__initialize();
    onReady?.(behaviour);

    if (autoStart) {
      behaviour.start();
    } else {
      behaviour.enable();
    }

    return () => {
      behaviour.destroy();
      behaviourRef.current = null;
    };
  }, [create, context, onReady, autoStart]);

  return createElement(Fragment, null, children ?? null);
};

