import type { PropsWithChildren, ReactElement } from 'react';
import { ReactBehaviour } from './ReactBehaviour.js';
export interface BehaviourHostProps<TBehaviour extends ReactBehaviour<TContext>, TContext = undefined> {
    create: (context: TContext | undefined) => TBehaviour;
    context?: TContext;
    onReady?: (behaviour: TBehaviour) => void;
    autoStart?: boolean;
}
export declare const BehaviourHost: <TBehaviour extends ReactBehaviour<TContext>, TContext = undefined>({ create, context, onReady, autoStart, children, }: PropsWithChildren<BehaviourHostProps<TBehaviour, TContext>>) => ReactElement | null;
