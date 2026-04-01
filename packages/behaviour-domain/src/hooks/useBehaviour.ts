import { useEffect, useMemo } from 'react';
import { ReactBehaviour } from '../ReactBehaviour';

export interface UseBehaviourOptions {
  autoStart?: boolean;
}

export const useBehaviour = <
  T extends ReactBehaviour<TContext>,
  TContext = undefined
>(
  factory: (context: TContext | undefined) => T,
  context?: TContext,
  options?: UseBehaviourOptions
): T => {
  const autoStart = options?.autoStart ?? true;

  const behaviour = useMemo(() => {
    const instance = factory(context);
    instance.__initialize();
    return instance;
  }, [factory, context]);

  useEffect(() => {
    if (autoStart) {
      behaviour.start();
    } else {
      behaviour.enable();
    }

    return () => {
      behaviour.destroy();
    };
  }, [behaviour, autoStart]);

  return behaviour;
};
