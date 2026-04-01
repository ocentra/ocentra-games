import { ReactBehaviour } from '../ReactBehaviour';
export interface UseBehaviourOptions {
    autoStart?: boolean;
}
export declare const useBehaviour: <T extends ReactBehaviour<TContext>, TContext = undefined>(factory: (context: TContext | undefined) => T, context?: TContext, options?: UseBehaviourOptions) => T;
