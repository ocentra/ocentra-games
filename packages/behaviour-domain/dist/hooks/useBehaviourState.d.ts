import type { ReactBehaviour } from '../ReactBehaviour';
type StateSelector<TBehaviour extends ReactBehaviour<TCtx>, TState, TCtx = undefined> = (behaviour: TBehaviour) => TState;
interface UseBehaviourStateOptions {
    autoStart?: boolean;
}
export declare const useBehaviourState: <T extends ReactBehaviour<TContext>, S, TContext = undefined>(factory: (context: TContext | undefined) => T, selector: StateSelector<T, S, TContext>, context?: TContext, options?: UseBehaviourStateOptions) => S;
export {};
